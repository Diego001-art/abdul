// Дома села: контуры берутся из OpenStreetMap, свои правки — из data/houses/houses.json.
import * as THREE from 'three';

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function loadOsm(lat, lon, radius) {
  const q = `[out:json][timeout:25];(way(around:${radius},${lat},${lon})[building];way(around:${radius},${lat},${lon})[highway];);out geom;`;
  // Сначала локальная копия (если её сохранили), потом интернет.
  try { const r = await fetch('data/houses/osm-cache.json'); if (r.ok) return await r.json(); } catch {}
  for (const url of OVERPASS) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q) });
      if (r.ok) return await r.json();
    } catch {}
  }
  return null;
}

export async function createHouses(scene, terrain, geo) {
  const cfg = await (await fetch('data/houses/houses.json')).json();
  const osm = await loadOsm(terrain.lat, terrain.lon, 900);
  const houses = []; // { id, name, center, radius, mesh }

  const roofMat = new THREE.MeshLambertMaterial({ color: '#6b5a48', flatShading: true });

  function addHouse(id, pts, opts = {}) {
    if (pts.length < 3) return;
    const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, -p.z)));
    let minY = Infinity, cx = 0, cz = 0;
    for (const p of pts) { minY = Math.min(minY, terrain.heightAt(p.x, p.z)); cx += p.x; cz += p.z; }
    cx /= pts.length; cz /= pts.length;
    const radius = Math.max(...pts.map(p => Math.hypot(p.x - cx, p.z - cz)));
    const floors = opts.floors || 2;
    const height = floors * 3 + 1.5; // +1.5 м уходит в склон
    const geom = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    geom.rotateX(-Math.PI / 2);
    const wall = new THREE.Color(opts.color || '#b9a88a').offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
    const mesh = new THREE.Mesh(geom, [roofMat, new THREE.MeshLambertMaterial({ color: wall, flatShading: true })]);
    mesh.position.y = minY - 1.5;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.houseId = id;
    scene.add(mesh);
    if (opts.roof === 'gable') {
      const r = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.05, 2.5, 4), roofMat);
      r.position.set(cx, mesh.position.y + height + 1.25, cz); r.rotation.y = Math.PI / 4;
      r.castShadow = true; scene.add(r);
    }
    houses.push({ id, name: opts.name, photo: opts.photo, center: new THREE.Vector3(cx, minY, cz), radius, top: mesh.position.y + height, mesh });
  }

  const roads = [];
  if (osm) {
    for (const el of osm.elements) {
      if (!el.geometry) continue;
      const pts = el.geometry.map(g => geo.toXZ(g.lat, g.lon));
      if (el.tags.building) {
        const o = cfg.houses[el.id] || {};
        const lv = parseInt(el.tags['building:levels']);
        addHouse(String(el.id), pts.slice(0, -1), { floors: lv || undefined, ...o });
      } else if (el.tags.highway) roads.push(pts);
    }
  }
  for (const e of cfg.extra || []) {
    const { x, z, w, d } = e;
    addHouse(e.id || `extra-${x}-${z}`, [{ x: x - w / 2, z: z - d / 2 }, { x: x + w / 2, z: z - d / 2 }, { x: x + w / 2, z: z + d / 2 }, { x: x - w / 2, z: z + d / 2 }], e);
  }

  // Дороги — полосы, лежащие на земле.
  const roadMat = new THREE.MeshLambertMaterial({ color: '#8c7b63' });
  for (const line of roads) {
    const verts = [];
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
      const nx = -dz / L * 2, nz = dx / L * 2;
      const y = (p) => terrain.heightAt(p.x, p.z) + 0.15;
      const A1 = [a.x + nx, y(a), a.z + nz], A2 = [a.x - nx, y(a), a.z - nz];
      const B1 = [b.x + nx, y(b), b.z + nz], B2 = [b.x - nx, y(b), b.z - nz];
      verts.push(...A1, ...A2, ...B1, ...A2, ...B2, ...B1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, roadMat); m.material.side = THREE.DoubleSide; m.receiveShadow = true;
    scene.add(m);
  }

  return { houses, loaded: !!osm };
}
