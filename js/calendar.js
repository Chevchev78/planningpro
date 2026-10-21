import { store, TYPES, LABELS } from './store.js';
import { todayISO, dayNum, isoFromParts, monthCells, dayInfo } from './cycle.js';
import { $, esc, typeVars, reducedMotion, autoGrow } from './ui.js';

const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long' });
const fmtToday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const fmtDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDateYear = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtAria = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const toDate = iso => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8));
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const monthOf = iso => ({ y: +iso.slice(0, 4), m: +iso.slice(5, 7) - 1 });
const addMonths = (v, n) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; };
const monthIndex = v => v.y * 12 + v.m;

export function initCalendar() {
  const track = $('#month-track');
  const viewport = $('#month-viewport');
  const note = $('#day-note');
  const dateInput = $('#date-input');
  const conge = $('#day-conge');
  let today = todayISO();
  let selected = today;
  let view = monthOf(today);
  let animating = false;

  function render() {
    renderMonth();
    renderDay();
    renderLegend();
  }

  function cellHTML(cell, active) {
    const info = dayInfo(store.state, cell.iso);
    const isToday = cell.iso === today;
    const isSelected = active && cell.iso === selected;
    const cls = ['cell', !cell.inMonth && 'out', info.type === 'repos' && 'repos', isToday && 'today', isSelected && 'selected', info.note && 'has-note']
      .filter(Boolean).join(' ');
    const label = `${fmtAria.format(toDate(cell.iso))}, ${LABELS[info.type]}${info.note ? ', avec une note' : ''}`;
    return `<button type="button" class="${cls}" data-iso="${cell.iso}" style="${typeVars(info.type)}" aria-label="${esc(label)}"`
      + `${active ? ` aria-pressed="${isSelected}"` : ''}${isToday ? ' aria-current="date"' : ''}${active && cell.inMonth ? '' : ' tabindex="-1"'}>`
      + `<span class="num">${cell.day}</span></button>`;
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
    const date = toDate(selected);
    const fmt = selected.slice(0, 4) === today.slice(0, 4) ? fmtDate : fmtDateYear;
    $('#day-date').textContent = selected === today ? `Aujourd'hui, ${fmtToday.format(date)}` : capitalize(fmt.format(date));

    const pill = $('#day-shift');
    pill.textContent = LABELS[info.type];
    pill.className = `shift-pill${info.type === 'repos' ? ' repos' : ''}`;
    pill.setAttribute('style', typeVars(info.type));
    $('#day-badge').textContent = `J${info.index + 1}/${s.cycle.days.length}`;

    // On ne touche pas au texte pendant la frappe dans la note de ce même jour.
    if (note.dataset.iso !== selected || document.activeElement !== note) {
      note.value = info.note;
      note.dataset.iso = selected;
    }
    autoGrow(note);

    conge.checked = info.conge;
    dateInput.value = selected;
  }

  function renderLegend() {
    const counts = {};
    let notes = 0;
    for (const c of monthCells(view.y, view.m)) {
      if (!c.inMonth) continue;
      const info = dayInfo(store.state, c.iso);
      counts[info.type] = (counts[info.type] || 0) + 1;
      if (info.note) notes += 1;
    }
    const items = TYPES.filter(t => counts[t])
      .map(t => `<li style="${typeVars(t)}"><span class="dot"></span>${LABELS[t]} <b>${counts[t]}</b></li>`);
    if (notes) items.push(`<li><span class="note-mark"></span>Note${notes > 1 ? 's' : ''} <b>${notes}</b></li>`);
    $('#legend').innerHTML = items.join('');
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

  // Va à n'importe quelle date : glissement pour un mois voisin, saut direct au-delà.
  function goToDate(iso) {
    const diff = monthIndex(monthOf(iso)) - monthIndex(view);
    if (Math.abs(diff) === 1) { goMonth(diff, iso); return; }
    view = monthOf(iso);
    selected = iso;
    render();
  }

  function goToday() {
    today = todayISO();
    goToDate(today);
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

  // Sur ordinateur, un clic sur le champ n'ouvre pas le calendrier : on le demande.
  dateInput.addEventListener('click', () => {
    if (!matchMedia('(hover: hover)').matches) return;
    try { dateInput.showPicker(); } catch {}
  });
  dateInput.addEventListener('change', () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value) && dateInput.value !== selected) goToDate(dateInput.value);
  });

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

  // Note : on écrit directement dans le champ, c'est enregistré à chaque lettre.
  note.addEventListener('input', () => {
    const iso = note.dataset.iso;
    const text = note.value;
    autoGrow(note);
    store.update(s => {
      if (text.trim()) s.notes[iso] = text;
      else delete s.notes[iso];
    }, { silent: true });
    for (const b of track.querySelectorAll(`[data-iso="${iso}"]`)) b.classList.toggle('has-note', !!text.trim());
    renderLegend();
  });

  // Jour de congé : un toucher bascule, un glissement vers la droite met Oui, vers la gauche Non.
  const setConge = on => {
    const iso = selected;
    store.update(s => {
      if (on) s.conges[iso] = true;
      else delete s.conges[iso];
    });
  };
  let congeDownX = null;
  let congeSlide = null;
  conge.addEventListener('pointerdown', e => {
    congeDownX = e.clientX;
    congeSlide = null;
    conge.setPointerCapture(e.pointerId);
  });
  conge.addEventListener('pointerup', e => {
    if (congeDownX !== null && Math.abs(e.clientX - congeDownX) > 10) congeSlide = e.clientX > congeDownX;
    congeDownX = null;
  });
  // Après un glissement, c'est le sens qui décide, pas la bascule du clic.
  conge.addEventListener('change', () => {
    const on = congeSlide ?? conge.checked;
    congeSlide = null;
    setConge(on);
  });

  return { render, refreshToday, goToday };
}
