(() => {
  'use strict';
  const E = window.QuestEngine, H = window.PredictionHistory, app = document.getElementById('app');
  const lectures = window.LECTURES || [], missions = [...(window.MISSIONS_EARLY||[]),...(window.MISSIONS_LATE||[])];
  if(lectures.length!==60 || missions.length!==60) { app.innerHTML='<main style="padding:50px"><h1>학습 자료를 불러오지 못했어요.</h1><p>페이지를 새로고침한 뒤 다시 시도해 주세요.</p></main>'; return; }
  const chapters = [
    ['진동의 언어',1,7,'힘과 움직임을 수식으로 연결하기'],['차량을 모델로',8,15,'쿼터카에서 승차감까지'],
    ['부품의 성격',16,22,'스프링·댐퍼·부싱·타이어 이해하기'],['데이터를 읽는 눈',23,28,'주파수와 모드로 원인 찾기'],
    ['가상에서 실차로',29,33,'모델을 만들고 시험으로 검증하기'],['서스펜션의 움직임',34,40,'기구학과 K&C 해석하기'],
    ['원하는 대로 돌기',41,46,'조향과 횡방향 거동 연결하기'],['잘 멈추는 기술',47,52,'제동·하중 이동·제어 이해하기'],
    ['차량 전체를 보기',53,56,'EV·롤·풀카·능동 제어 통합하기'],['전문가의 판단',57,60,'컴플라이언스·내구·평가·타이어 종합하기']
  ];
  const icons = {
    route:'<path d="M5 5h6a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h11"/><circle cx="5" cy="5" r="2"/><path d="m16 16 3 3-3 3"/>',
    wrench:'<path d="M14 5a6 6 0 0 0-7 7L3 16a3 3 0 0 0 4 4l5-5a6 6 0 0 0 7-8l-4 4-3-3 4-4Z"/>',
    lab:'<path d="M9 3h6m-5 0v7l-6 9a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M7 15h10"/>',
    chart:'<path d="M4 4v16h17M8 16v-4m5 4V8m5 8V5"/>',
    fire:'<path d="M13 2c0 7-7 7-7 13a6 6 0 0 0 12 0c0-3-2-6-3-7 0 4-3 5-3 5s-3-4 1-11Z"/>',
    bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/>',
    gem:'<path d="m3 8 4-5h10l4 5-9 13L3 8Zm0 0h18M7 3l5 18 5-18"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    cup:'<path d="M8 3h8v8a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 3v6m-4 0h8"/>',
    book:'<path d="M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.book}</svg>`;
  const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mascot = () => `<svg viewBox="0 0 340 280" role="img" aria-label="스프링을 닮은 샤시 퀘스트 정비사"><ellipse cx="178" cy="250" rx="110" ry="15" fill="#ced9f2"/><g stroke="#c9d5f0" stroke-width="1.5" fill="none"><path d="M34 182h260M41 98h230M59 52v175M289 65v160" stroke-dasharray="5 6"/><circle cx="275" cy="67" r="23"/><path d="m262 67 9 9 16-17" stroke="#839ad0" stroke-width="3"/></g><g transform="rotate(-8 173 148)"><path d="M144 210v29h-29m92-29v29h30" fill="none" stroke="#354caf" stroke-width="13" stroke-linecap="round"/><path d="M120 111 88 134l-14-8m149-15 30 28 16-9" fill="none" stroke="#354caf" stroke-width="11" stroke-linecap="round"/><rect x="139" y="48" width="58" height="165" rx="24" fill="#c1cef8"/><rect x="151" y="23" width="34" height="44" rx="12" fill="#9bace4"/><rect x="118" y="66" width="104" height="70" rx="24" fill="#455bdb"/><path d="M115 68c0-23 23-42 53-42s53 19 53 42" fill="#f5c84c"/><path d="M104 68h128" stroke="#d8a529" stroke-width="9" stroke-linecap="round"/><path d="M169 27v30" stroke="#ffde73" stroke-width="10" stroke-linecap="round"/><ellipse cx="150" cy="98" rx="6" ry="8" fill="#fff"/><ellipse cx="191" cy="98" rx="6" ry="8" fill="#fff"/><path d="M162 113q9 9 18 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="m132 141 78 16-78 17 78 17-78 17" stroke="#455bdb" stroke-width="13" stroke-linejoin="round" fill="none"/><path d="M132 218h78" stroke="#354caf" stroke-width="12" stroke-linecap="round"/></g><g transform="rotate(13 287 163)"><path d="m276 171 6 42" stroke="#647cae" stroke-width="10" stroke-linecap="round"/><path d="M277 148c-13 9-10 23 2 25 13-1 16-15 9-24l-3 12-9-1Z" fill="#647cae"/></g><path d="m41 57 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="#f5c84c"/></svg>`;
  const byDay = new Map(lectures.map(l=>[l.day,l]));
  const missionByDay = new Map(missions.map(m=>[m.day,m]));
  const coaching = {...window.COACHING_EARLY,...window.COACHING_LATE};
  const garageLines = [
    ['감으로 찍던 손, 이제 자유물체도를 그립니다.','스프링: 힘은 내가 낼게. 부호는 네가 챙겨줘.'],
    ['쿼터카: 차는 ¼인데 생각할 건 한가득.','차체와 바퀴가 각자 출렁이는 중. 팀워크 회의가 필요해요.'],
    ['댐퍼: 출렁임은 제가 수습하겠습니다.','부품 이름은 익숙한데, 식으로 만나니 초면입니다.'],
    ['시간 파형: 정신없죠? 주파수별로 줄 서세요.','피크 발견! 범인 확정은 아직입니다.'],
    ['모델: 실행은 됩니다. 맞는지는 시험에 물어봐 주세요.','해석과 시험의 소개팅. 단위부터 맞춰봅시다.'],
    ['링크 하나 움직였는데 토와 캠버가 단체 출근.','정렬했는데 움직이면 달라지는 너, 기구학.'],
    ['핸들은 조금 돌렸는데 회의는 많이 돌아갑니다.','타이어: 조향각 받았습니다. 횡력은 조건 보고 드릴게요.'],
    ['잘 멈추는 차도, 계산할 때는 한 단계씩.','ABS: 바쁘지만 바퀴를 완전히 잠그진 않을게요.'],
    ['차량 전체 회의: 좋은 부품도 합을 맞춰야죠.','질량, 강성, 감쇠: 오늘도 서로의 업무에 관여 중.'],
    ['전문가의 한마디: 그때 시험 조건이 뭐였죠?','그래프는 정직합니다. 해석은 우리가 잘해야 합니다.']
  ];
  const bank = new Map();
  lectures.forEach(l=>(l.questions||[]).forEach(q=>bank.set(q.id,{...q,day:l.day,kind:q.type==='choice'?'강의 퀴즈':'설명 연습'})));
  missions.forEach(m=>{
    bank.set(m.id,m);
    if(m.reflection) bank.set(m.id+'-recall',{id:m.id+'-recall',day:m.day,type:'recall',kind:'설명 연습',prompt:m.reflection.prompt,explanation:m.reflection.explanation,sourceLabel:m.sourceLabel});
  });
  bank.forEach(q=>{const prompt=coaching[q.day]?.questions[q.id]?.prompt;if(prompt)q.prompt=prompt;});
  const KEY = 'chassis-quest-v1';
  let storageOK=true,loadNotice='',state=E.fresh();
  try {
    const raw=localStorage.getItem(KEY);
    if(raw) {
      const parsed=JSON.parse(raw); state=E.validate(parsed,[...bank.keys()]);
      state.session=E.restoreSession(parsed.session,bank,state.cards);
    }
  } catch(error) { storageOK=false; loadNotice='저장된 기록을 읽지 못했습니다. 기존 기록을 덮어쓰지 않으며, 이번 학습은 백업 파일로 저장할 수 있습니다.'; }
  let view='path',selectedChapter=chapterOf(nextDay()), active=Boolean(state.session),toastTimer,visualCleanup=null, predictionRetry=null, labScene='bounce';
  function chapterOf(day){return chapters.findIndex(c=>day>=c[1]&&day<=c[2])+1;}
  function nextDay(){return lectures.find(l=>!state.completed[l.day])?.day||1;}
  function save(){ if(!storageOK)return; try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){storageOK=false;toast('브라우저 저장이 막혀 있어요. 성장 기록에서 백업을 내려받으세요.');} }
  function toast(message){const node=document.getElementById('toast');node.textContent=message;node.classList.add('toast-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('toast-visible'),4200);}
  function dueIds(){return E.due(state,[...bank.keys()]).sort((a,b)=>state.cards[a].due.localeCompare(state.cards[b].due));}
  function sourceHref(l){return location.protocol==='file:'?l.sourceUrl:'lecture/'+encodeURIComponent(l.filename);}
  function sourceLink(day){const l=byDay.get(day);return `<a class="source-link" href="${esc(sourceHref(l))}" target="_blank" rel="noopener">${icon('book')} Day ${String(day).padStart(2,'0')} 원문 강의 열기</a>`;}
  function clearVisual(){if(visualCleanup){visualCleanup();visualCleanup=null;}}
  function mountVisual(day,questionId,mode,extra={}){
    const host=app.querySelector('[data-visual-host]');
    if(!host)return;
    const guide=window.VISUAL_GUIDES?.[day]||{};
    visualCleanup=window.ChassisVisual.mount(host,{day,questionId,mode,...guide,...extra,onPrediction:({before,after,choiceId})=>{
      try {
        const {record}=H.record(state.predictions,H.snapshot(before,after),choiceId,E.today());
        save();
        const waiting=app.querySelector('[data-prediction-waiting]');
        if(waiting)waiting.textContent=`대기 ${H.unresolved(state.predictions).length}개`;
        const stats=app.querySelector('.prediction-stats');if(stats)stats.outerHTML=predictionStats();
        const count=app.querySelector('[data-review-count]');
        if(count){count.textContent=dueIds().length+H.unresolved(state.predictions).length;count.hidden=count.textContent==='0';}
        return storageOK?(record.resolved?'예측 기록을 저장했어요. 이 조건은 정비 완료!':'오답 정비소에 같은 조건을 저장했어요. 나중에 다시 풀 수 있어요.'):'이번 예측은 임시 기록입니다. 성장 기록에서 백업하세요.';
      } catch(error) {toast(error.message);return '이 예측을 저장하지 못했어요. 다른 조건으로 다시 시도해 주세요.';}
    }});
  }
  function render(){
    clearVisual();
    if(active&&state.session){renderStudy();return;}
    const xp=E.xp(state),level=Math.floor(xp/200)+1,completed=Object.keys(state.completed).length;
    app.innerHTML=`${!storageOK?`<div class="storage-warning" role="alert">${esc(loadNotice||'브라우저 저장을 사용할 수 없습니다. 종료 전 성장 기록에서 백업을 내려받으세요.')}</div>`:''}<div class="shell"><aside class="sidebar"><a class="brand" href="#" data-action="nav" data-view="path"><img src="icon.svg" alt=""><span>샤시 퀘스트<small>매일 쌓이는 엔지니어의 감각</small></span></a><nav class="nav" aria-label="주요 메뉴">${[['path','route','학습 경로'],['review','wrench','오답 정비소'],['lab','lab','실험실'],['progress','chart','성장 기록']].map(([v,i,t])=>`<button data-action="nav" data-view="${v}" class="${view===v?'active':''}" ${view===v?'aria-current="page"':''} aria-label="${t}">${icon(i)}<span class="nav-label">${t}</span>${v==='review'?`<span class="count" data-review-count ${dueIds().length+H.unresolved(state.predictions).length?'':'hidden'}>${dueIds().length+H.unresolved(state.predictions).length}</span>`:''}</button>`).join('')}</nav><div class="sidebar-note"><strong>샤시 전문가를 향해</strong>한 번에 한 개념씩, 꾸준하게.<div class="mini-road">${chapters.map((c,i)=>`<i class="${state.bosses[i+1]?'on':''}"></i>`).join('')}</div>${completed} / 60강 학습 완료</div></aside><div class="content"><header class="topbar"><span class="greeting">나의 샤시 트레이닝</span><div class="stats"><span class="stat fire" title="한국 시간 기준 연속 학습일">${icon('fire')}${E.streak(state)}일</span><span class="stat energy" title="하루에 같은 문제로 XP를 중복 획득하지 않아요">${icon('bolt')}${xp} XP</span><span class="stat" title="학습 활동 레벨">${icon('gem')}Lv. ${level}</span></div></header><main id="main" tabindex="-1">${view==='path'?renderPath():view==='review'?renderReview():view==='lab'?renderLab():renderProgress()}</main></div></div>`;
    if(view==='lab')mountVisual(1,null,'lab',{scene:labScene,caption:window.VehiclePhysics.scenes[labScene].description});
    if(view==='review'&&predictionRetry)mountVisual(null,null,'quiz',{predictionSnapshot:predictionRetry,scene:predictionRetry.scene});
  }
  function renderPath(){
    const next=nextDay(),current=byDay.get(next),c=chapters[selectedChapter-1],items=lectures.filter(l=>l.day>=c[1]&&l.day<=c[2]);
    const count=state.days[E.today()]||0,goal=4,progress=Math.min(100,count/goal*100);
    return `<section class="hero"><div class="hero-copy"><span class="pill">${icon('clock')} 하루 10분의 작은 성장</span><h1>오늘, 한 가지를<br>확실하게.</h1><p>익숙한 실무에 이론을 더해요.<br>직관이 근거 있는 판단이 되는 시간.</p><button class="primary" data-action="${state.session?'resume':'start'}" data-day="${next}">${state.session?'하던 미션 이어하기':'오늘의 미션 시작'} ${icon('route')}</button><p class="tiny">${state.session?'중단한 지점과 답안을 기억하고 있어요.':`Day ${String(next).padStart(2,'0')} · ${esc(current.title)}`}</p></div><div class="hero-art">${mascot()}</div></section><div class="dash-grid"><section><div class="section-heading"><h2>나의 학습 경로</h2><label><span class="hidden">학습 구간 선택</span><select id="chapter" class="chapter-picker" aria-label="학습 구간 선택">${chapters.map((p,i)=>`<option value="${i+1}" ${selectedChapter===i+1?'selected':''}>${i+1}. ${p[0]}</option>`).join('')}</select></label></div><div class="route"><div class="route-header"><h3>${esc(c[0])}</h3><p>${esc(c[3])} <span class="muted">/ Day ${c[1]}–${c[2]}</span></p></div><div class="roadmap">${items.map(l=>{const done=state.completed[l.day],isNext=l.day===next;return `<div class="lesson-node"><button class="node ${done?'done':isNext?'current':''}" data-action="start" data-day="${l.day}" aria-label="Day ${l.day} ${esc(l.title)} ${done?'다시 학습':'학습 시작'}">${done?icon('check'):String(l.day).padStart(2,'0')}</button><div class="node-title"><small>Day ${String(l.day).padStart(2,'0')}</small>${esc(l.title)}${isNext?'<br><span class="tag">추천 미션</span>':''}${done?'<br><span class="tag">학습 완료</span>':''}</div></div>`;}).join('')}</div><div class="boss-row">${icon('cup')}<div><h3 style="font-size:14px">${state.bosses[selectedChapter]?'통과한 체크포인트':'실무 체크포인트'}</h3><p>이 구간의 판단 문제 ${Math.min(5,c[2]-c[1]+1)}개</p></div><button class="secondary" data-action="boss" data-chapter="${selectedChapter}">도전</button></div></div><p class="source-note">실무 경험에 맞춰 어느 강의부터든 시작할 수 있어요. 학습 완료는 전문성 인증을 뜻하지 않아요.</p></section><aside class="side-stack"><div class="note-card"><h3>${icon('bolt')} 오늘의 작은 목표</h3><p>개념을 읽고 4문제를 풀어보세요.<br>약 10분, 정답보다 이해가 먼저예요.</p><div class="meter" role="progressbar" aria-label="오늘의 목표" aria-valuenow="${Math.min(count,goal)}" aria-valuemin="0" aria-valuemax="${goal}"><span style="width:${progress}%"></span></div><div class="daily-row"><span>${count>=goal?'오늘 목표 달성!':'차근차근 쌓는 중'}</span><b>${Math.min(count,goal)} / ${goal}</b></div><div class="week">${Array.from({length:7},(_,i)=>{const day=E.addDays(E.today(),i-6);return `<span>${new Date(day+'T00:00:00Z').toLocaleDateString('ko-KR',{weekday:'narrow',timeZone:'UTC'})}<b class="${state.days[day]?'hit':''}">${state.days[day]?'✓':day.slice(-2)}</b></span>`;}).join('')}</div></div><div class="note-card"><h3>${icon('wrench')} 잊기 전에 한 번 더</h3><p>${dueIds().length?`복습할 ${dueIds().length}문제가 기다려요. 틀렸던 이유까지 떠올려보세요.`:'오늘은 밀린 복습이 없어요. 배운 문제는 간격을 두고 다시 만나요.'}</p><button class="secondary full-btn" data-action="nav" data-view="review">오답 정비소 보기</button></div><div class="note-card goal"><h3>전문가는 이렇게 생각해요</h3><div class="skill-list"><div><i>1</i>현상을 물리로 설명한다</div><div><i>2</i>조건과 단위를 확인한다</div><div><i>3</i>설계 판단을 시험으로 검증한다</div></div></div></aside></div>`;
  }
  function predictionStats(){
    const stats=H.summarize(state.predictions);
    return `<section class="prediction-stats"><h2>자주 헷갈리는 예측 개념</h2><p class="source-note">서로 다른 조건에서 처음 고른 답만 오답률에 반영해요. 재도전은 별도로 셉니다.</p>${stats.length?`<div class="concept-list">${stats.map(item=>`<article><div><strong>${esc(item.label)}</strong><span>첫 예측 오답 ${item.firstWrong} / ${item.cases}개 · ${Math.round(item.firstWrong/item.cases*100)}%</span></div><meter min="0" max="${item.cases}" value="${item.firstWrong}" aria-label="${esc(item.label)} 첫 예측 오답 ${item.firstWrong}개 중 전체 ${item.cases}개"></meter><p>총 오답 ${item.wrong}회 · 재도전 ${item.attempts-item.cases}회 · 정비 대기 ${item.unresolved}개</p></article>`).join('')}</div>`:'<p>예측 퀴즈를 풀면 여기서 개념별 기록을 확인할 수 있어요.</p>'}</section>`;
  }
  function predictionGarage(){
    const waiting=H.unresolved(state.predictions),resolved=Object.entries(state.predictions).filter(([,r])=>r.wrong>0&&r.resolved).map(([key,r])=>({key,...r}));
    const cards=records=>records.map(record=>{
      const definition=window.VehiclePhysics.scenes[record.snapshot.scene],changes=definition.controls.filter(c=>record.snapshot.before[c.key]!==record.snapshot.after[c.key]).map(c=>`${c.label} ${record.snapshot.before[c.key]} → ${record.snapshot.after[c.key]} ${c.unit}`).join(' · ');
      return `<article class="review-item"><span class="day-badge">예측</span><div class="copy"><h3>${esc(record.snapshot.metricLabel)}</h3><p>${esc(changes)}</p><p>${record.resolved?'정비 완료':'정비 대기'} · 오답 ${record.wrong}회 / 시도 ${record.attempts}회 · ${esc(record.lastDate)}</p></div><button class="secondary" data-action="prediction-retry" data-key="${esc(record.key)}">다시 예측</button></article>`;
    }).join('');
    return `<section class="prediction-garage"><div class="section-heading"><h2>움직임 예측 정비소</h2><span class="tag" data-prediction-waiting>대기 ${waiting.length}개</span></div><p class="source-note">틀렸던 기준·변경 값을 그대로 불러옵니다. 값을 바꿔 풀면 별개의 조건으로 기록돼요.</p>${predictionRetry?'<button class="secondary" data-action="prediction-close">예측 목록으로</button><div data-visual-host></div>':`${waiting.length?`<div class="review-list">${cards(waiting)}</div>`:'<p class="prediction-empty">대기 중인 예측 오답이 없어요. 실험실에서 먼저 맞혀보기에 도전하세요.</p>'}${resolved.length?`<details class="prediction-resolved"><summary>정비한 예측 ${resolved.length}개 다시 보기</summary><div class="review-list">${cards(resolved)}</div></details>`:''}`}</section>`;
  }
  function renderReview(){
    const due=dueIds(),all=Object.entries(state.cards),future=all.filter(([,c])=>c.due>E.today()).sort((a,b)=>a[1].due.localeCompare(b[1].due));
    return `<div class="page-intro"><h1>오답 정비소</h1><p>틀린 문제는 학습의 출발점이에요. 해설을 확인하고, 다음에는 스스로 설명해보세요.</p></div>${predictionGarage()}${predictionStats()}<h2 class="lecture-review-heading">강의 복습</h2>${due.length?`<div class="page-actions"><button class="primary" data-action="review">복습 ${Math.min(5,due.length)}문제 시작</button><span class="muted">오늘 복습 대상 ${due.length}개</span></div><div class="review-list">${due.map(id=>{const q=bank.get(id),card=state.cards[id];return `<article class="review-item"><span class="day-badge">Day ${q.day}</span><div class="copy"><h3>${esc(q.prompt)}</h3><p>${q.type==='recall'?'자기평가 회상':'객관식'} · ${card.lapses?'다시 다질 개념':'기억 점검'} · ${esc(card.due)} 복습</p></div><button class="secondary" data-action="review-one" data-id="${esc(id)}">풀기</button></article>`;}).join('')}</div>`:`<div class="empty"><div class="empty-icon">${icon('wrench')}</div><h2>오늘 강의 복습은 끝!</h2><p>${future.length?`다음 복습은 ${future[0][1].due}에 열려요. 원하면 지금 기억을 점검할 수도 있어요.`:'미션을 풀면 나만의 복습 카드가 생겨요. 틀린 문제는 당일, 익힌 문제는 1·3·7·14·30일 뒤 다시 만나요.'}</p><button class="primary" data-action="${all.length?'practice':'start'}" data-day="${nextDay()}">${all.length?'배운 내용 미리 복습':'첫 미션 시작'}</button></div>`}<p class="source-note">같은 날의 재도전은 복습 간격을 늘리지 않아요. XP는 문제당 하루 한 번만 쌓이며, 자기평가 회상은 객관식 정답률과 별도로 기록해요.</p>`;
  }
  function renderLab(){return `<div class="page-intro"><h1>값을 바꿔 보는 샤시</h1><p>먼저 움직임을 예측하고, 두 그림으로 확인하세요. 새 심화 실습에는 정의·공식·실험 순서가 함께 있어요.</p></div><div class="deep-lab-links" aria-label="샤시 심화 실습">${[['hardpoint','하드포인트'],['knc','K&C · 토·캠버'],['alignment','킹핀 · 캐스터'],['cornering','코너링 · 조향']].map(([id,label])=>`<button class="secondary" data-action="lab-scene" data-scene="${id}" aria-pressed="${labScene===id}">${label}</button>`).join('')}</div><div class="lab-visual" data-visual-host></div>`;}
  function renderProgress(){
    const done=Object.values(state.completed),correct=done.reduce((s,c)=>s+c.correct,0),total=done.reduce((s,c)=>s+c.total,0),self=done.reduce((s,c)=>s+c.selfChecks,0);
    return `<div class="page-intro"><h1>쌓이는 나의 성장</h1><p>활동 점수와 이해도를 구별해보세요. XP는 꾸준함, 첫 시도 정답률은 개념 점검의 단서예요.</p></div><div class="progress-summary"><div><strong>${done.length}<small> / 60</small></strong><small>학습한 강의</small></div><div><strong>${total?Math.round(correct/total*100)+'%':'—'}</strong><small>최근 학습 첫 시도 객관식</small></div><div><strong>${self}</strong><small>설명 연습 자기점검</small></div></div>${predictionStats()}<div class="skills-grid">${chapters.map((c,i)=>{const count=lectures.filter(l=>l.day>=c[1]&&l.day<=c[2]&&state.completed[l.day]).length,size=c[2]-c[1]+1,boss=state.bosses[i+1];return `<article class="skill-card"><h3>${boss?'🏅 ':''}${c[0]}</h3><p>${c[3]}</p><div class="meter"><span style="width:${count/size*100}%"></span></div><div class="daily-row"><span>${count} / ${size}강</span><span>${boss?'체크포인트 통과':'체크포인트 도전 가능'}</span></div><button class="ghost practice-button" data-action="chapter" data-chapter="${i+1}">이 구간 학습하기</button></article>`;}).join('')}</div><div class="backup"><h3>나의 학습 기록 보관</h3><p>기록은 이 브라우저에 저장돼요. 다른 브라우저·기기로 옮기거나 브라우저 데이터를 지우기 전에 백업하세요. 서버나 계정으로 자동 동기화되지 않습니다.</p><div class="backup-actions"><button class="secondary" data-action="export">학습 기록 백업</button><button class="secondary" data-action="import">백업 불러오기</button><input class="hidden" type="file" id="import-file" accept="application/json,.json"></div></div><details class="source-note"><summary>강의 출처와 콘텐츠 검토</summary><p>지정한 VehicleDynamics_Lectures 폴더의 60개 HTML 강의를 바탕으로 구성했습니다. ‘실무 판단’과 설명 연습은 학습용으로 새로 작성했습니다. 정답키 불일치·주제 불일치·명백한 오류가 확인된 원문 퀴즈는 제외했고 원본 파일은 수정하지 않았습니다. 원문 자체의 전체 기술 검증을 완료했다는 뜻은 아닙니다.</p><p><a href="data/source-report.json" target="_blank" rel="noopener">원문 문제 추출 검토 기록</a> · 각 강의의 원문은 미션에서 열 수 있습니다.</p></details>`;
  }
  function startSession(mode,ids,day,chapter){
    if(state.session && state.session.stage!=='result' && !confirm('진행 중인 미션을 새 미션으로 바꿀까요? 이미 쌓인 XP와 복습 기록은 유지됩니다.'))return;
    state.session={mode,queue:ids,index:0,stage:mode==='lesson'?'brief':'question',day,chapter,answers:[],retried:[],feedback:null,selection:null,recallText:'',revealed:false,startXP:E.xp(state),order:{}};
    active=true;save();render();window.scrollTo(0,0);
  }
  function startLesson(day){
    const l=byDay.get(day),m=missionByDay.get(day);if(!l||!m)return;
    const qs=(l.questions||[]).filter(q=>q.type==='choice').map(q=>q.id);
    qs.push(m.id);if(bank.has(m.id+'-recall'))qs.push(m.id+'-recall');
    startSession('lesson',qs,day,chapterOf(day));
  }
  function renderStudy(){
    clearVisual();
    const s=state.session,l=byDay.get(s.day),m=missionByDay.get(s.day),q=bank.get(s.queue[s.index]);
    if(s.stage==='result'){renderResult();return;}
    if(!q){finishSession();return;}
    let body,footer;
    if(s.stage==='brief'){
      body=`<div class="study-meta"><span class="pill">개념 워밍업</span><span>Day ${String(s.day).padStart(2,'0')} · ${esc(chapters[chapterOf(s.day)-1][0])}</span></div><h1>${esc(l.title)}</h1><div class="brief-visual">${mascot()}</div><p class="brief-text">${esc(m.brief||l.summary||m.explanation)}</p>${m.formula?`<div class="formula">${esc(m.formula)}</div>`:''}${sourceLink(s.day)}<p class="study-tip">읽은 뒤 화면을 넘겨 기억을 꺼내보세요. 미션은 ${s.queue.length}문제이며, 부족하면 다음 미션까지 이어서 하루 10분을 채울 수 있어요.</p>`;
      footer=`<p>원리 이해 → 실무 판단 → 내 말로 설명</p><button class="primary" data-action="begin">문제 풀어보기</button>`;
    }else{
      body=`<div class="study-meta"><span class="pill">${esc(q.kind||'개념 확인')}</span><span>Day ${q.day} · ${s.retried.includes(q.id)?'오답 재도전':q.type==='recall'?'자기평가':'객관식'}</span></div><h1>${esc(q.prompt)}</h1>`;
      if(q.type==='choice'){
        if(!s.order[q.id]){s.order[q.id]=q.options.map((_,i)=>i);for(let i=s.order[q.id].length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s.order[q.id][i],s.order[q.id][j]]=[s.order[q.id][j],s.order[q.id][i]];}save();}
        body+=`<div class="choices" role="group" aria-label="답 선택">${s.order[q.id].map((i,n)=>`<button class="choice ${s.selection===i?'selected':''} ${s.feedback&&i===q.answer?'correct':''} ${s.feedback&&s.selection===i&&i!==q.answer?'wrong':''}" data-action="select" data-index="${i}" aria-pressed="${s.selection===i}" ${s.feedback?'disabled':''}><span class="key">${n+1}</span><span>${esc(q.options[i])}</span></button>`).join('')}</div>`;
        footer=`<p>답을 고른 뒤 확인하세요.</p><button class="primary" data-action="check" ${s.selection===null?'disabled':''}>정답 확인</button>`;
      }else{
        body+=`<label for="recall" class="study-tip" style="display:block">자기 말로 설명해보세요. 메모는 선택이며 자동 채점하지 않아요.</label><textarea id="recall" class="recall-input" placeholder="왜 그런지, 어떤 조건에서 성립하는지…" ${s.revealed?'readonly':''}>${esc(s.recallText)}</textarea>${s.revealed?`<div class="model-answer"><b>답안과 비교해보세요</b>${esc(q.explanation)}</div>`:''}`;
        footer=s.revealed?`<p>핵심 원리와 조건을 설명했나요?<br>솔직한 자기평가가 복습 시점을 정해요.</p><div class="self-actions"><button class="secondary" data-action="self" data-correct="false">다시 익힐래요</button><button class="primary" data-action="self" data-correct="true">설명할 수 있어요</button></div>`:`<p>먼저 답을 떠올린 뒤 비교해보세요.</p><button class="primary" data-action="reveal">답안 보기</button>`;
      }
      body+=`<p class="study-tip">${esc(q.sourceLabel||'강의 기반 학습 문제')}</p>`;
    }
    if(s.feedback){
      body+=renderCoaching(q,s);
      footer=`<div class="feedback-copy"><strong>${s.feedback.correct?'원리까지 챙겼어요.':'이유를 읽고 다시 도전해요.'}</strong><small>${q.type==='recall'?'자기평가 · ':''}복습 ${state.cards[q.id].due}</small></div><button class="primary" data-action="next">계속</button>`;
    }
    app.innerHTML=`<div class="study"><header class="study-top"><button class="exit" data-action="pause" aria-label="저장하고 학습 경로로">${icon('close')}</button><div class="meter" role="progressbar" aria-label="미션 진행" aria-valuemin="0" aria-valuemax="${s.queue.length}" aria-valuenow="${s.index}"><span style="width:${s.index/s.queue.length*100}%"></span></div><small>${s.stage==='brief'?'워밍업':`${s.index+1} / ${s.queue.length}`}</small></header><main id="main" class="study-body">${body}</main><footer class="study-footer ${s.feedback?'feedback '+(s.feedback.correct?'good':'bad'):q.type==='recall'&&s.revealed?'recall-footer':''}"><div class="footer-inner">${footer}</div></footer></div>`;
    if(s.feedback)mountVisual(q.day,q.id,'feedback');
    const focusTarget = s.feedback ? '.coach-heading' : s.revealed ? '.model-answer' : s.selection !== null ? `[data-action="select"][data-index="${s.selection}"]` : '.study-body h1';
    const focusElement = app.querySelector(focusTarget);
    if(focusElement){if(focusElement.tagName!=='BUTTON')focusElement.tabIndex=-1;focusElement.focus({preventScroll:true});}
  }
  function renderCoaching(q,s){
    const good=s.feedback.correct,day=coaching[q.day],guide=day?.questions[q.id],choice=q.type==='choice';
    const why=choice?(guide?.why[s.selection]||q.explanation):q.explanation;
    const definitions=day?.definitions||[],steps=choice?(guide?.steps||[]):[];
    const detail=`${definitions.length?`<section class="coach-definitions"><h3>먼저 필요한 정의</h3><dl>${definitions.map(d=>`<div><dt>${esc(d.term)}</dt><dd>${esc(d.meaning)}</dd></div>`).join('')}</dl></section>`:''}${steps.length?`<section class="coach-steps"><h3>이렇게 접근해요</h3><ol>${steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol></section>`:''}${day?.intuition?`<p class="coach-takeaway"><b>한 줄로 기억</b>${esc(day.intuition)}</p>`:''}<div class="coach-source">${sourceLink(q.day)}</div>`;
    const joke=garageLines[chapterOf(q.day)-1][good?0:1];
    return `<section class="coach-panel ${good?'coach-good':'coach-repair'}" aria-labelledby="coach-title"><div class="coach-reaction"><div class="coach-mascot" aria-hidden="true">${mascot()}</div><div><span class="coach-label">${good?'이해 한 칸 충전':'개념 정비 타임'}</span><h2 id="coach-title" class="coach-heading" tabindex="-1">${good?'맞았어요. 이유도 확인해요.':choice?'어디서 갈렸는지 볼까요?':'정의부터 다시 연결해요.'}</h2><p class="garage-joke">${esc(joke)}</p></div></div>${choice?`<div class="answer-comparison">${!good?`<p><span>내 선택</span>${esc(q.options[s.selection])}</p>`:''}<p><span>정답</span>${esc(q.options[q.answer])}</p></div>`:''}<section class="coach-diagnosis"><h3>${choice?(good?'이 답이 맞는 이유':'내 선택이 다른 이유'):'모범 답안의 핵심'}</h3><p>${esc(why)}</p></section><div data-visual-host></div>${good?`<details class="coach-more"><summary>정의와 접근법까지 보기</summary>${detail}</details>`:detail}</section>`;
  }
  function answer(correct){
    const s=state.session;if(!s||s.feedback||s.stage!=='question')return;
    const q=bank.get(s.queue[s.index]);
    s.answers.push({id:q.id,correct,type:q.type,retry:s.retried.includes(q.id)});
    E.grade(state,q.id,correct);
    if(!correct&&!s.retried.includes(q.id)&&!s.queue.slice(s.index+1).includes(q.id))s.queue.push(q.id);
    s.feedback={correct};save();renderStudy();
    app.querySelector('.coach-panel')?.scrollIntoView({block:'start',behavior:'auto'});
  }
  function finishSession(){
    const s=state.session,first=s.answers.filter(a=>!a.retry),objective=first.filter(a=>a.type==='choice');
    s.result={correct:objective.filter(a=>a.correct).length,total:objective.length,selfChecks:first.filter(a=>a.type==='recall').length};
    if(s.mode==='lesson')state.completed[s.day]={date:E.today(),...s.result};
    if(s.mode==='boss'&&s.result.total&&s.result.correct/s.result.total>=.8)state.bosses[s.chapter]={date:E.today(),correct:s.result.correct,total:s.result.total};
    s.stage='result';save();renderResult();window.scrollTo(0,0);
  }
  function renderResult(){
    clearVisual();
    const s=state.session,r=s.result,pass=s.mode!=='boss'||(r.total&&r.correct/r.total>=.8),gain=E.xp(state)-s.startXP;
    app.innerHTML=`<div class="study"><header class="study-top"><a class="brand" href="#" data-action="finish"><img src="icon.svg" alt=""><span>샤시 퀘스트</span></a></header><main id="main" class="study-body result"><div class="trophy">${pass?'🏁':'🔧'}</div><h1>${s.mode==='boss'?(pass?'체크포인트 통과!':'조금 더 다듬어볼까요?'):s.mode==='lesson'?'오늘도 한 걸음 앞으로.':'기억이 한층 단단해졌어요.'}</h1><p>${s.mode==='lesson'?`Day ${s.day} 학습을 마쳤어요. 실제 상황에서 원리와 조건을 설명해보세요.`:s.mode==='boss'?'첫 시도 객관식 80% 이상이면 배지를 얻어요. 재도전은 언제든 가능해요.':'잊을 만할 때 다시 꺼내보는 과정이 실력을 만들어요.'}</p><div class="result-stats"><div><b>+${gain}</b><small>이번 미션 XP</small></div><div><b>${r.total?`${r.correct}/${r.total}`:'—'}</b><small>첫 시도 객관식</small></div><div><b>${r.selfChecks}</b><small>설명 연습</small></div></div><p class="study-tip">${dueIds().length?`아직 다질 문제 ${dueIds().length}개는 오답 정비소에 남겨뒀어요.`:'복습 카드가 저장됐어요. 내일 다시 기억을 확인해요.'}</p><div style="margin-top:28px"><button class="primary" data-action="finish">학습 경로로</button>${s.mode==='lesson'&&s.day<60?`<button class="secondary" data-action="next-lesson" data-day="${s.day+1}">다음 미션</button>`:''}</div></main></div>`;
  }
  app.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    event.preventDefault();const action=button.dataset.action,s=state.session;
    if(action==='nav'){view=button.dataset.view;active=false;predictionRetry=null;render();window.scrollTo(0,0);}
    else if(action==='prediction-retry'){const record=state.predictions[button.dataset.key];if(record){predictionRetry=record.snapshot;view='review';active=false;render();app.querySelector('[data-visual-host]').scrollIntoView({block:'start'});}}
    else if(action==='prediction-close'){predictionRetry=null;render();}
    else if(action==='lab-scene'){if(window.VehiclePhysics.scenes[button.dataset.scene]){labScene=button.dataset.scene;view='lab';active=false;render();}}
    else if(action==='start')startLesson(Number(button.dataset.day));
    else if(action==='resume'){active=true;render();window.scrollTo(0,0);}
    else if(action==='chapter'){selectedChapter=Number(button.dataset.chapter);view='path';render();window.scrollTo(0,300);}
    else if(action==='boss'){const chapter=Number(button.dataset.chapter),c=chapters[chapter-1],ids=missions.filter(m=>m.day>=c[1]&&m.day<=c[2]).map(m=>m.id).slice(0,5);startSession('boss',ids,c[1],chapter);}
    else if(['review','review-one','practice'].includes(action)){const ids=action==='review-one'?[button.dataset.id]:action==='review'?dueIds().slice(0,5):Object.keys(state.cards).sort((a,b)=>state.cards[a].due.localeCompare(state.cards[b].due)).slice(0,5);if(ids.length)startSession('review',ids,bank.get(ids[0]).day,chapterOf(bank.get(ids[0]).day));}
    else if(action==='pause'){active=false;save();render();toast('이 지점까지 저장했어요. 언제든 이어갈 수 있어요.');}
    else if(action==='begin'){s.stage='question';save();renderStudy();window.scrollTo(0,0);}
    else if(action==='select'&&!s.feedback){s.selection=Number(button.dataset.index);save();renderStudy();}
    else if(action==='check'&&s.selection!==null)answer(s.selection===bank.get(s.queue[s.index]).answer);
    else if(action==='reveal'){s.revealed=true;save();renderStudy();}
    else if(action==='self'&&s.revealed)answer(button.dataset.correct==='true');
    else if(action==='next'&&s.feedback){s.index++;s.feedback=null;s.selection=null;s.revealed=false;s.recallText='';if(s.index>=s.queue.length)finishSession();else{const id=s.queue[s.index];if(s.answers.some(a=>a.id===id))s.retried.push(id);save();renderStudy();window.scrollTo(0,0);}}
    else if(action==='finish'){state.session=null;active=false;selectedChapter=chapterOf(nextDay());save();render();}
    else if(action==='next-lesson'){state.session=null;startLesson(Number(button.dataset.day));}
    else if(action==='export'){const blob=new Blob([JSON.stringify({...state,session:null},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='chassis-quest-'+E.today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('학습 기록 백업 파일을 만들었어요.');}
    else if(action==='import')document.getElementById('import-file').click();
  });
  app.addEventListener('input',event=>{
    const el=event.target;if(el.id==='recall'&&state.session){state.session.recallText=el.value.slice(0,10000);save();}
  });
  app.addEventListener('change',async event=>{
    if(event.target.id==='chapter'){selectedChapter=Number(event.target.value);render();}
    if(event.target.id==='import-file'){
      const file=event.target.files[0];if(!file)return;
      try{
        if(file.size>3000000)throw new Error('백업 파일은 3 MB 이하만 불러올 수 있어요.');
        const imported=E.validate(JSON.parse(await file.text()),[...bank.keys()]);
        if(!confirm('현재 학습 기록을 이 백업으로 교체할까요? 현재 기록이 필요하면 먼저 백업하세요.'))return;
        state=imported;storageOK=true;active=false;save();render();toast('백업에서 학습 기록을 복원했어요.');
      }catch(error){toast(error.message||'백업을 읽지 못했어요.');}
    }
  });
  document.addEventListener('keydown',event=>{
    if(['TEXTAREA','INPUT','SELECT'].includes(document.activeElement?.tagName)||!active||!state.session)return;
    const s=state.session,q=bank.get(s.queue[s.index]);
    if(s.stage==='question'&&q?.type==='choice'&&!s.feedback&&/^[1-4]$/.test(event.key)){const index=s.order[q.id][Number(event.key)-1];if(index!==undefined){s.selection=index;save();renderStudy();}}
  });
  render();
})();
