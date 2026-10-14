import * as THREE from './vendor/three.module.min.js';

// Positions are metres in the freely drivable proving ground. Vehicles face +z.
export const STATIONS = Object.freeze([
  { id: 'cornering', label: '코너링 서킷', x: -43, z: -28, heading: Math.PI / 2 },
  { id: 'bump', label: '승차감 로드', x: 109, z: 28, heading: Math.PI },
  { id: 'geometry', label: '지오메트리 랩', x: 65, z: -82, heading: -Math.PI / 2 },
  { id: 'garage', label: '정비소', x: -75, z: 66, heading: Math.PI }
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const C = {
  sky: 0x070b19, grass: 0x10172a, asphalt: 0x202a40, roadEdge: 0x354158,
  white: 0xe5f4ff, red: 0xff4e9b, mint: 0x42edee, yellow: 0xf4ed64,
  sea: 0x111c35, metal: 0x151c31, glass: 0x203d56, dark: 0x080f20
};

export function createWorld(container, options = {}) {
  if (!container?.appendChild) throw new Error('주행 화면을 열 수 없습니다.');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-label', '네온시티 야간 시험장 3D 주행 화면');
  renderer.domElement.setAttribute('role', 'img');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.sky);
  scene.fog = new THREE.Fog(C.sky, 240, 750);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.3, 4000);
  const resources = new Set();
  const materials = new Map();
  const geometries = new Map();
  const labels = [];
  let disposed = false, paused = false, overview = true, dirty = true;
  let raf = 0, last = 0, lastReport = -Infinity, experiment = null;
  let input = { throttle: 0, steer: 0, brake: false };
  const reducedMotion = !!options.reducedMotion;
  const state = { x: -75, z: 66, heading: Math.PI, speed: 0, steering: 0 };
  const aim = new THREE.Vector3(0, 0, -2);
  const wantedCamera = new THREE.Vector3(), wantedAim = new THREE.Vector3();
  let viewportWidth = 1, viewportHeight = 1, projectionMode = '';

  const own = resource => { resources.add(resource); return resource; };
  function material(color, settings = {}) {
    const key = JSON.stringify([color, settings]);
    if (!materials.has(key)) materials.set(key, own(new THREE.MeshStandardMaterial({ color, roughness: color === C.asphalt ? 0.24 : 0.72, metalness: color === C.asphalt ? 0.45 : 0.12, ...settings })));
    return materials.get(key);
  }
  const neon = (color, intensity = 1.3) => ({ emissive: color, emissiveIntensity: intensity, roughness: 0.32, metalness: 0.18 });
  function geometry(type, args) {
    const key = `${type}:${args.join(',')}`;
    if (!geometries.has(key)) geometries.set(key, own(new THREE[type](...args)));
    return geometries.get(key);
  }
  function mesh(geo, mat, parent = scene, position = [0, 0, 0], shadow = true) {
    const object = new THREE.Mesh(geo, mat);
    object.position.set(...position);
    object.castShadow = shadow;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(w, h, d, color, parent = scene, position = [0, 0, 0], settings) {
    const object = mesh(geometry('BoxGeometry', [1, 1, 1]), material(color, settings), parent, position);
    object.scale.set(w, h, d);
    return object;
  }
  function cylinder(r1, r2, h, color, parent = scene, position = [0, 0, 0], segments = 12) {
    return mesh(geometry('CylinderGeometry', [r1, r2, h, segments]), material(color), parent, position);
  }
  function roadSegment(a, b, width = 13, color = C.asphalt, y = 0.035, parent = scene) {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const strip = box(width, 0.05, length + 0.06, color, parent, [(a.x + b.x) / 2, y, (a.z + b.z) / 2]);
    strip.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    strip.castShadow = false;
    return strip;
  }
  const roadSegments = [];
  function makeRoad(points, { width = 13, closed = false, marked = true } = {}) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], 0, p[1])), closed, 'catmullrom', 0.3);
    const count = Math.ceil(curve.getLength() / 2.8);
    const samples = curve.getSpacedPoints(count);
    function ribbon(ribbonWidth, offset, height, color, settings = {}) {
      const vertices = [], indices = [];
      samples.forEach((point, index) => {
        const tangent = curve.getTangentAt(index / count).normalize();
        const nx = tangent.z, nz = -tangent.x;
        for (const side of [-1, 1]) vertices.push(point.x + nx * (offset + side * ribbonWidth / 2), height,
          point.z + nz * (offset + side * ribbonWidth / 2));
        if (index < count) { const a = index * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      });
      const geo = own(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
      mesh(geo, material(color, { side: THREE.DoubleSide, ...settings }), scene, [0, 0, 0], false);
    }
    ribbon(width + 2.2, 0, 0.015, C.roadEdge);
    ribbon(width, 0, 0.055, C.asphalt);
    for (const side of [-1, 1]) {
      ribbon(0.16, side * (width / 2 - 0.6), 0.125, C.mint, neon(C.mint, 1.1));
      ribbon(0.8, side * (width / 2 - 1), 0.081, C.mint, { ...neon(C.mint, 0.4), transparent: true, opacity: 0.12, depthWrite: false });
    }
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      roadSegments.push({ a, b, width });
      if (marked && i % 4 < 2) roadSegment(a, b, 0.14, C.yellow, 0.08);
    }
  }

  // A lit night scene: cool fill keeps the asphalt readable while signs and
  // window strips carry the colour. No post-processing or extra render passes.
  scene.add(new THREE.HemisphereLight(0x96cfff, 0x263054, 2.8));
  const sun = new THREE.DirectionalLight(0xb3d4ff, 2.2);
  sun.position.set(-85, 160, 75);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 155, bottom: -155, near: 1, far: 370 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.25;
  scene.add(sun);
  const cityRim = new THREE.DirectionalLight(0xff78c0, 1.05);
  cityRim.position.set(160, 65, -170); scene.add(cityRim);

  box(490, 1.1, 620, C.grass, scene, [80, -0.62, -45], { roughness: 0.44 }).castShadow = false;
  box(430, 0.2, 1100, C.sea, scene, [-382, -1.7, -50], { roughness: 0.14, metalness: 0.58 }).castShadow = false;
  box(28, 0.3, 610, C.metal, scene, [-176, -0.4, -45]).castShadow = false;

  makeRoad([[-102, 73], [-132, 8], [-107, -90], [-20, -119], [94, -95], [133, -20], [116, 73], [22, 103]], { closed: true });
  makeRoad([[-75, 77], [-75, 26], [-61, -10]], { width: 11, marked: false });
  makeRoad([[2, -28], [43, -45], [69, -83]], { width: 11, marked: false });
  makeRoad([[0, 35], [47, 26], [113, 27]], { width: 11 });
  makeRoad([[-41, -76], [-34, -100], [-20, -119]], { width: 11, marked: false });

  // The circular handling pad is deliberately the largest visual landmark.
  cylinder(54, 54, 0.07, C.roadEdge, scene, [-43, 0.005, -28], 96).castShadow = false;
  cylinder(52.5, 52.5, 0.08, C.asphalt, scene, [-43, 0.045, -28], 96).castShadow = false;
  const ring = (radius, color, parent = scene, center = [-43, 0.1, -28], width = 0.16) => {
    const g = own(new THREE.TorusGeometry(radius, width, 5, 100));
    const object = mesh(g, material(color, neon(color, 0.65)), parent, center, false);
    object.rotation.x = Math.PI / 2;
    return object;
  };
  [20, 35, 49].forEach(r => ring(r, C.mint));
  ring(51.5, C.red, scene, [-43, 0.1, -28], 0.32);
  for (let i = 0; i < 72; i++) {
    const angle = i / 72 * Math.PI * 2;
    const curb = box(3.55, 0.18, 1.15, i % 2 ? C.white : C.red, scene,
      [-43 + Math.sin(angle) * 52.3, 0.13, -28 + Math.cos(angle) * 52.3]);
    curb.rotation.y = angle;
    curb.castShadow = false;
  }
  box(28, 0.06, 36, C.asphalt, scene, [65, 0.06, -82]).castShadow = false;
  box(41, 0.06, 28, C.asphalt, scene, [-75, 0.06, 65]).castShadow = false;
  for (let i = 0; i < 5; i++) {
    box(8, 0.1, 0.65, i % 2 ? C.yellow : C.dark, scene, [109, 0.13, 15 + i * 4]).castShadow = false;
  }

  const obstacles = [];
  // Deterministic architecture preserves the exact same driveable map. The
  // skyline lives beyond its boundary; small service blocks avoid every road.
  let seed = 631;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  function tower(x, z, w, d, h, index) {
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    const accent = index % 3 === 0 ? C.red : C.mint;
    const facade = index % 2 ? 0x1b2940 : 0x253049;
    box(w, h, d, facade, group, [0, h / 2, 0], { roughness: 0.4, metalness: 0.4 });
    box(w + 1.3, 1, d + 1.3, C.dark, group, [0, h + 0.5, 0]);
    box(w * 0.56, h * 0.13, d * 0.6, C.metal, group, [0, h * 1.065 + 1, 0]);
    box(w + 0.5, 0.36, 0.18, accent, group, [0, h - 1.4, d / 2 + 0.13], neon(accent));
    box(0.18, 0.36, d + 0.5, accent, group, [-w / 2 - 0.13, h - 1.4, 0], neon(accent));
    // Shared small boxes become GPU instances below, including the windows.
    for (let row = 0; row < Math.floor((h - 5) / 5); row++) {
      for (let col = 0; col < Math.floor(w / 4); col++) {
        if ((row * 3 + col + index) % 7 === 0) continue;
        const colour = (row + col + index) % 8 === 0 ? C.yellow : accent;
        box(1.1, 1.8, 0.06, colour, group,
          [-w / 2 + 2.1 + col * 4, 4 + row * 5, d / 2 + 0.05], neon(colour, 0.65));
      }
      for (let col = 0; col < Math.floor(d / 4); col++) {
        if ((row + col * 3 + index) % 5 === 0) continue;
        box(0.06, 1.8, 1.1, accent, group,
          [-w / 2 - 0.05, 4 + row * 5, -d / 2 + 2.1 + col * 4], neon(accent, 0.65));
      }
    }
    if (index % 3 === 0) {
      box(0.4, h * 0.7, 0.25, accent, group, [w / 2 - 1.4, h * 0.53, d / 2 + 0.16], neon(accent));
      box(0.25, 7, 0.25, accent, group, [0, h * 1.13 + 4.5, 0], neon(accent));
    }
    if ([1, 5, 9, 17, 26].includes(index)) {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
      const context = canvas.getContext('2d');
      if (context) {
        const colour = `#${accent.toString(16).padStart(6, '0')}`;
        context.fillStyle = '#081426'; context.fillRect(0, 0, 256, 512);
        context.strokeStyle = colour; context.lineWidth = 7; context.strokeRect(7, 7, 242, 498);
        context.fillStyle = colour; context.textAlign = 'center'; context.font = 'bold 23px Arial'; context.fillText('CHASSIS', 128, 54);
        context.font = 'bold 101px Arial'; context.fillText(index === 5 ? 'K&C' : '07', 128, 178, 210);
        context.lineWidth = 3;
        for (let radius = 25; radius < 83; radius += 18) {
          context.beginPath(); context.arc(128, 300, radius, -Math.PI * 0.85, Math.PI * 0.75); context.stroke();
        }
        context.fillStyle = '#e5f4ff'; context.font = 'bold 20px Arial'; context.fillText('TEST / TUNE / GO', 128, 453, 214);
        const texture = own(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
        const sign = mesh(geometry('PlaneGeometry', [1, 1]), own(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })), group,
          [0, h * 0.64, d / 2 + 0.18], false);
        sign.scale.set(w * 0.72, Math.min(h * 0.55, 38), 1);
      }
    }
    return group;
  }
  for (let i = 0; i < 15; i++) {
    tower(-180 + i * 29, -185 - (i % 3) * 22, 19 + random() * 8, 18 + random() * 12, 40 + random() * 78, i);
  }
  for (let i = 0; i < 7; i++) {
    tower(183 + (i % 2) * 23, -120 + i * 40, 22 + random() * 10, 23, 47 + random() * 67, i + 16);
    tower(-230 - (i % 2) * 18, -155 + i * 50, 19 + random() * 8, 21, 34 + random() * 48, i + 24);
  }
  // A second staggered skyline gives the city depth rather than a single wall.
  for (let i = 0; i < 11; i++) tower(-215 + i * 46, -290 - (i % 2) * 35, 24, 28, 78 + random() * 85, i + 40);

  function serviceBlock(x, z, w, d, h, accent, name) {
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    box(w, h, d, C.metal, group, [0, h / 2, 0], { roughness: 0.38, metalness: 0.42 });
    box(w + 1.1, 0.5, d + 1.1, C.dark, group, [0, h + 0.25, 0]);
    box(w + 1.2, 0.25, 0.25, accent, group, [0, h + 0.6, -d / 2 - 0.5], neon(accent, 1.7));
    box(w + 1.2, 0.25, 0.25, accent, group, [0, h + 0.6, d / 2 + 0.5], neon(accent, 1.7));
    for (let i = -1; i <= 1; i++) {
      box(w / 4.6, h * 0.61, 0.08, C.glass, group, [i * w / 3, h * 0.4, -d / 2 - 0.08], { roughness: 0.12, metalness: 0.75 });
      box(w / 4.6, 0.16, 0.1, accent, group, [i * w / 3, h * 0.73, -d / 2 - 0.15], neon(accent));
      box(0.2, h * 0.65, 0.15, accent, group, [i * w / 3 - w / 9.2, h * 0.4, -d / 2 - 0.15], neon(accent, 0.8));
    }
    box(w * 0.7, 0.05, 3, accent, group, [0, 0.13, -d / 2 - 2], { ...neon(accent, 0.25), transparent: true, opacity: 0.13, depthWrite: false });
    label(name, x, h + 4, z, 19, accent);
    obstacles.push({ x, z, halfW: w / 2 + 1.4, halfD: d / 2 + 2.1 });
  }
  serviceBlock(-75, 91, 32, 16, 7, C.red, 'CHASSIS // GARAGE');
  serviceBlock(72, -105, 28, 12, 6, C.mint, 'GEOMETRY // LAB');
  const control = tower(3, 70, 8, 8, 20, 3);
  box(14, 5, 12, C.glass, control, [0, 20.7, 0], { roughness: 0.17, metalness: 0.65 });
  for (const side of [-1, 1]) box(14.2, 0.3, 0.1, C.red, control, [0, 21.8, side * 6.1], neon(C.red));
  label('DISTRICT // 07', 3, 28, 70, 19, C.red);
  obstacles.push({ x: 3, z: 70, halfW: 5, halfD: 5 });
  for (let i = 0; i < 6; i++) {
    const x = -92 + i * 6;
    box(0.13, 0.03, 9, C.mint, scene, [x, 0.12, 70], neon(C.mint, 0.5)).castShadow = false;
  }
  // Low equipment compounds in the open space add street scale without
  // placing a skyscraper between the chase camera and the player's car.
  [[27, -4], [51, 67], [-118, -45], [98, -53], [-120, 100]].forEach(([x, z], index) => {
    if (isRoad(x, z, 9)) return;
    const accent = index % 2 ? C.red : C.mint;
    box(7, 3.8, 5, C.metal, scene, [x, 1.9, z]);
    box(7.2, 0.22, 5.2, accent, scene, [x, 3.9, z], neon(accent, 0.65));
    for (let i = 0; i < 4; i++) box(0.24, 1.5, 0.1, accent, scene, [x - 2.3 + i * 1.5, 2.3, z + 2.55], neon(accent));
    obstacles.push({ x, z, halfW: 4.9, halfD: 4.6 });
  });

  function cone(x, z, parent = scene, color = C.red) {
    box(0.65, 0.1, 0.65, C.dark, parent, [x, 0.1, z]);
    cylinder(0.07, 0.29, 0.88, color, parent, [x, 0.58, z], 7);
    cylinder(0.15, 0.2, 0.18, C.white, parent, [x, 0.56, z], 7);
  }
  for (let i = 0; i < 16; i++) cone(101 + (i % 2) * 16, 6 + Math.floor(i / 2) * 6);
  for (let i = 0; i < 6; i++) cone(-95 + i * 8, 49);

  function label(text, x, y, z, width = 21, accent = C.mint) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const colour = `#${accent.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = 'rgba(5,12,27,.88)';
    ctx.beginPath(); ctx.moveTo(15, 1); ctx.lineTo(767, 1); ctx.lineTo(767, 108); ctx.lineTo(747, 127); ctx.lineTo(1, 127); ctx.lineTo(1, 15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = colour; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = colour; ctx.fillRect(0, 22, 7, 83); ctx.fillRect(22, 110, 100, 4);
    ctx.fillStyle = '#e5f4ff'; ctx.font = 'bold 43px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 390, 63, 710);
    const texture = own(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
    const mat = own(new THREE.SpriteMaterial({ map: texture, depthTest: true, transparent: true, toneMapped: false }));
    const sprite = new THREE.Sprite(mat); sprite.position.set(x, y, z); sprite.scale.set(width, width / 6, 1); scene.add(sprite);
    labels.push({ sprite, width });
  }
  STATIONS.forEach((station, index) => {
    const accent = index % 2 === 0 ? C.red : C.mint;
    const x = station.x + 10, z = station.z;
    box(0.65, 8, 0.65, C.dark, scene, [x, 4, z]);
    box(0.16, 7.4, 0.16, accent, scene, [x - 0.36, 4, z - 0.36], neon(accent, 1.6));
    box(3.8, 2.3, 0.1, accent, scene, [x + 1.5, 6.6, z], { ...neon(accent, 0.6), transparent: true, opacity: 0.28, depthWrite: false });
    ring(2.2, accent, scene, [x, 0.16, z], 0.08);
    label(station.label, x, 9.7, z, 17, accent);
  });
  // Canal-side light rail: the city has an inhabited horizon, while all
  // structures stay clear of the freely driveable road network.
  for (let i = 0; i < 28; i++) {
    box(0.2, 1.3, 0.25, C.dark, scene, [-161, 0.65, -121 + i * 9]);
    box(0.18, 0.15, 9, C.mint, scene, [-161, 1.25, -116.5 + i * 9], neon(C.mint, 0.85));
  }
  box(8, 1.2, 410, C.metal, scene, [-191, 17, -25]);
  for (const side of [-1, 1]) box(0.22, 0.2, 410, side < 0 ? C.red : C.mint, scene, [-191 + side * 3.8, 17.8, -25], neon(side < 0 ? C.red : C.mint, 0.9));
  for (let i = 0; i < 8; i++) box(2, 18, 3, C.metal, scene, [-191, 7.8, -195 + i * 50]);
  const tram = new THREE.Group(); tram.position.set(-191, 18.4, -58); scene.add(tram);
  for (let i = 0; i < 3; i++) {
    box(4.6, 3.3, 16, 0x293951, tram, [0, 1.65, i * 17]);
    box(4.7, 0.18, 15.5, C.red, tram, [0, 0.6, i * 17], neon(C.red));
    for (let j = 0; j < 5; j++) box(0.05, 1.1, 1.8, C.mint, tram, [2.34, 2.1, i * 17 - 5.5 + j * 2.7], neon(C.mint, 0.8));
  }
  // Street lamps repeat at a measured interval. Their spill is a subtle
  // emissive patch, not a costly shadow-casting point light for each pole.
  for (let i = 0; i < roadSegments.length; i += 13) {
    const { a, b, width } = roadSegments[i];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = (b.z - a.z) / length, nz = -(b.x - a.x) / length;
    const x = a.x + nx * (width / 2 + 1.2), z = a.z + nz * (width / 2 + 1.2);
    cylinder(0.1, 0.16, 6.7, C.metal, scene, [x, 3.35, z], 6);
    box(0.22, 0.22, 2.4, C.mint, scene, [x, 6.6, z], neon(C.mint, 1.5)).castShadow = false;
    const glow = mesh(geometry('CircleGeometry', [3.8, 16]), material(C.mint, { ...neon(C.mint, 0.2), transparent: true, opacity: 0.075, depthWrite: false }), scene, [x, 0.14, z], false);
    glow.rotation.x = -Math.PI / 2;
  }

  // Static environment instances keep the many windows, kerbs and road markings
  // inexpensive on mobile GPUs. Dynamic vehicles are added only afterwards.
  scene.updateMatrixWorld(true);
  const batches = new Map();
  scene.traverse(object => {
    if (!object.isMesh) return;
    const key = `${object.geometry.uuid}:${object.material.uuid}:${object.castShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(object);
  });
  for (const objects of batches.values()) {
    if (objects.length < 2) continue;
    const instance = new THREE.InstancedMesh(objects[0].geometry, objects[0].material, objects.length);
    objects.forEach((object, index) => { instance.setMatrixAt(index, object.matrixWorld); object.removeFromParent(); });
    instance.castShadow = objects[0].castShadow; instance.receiveShadow = true;
    instance.computeBoundingSphere(); scene.add(instance);
  }

  function makeCar(color, ghost = false) {
    const group = new THREE.Group();
    const paint = material(color, { roughness: 0.22, metalness: 0.48, transparent: ghost, opacity: ghost ? 0.83 : 1 });
    const shell = mesh(geometry('BoxGeometry', [1.92, 0.58, 4.25]), paint, group, [0, 0.84, 0]);
    mesh(geometry('BoxGeometry', [1.74, 0.17, 1.25]), paint, group, [0, 1.2, 1.3]);
    mesh(geometry('BoxGeometry', [1.62, 0.55, 1.8]), material(0x112f46, { roughness: 0.13, metalness: 0.7 }), group, [0, 1.37, -0.15]);
    mesh(geometry('BoxGeometry', [1.64, 0.12, 1.48]), paint, group, [0, 1.7, -0.3]);
    const windshield = box(1.59, 0.68, 0.1, 0x246b80, group, [0, 1.44, 0.72], { roughness: 0.12, metalness: 0.65 }); windshield.rotation.x = -0.45;
    box(1.55, 0.06, 0.08, C.dark, group, [0, 1.76, -0.3]);
    for (const side of [-1, 1]) {
      box(0.13, 0.55, 0.14, color, group, [side * 0.83, 1.42, -0.3]);
      box(0.28, 0.16, 0.26, color, group, [side * 1.04, 1.19, 0.63]);
      box(0.72, 0.085, 0.05, C.white, group, [side * 0.49, 0.98, 2.15], neon(C.mint, 2.2));
      box(0.71, 0.09, 0.05, C.red, group, [side * 0.49, 1.02, -2.15], neon(C.red, 1.7));
      box(0.06, 0.06, 3.2, color, group, [side * 0.97, 0.59, 0], neon(color, 1.2));
    }
    box(1.25, 0.2, 0.07, C.dark, group, [0, 0.69, 2.16]);
    box(1.85, 0.08, 0.4, C.dark, group, [0, 1.22, -1.86]);
    box(0.14, 0.015, 1.2, C.mint, group, [0, 1.293, 1.3], neon(C.mint, 0.7));
    box(2.8, 0.01, 4.9, color, group, [0, 0.055, 0], { ...neon(color, 0.6), transparent: true, opacity: 0.13, depthWrite: false });
    box(1.76, 0.12, 0.15, C.dark, group, [0, 0.57, -2.1]);
    const front = [], tires = [];
    for (const x of [-0.96, 0.96]) for (const z of [-1.31, 1.3]) {
      const pivot = new THREE.Group(); pivot.position.set(x, 0.48, z); group.add(pivot);
      const tire = cylinder(0.46, 0.46, 0.26, 0x20292d, pivot, [0, 0, 0], 16); tire.rotation.z = Math.PI / 2;
      const rim = cylinder(0.28, 0.28, 0.28, 0xc5d2d0, pivot, [0, 0, 0], 10); rim.rotation.z = Math.PI / 2;
      tires.push(tire, rim); if (z > 0) front.push(pivot);
    }
    group.userData = { front, tires, shell }; return group;
  }
  const car = makeCar(C.red); scene.add(car);
  car.position.set(state.x, 0, state.z); car.rotation.y = state.heading;

  function distanceToSegment(x, z, a, b) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
  }
  function isRoad(x, z, margin = 0) {
    if (Math.hypot(x + 43, z + 28) < 53 + margin) return true;
    if (Math.abs(x + 75) < 21 + margin && Math.abs(z - 65) < 15 + margin) return true;
    if (Math.abs(x - 65) < 15 + margin && Math.abs(z + 82) < 19 + margin) return true;
    return roadSegments.some(s => distanceToSegment(x, z, s.a, s.b) < s.width / 2 + margin);
  }
  function nearestStation() {
    const candidates = STATIONS.map(s => ({ id: s.id, d: Math.hypot(state.x - s.x, state.z - s.z) })).sort((a, b) => a.d - b.d);
    return candidates[0].d < 22 ? candidates[0].id : null;
  }
  function report(force = false, now = performance.now()) {
    if (!force && now - lastReport < 100) return;
    lastReport = now;
    options.onFrame?.({ speed: Math.abs(state.speed) * 3.6, x: state.x, z: state.z, heading: state.heading,
      near: experiment ? null : nearestStation(), mode: experiment ? 'experiment' : 'drive',
      progress: experiment ? experiment.time / experiment.duration : 0 });
  }
  function updateDrive(dt) {
    if (overview) return;
    const onRoad = isRoad(state.x, state.z);
    const targetSteer = clamp(input.steer, -1, 1) * 0.47;
    state.steering = reducedMotion ? targetSteer : lerp(state.steering, targetSteer, 1 - Math.exp(-dt * 9));
    if (input.brake) state.speed = Math.sign(state.speed) * Math.max(0, Math.abs(state.speed) - 15 * dt);
    else if (input.throttle) state.speed += input.throttle * (onRoad ? 7.5 : 4) * dt;
    else state.speed = Math.sign(state.speed) * Math.max(0, Math.abs(state.speed) - (onRoad ? 1.4 : 3.5) * dt);
    state.speed = clamp(state.speed, -5.5, onRoad ? 24 : 8);
    if (Math.abs(state.speed) < 0.02) state.speed = 0;
    state.heading += state.speed / 3.2 * Math.tan(state.steering) * dt;
    const nextX = state.x + Math.sin(state.heading) * state.speed * dt;
    const nextZ = state.z + Math.cos(state.heading) * state.speed * dt;
    const blocked = Math.abs(nextX) > 153 || nextZ > 132 || nextZ < -137 || obstacles.some(o => Math.abs(nextX - o.x) < o.halfW && Math.abs(nextZ - o.z) < o.halfD);
    if (blocked) state.speed = 0;
    else { state.x = nextX; state.z = nextZ; }
    car.position.set(state.x, 0, state.z); car.rotation.y = state.heading;
    car.userData.front.forEach(w => { w.rotation.y = state.steering; });
  }

  function samplePath(path, time) {
    let low = 0, high = path.length - 1;
    while (high - low > 1) { const mid = Math.floor((low + high) / 2); if (path[mid].t <= time) low = mid; else high = mid; }
    const a = path[low], b = path[high], fraction = clamp((time - a.t) / (b.t - a.t), 0, 1);
    return { x: lerp(a.x, b.x, fraction), y: lerp(a.y, b.y, fraction), yaw: lerp(a.yaw, b.yaw, fraction) };
  }
  function positionExperiment() {
    if (!experiment) return;
    [experiment.before, experiment.after].forEach((vehicle, i) => {
      const s = samplePath(i ? experiment.afterPath : experiment.beforePath, experiment.time);
      vehicle.position.set(s.x, 0, -s.y);
      vehicle.rotation.y = Math.PI / 2 + s.yaw;
    });
  }
  function cameraTargets() {
    const projectionKey = `${!!experiment}:${viewportWidth}:${viewportHeight}`;
    if (projectionMode !== projectionKey) {
      projectionMode = projectionKey;
      if (experiment) {
        const mobile = viewportWidth <= 600;
        camera.setViewOffset(viewportWidth, viewportHeight, mobile ? 0 : -viewportWidth * 0.16,
          viewportHeight * (mobile ? 0.17 : 0.055), viewportWidth, viewportHeight);
      } else camera.clearViewOffset();
    }
    if (experiment) {
      const { center, span } = experiment;
      const fit = Math.max(1, 1 / camera.aspect);
      wantedAim.set(center.x + 450, 0, center.z);
      wantedCamera.set(center.x + 450 + span * 0.12, (span * 1.06 + 17) * fit, center.z + (span * 1.06 + 20) * fit);
    } else if (overview) {
      const fit = Math.min(1.18, Math.max(1, 0.85 / camera.aspect));
      wantedAim.set(-5, 0, -12); wantedCamera.set(-180 * fit, 164 * fit, 205 * fit);
    } else {
      const speedScale = Math.min(Math.abs(state.speed) / 24, 1);
      wantedAim.set(state.x + Math.sin(state.heading) * 9, 1.4, state.z + Math.cos(state.heading) * 9);
      wantedCamera.set(state.x - Math.sin(state.heading) * (15 + speedScale * 4), 9 + speedScale * 2,
        state.z - Math.cos(state.heading) * (15 + speedScale * 4));
    }
  }
  function updateCamera(dt, snap = false) {
    cameraTargets();
    const alpha = snap || reducedMotion ? 1 : 1 - Math.exp(-dt * 4.5);
    camera.position.lerp(wantedCamera, alpha); aim.lerp(wantedAim, alpha); camera.lookAt(aim);
    labels.forEach(({ sprite, width }) => {
      const capped = Math.min(width, camera.position.distanceTo(sprite.position) * 0.13);
      sprite.scale.set(capped, capped / 6, 1);
    });
  }
  function renderFrame(now) {
    if (disposed || document.hidden) { raf = 0; return; }
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05); last = now;
    if (!paused) {
      if (experiment) {
        if (experiment.playing) {
          experiment.time = Math.min(experiment.duration, experiment.time + dt * 3);
          if (experiment.time >= experiment.duration) experiment.playing = false;
          positionExperiment(); dirty = true;
        }
      } else if (!overview && (state.speed || input.throttle || input.steer)) { updateDrive(dt); dirty = true; }
    }
    cameraTargets();
    const cameraMoving = camera.position.distanceToSquared(wantedCamera) > 0.0001 || aim.distanceToSquared(wantedAim) > 0.0001;
    if (cameraMoving) updateCamera(dt);
    if (dirty || cameraMoving) { renderer.render(scene, camera); dirty = false; }
    report(false, now); raf = requestAnimationFrame(renderFrame);
  }
  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    viewportWidth = width; viewportHeight = height;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true;
  }
  const observer = new ResizeObserver(resize); observer.observe(container);
  function visibility() {
    input = { throttle: 0, steer: 0, brake: false }; state.speed = 0;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!disposed && !raf) { last = performance.now(); dirty = true; raf = requestAnimationFrame(renderFrame); }
  }
  function contextLost(event) { if (disposed) return; event.preventDefault(); paused = true; options.onError?.('3D 화면 연결이 끊겼습니다. 화면을 다시 열거나 2D 미션을 이용하세요.'); }
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', visibility);
  resize(); updateCamera(0, true); renderer.render(scene, camera); dirty = false;
  last = performance.now(); raf = requestAnimationFrame(renderFrame); report(true);

  function clearExperiment() {
    if (!experiment) return;
    scene.remove(experiment.group);
    experiment.transient.forEach(resource => { resource.dispose(); resources.delete(resource); });
    experiment = null; scene.fog.near = 240; scene.fog.far = 750; car.visible = true; dirty = true;
  }
  function validPath(path) {
    return Array.isArray(path) && path.length >= 2 && path.length <= 20000 && path.every((p, i) =>
      ['t', 'x', 'y', 'yaw'].every(k => Number.isFinite(p[k])) && p.t >= 0 && Math.abs(p.x) < 10000 && Math.abs(p.y) < 10000 && (!i || p.t > path[i - 1].t));
  }
  function showExperiment({ beforePath, afterPath, playing = true } = {}) {
    if (!validPath(beforePath) || !validPath(afterPath)) throw new Error('비교할 주행 궤적이 올바르지 않습니다.');
    clearExperiment(); state.speed = 0; input = { throttle: 0, steer: 0, brake: false };
    // Clone caller data: moving a slider cannot alter an already-running replay.
    beforePath = beforePath.map(p => ({ ...p })); afterPath = afterPath.map(p => ({ ...p }));
    const group = new THREE.Group(); group.position.x = 450; scene.add(group);
    const points = [...beforePath, ...afterPath];
    const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
    const minZ = Math.min(...points.map(p => -p.y)), maxZ = Math.max(...points.map(p => -p.y));
    const center = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
    const span = Math.max(50, maxX - minX, maxZ - minZ);
    const transient = new Set();
    const transientGeo = geo => { own(geo); transient.add(geo); return geo; };
    mesh(transientGeo(new THREE.PlaneGeometry(span * 2.8, span * 2.8)), material(C.grass), group, [center.x, -0.16, center.z], false).rotation.x = -Math.PI / 2;
    // A real road follows the reference curve: deviation now reads as leaving
    // the intended lane, rather than comparing abstract lines on a grey disk.
    const roadVertices = [], roadIndices = [];
    beforePath.forEach((p, index) => {
      const previous = beforePath[Math.max(0, index - 1)], next = beforePath[Math.min(beforePath.length - 1, index + 1)];
      const heading = Math.atan2(next.y - previous.y, next.x - previous.x);
      const nx = -Math.sin(heading), nz = -Math.cos(heading);
      for (const side of [-1, 1]) roadVertices.push(p.x + nx * side * 7.5, 0.025, -p.y + nz * side * 7.5);
      if (index + 1 < beforePath.length) { const a = index * 2; roadIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      if (index % 5 === 0 && index + 5 < beforePath.length) {
        const nextCurb = beforePath[index + 5], length = Math.hypot(nextCurb.x - p.x, nextCurb.y - p.y);
        for (const side of [-1, 1]) {
          const curb = box(0.8, 0.12, length * 0.94, (Math.floor(index / 5) % 2) ? C.white : C.red, group,
            [(p.x + nextCurb.x) / 2 + nx * side * 7.7, 0.07, -(p.y + nextCurb.y) / 2 + nz * side * 7.7]);
          curb.rotation.y = Math.PI / 2 + heading; curb.castShadow = false;
        }
      }
      if (index % 25 === 0) cone(p.x + nx * 11, -p.y + nz * 11, group);
    });
    const roadGeometry = transientGeo(new THREE.BufferGeometry());
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3)); roadGeometry.setIndex(roadIndices); roadGeometry.computeVertexNormals();
    mesh(roadGeometry, material(0x355169, { side: THREE.DoubleSide, roughness: 0.7, metalness: 0.12 }), group, [0, 0, 0], false);
    const before = makeCar(C.mint, true), after = makeCar(C.red);
    // Cars are enlarged visual markers; all path coordinates stay in metres.
    before.scale.setScalar(2.8); after.scale.setScalar(2.8); group.add(before, after);
    const makeTrace = (path, color, dashed) => {
      const positions = path.map(p => new THREE.Vector3(p.x, 0.12, -p.y));
      const curve = new THREE.CatmullRomCurve3(positions, false, 'catmullrom', 0);
      if (!dashed) mesh(transientGeo(new THREE.TubeGeometry(curve, Math.min(path.length, 600), 0.3, 5, false)), material(color, neon(color, 0.9)), group, [0, 0, 0], false);
      else {
        const length = curve.getLength(), segments = Math.ceil(length / 5);
        const samples = curve.getSpacedPoints(segments * 2);
        for (let i = 0; i + 1 < samples.length; i += 2) {
          const a = samples[i], b = samples[i + 1];
          const distance = a.distanceTo(b);
          const strip = mesh(geometry('BoxGeometry', [1, 1, 1]), material(color, neon(color, 0.9)), group,
            [(a.x + b.x) / 2, 0.16, (a.z + b.z) / 2], false);
          strip.scale.set(0.65, 0.045, distance);
          strip.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        }
      }
    };
    makeTrace(beforePath, C.mint, true); makeTrace(afterPath, C.red, false);
    const start = beforePath[0];
    for (let i = 0; i < 8; i++) box(1.5, 0.04, 1.3, i % 2 ? C.white : C.dark, group, [start.x - 0.5, 0.2, -start.y - 5.25 + i * 1.5]);
    experiment = { group, before, after, beforePath, afterPath, center, span, transient,
      duration: Math.min(beforePath.at(-1).t, afterPath.at(-1).t), time: 0, playing: !!playing };
    // Portrait fits need a greater camera distance; free-world haze must not
    // erase the experiment. Its geometry uses the same scale on every screen.
    scene.fog.near = 2500; scene.fog.far = 5000;
    car.visible = false; positionExperiment(); updateCamera(0, true); dirty = true; report(true);
  }

  return {
    drive(next = {}) {
      input = { throttle: clamp(Number(next.throttle) || 0, -1, 1), steer: clamp(Number(next.steer) || 0, -1, 1), brake: !!next.brake };
      if (input.throttle || input.steer) overview = false;
      dirty = true;
    },
    teleport(id) {
      const station = STATIONS.find(s => s.id === id); if (!station) return false;
      clearExperiment(); Object.assign(state, { x: station.x, z: station.z, heading: station.heading, speed: 0, steering: 0 });
      input = { throttle: 0, steer: 0, brake: false }; car.position.set(state.x, 0, state.z); car.rotation.y = state.heading;
      overview = false; updateCamera(0, true); dirty = true; report(true); return true;
    },
    setOverview(value) { overview = !!value; if (overview) { state.speed = 0; input = { throttle: 0, steer: 0, brake: false }; } dirty = true; },
    setPaused(value) { paused = !!value; if (paused) { input = { throttle: 0, steer: 0, brake: false }; state.speed = 0; } dirty = true; },
    showExperiment,
    setExperimentTime(fraction) { if (!experiment) return; experiment.playing = false; experiment.time = clamp(Number(fraction) || 0, 0, 1) * experiment.duration; positionExperiment(); dirty = true; report(true); },
    clearExperiment() { clearExperiment(); updateCamera(0, true); report(true); },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      scene.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      resources.forEach(resource => resource.dispose()); resources.clear(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    }
  };
}
