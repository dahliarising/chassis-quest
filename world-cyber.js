// Night-city artwork from the original Cyberpunk version. The active world
// owns every shared geometry/material and disposes them when switching themes.
export const CYBER_COLORS = {
  sky: 0x070b19, grass: 0x10172a, asphalt: 0x202a40, roadEdge: 0x354158,
  white: 0xe5f4ff, red: 0xff4e9b, mint: 0x42edee, yellow: 0xf4ed64,
  sea: 0x111c35, metal: 0x151c31, glass: 0x203d56, dark: 0x080f20
};

export function createCyberDistrict(api) {
  const { THREE, scene, own, geometry, material, mesh, box, cylinder, neon, C, label, isRoad, obstacles, roadSegments } = api;
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
}

export function createStreetCar(api, color, ghost = false) {
  const { THREE, geometry, material, mesh, box, cylinder, neon, C } = api;
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
  group.userData = { front, tires, shell, boostFlames: [] }; return group;
}
