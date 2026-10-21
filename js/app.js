import { store, LABELS, LETTERS } from './store.js';
import { applyTheme, followSystemTheme } from './theme.js';
import { initCalendar } from './calendar.js';
import { initCycleView } from './cycle-view.js';
import { initSettings } from './settings.js';
import { $, $$, typeVars } from './ui.js';
import { icon } from './icons.js';

// Safari iOS ignore user-scalable=no : on bloque le pincement à la source.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, e => e.preventDefault(), { passive: false });
}

store.load();
applyTheme(store.state);
followSystemTheme(() => store.state);

for (const el of $$('[data-icon]')) {
  el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon, Number(el.dataset.size) || 20));
}

// Exemples du guide : deux matins, deux nuits, deux repos.
const demo = ['matin', 'matin', 'nuit', 'nuit', 'repos', 'repos'];
const demoPills = todayIdx => demo.map((t, i) => `
  <div class="pill-wrap">
    <span class="pill${t === 'repos' ? ' repos' : ''}" style="${typeVars(t)}"${i === todayIdx ? ' aria-pressed="true"' : ''}>
      <span class="pill-j">J${i + 1}</span><span class="pill-l">${LETTERS[t]}</span>
    </span>
    <span class="pill-tag">${i === todayIdx ? 'Auj.' : LABELS[t]}</span>
  </div>`).join('');
$('#demo-cycle').innerHTML = demoPills(-1);
$('#demo-today').innerHTML = demoPills(2);

const calendar = initCalendar();
const cycleView = initCycleView();
const settings = initSettings();

store.subscribe(() => {
  applyTheme(store.state);
  calendar.render();
  cycleView.render();
  settings.render();
});

// ----- Navigation par ancre et barre d'onglets -----
const ROUTES = { '#cycle': 'cycle', '#reglages': 'settings', '#guide': 'help', '#apropos': 'about' };
const TITLES = {
  calendar: 'PlanningPro',
  cycle: 'Cycle · PlanningPro',
  settings: 'Réglages · PlanningPro',
  help: 'Guide · PlanningPro',
  about: 'À propos · PlanningPro',
};
const TABS = ['calendar', 'cycle', 'settings'];
const current = () => ROUTES[location.hash] ?? 'calendar';

function route() {
  const name = current();
  for (const v of $$('.view')) v.hidden = v.dataset.view !== name;
  document.title = TITLES[name];

  const withDock = TABS.includes(name) && !store.isNew;
  $('#dock').hidden = !withDock;
  $('#app').classList.toggle('no-dock', !withDock);
  for (const a of $$('#dock a')) {
    if (a.dataset.tab === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  if (name === 'calendar') calendar.refreshToday();
  if (name === 'cycle') cycleView.render();
  if (name === 'settings') settings.render();
  if (name === 'help') {
    $('#help-back').hidden = store.isNew;
    $('#btn-start').textContent = store.isNew ? 'Configurer mon cycle' : 'Ouvrir mon cycle';
  }
  window.scrollTo(0, 0);
}

// Toucher « Planning » quand on y est déjà ramène à aujourd'hui.
$('#dock').addEventListener('click', e => {
  const tab = e.target.closest('a');
  if (tab && tab.dataset.tab === 'calendar' && current() === 'calendar') {
    e.preventDefault();
    calendar.goToday();
  }
});

$('#btn-start').addEventListener('click', () => {
  store.save();
  location.hash = '#cycle';
});

if (store.isNew) history.replaceState(null, '', '#guide');
calendar.render();
route();
addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => { if (!document.hidden) calendar.refreshToday(); });

if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
