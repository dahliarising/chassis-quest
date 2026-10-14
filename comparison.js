(function(root){
  'use strict';
  const P=typeof module!=='undefined'&&module.exports?require('./advanced-physics.js'):root.VehiclePhysics;
  const same=(a,b)=>Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
  const number=value=>value.toLocaleString('ko-KR',{maximumFractionDigits:3});
  const amount=(value,unit)=>`${number(value)}${unit?' '+unit:''}`;
  const changeText=item=>same(item.before,item.after)
    ?`${item.label}: ${amount(item.after,item.unit)}로 그대로입니다.`
    :`${item.label}: ${amount(item.before,item.unit)} → ${amount(item.after,item.unit)} (${item.after>item.before?'증가':'감소'}).`;

  // Each causal statement holds other inputs fixed. The summary and outcomes
  // report the combined simulation, so changing several inputs can cancel out.
  function explanation(kind,key,before,after){
    const up=after[key]>before[key];
    const larger=(high,low)=>up?high:low;
    const advanced={
      hardpoint:'전면의 두 암과 너클 길이 구속을 만족하는 원 교점으로 외측 볼조인트를 구합니다. 내측 하드포인트를 바꾸면 정적 외측 점을 유지하도록 암 길이도 다시 정해집니다. 캠버 변화는 전체 링크 배치에 달려 있어 한 좌표의 증감만으로 일반화하지 않습니다.',
      knc: key==='jounce'||key.endsWith('Gradient')?'K 항은 수직 스트로크 z와 설정한 기구학 기울기의 곱입니다. 최종 토는 0.1°+gToe·z+cToe·Fy이며, 최종 캠버는 −1°+gCamber·z+cCamber·Fy입니다. 양의 토는 이 왼쪽 바퀴의 토 인입니다.':'C 항은 횡력 Fy와 설정한 컴플라이언스 계수의 곱입니다. 힘이 0이면 C 기여도 0입니다. K 항과 부호가 반대면 서로 상쇄됩니다. 이 계수는 가상 시험 입력이며 하드포인트에서 유도한 값은 아닙니다.',
      alignment:key==='offset'?'휠 중심 높이에서 축까지의 오프셋은 정적 스크럽 반경을 바꿉니다. 이 모델은 바퀴 자세를 조향축의 방향과 회전각으로 정하므로 오프셋 자체는 조향 후 캠버를 바꾸지 않습니다.':'킹핀 경사와 캐스터가 정한 3차원 조향축 주위로 바퀴 법선을 회전시킵니다. 그래서 조향축 회전각, 지면상의 바퀴 조향각, 캠버가 함께 달라질 수 있습니다. 어느 하나를 같은 각도로 취급하지 마세요.',
      cornering:'전륜과 후륜 횡력은 각 차축의 코너링 강성에 슬립각을 곱해 계산합니다. 횡력 합은 횡가속도를, 앞뒤 모멘트 차는 요 가속도를 만듭니다. 정상 요레이트 r∞=vδ/[L+K·v²/g]이며 K=Wf/Cf−Wr/Cr (rad/g)입니다. 여러 입력을 바꾸면 이 비를 함께 확인하세요.'
    };
    if (advanced[kind]) return advanced[kind];
    const reasons={
      bounce:()=>({
        m:`다른 조건이 같다면 질량 m이 ${larger('커져','작아져')} 같은 힘에 대한 가속도 F/m은 ${larger('작아집니다','커집니다')}. fₙ=√(k/m)/(2π)는 ${larger('낮아집니다','높아집니다')}. c>0일 때 감쇠비 ζ=c/(2√(km))도 ${larger('낮아집니다','높아집니다')}. c=0이면 감쇠비는 0 그대로입니다. 흔들림의 박자와 감쇠 정도를 함께 보세요.`,
        k:`다른 조건이 같다면 강성 k가 ${larger('커져','작아져')} 같은 변위에서 복원력 kx가 ${larger('커집니다','작아집니다')}. fₙ=√(k/m)/(2π)는 ${larger('높아집니다','낮아집니다')}. c>0일 때 감쇠비 ζ는 ${larger('낮아집니다','높아집니다')}. c=0이면 감쇠비는 0 그대로입니다. 진동수가 높다고 반드시 더 빨리 진정되는 것은 아닙니다.`,
        c:`다른 조건이 같다면 같은 순간 속도에서 감쇠력 c·ẋ와 소산 에너지율 c·ẋ²가 ${larger('커집니다','작아집니다')}. 감쇠비 ζ는 ${larger('높아지지만','낮아지지만')} 고유 진동수 fₙ은 같습니다. c=0이면 감쇠에 의한 에너지 소산이 없습니다. 과감쇠에서는 복귀가 느려질 수 있어 c를 높인다고 반드시 더 빨리 정착하지는 않습니다.`
      }),
      ride:()=>({
        ms:`다른 조건이 같다면 차체 질량 mₛ가 ${larger('커져','작아져')} 같은 현가력에 대한 차체 가속도 −Fₛ/mₛ는 ${larger('작아집니다','커집니다')}. 동시에 정적 접지력 (mₛ+40)g도 ${larger('커집니다','작아집니다')}. 바퀴와 차체가 함께 움직이므로 전체 파형과 계산된 최대값으로 결과를 확인하세요.`,
        ks:`다른 조건이 같다면 같은 차체·바퀴 상대 변위에서 스프링 힘 kₛ(zₛ−zᵤ)가 ${larger('커집니다','작아집니다')}. 그러나 강성이 변하면 상대 변위와 두 질량의 진동도 달라집니다. 따라서 강성의 방향만으로 최대 가속도나 접지력의 개선을 단정할 수 없습니다.`,
        cs:`다른 조건이 같다면 같은 차체·바퀴 상대 속도에서 감쇠력 cₛ(żₛ−żᵤ)가 ${larger('커집니다','작아집니다')}. 댐퍼는 상대 운동의 에너지를 소산하면서 바퀴의 움직임을 차체에 전달하기도 합니다. 감쇠 계수만으로 승차감이 좋아진다고 단정하지 말고 최대 가속도·현가 변위·접지력을 함께 비교하세요.`,
        speed:`다른 조건이 같다면 속도가 ${larger('높아져','낮아져')} 같은 길이 2 m의 범프를 ${larger('짧게','길게')} 통과합니다. 입력 시간은 ${amount(2/(before.speed/3.6),'s')} → ${amount(2/(after.speed/3.6),'s')}입니다. 범프 높이는 30 mm로 같지만 입력의 시간 변화와 차체·바퀴의 진동이 겹치는 방식이 달라집니다.`
      }),
      resonance:()=>({
        m:`다른 조건이 같다면 질량 m이 ${larger('커져','작아져')} 고유 진동수 fₙ은 ${larger('낮아집니다','높아집니다')}. 진폭 식에는 k−mω²가 있으므로 현재 가진 주파수가 어디에 있는지에 따라 관성항과 강성항이 더 상쇄되거나 덜 상쇄됩니다. 질량의 증감만으로 진폭 방향을 정할 수 없습니다.`,
        k:`다른 조건이 같다면 강성 k가 ${larger('커져','작아져')} 고유 진동수 fₙ은 ${larger('높아집니다','낮아집니다')}. 진폭은 k−mω²와 cω를 함께 계산한 분모에 달려 있습니다. 현재 주파수에 따라 상쇄가 커질 수도 있어 강성을 높인다고 진폭이 항상 줄지는 않습니다.`,
        c:`다른 조건이 같다면 cω 항이 ${larger('커져','작아져')} 진폭 식의 분모는 ${larger('커지고','작아지고')} 정상상태 진폭은 ${larger('작아집니다','커집니다')}. 이 장면은 일정한 250 N 외력 가진이며 노면 기저 가진의 전달률과 구별해야 합니다.`,
        f:`다른 조건이 같다면 ω=2πf가 ${larger('커져','작아져')} 관성항 mω²와 감쇠항 cω가 함께 변합니다. 강성항과 관성항의 상쇄 정도에 따라 진폭이 커질 수도 작아질 수도 있습니다. 감쇠가 있으므로 최대 진폭의 주파수가 항상 fₙ과 정확히 같지는 않습니다.`
      }),
      steer:()=>({
        L:`다른 조건이 같다면 축거 L이 ${larger('길어져','짧아져')} R=L/tan(δ)가 ${larger('커집니다','작아집니다')}. 같은 속도 5 km/h에서 방향 변화율 v/R은 ${larger('작아져','커져')} ${larger('완만한','급한')} 원을 따라갑니다. 타이어 슬립이 없는 저속 기하 결과입니다.`,
        t:`다른 조건이 같다면 윤거 t가 ${larger('커져','작아져')} 내측 바퀴 각도는 ${larger('커지고','작아지고')} 외측 바퀴 각도는 ${larger('작아집니다','커집니다')}. 두 앞바퀴의 회전축 연장선이 같은 선회 중심에서 만나도록 각도 차이가 달라집니다. R=L/tan(δ)에는 t가 없어서 뒤 차축 중심의 궤적은 같습니다.`,
        delta:`다른 조건이 같다면 등가 앞바퀴 각도 δ가 ${larger('커져','작아져')} tan(δ)는 ${larger('커지고','작아지고')} R=L/tan(δ)는 ${larger('작아집니다','커집니다')}. 같은 속도에서 방향 변화가 ${larger('빨라집니다','느려집니다')}. δ는 운전대 각도가 아닌 등가 바퀴 조향각입니다.`
      }),
      brake:()=>({
        speed:`다른 조건이 같다면 시작 속도가 ${larger('높아져','낮아져')} 정지 거리 s=v₀²/(2μg)와 운동 에너지 ½mv₀²가 속도의 제곱에 따라 ${larger('커집니다','작아집니다')}. 감속도 μg와 제동 중 하중 이동량 mah/L은 같고 제동 지속 시간은 ${larger('길어집니다','짧아집니다')}.`,
        mu:`다른 조건이 같다면 마찰 계수 μ가 ${larger('커져','작아져')} 감속도 a=μg가 ${larger('커지고','작아지고')} 정지 거리는 ${larger('짧아집니다','길어집니다')}. 동시에 앞축으로 이동하는 하중 mah/L은 ${larger('커집니다','작아집니다')}. 사용 가능한 마찰을 즉시 모두 활용하는 이상 제동 조건입니다.`,
        h:`다른 조건이 같다면 지면에서 무게중심까지 높이 h가 ${larger('커져','작아져')} 제동력이 만드는 모멘트와 앞축 하중 이동 ΔFz=mah/L이 ${larger('커집니다','작아집니다')}. 감속도 a=μg에는 h가 없어 정지 거리는 같습니다. 여기서는 피치각이나 타이어 하중 민감도를 계산하지 않습니다.`,
        m:`다른 조건이 같다면 질량 m이 ${larger('커져','작아져')} 운동 에너지 ½mv₀²와 축 하중은 ${larger('커집니다','작아집니다')}. 하지만 최대 제동력 μmg도 같은 비율로 변해 a=μmg/m=μg이므로 정지 거리는 같습니다. 실제 제동 열용량·타이어 하중 민감도는 이 모델에 포함하지 않습니다.`
      }),
      roll:()=>({
        m:`다른 조건이 같다면 차체 질량 m이 ${larger('커져','작아져')} 롤 모멘트 maᵧh와 정상 롤각 maᵧh/Kφ가 ${larger('커집니다','작아집니다')}. 동시에 관성 모멘트 Iφ=m×0.65²도 ${larger('커져','작아져')} 반응의 박자와 감쇠비가 달라집니다. 최대 롤각은 이 과도 응답까지 포함한 계산값입니다.`,
        h:`다른 조건이 같다면 롤축 위 무게중심 높이 h가 ${larger('커져','작아져')} 롤 모멘트 maᵧh와 정상·최대 롤각이 ${larger('커집니다','작아집니다')}. 이 모델에서 관성과 강성은 그대로여서 반응의 시간적 모양은 같고 각도 크기가 비례해 변합니다. h는 지면 기준 높이가 아닙니다.`,
        Kphi:`다른 조건이 같다면 유효 롤 강성 Kφ가 ${larger('커져','작아져')} 같은 모멘트에서 정상 롤각 maᵧh/Kφ는 ${larger('작아집니다','커집니다')}. 롤 고유 각진동수 √(Kφ/Iφ) (rad/s)는 ${larger('높아지고','낮아지고')} 감쇠비는 ${larger('낮아집니다','높아집니다')}. 최대 롤각과 흔들리는 박자를 함께 보세요.`,
        ay:`다른 조건이 같다면 횡가속도 aᵧ가 ${larger('커져','작아져')} 롤 모멘트 maᵧh와 정상·최대 롤각이 ${larger('커집니다','작아집니다')}. 선형 모델에서 관성·강성·감쇠는 그대로여서 시간적 모양은 같고 각도 크기가 비례해 변합니다. 입력 g값에는 9.81 m/s²를 곱합니다.`
      })
    };
    return reasons[kind]()[key];
  }

  function describe(before,after){
    if(!before||!after||before.kind!==after.kind||!Object.prototype.hasOwnProperty.call(P.scenes,before.kind))throw new Error('같은 장면의 계산 결과끼리 비교해야 합니다.');
    const kind=before.kind,scene=P.scenes[kind];
    const changed=scene.controls.filter(c=>!same(before.params[c.key],after.params[c.key])).map(c=>({key:c.key,label:c.label,symbol:c.symbol,before:before.params[c.key],after:after.params[c.key],unit:c.unit}));
    const outcomes=before.metrics.map(item=>({label:item.label,before:item.value,after:after.metrics.find(m=>m.label===item.label).value,unit:item.unit}));
    if(kind==='brake')outcomes.push({label:'초기 운동 에너지',before:.5*before.params.m*(before.params.speed/3.6)**2/1000,after:.5*after.params.m*(after.params.speed/3.6)**2/1000,unit:'kJ'});
    if(!changed.length)return {changed,summary:'기준과 같은 값입니다. 슬라이더 하나를 움직이면 전후 움직임과 바뀐 이유를 나란히 비교할 수 있어요.',reasons:[],outcomes,unchanged:true};
    const allSame=outcomes.every(item=>same(item.before,item.after));
    const prefix=changed.length>1?`변수 ${changed.length}개를 함께 바꾼 합산 결과입니다. `:'';
    const summary=prefix+(allSame?'입력은 달라졌지만 아래 비교 지표는 모두 같습니다. 서로 상쇄된 효과를 확인하세요.':changeText(outcomes[0])+' '+(changed.length>1?'각 변수의 영향은 서로 더해지거나 상쇄될 수 있습니다.':'아래 지표와 움직임을 함께 확인하세요.'));
    const reasons=changed.map(c=>({title:`${c.label} ${amount(c.before,c.unit)} → ${amount(c.after,c.unit)}`,body:explanation(kind,c.key,before.params,after.params)}));
    if(kind==='resonance'){
      const denominator=p=>Math.hypot(p.k-p.m*(2*Math.PI*p.f)**2,p.c*2*Math.PI*p.f);
      const a=denominator(before.params),b=denominator(after.params);
      const effect=same(a,b)?'분모가 같아 정상상태 진폭도 같습니다.':b>a?'분모가 커져 정상상태 진폭이 작아집니다.':'분모가 작아져 정상상태 진폭이 커집니다.';
      reasons.unshift({title:'이번 진폭이 이렇게 나온 이유',body:`X=250/√((k−mω²)²+(cω)²)에서 실제 입력을 모두 대입한 분모는 ${amount(a,'N/m')} → ${amount(b,'N/m')}입니다. ${effect} 주파수비만으로 크기를 판단하지 않고 감쇠항까지 계산한 결과입니다.`});
    }
    if(kind==='ride')reasons.push({title:'한 지표만으로 좋고 나쁨을 정하지 않아요',body:'최대 가속도·현가 변위와 최소 접지력은 같은 4초 구간의 10 ms 출력 샘플에서 구했습니다. 짧은 피크를 놓칠 수 있으며 전체 승차감이나 실차 성능을 단정하는 수치는 아닙니다. 접지력 0은 이 모델에서 타이어가 노면을 떠났음을 뜻합니다.'});
    return {changed,summary,reasons,outcomes,unchanged:false};
  }
  const api={describe};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.VehicleComparison=api;
})(typeof window!=='undefined'?window:globalThis);
