import { store, SHIFTS, TYPES, LABELS, SHORT_LABELS, MAX_DAYS, DEFAULT_COLORS, sanitize } from './store.js';
import { todayISO, addDays, cycleIndex, mod } from './cycle.js';
import { $, $$, typeVars, toast } from './ui.js';
import { icon } from './icons.js';

// « Aujourd'hui je suis au jour i+1 » revient à placer le jour 1 i jours plus tôt.
const setTodayIndex = (cycle, i) => { cycle.anchor = addDays(todayISO(), -i); };
const todayIndex = cycle => cycleIndex(cycle, todayISO());

export function initOptions() {
  const grid = $('#cycle-grid');
  const sheet = $('#sheet');
  let sheetIndex = -1;

  $('#color-rows').innerHTML = TYPES.map(t => `
    <div class="row" style="${typeVars(t)}">
      <span class="row-icon">${icon(t, 18)}</span>
      <span class="row-label">${LABELS[t]}</span>
      <label class="swatch"><input type="color" data-type="${t}" aria-label="Couleur ${LABELS[t]}"></label>
    </div>`).join('');

  function render() {
    const { days } = store.state.cycle;
    const n = days.length;
    const ti = todayIndex(store.state.cycle);
    $('#cycle-len').textContent = `${n} jour${n > 1 ? 's' : ''}`;
    $('#len-minus').disabled = n <= 1;
    $('#len-plus').disabled = n >= MAX_DAYS;
    $('#cycle-today').textContent = `Jour ${ti + 1}`;
    $('#today-minus').disabled = $('#today-plus').disabled = n <= 1;
    grid.innerHTML = days.map((t, i) => `
      <button type="button" class="chip${i === ti ? ' is-today' : ''}" data-index="${i}" style="${typeVars(t)}"
        aria-label="Jour ${i + 1} : ${LABELS[t]}${i === ti ? " (aujourd'hui)" : ''}">
        <span class="chip-num">J${i + 1}</span>
        <span class="chip-icon">${icon(t, 15)}</span>
        <span class="chip-label">${SHORT_LABELS[t]}</span>
      </button>`).join('');
    $('#dark-toggle').checked = document.documentElement.dataset.theme === 'dark';
    for (const input of $$('#color-rows input')) input.value = store.state.colors[input.dataset.type];
  }

  // ----- Cycle -----
  function resize(dir) {
    store.update(s => {
      const { days } = s.cycle;
      if ((dir < 0 && days.length <= 1) || (dir > 0 && days.length >= MAX_DAYS)) return;
      const ti = todayIndex(s.cycle);
      if (dir > 0) days.push('repos');
      else days.pop();
      setTodayIndex(s.cycle, Math.min(ti, days.length - 1));
    });
  }

  function moveToday(dir) {
    store.update(s => setTodayIndex(s.cycle, mod(todayIndex(s.cycle) + dir, s.cycle.days.length)));
  }

  $('#len-minus').addEventListener('click', () => resize(-1));
  $('#len-plus').addEventListener('click', () => resize(1));
  $('#today-minus').addEventListener('click', () => moveToday(-1));
  $('#today-plus').addEventListener('click', () => moveToday(1));

  // ----- Feuille de choix du poste -----
  function openSheet(i) {
    sheetIndex = i;
    const current = store.state.cycle.days[i];
    $('#sheet-title').textContent = `Jour ${i + 1}`;
    $('#sheet-options').innerHTML = SHIFTS.map(t => `
      <button type="button" class="opt${t === current ? ' selected' : ''}" data-type="${t}" style="${typeVars(t)}" aria-pressed="${t === current}">
        <span class="row-icon">${icon(t, 18)}</span>${LABELS[t]}
      </button>`).join('');
    sheet.hidden = false;
    void sheet.offsetWidth;
    sheet.classList.add('open');
  }

  function closeSheet() {
    if (sheet.hidden) return;
    sheet.classList.remove('open');
    setTimeout(() => { sheet.hidden = true; }, 300);
  }

  grid.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip) openSheet(Number(chip.dataset.index));
  });

  sheet.addEventListener('click', e => {
    if (e.target === sheet) { closeSheet(); return; }
    const opt = e.target.closest('.opt');
    if (!opt) return;
    const i = sheetIndex;
    store.update(s => { s.cycle.days[i] = opt.dataset.type; });
    closeSheet();
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

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

  return { render, closeSheet };
}
