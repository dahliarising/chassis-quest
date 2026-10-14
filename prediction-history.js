(function(root){
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const Q=node?require('./prediction.js'):root.VehiclePrediction;
  const MAX_CASES=2500,MAX_ATTEMPTS=1000000;
  const choices=['increase','decrease','same'];
  const snapshotKeys=['version','scene','metricLabel','before','after'];
  const recordKeys=['snapshot','firstChoice','firstCorrect','lastChoice','attempts','wrong','resolved','firstDate','lastDate'];
  const concepts={
    bounce:{'고유 진동수':['frequency','질량·강성과 고유 진동수'],'감쇠비':['damping','감쇠와 진동 응답']},
    ride:{'최대 현가 변위':['ride-stroke','범프와 현가 변위']},
    resonance:{'정상상태 진폭':['resonance','공진과 정상상태 진폭']},
    steer:{'뒤 차축 중심 회전 반경':['steering-radius','저속 조향과 회전 반경']},
    brake:{'정지 거리':['braking-distance','속도·마찰과 제동 거리']},
    roll:{'정상 롤각':['roll','롤 모멘트와 강성']},
    hardpoint:{'최종 캠버각':['hardpoint-camber','하드포인트와 캠버 변화']},
    knc:{'최종 토각':['knc-toe','K&C와 토 변화']},
    alignment:{'조향 후 캠버각':['steering-camber','킹핀·캐스터와 조향 캠버']},
    cornering:{'정상 요레이트':['cornering-yaw','코너링과 요 응답']}
  };
  const fail=()=>{throw new Error('예측 퀴즈 기록이 올바르지 않습니다.');};
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
  const dataField=(value,key)=>{const property=Object.getOwnPropertyDescriptor(value,key);return property&&property.enumerable&&Object.prototype.hasOwnProperty.call(property,'value');};
  const exactKeys=(value,keys)=>object(value)&&Reflect.ownKeys(value).length===keys.length&&keys.every(key=>dataField(value,key));
  const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
  const integer=(value,max)=>Number.isInteger(value)&&value>=0&&value<=max;
  const clone=value=>JSON.parse(JSON.stringify(value));
  function physics(){
    // The combined API also contains the six original models.
    if(!node)return root.VehiclePhysics;
    return require('./advanced-physics.js');
  }
  function inputs(value,scene){
    const keys=scene.controls.map(control=>control.key).sort();
    if(!exactKeys(value,keys))fail();
    const result={};
    for(const key of keys){
      const control=scene.controls.find(item=>item.key===key),number=value[key];
      if(typeof number!=='number'||!Number.isFinite(number)||number<control.min||number>control.max)fail();
      result[key]=number===0?0:number;
    }
    return result;
  }
  function checkedSnapshot(value){
    if(!exactKeys(value,snapshotKeys)||value.version!==1||typeof value.scene!=='string'||typeof value.metricLabel!=='string')fail();
    const P=physics();
    if(!Object.prototype.hasOwnProperty.call(P.scenes,value.scene))fail();
    const scene=P.scenes[value.scene],before=inputs(value.before,scene),after=inputs(value.after,scene);
    const a=P.simulate(value.scene,before),b=P.simulate(value.scene,after);
    if(a.valid===false||b.valid===false)fail();
    const question=Q.create(a,b);
    if(!question||!Number.isFinite(question.before)||!Number.isFinite(question.after)||!choices.includes(question.correct)||question.metricLabel!==value.metricLabel||!concepts[value.scene]||!Object.prototype.hasOwnProperty.call(concepts[value.scene],value.metricLabel))fail();
    const snapshot={version:1,scene:value.scene,metricLabel:question.metricLabel,before,after};
    const key=JSON.stringify([snapshot.scene,snapshot.metricLabel,before,after]);
    return {snapshot,key,question};
  }
  function snapshot(before,after){
    if(!object(before)||!object(after)||before.kind!==after.kind)fail();
    const P=physics();
    if(!Object.prototype.hasOwnProperty.call(P.scenes,before.kind))fail();
    const scene=P.scenes[before.kind],a=P.simulate(before.kind,inputs(before.params,scene)),b=P.simulate(after.kind,inputs(after.params,scene));
    if(a.valid===false||b.valid===false)fail();
    const question=Q.create(a,b);if(!question)fail();
    return checkedSnapshot({version:1,scene:before.kind,metricLabel:question.metricLabel,before:a.params,after:b.params}).snapshot;
  }
  function checkedRecord(key,value){
    if(!exactKeys(value,recordKeys))fail();
    const checked=checkedSnapshot(value.snapshot);
    if(key!==checked.key||!choices.includes(value.firstChoice)||!choices.includes(value.lastChoice)||!integer(value.attempts,MAX_ATTEMPTS)||value.attempts<1||!integer(value.wrong,value.attempts))fail();
    const firstCorrect=value.firstChoice===checked.question.correct,lastCorrect=value.lastChoice===checked.question.correct;
    if(value.firstCorrect!==firstCorrect||value.resolved!==lastCorrect||!date(value.firstDate)||!date(value.lastDate)||value.lastDate<value.firstDate)fail();
    if(value.attempts===1){
      if(value.firstChoice!==value.lastChoice||value.wrong!==Number(!firstCorrect)||value.firstDate!==value.lastDate)fail();
    }else{
      // First and last attempts are distinct observations; intermediate choices
      // are not stored, but their possible counts still constrain the totals.
      const endWrong=Number(!firstCorrect)+Number(!lastCorrect),endCorrect=2-endWrong;
      if(value.wrong<endWrong||value.wrong>value.attempts-endCorrect)fail();
    }
    return {snapshot:checked.snapshot,firstChoice:value.firstChoice,firstCorrect,lastChoice:value.lastChoice,attempts:value.attempts,wrong:value.wrong,resolved:lastCorrect,firstDate:value.firstDate,lastDate:value.lastDate};
  }
  function collection(records){
    if(!object(records)||Reflect.ownKeys(records).length>MAX_CASES||Reflect.ownKeys(records).some(key=>typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!dataField(records,key)))fail();
  }
  function validate(records){
    collection(records);
    const result={};
    for(const [key,value] of Object.entries(records))result[key]=checkedRecord(key,value);
    return result;
  }
  function record(records,value,choiceId,day){
    collection(records);
    if(!choices.includes(choiceId)||!date(day))fail();
    const checked=checkedSnapshot(value),key=checked.key,correct=choiceId===checked.question.correct;
    const previous=Object.prototype.hasOwnProperty.call(records,key)?checkedRecord(key,records[key]):null;
    if(previous&&(previous.attempts>=MAX_ATTEMPTS||day<previous.lastDate))fail();
    if(!previous&&Object.keys(records).length>=MAX_CASES)throw new Error('예측 조건 2,500개가 저장되어 있습니다. 기록을 내보낸 뒤 저장 공간을 정리해 주세요.');
    const entry={snapshot:checked.snapshot,firstChoice:previous?previous.firstChoice:choiceId,firstCorrect:previous?previous.firstCorrect:correct,lastChoice:choiceId,attempts:(previous?previous.attempts:0)+1,wrong:(previous?previous.wrong:0)+Number(!correct),resolved:correct,firstDate:previous?previous.firstDate:day,lastDate:day};
    records[key]=entry;
    return {key,record:clone(entry)};
  }
  function summarize(records){
    const groups=new Map();
    for(const entry of Object.values(records)){
      const [conceptId,label]=concepts[entry.snapshot.scene][entry.snapshot.metricLabel];
      if(!groups.has(conceptId))groups.set(conceptId,{conceptId,label,cases:0,firstWrong:0,attempts:0,wrong:0,unresolved:0});
      const group=groups.get(conceptId);
      group.cases++;group.firstWrong+=Number(!entry.firstCorrect);group.attempts+=entry.attempts;group.wrong+=entry.wrong;group.unresolved+=Number(!entry.resolved);
    }
    return [...groups.values()].sort((a,b)=>b.firstWrong-a.firstWrong||b.unresolved-a.unresolved||b.wrong-a.wrong||a.conceptId.localeCompare(b.conceptId));
  }
  function unresolved(records){
    return Object.entries(records).filter(([,entry])=>!entry.resolved).map(([key,entry])=>({key,...clone(entry)})).sort((a,b)=>b.lastDate.localeCompare(a.lastDate)||b.wrong-a.wrong||a.key.localeCompare(b.key));
  }
  const api={snapshot,record,validate,summarize,unresolved};
  if(node)module.exports=api;else root.PredictionHistory=api;
})(typeof window!=='undefined'?window:globalThis);
