(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./comparison.js'):root.VehicleComparison;
  const same=(a,b)=>Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
  const ids=['increase','decrease','same'];
  const targets={
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
    if(comparison.unchanged)return null;
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
