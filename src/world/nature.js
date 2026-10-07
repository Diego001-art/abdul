// Деревья, небо, свет.
import * as THREE from 'three';

export function createSky(scene) {
  scene.background = new THREE.Color('#9cc3e0');
  scene.fog = new THREE.Fog('#9cc3e0', 300, 7000);
  scene.add(new THREE.HemisphereLight('#dfefff', '#5a5040', 0.9));
  const sun = new THREE.DirectionalLight('#fff2d8', 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, far: 400 });
  scene.add(sun, sun.target);
  // Солнце следует за игроком, чтобы тени были рядом.
  return (p) => { sun.position.set(p.x + 80, p.y + 150, p.z + 40); sun.target.position.copy(p); };
}

export function createTrees(scene, terrain, houses, count = 900) {
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 5), new THREE.MeshLambertMaterial({ color: '#5a4030' }), count);
  const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(1.8, 5, 6), new THREE.MeshLambertMaterial({ color: '#3f6b35', flatShading: true }), count);
  trunk.castShadow = crown.castShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let i = 0, tries = 0;
  while (i < count && tries++ < count * 20) {
    const x = (Math.random() - 0.5) * terrain.size * 0.9, z = (Math.random() - 0.5) * terrain.size * 0.9;
    if (houses.some(h => Math.hypot(h.center.x - x, h.center.z - z) < h.radius + 4)) continue;
    const y = terrain.heightAt(x, z), k = 0.7 + Math.random() * 0.8;
    s.set(k, k, k);
    m.compose(new THREE.Vector3(x, y + 1 * k, z), q, s); trunk.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(x, y + 4 * k, z), q, s); crown.setMatrixAt(i, m);
    i++;
  }
  trunk.count = crown.count = i;
  scene.add(trunk, crown);
}
