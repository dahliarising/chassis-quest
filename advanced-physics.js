(function(root){
  'use strict';
  const core=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.VehiclePhysics;
  const DEG=180/Math.PI,G=9.81,VERSION='advanced-1';
  const control=(key,label,symbol,min,max,step,unit)=>({key,label,symbol,min,max,step,unit});
  const metric=(label,value,unit)=>({label,value,unit});
  const formula=(label,expression,substitution,result)=>({label,expression,substitution,result});
  const series=(key,label,unit)=>({key,label,unit,color:'#356dff'});
  const n=(value,digits=3)=>Number(value.toFixed(digits)).toLocaleString('ko-KR');
  const ramp=(t,duration)=>.5*(1-Math.cos(Math.PI*Math.min(1,t/duration)));
  const scenes={
    hardpoint:{
      advanced:true,title:'하드포인트로 캠버 곡선 만들기',
      description:'차체 쪽 피벗 위치를 바꾸고 고정 길이 링크가 움직이는 경로를 비교하세요. 하부 볼조인트의 수직 이동을 입력합니다.',
      controls:[control('upperY','상부 내부 피벗의 바깥 방향 위치','Uᵧ',260,420,10,'mm'),control('upperZ','상부 내부 피벗 높이','U𝓏',360,480,10,'mm'),control('lowerY','하부 내부 피벗의 바깥 방향 위치','Lᵧ',220,360,10,'mm'),control('lowerZ','하부 내부 피벗 높이','L𝓏',140,220,10,'mm'),control('jounce','하부 볼조인트 수직 이동','ΔzLBJ',-50,50,5,'mm')],
      defaults:{upperY:360,upperZ:420,lowerY:300,lowerZ:180,jounce:40},
      assumptions:['앞에서 본 한쪽 현가계의 2D 강체 링크 모델입니다. 가로축은 차체 중심에서 바깥쪽, 세로축은 위쪽이 양수입니다.','정적 외측 점은 상부 (710,440), 하부 (750,190) mm로 고정합니다. 설계 피벗을 바꾸면 이 정적 자세에 맞게 암 길이를 다시 정하고, 재생 중에는 모든 링크 길이를 유지합니다.','입력은 하부 볼조인트의 수직 이동입니다. 휠센터 이동과 같지 않으며, 차체는 고정됩니다. 초기 캠버는 −1°입니다.','상부 볼조인트는 상부 암과 업라이트의 두 원 교점으로 계산합니다. 토·캐스터·부싱 변형·타이어 힘·3D 간섭은 계산하지 않습니다.'],
      theory:[{title:'하드포인트',body:'암의 차체 연결점과 볼조인트 등 기구를 정의하는 점입니다. 점의 위치와 링크 길이가 휠의 이동 경로를 결정합니다.'},{title:'캠버와 KPI는 다른 각도',body:'캠버는 바퀴 상단이 바깥으로 기울면 양수입니다. KPI는 위·아래 조향 볼조인트를 잇는 조향축의 안쪽 경사입니다. 업라이트가 회전해도 두 값이 동일한 각도는 아닙니다.'},{title:'실무에서 확인할 것',body:'정적 캠버가 같아도 범프 중 캠버 변화는 달라집니다. 이 실습에서는 초기 자세를 맞춘 설계끼리 비교합니다. 실제 설계는 3D 하드포인트, 타이로드, 롤·조향, 부싱 변형과 간섭을 함께 검토합니다.'}],
      sources:[{title:'MathWorks — 현가계의 기구학과 컴플라이언스',url:'https://www.mathworks.com/help/vdynblks/ref/independentsuspensionkandc.html'}]
    },
    knc:{
      advanced:true,title:'K&C: 움직여서 변할까, 힘 때문에 변할까?',
      description:'범프 이동에 따른 K와 횡력에 따른 C를 분리해 토·캠버 변화가 더해지거나 상쇄되는 과정을 확인하세요.',
      controls:[control('jounce','휠 범프 이동','z',-40,40,5,'mm'),control('lateralForce','바깥 방향 횡력','Fᵧ',-3,3,.25,'kN'),control('toeGradient','범프 토 변화율','gτ',-.02,.02,.002,'°/mm'),control('toeCompliance','횡력 토 컴플라이언스','cτ',-.2,.2,.02,'°/kN'),control('camberGradient','범프 캠버 변화율','gγ',-.05,0,.005,'°/mm'),control('camberCompliance','횡력 캠버 컴플라이언스','cγ',-.3,.3,.05,'°/kN')],
      defaults:{jounce:30,lateralForce:2,toeGradient:.01,toeCompliance:-.08,camberGradient:-.025,camberCompliance:.1},
      assumptions:['좌측 한 바퀴의 가상 K&C 시험을 나타내는 선형 응답 모델입니다. 계수는 학습용 입력값이며 특정 차량의 실측값이나 하드포인트 해석 결과가 아닙니다.','범프는 위쪽, 횡력은 차량 바깥쪽이 양수입니다. 토는 toe-in이 양수, 캠버는 바퀴 상단이 바깥으로 기울 때 양수입니다.','초기 토 +0.1°, 초기 캠버 −1°에 범프·횡력 기여를 더합니다. 다른 입력, 이력·히스테리시스와 비선형 결합은 제외합니다.','재생 시간은 시험 입력을 서서히 가하는 진행률입니다. 동특성이나 부싱의 시간 응답을 계산하지 않습니다.'],
      theory:[{title:'Kinematics: 위치가 만드는 변화',body:'외력을 따로 가하지 않고 휠을 위아래로 움직여 정렬각 변화를 봅니다. 범프 스티어는 현가 이동에 따른 토 변화이며, 변화율의 부호와 단위를 함께 읽어야 합니다.'},{title:'Compliance: 힘이 만드는 변화',body:'위치를 고정하고 힘·모멘트를 가해 부시와 구조의 변형에 따른 정렬각 변화를 봅니다. °/kN는 강성 N/m와 다르며, 값이 음수라고 잘못된 계수는 아닙니다.'},{title:'K와 C를 나눠 읽기',body:'총 토가 거의 안 변해도 K와 C가 서로 상쇄한 것일 수 있습니다. 토인·토아웃의 유불리는 앞뒤 축, 좌우 힘, 주행 상태와 함께 판단하며 한 바퀴 결과만으로 언더스티어를 단정하지 않습니다.'}],
      sources:[{title:'MathWorks — Independent Suspension K and C',url:'https://www.mathworks.com/help/vdynblks/ref/independentsuspensionkandc.html'}]
    },
    alignment:{
      advanced:true,title:'킹핀·캐스터: 꺾을 때 캠버가 바뀌는 이유',
      description:'기울어진 조향축 주위로 좌전륜을 회전시킵니다. 캠버, 실제 조향각, 정적 스크럽과 기계적 트레일을 구별하세요.',
      controls:[control('caster','캐스터','C',0,12,1,'°'),control('kpi','킹핀 경사각 (KPI)','I',0,18,1,'°'),control('offset','휠센터 높이의 축 안쪽 오프셋','e',20,100,5,'mm'),control('steer','조향축 주위 회전각','θ',-35,35,5,'°'),control('camber0','직진 상태 캠버','γ₀',-3,1,.5,'°')],
      defaults:{caster:6,kpi:10,offset:60,steer:25,camber0:-1},
      assumptions:['좌전륜 한 개의 강체 회전 모델입니다. x는 전방, y는 좌측(바깥쪽), z는 위쪽입니다. θ가 양수면 왼쪽으로 조향합니다.','양의 캐스터는 조향축 상단이 뒤로, 양의 KPI는 상단이 안쪽으로 기운 상태입니다. 단위 조향축 벡터 주위의 3D Rodrigues 회전으로 바퀴 자세를 계산합니다.','입력 θ는 조향축 주위 회전각입니다. 도로 위에서 본 실제 바퀴 조향각 δ와는 다릅니다. 캠버는 바퀴 상단이 바깥이면 양수입니다.','반경 330 mm, 직진 휠센터 기준 지상 투영점 (0,0)을 접지 중심으로 두고 정적 스크럽·기계적 트레일을 계산합니다. 조향 중 접지점 이동·잭킹·공기압 트레일·조향 토크는 계산하지 않습니다.'],
      theory:[{title:'킹핀 (kingpin)과 조향축',body:'현대 현가계에서도 상·하 볼조인트 또는 스트럿 상단을 잇는 가상 조향축을 생각할 수 있습니다. 전면에서 보이는 경사가 KPI, 측면에서 보이는 경사가 캐스터입니다.'},{title:'스크럽과 트레일',body:'스크럽은 정면에서 접지 중심과 조향축 지상 교점의 좌우 간격입니다. 기계적 트레일은 측면에서 그 교점이 접지 중심보다 앞서는 거리입니다. 타이어 변형에서 생기는 공기압 트레일과 구별합니다.'},{title:'왜 꺾으면 캠버가 변할까?',body:'바퀴가 수직축 대신 기울어진 축을 돌아 3차원 자세가 바뀌기 때문입니다. 좌전륜을 오른쪽으로 꺾을 때와 왼쪽으로 꺾을 때 캐스터의 캠버 기여는 서로 다릅니다. KPI와 캐스터를 한 번에 바꾸면 최종 회전 결과를 비교해야 합니다.'}],
      sources:[{title:'MathWorks — 현가계 정렬각과 조향 입력',url:'https://www.mathworks.com/help/vdynblks/ref/independentsuspensiondoublewishbone.html'}]
    },
    cornering:{
      advanced:true,title:'코너링 딥다이브: 타이어가 방향을 만드는 과정',
      description:'앞뒤 코너링 강성과 속도를 바꿔 조향 입력 이후의 슬립각, 횡력, 요레이트와 경로를 비교하세요.',
      controls:[control('speed','일정 전진 속도','U',20,80,5,'km/h'),control('Cf','앞축 합산 코너링 강성','C𝒇',60000,120000,5000,'N/rad'),control('Cr','뒤축 합산 코너링 강성','Cᵣ',60000,120000,5000,'N/rad'),control('delta','등가 앞바퀴 조향각','δ',.2,2,.1,'°')],
      defaults:{speed:50,Cf:80000,Cr:90000,delta:1},
      assumptions:['일정 속도의 선형 자전거 모델입니다. m=1,500 kg, I𝓏=2,500 kg·m², CG→앞축 a=1.26 m, CG→뒤축 b=1.54 m로 고정합니다.','C𝒇와 Cᵣ는 각각 좌우 두 타이어를 합한 축 전체 코너링 강성입니다. 입력은 핸들 각도가 아닌 등가 앞바퀴 조향각이며 0.3초부터 계단 입력합니다.','전방 x, 좌측 y, 반시계 요·좌향 횡력이 양수입니다. α𝒇=δ−β−ar/U, αᵣ=−β+br/U를 힘을 만드는 슬립각으로 정의합니다.','RK4 5 ms 간격으로 6초를 계산하며 10 ms마다 출력합니다. 정상값은 별도의 평형식으로 구하므로 마지막 프레임과 정확히 같다고 보장하지 않습니다.','타이어 포화·하중 민감도·하중 이동·캠버 추력·후륜 조향·공력은 제외합니다. |슬립각|>5° 또는 |횡가속도|>0.5g이면 선형 학습 범위를 벗어난 것으로 표시하고 예측 문제로 채점하지 않습니다.'],
      theory:[{title:'슬립각은 미끄러짐의 크기만이 아니다',body:'바퀴가 향하는 방향과 접지점이 움직이는 방향의 차이가 타이어 횡력을 만듭니다. 이 모델에서는 Fᵧ=Cα로 근사하고 작은 각도 범위에서만 사용합니다. 차체 방향 ψ와 속도 방향 ψ+β도 구별하세요.'},{title:'앞뒤 축의 역할',body:'두 축 횡력의 합은 횡가속도를, 무게중심에 대한 모멘트 차이는 요가속도를 만듭니다. 앞축 강성만 낮아지면 같은 입력에서 앞축 슬립 요구가 커져 언더스티어 기울기가 증가합니다.'},{title:'언더스티어 기울기 K',body:'K=(W𝒇/C𝒇−Wᵣ/Cᵣ), 단위 rad/g입니다. 같은 반경에서 δ=L/R+K·aᵧ/g. K>0이면 속도가 오를수록 추가 조향이 필요하고, K<0이면 줄어듭니다. K는 정적 토·캠버만으로 결정되지 않습니다.'},{title:'정상 응답과 과도 응답',body:'정상 요레이트는 충분히 기다린 평형값입니다. 조향 직후에는 β와 r가 시간에 따라 변합니다. 요레이트가 빨리 커지는 것, 최종 회전 반경이 작은 것, 운전하기 좋은 것은 서로 다른 평가입니다.'}],
      sources:[{title:'MathWorks — Bicycle Model',url:'https://www.mathworks.com/help/vdynblks/ref/bicyclemodel.html'}]
    }
  };
  function parameters(scene,partial){
    const p={...scene.defaults};
    for(const c of scene.controls){const value=partial&&partial[c.key];if(typeof value==='number'&&Number.isFinite(value))p[c.key]=Math.max(c.min,Math.min(c.max,value));}
    return p;
  }
  function samplesFor(duration,frame){return Array.from({length:Math.round(duration*100)+1},(_,i)=>frame(i/100));}
  function hardpoint(p){
    const duration=4,upperLength=Math.hypot(710-p.upperY,440-p.upperZ),lowerLength=Math.hypot(750-p.lowerY,190-p.lowerZ),uprightLength=Math.hypot(40,250),initialTilt=Math.atan2(-40,250);
    function pose(t){
      const jounce=p.jounce*ramp(t,duration),lowerBallZ=190+jounce;
      const lowerBallY=p.lowerY+Math.sqrt(lowerLength**2-(lowerBallZ-p.lowerZ)**2);
      const dy=lowerBallY-p.upperY,dz=lowerBallZ-p.upperZ,d=Math.hypot(dy,dz);
      const a=(upperLength**2-uprightLength**2+d*d)/(2*d),h=Math.sqrt(Math.max(0,upperLength**2-a*a));
      const upperBallY=p.upperY+a*dy/d-h*dz/d,upperBallZ=p.upperZ+a*dz/d+h*dy/d;
      const tilt=Math.atan2(upperBallY-lowerBallY,upperBallZ-lowerBallZ),rotation=tilt-initialTilt;
      return {t,jounce,upperBallY,upperBallZ,lowerBallY,lowerBallZ,camber:-1+rotation*DEG,kpi:-tilt*DEG,
        wheelY:(upperBallY+lowerBallY)/2+70*Math.cos(rotation)+15*Math.sin(rotation),wheelZ:(upperBallZ+lowerBallZ)/2-70*Math.sin(rotation)+15*Math.cos(rotation)};
    }
    const samples=samplesFor(duration,pose),end=samples.at(-1);
    return {duration,samples,geometry:{upperLength,lowerLength,uprightLength},
      metrics:[metric('최종 캠버각',end.camber,'°'),metric('최종 킹핀 경사각',end.kpi,'°'),metric('상부 암 길이',upperLength,'mm'),metric('휠센터 수직 이동',end.wheelZ-330,'mm')],
      formulas:[formula('하부 링크의 원','(yL−yLi)²+(zL−zLi)²=ℓL²',`zL=190+${n(p.jounce)} mm, ℓL=${n(lowerLength)} mm`,`최종 L=(${n(end.lowerBallY)}, ${n(end.lowerBallZ)}) mm`),formula('상부 점의 두 원 교차','|U−Ui|=ℓU, |U−L|=ℓupright',`ℓU=${n(upperLength)}, ℓupright=${n(uprightLength)} mm`,`최종 U=(${n(end.upperBallY)}, ${n(end.upperBallZ)}) mm`),formula('업라이트 회전과 캠버','γ=γ₀+atan2(yU−yL,zU−zL)−θ₀',`γ₀=−1°, θ₀=${n(initialTilt*DEG)}°`,`γ=${n(end.camber)}° · KPI=${n(end.kpi)}°`)],series:[series('camber','캠버각','°')]};
  }
  function knc(p){
    const duration=4,samples=samplesFor(duration,t=>{
      const progress=ramp(t,duration),jounce=p.jounce*progress,lateralForce=p.lateralForce*progress;
      const toeK=p.toeGradient*jounce,toeC=p.toeCompliance*lateralForce,camberK=p.camberGradient*jounce,camberC=p.camberCompliance*lateralForce;
      return {t,jounce,lateralForce,toeK,toeC,camberK,camberC,toe:.1+toeK+toeC,camber:-1+camberK+camberC};
    }),end=samples.at(-1);
    return {duration,samples,
      metrics:[metric('최종 토각',end.toe,'°'),metric('최종 캠버각',end.camber,'°'),metric('K의 토 기여',end.toeK,'°'),metric('C의 토 기여',end.toeC,'°')],
      formulas:[formula('토: 초기값 + K + C','τ=τ₀+gτ·z+cτ·Fᵧ',`0.1+(${n(p.toeGradient)})×${n(p.jounce)}+(${n(p.toeCompliance)})×${n(p.lateralForce)}`,`${n(end.toe)}° · 양수=toe-in`),formula('캠버: 초기값 + K + C','γ=γ₀+gγ·z+cγ·Fᵧ',`−1+(${n(p.camberGradient)})×${n(p.jounce)}+(${n(p.camberCompliance)})×${n(p.lateralForce)}`,`${n(end.camber)}° · 양수=상단이 바깥`),formula('분리해서 읽는 토 변화','ΔτK=gτ·z; ΔτC=cτ·Fᵧ',`K=${n(end.toeK)}°, C=${n(end.toeC)}°`,`합계 변화 ${n(end.toeK+end.toeC)}° · 상쇄 가능`)],series:[series('toe','토각 (+ toe-in)','°'),series('camber','캠버각','°')]};
  }
  function alignment(p){
    const duration=4,tc=Math.tan(p.caster/DEG),tk=Math.tan(p.kpi/DEG),length=Math.hypot(tc,tk,1),axis=[-tc/length,-tk/length,1/length];
    const normal=[0,Math.cos(p.camber0/DEG),-Math.sin(p.camber0/DEG)],dot=axis.reduce((sum,value,i)=>sum+value*normal[i],0);
    const cross=[axis[1]*normal[2]-axis[2]*normal[1],axis[2]*normal[0]-axis[0]*normal[2],axis[0]*normal[1]-axis[1]*normal[0]];
    const scrub=p.offset-330*tk,trail=330*tc;
    const samples=samplesFor(duration,t=>{
      const steer=p.steer*ramp(t,duration),theta=steer/DEG,c=Math.cos(theta),s=Math.sin(theta);
      const rotated=normal.map((value,i)=>value*c+cross[i]*s+axis[i]*dot*(1-c));
      return {t,steer,camber:Math.atan2(-rotated[2],Math.hypot(rotated[0],rotated[1]))*DEG,heading:Math.atan2(-rotated[0],rotated[1]),normalX:rotated[0],normalY:rotated[1],normalZ:rotated[2],scrub,trail};
    }),end=samples.at(-1);
    return {duration,samples,geometry:{axisX:axis[0],axisY:axis[1],axisZ:axis[2],groundX:trail,groundY:-scrub,radius:330},
      metrics:[metric('조향 후 캠버각',end.camber,'°'),metric('정적 스크럽 반경',scrub,'mm'),metric('기계적 트레일',trail,'mm'),metric('실제 바퀴 조향각',end.heading*DEG,'°')],
      formulas:[formula('조향축 단위 벡터','u=normalize(−tan C,−tan I,1)',`C=${n(p.caster)}°, I=${n(p.kpi)}°`,`u=(${n(axis[0])}, ${n(axis[1])}, ${n(axis[2])})`),formula('기울어진 축의 회전','n′=n cosθ+(u×n)sinθ+u(u·n)(1−cosθ)',`θ=${n(p.steer)}°, γ₀=${n(p.camber0)}°`,`캠버 ${n(end.camber)}° · 지면 조향각 ${n(end.heading*DEG)}°`),formula('직진 지상 기하','s=e−R tan I; tₘ=R tan C',`e=${n(p.offset)} mm, R=330 mm`,`스크럽 ${n(scrub)} mm · 기계적 트레일 ${n(trail)} mm`)],series:[series('camber','조향 중 캠버각','°')]};
  }
  function cornering(p){
    const m=1500,Iz=2500,a=1.26,b=1.54,L=a+b,U=p.speed/3.6,duration=6,dt=.005,delta=p.delta/DEG;
    const Wf=m*G*b/L,Wr=m*G*a/L,K=Wf/p.Cf-Wr/p.Cr,D=L+K*U*U/G,steadyYaw=U*delta/D;
    const steadyAy=U*steadyYaw,steadyBeta=b*steadyYaw/U-Wr/G*steadyAy/p.Cr;
    const forces=(state,t)=>{const steering=t>=.3?delta:0,alphaF=steering-state[0]-a*state[1]/U,alphaR=-state[0]+b*state[1]/U;return {steering,alphaF,alphaR,FyF:p.Cf*alphaF,FyR:p.Cr*alphaR};};
    const rate=(state,t)=>{const f=forces(state,t),[beta,r,yaw]=state;return [(f.FyF+f.FyR)/(m*U)-r,(a*f.FyF-b*f.FyR)/Iz,r,U*(Math.cos(yaw)-beta*Math.sin(yaw)),U*(Math.sin(yaw)+beta*Math.cos(yaw))];};
    const frame=(state,t)=>{const f=forces(state,t);return {t,beta:state[0],yawRate:state[1],yaw:state[2],x:state[3],y:state[4],delta:f.steering,alphaF:f.alphaF,alphaR:f.alphaR,frontForce:f.FyF,rearForce:f.FyR,ay:(f.FyF+f.FyR)/m};};
    let state=[0,0,0,0,0];const samples=[frame(state,0)];
    for(let i=0;i<Math.round(duration/dt);i++){
      // Hold the step input over each interval, so the endpoint at 0.3 s
      // cannot leak steering into the preceding interval's RK4 stages.
      const t=i*dt,ka=rate(state,t),kb=rate(state.map((v,j)=>v+dt*ka[j]/2),t),kc=rate(state.map((v,j)=>v+dt*kb[j]/2),t),kd=rate(state.map((v,j)=>v+dt*kc[j]),t);
      state=state.map((v,j)=>v+dt*(ka[j]+2*kb[j]+2*kc[j]+kd[j])/6);
      if((i+1)%2===0)samples.push(frame(state,(i+1)*dt));
    }
    const peakAlpha=samples.reduce((value,s)=>Math.max(value,Math.abs(s.alphaF),Math.abs(s.alphaR)),0),peakAy=samples.reduce((value,s)=>Math.max(value,Math.abs(s.ay)),Math.abs(steadyAy));
    const valid=peakAlpha<=5/DEG&&peakAy<=.5*G;
    const warnings=valid?[]:[`선형 학습 범위 초과: 최대 |슬립각| ${n(peakAlpha*DEG)}°, 최대 |횡가속도| ${n(peakAy/G)}g. 타이어 포화를 계산하지 않은 외삽 결과이므로 예측 문제로 채점하지 않습니다. 속도 또는 조향각을 낮춰 보세요.`];
    return {duration,samples,valid,warnings,geometry:{a,b,L,U},steady:{yawRate:steadyYaw,beta:steadyBeta,ay:steadyAy},
      metrics:[metric('정상 요레이트',steadyYaw*DEG,'°/s'),metric('언더스티어 기울기',K*DEG,'°/g'),metric('정상 회전 반경',U/steadyYaw,'m'),metric('정상 횡가속도',steadyAy/G,'g')],
      formulas:[formula('슬립각에서 횡력으로','α𝒇=δ−β−ar/U; αᵣ=−β+br/U; Fᵧ=Cα',`C𝒇=${n(p.Cf)}, Cᵣ=${n(p.Cr)} N/rad`,`앞뒤 축 합산 강성 · U=${n(U)} m/s`),formula('횡·요 운동 방정식','β̇=(Fᵧ𝒇+Fᵧᵣ)/(mU)−r; ṙ=(aFᵧ𝒇−bFᵧᵣ)/I𝓏',`m=1500 kg, I𝓏=2500 kg·m², a=1.26 m, b=1.54 m`,'조향 0.3초 계단 입력 · 6초 과도 응답'),formula('언더스티어 기울기','K=W𝒇/C𝒇−Wᵣ/Cᵣ',`${n(Wf)}/${n(p.Cf)}−${n(Wr)}/${n(p.Cr)}`,`${n(K*DEG)} °/g · ${Math.abs(K)<1e-10?'중립':K>0?'언더스티어':'오버스티어'}`),formula('정상 요레이트','r∞=Uδ/(L+KU²/g)',`${n(U)}×${n(delta,5)}/(2.8+${n(K,5)}×${n(U)}²/9.81)`,`${n(steadyYaw*DEG)} °/s · aᵧ=Ur`) ],series:[series('yawRate','요레이트','rad/s'),series('beta','차체 슬립각 β','rad')]};
  }
  const models={hardpoint,knc,alignment,cornering};
  function simulate(id,partial={}){
    if(!Object.prototype.hasOwnProperty.call(scenes,id))return core.simulate(id,partial);
    const scene=scenes[id],params=parameters(scene,partial);
    return {kind:id,params,valid:true,warnings:[],modelVersion:VERSION,...models[id](params),assumptions:scene.assumptions.slice()};
  }
  const api={...core,scenes:{...core.scenes,...scenes},simulate,advanced:{ids:Object.keys(scenes),version:VERSION}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VehiclePhysics=api;
})(typeof window!=='undefined'?window:globalThis);
