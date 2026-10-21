import { store, TYPES, LABELS, PHRASES } from './store.js';
import { todayISO, dayNum, isoFromParts, monthCells, dayInfo } from './cycle.js';
import { $, esc, typeVars, reducedMotion, autoGrow } from './ui.js';
import { icon } from './icons.js';

const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long' });
const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const toDate = iso => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8));
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const monthOf = iso => ({ y: +iso.slice(0, 4), m: +iso.slice(5, 7) - 1 });
const addMonths = (v, n) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; };
const monthIndex = v => v.y * 12 + v.m;

function relative(diff) {
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Demain';
  if (diff === -1) return 'Hier';
  return diff > 0 ? `Dans ${diff} jours` : `Il y a ${-diff} jours`;
}

export function initCalendar() {
  const track = $('#month-track');
  const viewport = $('#month-viewport');
  const note = $('#day-note');
  let today = todayISO();
  let selected = today;
  let view = monthOf(today);
  let animating = false;

  function render() {
    renderMonth();
    renderDay();
    renderStats();
  }

  function cellHTML(cell, active) {
    const info = dayInfo(store.state, cell.iso);
    const isToday = cell.iso === today;
    const isSelected = active && cell.iso === selected;
    const cls = ['cell', !cell.inMonth && 'out', info.conge && 'conge', isToday && 'today', isSelected && 'selected', info.note && 'has-note']
      .filter(Boolean).join(' ');
    const label = `${fmtShort.format(toDate(cell.iso))}, ${LABELS[info.type]}${info.note ? ', avec une note' : ''}`;
    return `<button type="button" class="${cls}" data-iso="${cell.iso}" style="${typeVars(info.type)}" aria-label="${esc(label)}"`
      + `${active ? ` aria-pressed="${isSelected}"` : ''}${isToday ? ' aria-current="date"' : ''}${active && cell.inMonth ? '' : ' tabindex="-1"'}>`
      + `<span class="num">${cell.day}</span><span class="bar"></span></button>`;
  }

  // Trois mois côte à côte (précédent, courant, suivant) pour que le swipe suive le doigt.
  function renderMonth() {
    $('#month-title').innerHTML = `<span class="m">${fmtMonth.format(new Date(view.y, view.m, 1))}</span> <span class="y">${view.y}</span>`;
    track.innerHTML = [-1, 0, 1].map(n => {
      const v = addMonths(view, n);
      const cells = monthCells(v.y, v.m).map(c => cellHTML(c, n === 0)).join('');
      return `<div class="month-grid"${n === 0 ? '' : ' aria-hidden="true" inert'}>${cells}</div>`;
    }).join('');
  }

  function renderDay() {
    const s = store.state;
    const info = dayInfo(s, selected);
    $('#day-kicker').textContent = `${relative(dayNum(selected) - dayNum(today))} · Jour ${info.index + 1} sur ${s.cycle.days.length}`;
    $('#day-date').textContent = capitalize(fmtLong.format(toDate(selected)));
    $('#shift-row').setAttribute('style', typeVars(info.type));
    $('#shift-badge').innerHTML = icon(info.type, 26);
    $('#shift-name').textContent = LABELS[info.type];
    $('#shift-phrase').textContent = info.conge && info.shift !== 'repos'
      ? `${PHRASES.conge} · ${LABELS[info.shift].toLowerCase()} au planning`
      : PHRASES[info.type];
    if (note.dataset.iso !== selected || document.activeElement !== note) {
      note.value = info.note;
      note.dataset.iso = selected;
      autoGrow(note);
    }
    $('#day-conge').checked = info.conge;
  }

  function renderStats() {
    const counts = {};
    for (const c of monthCells(view.y, view.m)) {
      if (!c.inMonth) continue;
      const t = dayInfo(store.state, c.iso).type;
      counts[t] = (counts[t] || 0) + 1;
    }
    const present = TYPES.filter(t => counts[t]);
    const worked = present.filter(t => t !== 'repos' && t !== 'conge').reduce((n, t) => n + counts[t], 0);
    const plural = worked > 1 ? 's' : '';
    $('#stats-title').textContent = `En ${fmtMonth.format(new Date(view.y, view.m, 1))}`;
    $('#stats-total').innerHTML = `<b>${worked}</b> jour${plural} travaillé${plural}`;
    $('#stats-bar').innerHTML = present.map(t => `<span style="${typeVars(t)};flex-grow:${counts[t]}"></span>`).join('');
    $('#stats-legend').innerHTML = present
      .map(t => `<li style="${typeVars(t)}"><span class="dot"></span>${LABELS[t]} <b>${counts[t]}</b></li>`).join('');
  }

  function select(iso) {
    selected = iso;
    for (const b of track.querySelectorAll('.month-grid:not([inert]) .cell')) {
      const on = b.dataset.iso === iso;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', on);
    }
    renderDay();
  }

  // ----- Navigation entre les mois -----
  const setOffset = px => { track.style.transform = `translateX(calc(-100% / 3 + ${px}px))`; };

  function slide(dir, done) {
    if (reducedMotion()) { done(); return; }
    animating = true;
    track.style.transition = 'transform .34s cubic-bezier(.2, .8, .2, 1)';
    track.style.transform = `translateX(${(-1 - dir) * 100 / 3}%)`;
    let finished = false;
    const end = e => {
      if (finished || (e && e.target !== track)) return;
      finished = true;
      track.removeEventListener('transitionend', end);
      track.style.transition = 'none';
      done();
      setOffset(0);
      void track.offsetWidth;
      animating = false;
    };
    track.addEventListener('transitionend', end);
    setTimeout(end, 500);
  }

  function goMonth(dir, target) {
    if (animating) return;
    slide(dir, () => {
      view = addMonths(view, dir);
      selected = target ?? (monthIndex(monthOf(today)) === monthIndex(view) ? today : isoFromParts(view.y, view.m + 1, 1));
      render();
    });
  }

  function goToday() {
    today = todayISO();
    const diff = monthIndex(monthOf(today)) - monthIndex(view);
    if (diff === 0) { selected = today; render(); return; }
    if (Math.abs(diff) === 1) { goMonth(diff, today); return; }
    view = monthOf(today);
    selected = today;
    render();
  }

  // Le jour change à minuit : on remet « aujourd'hui » à jour au retour dans l'appli.
  function refreshToday() {
    const now = todayISO();
    if (now === today) return;
    if (selected === today) { selected = now; view = monthOf(now); }
    today = now;
    render();
  }

  // ----- Événements -----
  $('#prev-month').addEventListener('click', () => goMonth(-1));
  $('#next-month').addEventListener('click', () => goMonth(1));
  $('#btn-today').addEventListener('click', goToday);

  let drag = null;
  let justDragged = false;

  track.addEventListener('click', e => {
    if (justDragged) { justDragged = false; return; }
    const cell = e.target.closest('.cell');
    if (!cell || animating) return;
    const iso = cell.dataset.iso;
    const diff = monthIndex(monthOf(iso)) - monthIndex(view);
    if (diff === 0) select(iso);
    else goMonth(Math.sign(diff), iso);
  });

  viewport.addEventListener('pointerdown', e => {
    if (animating || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, active: false };
    justDragged = false;
  });

  viewport.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        drag.active = true;
        viewport.setPointerCapture(e.pointerId);
        track.style.transition = 'none';
      } else {
        if (Math.abs(dy) > 10) drag = null;
        return;
      }
    }
    drag.dx = dx;
    setOffset(dx);
  });

  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { active, dx } = drag;
    drag = null;
    if (!active) return;
    // Ignore le clic que le navigateur déclenche juste après le glissement.
    justDragged = true;
    setTimeout(() => { justDragged = false; }, 50);
    const threshold = Math.min(80, viewport.clientWidth * 0.18);
    if (e.type === 'pointerup' && Math.abs(dx) > threshold) {
      goMonth(dx < 0 ? 1 : -1);
    } else {
      track.style.transition = 'transform .25s cubic-bezier(.2, .8, .2, 1)';
      setOffset(0);
    }
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  document.addEventListener('keydown', e => {
    if (viewport.closest('.view').hidden || e.target.matches('textarea, input')) return;
    if (e.key === 'ArrowLeft') goMonth(-1);
    if (e.key === 'ArrowRight') goMonth(1);
  });

  note.addEventListener('input', () => {
    const iso = note.dataset.iso;
    const text = note.value;
    autoGrow(note);
    store.update(s => {
      if (text.trim()) s.notes[iso] = text;
      else delete s.notes[iso];
    }, { silent: true });
    for (const b of track.querySelectorAll(`[data-iso="${iso}"]`)) b.classList.toggle('has-note', !!text.trim());
  });

  $('#day-conge').addEventListener('change', e => {
    const iso = selected;
    store.update(s => {
      if (e.target.checked) s.conges[iso] = true;
      else delete s.conges[iso];
    });
  });

  return { render, refreshToday };
}
