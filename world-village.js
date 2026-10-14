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
  function resident(name, x, z, clothing, hair, prop) {
    const person = new THREE.Group(); person.name = name; person.position.set(x, 0, z); scene.add(person);
    const skin = 0xe8b68f;
    for (const side of [-1, 1]) {
      roundBox(0.42, 0.82, 0.46, 0.17, C.dark, person, [side * 0.35, 0.65, 0]);
      roundBox(0.52, 0.32, 0.76, 0.14, 0x705c4d, person, [side * 0.35, 0.23, -0.16]);
      const arm = roundBox(0.45, 1.05, 0.5, 0.2, clothing, person, [side * 0.83, 1.85, -0.13]); arm.rotation.z = side * 0.18;
      mesh(geometry('SphereGeometry', [0.27, 10, 8]), material(skin), person, [side * 0.9, 1.4, -0.3]);
    }
    roundBox(1.42, 1.52, 0.9, 0.34, clothing, person, [0, 1.8, 0]);
    mesh(geometry('SphereGeometry', [0.89, 14, 10]), material(hair), person, [0, 3.27, 0.08]);
    const face = mesh(geometry('SphereGeometry', [0.81, 14, 10]), material(skin), person, [0, 3.13, -0.16]); face.scale.z = 0.86;
    roundBox(1.55, 0.45, 0.85, 0.2, hair, person, [0, 3.72, -0.1]);
    for (const side of [-1, 1]) {
      mesh(geometry('SphereGeometry', [0.075, 8, 6]), material(C.dark), person, [side * 0.27, 3.19, -0.85]);
      const cheek = mesh(geometry('SphereGeometry', [0.16, 8, 6]), material(0xe59d83), person, [side * 0.48, 2.96, -0.75]); cheek.scale.z = 0.25;
    }
    roundBox(0.18, 0.06, 0.04, 0.02, 0x9d6358, person, [0, 2.91, -0.89]);
    if (prop === 'bread') {
      roundBox(0.92, 1.15, 0.08, 0.12, C.white, person, [0, 1.81, -0.49]);
      cylinder(0.69, 0.75, 0.3, C.white, person, [0, 4.03, 0], 12);
      for (const offset of [-0.42, 0, 0.42]) mesh(geometry('SphereGeometry', [0.45, 10, 8]), material(C.white), person, [offset, 4.25, 0]);
      roundBox(1.2, 0.56, 0.78, 0.18, 0xbd8c53, person, [0, 1.47, -0.87]);
      for (const offset of [-0.36, 0, 0.36]) {
        const loaf = mesh(geometry('SphereGeometry', [0.27, 10, 8]), material(C.yellow), person, [offset, 1.86, -0.87]); loaf.scale.set(0.85, 1, 1.5);
      }
    } else if (prop === 'camera') {
      box(0.12, 1.25, 0.05, C.dark, person, [-0.37, 2.07, -0.49]);
      box(0.12, 1.25, 0.05, C.dark, person, [0.37, 2.07, -0.49]);
      roundBox(1.13, 0.72, 0.5, 0.17, C.dark, person, [0, 1.65, -0.67]);
      const lens = cylinder(0.28, 0.3, 0.4, C.mint, person, [0.08, 1.65, -1.04], 12); lens.rotation.x = Math.PI / 2;
      box(0.25, 0.13, 0.1, C.white, person, [-0.33, 1.89, -0.94]);
    } else {
      const hat = mesh(geometry('SphereGeometry', [0.85, 12, 8]), material(C.red), person, [0.11, 3.92, 0]); hat.scale.y = 0.33;
      for (let i = 0; i < 5; i++) {
        const offset = (i - 2) * 0.23;
        const stem = cylinder(0.04, 0.04, 0.95, 0x6f9f70, person, [offset, 1.8, -0.86], 6); stem.rotation.z = -offset * 0.5;
        const bloom = mesh(geometry('IcosahedronGeometry', [0.28, 1]), material(i % 2 ? C.yellow : C.red), person, [offset * 1.4, 2.32 + (i % 2) * 0.14, -0.86]); bloom.scale.y = 0.65;
      }
      roundBox(0.8, 0.55, 0.6, 0.15, C.white, person, [0, 1.5, -0.84]);
    }
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
  resident('모모 · 빵집 배달부', -88, 78, C.red, 0x83604a, 'bread');
  resident('나래 · 산책길 사진사', -62, 78, C.blue, 0x514846, 'camera');
  resident('두리 · 꽃집 주인', -89, 72.5, 0x739c65, 0x9d724b, 'flowers');
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

  // Keep upgrades in their own visibility groups: the world batches all other
  // static meshes, but these must remain independently switchable after setup.
  const upgrades = [1, 2, 3].map(level => {
    const group = new THREE.Group(); group.name = `village-upgrade-${level}`; scene.add(group); return group;
  });
  const [service, rest, festival] = upgrades;
  roundBox(7, 3.2, 0.3, 0.25, C.blue, service, [-64, 6.7, 82.5]);
  const wrenchRing = mesh(geometry('TorusGeometry', [0.67, 0.22, 8, 14, Math.PI * 1.55]), material(C.white), service, [-65.1, 7.15, 82.25]); wrenchRing.rotation.z = -0.8;
  const wrenchHandle = box(0.38, 1.8, 0.13, C.white, service, [-64.45, 6.35, 82.23]); wrenchHandle.rotation.z = -0.58;
  for (let i = 0; i < 3; i++) box(1.35, 0.16, 0.1, C.yellow, service, [-61.9, 6.1 + i * 0.6, 82.2]);
  roundBox(4.6, 1.8, 1.7, 0.2, C.blue, service, [-59, 0.95, 82]);
  for (let i = 0; i < 3; i++) { box(4.1, 0.07, 0.08, C.white, service, [-59, 0.6 + i * 0.4, 81.1]); box(0.8, 0.12, 0.12, C.yellow, service, [-59, 0.8 + i * 0.4, 81.02]); }
  planter(-90, 81, service); planter(-60, 87, service);

  roundBox(12, 0.16, 12, 0.4, 0xe6d7b8, rest, [-49, 0.12, 73]);
  for (const side of [-1, 1]) box(0.45, 1.4, 1.4, C.blue, rest, [-49 + side * 2.6, 0.75, 75]);
  for (let i = 0; i < 3; i++) box(6.7, 0.22, 0.4, 0xb98760, rest, [-49, 1.5, 74.5 + i * 0.5]);
  for (let i = 0; i < 2; i++) box(6.7, 0.42, 0.22, 0xb98760, rest, [-49, 2.15 + i * 0.6, 75.65]);
  for (const side of [-1, 1]) box(0.25, 2.6, 0.25, C.blue, rest, [-49 + side * 2.6, 1.6, 75.6]);
  planter(-54, 70, rest); planter(-44, 76, rest);
  cylinder(2.6, 2.6, 0.23, C.white, rest, [-49, 1.5, 70], 18);
  cylinder(0.22, 0.4, 1.4, C.blue, rest, [-49, 0.75, 70], 10);

  // The plaza stays flush and the posts stay beside the driveway, so growth
  // never changes the free-drive collision map or traps a parked vehicle.
  for (let x = 0; x < 7; x++) for (let z = 0; z < 2; z++) box(3.8, 0.03, 3.8, (x + z) % 2 ? 0xe8cfad : 0xe5dcc2, festival, [-87 + x * 4, 0.115, 74 + z * 4]).castShadow = false;
  for (const x of [-95, -55]) cylinder(0.15, 0.22, 7.8, C.blue, festival, [x, 3.9, 80], 10);
  const cord = box(40, 0.07, 0.08, C.dark, festival, [-75, 7.55, 80]); cord.castShadow = false;
  for (let i = 0; i < 14; i++) {
    const pennant = mesh(geometry('ConeGeometry', [0.72, 1.25, 3]), material([C.red, C.yellow, C.blue][i % 3]), festival, [-93.5 + i * 2.85, 6.86, 80]); pennant.rotation.z = Math.PI; pennant.scale.z = 0.14;
  }
  for (const x of [-94, -56]) {
    planter(x, 77, festival);
    cylinder(0.045, 0.045, 3, C.white, festival, [x, 3.1, 77], 6);
    const balloon = mesh(geometry('SphereGeometry', [0.9, 12, 8]), material(C.yellow), festival, [x, 4.9, 77]); balloon.scale.y = 1.2;
  }
  upgrades.forEach(group => {
    // Batch only within a level, so switching a group never leaks its meshes
    // into the always-visible environment. All upgrade children are local.
    group.updateMatrixWorld(true);
    const batches = new Map();
    group.traverse(object => {
      if (!object.isMesh) return;
      const key = `${object.geometry.uuid}:${object.material.uuid}:${object.castShadow}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(object);
    });
    for (const objects of batches.values()) {
      if (objects.length < 2) continue;
      const instances = new THREE.InstancedMesh(objects[0].geometry, objects[0].material, objects.length);
      objects.forEach((object, index) => { instances.setMatrixAt(index, object.matrix); object.removeFromParent(); });
      instances.castShadow = objects[0].castShadow; instances.receiveShadow = true;
      instances.computeBoundingSphere(); group.add(instances);
    }
    group.traverse(object => { if (object.isMesh) object.userData.preserveVisibility = true; });
  });
  function setLevel(value) {
    const level = Math.max(0, Math.min(3, Math.floor(Number(value) || 0)));
    upgrades.forEach((group, index) => { group.visible = level > index; });
    return level;
  }
  setLevel(0);
  return { setLevel };
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
