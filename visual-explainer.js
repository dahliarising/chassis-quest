/* Interactive vehicle diagrams. Physics and learner progress remain separate. */
(function () {
  'use strict';
  const mounts = new WeakMap();
  let instance = 0;
  const COLORS = ['#455bdb', '#16836e', '#be7c12'];
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
  function quarterScene(result, frame, scene) {
    const b = finite(frame.body), w = finite(frame.wheel), road = finite(frame.road);
    // Displacement is enlarged uniformly, with a visible scale note; no pitch is inferred.
    const maxMotion = Math.max(.001, ...result.samples.flatMap(s => [Math.abs(finite(s.body)), Math.abs(finite(s.wheel)), Math.abs(finite(s.road)), Math.abs(finite(s.body) - finite(s.wheel))]));
    const scale = Math.min(700, 46 / maxMotion), bodyShift = -b * scale, wheelShift = -w * scale, roadShift = -road * scale;
    const by = 105 + bodyShift, wy = 220 + wheelShift, ry = 250 + roadShift;
    const force = finite(frame.force), fmax = Math.max(1, ...result.samples.map(s => Math.abs(finite(s.force))));
    const yTop = by + 35, yBottom = wy - 14;
    let out = `<path d="M55 250 H625" stroke="#c9d3e4" stroke-width="2" stroke-dasharray="5 6"/>`;
    out += `<path d="M58 ${ry} H622" stroke="#69768d" stroke-width="5" stroke-linecap="round"/>`;
    for (let x = 70; x < 625; x += 30) out += `<path d="M${x} ${ry + 7} l-10 12" stroke="#c9d3e4" stroke-width="2"/>`;
    out += `<path d="M198 ${by + 34} V${by - 34} Q198 ${by - 43} 212 ${by - 43} H283 L330 ${by - 4} L454 ${by + 7} Q471 ${by + 9} 471 ${by + 23} V${by + 38} H198Z" fill="#455bdb" stroke="#2d40ad" stroke-width="3"/>`;
    out += `<path d="M218 ${by - 33} H275 L313 ${by - 3} H218Z" fill="#dff3ec"/><path d="M202 ${by - 39} V${by + 36}" stroke="#f6f8fc" stroke-width="4" stroke-dasharray="6 5"/><rect x="438" y="${by + 15}" width="28" height="9" rx="4" fill="#f5c84c"/>`;
    out += spring(317, yTop, 317, yBottom);
    out += `<path d="M365 ${yTop} V${yBottom}" stroke="#16836e" stroke-width="5"/><rect x="356" y="${yTop + (yBottom - yTop) * .38}" width="18" height="${Math.max(12, (yBottom - yTop) * .38)}" rx="4" fill="#c3e8dc" stroke="#16836e" stroke-width="3"/>`;
    out += `<path d="M305 ${yBottom} H375" stroke="#7b89a1" stroke-width="5"/>${wheel(342, wy)}`;
    out += text(490, 166, `차체 ${n(b * 1000, 1)} mm`, 'cv-svg-value');
    out += text(490, 187, scene === 'ride' ? `휠 ${n(w * 1000, 1)} mm` : '휠·노면 고정', 'cv-svg-small');
    out += text(490, 208, scene === 'ride' ? `노면 ${n(road * 1000, 1)} mm` : '변위 자동 확대', 'cv-svg-small');
    out += text(76, 283, '파랑: 스프링   초록: 댐퍼   점선: 기준 노면', 'cv-svg-small');
    out += `<path d="M610 220 V248 M604 220 H616 M604 248 H616" stroke="#607496" stroke-width="2"/>` + text(598, 239, `${n(28 / scale * 1000, 1)} mm`, 'cv-svg-small', 'end');
    out += text(76, 305, '변위 자동 확대 · 오른쪽 눈금으로 크기를 비교하세요', 'cv-svg-small');
    if (scene === 'resonance') {
      const len = Math.abs(force) / fmax * 45;
      if (len > 1) out += arrow(401, by - 23, 401, by - 23 - Math.sign(force) * len, '#be7c12');
      out += text(450, 54, `외력 F(t) ${n(force, 0)} N`, 'cv-svg-small');
    }
    return out;
  }
  function steerScene(result, frame) {
    const samples = result.samples, xs = samples.map(s => finite(s.x)), ys = samples.map(s => finite(s.y));
    const minX = Math.min(0, ...xs), maxX = Math.max(1, ...xs), minY = Math.min(0, ...ys), maxY = Math.max(1, ...ys);
    const L = finite(result.params.L, 2.8);
    const scale = Math.min(340 / (maxX - minX + L + 2), 185 / (maxY - minY + L + 3));
    const map = s => [66 + (finite(s.x) - minX + 1) * scale, 250 - (finite(s.y) - minY + 1) * scale];
    const xy = map(frame);
    const angle = -rad(frame.yaw);
    let out = text(38, 37, '뒤 차축 중심의 궤적', 'cv-svg-label');
    for (let x = 40; x < 435; x += 40) out += `<path d="M${x} 55 V268" stroke="#e2e8f2"/>`;
    for (let y = 68; y < 270; y += 40) out += `<path d="M40 ${y} H435" stroke="#e2e8f2"/>`;
    out += path(samples.map((s, i) => `${i ? 'L' : 'M'}${map(s).join(',')}`).join(' '), 'fill="none" stroke="#abb7ed" stroke-width="4" stroke-dasharray="6 5"');
    out += `<g transform="translate(${xy[0]} ${xy[1]}) rotate(${angle})"><rect x="${-scale * .55}" y="${-scale * .85}" width="${(L + 1.1) * scale}" height="${1.7 * scale}" rx="${scale * .3}" fill="#455bdb" stroke="#2d40ad" stroke-width="1.5"/><rect x="${L * scale * .55}" y="${-scale * .66}" width="${scale * .7}" height="${scale * 1.32}" rx="2" fill="#dff3ec"/><circle r="3" fill="#f5c84c"/></g>`;
    out += text(45, 294, `진행 ${n(frame.x, 1)} m · 옆 방향 ${n(frame.y, 1)} m`, 'cv-svg-small');
    out += `<path d="M455 30 V277" stroke="#d8e1ef"/>`;
    out += text(565, 37, '앞바퀴 각도 확대', 'cv-svg-label', 'middle');
    out += `<rect x="520" y="80" width="90" height="164" rx="27" fill="#455bdb" stroke="#2d40ad" stroke-width="3"/><path d="M535 115 Q565 100 595 115 L592 149 H538Z" fill="#dff3ec"/><path d="M538 190 H592 L595 215 Q565 225 535 215Z" fill="#cad4fb"/><path d="M512 115 H618 M512 211 H618" stroke="#a2adbf" stroke-width="4"/>`;
    const inner = rad(frame.inner), outer = rad(frame.outer);
    out += `<rect x="505" y="96" width="14" height="38" rx="5" fill="#26334d" transform="rotate(${-inner} 512 115)"/><rect x="611" y="96" width="14" height="38" rx="5" fill="#26334d" transform="rotate(${-outer} 618 115)"/><rect x="505" y="192" width="14" height="38" rx="5" fill="#26334d"/><rect x="611" y="192" width="14" height="38" rx="5" fill="#26334d"/>`;
    out += arrow(565, 88, 565, 57, '#16836e');
    out += text(503, 263, `안쪽 ${n(inner, 1)}°`, 'cv-svg-small');
    out += text(503, 285, `바깥쪽 ${n(outer, 1)}°`, 'cv-svg-small');
    return out;
  }
  function brakeScene(result, frame) {
    const maxX = Math.max(1, ...result.samples.map(s => finite(s.x)));
    const x = 154 + 3 * finite(frame.x), stopX = 154 + 3 * maxX, y = 160, front = finite(frame.frontLoad), rear = finite(frame.rearLoad), total = Math.max(1, front + rear);
    let out = text(42, 36, '제동 중 이동과 차축 하중', 'cv-svg-label');
    out += text(42, 58, '차체 피치는 제외 · 같은 거리 눈금으로 비교해요', 'cv-svg-small');
    out += `<path d="M35 191 H647" stroke="#69768d" stroke-width="4"/>${sideCar(x, y)}${wheel(x - 67, y + 2, 28, finite(frame.x) / .3 * 180 / Math.PI)}${wheel(x + 71, y + 2, 28, finite(frame.x) / .3 * 180 / Math.PI)}`;
    out += arrow(x - 67, 251, x - 67, 251 - 80 * rear / total, '#455bdb');
    out += arrow(x + 71, 251, x + 71, 251 - 80 * front / total, '#16836e');
    out += text(x - 67, 271, `뒤 ${n(rear / 1000)} kN`, 'cv-svg-small', 'middle');
    out += text(x + 71, 271, `앞 ${n(front / 1000)} kN`, 'cv-svg-small', 'middle');
    out += text(643, 37, `${n(finite(frame.speed) * 3.6, 1)} km/h`, 'cv-svg-value', 'end');
    out += text(643, 58, `이동 거리 ${n(frame.x, 1)} m`, 'cv-svg-small', 'end');
    out += `<path d="M154 293 H574" stroke="#d5dced" stroke-width="4"/><path d="M154 293 H${x}" stroke="#455bdb" stroke-width="4"/><circle cx="${x}" cy="293" r="5" fill="#455bdb"/>`;
    for (let distance = 0; distance <= 125; distance += 25) out += text(154 + 3 * distance, 316, `${distance} m`, 'cv-axis', 'middle');
    out += `<path d="M${stopX} 75 V90 M${stopX} 75 h18 l-6 6 h-12" stroke="#16836e" fill="#b7dfd0" stroke-width="2"/>` + text(stopX + 23, 85, `정지 ${n(maxX, 1)} m`, 'cv-svg-small');
    return out;
  }
  function rollScene(result, frame) {
    const angle = rad(frame.roll), a = finite(frame.roll), cx = 340, cy = 163;
    const anchor = x => [cx + (x - cx) * Math.cos(a) + 15 * Math.sin(a), cy + (x - cx) * Math.sin(a) - 15 * Math.cos(a)];
    const left = anchor(270), right = anchor(410);
    let out = text(43, 36, '코너링 중 차체 롤 · 정면', 'cv-svg-label');
    out += text(43, 58, '차체 기울기는 계산된 각도 그대로 표시해요', 'cv-svg-small');
    out += `<path d="M160 255 H520" stroke="#69768d" stroke-width="4"/><path d="M340 70 V252 M225 163 H455" stroke="#c2ccdc" stroke-width="1.5" stroke-dasharray="5 5"/>`;
    out += `<rect x="233" y="205" width="36" height="49" rx="11" fill="#26334d"/><rect x="411" y="205" width="36" height="49" rx="11" fill="#26334d"/>`;
    out += spring(left[0], left[1] + 20, 251, 221) + spring(right[0], right[1] + 20, 429, 221);
    out += `<g transform="rotate(${angle} ${cx} ${cy})"><path d="M236 159 L257 93 Q261 80 278 80 H402 Q419 80 423 93 L444 159 V191 Q444 203 431 203 H249 Q236 203 236 191Z" fill="#455bdb" stroke="#2d40ad" stroke-width="3"/><path d="M270 94 H410 L421 135 H259Z" fill="#dff3ec"/><rect x="251" y="152" width="38" height="16" rx="7" fill="#f5c84c"/><rect x="391" y="152" width="38" height="16" rx="7" fill="#f5c84c"/><rect x="305" y="165" width="70" height="19" rx="5" fill="#26334d"/><path d="M313 172 H367 M313 178 H367" stroke="#b6c2d9" stroke-width="2"/></g>`;
    out += text(534, 139, `φ = ${n(angle, 2)}°`, 'cv-svg-value');
    out += text(534, 161, '차체 롤각', 'cv-svg-small');
    out += text(340, 288, '점선: 수평 기준 · 타이어 위치는 고정', 'cv-svg-small', 'middle');
    return out;
  }
  function mount(host, options = {}) {
    if (!host || !window.VehiclePhysics) return () => {};
    mounts.get(host)?.();
    const physics = window.VehiclePhysics, sceneIds = Object.keys(physics.scenes);
    const initialScene = sceneIds.includes(options.scene) ? options.scene : 'bounce';
    const uid = `cv-${++instance}`;
    let current = initialScene, params, result, time = 0, running = false, raf = 0, last = 0, disposed = false, playbackFresh = true;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const abort = new AbortController();
    const listen = (element, event, handler) => element.addEventListener(event, handler, { signal: abort.signal });
    host.innerHTML = `<section class="vehicle-explainer" aria-label="값을 바꾸며 보는 차량 움직임"><header class="cv-heading"><div><span class="cv-eyebrow">움직임으로 이해하기</span><h3>공식을 만지면, 차가 답해요.</h3></div><span class="cv-chip">직접 실험</span></header><p class="cv-caption" data-viz-caption></p><div class="cv-scenes" role="group" aria-label="실험 장면 선택">${sceneIds.map(id => `<button type="button" data-viz-scene="${esc(id)}" aria-pressed="false">${esc(physics.scenes[id].title)}</button>`).join('')}</div><div class="cv-workshop"><div class="cv-stage"><div class="cv-stage-heading"><strong data-viz-title></strong><span>모델로 예측한 움직임</span></div><svg class="cv-car" data-viz-car viewBox="0 0 680 320" role="img" aria-label="현재 값으로 계산한 차량 움직임"></svg><div class="cv-frame-readout" data-viz-frame aria-live="off"></div><div class="cv-player"><button type="button" data-viz-play>움직임 재생</button><button type="button" class="cv-restart" data-viz-restart aria-label="처음으로 돌아가기">처음으로</button><output data-viz-time aria-live="off">0.00 s</output></div><label class="cv-scrub"><span>시간을 직접 움직여 보기</span><input type="range" data-viz-scrub min="0" max="5" step="0.01" value="0" aria-label="시뮬레이션 시간"/><span data-viz-duration></span></label><p class="cv-motion-note" data-viz-motion-note></p></div><div class="cv-settings"><div class="cv-settings-heading"><strong>값을 바꿔 보세요</strong><button type="button" data-viz-reset>기본값</button></div><div class="cv-controls" data-viz-controls></div><p class="cv-input-tip">슬라이더를 움직이는 즉시 식과 차량 모습이 바뀝니다.</p></div></div><div class="cv-metrics" data-viz-metrics></div><div class="cv-formulas"><h4>지금 값이 공식에 들어가면</h4><div data-viz-formulas></div></div><div class="cv-trace"><div class="cv-trace-heading"><strong>시간에 따른 변화</strong><div data-viz-legend></div></div><svg data-viz-graph viewBox="0 0 680 200" role="img" aria-label="시간에 따른 응답 그래프"></svg><p class="cv-graph-range" data-viz-graph-range></p></div><details class="cv-assumptions"><summary>이 그림이 계산하는 것과 가정</summary><ul data-viz-assumptions></ul></details></section>`;
    const $ = selector => host.querySelector(selector);
    const car = $('[data-viz-car]'), graph = $('[data-viz-graph]'), scrub = $('[data-viz-scrub]');
    const play = $('[data-viz-play]');
    let marker = null, graphPoints = [], traceSpecs = [], traceMin = 0, traceMax = 1;
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
      play.textContent = '움직임 재생';
      play.setAttribute('aria-pressed', 'false');
    }
    function representativeTime() {
      return Math.min(result.duration, current === 'bounce' || current === 'ride' ? .8 : result.duration * .45);
    }
    function draw() {
      if (disposed) return;
      const frame = physics.at(result, time);
      car.innerHTML = current === 'steer' ? steerScene(result, frame) : current === 'brake' ? brakeScene(result, frame) : current === 'roll' ? rollScene(result, frame) : quarterScene(result, frame, current);
      const readings = current === 'steer' ? [`안쪽 ${n(rad(frame.inner), 1)}°`, `바깥쪽 ${n(rad(frame.outer), 1)}°`, `차체 방향 ${n(rad(frame.yaw), 1)}°`] : current === 'brake' ? [`속도 ${n(finite(frame.speed) * 3.6, 1)} km/h`, `이동 ${n(frame.x, 1)} m`, `앞축 ${n(finite(frame.frontLoad) / 1000)} kN`, `뒤축 ${n(finite(frame.rearLoad) / 1000)} kN`] : current === 'roll' ? [`현재 롤각 ${n(rad(frame.roll), 2)}°`, '실제 계산 각도 · 기울기 확대 없음'] : [`차체 ${n(finite(frame.body) * 1000, 1)} mm`, current === 'ride' ? `바퀴 ${n(finite(frame.wheel) * 1000, 1)} mm` : current === 'resonance' ? `외력 ${n(frame.force, 0)} N` : '초기 높이 +20 mm', current === 'ride' ? `노면 ${n(finite(frame.road) * 1000, 1)} mm` : '변위 자동 확대'];
      $('[data-viz-frame]').innerHTML = readings.map(value => `<span>${esc(value)}</span>`).join('');
      scrub.value = String(time);
      scrub.setAttribute('aria-valuetext', `${n(time, 2)}초`);
      $('[data-viz-time]').textContent = `${time.toFixed(2)} / ${n(result.duration, 2)} s`;
      const x = 59 + 596 * time / result.duration;
      if (marker) marker.setAttribute('x1', x), marker.setAttribute('x2', x);
      graphPoints.forEach((dot, index) => {
        const value = finite(frame[traceSpecs[index].key]);
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', 152 - (value - traceMin) / (traceMax - traceMin) * 112);
      });
    }
    function buildGraph() {
      const series = Array.isArray(result.series) ? result.series : [];
      traceSpecs = series.filter(s => s.unit === series[0]?.unit).slice(0, 3);
      const values = result.samples.flatMap(s => traceSpecs.map(item => finite(s[item.key])));
      traceMin = Math.min(0, ...values); traceMax = Math.max(0, ...values);
      const pad = (traceMax - traceMin) * .1 || .01;
      traceMin -= pad; traceMax += pad;
      const gy = value => 152 - (value - traceMin) / (traceMax - traceMin) * 112;
      let svg = '';
      for (let i = 0; i < 4; i++) {
        const value = traceMin + (traceMax - traceMin) * i / 3, y = gy(value);
        svg += `<path d="M59 ${y} H655" stroke="#e0e6f0"/>` + text(49, y + 4, n(value, 3), 'cv-axis', 'end');
      }
      svg += text(59, 23, traceSpecs[0]?.unit || '', 'cv-axis');
      svg += `<path d="M59 34 V157 H655" stroke="#aab6ca" fill="none"/>`;
      for (let i = 0; i < 5; i++) svg += text(59 + 596 * i / 4, 180, `${n(result.duration * i / 4, 1)} s`, 'cv-axis', 'middle');
      traceSpecs.forEach((item, index) => {
        const color = COLORS[index];
        svg += path(result.samples.map((s, i) => `${i ? 'L' : 'M'}${59 + 596 * finite(s.t) / result.duration},${gy(finite(s[item.key]))}`).join(' '), `fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"`);
      });
      svg += '<line data-viz-marker x1="59" x2="59" y1="34" y2="157" stroke="#26334d" stroke-dasharray="4 4"/>';
      traceSpecs.forEach((item, index) => { svg += `<circle data-viz-point r="5" fill="${COLORS[index]}" stroke="#fff" stroke-width="2"/>`; });
      graph.innerHTML = svg;
      marker = graph.querySelector('[data-viz-marker]');
      graphPoints = Array.from(graph.querySelectorAll('[data-viz-point]'));
      $('[data-viz-graph-range]').textContent = `가로 0–${n(result.duration, 2)}초 · 세로 ${n(traceMin, 3)}–${n(traceMax, 3)} ${traceSpecs[0]?.unit || ''} · 점선은 현재 시각`;
      $('[data-viz-legend]').innerHTML = traceSpecs.map((item, index) => `<span><i style="background:${COLORS[index]}"></i>${esc(item.label)} (${esc(item.unit)})</span>`).join('');
    }
    function updateOutputs() {
      $('[data-viz-metrics]').innerHTML = result.metrics.slice(0, 4).map(item => `<div><span>${esc(item.label)}</span><strong>${typeof item.value === 'number' ? n(item.value, 3) : esc(item.value)} <small>${esc(item.unit)}</small></strong></div>`).join('');
      $('[data-viz-formulas]').innerHTML = result.formulas.map(item => `<div class="cv-equation"><span>${esc(item.label)}</span><code>${esc(item.expression)}</code><p>${esc(item.substitution)}</p><strong>${esc(item.result)}</strong></div>`).join('');
      $('[data-viz-assumptions]').innerHTML = result.assumptions.map(item => `<li>${esc(item)}</li>`).join('');
      scrub.max = String(result.duration);
      $('[data-viz-duration]').textContent = `${n(result.duration, 2)} s`;
      buildGraph();
      draw();
    }
    function recompute() {
      stop(); playbackFresh = true;
      result = physics.simulate(current, params);
      time = time <= .02 || time >= result.duration ? representativeTime() : Math.min(time, result.duration);
      updateOutputs();
    }
    function syncControlValues() {
      physics.scenes[current].controls.forEach(control => {
        const input = host.querySelector(`[data-viz-param="${control.key}"]`);
        if (input) input.value = String(params[control.key]);
        const output = host.querySelector(`[data-viz-value="${control.key}"]`);
        if (output) output.textContent = `${n(params[control.key], 3)} ${control.unit}`;
      });
    }
    function selectScene(id) {
      stop(); current = id; playbackFresh = true;
      const definition = physics.scenes[id];
      params = { ...definition.defaults };
      result = physics.simulate(current, params);
      time = representativeTime();
      host.querySelectorAll('[data-viz-scene]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.vizScene === current)));
      $('[data-viz-caption]').textContent = current === initialScene && typeof options.caption === 'string' ? options.caption : definition.description;
      $('[data-viz-title]').textContent = definition.title;
      $('[data-viz-controls]').innerHTML = definition.controls.map(control => `<label class="cv-control" for="${uid}-${esc(control.key)}"><span><b>${esc(control.label)} <small>${esc(control.symbol)}</small></b><output data-viz-value="${esc(control.key)}" for="${uid}-${esc(control.key)}"></output></span><input id="${uid}-${esc(control.key)}" type="range" data-viz-param="${esc(control.key)}" min="${finite(control.min)}" max="${finite(control.max)}" step="${finite(control.step, 1)}" value="${finite(params[control.key])}"/><span class="cv-range-ends"><small>${esc(control.min)} ${esc(control.unit)}</small><small>${esc(control.max)} ${esc(control.unit)}</small></span></label>`).join('');
      syncControlValues();
      updateOutputs();
    }
    function tick(now) {
      if (disposed || !running) return;
      if (!host.isConnected || document.hidden) { stop(); return; }
      if (last) time = Math.min(result.duration, time + Math.min((now - last) / 1000, .08));
      last = now; draw();
      if (time >= result.duration) stop(); else raf = requestAnimationFrame(tick);
    }
    function motionPreference() {
      stop();
      play.disabled = media.matches;
      $('[data-viz-motion-note]').textContent = media.matches ? '동작 줄이기 설정이 켜져 있어요. 아래 시간 슬라이더로 한 장면씩 살펴보세요.' : '재생은 한 번만 진행돼요. 시간 슬라이더로 원하는 순간을 멈춰 볼 수 있어요.';
    }
    listen(host, 'click', event => {
      const target = event.target.closest('button');
      if (!target || !host.contains(target)) return;
      if (target.dataset.vizScene) selectScene(target.dataset.vizScene);
      else if (target.hasAttribute('data-viz-play')) {
        if (running) stop();
        else if (!media.matches) { if (playbackFresh || time >= result.duration - .01) time = 0; playbackFresh = false; running = true; last = 0; play.textContent = '일시정지'; play.setAttribute('aria-pressed', 'true'); raf = requestAnimationFrame(tick); }
      } else if (target.hasAttribute('data-viz-restart')) { stop(); playbackFresh = false; time = 0; draw(); }
      else if (target.hasAttribute('data-viz-reset')) { params = { ...physics.scenes[current].defaults }; syncControlValues(); recompute(); }
    });
    listen(host, 'input', event => {
      const input = event.target;
      if (input.hasAttribute('data-viz-scrub')) { stop(); playbackFresh = false; time = clamp(finite(input.value), 0, result.duration); draw(); }
      if (input.dataset.vizParam) {
        const key = input.dataset.vizParam, control = physics.scenes[current].controls.find(item => item.key === key);
        if (!control) return;
        params[key] = clamp(finite(input.value), control.min, control.max);
        syncControlValues(); recompute();
      }
    });
    listen(document, 'visibilitychange', () => { if (document.hidden) stop(); });
    listen(media, 'change', motionPreference);
    const observer = new MutationObserver(() => { if (!host.isConnected) cleanup(); });
    observer.observe(document.body, { childList: true, subtree: true });
    function cleanup() {
      if (disposed) return;
      stop(); disposed = true; abort.abort(); observer.disconnect(); mounts.delete(host);
    }
    mounts.set(host, cleanup);
    selectScene(initialScene); motionPreference();
    return cleanup;
  }
  window.ChassisVisual = Object.freeze({ mount });
})();
