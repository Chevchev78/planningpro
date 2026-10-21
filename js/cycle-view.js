import { store, SHIFTS, LABELS, LETTERS, MAX_DAYS } from './store.js';
import { todayISO, addDays, cycleIndex, mod } from './cycle.js';
import { $, typeVars } from './ui.js';
import { icon } from './icons.js';

// Modèles « jours travaillés / jours de repos »
const PRESETS = [
  { label: '2/2', work: 2, rest: 2 },
  { label: '3/3', work: 3, rest: 3 },
  { label: '4/2', work: 4, rest: 2 },
  { label: '4/4', work: 4, rest: 4 },
  { label: '5/2', work: 5, rest: 2 },
];

// « Aujourd'hui je suis au jour i+1 » revient à placer le jour 1 i jours plus tôt.
const setTodayIndex = (cycle, i) => { cycle.anchor = addDays(todayISO(), -i); };
const todayIndex = cycle => cycleIndex(cycle, todayISO());

// Un modèle reprend le poste de travail déjà utilisé dans le cycle (nuit, matin…).
const mainShift = days => days.find(d => d !== 'repos') || 'journee';
const presetDays = (p, shift) => [...Array(p.work).fill(shift), ...Array(p.rest).fill('repos')];
const sameDays = (a, b) => a.length === b.length && a.every((d, i) => d === b[i]);

export function initCycleView() {
  let sel = 0;

  function render() {
    const { days } = store.state.cycle;
    const n = days.length;
    const ti = todayIndex(store.state.cycle);
    const plural = n > 1 ? 's' : '';
    sel = Math.min(sel, n - 1);

    $('#cycle-sub').textContent = `${n} jour${plural}, répétés en continu`;
    const shift = mainShift(days);
    $('#presets').innerHTML = PRESETS.map((p, i) =>
      `<button type="button" class="preset" data-preset="${i}" aria-pressed="${sameDays(days, presetDays(p, shift))}">${p.label}</button>`).join('');

    $('#cycle-len').textContent = `${n} jour${plural}`;
    $('#len-minus').disabled = n <= 1;
    $('#len-plus').disabled = n >= MAX_DAYS;

    $('#pills').innerHTML = days.map((t, i) => `
      <div class="pill-wrap">
        <button type="button" class="pill${t === 'repos' ? ' repos' : ''}" data-index="${i}" style="${typeVars(t)}" aria-pressed="${i === sel}"
          aria-label="Jour ${i + 1} : ${LABELS[t]}${i === ti ? " (aujourd'hui)" : ''}">
          <span class="pill-j">J${i + 1}</span><span class="pill-l">${LETTERS[t]}</span>
        </button>
        <span class="pill-tag">${i === ti ? 'Auj.' : ''}</span>
      </div>`).join('');

    $('#pick-title').textContent = `Jour ${sel + 1}`;
    $('#shift-grid').innerHTML = SHIFTS.map(t => `
      <button type="button" class="shift-opt" data-type="${t}" style="${typeVars(t)}" aria-pressed="${days[sel] === t}">
        <span class="dot"></span><span class="name">${LABELS[t]}</span>${days[sel] === t ? icon('check', 18) : ''}
      </button>`).join('');

    $('#cycle-today').textContent = `Jour ${ti + 1}`;
    $('#today-minus').disabled = $('#today-plus').disabled = n <= 1;
  }

  $('#presets').addEventListener('click', e => {
    const btn = e.target.closest('.preset');
    if (!btn) return;
    const preset = PRESETS[Number(btn.dataset.preset)];
    store.update(s => {
      const ti = todayIndex(s.cycle);
      s.cycle.days = presetDays(preset, mainShift(s.cycle.days));
      setTodayIndex(s.cycle, Math.min(ti, s.cycle.days.length - 1));
    });
  });

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

  $('#pills').addEventListener('click', e => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    sel = Number(pill.dataset.index);
    render();
  });

  // Choisir un poste passe au jour suivant : on remplit le cycle d'une traite.
  $('#shift-grid').addEventListener('click', e => {
    const opt = e.target.closest('.shift-opt');
    if (!opt) return;
    const i = sel;
    if (sel < store.state.cycle.days.length - 1) sel += 1;
    store.update(s => { s.cycle.days[i] = opt.dataset.type; });
  });

  return { render };
}
