/* SVG views of computed samples only. The host owns time, playback and shared axes. */
(function(root){
  'use strict';
  const IDS=['hardpoint','knc','alignment','cornering'];
  const BLUE='#455bdb',INK='#26334d',MINT='#16836e',GOLD='#be7c12',GRID='#d6deeb';
  const DEG=180/Math.PI;
  const num=(value,digits=2)=>Number(value).toLocaleString('ko-KR',{maximumFractionDigits:digits});
  const line=(x1,y1,x2,y2,color=GRID,width=3,extra='')=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
  const dot=(x,y,color=GOLD,r=5)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="#fff" stroke-width="2"/>`;
  const arrow=(x1,y1,x2,y2,color=GOLD,width=3)=>{
    if(Math.hypot(x2-x1,y2-y1)<.4)return '';
    const a=Math.atan2(y2-y1,x2-x1),h=7;
    return line(x1,y1,x2,y2,color,width)+line(x2,y2,x2-h*Math.cos(a-.5),y2-h*Math.sin(a-.5),color,width)+line(x2,y2,x2-h*Math.cos(a+.5),y2-h*Math.sin(a+.5),color,width);
  };
  const dashed='stroke-dasharray="7 6"';
  const tire=(cx,cy,width,height,angle=0,color=INK)=>`<g transform="translate(${cx} ${cy}) rotate(${angle})"><rect x="${-width/2}" y="${-height/2}" width="${width}" height="${height}" rx="${Math.min(width/3,12)}" fill="${color}"/><path d="M0 ${-height*.4}V${height*.4}" stroke="#edf2fa" stroke-width="3"/></g>`;
  function scale(before,after){
    const samples=[...before.samples,...after.samples];
    if(before.kind==='cornering'){
      const xs=samples.map(s=>s.x),ys=samples.map(s=>s.y);
      return {minX:Math.min(0,...xs),maxX:Math.max(1,...xs),minY:Math.min(0,...ys),maxY:Math.max(1,...ys),force:Math.max(1,...samples.flatMap(s=>[Math.abs(s.frontForce),Math.abs(s.rearForce)]))};
    }
    return {angleGain:before.kind==='knc'?8:1};
  }
  function hardpoint(result,frame){
    const map=(y,z)=>[(y-180)*.44,330-z*.44],U=map(frame.upperBallY,frame.upperBallZ),L=map(frame.lowerBallY,frame.lowerBallZ),A=map(result.params.upperY,result.params.upperZ),B=map(result.params.lowerY,result.params.lowerZ),W=map(frame.wheelY,frame.wheelZ);
    let out='<path d="M20 330H365" stroke="#78869c" stroke-width="4"/>';
    out+=line(...map(800,0),...map(800,690),GRID,2,dashed);
    out+=`<path d="M${Math.min(A[0],B[0])-18} ${A[1]-40}V${B[1]+40}" stroke="#c9d5e7" stroke-width="25" stroke-linecap="round"/>`;
    out+=tire(W[0],W[1],51,290,frame.camber,INK);
    out+=line(...A,...U,BLUE,8)+line(...B,...L,BLUE,8)+line(...U,...L,GOLD,7);
    out+=line((U[0]+L[0])/2,(U[1]+L[1])/2,...W,INK,5);
    out+=[A,B].map(p=>dot(...p,MINT,8)).join('')+[U,L].map(p=>dot(...p,GOLD,7)).join('')+dot(...W,BLUE,6);
    const origin=map(750,190);
    out+=line(origin[0]+22,origin[1],origin[0]+22,L[1],GOLD,3)+line(origin[0]+14,origin[1],origin[0]+30,origin[1],GOLD,3)+line(origin[0]+14,L[1],origin[0]+30,L[1],GOLD,3);
    return out;
  }
  function knc(result,frame,shared){
    const gain=shared.angleGain;
    let out='<rect x="12" y="12" width="336" height="182" rx="15" fill="#f3f6fc"/><rect x="12" y="208" width="336" height="182" rx="15" fill="#f3f6fc"/>';
    // Top view: left wheel is left of the vehicle centre; positive toe-in points inward.
    out+='<rect x="211" y="36" width="83" height="134" rx="25" fill="#dbe3f2"/><path d="M252 29V174" stroke="#98a7bd" stroke-width="2" stroke-dasharray="6 5"/>';
    out+=arrow(321,150,321,48,'#7c8ba4');
    out+=line(104,38,104,166,GRID,3,dashed)+tire(104,104,36,124,frame.toe*gain);
    out+=line(126,104,226,104,'#9caec9',5)+dot(104,104,BLUE);
    // Front view: the left wheel appears to the right of the vehicle centre.
    out+='<path d="M44 312V253Q44 242 55 242H127L168 281V312Z" fill="#dbe3f2"/><path d="M40 362H323" stroke="#78869c" stroke-width="4"/>';
    out+=line(247,226,247,362,GRID,3,dashed)+tire(247,294,40,128,frame.camber*gain)+line(144,294,247,294,'#9caec9',5)+dot(247,294,BLUE);
    out+=arrow(303,294,303,294-frame.jounce*1.4,BLUE);
    out+=arrow(247,378,247+frame.lateralForce*22,378,GOLD);
    return out;
  }
  function alignment(result,frame){
    const g=result.geometry,p=result.params,R=g.radius;
    let out='<rect x="10" y="8" width="340" height="220" rx="15" fill="#f3f6fc"/><rect x="10" y="238" width="340" height="220" rx="15" fill="#f3f6fc"/><rect x="10" y="468" width="340" height="170" rx="15" fill="#f3f6fc"/>';
    // Front projection: y points outward to screen right. Tire plane uses the computed normal.
    const front=(y,z)=>[208+y*.24,207-z*.24];
    const wheelCenter=front(0,R),frontLow=front(-p.offset+(-R)*g.axisY/g.axisZ,0),frontHigh=front(-p.offset+R*g.axisY/g.axisZ,2*R);
    out+=line(30,207,333,207,'#78869c',3)+line(...front(0,0),...front(0,2*R),GRID,2,dashed);
    const frontCamber=Math.atan2(-frame.normalZ,frame.normalY)*DEG;
    out+=tire(...wheelCenter,39,158.4,frontCamber)+line(...frontLow,...frontHigh,GOLD,4)+dot(...frontLow,GOLD,6)+dot(...front(0,0),BLUE,6);
    out+=line(frontLow[0],217,208,217,GOLD,3);
    // Side projection: x points forward to screen right; axis passes through (-offset y, R).
    const side=(x,z)=>[169+x*.24,437-z*.24],sideLow=side(g.groundX,0),sideHigh=side(R*g.axisX/g.axisZ,2*R),sideCenter=side(0,R);
    out+=line(30,437,333,437,'#78869c',3)+`<ellipse cx="${sideCenter[0]}" cy="${sideCenter[1]}" rx="${R*.24}" ry="${R*.24}" fill="none" stroke="#26334d" stroke-width="14"/>`;
    out+=line(...sideLow,...sideHigh,GOLD,4)+line(...side(0,0),...side(0,2*R),GRID,2,dashed)+dot(...sideLow,GOLD,6)+dot(...side(0,0),BLUE,6)+line(169,448,sideLow[0],448,GOLD,3)+arrow(280,264,320,264,'#7c8ba4');
    // Top view: x is up, y is left. Actual heading comes from the rotated normal.
    out+=line(173,488,173,620,GRID,2,dashed)+tire(173,552,41,112,-frame.heading*DEG)+dot(173,552,BLUE,5)+arrow(291,603,291,497,'#7c8ba4');
    out+=dot(173-g.groundY*.35,552-g.groundX*.35,GOLD,6)+line(173,552,173-g.groundY*.35,552-g.groundX*.35,GOLD,2,dashed);
    return out;
  }
  function cornering(result,frame,bounds){
    const pad=22,width=336,height=215,dx=bounds.maxX-bounds.minX,dy=bounds.maxY-bounds.minY,unit=Math.min((width-2*pad)/(dx+1),(height-2*pad)/(dy+1));
    const map=s=>[pad+(s.x-bounds.minX)*unit,235-pad-(s.y-bounds.minY)*unit];
    let out='<rect x="10" y="10" width="340" height="235" rx="15" fill="#f3f6fc"/><rect x="10" y="257" width="340" height="243" rx="15" fill="#f3f6fc"/>';
    for(let x=32;x<340;x+=42)out+=line(x,26,x,226,'#e2e8f2',1);
    for(let y=26;y<226;y+=40)out+=line(25,y,333,y,'#e2e8f2',1);
    out+=`<path d="${result.samples.map((s,i)=>`${i?'L':'M'}${map(s).join(' ')}`).join(' ')}" fill="none" stroke="#aebbe8" stroke-width="3" stroke-dasharray="6 4"/>`;
    const point=map(frame);
    out+=`<g transform="translate(${point[0]} ${point[1]}) rotate(${-frame.yaw*DEG})"><path d="M-13 -7H10L17 0L10 7H-13Z" fill="${BLUE}" stroke="#fff" stroke-width="2"/></g>`;
    out+=arrow(...point,point[0]+27*Math.cos(frame.yaw+Math.atan(frame.beta)),point[1]-27*Math.sin(frame.yaw+Math.atan(frame.beta)),GOLD,2);
    // The enlarged CG inset preserves calculated angles; force arrows share one N-to-pixel scale.
    const {a,b}=result.geometry,px=43,front=a*px,rear=-b*px,forceScale=70/bounds.force;
    out+=`<g transform="translate(178 379) rotate(${-frame.yaw*DEG})"><rect x="${rear-21}" y="-35" width="${front-rear+48}" height="70" rx="18" fill="${BLUE}" stroke="#2d40ad" stroke-width="3"/><rect x="${front-19}" y="-26" width="22" height="52" rx="6" fill="#dff3ec"/>`;
    out+=line(rear,-46,rear,46,'#9eafc7',3)+line(front,-46,front,46,'#9eafc7',3);
    for(const y of [-42,42])out+=tire(rear,y,16,30,90)+tire(front,y,16,30,90-frame.delta*DEG);
    out+=arrow(front,0,front,-frame.frontForce*forceScale,GOLD,4)+arrow(rear,0,rear,-frame.rearForce*forceScale,GOLD,4);
    out+=arrow(0,0,88*Math.cos(Math.atan(frame.beta)),-88*Math.sin(Math.atan(frame.beta)),MINT,3)+dot(0,0,'#f5c84c',6);
    out+='</g>';
    const reference=Math.max(100,Math.round(bounds.force/2/100)*100);
    out+=line(30,484,30+reference*forceScale,484,GOLD,3);
    return out;
  }
  function render(result,frame,shared){
    const renderer={hardpoint,knc,alignment,cornering}[result.kind];
    return renderer?`<g data-advanced-scene="${result.kind}">${renderer(result,frame,shared)}</g>`:'';
  }
  function readings(scene,f){
    if(scene==='hardpoint')return [`볼 조인트 이동 ${num(f.jounce,1)} mm`,`캠버 ${num(f.camber)}°`,`킹핀 경사 ${num(f.kpi)}°`,`휠 중심 높이 ${num(f.wheelZ,1)} mm`];
    if(scene==='knc')return [`위: 토 ${num(f.toe)}°`,`아래: 캠버 ${num(f.camber)}°`,`토 K ${num(f.toeK)}° / C ${num(f.toeC)}°`,`범프 ${num(f.jounce,1)} mm · 횡력 ${num(f.lateralForce,1)} kN`];
    if(scene==='alignment')return [`캠버 ${num(f.camber)}°`,`실제 조향 ${num(f.heading*DEG)}°`,`스크럽 ${num(f.scrub,1)} mm`,`트레일 ${num(f.trail,1)} mm`];
    if(scene==='cornering')return [`요 ${num(f.yawRate*DEG)}°/s · β ${num(f.beta*DEG)}°`,`앞 슬립 ${num(f.alphaF*DEG)}°`,`뒤 슬립 ${num(f.alphaR*DEG)}°`,`앞/뒤 횡력 ${num(f.frontForce/1000)} / ${num(f.rearForce/1000)} kN`];
    return [];
  }
  function scaleNote(scene,shared){
    if(scene==='hardpoint')return '정면 투영 · 초록 점은 차체 피벗, 노란 선은 업라이트 · 링크 좌표와 각도는 같은 축척, 타이어 윤곽은 자세 표시입니다.';
    if(scene==='knc')return '위는 토의 평면도, 아래는 캠버의 정면도 · 작은 차이를 보도록 토·캠버 각도만 양쪽 모두 8배 확대했습니다. 숫자는 실제 계산각입니다. 파란 화살표는 범프, 노란 화살표는 횡력입니다.';
    if(scene==='alignment')return '위부터 정면·측면·평면 · 노란 선은 조향축, 노란 점은 정적 지면 교점, 파란 점은 기준 접지점입니다. 측면 원은 직진 기준 바퀴, 아래는 실제 조향 방향입니다.';
    if(scene==='cornering')return `위는 같은 m 축척의 CG 궤적, 아래는 확대된 차체와 횡력 · 위의 차량 아이콘은 식별용 확대입니다. 노란 횡력 화살표는 양쪽 공통 최대 ${num(shared.force/1000,2)} kN → 70 그림 단위입니다. 각도 확대 없음.`;
    return '';
  }
  const api={handles:scene=>IDS.includes(scene),scale,render,readings,viewBox:scene=>({hardpoint:'0 0 370 365',knc:'0 0 360 400',alignment:'0 0 360 650',cornering:'0 0 360 510'})[scene]||'0 0 360 400',scaleNote};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AdvancedVisuals=api;
})(typeof window!=='undefined'?window:globalThis);
