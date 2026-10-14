// A small handmade garage town. All resources belong to the active world;
// repeated pieces share geometry and become instances before cars are added.
export const VILLAGE_COLORS = {
  sky: 0xbadce7, grass: 0x9bbb83, asphalt: 0x687b7d, roadEdge: 0xcdd1b4,
  white: 0xfff7e5, red: 0xdf8069, mint: 0x28b4bb, yellow: 0xe4bc5c,
  sea: 0x87bec4, metal: 0x82968e, glass: 0x80b6be, dark: 0x354e50, blue: 0x438a86
};

const shapeCaches = new WeakMap();
function shapes(api) {
  if (!shapeCaches.has(api.geometry)) shapeCaches.set(api.geometry, new Map());
  return shapeCaches.get(api.geometry);
}
function roundedGeometry(api, w, h, d, r) {
  r = Math.min(r, w / 2, h / 2, d / 2);
  const cache = shapes(api), key = `rounded:${w}:${h}:${d}:${r}`;
  if (!cache.has(key)) {
    const geo = new api.THREE.BoxGeometry(w, h, d, 8, 8, 8);
    const points = geo.attributes.position, normal = new api.THREE.Vector3();
    const half = [w / 2 - r, h / 2 - r, d / 2 - r];
    for (let i = 0; i < points.count; i++) {
      const p = [points.getX(i), points.getY(i), points.getZ(i)];
      const core = p.map((n, axis) => Math.max(-half[axis], Math.min(half[axis], n)));
      normal.set(p[0] - core[0], p[1] - core[1], p[2] - core[2]).normalize().multiplyScalar(r);
      points.setXYZ(i, core[0] + normal.x, core[1] + normal.y, core[2] + normal.z);
    }
    geo.computeVertexNormals(); cache.set(key, api.own(geo));
  }
  return cache.get(key);
}

export function createVillageDistrict(api) {
  const { THREE, scene, own, geometry, material, mesh, box, cylinder, C, label, isRoad, obstacles } = api;
  function roundBox(w, h, d, radius, color, parent, position) {
    return mesh(roundedGeometry(api, w, h, d, radius), material(color), parent, position);
  }
  function roof(w, h, d, color, parent, position) {
    const key = `roof:${w}:${h}:${d}`, cache = shapes(api);
    if (!cache.has(key)) {
      const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0); shape.lineTo(0, h); shape.lineTo(w / 2, 0); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, steps: 1 }); geo.translate(0, 0, -d / 2);
      cache.set(key, own(geo));
    }
    return mesh(cache.get(key), material(color), parent, position);
  }
  function tree(x, z, scale = 1, tint = 0x6f9f70) {
    if (isRoad(x, z, 3.2 * scale)) return;
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    cylinder(0.35 * scale, 0.52 * scale, 3.8 * scale, 0x9c8466, group, [0, 1.9 * scale, 0], 8);
    const crown = mesh(geometry('IcosahedronGeometry', [1, 2]), material(tint), group, [0, 5.1 * scale, 0]);
    crown.scale.set(3.1 * scale, 3.7 * scale, 2.9 * scale);
    const tuft = mesh(geometry('IcosahedronGeometry', [1, 2]), material(0x9fbc7d), group, [-1.1 * scale, 6.8 * scale, 0.5 * scale]);
    tuft.scale.setScalar(1.7 * scale);
    if (Math.abs(x) < 145 && z > -130 && z < 125) obstacles.push({ x, z, halfW: 0.9 * scale, halfD: 0.9 * scale });
  }
  function planter(x, z, parent = scene) {
    roundBox(3, 0.85, 1.6, 0.18, 0xe8bea0, parent, [x, 0.5, z]);
    box(2.6, 0.1, 1.25, 0x9b896c, parent, [x, 0.95, z]);
    for (let i = 0; i < 4; i++) {
      const leaf = mesh(geometry('IcosahedronGeometry', [0.45, 1]), material(i % 2 ? 0x83a86c : 0x6f9f70), parent, [x - 0.9 + i * 0.6, 1.25, z]); leaf.scale.y = 1.35;
      mesh(geometry('SphereGeometry', [0.2, 8, 6]), material(i % 2 ? C.yellow : C.red), parent, [x - 0.9 + i * 0.6, 1.73, z]);
    }
  }
  function fence(x, z, length, rotation = 0) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = rotation; scene.add(group);
    for (let i = 0; i <= length; i += 2.2) roundBox(0.55, 1.9, 0.45, 0.15, C.white, group, [i - length / 2, 0.95, 0]);
    box(length, 0.22, 0.26, C.white, group, [0, 0.55, -0.2]); box(length, 0.22, 0.26, C.white, group, [0, 1.25, -0.2]);
  }
  function cottage(x, z, w, d, accent, name, workshop = true) {
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    roundBox(w + 2, 0.5, d + 3, 0.2, 0xdacbae, group, [0, 0.12, -0.5]);
    roundBox(w, 6.4, d, 0.5, C.white, group, [0, 3.3, 0]);
    box(w + 0.2, 1.1, d + 0.2, 0xe6d7b8, group, [0, 0.75, 0]);
    roof(w + 2.2, 4.2, d + 2.2, accent, group, [0, 6.6, 0]);
    box(1.1, 3.4, 1.4, 0xd9b99c, group, [w * 0.27, 9.3, 1.8]);
    box(1.4, 0.35, 1.7, C.white, group, [w * 0.27, 11.05, 1.8]);
    const face = -d / 2 - 0.12;
    if (workshop) {
      for (const side of [-1, 1]) {
        roundBox(w * 0.34, 4.65, 0.28, 0.3, accent, group, [side * w * 0.23, 2.7, face]);
        roundBox(w * 0.28, 3.9, 0.3, 0.25, 0x91b5b1, group, [side * w * 0.23, 2.55, face - 0.18]);
        for (let row = 0; row < 5; row++) box(w * 0.28, 0.09, 0.05, 0xc4d8cd, group, [side * w * 0.23, 1 + row * 0.7, face - 0.36]);
        box(w * 0.24, 0.8, 0.05, C.glass, group, [side * w * 0.23, 3.8, face - 0.38]);
      }
    } else {
      roundBox(2.7, 4.5, 0.28, 0.25, accent, group, [0, 2.5, face]);
      for (const side of [-1, 1]) {
        roundBox(3.4, 2.8, 0.25, 0.2, accent, group, [side * w * 0.3, 3.7, face]);
        box(2.8, 2.2, 0.1, C.glass, group, [side * w * 0.3, 3.7, face - 0.2]);
        box(0.15, 2.3, 0.12, C.white, group, [side * w * 0.3, 3.7, face - 0.28]);
        box(2.9, 0.15, 0.12, C.white, group, [side * w * 0.3, 3.7, face - 0.28]);
      }
    }
    // The broad striped awning and flower boxes read at chase-camera scale.
    for (let i = 0; i < 10; i++) {
      const awning = box((w - 1) / 10, 0.22, 2.8, i % 2 ? C.white : accent, group, [-w / 2 + 0.5 + (i + 0.5) * (w - 1) / 10, 5.9, face - 1]); awning.rotation.x = 0.14;
    }
    planter(-w / 2 + 1.2, face - 1.8, group); planter(w / 2 - 1.2, face - 1.8, group);
    if (name) label(name, x, 7.8, z - d / 2 - 2.8, w * 0.82, accent);
    obstacles.push({ x, z, halfW: w / 2 + 1.4, halfD: d / 2 + 2.1 });
    return group;
  }
  const garage = cottage(-75, 91, 29, 15, C.red, '구름 정비소');
  // Oversized tyre sign: the neighbourhood's garage is unmistakable.
  const sign = mesh(geometry('TorusGeometry', [2.6, 0.7, 10, 24]), material(C.dark), garage, [-9, 12.2, -7]);
  const rim = mesh(geometry('TorusGeometry', [1.7, 0.23, 8, 18]), material(C.yellow), garage, [-9, 12.2, -7.13]);
  for (let i = 0; i < 6; i++) {
    const spoke = box(0.22, 3.5, 0.18, C.white, garage, [-9, 12.2, -7.13]); spoke.rotation.z = i * Math.PI / 3;
  }
  sign.rotation.z = 0.15; rim.rotation.z = 0.15;
  cottage(72, -105, 25, 12, C.blue, '동네 지오메트리 연구소');
  cottage(3, 70, 13, 10, C.yellow, '휴게소', false);
  [[27, -4, C.yellow], [51, 67, 0x9bafbd], [-118, -45, C.red], [98, -53, C.blue], [-120, 100, 0x9aab79]].forEach(([x, z, color]) => {
    if (!isRoad(x, z, 11)) cottage(x, z, 10, 8, color, null, false);
  });
  // Distant cottages and rolling hills surround the actual test road.
  for (let i = 0; i < 7; i++) cottage(-135 + i * 45, -163 - (i % 2) * 11, 15, 12, [C.red, C.blue, C.yellow][i % 3], null, false);
  [[-205, -160, 75, 34, 57], [-80, -240, 100, 43, 65], [80, -245, 110, 48, 60], [245, -92, 80, 40, 130], [225, 155, 83, 28, 90]].forEach(([x, z, w, h, d], index) => {
    const hill = mesh(geometry('SphereGeometry', [1, 20, 12]), material(index % 2 ? 0xb0c98a : 0x92b47f), scene, [x, -6, z], false); hill.scale.set(w, h, d);
  });
  for (let i = 0; i < 20; i++) tree(-151 + (i % 2) * 3, -118 + i * 13, 0.8 + (i % 3) * 0.15);
  for (let i = 0; i < 14; i++) tree(-133 + i * 23, -141, 0.85 + (i % 3) * 0.12);
  [[-97, 86], [-52, 87], [-92, 111], [-56, 112], [38, 62], [94, -117], [42, -105], [141, 10], [143, 45], [96, 98], [54, 119], [-24, 118], [37, -10]].forEach(([x, z], index) => tree(x, z, index % 2 ? 0.95 : 1.2));
  fence(-75, 106, 39); fence(-98, 91, 27, Math.PI / 2); fence(-51, 94, 20, Math.PI / 2);
  for (const x of [-92, -58]) {
    const stack = new THREE.Group(); stack.position.set(x, 0, 80); scene.add(stack);
    for (let i = 0; i < 3; i++) {
      const tyre = mesh(geometry('TorusGeometry', [0.9, 0.32, 8, 14]), material(C.dark), stack, [0, 0.4 + i * 0.55, 0]); tyre.rotation.x = Math.PI / 2;
    }
  }
  // Gentle lamp posts mark the garage entrance without cluttering the road.
  for (const x of [-84, -66]) {
    cylinder(0.12, 0.18, 5.7, 0x6e8775, scene, [x, 2.85, 51], 8);
    const lamp = mesh(geometry('SphereGeometry', [0.7, 12, 8]), material(C.white, { emissive: C.yellow, emissiveIntensity: 0.18 }), scene, [x, 5.9, 51]); lamp.scale.y = 1.2;
  }
}

export function createVillageCar(api, accent, ghost = false) {
  const { THREE, geometry, material, mesh, box, cylinder, C } = api;
  const group = new THREE.Group();
  const paint = material(accent, { roughness: 0.43, metalness: 0.06, transparent: ghost, opacity: ghost ? 0.78 : 1 });
  const shell = mesh(roundedGeometry(api, 2.08, 0.84, 3.65, 0.38), paint, group, [0, 0.95, 0]);
  mesh(roundedGeometry(api, 1.75, 0.94, 1.98, 0.38), material(ghost ? accent : C.glass, { roughness: 0.2, metalness: 0.25, transparent: ghost, opacity: ghost ? 0.75 : 1 }), group, [0, 1.64, -0.3]);
  mesh(roundedGeometry(api, 1.83, 0.23, 1.88, 0.1), material(ghost ? accent : C.white), group, [0, 2.04, -0.36]);
  for (const side of [-1, 1]) {
    box(0.12, 0.73, 0.14, accent, group, [side * 0.86, 1.66, -0.3]);
    mesh(roundedGeometry(api, 0.3, 0.21, 0.4, 0.09), paint, group, [side * 1.12, 1.42, 0.55]);
    const headlight = mesh(geometry('SphereGeometry', [0.27, 12, 8]), material(C.white, { emissive: C.yellow, emissiveIntensity: 0.23 }), group, [side * 0.65, 1.06, 1.78]); headlight.scale.z = 0.3;
    const tail = mesh(geometry('SphereGeometry', [0.21, 12, 8]), material(C.red), group, [side * 0.66, 1.06, -1.79]); tail.scale.z = 0.35;
  }
  mesh(roundedGeometry(api, 1.8, 0.2, 0.22, 0.08), material(C.white), group, [0, 0.66, 1.81]);
  mesh(roundedGeometry(api, 1.65, 0.18, 0.22, 0.08), material(C.white), group, [0, 0.66, -1.81]);
  box(0.62, 0.15, 0.05, C.dark, group, [0, 0.89, 1.825]);
  const front = [], tires = [];
  for (const x of [-1.02, 1.02]) for (const z of [-1.13, 1.1]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.48, z); group.add(pivot);
    const tyre = cylinder(0.47, 0.47, 0.3, C.dark, pivot, [0, 0, 0], 16); tyre.rotation.z = Math.PI / 2;
    const hub = cylinder(0.29, 0.29, 0.32, C.white, pivot, [0, 0, 0], 12); hub.rotation.z = Math.PI / 2;
    const cap = cylinder(0.13, 0.13, 0.34, accent, pivot, [0, 0, 0], 10); cap.rotation.z = Math.PI / 2;
    tires.push(tyre, hub, cap); if (z > 0) front.push(pivot);
  }
  group.userData = { front, tires, shell, boostFlames: [] }; return group;
}
