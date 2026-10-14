/* Interactive vehicle diagrams. Physics and learner progress remain separate. */
(function () {
  'use strict';
  const mounts = new WeakMap();
  let instance = 0;
  const BEFORE = '#16836e', AFTER = '#455bdb';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const n = (value, digits = 2) => finite(value).toLocaleString('ko-KR', { maximumFractionDigits: digits });
  const rad = value => finite(value) * 180 / Math.PI;
  const text = (x, y, value, cls = '', anchor = 'start') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;
  const path = (points, attrs = '') => `<path d="${points}" ${attrs}/>`;
  function spring(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy) || 1;
    let d = `M${x1},${y1} L${x1 + dx * .12},${y1 + dy * .12}`;
    for (let i = 1; i <= 10; i++) {
      const f = .12 + .76 * i / 11, offset = (i % 2 ? -1 : 1) * 10;
      d += ` L${x1 + dx * f - dy / length * offset},${y1 + dy * f + dx / length * offset}`;
    }
    return path(`${d} L${x1 + dx * .88},${y1 + dy * .88} L${x2},${y2}`, 'fill="none" stroke="#455bdb" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"');
  }
  function wheel(x, y, radius = 28, angle = 0) {
    return `<g transform="translate(${x} ${y})"><circle r="${radius}" fill="#26334d"/><circle r="${radius - 9}" fill="#e6ebf6"/><g transform="rotate(${angle})" stroke="#a9b5ca" stroke-width="3"><path d="M-${radius - 11} 0 H${radius - 11} M0 -${radius - 11} V${radius - 11}"/></g><circle r="5" fill="#fff"/></g>`;
  }
  function arrow(x1, y1, x2, y2, color = '#16836e') {
    const angle = Math.atan2(y2 - y1, x2 - x1), size = 7;
    return `<path d="M${x1} ${y1} L${x2} ${y2} M${x2 - size * Math.cos(angle - .5)} ${y2 - size * Math.sin(angle - .5)} L${x2} ${y2} L${x2 - size * Math.cos(angle + .5)} ${y2 - size * Math.sin(angle + .5)}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
  }
  function sideCar(x, y) {
    return `<g transform="translate(${x} ${y})"><path d="M-104 2 L-89 -30 L-53 -38 L-23 -72 Q-19 -77 -10 -77 H36 Q42 -77 48 -71 L73 -39 L109 -29 Q117 -25 118 -14 V9 H-105Z" fill="#455bdb" stroke="#2d40ad" stroke-width="3"/><path d="M-40 -41 L-17 -68 H30 L48 -41Z" fill="#dff3ec"/><path d="M-1 -67 V-41" stroke="#455bdb" stroke-width="4"/><rect x="89" y="-24" width="24" height="9" rx="4" fill="#f5c84c"/><path d="M-72 -22 H63" stroke="#8191ee" stroke-width="3"/><rect x="8" y="-30" width="12" height="4" rx="2" fill="#d4dcff"/></g>`;
  }
  function sharedScale(before, after, scene) {
    const samples = [...before.samples, ...after.samples];
    if (scene === 'steer') {
      const xs = samples.map(s => finite(s.x)), ys = samples.map(s => finite(s.y));
      return { minX: Math.min(0, ...xs), maxX: Math.max(1, ...xs), minY: Math.min(0, ...ys), maxY: Math.max(1, ...ys), L: Math.max(before.params.L, after.params.L) };
    }
    const motion = Math.max(.001, ...samples.flatMap(s => [Math.abs(finite(s.body)), Math.abs(finite(s.wheel)), Math.abs(finite(s.road)), Math.abs(finite(s.body) - finite(s.wheel))]));
    return { motion: Math.min(700, 46 / motion), force: Math.max(1, ...samples.map(s => Math.abs(finite(s.force)))), load: 80 / Math.max(1, ...samples.flatMap(s => [finite(s.frontLoad), finite(s.rearLoad)])) };
  }
  function quarterScene(result, frame, scene, scale) {
    const by = 105 - finite(frame.body) * scale.motion, wy = 220 - finite(frame.wheel) * scale.motion, ry = 250 - finite(frame.road) * scale.motion;
    const yTop = by + 35, yBottom = wy - 14;
    let out = '<path d="M170 250 H495" stroke="#c9d3e4" stroke-width="2" stroke-dasharray="5 6"/>';
    out += `<path d="M170 ${ry} H495" stroke="#69768d" stroke-width="5" stroke-linecap="round"/>`;
    for (let x = 185; x < 495; x += 30) out += `<path d="M${x} ${ry + 7} l-10 12" stroke="#c9d3e4" stroke-width="2"/>`;
    out += `<path d="M198 ${by + 34} V${by - 34} Q198 ${by - 43} 212 ${by - 43} H283 L330 ${by - 4} L454 ${by + 7} Q471 ${by + 9} 471 ${by + 23} V${by + 38} H198Z" fill="#455bdb" stroke="#2d40ad" stroke-width="3"/>`;
    out += `<path d="M218 ${by - 33} H275 L313 ${by - 3} H218Z" fill="#dff3ec"/><path d="M202 ${by - 39} V${by + 36}" stroke="#f6f8fc" stroke-width="4" stroke-dasharray="6 5"/><rect x="438" y="${by + 15}" width="28" height="9" rx="4" fill="#f5c84c"/>`;
    out += spring(317, yTop, 317, yBottom);
    out += `<path d="M365 ${yTop} V${yBottom}" stroke="#16836e" stroke-width="5"/><rect x="356" y="${yTop + (yBottom - yTop) * .38}" width="18" height="${Math.max(12, (yBottom - yTop) * .38)}" rx="4" fill="#c3e8dc" stroke="#16836e" stroke-width="3"/>`;
    out += `<path d="M305 ${yBottom} H375" stroke="#7b89a1" stroke-width="5"/>${wheel(342, wy)}`;
    if (scene === 'resonance') {
      const force = finite(frame.force), len = Math.abs(force) / scale.force * 45;
      if (len > 1) out += arrow(401, by - 23, 401, by - 23 - Math.sign(force) * len, '#be7c12');
    }
    out += '<path d="M388 290 H416 M388 285 V295 M416 285 V295" stroke="#607496" stroke-width="2"/>';
    return out;
  }
  function steerScene(result, frame, bounds) {
    const L = result.params.L, track = result.params.t;
    const scale = Math.min(420 / (bounds.maxX - bounds.minX + bounds.L + 2), 270 / (bounds.maxY - bounds.minY + bounds.L + 3));
    const map = s => [25 + (finite(s.x) - bounds.minX + 1) * scale, 295 - (finite(s.y) - bounds.minY + 1.2) * scale];
    const xy = map(frame), angle = -rad(frame.yaw);
    let out = '';
    for (let x = 20; x < 470; x += 40) out += `<path d="M${x} 15 V300" stroke="#e2e8f2"/>`;
    for (let y = 20; y < 310; y += 40) out += `<path d="M20 ${y} H470" stroke="#e2e8f2"/>`;
    out += path(result.samples.map((s, i) => `${i ? 'L' : 'M'}${map(s).join(',')}`).join(' '), 'fill="none" stroke="#abb7ed" stroke-width="4" stroke-dasharray="6 5"');
    out += `<g transform="translate(${xy[0]} ${xy[1]}) rotate(${angle})"><rect x="${-scale * .48}" y="${-track * scale * .45}" width="${(L + 1) * scale}" height="${track * scale * .9}" rx="${scale * .3}" fill="#455bdb" stroke="#2d40ad" stroke-width="2"/><rect x="${L * scale * .55}" y="${-track * scale * .32}" width="${scale * .7}" height="${track * scale * .64}" rx="2" fill="#dff3ec"/>`;
    [[0, -track / 2, 0], [0, track / 2, 0], [L, -track / 2, -rad(frame.inner)], [L, track / 2, -rad(frame.outer)]].forEach(([x, y, steering]) => {
      out += `<g transform="translate(${x * scale} ${y * scale}) rotate(${steering})"><rect x="${-.31 * scale}" y="${-.13 * scale}" width="${.62 * scale}" height="${.26 * scale}" rx="${.05 * scale}" fill="#26334d"/><path d="M${-.25 * scale} 0 H${.25 * scale}" stroke="#f8fbff" stroke-width="1.3"/></g>`;
    });
    return out + '<circle r="4" fill="#f5c84c"/></g>';
  }
  function brakeScene(result, frame, scale) {
    const distance = result.samples[result.samples.length - 1].x;
    const x = 136 + 3 * finite(frame.x), stopX = 136 + 3 * distance, y = 150;
    const front = finite(frame.frontLoad), rear = finite(frame.rearLoad);
    let out = `<path d="M10 181 H660" stroke="#69768d" stroke-width="4"/>${sideCar(x, y)}${wheel(x - 67, y + 2, 28, finite(frame.x) / .3 * 180 / Math.PI)}${wheel(x + 71, y + 2, 28, finite(frame.x) / .3 * 180 / Math.PI)}`;
    out += arrow(x - 67, 239, x - 67, 239 - rear * scale.load, '#455bdb');
    out += arrow(x + 71, 239, x + 71, 239 - front * scale.load, '#16836e');
    out += `<path d="M136 264 H586" stroke="#d5dced" stroke-width="4"/><path d="M136 264 H${x}" stroke="#455bdb" stroke-width="4"/><circle cx="${x}" cy="264" r="5" fill="#455bdb"/>`;
    for (let d = 0; d <= 150; d += 25) out += `<path d="M${136 + 3 * d} 257 V272" stroke="#a8b6cc" stroke-width="2"/>`;
    out += `<path d="M${stopX} 52 V74 M${stopX} 52 h24 l-7 10 h-17" stroke="#16836e" fill="#b7dfd0" stroke-width="3"/>`;
    return out;
  }
  function rollScene(result, frame) {
    const angle = rad(frame.roll), a = finite(frame.roll), cx = 340, cy = 163;
    const anchor = x => [cx + (x - cx) * Math.cos(a) + 15 * Math.sin(a), cy + (x - cx) * Math.sin(a) - 15 * Math.cos(a)];
    const left = anchor(270), right = anchor(410);
    let out = '<path d="M190 255 H490" stroke="#69768d" stroke-width="4"/><path d="M340 55 V252 M225 163 H455" stroke="#c2ccdc" stroke-width="1.5" stroke-dasharray="5 5"/>';
    out += '<rect x="233" y="205" width="36" height="49" rx="11" fill="#26334d"/><rect x="411" y="205" width="36" height="49" rx="11" fill="#26334d"/>';
    out += spring(left[0], left[1] + 20, 251, 221) + spring(right[0], right[1] + 20, 429, 221);
    out += `<g transform="rotate(${angle} ${cx} ${cy})"><path d="M236 159 L257 93 Q261 80 278 80 H402 Q419 80 423 93 L444 159 V191 Q444 203 431 203 H249 Q236 203 236 191Z" fill="#455bdb" stroke="#2d40ad" stroke-width="3"/><path d="M270 94 H410 L421 135 H259Z" fill="#dff3ec"/><rect x="251" y="152" width="38" height="16" rx="7" fill="#f5c84c"/><rect x="391" y="152" width="38" height="16" rx="7" fill="#f5c84c"/><rect x="305" y="165" width="70" height="19" rx="5" fill="#26334d"/><path d="M313 172 H367 M313 178 H367" stroke="#b6c2d9" stroke-width="2"/></g>`;
    return out;
  }
  function readings(scene, frame) {
    if (scene === 'steer') return [`전진 ${n(frame.x, 1)} m`, `옆 이동 ${n(frame.y, 1)} m`, `안쪽 ${n(rad(frame.inner), 1)}°`, `바깥쪽 ${n(rad(frame.outer), 1)}°`];
    if (scene === 'brake') return [`속도 ${n(finite(frame.speed) * 3.6, 1)} km/h`, `이동 ${n(frame.x, 1)} m`, `앞축 ${n(finite(frame.frontLoad) / 1000)} kN`, `뒤축 ${n(finite(frame.rearLoad) / 1000)} kN`];
    if (scene === 'roll') return [`롤각 ${n(rad(frame.roll), 2)}°`, '기울기 확대 없음'];
    return [`차체 ${n(finite(frame.body) * 1000, 1)} mm`, ...(scene === 'ride' ? [`휠 ${n(finite(frame.wheel) * 1000, 1)} mm`, `노면 ${n(finite(frame.road) * 1000, 1)} mm`] : scene === 'resonance' ? [`외력 ${n(frame.force, 0)} N`] : ['초기 높이 +20 mm'])];
  }
  function mount(host, options = {}) {
    if (!host || !window.VehiclePhysics || !window.VehicleComparison) return () => {};
    mounts.get(host)?.();
    const physics = window.VehiclePhysics, sceneIds = Object.keys(physics.scenes);
    const initialScene = sceneIds.includes(options.scene) ? options.scene : 'bounce', uid = `cv-${++instance}`;
    let current = initialScene, params, result, baseline, scale, duration, time = 0, running = false, raf = 0, last = 0, disposed = false, playbackFresh = true;
    let mode = 'compare', question = null, answer = null, exampleIndex = 0;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'), abort = new AbortController();
    const listen = (element, event, handler) => element.addEventListener(event, handler, { signal: abort.signal });
    host.innerHTML = `<section class="vehicle-explainer" aria-label="차량 움직임 바꾸기 전후 비교"><header class="cv-heading"><div><span class="cv-eyebrow">움직임으로 이해하기</span><h3>바꾸기 전과 후, 같이 볼까요?</h3></div><span class="cv-chip">비교 실험</span></header><p class="cv-caption" data-viz-caption></p><div class="cv-modes" role="group" aria-label="실험 방식"><button type="button" data-viz-mode="compare" aria-pressed="true">자유 비교</button><button type="button" data-viz-mode="quiz" aria-pressed="false">먼저 맞혀보기</button></div><div class="cv-scenes" role="group" aria-label="실험 장면 선택">${sceneIds.map(id => `<button type="button" data-viz-scene="${esc(id)}" aria-pressed="false">${esc(physics.scenes[id].title)}</button>`).join('')}</div><div class="cv-comparison-layout"><div class="cv-quiz-result" data-viz-quiz-result hidden></div><div class="cv-stage"><div class="cv-stage-heading"><strong data-viz-title></strong><span>같은 시간 · 같은 축척</span></div><div class="cv-pair">${['before', 'after'].map((side, index) => `<figure class="cv-panel cv-${side}"><figcaption><strong>${index ? '변경' : '기준'}</strong><span>${index ? '슬라이더 조절 후' : '고정된 처음 값'}</span></figcaption><svg class="cv-car" data-viz-car="${side}" role="img" aria-label="${index ? '변경한' : '기준'} 값으로 계산한 차량 움직임"></svg><div class="cv-frame-readout" data-viz-frame="${side}" aria-live="off"></div><p class="cv-ended" data-viz-ended="${side}" aria-live="off"></p></figure>`).join('')}</div><p class="cv-scale-note" data-viz-scale></p><div class="cv-player"><button type="button" data-viz-play>함께 재생</button><button type="button" class="cv-restart" data-viz-restart>처음으로</button><output data-viz-time aria-live="off">0.00 s</output></div><label class="cv-scrub"><span>두 차의 시간을 함께 움직이기</span><input type="range" data-viz-scrub min="0" max="5" step="any" value="0" aria-label="두 차량의 공통 시뮬레이션 시간"/><span data-viz-duration></span></label><p class="cv-motion-note" data-viz-motion-note></p></div><aside class="cv-why" aria-label="움직임이 달라지는 이유"><div class="cv-quiz-feedback" data-viz-quiz-feedback hidden></div><span class="cv-eyebrow">그림 옆 해설</span><h4>왜 이렇게 달라질까요?</h4><p class="cv-why-summary" data-viz-summary></p><div class="cv-changes" data-viz-changes></div><div class="cv-reasons" data-viz-reasons></div></aside></div><div class="cv-settings"><div class="cv-settings-heading"><strong>오른쪽 차의 값을 바꿔 보세요</strong><button type="button" data-viz-reset>오른쪽 기본값</button></div><div class="cv-controls" data-viz-controls></div><div class="cv-baseline-actions"><button type="button" data-viz-baseline>현재 값을 기준으로</button><button type="button" data-viz-undo>변경 취소</button></div><p class="cv-input-tip">왼쪽 기준은 고정됩니다. 원하는 조합을 만든 뒤 ‘현재 값을 기준으로’를 누르면 다음 비교의 출발점이 됩니다.</p></div><section class="cv-quiz" data-viz-quiz hidden aria-label="움직임 예측 퀴즈"><div class="cv-quiz-heading"><span class="cv-eyebrow">예상 → 관찰 → 이해</span><button type="button" data-viz-example>다른 조건 퀴즈</button></div><p class="cv-quiz-condition" data-viz-quiz-condition></p><div class="cv-quiz-inputs" data-viz-quiz-inputs></div><h4 data-viz-quiz-prompt></h4><p class="cv-quiz-definition" data-viz-quiz-definition></p><div class="cv-quiz-choices" role="group" aria-label="움직임 예상 선택">${["increase", "decrease", "same"].map(id => `<button type="button" data-viz-answer="${id}" aria-pressed="false"></button>`).join("")}</div><p class="cv-quiz-hint" data-viz-quiz-hint></p><p class="cv-quiz-status" data-viz-quiz-status role="status" aria-live="polite" aria-atomic="true"></p></section><div class="cv-metric-comparison" data-viz-metrics></div><div class="cv-formulas"><h4>변경한 값이 공식에 들어가면</h4><div data-viz-formulas></div></div><div class="cv-trace"><div class="cv-trace-heading"><strong data-viz-trace-title>시간에 따른 변화</strong><div data-viz-legend></div></div><svg data-viz-graph viewBox="0 0 680 200" role="img" aria-label="기준과 변경의 응답 비교 그래프"></svg><p class="cv-graph-range" data-viz-graph-range></p></div><details class="cv-assumptions"><summary>이 그림이 계산하는 것과 가정</summary><ul data-viz-assumptions></ul></details></section>`;
    const $ = selector => host.querySelector(selector), graph = $('[data-viz-graph]'), scrub = $('[data-viz-scrub]'), play = $('[data-viz-play]');
    let marker = null, graphPoints = [], traceSpec, traceMin = 0, traceMax = 1;
    function stop() {
      running = false; cancelAnimationFrame(raf); raf = 0;
      play.textContent = '함께 재생'; play.setAttribute('aria-pressed', 'false');
    }
    function awaitingPrediction() { return mode === 'quiz' && answer === null; }
    function invalidatePrediction() {
      answer = null; question = null;
      $('[data-viz-quiz-status]').textContent = '';
      $('[data-viz-quiz-feedback]').hidden = true;
      $('[data-viz-quiz-feedback]').replaceChildren();
      $('[data-viz-quiz-result]').hidden = true;
      $('[data-viz-quiz-result]').replaceChildren();
    }
    function updateQuiz(comparison) {
      const quizMode = mode === 'quiz';
      $('[data-viz-quiz]').hidden = !quizMode;
      $('[data-viz-quiz-result]').hidden = !quizMode || answer === null;
      host.querySelectorAll('.cv-comparison-layout, .cv-metric-comparison, .cv-formulas, .cv-trace').forEach(element => { element.hidden = awaitingPrediction(); });
      if (!quizMode) return;
      question = window.VehiclePrediction.create(baseline, result);
      $('[data-viz-quiz-condition]').textContent = '이 조건에서 오른쪽 차는 어떻게 달라질까요?';
      $('[data-viz-quiz-inputs]').innerHTML = comparison.changed.length ? comparison.changed.map(item => `<span><b>${esc(item.label)}</b> ${n(item.before, 3)} → <strong>${n(item.after, 3)}</strong> ${esc(item.unit)}</span>`).join('') : '<span>기준 값과 변경 값이 같아요.</span>';
      $('[data-viz-quiz-prompt]').textContent = question ? question.prompt : '먼저 조건을 바꿔 주세요.';
      $('[data-viz-quiz-definition]').textContent = question ? question.definition : '슬라이더로 값을 바꾸거나 ‘다른 조건 퀴즈’를 눌러 시작하세요.';
      host.querySelectorAll('[data-viz-answer]').forEach(button => {
        const choice = question?.choices.find(item => item.id === button.dataset.vizAnswer);
        button.textContent = choice ? choice.label : ({ increase: '커져요', decrease: '작아져요', same: '같아요' })[button.dataset.vizAnswer];
        button.disabled = !question || answer !== null;
        button.setAttribute('aria-pressed', String(answer === button.dataset.vizAnswer));
      });
      $('[data-viz-quiz-hint]').textContent = answer === null ? '답을 고르면 두 차가 함께 움직이고, 바로 이유를 확인할 수 있어요.' : '아래 두 차를 비교해 보세요. 값을 다시 바꾸면 새 예상에 도전합니다.';
    }
    function loadExample(index) {
      const examples = window.VehiclePrediction.examples(current);
      if (!examples.length) return;
      exampleIndex = index % examples.length;
      stop(); invalidatePrediction(); playbackFresh = true;
      baseline = physics.simulate(current, physics.scenes[current].defaults);
      params = { ...physics.scenes[current].defaults, ...examples[exampleIndex].params };
      result = physics.simulate(current, params); duration = Math.max(baseline.duration, result.duration); time = representativeTime();
      syncControlValues(); updateOutputs();
      $('[data-viz-quiz-condition]').textContent = `${examples[exampleIndex].label} · 기준은 이 장면의 기본값`;
    }
    function setMode(nextMode) {
      if (!['compare', 'quiz'].includes(nextMode) || nextMode === mode) return;
      stop(); invalidatePrediction(); mode = nextMode;
      host.querySelectorAll('[data-viz-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.vizMode === mode)));
      const section = $('.vehicle-explainer'), layout = $('.cv-comparison-layout'), settings = $('.cv-settings'), quiz = $('[data-viz-quiz]');
      if (mode === 'quiz') { section.insertBefore(settings, layout); section.insertBefore(quiz, layout); }
      else { layout.after(settings); settings.after(quiz); }
      updateOutputs();
      if (mode === 'quiz' && !question) loadExample(0);
    }
    function startPlayback() {
      if (media.matches || awaitingPrediction()) return;
      if (playbackFresh || time >= duration - .01) time = 0;
      playbackFresh = false; running = true; last = 0;
      play.textContent = '일시정지'; play.setAttribute('aria-pressed', 'true'); raf = requestAnimationFrame(tick);
    }
    function submitPrediction(id) {
      if (mode !== 'quiz' || answer !== null || !question || !question.choices.some(choice => choice.id === id)) return;
      answer = id;
      const grade = window.VehiclePrediction.grade(question, id), feedback = $('[data-viz-quiz-feedback]');
      updateQuiz(window.VehicleComparison.describe(baseline, result));
      feedback.classList.toggle('cv-quiz-correct', grade.correct);
      feedback.innerHTML = `<strong>${esc(grade.heading)}</strong><p>${esc(grade.body)}</p><p><b>관찰할 곳</b> ${esc(question.observation)}</p><p><b>정의</b> ${esc(question.definition)}</p>`;
      feedback.hidden = false;
      $('[data-viz-quiz-status]').textContent = `${grade.heading} ${grade.body}`;
      const resultStrip = $('[data-viz-quiz-result]');
      const chosen = question.choices.find(choice => choice.id === id), actual = question.choices.find(choice => choice.id === question.correct);
      resultStrip.classList.toggle('cv-quiz-correct', grade.correct);
      resultStrip.innerHTML = `<strong>${esc(grade.heading)}</strong><p>내 예상: ${esc(chosen.label)} <span>→</span> 계산: <b>${esc(actual.label)}</b></p><p class="cv-quiz-insight">${esc(question.insight || question.reasons[0]?.body || question.observation)}</p>`;
      resultStrip.hidden = false;
      stop(); playbackFresh = true; time = media.matches ? representativeTime() : 0; draw();
      $('.cv-comparison-layout').scrollIntoView({ block: 'start', behavior: 'instant' });
      startPlayback();
    }
    function representativeTime() { return Math.min(duration, current === 'bounce' || current === 'ride' ? .8 : duration * .45); }
    function draw() {
      if (disposed) return;
      const frames = [physics.at(baseline, time), physics.at(result, time)];
      ['before', 'after'].forEach((side, index) => {
        const frame = frames[index], simulation = index ? result : baseline, car = $(`[data-viz-car="${side}"]`);
        let illustration = current === 'steer' ? steerScene(simulation, frame, scale) : current === 'brake' ? brakeScene(simulation, frame, scale) : current === 'roll' ? rollScene(simulation, frame) : quarterScene(simulation, frame, current, scale);
        if (!index) illustration = illustration.replaceAll('#455bdb', '#16836e').replaceAll('#2d40ad', '#106c5b').replaceAll('#abb7ed', '#93cdbc');
        car.innerHTML = illustration;
        $(`[data-viz-frame="${side}"]`).innerHTML = readings(current, frame).map(value => `<span>${esc(value)}</span>`).join('');
        $(`[data-viz-ended="${side}"]`).textContent = time >= simulation.duration - .001 ? '계산 종료 · 마지막 장면 유지' : current === 'brake' && frame.speed <= .001 ? '정지 완료' : '';
      });
      scrub.value = String(time); scrub.setAttribute('aria-valuetext', `${n(time, 2)}초`);
      $('[data-viz-time]').textContent = `${time.toFixed(2)} / ${n(duration, 2)} s`;
      const x = 59 + 596 * time / duration;
      if (marker) marker.setAttribute('x1', x), marker.setAttribute('x2', x);
      graphPoints.forEach((dot, index) => { dot.setAttribute('cx', x); dot.setAttribute('cy', 152 - (finite(frames[index][traceSpec.key]) - traceMin) / (traceMax - traceMin) * 112); });
    }
    function buildGraph() {
      traceSpec = result.series[0];
      const values = [...baseline.samples, ...result.samples].map(s => finite(s[traceSpec.key]));
      traceMin = Math.min(0, ...values); traceMax = Math.max(0, ...values);
      const pad = (traceMax - traceMin) * .1 || .01; traceMin -= pad; traceMax += pad;
      const gy = value => 152 - (value - traceMin) / (traceMax - traceMin) * 112;
      let svg = '';
      for (let i = 0; i < 4; i++) { const value = traceMin + (traceMax - traceMin) * i / 3, y = gy(value); svg += `<path d="M59 ${y} H655" stroke="#e0e6f0"/>` + text(49, y + 4, n(value, 3), 'cv-axis', 'end'); }
      svg += text(59, 23, traceSpec.unit, 'cv-axis') + '<path d="M59 34 V157 H655" stroke="#aab6ca" fill="none"/>';
      for (let i = 0; i < 5; i++) svg += text(59 + 596 * i / 4, 180, `${n(duration * i / 4, 1)} s`, 'cv-axis', 'middle');
      [baseline, result].forEach((simulation, index) => {
        const samples = simulation.duration < duration ? [...simulation.samples, { ...simulation.samples[simulation.samples.length - 1], t: duration }] : simulation.samples;
        svg += path(samples.map((s, i) => `${i ? 'L' : 'M'}${59 + 596 * finite(s.t) / duration},${gy(finite(s[traceSpec.key]))}`).join(' '), `data-viz-curve="${index ? 'after' : 'before'}" fill="none" stroke="${index ? AFTER : BEFORE}" stroke-width="${index ? 2.5 : 4}" ${index ? '' : 'stroke-dasharray="8 6"'} stroke-linejoin="round"`);
      });
      svg += '<line data-viz-marker x1="59" x2="59" y1="34" y2="157" stroke="#26334d" stroke-dasharray="4 4"/>';
      svg += `<circle data-viz-point r="7" fill="white" stroke="${BEFORE}" stroke-width="3"/><circle data-viz-point r="3.5" fill="${AFTER}" stroke="white" stroke-width="1"/>`;
      graph.innerHTML = svg; marker = graph.querySelector('[data-viz-marker]'); graphPoints = Array.from(graph.querySelectorAll('[data-viz-point]'));
      $('[data-viz-trace-title]').textContent = `${traceSpec.label} · 두 응답 겹쳐 보기`;
      $('[data-viz-graph-range]').textContent = `공통 가로축 0–${n(duration, 2)}초 · 공통 세로축 ${n(traceMin, 3)}–${n(traceMax, 3)} ${traceSpec.unit} · 검정 세로선은 현재 시각`;
      $('[data-viz-legend]').innerHTML = '<span><i class="cv-line-before"></i>기준 점선</span><span><i class="cv-line-after"></i>변경 실선</span>';
    }
    function updateOutputs() {
      duration = Math.max(baseline.duration, result.duration); time = Math.min(time, duration); scale = sharedScale(baseline, result, current);
      const comparison = window.VehicleComparison.describe(baseline, result);
      $('[data-viz-summary]').textContent = comparison.summary;
      $('[data-viz-changes]').innerHTML = comparison.changed.length ? comparison.changed.map(item => `<p><b>${esc(item.label)} <small>${esc(item.symbol)}</small></b><span>${n(item.before, 3)} → <strong>${n(item.after, 3)}</strong> ${esc(item.unit)}</span></p>`).join('') : '<p>아래에서 한 가지 값을 바꿔 차이를 만들어 보세요.</p>';
      $('[data-viz-reasons]').innerHTML = comparison.reasons.map(reason => `<div><h5>${esc(reason.title)}</h5><p>${esc(reason.body)}</p></div>`).join('');
      $('[data-viz-metrics]').innerHTML = `<table><caption>전체 응답의 계산 결과 비교</caption><thead><tr><th scope="col">결과</th><th scope="col">기준</th><th scope="col">변경</th></tr></thead><tbody>${comparison.outcomes.map(item => `<tr><th scope="row">${esc(item.label)} <small>${esc(item.unit)}</small></th><td>${n(item.before, 3)}</td><td>${n(item.after, 3)}</td></tr>`).join('')}</tbody></table>`;
      $('[data-viz-formulas]').innerHTML = result.formulas.map(item => `<div class="cv-equation"><span>${esc(item.label)}</span><code>${esc(item.expression)}</code><p>${esc(item.substitution)}</p><strong>${esc(item.result)}</strong></div>`).join('');
      $('[data-viz-assumptions]').innerHTML = result.assumptions.map(item => `<li>${esc(item)}</li>`).join('');
      $('[data-viz-undo]').disabled = comparison.unchanged;
      $('[data-viz-baseline]').disabled = comparison.unchanged;
      host.querySelector('.cv-before figcaption span').textContent = '고정된 기준 값';
      const viewBox = current === 'steer' ? '0 0 490 320' : current === 'brake' ? '0 30 680 255' : current === 'roll' ? '175 48 330 227' : '170 -25 330 330';
      host.querySelectorAll('[data-viz-car]').forEach(car => car.setAttribute('viewBox', viewBox));
      $('[data-viz-scale]').textContent = current === 'brake' ? '같은 거리·하중 축척 · 거리 눈금 1칸 = 25 m · 화살표 길이는 차축 하중' : current === 'steer' ? '같은 지도 축척 · 노란 점은 뒤 차축 중심 · 앞바퀴 각도도 함께 변해요' : current === 'roll' ? '같은 수평 기준 · 계산된 롤각 그대로 표시 · 바퀴 위치 고정' : `두 그림의 변위 배율은 함께 조정됩니다 · 하단 눈금 = ${n(28 / scale.motion * 1000, 1)} mm · 피치 제외`;
      scrub.max = String(duration); $('[data-viz-duration]').textContent = `${n(duration, 2)} s`;
      updateQuiz(comparison);
      buildGraph(); draw();
    }
    function recompute() {
      stop(); invalidatePrediction(); playbackFresh = true; result = physics.simulate(current, params); duration = Math.max(baseline.duration, result.duration);
      time = time <= .02 || time >= duration ? representativeTime() : Math.min(time, duration);
      updateOutputs();
    }
    function syncControlValues() {
      physics.scenes[current].controls.forEach(control => {
        const input = host.querySelector(`[data-viz-param="${control.key}"]`), output = host.querySelector(`[data-viz-value="${control.key}"]`);
        if (input) input.value = String(params[control.key]);
        if (output) output.textContent = `${n(params[control.key], 3)} ${control.unit}`;
      });
    }
    function selectScene(id) {
      if (!sceneIds.includes(id)) return;
      stop(); invalidatePrediction(); current = id; playbackFresh = true; exampleIndex = 0;
      const definition = physics.scenes[id]; params = { ...definition.defaults };
      result = physics.simulate(current, params); baseline = physics.simulate(current, params); duration = result.duration; time = representativeTime();
      host.querySelectorAll('[data-viz-scene]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.vizScene === current)));
      $('[data-viz-caption]').textContent = current === initialScene && typeof options.caption === 'string' ? options.caption : definition.description;
      $('[data-viz-title]').textContent = definition.title;
      $('[data-viz-controls]').innerHTML = definition.controls.map(control => `<label class="cv-control" for="${uid}-${esc(control.key)}"><span><b>${esc(control.label)} <small>${esc(control.symbol)}</small></b><output data-viz-value="${esc(control.key)}" for="${uid}-${esc(control.key)}"></output></span><input id="${uid}-${esc(control.key)}" type="range" data-viz-param="${esc(control.key)}" min="${finite(control.min)}" max="${finite(control.max)}" step="${finite(control.step, 1)}" value="${finite(params[control.key])}"/><span class="cv-range-ends"><small>${esc(control.min)} ${esc(control.unit)}</small><small>${esc(control.max)} ${esc(control.unit)}</small></span></label>`).join('');
      syncControlValues();
      if (mode === 'quiz') loadExample(0); else updateOutputs();
    }
    function tick(now) {
      if (disposed || !running) return;
      if (!host.isConnected || document.hidden) { stop(); return; }
      if (last) time = Math.min(duration, time + Math.min((now - last) / 1000, .08));
      last = now; draw();
      if (time >= duration) stop(); else raf = requestAnimationFrame(tick);
    }
    function motionPreference() {
      stop(); play.disabled = media.matches;
      $('[data-viz-motion-note]').textContent = media.matches ? '동작 줄이기 설정이 켜져 있어요. 시간 슬라이더로 두 장면을 함께 살펴보세요.' : '두 차가 같은 시간으로 재생됩니다. 먼저 끝난 차는 마지막 장면에 머물러요.';
    }
    listen(host, 'click', event => {
      const target = event.target.closest('button'); if (!target || !host.contains(target)) return;
      if (target.dataset.vizMode) setMode(target.dataset.vizMode);
      else if (target.hasAttribute('data-viz-example') && mode === 'quiz') loadExample(exampleIndex + 1);
      else if (target.dataset.vizAnswer) submitPrediction(target.dataset.vizAnswer);
      else if (target.dataset.vizScene) selectScene(target.dataset.vizScene);
      else if (target.hasAttribute('data-viz-play')) {
        if (awaitingPrediction()) return;
        if (running) stop();
        else startPlayback();
      } else if (target.hasAttribute('data-viz-restart')) { if (awaitingPrediction()) return; stop(); playbackFresh = false; time = 0; draw(); }
      else if (target.hasAttribute('data-viz-reset')) { params = { ...physics.scenes[current].defaults }; syncControlValues(); recompute(); }
      else if (target.hasAttribute('data-viz-baseline')) { stop(); invalidatePrediction(); baseline = physics.simulate(current, { ...params }); playbackFresh = true; updateOutputs(); }
      else if (target.hasAttribute('data-viz-undo')) { params = { ...baseline.params }; syncControlValues(); recompute(); }
    });
    listen(host, 'input', event => {
      const input = event.target;
      if (input.hasAttribute('data-viz-scrub')) { if (awaitingPrediction()) return; stop(); playbackFresh = false; time = clamp(finite(input.value), 0, duration); draw(); }
      if (input.dataset.vizParam) {
        const key = input.dataset.vizParam, control = physics.scenes[current].controls.find(item => item.key === key); if (!control) return;
        params[key] = clamp(finite(input.value), control.min, control.max); syncControlValues(); recompute();
      }
    });
    listen(document, 'visibilitychange', () => { if (document.hidden) stop(); }); listen(media, 'change', motionPreference);
    const observer = new MutationObserver(() => { if (!host.isConnected) cleanup(); }); observer.observe(document.body, { childList: true, subtree: true });
    function cleanup() { if (disposed) return; stop(); disposed = true; abort.abort(); observer.disconnect(); mounts.delete(host); }
    mounts.set(host, cleanup); selectScene(initialScene); motionPreference(); return cleanup;
  }
  window.ChassisVisual = Object.freeze({ mount });
})();
