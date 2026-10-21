import { todayISO, dayNum, isoFromDayNum } from './cycle.js';

export const KEY = 'planningpro.v1';
export const MAX_DAYS = 60;
export const SHIFTS = ['matin', 'apresmidi', 'soiree', 'nuit', 'journee', 'repos'];
export const TYPES = [...SHIFTS, 'conge'];

export const LABELS = {
  matin: 'Matin',
  apresmidi: 'Après-midi',
  soiree: 'Soirée',
  nuit: 'Nuit',
  journee: 'Journée',
  repos: 'Repos',
  conge: 'Congé',
};

// Initiale affichée dans les pastilles du cycle
export const LETTERS = { matin: 'M', apresmidi: 'A', soiree: 'S', nuit: 'N', journee: 'J', repos: 'R', conge: 'C' };

export const DEFAULT_COLORS = {
  matin: '#f2b33d',
  apresmidi: '#ee7b4a',
  soiree: '#d6517d',
  nuit: '#4561d6',
  journee: '#8bc34a',
  repos: '#5a5a63',
  conge: '#2bb39a',
};

// Palette de la v1 : une couleur restée à son ancienne valeur par défaut passe à la nouvelle.
const OLD_DEFAULT_COLORS = {
  matin: '#f5a524',
  apresmidi: '#2fbf71',
  soiree: '#ef5f5a',
  nuit: '#6d6af5',
  journee: '#2fb3e0',
  repos: '#8b93a7',
  conge: '#e25bb5',
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;
const isISO = s => typeof s === 'string' && ISO_RE.test(s) && isoFromDayNum(dayNum(s)) === s;

function fresh() {
  return {
    cycle: { days: ['matin', 'matin', 'nuit', 'nuit', 'repos', 'repos'], anchor: todayISO() },
    notes: {},
    conges: {},
    dark: null,
    colors: { ...DEFAULT_COLORS },
  };
}

// Valide des données non fiables (localStorage ou fichier importé). Lève une erreur si inutilisables.
export function sanitize(raw) {
  const c = raw && raw.cycle;
  if (!c || !Array.isArray(c.days) || !c.days.length || c.days.length > MAX_DAYS
    || !c.days.every(d => SHIFTS.includes(d)) || !isISO(c.anchor)) {
    throw new Error('Données de cycle invalides');
  }
  const notes = {};
  for (const [k, v] of Object.entries(raw.notes || {})) {
    if (isISO(k) && typeof v === 'string' && v.trim()) notes[k] = v.slice(0, 2000);
  }
  const conges = {};
  for (const [k, v] of Object.entries(raw.conges || {})) {
    if (isISO(k) && v === true) conges[k] = true;
  }
  const colors = { ...DEFAULT_COLORS };
  for (const t of TYPES) {
    const v = raw.colors && raw.colors[t];
    if (typeof v === 'string' && HEX_RE.test(v) && v.toLowerCase() !== OLD_DEFAULT_COLORS[t]) colors[t] = v.toLowerCase();
  }
  return {
    cycle: { days: [...c.days], anchor: c.anchor },
    notes,
    conges,
    dark: typeof raw.dark === 'boolean' ? raw.dark : null,
    colors,
  };
}

const listeners = new Set();
const emit = () => listeners.forEach(fn => fn());

export const store = {
  state: fresh(),
  isNew: true,

  load() {
    try {
      this.state = sanitize(JSON.parse(localStorage.getItem(KEY)));
      this.isNew = false;
    } catch {
      this.state = fresh();
      this.isNew = true;
    }
  },

  save() {
    this.isNew = false;
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch {}
  },

  // silent : enregistre sans redessiner (ex. saisie d'une note)
  update(fn, { silent = false } = {}) {
    fn(this.state);
    this.save();
    if (!silent) emit();
  },

  replace(next) {
    this.state = next;
    this.save();
    emit();
  },

  subscribe(fn) {
    listeners.add(fn);
  },
};
