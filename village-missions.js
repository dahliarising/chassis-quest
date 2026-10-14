(function(root){
  'use strict';
  const physics=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.VehiclePhysics;
  const MAX_COUNT=1000000,DEG=Math.PI/180;
  const missions=[
    {
      id:'toe',title:'빵 배달차의 타이어를 구해줘',concept:'토와 타이어의 옆방향 끌림',
      resident:{name:'모모',job:'빵집 배달부',emoji:'🥐',line:'빵은 바삭한데 타이어까지 깃털처럼 닳으면 곤란해요!',thankyou:'배달차 바퀴가 나란해졌어요. 정비소에 빵바구니 놓고 갈게요!'},
      symptom:'좌우 타이어가 대칭으로 안쪽을 향해 있어요. 직진할 때 생기는 옆방향 어긋남을 줄여주세요.',
      control:{label:'앞차축 토 합계',min:-1,max:1,step:.05,unit:'°',initial:.8,target:0},
      goal:'가상 직진 시험: 토 합계의 절댓값을 0.10° 이하로 줄이세요.',
      prediction:{question:'토 합계를 +0.8°에서 0°로 줄이면, 직진 중 바퀴의 옆방향 어긋남은?',correct:'less-scrub',
        options:[{id:'less-scrub',label:'줄어든다'},{id:'more-scrub',label:'늘어난다'},{id:'pull-left',label:'반드시 왼쪽으로 쏠린다'}],
        explanations:{'less-scrub':'맞아요. 양쪽 바퀴가 직진 방향과 나란해지면, 바퀴 옆방향으로 생기는 기하학적 속도 성분이 줄어요.','more-scrub':'토는 위에서 본 바퀴 방향입니다. 좌우 토를 0°에 가깝게 하면 바퀴가 서로 다른 방향으로 구르려는 정도가 줄어요.','pull-left':'이 의뢰는 좌우가 대칭인 토입니다. 대칭 토의 크기만으로 왼쪽 쏠림을 정할 수 없어요. 우선 바퀴 방향과 직진 방향의 차이를 보세요.'}},
      theory:{definitions:[{term:'토 (toe)',text:'위에서 본 바퀴의 방향. 앞부분이 서로 가까우면 toe-in(+), 멀어지면 toe-out(−)입니다.'},{term:'토 합계',text:'좌우 토를 더한 값입니다. 이 대칭 모델에서 바퀴 한쪽 각도는 합계의 절반입니다.'},{term:'옆방향 어긋남',text:'직진 속도를 바퀴 좌표로 나누었을 때 생기는 옆방향 성분입니다. 실제 마모량이나 차체의 좌우 이동량은 아닙니다.'}],
        formula:'한쪽 토 θ=τ/2; 100 m당 기하학적 옆방향 성분=100×|sin θ|',
        why:'총 토 +0.8°이면 한쪽 바퀴가 0.4°씩 안쪽을 봅니다. 합계를 0°로 만들면 이 모델의 옆방향 성분도 0이 됩니다.',
        assumptions:['좌우가 대칭인 가상 앞차축의 직진 기하입니다. 부싱 변형, 하중, 타이어 힘과 실제 마모는 계산하지 않습니다.','이 미션의 0° 목표는 기하를 이해하는 조건입니다. 실제 차의 정렬값은 제작사 사양과 주행 중 변형을 함께 봅니다.'],
        source:{title:'Michelin · Wheel alignment and balancing',url:'https://www.michelinman.com/auto/auto-tips-and-advice/tire-maintenance/wheel-alignment-wheel-balancing'}},
      reward:{materials:3,trust:1},successMessage:'바퀴 방향을 나란히 맞췄어요. 토의 부호와 크기를 나눠 읽는 정비 경험이 쌓였어요.'
    },
    {
      id:'camber',title:'사진사의 언덕 코너 점검',concept:'정적 캠버와 롤·범프의 합',
      resident:{name:'나래',job:'산책길 사진사',emoji:'📷',line:'차가 기울 때 바깥 바퀴까지 밖으로 눕네요. 사진으로 같이 볼까요?',thankyou:'코너 사진 속 바퀴가 목표 자세에 가까워졌어요. 오늘의 정비 기록을 사진으로 남길게요!'},
      symptom:'고정된 코너 자세에서 바깥 타이어가 +1.8° 기울어요. 정적 캠버를 바꿔 바퀴를 지면에 세워보세요.',
      control:{label:'정적 캠버',min:-4,max:1,step:.1,unit:'°',initial:0,target:-1.8},
      goal:'가상 코너 자세: 지면 기준 바깥 바퀴 캠버를 −0.30°~+0.30°로 맞추세요.',
      prediction:{question:'정적 캠버를 0°에서 −1.8°로 바꾸면, 같은 롤·범프에서 바깥 바퀴 자세는?',correct:'upright',
        options:[{id:'upright',label:'지면에 수직인 자세에 가까워진다'},{id:'more-outside',label:'더 바깥으로 기울어진다'},{id:'always-more',label:'−4°까지 줄일수록 무조건 좋다'}],
        explanations:{upright:'맞아요. 정적 캠버 −1.8°가 롤 +3°와 범프 캠버 −1.2°의 합을 상쇄해요.','more-outside':'캠버의 부호부터 보세요. 음의 캠버는 바퀴 상단을 안쪽으로 옮깁니다. 고정된 코너 자세의 +1.8°를 상쇄해요.','always-more':'음의 캠버도 지나치면 바퀴가 안쪽으로 과하게 기울어요. 정적 값만 보지 말고 롤과 범프를 더한 최종 각도를 봐야 합니다.'}},
      theory:{definitions:[{term:'캠버 (camber)',text:'앞에서 본 바퀴 기울기입니다. 상단이 차량 바깥이면 양수, 안쪽이면 음수입니다.'},{term:'정적 캠버',text:'롤과 범프 입력이 없을 때의 출발 각도입니다. 코너 주행 중 최종 각도와 같지 않습니다.'},{term:'범프 캠버 게인',text:'휠이 차체에 대해 위로 1 mm 움직일 때 캠버가 변하는 양입니다. 여기서는 −0.04°/mm로 고정합니다.'}],
        formula:'γ지면=γ정적+φ롤+g캠버×z범프 = γ정적+3°−0.04°/mm×30 mm',
        why:'롤로 바깥쪽으로 3° 기울고 범프로 1.2° 안쪽으로 돌아옵니다. 남은 +1.8°를 정적 캠버로 상쇄하는 연습입니다.',
        assumptions:['한쪽 바깥 바퀴, 롤 3°, 범프 30 mm, 캠버 게인 −0.04°/mm의 소각도 선형 합입니다. 입력은 독립적으로 고정한 예시이며 실제 차의 롤·범프 연성을 풀지 않습니다.','이번 목표는 기하학적 수직 자세입니다. 타이어의 최적 캠버, 접지 면적, 코너링 힘과 마모량은 계산하지 않으며 실제 최적 각도가 0°라는 뜻은 아닙니다.'],
        source:{title:'MathWorks · Independent Suspension — K and C',url:'https://www.mathworks.com/help/vdynblks/ref/independentsuspensionkandc.html'}},
      reward:{materials:4,trust:1},successMessage:'정적 값과 움직이는 중의 값을 연결했어요. 롤과 범프가 만든 최종 바퀴 자세까지 살폈네요.'
    },
    {
      id:'damper',title:'꽃 배달차의 출렁임 잡기',concept:'댐핑과 승차감의 절충',
      resident:{name:'두리',job:'꽃집 주인',emoji:'🌷',line:'화분은 멈췄는데 차가 혼자 춤을 춰요. 꽃들이 멀미하겠어요!',thankyou:'출렁임과 충격을 함께 살폈네요. 정비소에 축하 꽃을 가져올게요!'},
      symptom:'차체를 놓은 뒤 출렁임이 오래 남아요. 감쇠를 늘리되 같은 범프의 충격은 너무 커지지 않게 해주세요.',
      control:{label:'댐퍼 감쇠 계수',min:500,max:4500,step:100,unit:'N·s/m',initial:500,target:2200},
      goal:'자유 진동의 ±1 mm 정착 시간 ≤1.05초, 별도 범프 시험의 최대 차체 가속도 ≤3.05 m/s²를 함께 만족하세요.',
      prediction:{question:'감쇠 계수를 500에서 2,200 N·s/m로 올리면, 두 시험 결과는?',correct:'settle-tradeoff',
        options:[{id:'settle-tradeoff',label:'출렁임은 빨리 줄지만 범프 충격은 커질 수 있다'},{id:'all-softer',label:'출렁임도 충격도 항상 줄어든다'},{id:'stiffer-spring',label:'스프링 강성 자체가 커진다'}],
        explanations:{'settle-tradeoff':'맞아요. 댐퍼는 상대속도에 저항해 진동 에너지를 소모합니다. 이 범프 조건에서는 큰 감쇠가 차체로 전달되는 힘도 늘려요.','all-softer':'감쇠가 크다고 모든 노면에서 편안해지지는 않아요. 진동 정착 시간과 범프 가속도를 따로 보고 둘을 만족하는 범위를 찾으세요.','stiffer-spring':'스프링은 변위에, 점성 댐퍼는 상대속도에 힘을 냅니다. 이 실습에서는 스프링 강성 20,000 N/m를 그대로 둡니다.'}},
      theory:{definitions:[{term:'감쇠 계수 c',text:'이 선형 댐퍼가 상대속도에 저항하는 정도입니다. F댐퍼=−c×상대속도이며, 스프링 강성과 다른 양입니다.'},{term:'감쇠비 ζ',text:'c/(2√km). 질량과 스프링을 함께 고려해 자유 진동이 얼마나 빨리 줄어드는지 읽는 무차원 값입니다.'},{term:'정착과 충격',text:'차체를 놓는 시험의 정착 시간과, 범프를 지나는 시험의 최대 가속도는 서로 다른 지표입니다. 둘 다 확인해야 합니다.'}],
        formula:'m·ẍ+c·ẋ+k·x=0; ζ=c/(2√km) · 범프 시험: mₛ·z̈ₛ=−kₛ(zₛ−zᵤ)−c(żₛ−żᵤ)',
        why:'같은 스프링에서 감쇠를 늘리면 자유 진동이 빨리 진정될 수 있지만, 요철을 만나는 순간 댐퍼가 전달하는 힘도 변합니다.',
        assumptions:['애니메이션은 바퀴 고정, 차체 질량 320 kg, 스프링 20,000 N/m, 초기 변위 +20 mm·초기속도 0의 1자유도 자유 진동입니다. 정착은 남은 4초 관측 구간에서 ±1 mm 안에 머무는 첫 시각(0.01초 간격)입니다.','충격 지표는 별도 2자유도 쿼터카 시험: 20 km/h, 높이 30 mm·길이 2 m 코사인 범프, 바퀴 40 kg, 타이어 180,000 N/m입니다.','압축·리바운드를 같은 선형 계수로 다루며 실제 댐퍼 클릭 수나 밸브 곡선을 재현하지 않습니다. 성공 조건은 이 가상 의뢰의 목표입니다.'],
        source:{title:'MathWorks · Quarter-car suspension model',url:'https://www.mathworks.com/help/mpc/ug/admm-based-mpc-control-for-quarter-car-suspension.html'},
        relatedSource:{title:'Öhlins · Automotive shock absorber manual',url:'https://www.ohlins.com/storage/8BC815F4750069B6B55A0BF00FBD707013ED8BBE3956FDF8B62376C101DEE5A4/77dd1ccef03b474b93a0ff0e21d414bb/pdf/media/f97a682063984f2fba2dc0f084986623/OM_07450-01.pdf'}},
      reward:{materials:5,trust:1},successMessage:'출렁임과 충격을 함께 살폈어요. 두 시험을 비교하는 댐퍼 정비 경험이 쌓였어요.'
    }
  ];
  const metric=(key,label,value,unit)=>({key,label,value,unit});
  const format=(value,digits=2)=>Number(value.toFixed(digits)).toLocaleString('ko-KR');
  function getMission(id){
    const mission=missions.find(item=>item.id===id);
    if(!mission)throw new RangeError('알 수 없는 마을 의뢰입니다.');
    return mission;
  }
  function toe(value){
    const perWheelToe=value/2,scrubPer100m=100*Math.abs(Math.sin(perWheelToe*DEG));
    return {value,duration:4,toeDeg:value,perWheelToe,scrubPer100m,
      metrics:[metric('scrubPer100m','100 m당 기하학적 옆방향 성분',scrubPer100m,'m'),metric('perWheelToe','한쪽 바퀴 토',perWheelToe,'°')]};
  }
  function camber(value){
    const rollDeg=3,camberGain=-.04,jounce=30,residualDeg=value+rollDeg+camberGain*jounce;
    return {value,duration:4,camberDeg:value,rollDeg,camberGain,jounce,residualDeg,
      metrics:[metric('residualDeg','코너에서 지면 기준 캠버',residualDeg,'°'),metric('staticCamber','정적 캠버',value,'°')]};
  }
  function damper(value){
    const bounce=physics.simulate('bounce',{m:320,k:20000,c:value});
    const ride=physics.simulate('ride',{ms:320,ks:20000,cs:value,speed:20});
    const lastOutside=bounce.samples.findLast(sample=>Math.abs(sample.body)>.001);
    const settlingTime=lastOutside?Math.min(bounce.duration,lastOutside.t+.01):0;
    const dampingRatio=value/(2*Math.sqrt(320*20000)),peakAcceleration=ride.metrics[0].value;
    return {value,duration:4,dampingRatio,settlingTime,peakAcceleration,samples:bounce.samples,rideSamples:ride.samples,
      metrics:[metric('settlingTime','자유 진동 ±1 mm 정착 시간',settlingTime,'s'),metric('peakAcceleration','별도 범프 최대 차체 가속도',peakAcceleration,'m/s²'),metric('dampingRatio','감쇠비',dampingRatio,'')]};
  }
  const models={toe,camber,damper};
  function evaluate(id,input){
    const mission=getMission(id),control=mission.control;
    const value=typeof input==='number'&&Number.isFinite(input)?Math.max(control.min,Math.min(control.max,input)):control.initial;
    const baseline=models[id](control.initial),after=models[id](value);
    let success,diagnosis,explanation;
    if(id==='toe'){
      success=Math.abs(value)<=.1+1e-9;
      diagnosis=success?'대칭 토의 어긋남이 목표 범위 안이에요.':'양쪽 바퀴가 직진 방향과 아직 나란하지 않아요.';
      explanation=`토 합계 ${format(value)}° → 한쪽 ${format(after.perWheelToe)}°. 100 m당 기하학적 옆방향 성분이 ${format(baseline.scrubPer100m)} m에서 ${format(after.scrubPer100m)} m로 바뀝니다. ${success?'이 가상 직진 목표를 만족했어요.':'부호보다 절댓값을 줄여보세요. toe-out도 크면 어긋남이 커집니다.'}`;
    }else if(id==='camber'){
      success=Math.abs(after.residualDeg)<=.3+1e-9;
      diagnosis=success?'코너의 바깥 바퀴가 수직 자세에 가까워졌어요.':after.residualDeg>0?'바깥 바퀴 상단이 아직 바깥으로 기울어요.':'음의 캠버가 과해 바퀴 상단이 안쪽으로 기울어요.';
      explanation=`${format(value)}° + 롤 3° + 범프 (−0.04×30)° = ${format(after.residualDeg)}°. ${success?'세 기여를 합치면 이번 수직 자세 목표 안에 들어옵니다.':after.residualDeg>0?'정적 캠버를 조금 더 음수로 바꿔 상쇄해보세요.':'정적 캠버의 음수 크기를 줄여보세요. 음의 캠버가 클수록 항상 좋은 것은 아닙니다.'}`;
    }else{
      const settled=after.settlingTime<=1.05+1e-9,comfortable=after.peakAcceleration<=3.05+1e-9;
      success=settled&&comfortable;
      diagnosis=success?'출렁임과 범프 충격이 모두 의뢰 목표 안이에요.':!settled?'출렁임이 아직 오래 남아요.':'진동은 줄었지만 범프 충격 가속도가 목표를 넘었어요.';
      explanation=`정착 ${format(after.settlingTime)}초 / 범프 가속도 ${format(after.peakAcceleration)} m/s². ${success?'두 시험을 함께 통과했어요.':!settled?'감쇠를 조금 높이고 두 지표를 다시 비교하세요.':'감쇠를 조금 낮춰보세요. 큰 감쇠가 이 범프에서는 차체로 더 큰 힘을 전달합니다.'}`;
    }
    return {id,value,success,baseline,after,diagnosis,explanation};
  }
  const count=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(MAX_COUNT,Math.floor(value))):0;
  function normalizeProgress(raw){
    const data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    const completed=missions.filter(m=>Array.isArray(data.completed)&&data.completed.includes(m.id)).map(m=>m.id);
    const records={};
    for(const m of missions){
      const record=data.records&&Object.hasOwn(data.records,m.id)?data.records[m.id]:null;
      const attempts=count(record?.attempts),wrong=Math.min(attempts,count(record?.wrong));
      const lastChoice=m.prediction.options.some(o=>o.id===record?.lastChoice)?record.lastChoice:null;
      records[m.id]={attempts,wrong,lastChoice,needsReview:wrong>0&&record?.needsReview===true};
    }
    return {version:1,completed,records,materials:completed.reduce((sum,id)=>sum+getMission(id).reward.materials,0),trust:completed.reduce((sum,id)=>sum+getMission(id).reward.trust,0),level:completed.length};
  }
  function validateProgress(raw){
    const invalid=()=>{throw new Error('마을 의뢰 학습 기록의 형식이 올바르지 않습니다.');};
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.completed))invalid();
    if(raw.version!==undefined&&raw.version!==1)invalid();
    if(raw.completed.some(id=>!missions.some(m=>m.id===id))||new Set(raw.completed).size!==raw.completed.length)invalid();
    if(raw.records!==undefined){
      if(!raw.records||typeof raw.records!=='object'||Array.isArray(raw.records))invalid();
      for(const [id,r] of Object.entries(raw.records)){
        const m=missions.find(item=>item.id===id);
        if(!m||!r||typeof r!=='object'||Array.isArray(r))invalid();
        if(!Number.isInteger(r.attempts)||r.attempts<0||r.attempts>MAX_COUNT||!Number.isInteger(r.wrong)||r.wrong<0||r.wrong>r.attempts)invalid();
        if(r.lastChoice!==null&&!m.prediction.options.some(o=>o.id===r.lastChoice))invalid();
        if(typeof r.needsReview!=='boolean')invalid();
      }
    }
    const normalized=normalizeProgress(raw);
    if(!['materials','trust','level'].every(key=>raw[key]===undefined||raw[key]===normalized[key]))invalid();
    return normalized;
  }
  const growthStages=[
    {level:0,title:'작은 정비소의 첫날',description:'주민들의 첫 의뢰가 도착했어요. 차를 고치며 마을을 만나보세요.'},
    {level:1,title:'동네 정비소',description:'첫 신뢰를 얻었어요. 정비소에 공구와 새 간판이 생겼어요.'},
    {level:2,title:'주민 쉼터',description:'주민들이 힘을 모아 벤치와 화단을 만들었어요.'},
    {level:3,title:'마을의 샤시 전문가',description:'세 의뢰를 해결했어요. 광장에 축하 깃발과 꽃이 가득해졌어요.'}
  ];
  function getGrowth(progress){return {...growthStages[normalizeProgress(progress).level]};}
  function complete(progress,id){
    const m=getMission(id),next=normalizeProgress(progress),rewarded=!next.completed.includes(id);
    if(rewarded)next.completed.push(id);
    next.records[id].needsReview=false;
    const normalized=normalizeProgress(next),growth=getGrowth(normalized);
    return {progress:normalized,rewarded,reward:rewarded?{...m.reward}:{materials:0,trust:0},unlocked:rewarded?[growth.title]:[],growth};
  }
  function recordPrediction(progress,id,choiceId){
    const m=getMission(id);
    if(!m.prediction.options.some(o=>o.id===choiceId))throw new RangeError('알 수 없는 예측 선택입니다.');
    const next=normalizeProgress(progress),record=next.records[id],correct=choiceId===m.prediction.correct;
    record.attempts=Math.min(MAX_COUNT,record.attempts+1);
    record.wrong=Math.min(record.attempts,record.wrong+(correct?0:1));
    record.lastChoice=choiceId;record.needsReview=!correct;
    return {progress:next,correct,explanation:m.prediction.explanations[choiceId]};
  }
  const api={missions,getMission,evaluate,normalizeProgress,validateProgress,getGrowth,complete,recordPrediction};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VillageMissions=api;
})(typeof window!=='undefined'?window:globalThis);
