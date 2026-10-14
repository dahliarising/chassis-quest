/* Residents bring one symptom; the workbench connects a setting to a measured model. */
(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)).toLocaleString('ko-KR') : '—';
  const colors = {toe:'#bd7544',camber:'#648db0',damper:'#9c729d'};
  function portrait(id) {
    const color = colors[id], prop = id === 'toe' ? '<path d="M63 73q9-15 18 0v12H63Z" fill="#e6b95e"/><path d="m66 72 3 6m4-7 3 6" stroke="#9c703b" stroke-width="2"/>' : id === 'camber' ? '<rect x="57" y="69" width="25" height="18" rx="4" fill="#354e50"/><circle cx="70" cy="78" r="6" fill="#b5d7dc"/>' : '<path d="m67 88 5-23m-5 15-6-7m9 0 8-5" stroke="#43805a" stroke-width="3"/><circle cx="73" cy="62" r="8" fill="#df8069"/><circle cx="61" cy="70" r="6" fill="#e4bc5c"/>';
    return `<svg viewBox="0 0 100 108" aria-hidden="true"><circle cx="50" cy="51" r="46" fill="#f1e6ce"/><path d="M20 103V81q2-25 30-25t30 25v22" fill="${color}"/><path d="M39 65v-9h22v9q-11 13-22 0" fill="#e0ac86"/><ellipse cx="50" cy="37" rx="23" ry="27" fill="#f1c9a4"/><path d="M27 38V28q0-23 25-22 27 0 23 31l-9-17q-13 14-39 18" fill="#514a3d"/><circle cx="41" cy="39" r="2.4" fill="#354e50"/><circle cx="59" cy="39" r="2.4" fill="#354e50"/><path d="M44 50q6 5 12 0" fill="none" stroke="#9b614b" stroke-width="2" stroke-linecap="round"/>${prop}</svg>`;
  }
  function growthPicture(level) {
    return `<svg viewBox="0 0 400 130" role="img" aria-label="${level}단계 정비소 성장"><path d="M0 118h400" stroke="#9bbb83" stroke-width="20"/><rect x="97" y="50" width="158" height="65" rx="4" fill="#fff7e5"/><path d="m83 52 94-43 94 43Z" fill="#df8069"/><rect x="111" y="70" width="57" height="45" fill="#80b6be"/><rect x="182" y="70" width="57" height="45" fill="#80b6be"/><circle cx="177" cy="29" r="14" fill="none" stroke="#354e50" stroke-width="9"/>${level>=1?'<rect x="112" y="51" width="125" height="15" rx="3" fill="#43805a"/><text x="174" y="62" text-anchor="middle" fill="white" font-size="9">우리 동네 정비소</text><path d="m269 84 10 24m-14-30 9 2 4 9-7 5-8-9Z" fill="#6a8588"/>':''}${level>=2?'<path d="M25 91h48m-48 8h48m-42 0v16m35-16v16" stroke="#aa8054" stroke-width="6"/><path d="M304 116V78m35 38V66" stroke="#6f9f70" stroke-width="5"/><circle cx="304" cy="72" r="16" fill="#9bbb83"/><circle cx="339" cy="62" r="23" fill="#9bbb83"/>':''}${level>=3?'<path d="M46 22q155 42 312 0" fill="none" stroke="#43805a" stroke-width="2"/><path d="m65 27 10 21 12-15m34 5 10 21 12-18m40 2 10 21 12-21m44-1 10 20 12-23m38-6 10 18 12-24" fill="#e4bc5c"/><text x="364" y="109" font-size="25">✿</text>':''}</svg>`;
  }
  function scenePicture(id, snapshot, time, label) {
    const t = time * 4, color = label === '의뢰 당시' ? '#b96553' : '#367d70';
    let drawing = '', note = '';
    if (id === 'toe') {
      const angle = snapshot.perWheelToe * 22;
      drawing = `<path d="M88 8v200M192 8v200" stroke="#dedbc9" stroke-width="3" stroke-dasharray="14 12" stroke-dashoffset="${t*38}"/><rect x="105" y="37" width="70" height="130" rx="25" fill="${color}"/><rect x="115" y="65" width="50" height="40" rx="10" fill="#c6e1df"/>${[-1,1].map(side=>`<g transform="translate(${140+side*43} 65) rotate(${-side*angle})"><rect x="-7" y="-21" width="14" height="42" rx="5" fill="#354e50"/><path d="M0-32v-18m-4 5 4-5 4 5" stroke="${color}" fill="none" stroke-width="2"/></g><rect x="${140+side*43-7}" y="130" width="14" height="33" rx="5" fill="#354e50"/>`).join('')}<path d="M140 28V10m-5 6 5-6 5 6" stroke="#43805a" stroke-width="3" fill="none"/>`;
      note = '위에서 보기 · 바퀴 각도 22배 확대';
    } else if (id === 'camber') {
      const loaded = Math.min(1, time * 4), angle = (snapshot.camberDeg + (snapshot.rollDeg + snapshot.camberGain * snapshot.jounce) * loaded) * 12;
      drawing = `<path d="M25 173h230" stroke="#8c9b89" stroke-width="4"/><path d="M202 55v118" stroke="#9bbb83" stroke-dasharray="5 5"/><g transform="rotate(${snapshot.rollDeg*loaded*3} 140 115)"><rect x="62" y="85" width="161" height="56" rx="17" fill="${color}"/><path d="m91 87 18-33h61l23 33" fill="#c6e1df" stroke="${color}" stroke-width="8"/></g><rect x="64" y="119" width="24" height="53" rx="8" fill="#354e50"/><g transform="rotate(${angle} 202 146)"><rect x="189" y="115" width="26" height="59" rx="8" fill="#354e50"/><path d="M202 100v82" stroke="${color}" stroke-width="3"/></g><text x="200" y="200" text-anchor="middle" fill="#46655a" font-size="12">바깥 바퀴 ${fmt(snapshot.camberDeg + (snapshot.rollDeg + snapshot.camberGain * snapshot.jounce) * loaded)}°</text>`;
      note = '정면 · 고정 코너 조건 · 캠버 12배 확대';
    } else {
      const samples = snapshot.samples, sample = samples[Math.min(samples.length - 1, Math.round(time * (samples.length - 1)))], y = sample.body * 1700;
      const trace = samples.filter((_,i)=>i%5===0).map((s,i)=>`${i?'L':'M'}${25+s.t/4*230} ${198-s.body*700}`).join(' ');
      drawing = `<path d="M25 165h230" stroke="#8c9b89" stroke-width="4"/><circle cx="83" cy="146" r="18" fill="#354e50"/><circle cx="201" cy="146" r="18" fill="#354e50"/><path d="m84 ${109-y} -8 8 16 8-16 8 8 8m117 ${109-y}v24" fill="none" stroke="#43805a" stroke-width="3"/><g transform="translate(0 ${-y})"><rect x="49" y="74" width="185" height="51" rx="16" fill="${color}"/><path d="m82 75 19-30h72l31 30" fill="#c6e1df" stroke="${color}" stroke-width="7"/></g><path d="M25 198h230" stroke="#d6ddce"/><path d="${trace}" stroke="${color}" stroke-width="2" fill="none"/><circle cx="${25+time*230}" cy="${198-sample.body*700}" r="4" fill="${color}"/>`;
      note = '20 mm 들어 놓기 · 변위 확대 · 4초 응답';
    }
    return `<figure><figcaption>${label} <b>${fmt(snapshot.value)}${id==='damper'?' N·s/m':'°'}</b></figcaption><svg viewBox="0 0 280 220" role="img" aria-label="${label} ${id} 움직임 비교">${drawing}</svg><small>${note}</small></figure>`;
  }
  function mount(host, options = {}) {
    const M = window.VillageMissions, abort = new AbortController(), media = matchMedia('(prefers-reduced-motion: reduce)');
    let progress = M.normalizeProgress(options.progress), current = null, stage = 'board', value = 0, result = null;
    let visible = false, feedback = '', savedNote = '', earned = false, time = 0, playing = false, runMode = '', raf = 0, last = 0, disposed = false;
    host.classList.add('village-workshop'); host.hidden = true; host.setAttribute('aria-label','주민 정비 의뢰'); host.setAttribute('role','region');
    const $ = selector => host.querySelector(selector);
    const listen = (el,event,fn) => el.addEventListener(event,fn,{signal:abort.signal});
    function stop() { cancelAnimationFrame(raf); raf=0; last=0; playing=false; }
    function headingFocus() { $('h2')?.focus({preventScroll:true}); host.scrollTop=0; }
    function header(title, subtitle) { return `<header class="vw-heading"><div><small>${esc(subtitle)}</small><h2 tabindex="-1">${esc(title)}</h2></div><button data-village-action="close" aria-label="의뢰를 닫고 마을로">×</button></header>`; }
    function growthLine() { return `<div class="vw-growth"><div>${growthPicture(progress.level)}</div><section><span>구름 정비소 · 성장 ${progress.level} / 3</span><h3>${esc(M.getGrowth(progress).title)}</h3><p>${esc(M.getGrowth(progress).description)}</p><div class="vw-stamps" aria-label="해결한 의뢰 ${progress.completed.length}개">${M.missions.map(m=>`<span class="${progress.completed.includes(m.id)?'earned':''}">${progress.completed.includes(m.id)?'✓':'○'} ${esc(m.id==='toe'?'Toe':m.id==='camber'?'Camber':'댐퍼')}</span>`).join('')}</div><small>재료 ${progress.materials} · 주민 신뢰 ${progress.trust} · 첫 해결 때 자동 성장</small></section></div>`; }
    function renderBoard() {
      host.innerHTML=header('오늘도, 잘 부탁해요!','주민 의뢰 게시판')+growthLine()+`<div class="vw-residents">${M.missions.map(m=>{const done=progress.completed.includes(m.id),record=progress.records[m.id];return `<article><div class="vw-resident"><div class="vw-portrait">${portrait(m.id)}</div><div><small>${esc(m.resident.job)}</small><h3>${esc(m.resident.name)}</h3><span>${done?'수리 완료':record?.needsReview?'다시 살펴볼 의뢰':'새 의뢰'}</span></div></div><h4>${esc(m.title)}</h4><p>“${esc(m.resident.line)}”</p><button class="vw-primary" data-village-id="${m.id}">${done?'다시 실습하기':'의뢰 살펴보기'}</button>${record?.attempts?`<small>예측 ${record.attempts}회 · 헷갈린 답 ${record.wrong}회</small>`:'<small>증상 → 예측 → 조정 → 시승</small>'}</article>`;}).join('')}</div><p class="vw-footnote">교육용 조건에서 원리를 연습합니다. 실제 차량의 정렬·댐퍼 규격은 차종과 사용 조건에 따라 달라요. 기록은 이 브라우저에 저장되며 기본 학습의 성장 기록에서 백업할 수 있어요.</p>`;
    }
    function theory() { const t=current.theory;return `<details class="vw-theory"><summary>정의·공식·시험 조건 펼치기</summary><dl>${t.definitions.map(d=>`<dt>${esc(d.term)}</dt><dd>${esc(d.text)}</dd>`).join('')}</dl><code>${esc(t.formula)}</code><p>${esc(t.why)}</p><ul>${t.assumptions.map(a=>`<li>${esc(a)}</li>`).join('')}</ul><a href="${esc(t.source.url)}" target="_blank" rel="noopener noreferrer">${esc(t.source.title)} ↗</a></details>`; }
    function diagrams() { return scenePicture(current.id,result.baseline,time,'의뢰 당시')+scenePicture(current.id,result.after,time,'내 세팅'); }
    function metrics() { return result.after.metrics.map((metric,i)=>`<div><span>${esc(metric.label)}</span><strong>${fmt(result.baseline.metrics[i].value)} <i>→</i> ${fmt(metric.value)} <small>${esc(metric.unit)}</small></strong></div>`).join(''); }
    function renderMission() {
      const m=current, predict=stage==='predict', done=stage==='done', testing=stage==='testing', observe=stage==='observe';
      result=M.evaluate(m.id,value);
      host.innerHTML=header(done?'덕분에 다시 달릴 수 있어요!':m.title,`${m.resident.name}의 의뢰 · ${predict?'먼저 예측':done?'해결 완료':'정비 작업대'}`)+`<div class="vw-client"><div class="vw-portrait">${portrait(m.id)}</div><p><b>${esc(m.resident.name)}</b> “${esc(done?m.resident.thankyou:m.resident.line)}”</p><button data-village-action="board">의뢰 목록</button></div>${predict?`<div class="vw-predict"><div class="vw-diagrams">${scenePicture(m.id,result.baseline,1,'의뢰 당시')}</div><section><span class="vw-step">손대기 전에, 원인부터</span><h3>${esc(m.prediction.question)}</h3><div class="vw-choices">${m.prediction.options.map(o=>`<button data-village-choice="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div><p>답을 고르면 전후 그림과 조정 도구가 열려요.</p></section></div>`:`<div class="vw-bench"><section class="vw-comparison"><div class="vw-diagrams">${diagrams()}</div><div class="vw-playback"><button data-village-action="replay" ${testing?'disabled':''}>${testing?'재생 중…':'전후 움직임 다시 보기'}</button><label>같은 시간 <output data-village-time>${fmt(time*4,1)}초</output><input type="range" min="0" max="1" step="0.005" value="${time}" data-village-time-slider aria-label="주민 의뢰 비교 재생 위치" ${testing?'disabled':''}></label></div><div class="vw-metrics">${metrics()}</div><p class="vw-model-note">${m.id==='damper'?'그림은 차체 자유감쇠 시험입니다. 충격 지표는 별도의 같은 범프 통과 모델로 확인해요.':'두 그림은 동일한 조건입니다. 바퀴 각도는 변화를 보기 쉽게 확대했어요.'}</p></section><section class="vw-adjust"><p class="vw-feedback" role="status">${esc(feedback)}</p>${observe?`<p class="vw-goal">${esc(m.goal)}</p><button class="vw-primary" data-village-action="tune">직접 세팅해 보기</button><p class="vw-model-note">지금은 제안한 값의 비교예요. 원래 세팅에서 직접 조정하며 목표를 맞춰보세요.</p>`:done?`<div class="vw-reward">${growthPicture(progress.level)}<h3>${esc(earned?'마을이 한 단계 자랐어요!':'다시 한번, 수리 성공!')}</h3><p>${esc(M.getGrowth(progress).title)}</p><small>${earned?'재료와 주민 신뢰를 받고 시설이 늘어났어요.':'복습 완료! 첫 해결 보상은 이미 받았어요.'}</small></div><button class="vw-primary" data-village-action="village">마을에서 변화 확인</button><button data-village-action="board">다음 주민 만나기</button>`:`<p class="vw-goal">${esc(m.goal)}</p><label class="vw-setting">${esc(m.control.label)}<output data-village-value>${fmt(value)} ${esc(m.control.unit)}</output><input data-village-setting aria-label="${esc(m.control.label)}" type="range" min="${m.control.min}" max="${m.control.max}" step="${m.control.step}" value="${value}" ${testing?'disabled':''}><small>${fmt(m.control.min)} ~ ${fmt(m.control.max)} ${esc(m.control.unit)} · 의뢰 당시 ${fmt(m.control.initial)}</small></label><div class="vw-adjust-buttons"><button data-village-action="less" ${testing?'disabled':''}>− ${m.control.step}</button><button data-village-action="reset" ${testing?'disabled':''}>원래 세팅</button><button data-village-action="more" ${testing?'disabled':''}>+ ${m.control.step}</button></div><button class="vw-primary" data-village-action="${testing?'finish':'test'}">${testing?'결과 바로 확인':'시승하고 판정하기'}</button>`}<div class="vw-reason"><h3>왜 이렇게 달라질까요?</h3><p data-village-reason>${esc(result.explanation)}</p><p data-village-diagnosis>${esc(result.diagnosis)}</p></div><small class="vw-save-note">${esc(savedNote)}</small>${theory()}</section></div>`}`;
    }
    function render() { stop(); if(stage==='board')renderBoard();else renderMission(); }
    function select(id) { const m=M.getMission(id);if(!m)return;current=m;stage='predict';value=m.control.initial;time=0;feedback='';savedNote='';earned=false;render();headingFocus(); }
    function updateDrawing() { const panel=$('.vw-comparison .vw-diagrams');if(panel)panel.innerHTML=diagrams();const output=$('[data-village-time]');if(output)output.textContent=`${fmt(time*4,1)}초`;const slider=$('[data-village-time-slider]');if(slider)slider.value=time; }
    function change(valueNext) { if(!['tune','result'].includes(stage))return;stop();if(stage==='result'){stage='tune';feedback='세팅을 바꿨어요. 다시 시승해서 두 지표와 목표를 확인해보세요.';$('.vw-feedback').textContent=feedback;}const c=current.control;value=Math.min(c.max,Math.max(c.min,Math.round(valueNext/c.step)*c.step));result=M.evaluate(current.id,value);time=1;$('[data-village-setting]').value=value;$('[data-village-value]').textContent=`${fmt(value)} ${c.unit}`;updateDrawing();$('.vw-metrics').innerHTML=metrics();$('[data-village-reason]').textContent=result.explanation;$('[data-village-diagnosis]').textContent=result.diagnosis; }
    function finish() {
      if(stage!=='testing')return;stop();time=1;result=M.evaluate(current.id,value);
      if(result.success){
        try{const response=options.onComplete({id:current.id,value});progress=M.normalizeProgress(response.progress);earned=response.rewarded;stage='done';feedback='조건을 확인하고, 세팅으로 증상을 해결했어요.';savedNote=response.saved?'마을 성장과 의뢰 기록을 저장했어요.':'현재 브라우저에 저장하지 못했어요. 기본 학습의 성장 기록에서 백업해 주세요.';}
        catch(_){stage='result';feedback='시승은 통과했지만 완료 기록을 반영하지 못했어요. 다시 판정해 주세요.';}
      }else{stage='result';feedback=`아직 해결되지 않았어요. ${result.diagnosis}`;}
      render();headingFocus();
    }
    function play(mode) {
      stop();time=0;runMode=mode;playing=true;
      if(media.matches){time=1;playing=false;updateDrawing();if(mode==='test')finish();return;}
      const tick=now=>{if(disposed||!visible||document.hidden){raf=0;last=0;return;}if(last)time=Math.min(1,time+(now-last)/4000);last=now;updateDrawing();if(time>=1){playing=false;raf=0;if(runMode==='test')finish();return;}raf=requestAnimationFrame(tick);};
      raf=requestAnimationFrame(tick);
    }
    listen(host,'click',event=>{
      const b=event.target.closest('button');if(!b||b.disabled)return;
      if(b.dataset.villageId){select(b.dataset.villageId);return;}
      if(b.dataset.villageChoice&&stage==='predict'){
        try{const response=options.onPrediction({id:current.id,choiceId:b.dataset.villageChoice});progress=M.normalizeProgress(response.progress);feedback=`${response.correct?'예측 성공!':'함께 짚어봐요.'} ${response.explanation}`;savedNote=response.saved?(response.correct?'예측을 기록했어요.':'헷갈린 개념을 오답 정비소에 저장했어요.'):'임시 기록입니다. 기본 학습의 성장 기록에서 백업해 주세요.';}
        catch(_){feedback='예측 기록을 반영하지 못했어요. 의뢰를 다시 열어 주세요.';renderMission();return;}
        value=current.control.target;stage='observe';time=0;render();headingFocus();play('replay');return;
      }
      const action=b.dataset.villageAction;
      if(action==='close'||action==='village'){stop();options.onClose?.({growth:action==='village'});}
      else if(action==='board'){stage='board';render();headingFocus();}
      else if(action==='tune'){value=current.control.initial;stage='tune';time=1;render();headingFocus();}
      else if(action==='less')change(value-current.control.step);
      else if(action==='more')change(value+current.control.step);
      else if(action==='reset')change(current.control.initial);
      else if(action==='test'&&['tune','result'].includes(stage)){stage='testing';time=0;render();play('test');}
      else if(action==='finish')finish();
      else if(action==='replay'&&stage!=='testing')play('replay');
    });
    listen(host,'input',event=>{if(event.target.hasAttribute('data-village-setting'))change(Number(event.target.value));if(event.target.hasAttribute('data-village-time-slider')){stop();time=Number(event.target.value);updateDrawing();}});
    listen(media,'change',()=>{if(media.matches&&playing){stop();time=1;updateDrawing();if(stage==='testing')finish();}});
    listen(document,'visibilitychange',()=>{if(document.hidden){stop();if(stage==='testing'){stage='tune';render();}}});
    return {
      open(id){visible=true;host.hidden=false;if(id)select(id);else {render();headingFocus();}},
      setVisible(next){visible=next;host.hidden=!next;if(!next){stop();if(stage==='testing')stage='tune';}else render();},
      dispose(){disposed=true;stop();abort.abort();host.remove();}
    };
  }
  window.VillageWorkshop={mount};
})();
