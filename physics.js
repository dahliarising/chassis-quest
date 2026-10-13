(function(root) {
  'use strict';
  const G=9.81, TAU=2*Math.PI, DEG=180/Math.PI, OUTPUT_STEP=.01;
  const control=(key,label,symbol,min,max,step,unit)=>({key,label,symbol,min,max,step,unit});
  const mass=()=>control('m','한 바퀴가 지지하는 차체 질량','m',200,500,10,'kg');
  const stiffness=()=>control('k','스프링 강성','k',10000,35000,500,'N/m');
  const damping=(min=0)=>control('c','감쇠 계수','c',min,4500,100,'N·s/m');
  const scenes={
    bounce:{
      title:'흔들린 차체, 언제 진정될까?',
      description:'차체를 20 mm 들어 올렸다 놓습니다. 질량·스프링·댐퍼가 움직임을 어떻게 바꾸는지 비교하세요.',
      controls:[mass(),stiffness(),damping()],defaults:{m:320,k:20000,c:1500},
      assumptions:['바퀴가 고정된 1자유도 모델이며 차체 한 코너의 상하 운동만 계산합니다.','정적 평형에서 차체 변위 20 mm, 초기 속도 0으로 시작합니다. 위쪽이 양수입니다.','선형 스프링·점성 댐퍼이며 노면 입력, 피치·롤, 마찰·스토퍼는 제외합니다.']
    },
    ride:{
      title:'방지턱을 넘는 차체와 바퀴',
      description:'같은 30 mm 범프를 넘어도 차체, 바퀴, 노면은 서로 다르게 움직입니다.',
      controls:[control('ms','한 바퀴가 지지하는 차체 질량','mₛ',200,500,10,'kg'),control('ks','스프링 강성','kₛ',10000,35000,500,'N/m'),control('cs','감쇠 계수','cₛ',500,4500,100,'N·s/m'),control('speed','통과 속도','v',10,60,5,'km/h')],
      defaults:{ms:320,ks:20000,cs:1500,speed:30},
      assumptions:['차체·바퀴의 2자유도 쿼터카 모델입니다. 정적 평형 변위에서 시작하며 위쪽이 양수입니다.','바퀴 질량 40 kg, 타이어 강성 180,000 N/m, 타이어 감쇠 0으로 고정합니다.','0.6초에 길이 2 m·높이 30 mm의 코사인 범프에 진입합니다. 속도는 일정합니다.','접지력은 0 이상만 허용합니다. 접지력 0은 이륙 상태이며 재접촉은 타이어 스프링으로 계산합니다.','선형 현가계이며 스토퍼, 피치·롤, 타이어 형상·감쇠는 제외합니다.']
    },
    resonance:{
      title:'같은 박자로 밀면 커지는 흔들림',
      description:'차체에 반복되는 250 N 힘을 가합니다. 가진 주파수가 고유 진동수에 가까워질 때 진폭을 보세요.',
      controls:[mass(),stiffness(),damping(200),control('f','가진 주파수','f',.3,4,.05,'Hz')],defaults:{m:320,k:20000,c:1500,f:1.2},
      assumptions:['차체에 250·sin(2πft) N의 힘이 직접 작용하는 1자유도 모델입니다. 바퀴·노면은 고정입니다.','충분히 오래 가진한 정상상태만 보여줍니다. 시작할 때의 과도 응답은 포함하지 않습니다.','외력 가진의 변위 진폭이며, 노면 기저 가진의 전달률과는 다른 식입니다.','선형 스프링·점성 댐퍼를 사용하며 기구적 변위 한계는 제외합니다.']
    },
    steer:{
      title:'안쪽 바퀴는 왜 더 꺾일까?',
      description:'축거·윤거·등가 조향각을 바꾸면 앞바퀴 각도와 저속 회전 궤적이 함께 달라집니다.',
      controls:[control('L','축거','L',2.4,3.2,.1,'m'),control('t','윤거','t',1.4,1.8,.05,'m'),control('delta','등가 앞바퀴 조향각','δ',5,35,1,'°')],defaults:{L:2.8,t:1.6,delta:15},
      assumptions:['속도 5 km/h, 완전 Ackermann 조향의 저속 순수 구름 모델입니다.','δ는 핸들 각도가 아닌 자전거 모델의 등가 앞바퀴 각도입니다.','궤적은 뒤 차축 중심입니다. 전방 x, 좌측 y, 반시계 방향 yaw가 양수입니다.','타이어 슬립, 언더스티어·오버스티어, 조향계 탄성은 계산하지 않습니다.']
    },
    brake:{
      title:'속도는 두 배, 제동 거리는?',
      description:'속도·마찰·무게중심 높이를 바꾸며 정지 거리와 앞뒤 축 하중 이동을 확인하세요.',
      controls:[control('speed','제동 시작 속도','v₀',20,100,5,'km/h'),control('mu','노면 마찰 계수','μ',.3,1,.05,''),control('h','지면에서 무게중심 높이','h',.35,.8,.05,'m'),control('m','차량 질량','m',1000,2200,100,'kg')],defaults:{speed:60,mu:.8,h:.55,m:1500},
      assumptions:['평지에서 즉시 a=μg로 감속하는 이상적인 마찰 한계 제동입니다. 운전자 반응 시간은 제외합니다.','축거 2.8 m, 정적 앞축 하중 비율 55%, 중력가속도 9.81 m/s²입니다.','공기저항·경사·타이어 하중 민감도·ABS 과도 응답을 제외합니다.','차체 이동과 준정적 축 하중을 계산합니다. 피치각은 계산하지 않으며 정지 후 축 하중은 정적 값으로 돌아옵니다.']
    },
    roll:{
      title:'코너에서 기우는 차체',
      description:'같은 횡가속도에서도 무게중심 높이와 롤 강성에 따라 차체 기울기가 달라집니다.',
      controls:[control('m','롤 운동하는 차체 질량','m',1000,1800,100,'kg'),control('h','롤축 위 무게중심 높이','h',.25,.65,.05,'m'),control('Kphi','유효 롤 강성','Kφ',40000,100000,5000,'N·m/rad'),control('ay','횡가속도','aᵧ',.1,.5,.05,'g')],defaults:{m:1400,h:.45,Kphi:65000,ay:.3},
      assumptions:['0.3초에 일정 횡가속도가 가해지는 1자유도 소각도 롤 모델입니다.','h는 지면 기준이 아니라 롤축에서 무게중심까지의 높이입니다.','유효 롤 강성 Kφ에 대해 Iφ·φ̈+Cφ·φ̇+Kφ·φ=m·aᵧ·h를 계산합니다.','Iφ=m×0.65² kg·m², 롤 감쇠 Cφ=5,000 N·m·s/rad로 고정합니다.','타이어·기구학·좌우 하중 배분·전복 한계는 포함하지 않습니다. 양의 각도는 입력에 의한 롤 크기입니다.']
    }
  };
  const number=(n,digits=2)=>Number(n.toFixed(digits)).toLocaleString('ko-KR',{maximumFractionDigits:digits});
  const metric=(label,value,unit)=>({label,value,unit});
  const formula=(label,expression,substitution,result)=>({label,expression,substitution,result});
  const series=(key,label,unit,color)=>({key,label,unit,color});
  const peak=(samples,key)=>samples.reduce((max,s)=>Math.max(max,Math.abs(s[key])),0);

  function parameters(scene,partial){
    const p={...scene.defaults};
    for(const c of scene.controls){
      const value=partial&&partial[c.key];
      if(typeof value==='number'&&Number.isFinite(value))p[c.key]=Math.max(c.min,Math.min(c.max,value));
    }
    return p;
  }
  function sampleTimes(duration,frame){
    const samples=[];
    for(let i=0;i<=Math.floor(duration/OUTPUT_STEP);i++)samples.push(frame(i*OUTPUT_STEP));
    if(samples.at(-1).t<duration-1e-9)samples.push(frame(duration));
    return samples;
  }
  // Exact free response with x(0)=1 and ẋ(0)=0, including critical damping.
  function freeState(m,k,c,t){
    const alpha=c/(2*m),omega2=k/m,difference=omega2-alpha*alpha;
    if(Math.abs(difference)<1e-10*omega2){
      const e=Math.exp(-alpha*t);
      return {x:e*(1+alpha*t),v:-alpha*alpha*t*e};
    }
    if(difference>0){
      const wd=Math.sqrt(difference),e=Math.exp(-alpha*t);
      return {x:e*(Math.cos(wd*t)+alpha/wd*Math.sin(wd*t)),v:-e*omega2/wd*Math.sin(wd*t)};
    }
    const beta=Math.sqrt(-difference),r1=-alpha+beta,r2=-alpha-beta;
    const a=-r2/(r1-r2),b=r1/(r1-r2);
    return {x:a*Math.exp(r1*t)+b*Math.exp(r2*t),v:a*r1*Math.exp(r1*t)+b*r2*Math.exp(r2*t)};
  }
  function bounce(p){
    const {m,k,c}=p,wn=Math.sqrt(k/m),zeta=c/(2*Math.sqrt(k*m)),duration=4;
    const samples=sampleTimes(duration,t=>{
      const s=freeState(m,k,c,t),body=.02*s.x,velocity=.02*s.v,force=-k*body-c*velocity;
      return {t,body,wheel:0,road:0,velocity,force,accel:force/m};
    });
    return {duration,samples,
      metrics:[metric('고유 진동수',wn/TAU,'Hz'),metric('감쇠비',zeta,''),metric('최대 차체 가속도',peak(samples,'accel'),'m/s²')],
      formulas:[
        formula('힘의 균형','m·ẍ + c·ẋ + k·x = 0',`${number(m)}·ẍ + ${number(c)}·ẋ + ${number(k)}·x = 0`,'x(0)=0.020 m, ẋ(0)=0 m/s'),
        formula('고유 진동수','fₙ = √(k/m) / (2π)',`√(${number(k)}/${number(m)}) / (2π)`,`${number(wn/TAU)} Hz`),
        formula('감쇠비','ζ = c / (2√(km))',`${number(c)} / (2√(${number(k)}×${number(m)}))`,`${number(zeta,3)} · ${c===0?'무감쇠':zeta<.999999?'부족 감쇠':zeta>1.000001?'과감쇠':'임계 감쇠'}`)
      ],series:[series('body','차체 변위','m','#356dff')]};
  }
  function resonance(p){
    const {m,k,c,f}=p,w=TAU*f,F0=250,wn=Math.sqrt(k/m);
    const amplitude=F0/Math.hypot(k-m*w*w,c*w),phase=Math.atan2(c*w,k-m*w*w),duration=4;
    const samples=sampleTimes(duration,t=>{
      const angle=w*t-phase,body=amplitude*Math.sin(angle),velocity=amplitude*w*Math.cos(angle),accel=-w*w*body;
      return {t,body,wheel:0,road:0,velocity,accel,force:F0*Math.sin(w*t),netForce:m*accel};
    });
    return {duration,samples,
      metrics:[metric('정상상태 진폭',amplitude*1000,'mm'),metric('주파수비',w/wn,''),metric('위상 지연',phase*DEG,'°')],
      formulas:[
        formula('외력 가진','m·ẍ + c·ẋ + k·x = F₀·sin(2πft)',`${number(m)}·ẍ + ${number(c)}·ẋ + ${number(k)}·x = 250·sin(2π×${number(f)}t)`,'노면 입력이 아닌 차체에 작용하는 힘'),
        formula('정상상태 진폭','X = F₀ / √((k−mω²)² + (cω)²)',`250 / √((${number(k)}−${number(m)}×${number(w,3)}²)² + (${number(c)}×${number(w,3)})²)`,`${number(amplitude*1000)} mm (ω=2πf)`),
        formula('주파수비','r = f / fₙ',`${number(f)} / ${number(wn/TAU,3)}`,`${number(w/wn,3)} · 정상상태 x=X·sin(ωt−φ)`)
      ],series:[series('body','차체 변위','m','#356dff')]};
  }
  function ride(p){
    const {ms,ks,cs,speed}=p,mu=40,kt=180000,Fz0=(ms+mu)*G,duration=4,dt=.001;
    const road=t=>{const u=(t-.6)*speed/3.6/2;return u>0&&u<1?.015*(1-Math.cos(TAU*u)):0;};
    const forces=(s,t)=>({spring:ks*(s[0]-s[2])+cs*(s[1]-s[3]),tire:Math.max(0,Fz0+kt*(road(t)-s[2]))});
    const rate=(s,t)=>{const f=forces(s,t);return [s[1],-f.spring/ms,s[3],(f.spring+f.tire-Fz0)/mu];};
    const frame=(s,t)=>{const f=forces(s,t);return {t,body:s[0],wheel:s[2],road:road(t),accel:-f.spring/ms,stroke:s[0]-s[2],tireLoad:f.tire};};
    let state=[0,0,0,0];const samples=[frame(state,0)];
    for(let i=0;i<Math.round(duration/dt);i++){
      const t=i*dt,a=rate(state,t),b=rate(state.map((v,j)=>v+dt*a[j]/2),t+dt/2);
      const c=rate(state.map((v,j)=>v+dt*b[j]/2),t+dt/2),d=rate(state.map((v,j)=>v+dt*c[j]),t+dt);
      state=state.map((v,j)=>v+dt*(a[j]+2*b[j]+2*c[j]+d[j])/6);
      if((i+1)%10===0)samples.push(frame(state,(i+1)*dt));
    }
    const minimumLoad=samples.reduce((min,s)=>Math.min(min,s.tireLoad),Fz0);
    return {duration,samples,
      metrics:[metric('최대 차체 가속도',peak(samples,'accel'),'m/s²'),metric('최대 현가 변위',peak(samples,'stroke')*1000,'mm'),metric('최소 접지력',minimumLoad,'N')],
      formulas:[
        formula('차체의 힘 균형','mₛ·z̈ₛ = −kₛ(zₛ−zᵤ) − cₛ(żₛ−żᵤ)',`${number(ms)}·z̈ₛ = −${number(ks)}(zₛ−zᵤ) − ${number(cs)}(żₛ−żᵤ)`,`최대 |z̈ₛ| = ${number(peak(samples,'accel'))} m/s²`),
        formula('접지력과 바퀴','Fₜ = max(0, Fz₀+kₜ(zᵣ−zᵤ)); mᵤ·z̈ᵤ = Fₛ+Fₜ−Fz₀',`Fz₀=(${number(ms)}+40)×9.81=${number(Fz0)} N, kₜ=180,000 N/m`,`최소 Fₜ = ${number(minimumLoad)} N · Fₛ=kₛ(zₛ−zᵤ)+cₛ(żₛ−żᵤ)`),
        formula('범프 통과 시간','T = 범프 길이 / 속도',`2 / (${number(speed)}/3.6)`,`${number(2/(speed/3.6),3)} s · 높이 30 mm`)
      ],series:[series('body','차체','m','#356dff'),series('wheel','바퀴','m','#ce6b13'),series('road','노면','m','#62766b')]};
  }
  function steer(p){
    const {L,t:track,delta}=p,R=L/Math.tan(delta/DEG),inner=Math.atan(L/(R-track/2)),outer=Math.atan(L/(R+track/2)),speed=5/3.6,duration=4;
    const samples=sampleTimes(duration,t=>{const yaw=speed*t/R;return {t,x:R*Math.sin(yaw),y:R*(1-Math.cos(yaw)),yaw,inner,outer};});
    return {duration,samples,
      metrics:[metric('뒤 차축 중심 회전 반경',R,'m'),metric('내측 바퀴 각도',inner*DEG,'°'),metric('외측 바퀴 각도',outer*DEG,'°')],
      formulas:[
        formula('뒤 차축 중심 회전 반경','R = L / tan(δ)',`${number(L)} / tan(${number(delta)}°)`,`${number(R)} m`),
        formula('내측·외측 앞바퀴','δᵢ = atan(L/(R−t/2)); δₒ = atan(L/(R+t/2))',`atan(${number(L)}/(${number(R)}∓${number(track)}/2))`,`내측 ${number(inner*DEG)}° · 외측 ${number(outer*DEG)}°`),
        formula('차체 방향 변화','yaw = (v/R)·시간',`(5/3.6)/${number(R)} × 시간`,`${number(speed/R*DEG)} °/s · 저속·슬립 없음`)
      ],series:[series('x','전진 거리','m','#356dff'),series('y','좌측 이동','m','#ce6b13')]};
  }
  function brake(p){
    const {speed,mu,h,m}=p,v0=speed/3.6,a=mu*G,L=2.8,stopTime=v0/a,distance=v0*v0/(2*a),transfer=m*a*h/L,duration=stopTime+.5;
    const samples=sampleTimes(duration,t=>{
      const moving=t<stopTime,elapsed=Math.min(t,stopTime),loadShift=moving?transfer:0;
      return {t,x:v0*elapsed-.5*a*elapsed*elapsed,speed:Math.max(0,v0-a*t),accel:moving?-a:0,frontLoad:.55*m*G+loadShift,rearLoad:.45*m*G-loadShift};
    });
    return {duration,samples,
      metrics:[metric('정지 거리',distance,'m'),metric('정지 시간',stopTime,'s'),metric('제동 중 앞축 증가 하중',transfer,'N')],
      formulas:[
        formula('정지 거리','s = v₀² / (2μg)',`(${number(speed)}/3.6)² / (2×${number(mu)}×9.81)`,`${number(distance)} m · 반응 거리 제외`),
        formula('앞축으로 이동하는 하중','ΔFz = m·a·h / L',`${number(m)}×(${number(mu)}×9.81)×${number(h)} / 2.8`,`${number(transfer)} N · 앞축 +ΔFz / 뒤축 −ΔFz`),
        formula('초기 운동 에너지','E = ½·m·v₀²',`0.5×${number(m)}×(${number(speed)}/3.6)²`,`${number(.5*m*v0*v0/1000)} kJ`)
      ],series:[series('speed','차량 속도','m/s','#356dff')]};
  }
  function roll(p){
    const {m,h,Kphi,ay}=p,inertia=m*.65**2,damping=5000,moment=m*ay*G*h,steady=moment/Kphi,duration=4;
    const samples=sampleTimes(duration,t=>{
      if(t<=.3)return {t,roll:0};
      const state=freeState(inertia,Kphi,damping,t-.3);
      return {t,roll:steady*(1-state.x)};
    });
    return {duration,samples,
      metrics:[metric('정상 롤각',steady*DEG,'°'),metric('최대 롤각',peak(samples,'roll')*DEG,'°'),metric('롤 모멘트',moment,'N·m')],
      formulas:[
        formula('롤 운동 방정식','Iφ·φ̈ + Cφ·φ̇ + Kφ·φ = m·aᵧ·h',`${number(inertia)}·φ̈ + 5,000·φ̇ + ${number(Kphi)}·φ = ${number(moment)}`,`0.3초 이후 ${number(moment)} N·m의 모멘트`),
        formula('정상 롤각','φ∞ = m·aᵧ·h / Kφ',`${number(m)}×(${number(ay)}×9.81)×${number(h)} / ${number(Kphi)}`,`${number(steady,4)} rad = ${number(steady*DEG)}°`),
        formula('롤 관성 모멘트','Iφ = m·회전반경²',`${number(m)}×0.65²`,`${number(inertia)} kg·m² · 회전반경 고정`)
      ],series:[series('roll','차체 롤각','rad','#356dff')]};
  }
  const simulations={bounce,ride,resonance,steer,brake,roll};
  function simulate(id,partialParams={}){
    if(!Object.prototype.hasOwnProperty.call(scenes,id))throw new Error('알 수 없는 차량 운동 장면입니다.');
    const scene=scenes[id],params=parameters(scene,partialParams);
    return {kind:id,params,...simulations[id](params),assumptions:scene.assumptions.slice()};
  }
  function at(result,t){
    const samples=result.samples,time=Number.isFinite(t)?t:0;
    if(time<=samples[0].t)return {...samples[0]};
    if(time>=samples.at(-1).t)return {...samples.at(-1)};
    let lo=0,hi=samples.length-1;
    while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(samples[mid].t<=time)lo=mid;else hi=mid;}
    const a=samples[lo],b=samples[hi],fraction=(time-a.t)/(b.t-a.t),frame={};
    for(const key of Object.keys(a))frame[key]=a[key]+(b[key]-a[key])*fraction;
    frame.t=time;
    return frame;
  }
  const api={scenes,simulate,at};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.VehiclePhysics=api;
})(typeof window!=='undefined'?window:globalThis);
