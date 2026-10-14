// The original daylight proving ground, restored as a selectable world.
// Shared ground, roads, stations and lighting are built by world-scene.js.
export const COASTAL_COLORS = {
  sky: 0xc4e0e7, grass: 0x7e9270, asphalt: 0x38444a, roadEdge: 0x9aa18d,
  white: 0xf6f4df, red: 0xe87257, mint: 0x6fd9bc, yellow: 0xf4d282,
  sea: 0x649eaf, tree: 0x416b56, bark: 0x756657, dark: 0x24353e,
  blue: 0x608ba0, metal: 0x6f8b95, glass: 0x92c5d1
};

export function createCoastalDistrict(api) {
  const { THREE, scene, own, geometry, material, mesh, box, cylinder, C, label, isRoad, obstacles } = api;
  for (let i = 0; i < 14; i++) {
    const hill = mesh(geometry('SphereGeometry', [1, 9, 6]), material(i % 2 ? 0x7e9982 : 0x92aa8e), scene,
      [-165 + i * 34, -3, -218 - (i % 3) * 22], false);
    hill.scale.set(35 + (i % 4) * 10, 24 + (i % 3) * 13, 40);
  }

  function tree(x, z, size = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z); group.scale.setScalar(size); scene.add(group);
    cylinder(0.35, 0.47, 4.2, C.bark, group, [0, 2.1, 0], 7);
    cylinder(0, 3.6, 8, C.tree, group, [0, 6.6, 0], 7);
    cylinder(0, 2.8, 5.8, 0x598064, group, [0, 9.2, 0], 7);
  }
  // Deterministic placement keeps the map stable across sessions.
  let seed = 631;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 110; i++) {
    const x = -156 + random() * 310, z = -165 + random() * 305;
    if (isRoad(x, z, 15) || (x > -100 && x < -45 && z > 42 && z < 103) || (x > 45 && x < 90 && z < -55 && z > -105)) continue;
    tree(x, z, 0.65 + random() * 0.6);
  }
  for (let i = 0; i < 13; i++) tree(-154, -114 + i * 18, 0.8 + (i % 3) * 0.12);

  function building(x, z, w, d, h, color, name) {
    const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
    box(w, h, d, color, group, [0, h / 2, 0]);
    box(w + 0.7, 0.5, d + 0.8, C.dark, group, [0, h + 0.25, 0]);
    for (let i = -1; i <= 1; i++) {
      box(w / 4.6, h * 0.61, 0.08, 0x496774, group, [i * w / 3, h * 0.4, -d / 2 - 0.08]);
      box(w / 4.6, 0.16, 0.1, C.yellow, group, [i * w / 3, h * 0.73, -d / 2 - 0.15]);
    }
    label(name, x, h + 4, z, 18);
    obstacles.push({ x, z, halfW: w / 2 + 1.4, halfD: d / 2 + 2.1 });
  }
  building(-75, 91, 32, 16, 7, 0xdfdfce, 'CHASSIS WORKS');
  building(72, -105, 28, 12, 6, 0xc8d3ca, 'GEOMETRY LAB');
  box(7, 18, 7, 0xdde2d8, scene, [3, 9, 70]);
  box(13, 5, 11, 0x6f8b95, scene, [3, 20, 70], { roughness: 0.25 });
  box(15, 0.6, 13, C.dark, scene, [3, 22.8, 70]);
  obstacles.push({ x: 3, z: 70, halfW: 5, halfD: 5 });
  for (let i = 0; i < 6; i++) {
    const x = -92 + i * 6;
    box(0.13, 0.03, 9, C.white, scene, [x, 0.12, 70]).castShadow = false;
  }

  // Coast-side guard rail and a distant sail make the island readable at a glance.
  for (let i = 0; i < 28; i++) {
    box(0.2, 1.3, 0.25, C.dark, scene, [-161, 0.65, -121 + i * 9]);
    box(0.18, 0.35, 9, 0xb4bbb1, scene, [-161, 0.96, -116.5 + i * 9]);
  }
  const sail = new THREE.Group(); sail.position.set(-232, -1, -35); scene.add(sail);
  box(3, 1, 10, C.white, sail, [0, 0.5, 0]);
  cylinder(0.13, 0.13, 16, C.dark, sail, [0, 8.3, 0], 6);
  const sailGeo = own(new THREE.BufferGeometry());
  sailGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 16, 0, 0, 2.5, 0, 0, 3, 7], 3)); sailGeo.computeVertexNormals();
  mesh(sailGeo, material(C.white, { side: THREE.DoubleSide }), sail);
}

export function createCoastalCar(api, color, ghost = false) {
  const { THREE, geometry, material, mesh, box, cylinder, C } = api;
  const group = new THREE.Group();
  const paint = material(color, { roughness: 0.33, metalness: 0.16, transparent: ghost, opacity: ghost ? 0.83 : 1 });
  const shell = mesh(geometry('BoxGeometry', [1.92, 0.58, 4.25]), paint, group, [0, 0.84, 0]);
  mesh(geometry('BoxGeometry', [1.74, 0.17, 1.25]), paint, group, [0, 1.2, 1.3]);
  mesh(geometry('BoxGeometry', [1.62, 0.55, 1.8]), material(0x263f4b, { roughness: 0.23, metalness: 0.25 }), group, [0, 1.37, -0.15]);
  mesh(geometry('BoxGeometry', [1.64, 0.12, 1.48]), paint, group, [0, 1.7, -0.3]);
  const windshield = box(1.59, 0.68, 0.1, 0x92c5d1, group, [0, 1.44, 0.72], { roughness: 0.2 }); windshield.rotation.x = -0.45;
  box(1.55, 0.06, 0.08, C.dark, group, [0, 1.76, -0.3]);
  for (const side of [-1, 1]) {
    box(0.13, 0.55, 0.14, color, group, [side * 0.83, 1.42, -0.3]);
    box(0.28, 0.16, 0.26, color, group, [side * 1.04, 1.19, 0.63]);
    box(0.54, 0.15, 0.05, 0xfff0c9, group, [side * 0.56, 0.98, 2.15], { emissive: 0xffcc77, emissiveIntensity: 0.45 });
    box(0.52, 0.13, 0.05, 0xab292c, group, [side * 0.57, 1.02, -2.15]);
  }
  box(1.25, 0.2, 0.07, C.dark, group, [0, 0.69, 2.16]);
  box(1.76, 0.12, 0.15, C.dark, group, [0, 0.57, -2.1]);
  const front = [], tires = [];
  for (const x of [-0.96, 0.96]) for (const z of [-1.31, 1.3]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.48, z); group.add(pivot);
    const tire = cylinder(0.46, 0.46, 0.26, 0x20292d, pivot, [0, 0, 0], 16); tire.rotation.z = Math.PI / 2;
    const rim = cylinder(0.28, 0.28, 0.28, 0xc5d2d0, pivot, [0, 0, 0], 10); rim.rotation.z = Math.PI / 2;
    tires.push(tire, rim); if (z > 0) front.push(pivot);
  }
  group.userData = { front, tires, shell, boostFlames: [] }; return group;
}
