// Надписи на экране: подсказки, инвентарь, информация о доме.
import { t } from '../systems/i18n.js';
const $ = (id) => document.getElementById(id);
let toastTimer;
export const hud = {
  refresh() { $('help').textContent = t('help'); $('langBtn').textContent = t('lang'); $('invTitle').textContent = t('inventory'); },
  hint(text) { $('hint').style.display = text ? 'block' : 'none'; $('hint').textContent = text || ''; },
  house(h) { $('houseInfo').style.display = h ? 'block' : 'none'; if (h) $('houseInfo').textContent = h.name || `${t('house')} №${h.id}`; },
  toast(text) { $('toast').textContent = text; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').textContent = '', 2000); },
  toggleInventory(items) { $('inventory').classList.toggle('hidden'); this.renderInventory(items); },
  renderInventory(items) {
    const rows = Object.entries(items).map(([id, n]) => `<div class="row"><span>${t('item.' + id)}</span><b>${n}</b></div>`);
    $('invList').innerHTML = rows.join('') || t('empty');
  },
  done() { $('loading').remove(); },
};
