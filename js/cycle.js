// Calculs de dates et de cycle. Les dates sont manipulées en chaînes « AAAA-MM-JJ »
// et converties en numéros de jour UTC, ce qui évite les décalages d'heure d'été.

const DAY_MS = 86400000;

const pad = n => String(n).padStart(2, '0');
export const mod = (a, n) => ((a % n) + n) % n;

// month est 1-based (1 = janvier)
export const isoFromParts = (y, month, d) => `${y}-${pad(month)}-${pad(d)}`;

export function todayISO(now = new Date()) {
  return isoFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function dayNum(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function isoFromDayNum(n) {
  const dt = new Date(n * DAY_MS);
  return isoFromParts(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export const addDays = (iso, n) => isoFromDayNum(dayNum(iso) + n);

// Position (0-based) d'une date dans le cycle. anchor = date du jour 1.
export function cycleIndex(cycle, iso) {
  return mod(dayNum(iso) - dayNum(cycle.anchor), cycle.days.length);
}

export function dayInfo(state, iso) {
  const index = cycleIndex(state.cycle, iso);
  const shift = state.cycle.days[index];
  const conge = state.conges[iso] === true;
  return { iso, index, shift, conge, type: conge ? 'conge' : shift, note: state.notes[iso] || '' };
}

// 6 semaines complètes (lundi → dimanche) couvrant le mois. month est 0-based.
export function monthCells(year, month) {
  const first = dayNum(isoFromParts(year, month + 1, 1));
  const offset = mod(new Date(Date.UTC(year, month, 1)).getUTCDay() - 1, 7);
  return Array.from({ length: 42 }, (_, i) => {
    const iso = isoFromDayNum(first - offset + i);
    return { iso, day: Number(iso.slice(8)), inMonth: Number(iso.slice(5, 7)) === month + 1 };
  });
}
