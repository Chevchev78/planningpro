import { store, TYPES, LABELS, DEFAULT_COLORS, sanitize } from './store.js';
import { todayISO } from './cycle.js';
import { $, $$, typeVars, toast } from './ui.js';
import { icon } from './icons.js';

export function initSettings() {
  $('#color-rows').innerHTML = TYPES.map(t => `
    <div class="row" style="${typeVars(t)}">
      <span class="row-icon">${icon(t, 18)}</span>
      <span class="row-label">${LABELS[t]}</span>
      <label class="swatch"><input type="color" data-type="${t}" aria-label="Couleur ${LABELS[t]}"></label>
    </div>`).join('');

  function render() {
    $('#dark-toggle').checked = document.documentElement.dataset.theme === 'dark';
    for (const input of $$('#color-rows input')) input.value = store.state.colors[input.dataset.type];
  }

  // ----- Apparence -----
  $('#dark-toggle').addEventListener('change', e => store.update(s => { s.dark = e.target.checked; }));

  $('#color-rows').addEventListener('input', e => {
    const t = e.target.dataset.type;
    if (t) store.update(s => { s.colors[t] = e.target.value; });
  });

  $('#reset-colors').addEventListener('click', () => {
    store.update(s => { s.colors = { ...DEFAULT_COLORS }; });
    toast("Couleurs d'origine rétablies");
  });

  // ----- Sauvegarde -----
  $('#btn-export').addEventListener('click', () => {
    const data = { app: 'PlanningPro', version: 1, exportedAt: new Date().toISOString(), ...store.state };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `planningpro-${todayISO()}.json` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Sauvegarde exportée');
  });

  const fileInput = $('#import-file');
  $('#btn-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    let next;
    try {
      next = sanitize(JSON.parse(await file.text()));
    } catch {
      toast("Ce fichier n'est pas une sauvegarde PlanningPro");
      return;
    }
    if (!confirm('Remplacer votre cycle, vos notes et vos congés par cette sauvegarde ?')) return;
    store.replace(next);
    toast('Sauvegarde importée');
  });

  return { render };
}
