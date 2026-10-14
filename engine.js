(function(root) {
  'use strict';
  const VERSION = 1;
  const predictionHistory=()=>typeof module!=='undefined'&&module.exports?require('./prediction-history.js'):root.PredictionHistory;
  const intervals = [1, 3, 7, 14, 30];
  function today(date = new Date()) {
    return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  }
  function addDays(day, count) {
    const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + count);
    return d.toISOString().slice(0,10);
  }
  function fresh() { return {version:VERSION,cards:{},completed:{},bosses:{},days:{},awards:{},predictions:{},session:null}; }
  function xp(state) { return Object.values(state.awards).reduce((a,b)=>a+b,0); }
  function grade(state, id, correct, day = today()) {
    const previous = state.cards[id] || {attempts:0,correct:0,streak:0,lapses:0};
    // Same-day retries fix the mistake but cannot advance a spaced-repetition interval.
    const advance = correct && previous.last !== day;
    const streak = correct ? (advance ? previous.streak + 1 : previous.streak) : 0;
    const interval = correct ? intervals[Math.min(Math.max(streak - 1, 0), intervals.length - 1)] : 0;
    state.cards[id] = {attempts:previous.attempts+1,correct:previous.correct+Number(correct),streak,lapses:previous.lapses+Number(!correct),last:day,due:addDays(day,interval)};
    const key = id + '|' + day;
    if (!(key in state.awards)) {
      state.awards[key] = correct ? 10 : 3;
      state.days[day] = (state.days[day] || 0) + 1;
    }
    return state.cards[id];
  }
  function streak(state, day = today()) {
    let cursor = state.days[day] ? day : addDays(day,-1), count = 0;
    while (state.days[cursor]) { count++; cursor = addDays(cursor,-1); }
    return count;
  }
  function due(state, ids, day = today()) { return ids.filter(id=>state.cards[id] && state.cards[id].due <= day); }
  function restoreSession(s, bank, cards) {
    const object = v => v && typeof v==='object' && !Array.isArray(v);
    const integer = (v,max) => Number.isInteger(v) && v>=0 && v<=max;
    if(!object(s) || !['lesson','review','boss'].includes(s.mode) || !['brief','question','result'].includes(s.stage))return null;
    if(!Array.isArray(s.queue)||!s.queue.length||s.queue.length>100||!s.queue.every(id=>bank.has(id)))return null;
    if(!integer(s.index,s.queue.length)||!integer(s.day,60)||s.day<1||!integer(s.chapter,10)||s.chapter<1||!integer(s.startXP,10000000))return null;
    if(!Array.isArray(s.answers)||s.answers.length>100||!s.answers.every(a=>object(a)&&bank.has(a.id)&&typeof a.correct==='boolean'&&typeof a.retry==='boolean'&&a.type===bank.get(a.id).type))return null;
    if(!Array.isArray(s.retried)||!s.retried.every(id=>bank.has(id))||typeof s.revealed!=='boolean'||typeof s.recallText!=='string'||s.recallText.length>10000)return null;
    if(!object(s.order))return null;
    for(const [id,order] of Object.entries(s.order)){
      const q=bank.get(id);
      if(!q||q.type!=='choice'||!Array.isArray(order)||order.length!==q.options.length||new Set(order).size!==order.length||!order.every(i=>integer(i,q.options.length-1)))return null;
    }
    if(s.stage==='result'){
      const r=s.result;
      if(s.index!==s.queue.length||!object(r)||!integer(r.total,100)||!integer(r.correct,r.total)||!integer(r.selfChecks,100))return null;
    }else{
      if(s.index>=s.queue.length)return null;
      const q=bank.get(s.queue[s.index]);
      if(s.selection!==null && (q.type!=='choice'||!integer(s.selection,q.options.length-1)))return null;
      if(s.feedback!==null && (!object(s.feedback)||typeof s.feedback.correct!=='boolean'||!cards[q.id]))return null;
    }
    return s;
  }
  function validate(value, knownIds) {
    if (!value || value.version !== VERSION) throw new Error('샤시 퀘스트 백업 파일이 아닙니다.');
    const state = fresh(), ids = new Set(knownIds), datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const validDate = x => typeof x === 'string' && datePattern.test(x) && !Number.isNaN(Date.parse(x)) && new Date(x).toISOString().slice(0,10) === x;
    const int = (x,max=1000000) => Number.isInteger(x) && x>=0 && x<=max;
    const object = x => x && typeof x==='object' && !Array.isArray(x);
    for (const field of ['cards','completed','bosses','days','awards']) if (!object(value[field])) throw new Error('백업 구조가 올바르지 않습니다.');
    for (const [id,c] of Object.entries(value.cards)) {
      if (!ids.has(id) || !object(c) || !['attempts','correct','streak','lapses'].every(k=>int(c[k])) || c.correct>c.attempts || !validDate(c.due) || !validDate(c.last)) throw new Error('문제 기록이 올바르지 않습니다.');
      state.cards[id] = {attempts:c.attempts,correct:c.correct,streak:c.streak,lapses:c.lapses,last:c.last,due:c.due};
    }
    for (const [id,c] of Object.entries(value.completed)) {
      if (!/^([1-9]|[1-5]\d|60)$/.test(id) || !object(c) || !validDate(c.date) || !int(c.correct,100) || !int(c.total,100) || c.correct>c.total || !int(c.selfChecks,100)) throw new Error('강의 기록이 올바르지 않습니다.');
      state.completed[id] = {date:c.date,correct:c.correct,total:c.total,selfChecks:c.selfChecks};
    }
    for(const [id,c] of Object.entries(value.bosses)) {
      if(!/^([1-9]|10)$/.test(id) || !object(c) || !validDate(c.date) || !int(c.correct,10) || !int(c.total,10) || c.correct>c.total) throw new Error('체크포인트 기록이 올바르지 않습니다.');
      state.bosses[id] = {date:c.date,correct:c.correct,total:c.total};
    }
    for (const [day,count] of Object.entries(value.days)) { if(!validDate(day)||!int(count)) throw new Error('날짜 기록이 올바르지 않습니다.'); state.days[day]=count; }
    for (const [key,amount] of Object.entries(value.awards)) {
      const [id,day,...rest]=key.split('|');
      if(rest.length || !ids.has(id) || !validDate(day) || ![3,10].includes(amount)) throw new Error('XP 기록이 올바르지 않습니다.');
      state.awards[key]=amount;
    }
    // Optional for version-1 backups created before prediction practice existed.
    if(Object.prototype.hasOwnProperty.call(value,'predictions'))state.predictions=predictionHistory().validate(value.predictions);
    // Backups deliberately resume from the path, not an arbitrary imported session.
    return state;
  }
  const api={VERSION,today,addDays,fresh,xp,grade,streak,due,validate,restoreSession};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.QuestEngine=api;
})(typeof window!=='undefined'?window:globalThis);
