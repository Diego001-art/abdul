// Главный файл: собирает игру из частей.
import * as THREE from 'three';
import { makeGeo } from './world/geo.js';
import { createTerrain } from './world/terrain.js';
import { createHouses } from './world/houses.js';
import { createSky, createTrees } from './world/nature.js';
import { createPlayer } from './player/player.js';
import { createCamera } from './player/camera.js';
import { createInput } from './player/input.js';
import { createInventory } from './systems/inventory.js';
import { createGathering } from './systems/gathering.js';
import { loadLang, t, toggleLang } from './systems/i18n.js';
import { hud } from './ui/hud.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight));

const scene = new THREE.Scene();
await loadLang();
hud.refresh();

const terrain = await createTerrain(scene);
const geo = makeGeo(terrain.lat, terrain.lon);
const { houses, loaded } = await createHouses(scene, terrain, geo);
if (!loaded) hud.toast(t('noHouses'));
const sunFollow = createSky(scene);
createTrees(scene, terrain, houses);

const player = createPlayer(scene, terrain, houses);
const cam = createCamera(renderer.domElement, terrain);
const inventory = createInventory();
const gathering = await createGathering(scene, terrain, houses, inventory, (id) => {
  hud.toast(t('picked', { item: t('item.' + id) }));
  hud.renderInventory(inventory.all());
});

createInput({
  KeyE: () => gathering.pick(),
  KeyI: () => hud.toggleInventory(inventory.all()),
});
const input = createInput({});
document.getElementById('langBtn').onclick = () => { toggleLang(); hud.refresh(); hud.renderInventory(inventory.all()); };
hud.done();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  player.update(dt, input, cam.yaw);
  const p = player.object.position;
  cam.update(p);
  sunFollow(p);
  const near = gathering.update(p);
  hud.hint(near ? t('pickup', { item: t('item.' + near.id) }) : '');
  hud.house(houses.find(h => Math.hypot(h.center.x - p.x, h.center.z - p.z) < h.radius + 4));
  renderer.render(scene, cam.camera);
});
