// Original procedural race machine. Shared geometry belongs to the world renderer.
// The nose points along +z; no textures, external models, or animation loop.
const shapeCaches = new WeakMap();

export function createRacer(api, accent, ghost = false) {
  const { THREE, own, geometry, material, mesh, box, cylinder, neon } = api;
  let shapes = shapeCaches.get(geometry);
  if (!shapes) { shapes = new Map(); shapeCaches.set(geometry, shapes); }
  const group = new THREE.Group();
  const white = ghost ? 0xb9f7f4 : 0xf3f7ff;
  const blue = accent;
  const red = ghost ? accent : 0xef4d5b;
  const carbon = 0x12223c;
  const paintSettings = { roughness: 0.25, metalness: 0.32, transparent: ghost, opacity: ghost ? 0.82 : 1 };
  const paint = color => material(color, paintSettings);

  // An eight-sided cross section gives the body long, chamfered aerodynamic
  // surfaces. Each row is [longitudinal position, half width, bottom, top].
  function loft(name, sections) {
    if (shapes.has(name)) return shapes.get(name);
    const positions = [], indices = [];
    sections.forEach(([z, w, bottom, top]) => {
      const bevel = Math.min((top - bottom) * 0.28, 0.12);
      positions.push(-w * 0.7, bottom, z, w * 0.7, bottom, z,
        w, bottom + bevel, z, w, top - bevel, z,
        w * 0.7, top, z, -w * 0.7, top, z,
        -w, top - bevel, z, -w, bottom + bevel, z);
    });
    for (let row = 0; row < sections.length - 1; row++) {
      for (let i = 0; i < 8; i++) {
        const a = row * 8 + i, b = row * 8 + (i + 1) % 8;
        indices.push(a, b, a + 8, b, b + 8, a + 8);
      }
    }
    for (let i = 1; i < 7; i++) {
      indices.push(0, i + 1, i);
      const end = (sections.length - 1) * 8;
      indices.push(end, end + i, end + i + 1);
    }
    const source = new THREE.BufferGeometry();
    source.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    source.setIndex(indices);
    const result = own(source.toNonIndexed());
    source.dispose();
    result.computeVertexNormals();
    shapes.set(name, result);
    return result;
  }
  function panel(name, sections, color, parent = group, position = [0, 0, 0]) {
    return mesh(loft(name, sections), paint(color), parent, position);
  }

  // Long pointed nose, wide shoulders, and a taper toward the rear diffuser.
  const shell = panel('body', [
    [-2.25, 0.66, 0.26, 0.65], [-1.45, 0.77, 0.24, 0.78],
    [-0.45, 0.70, 0.25, 0.79], [0.65, 0.53, 0.25, 0.67],
    [1.8, 0.36, 0.25, 0.46], [2.6, 0.18, 0.29, 0.34]
  ], white);
  panel('spine', [
    [-2.16, 0.29, 0.65, 0.71], [-1.43, 0.35, 0.76, 0.81],
    [-0.6, 0.34, 0.78, 0.84], [0.7, 0.26, 0.65, 0.70],
    [1.82, 0.16, 0.44, 0.49], [2.58, 0.07, 0.335, 0.36]
  ], blue);
  panel('floor', [[-2.35, 0.81, 0.18, 0.25], [0.4, 0.85, 0.18, 0.25], [2.18, 0.57, 0.18, 0.25]], carbon);
  box(1.2, 0.06, 0.36, carbon, group, [0, 0.23, -2.32]);
  for (const x of [-0.43, -0.22, 0, 0.22, 0.43]) {
    box(0.025, 0.18, 0.45, carbon, group, [x, 0.29, -2.29]);
  }

  // A dark bubble canopy breaks up the white wedge without a box-shaped cabin.
  const canopy = mesh(geometry('SphereGeometry', [1, 20, 12]),
    material(0x14334e, { roughness: 0.12, metalness: 0.65 }), group, [0, 0.75, -0.35]);
  canopy.scale.set(0.47, 0.38, 0.98);
  const canopyGlint = mesh(geometry('SphereGeometry', [1, 16, 8]),
    material(0x58acc9, { roughness: 0.15, metalness: 0.5 }), group, [-0.12, 0.98, -0.12]);
  canopyGlint.scale.set(0.12, 0.045, 0.48); canopyGlint.rotation.z = -0.22;
  panel('rear-cowl', [[-1.9, 0.31, 0.7, 0.79], [-1.15, 0.32, 0.77, 1.02], [-0.93, 0.25, 0.8, 1.03]], white);
  box(0.1, 0.04, 0.62, red, group, [0, 1.04, -1.25]);

  const front = [], tires = [], boostFlames = [];
  for (const side of [-1, 1]) {
    // Front wheels are partly faired above and exposed outside/below the pods.
    panel('front-pod', [
      [0.64, 0.25, 0.4, 0.59], [1.2, 0.28, 0.38, 0.89],
      [1.72, 0.27, 0.35, 0.86], [2.35, 0.15, 0.28, 0.43]
    ], white, group, [side * 1.04, 0, 0]);
    panel('pod-stripe', [
      [0.8, 0.07, 0.61, 0.65], [1.21, 0.08, 0.89, 0.92],
      [1.7, 0.07, 0.86, 0.89], [2.32, 0.035, 0.43, 0.45]
    ], blue, group, [side * 1.04, 0, 0]);
    panel('front-wing', [[1.96, 0.6, 0.22, 0.27], [2.28, 0.5, 0.23, 0.28]], blue,
      group, [side * 0.7, 0, 0]);
    box(0.06, 0.24, 0.45, red, group, [side * 1.27, 0.32, 2.12]);
    box(0.3, 0.055, 0.055, white, group, [side * 1.035, 0.46, 2.23], neon(0x8deeff, 1.4));

    // Side air intakes and rear haunches emphasize the wide mid-engine layout.
    panel('side-pod', [[-2.02, 0.27, 0.28, 0.66], [-1.27, 0.3, 0.26, 0.76],
      [-0.53, 0.32, 0.25, 0.62], [0.45, 0.2, 0.24, 0.47]], white,
      group, [side * 0.95, 0, 0]);
    panel('side-sill', [[-2.06, 0.08, 0.25, 0.37], [-0.55, 0.09, 0.23, 0.35], [0.5, 0.05, 0.22, 0.28]],
      blue, group, [side * 1.23, 0, 0]);
    box(0.035, 0.19, 0.66, carbon, group, [side * 1.27, 0.47, -0.65]);
    for (let i = 0; i < 3; i++) box(0.045, 0.025, 0.52, blue, group, [side * 1.292, 0.41 + i * 0.06, -0.65]);
    box(0.08, 0.04, 0.8, red, group, [side * 0.87, 0.75, -1.48]);

    // Four real wheel pivots; steering updates rotate the front pair together.
    for (const z of [-1.51, 1.45]) {
      const pivot = new THREE.Group(); pivot.position.set(side * 1.1, 0.43, z); group.add(pivot);
      const tire = cylinder(0.43, 0.43, 0.38, 0x0c1520, pivot, [0, 0, 0], 20);
      tire.rotation.z = Math.PI / 2;
      const rim = cylinder(0.27, 0.27, 0.4, 0xb8c7d6, pivot, [0, 0, 0], 12);
      rim.rotation.z = Math.PI / 2;
      const hub = cylinder(0.095, 0.095, 0.42, red, pivot, [0, 0, 0], 10);
      hub.rotation.z = Math.PI / 2;
      tires.push(tire, rim, hub); if (z > 0) front.push(pivot);
    }

    // Swept wing endplates and two exposed turbine-like rear booster nozzles.
    panel('wing-end', [[-2.54, 0.035, 0.83, 1.31], [-2.02, 0.035, 0.86, 1.24], [-1.78, 0.035, 0.84, 1.06]],
      red, group, [side * 1.35, 0, 0]);
    box(0.08, 0.36, 0.16, carbon, group, [side * 0.65, 0.89, -2.1]);
    const nozzle = cylinder(0.27, 0.24, 0.49, 0x718699, group, [side * 0.6, 0.59, -2.27], 16);
    nozzle.rotation.x = Math.PI / 2;
    const exhaust = cylinder(0.19, 0.19, 0.02, 0x07101c, group, [side * 0.6, 0.59, -2.523], 16);
    exhaust.rotation.x = Math.PI / 2;
    const ring = mesh(geometry('TorusGeometry', [0.205, 0.028, 6, 16]),
      material(blue, neon(blue, 1.8)), group, [side * 0.6, 0.59, -2.54]);
    ring.castShadow = false;
    const flameGroup = new THREE.Group(); flameGroup.position.set(side * 0.6, 0.59, -2.56); group.add(flameGroup);
    const flame = mesh(geometry('ConeGeometry', [0.19, 1.75, 10]),
      material(0x55cfff, { ...neon(0x3cb8ff, 3), transparent: true, opacity: 0.74, depthWrite: false }),
      flameGroup, [0, 0, -0.875], false);
    flame.rotation.x = -Math.PI / 2;
    const core = mesh(geometry('ConeGeometry', [0.1, 1.2, 8]),
      material(0xd6fbff, { ...neon(0xb9f5ff, 4), transparent: true, opacity: 0.95, depthWrite: false }),
      flameGroup, [0, 0, -0.6], false);
    core.rotation.x = -Math.PI / 2;
    flameGroup.visible = false; boostFlames.push(flameGroup);
  }
  const lowerWing = box(2.64, 0.075, 0.57, white, group, [0, 1.04, -2.15]); lowerWing.rotation.x = -0.08;
  const upperWing = box(2.66, 0.065, 0.44, blue, group, [0, 1.2, -2.3]); upperWing.rotation.x = -0.1;
  box(0.28, 0.07, 0.035, red, group, [0, 0.67, -2.3], neon(red, 1.2));
  group.userData = { front, tires, shell, boostFlames };
  return group;
}
