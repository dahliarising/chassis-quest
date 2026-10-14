(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./comparison.js'):root.VehicleComparison;
  const same=(a,b)=>Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
  const ids=['increase','decrease','same'];
  const targets={
    hardpoint:{metricLabel:'최종 캠버각',symbol:'γ',labels:['더 양수로','더 음수로','같아요'],definition:'최종 캠버는 지정한 하부 볼조인트 스트로크에서 바퀴 상단이 바깥으로 기우는 각도입니다. 음수는 상단이 차량 안쪽으로 기운 상태입니다. 초기 캠버는 −1°로 두었습니다.',observation:'두 그림을 같은 마지막 시각으로 놓고 너클과 바퀴 기울기를 비교하세요. 내측 점 이동은 정적 외측 점을 유지한 새 설계입니다. 토나 캐스터는 이 전면 2D 모델에서 계산하지 않습니다.'},
    knc:{metricLabel:'최종 토각',symbol:'toe',labels:['더 양수로','더 음수로','같아요'],definition:'이 왼쪽 바퀴의 토 인을 양수로 정합니다. 최종 토=정적 0.1°+기구학 기울기×수직 스트로크+컴플라이언스×횡력입니다. 반대 부호의 K와 C 항은 상쇄될 수 있습니다.',observation:'위에서 본 바퀴 방향과 K·C 기여를 비교하세요. 캠버 기울기만 바꾸면 최종 토는 같을 수 있습니다. 토와 캠버의 계수는 각각 독립적인 가상 시험 입력입니다.'},
    alignment:{metricLabel:'조향 후 캠버각',symbol:'γ',labels:['더 양수로','더 음수로','같아요'],definition:'킹핀 경사와 캐스터로 기울어진 조향축 주위로 바퀴를 회전시킨 뒤의 캠버입니다. 양수는 왼쪽 바퀴 상단이 차량 바깥쪽으로 기운 상태입니다.',observation:'정면의 바퀴 기울기와 위에서 본 실제 조향각을 함께 보세요. 축 회전 입력과 지면 바퀴 조향각은 다릅니다. 정적 스크럽·트레일 수치만으로 핸들 복원 토크를 예측하지 않습니다.'},
    cornering:{metricLabel:'정상 요레이트',symbol:'r∞',labels:['커져요','작아져요','같아요'],definition:'정상 요레이트는 일정한 차속과 전륜 등가 조향각에서 과도 응답이 가라앉은 뒤의 차체 방향 변화율입니다. 운전대 각도나 차체 슬립각 β와는 다른 값입니다.',observation:'차체 방향이 변하는 속도와 요레이트 파형을 비교하세요. 같은 순간 위치만으로 언더스티어를 판단하지 마세요. 작은 슬립각의 선형 범위 안에서만 이 퀴즈를 채점합니다.'},
    frequency:{
      metricLabel:'고유 진동수',symbol:'fₙ',labels:['높아져요','낮아져요','같아요'],
      definition:'고유 진동수 fₙ=√(k/m)/(2π)는 감쇠가 없는 계가 1초에 진동하는 횟수입니다. 실제 감쇠 진동수나 정착 시간과는 다른 지표입니다.',
      observation:'차체의 움직임과 고유 진동수 수치를 함께 보세요. 감쇠가 있으면 실제 반복 주기는 달라지고, 임계·과감쇠에서는 반복 진동하지 않습니다. 한 순간 더 높은 위치에 있다고 고유 진동수가 높은 것은 아닙니다.'
    },
    damping:{
      metricLabel:'감쇠비',symbol:'ζ',labels:['높아져요','낮아져요','같아요'],
      definition:'감쇠비 ζ=c/(2√(km))는 임계 감쇠에 대한 감쇠의 비율입니다. 감쇠비가 높다고 정착 시간이 항상 짧아지는 것은 아닙니다.',
      observation:'ζ=0은 무감쇠, 0<ζ<1은 부족 감쇠, ζ=1은 임계 감쇠, ζ>1은 과감쇠입니다. 반복해서 흔들리는지와 평형점으로 돌아오는 모양을 보세요. 과감쇠에서는 복귀가 느려질 수 있습니다.'
    },
    ride:{
      metricLabel:'최대 현가 변위',symbol:'max |zₛ−zᵤ|',labels:['커져요','작아져요','같아요'],
      definition:'최대 현가 변위는 정적 평형에서 차체와 바퀴의 상대 변위 |zₛ−zᵤ|가 가장 큰 값입니다. 같은 4초 구간의 10 ms 출력 샘플로 구하며 짧은 피크는 놓칠 수 있습니다.',
      observation:'차체와 바퀴 사이 간격의 변화를 보세요. 최대 현가 변위는 차체만의 최고 높이 또는 최대 가속도와 다릅니다. 한 순간의 모습이 아닌 전체 4초 구간의 최대값을 비교하며, 이 지표 하나로 승차감의 좋고 나쁨을 정하지 않습니다.'
    },
    resonance:{
      metricLabel:'정상상태 진폭',symbol:'X',labels:['커져요','작아져요','같아요'],
      definition:'정상상태 진폭 X는 충분히 오래 가진한 뒤 차체가 평형점에서 가장 멀어지는 거리입니다. 위에서 아래까지의 전체 폭은 2X이며, 과도 응답은 포함하지 않습니다.',
      observation:'차체가 평형점 위아래로 움직이는 폭을 비교하세요. 같은 순간의 높이는 위상과 주파수에도 달려 있으므로 진폭의 크기와 다릅니다. 이 장면은 노면 입력이 아닌 250 N의 반복 외력에 대한 계산입니다.'
    },
    steer:{
      metricLabel:'뒤 차축 중심 회전 반경',symbol:'R',labels:['커져요','작아져요','같아요'],
      definition:'회전 반경 R=L/tan(δ)는 저속 순수 구름에서 뒤 차축 중심이 그리는 원의 반경입니다. 내측 또는 외측 앞바퀴의 궤적 반경과 구별합니다.',
      observation:'뒤 차축 중심의 궤적이 더 완만해지는지 또는 더 급하게 휘는지 보세요. 앞바퀴의 내외측 각도가 달라져도 뒤 차축 중심의 반경은 같을 수 있습니다. 타이어 슬립이 없는 저속 기하 모델의 결과입니다.'
    },
    brake:{
      metricLabel:'정지 거리',symbol:'s',labels:['길어져요','짧아져요','같아요'],
      definition:'정지 거리 s=v₀²/(2μg)는 제동 시작부터 완전히 멈출 때까지 이동한 거리입니다. 운전자의 반응 거리와 제동 장치의 과도 응답은 포함하지 않습니다.',
      observation:'같은 시각의 위치뿐 아니라 각 차가 최종적으로 멈춘 위치를 보세요. 앞뒤 축 하중이 달라져도 이 이상 마찰 한계 모델의 정지 거리는 같을 수 있습니다. 실제 제동 성능을 보장하는 수치가 아닙니다.'
    },
    roll:{
      metricLabel:'정상 롤각',symbol:'φ∞',labels:['커져요','작아져요','같아요'],
      definition:'정상 롤각 φ∞=maᵧh/Kφ는 일정한 횡가속도에서 과도 운동이 가라앉은 뒤 향하는 평형 기울기입니다. h는 롤축 위 무게중심 높이입니다.',
      observation:'차체가 흔들린 뒤 향하는 평형 기울기를 비교하세요. 처음 더 크게 기울 수 있는 최대 롤각과는 다른 지표입니다. 4초의 마지막 프레임이 정상값에 정확히 도달했다고 보장하지 않으므로 계산된 정상 롤각도 함께 보세요.'
    }
  };
  const presets={
    hardpoint:[{id:'upper-height',label:'상부 내측점을 높이면?',params:{upperZ:470}},{id:'jounce',label:'하부 볼조인트를 더 올리면?',params:{jounce:50}}],
    knc:[{id:'bump',label:'범프 스트로크를 늘리면?',params:{jounce:40}},{id:'compliance',label:'횡력에 대한 토 변형을 뒤집으면?',params:{toeCompliance:.08}}],
    alignment:[{id:'caster',label:'캐스터를 높이면?',params:{caster:10}},{id:'offset',label:'축 오프셋만 바꾸면?',params:{offset:80}}],
    cornering:[{id:'front',label:'전축 코너링 강성을 낮추면?',params:{Cf:60000}},{id:'steer',label:'앞바퀴를 조금 더 꺾으면?',params:{delta:1.5}}],
    bounce:[{id:'mass',label:'차체 질량을 늘리면?',params:{m:500}},{id:'damping',label:'댐퍼를 강하게 하면?',params:{c:4500}}],
    ride:[{id:'damping',label:'범프에서 댐퍼를 강하게 하면?',params:{cs:4500}},{id:'speed',label:'범프를 더 빨리 넘으면?',params:{speed:60}}],
    resonance:[{id:'frequency',label:'가진 주파수를 4 Hz로 올리면?',params:{f:4}},{id:'damping',label:'반복 외력에서 댐퍼를 강하게 하면?',params:{c:4500}}],
    steer:[{id:'angle',label:'앞바퀴를 더 꺾으면?',params:{delta:30}},{id:'track',label:'윤거만 넓히면?',params:{t:1.8}}],
    brake:[{id:'speed',label:'속도를 100 km/h로 올리면?',params:{speed:100}},{id:'mass',label:'차량 질량만 늘리면?',params:{m:2200}}],
    roll:[{id:'height',label:'롤축 위 무게중심을 높이면?',params:{h:.65}},{id:'stiffness',label:'롤 강성을 높이면?',params:{Kphi:100000}}]
  };

  // Explain the relationship of the final combined inputs, not the direction
  // of whichever slider was moved last.
  function insight(kind,target,correct){
    const up=correct==='increase',equal=correct==='same';
    if(kind==='hardpoint')return `암 길이와 너클 길이 구속을 함께 푼 최종 자세에서 캠버가 ${equal?'같습니다':up?'더 양수입니다':'더 음수입니다'}. 한 하드포인트의 이동 방향만으로 캠버 방향을 단정하지 않습니다.`;
    if(kind==='knc')return `정적 토+gToe·z+cToe·Fy를 모두 더한 토가 ${equal?'같습니다':up?'더 양수입니다':'더 음수입니다'}. K는 스트로크, C는 힘에 의한 항이며 서로 상쇄될 수도 있습니다.`;
    if(kind==='alignment')return `기울어진 조향축 주위로 바퀴를 회전시킨 캠버가 ${equal?'같습니다':up?'더 양수입니다':'더 음수입니다'}. 오프셋은 이 모델의 자세 회전에 들어가지 않아 캠버를 바꾸지 않습니다.`;
    if(kind==='cornering')return `변경값을 함께 넣은 r∞=vδ/(L+Kv²/g)가 ${equal?'같습니다':up?'커집니다':'작아집니다'}. K=Wf/Cf−Wr/Cr이며 앞뒤 차축 강성의 균형과 속도를 같이 봅니다.`;
    if(target===targets.frequency)return equal
      ?'강성과 질량의 변화가 k/m에서 상쇄되어 fₙ=√(k/m)/(2π)가 같습니다. 감쇠 c는 이 고유 진동수 식에 들어가지 않습니다.'
      :`변경값을 함께 대입한 k/m이 ${up?'커져':'작아져'} fₙ=√(k/m)/(2π)가 ${up?'높아집니다':'낮아집니다'}. 이 값은 실제 감쇠 진동수와 구별합니다.`;
    if(target===targets.damping)return `c를 임계 감쇠 2√(km)로 나눈 비율이 ${equal?'같아 감쇠비가 같습니다':up?'커져 감쇠비가 높아집니다':'작아져 감쇠비가 낮아집니다'}. 감쇠비가 높다고 정착 시간이 항상 짧아지는 것은 아닙니다.`;
    if(kind==='resonance')return `모든 변경을 대입한 분모 D=√((k−mω²)²+(cω)²)가 ${equal?'같아':up?'작아져':'커져'} 진폭 X=250/D가 ${equal?'같습니다':up?'커집니다':'작아집니다'}. 주파수만의 증감으로 판단하지 않습니다.`;
    if(kind==='steer')return `축거와 조향각을 함께 대입한 L/tan(δ)가 ${equal?'같아':up?'커져':'작아져'} 뒤 차축 중심 반경이 ${equal?'같습니다':up?'커집니다':'작아집니다'}. 윤거 t는 내외측 바퀴 각도에 영향을 주지만 이 반경 식에는 없습니다.`;
    if(kind==='brake')return `변경 조건의 v₀²/μ가 ${equal?'같아 정지 거리가 같습니다':up?'커져 정지 거리가 길어집니다':'작아져 정지 거리가 짧아집니다'}. 이 모델은 a=μmg/m=μg여서 질량 m과 높이 h는 정지 거리를 바꾸지 않습니다.`;
    if(kind==='roll')return `변경 조건의 롤 모멘트와 강성의 비 maᵧh/Kφ가 ${equal?'같아':up?'커져':'작아져'} 정상 롤각이 ${equal?'같습니다':up?'커집니다':'작아집니다'}. 순간 최대 기울기와는 다른 지표입니다.`;
    return `범프 입력과 차체·바퀴의 결합 운동이 상대 변위를 정합니다. 이번 4초의 10 ms 샘플에서 최대 |zₛ−zᵤ|는 ${equal?'같습니다':up?'커졌습니다':'작아졌습니다'}. 댐퍼나 속도 하나의 증감만으로 단정하지 않습니다.`;
  }

  function create(before,after){
    const comparison=C.describe(before,after);
    if(comparison.unchanged||before.valid===false||after.valid===false)return null;
    const target=before.kind==='bounce'
      ?targets[comparison.changed.some(change=>change.key==='m'||change.key==='k')?'frequency':'damping']
      :targets[before.kind];
    const outcome=comparison.outcomes.find(item=>item.label===target.metricLabel);
    const correct=same(outcome.before,outcome.after)?'same':outcome.after>outcome.before?'increase':'decrease';
    return {
      prompt:`변경한 차의 ${target.metricLabel} ${target.symbol} — 기준과 비교하면?`,
      definition:target.definition,metricLabel:target.metricLabel,unit:outcome.unit,
      before:outcome.before,after:outcome.after,correct,
      choices:ids.map((id,index)=>({id,label:target.labels[index]})),
      reasons:comparison.reasons,observation:target.observation,insight:insight(before.kind,target,correct)
    };
  }

  // Increase display precision if a small but meaningful computed difference
  // would otherwise look equal to the learner.
  function amounts(question){
    let values;
    for(let digits=4;digits<=15;digits++){
      values=[question.before,question.after].map(value=>value.toLocaleString('ko-KR',{maximumSignificantDigits:digits}));
      if(question.correct==='same'||values[0]!==values[1])break;
    }
    return values.map(value=>`${value}${question.unit?' '+question.unit:''}`);
  }

  function grade(question,choiceId){
    if(!question||!ids.includes(question.correct))throw new Error('유효한 예측 문제가 필요합니다.');
    if(!ids.includes(choiceId))throw new Error('문제에 있는 선택지를 골라야 합니다.');
    const chosen=question.choices.find(choice=>choice.id===choiceId);
    const answer=question.choices.find(choice=>choice.id===question.correct);
    const [before,after]=amounts(question),correct=choiceId===question.correct;
    return {
      correct,heading:correct?'맞혔어요! 움직임으로 확인해요.':'이 지표를 다시 살펴봐요.',
      body:`선택: ${chosen.label}. 계산: ${question.metricLabel} ${before} → ${after}, ${answer.label}. ${correct?'예측한 방향과 계산 결과가 같습니다.':'아래 설명에서 바꾼 값이 이 지표에 미치는 영향을 확인하세요.'}`
    };
  }

  function examples(kind){
    if(!Object.prototype.hasOwnProperty.call(presets,kind))throw new Error('알 수 없는 차량 운동 장면입니다.');
    return presets[kind].map(example=>({...example,params:{...example.params}}));
  }
  const api={create,grade,examples};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.VehiclePrediction=api;
})(typeof window!=='undefined'?window:globalThis);
