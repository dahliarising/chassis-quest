/* The world is a short experiment loop; existing lessons and records stay in the learning centre. */
(function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const places=[['cornering','◉','코너링 서킷','첫 번째 현장 임무'],['bump','≋','라이드 로드','범프·댐퍼 실습'],['geometry','⌁','지오메트리 랩','하드포인트·K&C'],['garage','⌂','정비동','오답 정비소']];
  function mount(host,options={}){
    const M=window.WorldMission,media=window.matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController();
    let scene=null,disposed=false,entered=false,phase='',near=null,delta=1,lastResult=null,feedback='',saveMessage='',completed=Boolean(options.completed),overview=true;
    const keys=new Set(),pointers=new Map();
    const listen=(el,event,fn)=>el.addEventListener(event,fn,{signal:abort.signal});
    const reference=M.baseline(),fault=M.fault(),referencePath=M.path(reference,{duration:18});
    document.body.classList.add('world-active');
    host.innerHTML=`<section class="world-shell is-intro" aria-label="샤시 퀘스트 3D 시험장"><div class="world-canvas" data-world-canvas></div><header class="world-top"><a href="#" class="world-brand" data-world="home"><strong>샤시 퀘스트</strong><small>포뮬러 테스트 캠프</small></a><div class="world-top-actions"><span data-world-badge>${completed?'🏁 선회 반경 해결사':'현장 임무 0 / 1'}</span><button type="button" class="world-secondary" data-world="exit">학습센터</button></div></header><div class="world-loading" data-world-loading role="status">시험장을 준비하고 있어요…</div><section class="world-intro"><span class="world-tag">드라이버와 엔지니어, 한 팀으로</span><h1>머신을 깨우고.<br>한계를 배워요.</h1><p>서킷을 달리고, 피트에서 세팅하고.<br>당신의 판단으로 머신을 완성하세요.</p><div class="world-intro-actions"><button type="button" class="world-primary" data-world="start" disabled>서킷 들어가기</button><button type="button" class="world-secondary" data-world="mission" disabled>첫 테스트 시작</button></div><small>키보드 또는 화면 버튼으로 운전 · 로그인 없이 플레이</small></section><aside class="world-status"><small>피트에서 온 테스트 의뢰</small><h2>같은 핸들, 다른 코너</h2><p>피트에서 출발해 코너링 서킷으로 가보세요.</p><p class="world-radio" data-world-radio>피트: 머신 준비 완료. 서킷에 진입하세요.</p><button type="button" class="world-secondary" data-world="mission">현장으로 바로 이동</button></aside><details class="world-map"><summary class="world-map-title">⌖ 지도 · 장소 이동</summary><div class="world-map-list">${places.map(([id,symbol,label,note])=>`<button type="button" class="world-place" data-world-place="${id}" disabled><span>${symbol}</span><strong>${label}</strong><small>${note}</small></button>`).join('')}</div><button type="button" class="world-overview" data-world="overview">시험장 전체 보기</button></details><div class="world-legend" hidden><span><i class="baseline"></i>기준차</span><span><i class="after"></i>변경차</span><small>정상 원선회 · 50 km/h · 재생 3배속 · 차량 크기 확대</small></div><div class="world-near" hidden><span>도착했어요</span><strong data-world-location></strong><button type="button" class="world-primary" data-world="interact">실습 시작</button></div><div class="world-controls" aria-label="차량 운전 조작"><div class="world-steering"><button type="button" data-drive="left" aria-label="왼쪽으로 조향">◀</button><button type="button" data-drive="right" aria-label="오른쪽으로 조향">▶</button></div><div class="world-pedals"><button type="button" data-drive="brake" aria-label="브레이크">정지</button><button type="button" data-drive="boost" aria-label="부스터 가속">부스터</button><button type="button" data-drive="forward" aria-label="가속">가속 ↑</button></div></div><div class="world-boost"><label>부스터 <span data-world-boost-percent>100%</span></label><div class="world-boost-meter" role="progressbar" aria-label="부스터 에너지" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i data-world-charge style="width:100%"></i></div><small data-world-boost-state>누르고 가속 · Shift</small></div><div class="world-speed"><strong data-world-speed>0</strong><small>km/h</small><p class="world-drive-hint">WASD / 방향키 · Space 정지 · Shift 부스터 · E 실습</p></div><section class="world-mission" hidden aria-label="코너링 현장 임무"></section><p class="world-footer-note">자유 주행은 탐색용 · 현장 임무는 차량 모델로 계산</p></section>`;
    const $=s=>host.querySelector(s),shell=$('.world-shell'),card=$('.world-mission');
    if(options.notice){shell.classList.add('has-notice');const notice=document.createElement('p');notice.className='world-notice';notice.setAttribute('role','alert');notice.textContent=options.notice;shell.append(notice);}
    function frame(state){
      if(disposed)return;
      $('[data-world-speed]').textContent=String(Math.round(Math.abs(state.speed||0)));
      const charge=Math.round(Math.max(0,Math.min(1,state.boostEnergy??1))*100);
      $('[data-world-charge]').style.width=`${charge}%`;
      $('[data-world-boost-percent]').textContent=`${charge}%`;
      $('.world-boost-meter').setAttribute('aria-valuenow',String(charge));
      $('[data-world-boost-state]').textContent=state.boosting?'부스터 작동':charge<100?'재충전 중':'누르고 가속 · Shift';
      shell.classList.toggle('is-boosting',Boolean(state.boosting));
      const radio=state.boosting?'피트: 부스터 작동. 코너 앞에서는 먼저 감속하세요.':charge<100?'피트: 에너지 재충전 중. 코너 라인을 확인하세요.':'피트: 머신 준비 완료. 서킷에 진입하세요.';
      if($('[data-world-radio]').textContent!==radio)$('[data-world-radio]').textContent=radio;
      if(!phase&&entered&&near!==state.near){near=state.near;updateNear();}
      const scrub=$('[data-world-scrub]');if(scrub)scrub.value=String(state.progress||0);
      if(phase==='testing'&&state.mode==='experiment'&&state.progress>=.9999)finishAttempt();
    }
    function updateNear(){
      const place=places.find(p=>p[0]===near);$('.world-near').hidden=!place||!entered||Boolean(phase);
      if(place){$('[data-world-location]').textContent=place[2];$('[data-world="interact"]').textContent=near==='cornering'?'현장 임무 시작':near==='garage'?'오답 정비소 열기':'실습 시작';}
    }
    function clearInput(){keys.clear();pointers.clear();scene?.drive({throttle:0,steer:0,brake:true,boost:false});host.querySelectorAll('[data-drive]').forEach(b=>b.classList.remove('is-pressed'));}
    function sendInput(){
      if(!scene||!entered||phase)return;
      const held=new Set([...keys,...pointers.values()]);
      scene.drive({throttle:Number(held.has('forward')||held.has('boost'))-Number(held.has('backward')),steer:Number(held.has('left'))-Number(held.has('right')),brake:held.has('brake'),boost:held.has('boost')});
      host.querySelectorAll('[data-drive]').forEach(b=>b.classList.toggle('is-pressed',held.has(b.dataset.drive)));
    }
    function enter(){if(!scene)return;entered=true;shell.classList.remove('is-intro');overview=false;scene.setOverview(false);shell.tabIndex=-1;shell.focus({preventScroll:true});updateNear();}
    function travel(id){if(!scene)return;closeMission();enter();clearInput();scene.teleport(id);near=id;updateNear();$('.world-map').open=false;}
    function comparison(result,playing){
      scene?.showExperiment({beforePath:referencePath,afterPath:M.path(result,{duration:18}),playing:playing&&!media.matches});
      if(playing&&media.matches)scene?.setExperimentTime(1);
    }
    function beginMission(){
      if(!scene)return;enter();clearInput();scene.teleport('cornering');near='cornering';phase='predict';delta=1;feedback='';saveMessage='';lastResult=null;
      shell.classList.add('has-mission');card.hidden=false;$('.world-near').hidden=true;$('.world-legend').hidden=true;$('.world-map').open=false;
      renderMission();
    }
    function closeMission(){
      if(!phase)return;phase='';clearInput();scene?.clearExperiment();shell.classList.remove('has-mission');card.hidden=true;$('.world-legend').hidden=true;shell.focus({preventScroll:true});updateNear();
    }
    const explanation=`앞축 코너링 강성이 낮아지면 같은 횡력에 더 큰 슬립각이 필요합니다. 같은 정상 반경을 유지하려면 앞바퀴를 조금 더 꺾어야 해요.`;
    function theory(){return `<details><summary>왜 이런가요? 정의와 공식 보기</summary><p>코너링 강성 Cα는 작은 슬립각에서 횡력이 늘어나는 기울기입니다. 여기의 Cf는 앞축 좌우 타이어 합산값입니다.</p><code>Fy = Cα · α<br>r = vδ / (L + Kv²/g)<br>R = v/r</code><p>${explanation}</p><p>일정 50 km/h, 앞축 강성 80 → 60 kN/rad, 뒤축과 질량은 고정입니다. 과도 응답이 끝난 정상 선회만 비교합니다. 반경을 맞춰도 원래 타이어 특성 전체가 복원되는 것은 아닙니다.</p></details>`;}
    function renderMission(){
      const headings={predict:'피트 리포트: 앞타이어 변경',observe:'같은 핸들인데, 바깥으로.',tune:'엔지니어, 세팅을 조정하세요.',testing:'테스트 런. 라인을 확인하세요.',result:'조금만 더 다듬어볼까요?',done:'테스트 통과. 세팅 확보!'};
      let body='';
      if(phase==='predict')body=`<p>앞타이어의 코너링 강성이 낮아졌어요. 같은 속도, 같은 조향각으로 달리면 변경차는 어디로 갈까요?</p><div class="world-choices"><button type="button" data-world-answer="decrease">바깥으로 크게</button><button type="button" data-world-answer="increase">안쪽으로 작게</button><button type="button" data-world-answer="same">같은 궤적으로</button></div><small>선택하면 두 차가 함께 달립니다.</small>`;
      if(phase==='observe')body=`<p class="world-feedback">${esc(feedback)}</p><p>${explanation}</p><div class="world-mission-actions"><button type="button" class="world-primary" data-world="tune">직접 고쳐보기</button><button type="button" class="world-secondary" data-world="replay">한 번 더 보기</button></div><small>${esc(saveMessage)}</small>`;
      if(['tune','result'].includes(phase))body=`${phase==='result'?`<p class="world-feedback">${lastResult.direction==='wider'?'아직 코너 바깥입니다. 조향을 조금 더 주세요.':'기준보다 안쪽입니다. 조향을 조금 줄여보세요.'}</p><div class="world-result"><span>목표 반경과의 차이</span><strong>${lastResult.errorPercent.toFixed(1)}%</strong><small>3% 이내면 통과</small></div>`:'<p>청록색 기준 궤적을 따라가도록 앞바퀴 조향각을 조절해보세요. 속도와 타이어는 고정합니다.</p>'}<div class="world-tuning"><label for="world-delta">앞바퀴 조향각 <output id="world-angle">${delta.toFixed(2)}°</output></label><input id="world-delta" data-world-delta type="range" min="0.2" max="2" step="0.01" value="${delta}" aria-label="앞바퀴 조향각"/><div class="world-adjust"><button type="button" data-world="less">− 0.05°</button><span>처음 값 1.00°</span><button type="button" data-world="more">+ 0.05°</button></div></div><div class="world-mission-actions"><button type="button" class="world-primary" data-world="test">이 세팅으로 시승</button></div>`;
      if(phase==='testing')body=`<p>앞바퀴 ${delta.toFixed(2)}° · 두 차는 같은 속도로 달립니다.</p><div class="world-replay"><label for="world-time">두 차의 시간을 함께 움직이기</label><input id="world-time" type="range" data-world-scrub min="0" max="1" step="0.001" value="0" aria-label="시승 재생 위치"/></div><p>청록 궤적과 변경차의 선회 크기를 보세요.</p><div class="world-mission-actions"><button type="button" class="world-secondary" data-world="test-replay">처음부터 재생</button><button type="button" class="world-primary" data-world="test-result">결과 확인</button></div>`;
      if(phase==='done')body=`<div class="world-result"><span>목표 반경과의 차이</span><strong>${lastResult.errorPercent.toFixed(1)}%</strong><small>🏁 선회 반경 해결사</small></div><p>앞바퀴를 1.00° → <b>${delta.toFixed(2)}°</b>로 조정해 정상 반경을 맞췄어요.</p><p class="world-feedback">${esc(saveMessage)}</p><div class="world-mission-actions"><button type="button" class="world-primary" data-world="roam">시험장 더 둘러보기</button><button type="button" class="world-secondary" data-world="deep">코너링 더 알아보기</button></div>${theory()}`;
      card.innerHTML=`<header><span class="world-mission-step">${phase==='predict'?'예상':phase==='observe'?'관찰':phase==='done'?'해결':'조정'} · 현장 임무 01</span><button type="button" class="world-close" data-world="close" aria-label="임무를 닫고 시험장으로">×</button></header><h2 tabindex="-1">${headings[phase]||''}</h2>${body}`;
    }
    function choose(id){
      if(phase!=='predict')return;
      const grade=window.VehiclePrediction.grade(M.question(),id);
      feedback=grade.correct?'예측했어요. 변경차가 더 큰 원을 그립니다.':'변경차는 더 큰 원을 그립니다. 두 차의 경로가 벌어지는 곳을 보세요.';
      try{saveMessage=options.onPrediction?.({before:reference,after:fault,choiceId:id})||'';}catch(_){saveMessage='예측 기록을 저장하지 못했어요. 학습센터에서 백업을 확인하세요.';}
      phase='observe';$('.world-legend').hidden=false;renderMission();comparison(fault,true);
    }
    function changeDelta(value){
      if(!['tune','result'].includes(phase))return;
      delta=Math.round(Math.min(2,Math.max(.2,value))*100)/100;
      $('[data-world-delta]').value=String(delta);$('#world-angle').textContent=`${delta.toFixed(2)}°`;
    }
    function test(){if(!['tune','result'].includes(phase))return;lastResult=M.evaluate(delta);phase='testing';renderMission();comparison(lastResult.after,true);}
    function finishAttempt(){
      if(phase!=='testing')return;
      if(lastResult.success){
        try{saveMessage=options.onComplete?.(delta)||'임무 완료 기록을 저장했어요.';completed=true;$('[data-world-badge]').textContent='🏁 선회 반경 해결사';}
        catch(_){saveMessage='반경 보정에 성공했어요. 기록 저장은 학습센터에서 확인하세요.';}
        phase='done';
      }else phase='result';
      renderMission();
    }
    function interact(){
      if(!near||phase)return;
      if(near==='cornering')beginMission();
      else if(near==='garage')options.onReview?.();
      else options.onLab?.(near==='bump'?'ride':'hardpoint');
    }
    listen(host,'click',event=>{
      const button=event.target.closest('button,a');if(!button||button.disabled)return;
      if(button.dataset.worldPlace){travel(button.dataset.worldPlace);return;}
      if(button.dataset.worldAnswer){choose(button.dataset.worldAnswer);return;}
      const action=button.dataset.world;if(!action)return;event.preventDefault();
      if(action==='exit'||action==='home')options.onExit?.();
      else if(action==='start')enter();
      else if(action==='mission')beginMission();
      else if(action==='interact')interact();
      else if(action==='overview'){overview=!overview;scene?.setOverview(overview);}
      else if(action==='close'||action==='roam')closeMission();
      else if(action==='tune'){phase='tune';renderMission();scene?.setExperimentTime(1);}
      else if(action==='replay')comparison(fault,true);
      else if(action==='less')changeDelta(delta-.05);
      else if(action==='more')changeDelta(delta+.05);
      else if(action==='test')test();
      else if(action==='test-replay'&&phase==='testing')comparison(lastResult.after,true);
      else if(action==='test-result'&&phase==='testing')scene?.setExperimentTime(1);
      else if(action==='deep')options.onLab?.('cornering');
    });
    listen(host,'input',event=>{if(event.target.hasAttribute('data-world-delta'))changeDelta(Number(event.target.value));if(event.target.hasAttribute('data-world-scrub'))scene?.setExperimentTime(Number(event.target.value));});
    const mapping={w:'forward',ArrowUp:'forward',s:'backward',ArrowDown:'backward',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',' ':'brake',Shift:'boost'};
    listen(window,'keydown',event=>{
      if(!entered||phase||/INPUT|TEXTAREA|SELECT|BUTTON/.test(event.target.tagName))return;
      if(event.key.toLowerCase()==='e'){event.preventDefault();interact();return;}
      const control=mapping[event.key]||mapping[event.key.toLowerCase()];if(control){event.preventDefault();keys.add(control);sendInput();}
    });
    listen(window,'keyup',event=>{const control=mapping[event.key]||mapping[event.key.toLowerCase()];if(control){keys.delete(control);sendInput();}});
    host.querySelectorAll('[data-drive]').forEach(button=>{
      listen(button,'pointerdown',event=>{if(!entered||phase)return;event.preventDefault();button.setPointerCapture(event.pointerId);pointers.set(event.pointerId,button.dataset.drive);sendInput();});
      const release=event=>{pointers.delete(event.pointerId);sendInput();};listen(button,'pointerup',release);listen(button,'pointercancel',release);listen(button,'lostpointercapture',release);
    });
    listen(window,'blur',clearInput);
    listen(document,'visibilitychange',()=>{clearInput();scene?.setPaused(document.hidden);});
    listen(media,'change',()=>{if(media.matches&&phase)scene?.setExperimentTime(1);});
    import('./world-scene.js').then(module=>{
      if(disposed)return;
      scene=module.createWorld($('[data-world-canvas]'),{onFrame:frame,reducedMotion:media.matches,onError:()=>{if(!disposed){clearInput();const note=$('.world-footer-note');note.textContent='3D 화면이 중단됐어요. 학습센터에서 이어가거나 새로고침해 주세요.';note.classList.add('world-error');}}});
      if(scene.setShowcase)scene.setShowcase(true);else scene.setOverview(true);ready();
    }).catch(()=>{
      if(disposed)return;
      shell.classList.add('is-fallback');scene=flatFallback($('[data-world-canvas]'),frame);ready();
      $('.world-intro p').textContent='이 브라우저에서는 평면 시험장으로 열었어요. 장소를 선택하고 같은 코너링 임무를 플레이할 수 있습니다.';
    });
    function ready(){if(disposed){scene?.dispose();return;}$('[data-world-loading]').hidden=true;host.querySelectorAll('[data-world="start"],[data-world="mission"],[data-world-place]').forEach(b=>b.disabled=false);}
    return ()=>{disposed=true;abort.abort();clearInput();scene?.dispose();document.body.classList.remove('world-active');};
  }
  // Keep the mission playable when a browser cannot create a WebGL context.
  function flatFallback(container,onFrame){
    let paths=null,progress=0,playing=false,raf=0,last=0,paused=false,ended=false;
    container.innerHTML='<svg class="world-flat" viewBox="0 0 800 600" role="img" aria-label="평면 코너링 시험장"><rect width="800" height="600" fill="#12223c"/><path d="M80 440Q360 70 690 210" stroke="#18243c" stroke-width="80" fill="none"/><text x="400" y="300" text-anchor="middle" fill="white" font-size="24">장소를 골라 실습을 시작하세요</text></svg>';
    const svg=container.querySelector('svg');
    function draw(){
      if(!paths)return;
      const all=paths.flat(),maxX=Math.max(...all.map(p=>p.x)),maxY=Math.max(...all.map(p=>p.y)),scale=Math.min(620/Math.max(1,maxX),380/Math.max(1,maxY));
      const point=p=>[85+p.x*scale,480-p.y*scale];
      svg.innerHTML='<rect width="800" height="600" fill="#182c48"/>'+paths.map((path,i)=>{const p=path[Math.round(progress*(path.length-1))],xy=point(p);return `<path d="${path.map((s,j)=>`${j?'L':'M'}${point(s).join(' ')}`).join(' ')}" stroke="${i?'#ef4d5b':'#27d8e8'}" stroke-width="8" fill="none" ${i?'':'stroke-dasharray="12 8"'}/><g transform="translate(${xy.join(' ')}) rotate(${-p.yaw*180/Math.PI})"><rect x="-12" y="-6" width="24" height="12" rx="4" fill="${i?'#ef4d5b':'#27d8e8'}" stroke="#121b30" stroke-width="2"/><rect x="1" y="-4" width="5" height="8" fill="#121b30"/></g>`;}).join('');
      onFrame({mode:'experiment',progress,speed:50,near:null});
    }
    function tick(now){if(ended)return;if(playing&&!paused){if(last)progress=Math.min(1,progress+(now-last)/6000);if(progress>=1)playing=false;draw();}last=now;raf=requestAnimationFrame(tick);}
    raf=requestAnimationFrame(tick);
    return {drive(){},teleport(id){onFrame({speed:0,near:id,mode:'drive',progress:0});},setOverview(){},setPaused(v){paused=v;last=0;},showExperiment({beforePath,afterPath,playing:play}){paths=[beforePath,afterPath];progress=0;playing=play;last=0;draw();},setExperimentTime(value){progress=Math.max(0,Math.min(1,value));playing=false;draw();},clearExperiment(){playing=false;paths=null;},dispose(){ended=true;cancelAnimationFrame(raf);container.replaceChildren();}};
  }
  window.ChassisWorld={mount};
})();
