import * as THREE from './vendor/three.module.min.js';
import { createRacer } from './world-racer.js';
import { CYBER_COLORS, createCyberDistrict, createStreetCar } from './world-cyber.js';
import { VILLAGE_COLORS, createVillageDistrict, createVillageCar } from './world-village.js';
import { COASTAL_COLORS, createCoastalDistrict, createCoastalCar } from './world-coastal.js';
import './world-boost.js';

const B = globalThis.WorldBoost;

// Positions are metres in the freely drivable proving ground. Vehicles face +z.
export const STATIONS = Object.freeze([
  { id: 'cornering', label: '코너링 서킷', x: -43, z: -28, heading: Math.PI / 2 },
  { id: 'bump', label: '승차감 로드', x: 109, z: 28, heading: Math.PI },
  { id: 'geometry', label: '지오메트리 랩', x: 65, z: -82, heading: -Math.PI / 2 },
  { id: 'garage', label: '정비소', x: -75, z: 66, heading: Math.PI }
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const FORMULA_COLORS = {
  sky: 0xbcd9ec, grass: 0x72a695, asphalt: 0x394b60, roadEdge: 0xb1c4ce,
  white: 0xf3f7ff, red: 0xef4d5b, mint: 0x27d8e8, yellow: 0xf4c85b,
  sea: 0x68bace, metal: 0x728ba6, glass: 0x315b7c, dark: 0x12223c, blue: 0x245eea
};

export function createWorld(container, options = {}) {
  if (!container?.appendChild) throw new Error('주행 화면을 열 수 없습니다.');
  const cyberpunk = options.theme === 'cyberpunk', village = options.theme === 'village', coastal = options.theme === 'coastal';
  const C = cyberpunk ? CYBER_COLORS : village ? VILLAGE_COLORS : coastal ? COASTAL_COLORS : FORMULA_COLORS;
  const fogNear = cyberpunk ? 240 : 320, fogFar = cyberpunk ? 750 : 850;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cyberpunk ? 1.12 : coastal ? 1.18 : village ? 1.12 : 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-label', cyberpunk ? '네온시티 야간 시험장 3D 주행 화면' : village ? '아기자기한 정비소 마을 3D 주행 화면' : coastal ? '해안 자동차 시험장 3D 주행 화면' : '포뮬러 레이스 테스트 캠프 3D 주행 화면');
  renderer.domElement.setAttribute('role', 'img');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.sky);
  scene.fog = new THREE.Fog(C.sky, fogNear, fogFar);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.3, 4000);
  const resources = new Set();
  const materials = new Map();
  const geometries = new Map();
  const labels = [];
  let disposed = false, paused = false, overview = true, showcase = false, dirty = true;
  let raf = 0, last = 0, lastReport = -Infinity, experiment = null;
  let input = { throttle: 0, steer: 0, brake: false, boost: false };
  let boost = B.create();
  const reducedMotion = !!options.reducedMotion;
  const state = { x: -75, z: 66, heading: Math.PI, speed: 0, steering: 0 };
  const aim = new THREE.Vector3(0, 0, -2);
  const wantedCamera = new THREE.Vector3(), wantedAim = new THREE.Vector3();
  let viewportWidth = 1, viewportHeight = 1, projectionMode = '';

  const own = resource => { resources.add(resource); return resource; };
  function material(color, settings = {}) {
    const key = JSON.stringify([color, settings]);
    if (!materials.has(key)) materials.set(key, own(new THREE.MeshStandardMaterial({ color, roughness: color === C.asphalt ? (cyberpunk ? 0.24 : 0.88) : 0.66, metalness: color === C.asphalt ? (cyberpunk ? 0.45 : 0.05) : 0.12, ...settings })));
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
      if (cyberpunk) {
        ribbon(0.16, side * (width / 2 - 0.6), 0.125, C.mint, neon(C.mint, 1.1));
        ribbon(0.8, side * (width / 2 - 1), 0.081, C.mint, { ...neon(C.mint, 0.4), transparent: true, opacity: 0.12, depthWrite: false });
      } else {
        ribbon(0.18, side * (width / 2 - 0.6), 0.125, C.white);
        if (closed && !coastal && !village) ribbon(0.95, side * (width / 2 + 0.2), 0.085, C.white);
      }
    }
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      roadSegments.push({ a, b, width });
      if (marked && i % 4 < 2) roadSegment(a, b, 0.14, cyberpunk || coastal || village ? C.yellow : C.white, 0.08);
      if (!cyberpunk && !coastal && !village && closed && i % 2 === 0) {
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        const nx = (b.z - a.z) / length, nz = -(b.x - a.x) / length;
        for (const side of [-1, 1]) {
          const offset = side * (width / 2 + 0.2);
          roadSegment({ x: a.x + nx * offset, z: a.z + nz * offset },
            { x: b.x + nx * offset, z: b.z + nz * offset }, 0.95, C.red, 0.09);
        }
      }
    }
  }

  // Every world stays readable without bloom, strobing or extra render passes.
  scene.add(new THREE.HemisphereLight(cyberpunk ? 0x96cfff : coastal ? 0xe0f1fa : 0xe5f5ff, cyberpunk ? 0x263054 : coastal ? 0x68845b : 0x667f70, cyberpunk ? 2.8 : coastal ? 2.9 : 2.2));
  const sun = new THREE.DirectionalLight(cyberpunk ? 0xb3d4ff : coastal ? 0xffebca : 0xfff1d8, cyberpunk ? 2.2 : coastal ? 3.4 : village ? 2.8 : 3.1);
  sun.position.set(-85, 160, 75);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 155, bottom: -155, near: 1, far: 370 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.25;
  scene.add(sun);
  const skyFill = new THREE.DirectionalLight(cyberpunk ? 0xff78c0 : 0xb2deff, cyberpunk ? 1.05 : 0.6);
  skyFill.position.set(150, 65, -170); scene.add(skyFill);

  box(490, 1.1, 620, C.grass, scene, [80, -0.62, -45], { roughness: cyberpunk ? 0.44 : 0.98 }).castShadow = false;
  box(430, 0.2, 1100, C.sea, scene, [-382, -1.7, -50], { roughness: cyberpunk ? 0.14 : 0.36, metalness: cyberpunk ? 0.58 : 0.16 }).castShadow = false;
  box(28, 0.3, 610, cyberpunk ? C.metal : coastal ? 0xd3ca9a : village ? 0xe5dcc2 : 0xe3ddc8, scene, [-176, -0.4, -45]).castShadow = false;

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
    const object = mesh(g, material(color, cyberpunk ? neon(color, 0.65) : {}), parent, center, false);
    object.rotation.x = Math.PI / 2;
    return object;
  };
  [20, 35, 49].forEach(r => ring(r, cyberpunk ? C.mint : C.white));
  ring(51.5, coastal ? C.yellow : C.red, scene, [-43, 0.1, -28], coastal ? 0.22 : 0.32);
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
  let villageDistrict = null;
  if (cyberpunk || village || coastal) {
    const createDistrict = cyberpunk ? createCyberDistrict : village ? createVillageDistrict : createCoastalDistrict;
    const district = createDistrict({ THREE, scene, own, geometry, material, mesh, box, cylinder, neon, C, label, isRoad, obstacles, roadSegments });
    if (village) { villageDistrict = district; villageDistrict.setLevel(options.villageLevel); }
  } else {
    // Race facilities sit outside the road network. Repeated seats, guardrails
    // and kerbs are instanced after construction to keep mobile draw calls low.
    function banner(text, width, height, parent, position, color = C.blue, rotation = 0) {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`; ctx.fillRect(0, 0, 1024, 160);
      ctx.fillStyle = '#f3f7ff'; ctx.fillRect(0, 136, 1024, 9);
      ctx.font = 'italic bold 77px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, 512, 78, 940);
      const texture = own(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
      const board = mesh(geometry('PlaneGeometry', [1, 1]), own(new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false })), parent, position, false);
      board.scale.set(width, height, 1); board.rotation.y = rotation;
    }
    function grandstand(x, z, width, rotation = 0) {
      const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = rotation; scene.add(group);
      box(width + 4, 0.4, 21, C.roadEdge, group, [0, 0, -5]);
      for (let row = 0; row < 6; row++) {
        const height = 0.8 + row * 1.1, depth = -row * 2.3;
        box(width, height, 2.3, row % 2 ? 0xcbd7df : C.white, group, [0, height / 2, depth]);
        for (let col = 0; col < Math.floor(width / 1.7); col++) {
          const seatColor = col % 13 < 4 ? C.red : col % 13 < 9 ? C.blue : C.white;
          box(1.05, 0.5, 0.75, seatColor, group, [-width / 2 + 1 + col * 1.7, height + 0.24, depth - 0.25]);
        }
      }
      for (let x = -width / 2 + 2; x <= width / 2; x += 16) {
        box(0.45, 11.4, 0.5, C.metal, group, [x, 5.7, -13]);
        box(0.35, 0.35, 19, C.metal, group, [x, 11.1, -5]);
      }
      const roof = box(width + 5, 0.28, 21, C.white, group, [0, 11.7, -5]); roof.rotation.x = -0.09;
      box(width + 5, 0.65, 0.3, C.blue, group, [0, 11.05, 5.5]);
      banner('CHASSIS  GRAND PRIX', width * 0.88, 2.4, group, [0, 9.1, -13.3]);
      for (let x = -width / 2 + 1; x < width / 2; x += 6) box(0.14, 1.2, 0.16, C.metal, group, [x, 0.9, 2.2]);
      box(width, 0.12, 0.16, C.metal, group, [0, 1.5, 2.2]);
    }
    grandstand(-4, -158, 118);
    grandstand(175, -21, 104, -Math.PI / 2);
    grandstand(34, 155, 86, Math.PI);

    function pitBuilding(x, z, w, d, accent, name) {
      const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
      box(w, 6.5, d, C.white, group, [0, 3.25, 0]);
      box(w + 1, 0.55, d + 1, accent, group, [0, 6.8, 0]);
      box(w + 2, 0.3, 4, C.white, group, [0, 5.4, -d / 2 - 1.4]);
      for (let i = -1; i <= 1; i++) {
        box(w / 4.5, 4.1, 0.12, C.dark, group, [i * w / 3, 2.1, -d / 2 - 0.08]);
        box(w / 4.5 - 0.3, 0.9, 0.16, C.glass, group, [i * w / 3, 3.4, -d / 2 - 0.16]);
        box(0.25, 4.6, 0.3, accent, group, [i * w / 3 - w / 9, 2.3, -d / 2 - 0.16]);
        box(w / 4.5, 0.05, 6, accent, group, [i * w / 3, 0.12, -d / 2 - 3.3]);
      }
      banner(name, w * 0.88, 2.1, group, [0, 7.9, -d / 2 - 0.25], accent, Math.PI);
      box(w * 0.86, 2.5, d * 0.62, C.glass, group, [0, 8.3, 1], { roughness: 0.18, metalness: 0.4 });
      box(w * 0.9, 0.3, d * 0.72, C.white, group, [0, 9.7, 1]);
      obstacles.push({ x, z, halfW: w / 2 + 1.4, halfD: d / 2 + 2.1 });
    }
    pitBuilding(-75, 91, 32, 16, C.blue, 'CHASSIS  PIT');
    pitBuilding(72, -105, 28, 12, C.red, 'GEOMETRY  LAB');
    const control = new THREE.Group(); control.position.set(3, 0, 70); scene.add(control);
    box(7, 17, 7, C.white, control, [0, 8.5, 0]);
    box(1.3, 17.2, 7.2, C.blue, control, [-2.4, 8.6, 0]);
    box(14, 4, 12, C.glass, control, [0, 18.3, 0], { roughness: 0.2, metalness: 0.35 });
    box(15.5, 0.65, 13.5, C.white, control, [0, 20.6, 0]);
    box(14.3, 0.6, 12.3, C.red, control, [0, 16.3, 0]);
    cylinder(0.1, 0.1, 7, C.metal, control, [0, 24.2, 0], 6);
    label('RACE CONTROL', 3, 24, 70, 18, C.blue);
    obstacles.push({ x: 3, z: 70, halfW: 5, halfD: 5 });
    for (let i = 0; i < 6; i++) box(0.14, 0.035, 9, C.white, scene, [-92 + i * 6, 0.12, 70]).castShadow = false;

    // The start gantry and ground chequerboard make the test road a circuit.
    const gantry = new THREE.Group(); gantry.position.set(-75, 0, 38); scene.add(gantry);
    for (const side of [-1, 1]) {
      box(0.7, 8.5, 0.8, C.white, gantry, [side * 7.3, 4.25, 0]);
      box(1.2, 2.6, 1.2, C.blue, gantry, [side * 7.3, 1.3, 0]);
    }
    box(15.3, 2.1, 0.7, C.white, gantry, [0, 7.7, 0]);
    banner('CHASSIS  FORMULA', 13.8, 1.65, gantry, [0, 7.7, -0.38], C.blue, Math.PI);
    banner('CHASSIS  FORMULA', 13.8, 1.65, gantry, [0, 7.7, 0.38], C.blue);
    for (let col = 0; col < 12; col++) for (let row = 0; row < 2; row++) {
      box(0.85, 0.04, 0.85, (col + row) % 2 ? C.white : C.dark, gantry, [-4.7 + col * 0.85, 0.14, row * 0.85]);
    }
    for (let i = 0; i < 5; i++) {
      const lamp = cylinder(0.23, 0.23, 0.08, C.red, gantry, [-1.4 + i * 0.7, 6.45, -0.1]); lamp.rotation.x = Math.PI / 2;
    }
    for (const side of [-1, 1]) obstacles.push({ x: -75 + side * 7.3, z: 38, halfW: 1.3, halfD: 1.5 });

    function raceFlag(x, z, index) {
      const color = index % 2 ? C.red : C.blue;
      cylinder(0.08, 0.12, 9, C.metal, scene, [x, 4.5, z], 7);
      const flag = box(2.5, 3.5, 0.035, color, scene, [x + 1.3, 6.8, z]); flag.rotation.y = -0.28;
      box(1.5, 0.23, 0.05, C.white, scene, [x + 1.3, 7.5, z - 0.35]);
      box(1.5, 0.23, 0.05, C.white, scene, [x + 1.3, 6.9, z - 0.35]);
    }
    for (let i = 0; i < 11; i++) raceFlag(-136 + i * 26, -134, i);
    for (let i = 0; i < 7; i++) raceFlag(-151, -85 + i * 31, i + 1);
    // A few low service trailers preserve a sense of scale without hiding roads.
    [[27, -4], [51, 67], [-118, -45], [98, -53], [-120, 100]].forEach(([x, z], index) => {
      if (isRoad(x, z, 9)) return;
      const accent = index % 2 ? C.red : C.blue;
      box(7, 2.7, 4, C.white, scene, [x, 1.8, z]);
      box(7.1, 0.6, 4.1, accent, scene, [x, 2.3, z]);
      for (const side of [-1, 1]) box(0.45, 0.65, 0.65, C.dark, scene, [x + side * 2.4, 0.6, z + 2.1]);
      obstacles.push({ x, z, halfW: 4.9, halfD: 4.6 });
    });

    // Low safety rails and sponsor panels frame the coast without a city wall.
    for (let i = 0; i < 28; i++) {
      const z = -121 + i * 9;
      box(0.18, 1.2, 0.25, C.metal, scene, [-158, 0.6, z]);
      box(0.25, 0.3, 9, C.white, scene, [-158, 0.85, z + 4.5]);
      if (i % 4 === 0) {
        const group = new THREE.Group(); group.position.set(-157.7, 1.8, z); group.rotation.y = Math.PI / 2; scene.add(group);
        banner(i % 8 === 0 ? 'CHASSIS' : 'FORMULA', 7, 1.5, group, [0, 0, 0], i % 8 === 0 ? C.blue : C.red);
      }
    }

  }

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
    ctx.fillStyle = cyberpunk ? 'rgba(5,12,27,.88)' : village ? 'rgba(255,247,229,.97)' : 'rgba(243,247,255,.96)';
    ctx.beginPath(); ctx.moveTo(15, 1); ctx.lineTo(767, 1); ctx.lineTo(767, 108); ctx.lineTo(747, 127); ctx.lineTo(1, 127); ctx.lineTo(1, 15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = colour; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = colour; ctx.fillRect(0, 22, 7, 83); ctx.fillRect(22, 110, 100, 4);
    ctx.fillStyle = cyberpunk ? '#e5f4ff' : '#12223c'; ctx.font = 'bold 43px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 390, 63, 710);
    const texture = own(new THREE.CanvasTexture(canvas)); texture.colorSpace = THREE.SRGBColorSpace;
    const mat = own(new THREE.SpriteMaterial({ map: texture, depthTest: true, transparent: true, toneMapped: false }));
    const sprite = new THREE.Sprite(mat); sprite.position.set(x, y, z); sprite.scale.set(width, width / 6, 1); scene.add(sprite);
    labels.push({ sprite, width });
  }
  STATIONS.forEach((station, index) => {
    const accent = index % 2 === 0 ? C.red : (cyberpunk ? C.mint : C.blue);
    const x = station.x + 10, z = station.z;
    box(0.45, 8, 0.45, cyberpunk ? C.dark : C.white, scene, [x, 4, z]);
    box(0.18, 7.4, 0.18, accent, scene, [x - 0.25, 4, z - 0.25], cyberpunk ? neon(accent, 1.6) : {});
    box(3.8, 2.3, 0.1, accent, scene, [x + 1.5, 6.6, z], cyberpunk ? { ...neon(accent, 0.6), transparent: true, opacity: 0.28, depthWrite: false } : { roughness: 0.65 });
    ring(2.2, accent, scene, [x, 0.16, z], 0.08);
    label(station.label, x, 9.7, z, 17, accent);
  });
  // Static environment instances keep the seats, kerbs and road markings
  // inexpensive on mobile GPUs. Dynamic vehicles are added only afterwards.
  scene.updateMatrixWorld(true);
  const batches = new Map();
  scene.traverse(object => {
    if (!object.isMesh || object.userData.preserveVisibility) return;
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
    const createCar = cyberpunk ? createStreetCar : village ? createVillageCar : coastal ? createCoastalCar : createRacer;
    return createCar({ THREE, own, geometry, material, mesh, box, cylinder, neon, C }, color, ghost);
  }
  const car = makeCar(cyberpunk || coastal ? C.red : C.blue); scene.add(car);
  car.position.set(state.x, 0, state.z); car.rotation.y = state.heading;
  function releaseBoost() {
    boost = { ...boost, active: false };
    car.userData.boostFlames.forEach(flame => { flame.visible = false; });
  }

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
  function isBlocked(x, z) {
    return Math.abs(x) > 153 || z > 132 || z < -137 || obstacles.some(o => Math.abs(x - o.x) < o.halfW && Math.abs(z - o.z) < o.halfD);
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
      progress: experiment ? experiment.time / experiment.duration : 0, playing: Boolean(experiment?.playing),
      boostEnergy: boost.energy, boosting: boost.active });
  }
  function updateDrive(dt) {
    if (overview) return;
    const onRoad = isRoad(state.x, state.z);
    const targetSteer = clamp(input.steer, -1, 1) * 0.47;
    state.steering = reducedMotion ? targetSteer : lerp(state.steering, targetSteer, 1 - Math.exp(-dt * 9));
    if (input.brake) state.speed = Math.sign(state.speed) * Math.max(0, Math.abs(state.speed) - 15 * dt);
    else if (input.throttle) {
      const topSpeed = onRoad ? (boost.active ? 32 : 24) : 8;
      if (input.throttle < 0 || state.speed < topSpeed) {
        const acceleration = onRoad ? (boost.active ? 13 : 7.5) : 4;
        state.speed += input.throttle * acceleration * dt;
        if (input.throttle > 0) state.speed = Math.min(state.speed, topSpeed);
      } else if (state.speed > topSpeed) state.speed = Math.max(topSpeed, state.speed - 2.8 * dt);
    } else state.speed = Math.sign(state.speed) * Math.max(0, Math.abs(state.speed) - (onRoad ? 1.4 : 3.5) * dt);
    // Boost release coasts down naturally instead of snapping from 32 to 24 m/s.
    state.speed = clamp(state.speed, -5.5, onRoad ? 32 : 8);
    if (Math.abs(state.speed) < 0.02) state.speed = 0;
    state.heading += state.speed / 3.2 * Math.tan(state.steering) * dt;
    const nextX = state.x + Math.sin(state.heading) * state.speed * dt;
    const nextZ = state.z + Math.cos(state.heading) * state.speed * dt;
    if (isBlocked(nextX, nextZ)) state.speed = 0;
    else { state.x = nextX; state.z = nextZ; }
    car.position.set(state.x, 0, state.z); car.rotation.y = state.heading;
    car.userData.front.forEach(w => { w.rotation.y = state.steering; });
    car.userData.tires.forEach(wheel => { wheel.rotateY(-state.speed / 0.43 * dt); });
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
    const projectionKey = `${!!experiment}:${showcase}:${viewportWidth}:${viewportHeight}`;
    if (projectionMode !== projectionKey) {
      projectionMode = projectionKey;
      if (experiment) {
        const mobile = viewportWidth <= 600;
        camera.setViewOffset(viewportWidth, viewportHeight, mobile ? 0 : -viewportWidth * 0.16,
          viewportHeight * (mobile ? 0.17 : 0.055), viewportWidth, viewportHeight);
      } else if (showcase) {
        const mobile = viewportWidth <= 600;
        camera.setViewOffset(viewportWidth, viewportHeight, mobile ? 0 : -viewportWidth * (village ? 0.12 : 0.19),
          viewportHeight * (mobile ? -0.13 : 0.01), viewportWidth, viewportHeight);
      } else camera.clearViewOffset();
    }
    if (experiment) {
      const { center, span } = experiment;
      const fit = Math.max(1, 1 / camera.aspect);
      wantedAim.set(center.x + 450, 0, center.z);
      wantedCamera.set(center.x + 450 + span * 0.12, (span * 1.06 + 17) * fit, center.z + (span * 1.06 + 20) * fit);
    } else if (showcase) {
      const fit = Math.min(village ? 2.8 : 2.1, Math.max(1, (village ? 0.95 : 0.75) / camera.aspect));
      if (village) {
        wantedAim.set(state.x, 3.2, state.z + 10);
        wantedCamera.set(state.x - 26 * fit, 18 * fit, state.z - 31 * fit);
      } else {
        wantedAim.set(state.x, 0.7, state.z);
        wantedCamera.set(state.x + (Math.sin(state.heading) * 8.8 + Math.cos(state.heading) * 6.3) * fit,
          4.1 * fit, state.z + (Math.cos(state.heading) * 8.8 - Math.sin(state.heading) * 6.3) * fit);
      }
    } else if (overview) {
      const fit = Math.min(1.18, Math.max(1, 0.85 / camera.aspect));
      wantedAim.set(cyberpunk ? -5 : -12, 0, -12);
      wantedCamera.set((cyberpunk ? -180 : -176) * fit, (cyberpunk ? 164 : 135) * fit, (cyberpunk ? 205 : 185) * fit);
    } else {
      const speedScale = Math.min(Math.abs(state.speed) / 24, 1);
      const lookAhead = cyberpunk ? 9 : 5.5;
      const distance = cyberpunk ? 15 + speedScale * 4 : 10.8 + speedScale * 2.3;
      wantedAim.set(state.x + Math.sin(state.heading) * lookAhead, cyberpunk ? 1.4 : 0.8, state.z + Math.cos(state.heading) * lookAhead);
      wantedCamera.set(state.x - Math.sin(state.heading) * distance, cyberpunk ? 9 + speedScale * 2 : 4.6 + speedScale * 0.7,
        state.z - Math.cos(state.heading) * distance);
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
      const previousBoost = boost;
      boost = B.step(boost, { requested: input.boost, eligible: !experiment && !overview && input.throttle > 0 && state.speed >= 0 && isRoad(state.x, state.z) && !input.brake, dt });
      if (boost.active !== previousBoost.active) dirty = true;
      car.userData.boostFlames.forEach(flame => {
        flame.visible = boost.active;
        flame.scale.z = boost.active ? 1 + Math.min(Math.abs(state.speed) / 32, 1) * 0.7 : 1;
      });
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
    input = { throttle: 0, steer: 0, brake: false, boost: false }; state.speed = 0; releaseBoost();
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
    experiment = null; scene.fog.near = fogNear; scene.fog.far = fogFar; car.visible = true; dirty = true;
  }
  function validPath(path) {
    return Array.isArray(path) && path.length >= 2 && path.length <= 20000 && path.every((p, i) =>
      ['t', 'x', 'y', 'yaw'].every(k => Number.isFinite(p[k])) && p.t >= 0 && Math.abs(p.x) < 10000 && Math.abs(p.y) < 10000 && (!i || p.t > path[i - 1].t));
  }
  function showExperiment({ beforePath, afterPath, playing = true } = {}) {
    if (!validPath(beforePath) || !validPath(afterPath)) throw new Error('비교할 주행 궤적이 올바르지 않습니다.');
    clearExperiment(); showcase = false; state.speed = 0; input = { throttle: 0, steer: 0, brake: false, boost: false }; releaseBoost();
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
    mesh(roadGeometry, material(cyberpunk ? 0x355169 : C.asphalt, { side: THREE.DoubleSide, roughness: 0.85, metalness: 0.05 }), group, [0, 0, 0], false);
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
    setVillageGrowth(level) { if (!villageDistrict || disposed) return; villageDistrict.setLevel(level); dirty = true; },
    getDriveState() { return { ...state, boost: { ...boost }, overview }; },
    restoreDriveState(saved) {
      clearExperiment(); showcase = false;
      Object.assign(state, { x: saved.x, z: saved.z, heading: saved.heading, steering: saved.steering, speed: 0 });
      if (isBlocked(state.x, state.z)) {
        const station = STATIONS.filter(s => !isBlocked(s.x, s.z)).sort((a, b) =>
          Math.hypot(state.x - a.x, state.z - a.z) - Math.hypot(state.x - b.x, state.z - b.z))[0];
        Object.assign(state, { x: station.x, z: station.z, heading: station.heading, steering: 0 });
      }
      boost = { ...saved.boost, active: false }; overview = saved.overview;
      input = { throttle: 0, steer: 0, brake: false, boost: false };
      car.position.set(state.x, 0, state.z); car.rotation.y = state.heading;
      car.userData.front.forEach(wheel => { wheel.rotation.y = state.steering; });
      releaseBoost(); updateCamera(0, true); dirty = true; report(true);
    },
    drive(next = {}) {
      input = { throttle: clamp(Number(next.throttle) || 0, -1, 1), steer: clamp(Number(next.steer) || 0, -1, 1), brake: !!next.brake, boost: !!next.boost };
      if (input.throttle || input.steer) { overview = false; showcase = false; }
      dirty = true;
    },
    teleport(id) {
      const station = STATIONS.find(s => s.id === id); if (!station) return false;
      clearExperiment(); showcase = false; releaseBoost(); Object.assign(state, { x: station.x, z: station.z, heading: station.heading, speed: 0, steering: 0 });
      input = { throttle: 0, steer: 0, brake: false, boost: false }; car.position.set(state.x, 0, state.z); car.rotation.y = state.heading;
      overview = false; updateCamera(0, true); dirty = true; report(true); return true;
    },
    setOverview(value) { showcase = false; overview = !!value; if (overview) { state.speed = 0; input = { throttle: 0, steer: 0, brake: false, boost: false }; releaseBoost(); } dirty = true; },
    setShowcase(value) { showcase = !!value && !cyberpunk; overview = !!value; state.speed = 0; input = { throttle: 0, steer: 0, brake: false, boost: false }; releaseBoost(); updateCamera(0, true); dirty = true; },
    setPaused(value) { paused = !!value; if (paused) { input = { throttle: 0, steer: 0, brake: false, boost: false }; state.speed = 0; releaseBoost(); } dirty = true; },
    showExperiment,
    setExperimentTime(fraction, playing = false) { if (!experiment) return; experiment.time = clamp(Number(fraction) || 0, 0, 1) * experiment.duration; experiment.playing = !!playing && experiment.time < experiment.duration; positionExperiment(); dirty = true; report(true); },
    clearExperiment() { clearExperiment(); updateCamera(0, true); report(true); },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      scene.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      resources.forEach(resource => resource.dispose()); resources.clear(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    }
  };
}
