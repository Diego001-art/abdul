// Главный файл: собирает игру из частей.
import * as THREE from 'three';
import { makeGeo } from './world/geo.js';
import { createTerrain } from './world/terrain.js';
import { createHouses } from './world/houses.js';
import { createSky, createTrees } from './world/nature.js';
import { createMountains } from './world/mountains.js';
import { createPlaces } from './world/places.js';
import { sectorOf, createMapView } from './world/sectors.js';
import { createNpcs } from './npc/npcs.js';
import { createPlayer } from './player/player.js';
import { createCamera } from './player/camera.js';
import { createInput } from './player/input.js';
import { createInventory } from './systems/inventory.js';
import { createGathering } from './systems/gathering.js';
import { createQuests } from './systems/quests.js';
import { loadLang, t, tr, toggleLang } from './systems/i18n.js';
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

// Мир
const terrain = await createTerrain(scene);
const geo = makeGeo(terrain.lat, terrain.lon);
const { houses, loaded } = await createHouses(scene, terrain, geo);
if (!loaded) hud.toast(t('noHouses'));
const sunFollow = createSky(scene);
createTrees(scene, terrain, houses);
createMountains(scene, terrain);
const places = await createPlaces(scene, terrain);
const npcs = await createNpcs(scene, terrain);

// Герой и системы
const player = createPlayer(scene, terrain, houses);
const cam = createCamera(renderer.domElement, terrain);
const inventory = createInventory();
const events = {
  serpentWakes(silent) { const s = places.cave && places.cave.serpent; if (s) { s.object.visible = true; s.wake(); } if (!silent) hud.toast(t('serpentWakes')); },
  fastRun(silent) { player.state.speedBoost = 1.5; if (!silent) hud.toast(t('fastRun')); },
};
const quests = await createQuests({
  inventory, places,
  onDialog: (lines) => hud.dialog(lines),
  onChange: () => hud.quests(quests),
  onEvent: (name, silent) => events[name] && events[name](silent),
});
quests.restoreEvents();
hud.quests(quests);
const gathering = await createGathering(scene, terrain, houses, inventory, (id) => {
  hud.toast(t('picked', { item: t('item.' + id) }));
  hud.renderInventory(inventory.all());
});
const map = createMapView(terrain, houses, () => [
  ...Object.values(places).map(p => ({ x: p.pos.x, z: p.pos.z, color: p.type === 'cave' ? '#e33' : '#fff' })),
  ...npcs.list.map(n => ({ x: n.object.position.x, z: n.object.position.z, color: quests.npcHasTask(n.id) ? '#ffd23a' : '#9cf' })),
]);

let nearNpc = null;
createInput({
  KeyE: () => {
    if (hud.inDialog) return hud.nextLine();
    if (nearNpc) {
      hud.dialog([], tr(nearNpc.name));
      if (!quests.talk(nearNpc.id)) hud.dialog([{ ru: 'Салам алейкум!', dargin: '' }]);
      hud.renderInventory(inventory.all());
      return;
    }
    gathering.pick();
  },
  KeyI: () => hud.toggleInventory(inventory.all()),
  KeyJ: () => hud.toggleJournal(),
  KeyM: () => map.toggle(),
});
const input = createInput({});
document.getElementById('langBtn').onclick = () => { toggleLang(); hud.refresh(); hud.quests(quests); hud.renderInventory(inventory.all()); };
hud.done();

const clock = new THREE.Clock();
let time = 0, slow = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05); time += dt;
  if (!hud.inDialog) player.update(dt, input, cam.yaw);
  const p = player.object.position;
  cam.update(p);
  sunFollow(p);
  for (const pl of Object.values(places)) if (pl.serpent) pl.serpent.update(dt);
  nearNpc = npcs.update(p, quests.npcHasTask, time);
  const near = nearNpc ? null : gathering.update(p);
  hud.hint(hud.inDialog ? '' : nearNpc ? t('talk', { name: tr(nearNpc.name) }) : near ? t('pickup', { item: t('item.' + near.id) }) : '');
  if ((slow += dt) > 0.2) { // редкие проверки, чтобы не тормозило
    slow = 0;
    quests.update(p);
    hud.quests(quests);
    hud.sector(sectorOf(p.x, p.z));
    hud.house(houses.find(h => Math.hypot(h.center.x - p.x, h.center.z - p.z) < h.radius + 4));
    map.update(p);
  }
  renderer.render(scene, cam.camera);
});
