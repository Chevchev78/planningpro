import { store, TYPES, LABELS } from './store.js';
import { todayISO, dayNum, addDays, isoFromParts, monthCells, dayInfo } from './cycle.js';
import { $, esc, typeVars, reducedMotion, autoGrow } from './ui.js';
import { icon } from './icons.js';

const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long' });
const fmtKicker = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtKickerYear = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const fmtDayMonth = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtAria = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const toDate = iso => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8));
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
const monthOf = iso => ({ y: +iso.slice(0, 4), m: +iso.slice(5, 7) - 1 });
const addMonths = (v, n) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; };
const monthIndex = v => v.y * 12 + v.m;
const isRest = t => t === 'repos' || t === 'conge';

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
  const preview = $('#note-preview');
  const dateInput = $('#date-input');
  let today = todayISO();
  let selected = today;
  let view = monthOf(today);
  let animating = false;
  let editingNote = false;

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

  // « Demain » puis le prochain changement de poste après ce jour-là, sur une seule ligne.
  function nextItems(iso, diff) {
    const s = store.state;
    const t1 = dayInfo(s, addDays(iso, 1)).type;
    const items = [[diff === 0 ? 'Demain' : 'Lendemain', t1]];
    for (let k = 2; k <= 120; k++) {
      const d = addDays(iso, k);
      const t = dayInfo(s, d).type;
      if (t === t1) continue;
      const fmt = d.slice(0, 7) === iso.slice(0, 7) ? fmtDay : fmtDayMonth;
      const when = fmt.format(toDate(d));
      items.push([isRest(t1) && !isRest(t) ? `Reprise ${when}` : capitalize(when), t]);
      break;
    }
    return items.map(([lbl, t]) =>
      `<span class="next-item" style="${typeVars(t)}"><span class="dot"></span>${lbl} <b>${LABELS[t]}</b></span>`).join('');
  }

  function renderNote(text) {
    $('#note-btn').setAttribute('aria-pressed', !!text);
    note.hidden = !editingNote;
    preview.hidden = editingNote || !text;
    preview.innerHTML = `${icon('note', 16)}<span>${esc(text)}</span>`;
  }

  function renderDay() {
    const s = store.state;
    const n = s.cycle.days.length;
    const info = dayInfo(s, selected);
    const diff = dayNum(selected) - dayNum(today);
    // Au-delà d'un mois, « Dans 1605 jours » ne parle à personne : on affiche la date avec l'année.
    $('#day-kicker').textContent = Math.abs(diff) <= 31
      ? `${relative(diff)} · ${fmtKicker.format(toDate(selected))}`
      : capitalize(fmtKickerYear.format(toDate(selected)));
    $('#day-shift').textContent = LABELS[info.type];
    const sub = $('#day-sub');
    sub.hidden = !(info.conge && info.shift !== 'repos');
    sub.textContent = sub.hidden ? '' : `${LABELS[info.shift]} au planning`;
    $('#day-badge').textContent = `Jour ${info.index + 1}/${n}`;

    const bar = $('#cycle-bar');
    bar.style.setProperty('--n', n);
    bar.style.setProperty('--gap', n > 20 ? '2px' : '4px');
    bar.setAttribute('aria-label', `Jour ${info.index + 1} sur ${n} du cycle`);
    bar.innerHTML = s.cycle.days
      .map((t, i) => `<span class="${i === info.index ? 'on' : (t === 'repos' ? 'repos' : '')}" style="${typeVars(t)}"></span>`).join('');

    $('#next-line').innerHTML = nextItems(selected, diff);

    if (note.dataset.iso !== selected) editingNote = false;
    if (note.dataset.iso !== selected || document.activeElement !== note) {
      note.value = info.note;
      note.dataset.iso = selected;
    }
    renderNote(info.note);
    if (editingNote) autoGrow(note);
    $('#day-conge').setAttribute('aria-pressed', info.conge);
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

  // La note ne s'ouvre qu'à la demande, pour garder la carte compacte.
  function openNote() {
    editingNote = true;
    renderNote(note.value);
    autoGrow(note);
    note.focus();
  }
  $('#note-btn').addEventListener('click', () => {
    if (editingNote) note.blur();
    else openNote();
  });
  preview.addEventListener('click', openNote);
  note.addEventListener('blur', () => {
    editingNote = false;
    renderNote(note.value.trim() ? note.value : '');
  });

  note.addEventListener('input', () => {
    const iso = note.dataset.iso;
    const text = note.value;
    autoGrow(note);
    store.update(s => {
      if (text.trim()) s.notes[iso] = text;
      else delete s.notes[iso];
    }, { silent: true });
    $('#note-btn').setAttribute('aria-pressed', !!text.trim());
    for (const b of track.querySelectorAll(`[data-iso="${iso}"]`)) b.classList.toggle('has-note', !!text.trim());
  });

  $('#day-conge').addEventListener('click', () => {
    const iso = selected;
    store.update(s => {
      if (s.conges[iso]) delete s.conges[iso];
      else s.conges[iso] = true;
    });
  });

  return { render, refreshToday, goToday };
}
