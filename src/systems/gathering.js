// Собирательство: предметы из data/items.json разбросаны по селу, E — подобрать.
import * as THREE from 'three';

function makeMesh(shape, color) {
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const g = new THREE.Group();
  if (shape === 'stone') g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.3), m));
  else if (shape === 'stick') { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 4), m); s.rotation.z = Math.PI / 2; s.position.y = 0.05; g.add(s); }
  else if (shape === 'mushroom') {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 5), new THREE.MeshLambertMaterial({ color: '#eee' })); st.position.y = 0.12;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.15, 6), m); cap.position.y = 0.3; g.add(st, cap);
  } else if (shape === 'flower') {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 3), new THREE.MeshLambertMaterial({ color: '#3a7a2a' })); st.position.y = 0.2;
    const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1), m); fl.position.y = 0.42; g.add(st, fl);
  } else { for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 3), m); b.position.set((i % 2 - 0.5) * 0.15, 0.25, (i >> 1) * 0.15 - 0.07); b.rotation.z = (i - 1.5) * 0.2; g.add(b); } }
  g.traverse(o => o.castShadow = true);
  return g;
}

export async function createGathering(scene, terrain, houses, inventory, onPick) {
  const cfg = await (await fetch('data/items.json')).json();
  const list = [];
  const area = 350; // радиус разброса предметов вокруг центра села (м)
  for (const it of cfg.items) {
    for (let i = 0; i < it.count; i++) {
      let x, z, n = 0;
      do { x = (Math.random() - 0.5) * area * 2; z = (Math.random() - 0.5) * area * 2; }
      while (n++ < 20 && houses.some(h => Math.hypot(h.center.x - x, h.center.z - z) < h.radius + 1));
      const mesh = makeMesh(it.shape, it.color);
      mesh.position.set(x, terrain.heightAt(x, z), z);
      mesh.rotation.y = Math.random() * 6;
      scene.add(mesh);
      list.push({ id: it.id, mesh });
    }
  }
  let near = null;
  return {
    update(p) {
      near = null; let best = 2.5;
      for (const o of list) { const d = o.mesh.position.distanceTo(p); if (d < best) { best = d; near = o; } }
      return near;
    },
    pick() {
      if (!near) return;
      scene.remove(near.mesh); list.splice(list.indexOf(near), 1);
      inventory.add(near.id); onPick(near.id); near = null;
    },
  };
}
