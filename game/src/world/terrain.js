// Рельеф местности из data/terrain/heights.json (реальные высоты Бутри).
import * as THREE from 'three';

export async function createTerrain(scene) {
  const d = await (await fetch('data/terrain/heights.json')).json();
  const { size, n, h } = d;
  const base = d.min;
  const step = size / (n - 1);

  // Высота земли в любой точке (x, z) — плавная интерполяция по сетке.
  function heightAt(x, z) {
    const c = Math.min(n - 1.001, Math.max(0, (x + size / 2) / step));
    const r = Math.min(n - 1.001, Math.max(0, (z + size / 2) / step));
    const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0;
    const g = (rr, cc) => h[rr * n + cc] - base;
    const a = g(r0, c0) * (1 - fc) + g(r0, c0 + 1) * fc;
    const b = g(r0 + 1, c0) * (1 - fc) + g(r0 + 1, c0 + 1) * fc;
    return a * (1 - fr) + b * fr;
  }

  const geo = new THREE.PlaneGeometry(size, size, n - 1, n - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = [];
  const grass = new THREE.Color('#6f8f45'), dry = new THREE.Color('#a59a5c'), rock = new THREE.Color('#8a8070');
  for (let i = 0; i < pos.count; i++) {
    const y = heightAt(pos.getX(i), pos.getZ(i));
    pos.setY(i, y);
    const t = y / (d.max - base);
    const col = grass.clone().lerp(dry, Math.min(1, t * 1.3)).lerp(rock, Math.max(0, t - 0.6) * 2);
    col.offsetHSL(0, 0, (Math.random() - 0.5) * 0.04);
    colors.push(col.r, col.g, col.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.receiveShadow = true;
  scene.add(mesh);

  return { heightAt, size, lat: d.lat, lon: d.lon };
}
