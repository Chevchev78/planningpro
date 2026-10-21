import { store, LABELS } from './store.js';
import { applyTheme, followSystemTheme } from './theme.js';
import { initCalendar } from './calendar.js';
import { initOptions } from './options.js';
import { $, $$, typeVars } from './ui.js';
import { icon } from './icons.js';

store.load();
applyTheme(store.state);
followSystemTheme(() => store.state);

for (const el of $$('[data-icon]')) {
  el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon, Number(el.dataset.size) || 20));
}

// Exemples du guide : deux matins, deux nuits, deux repos.
const demo = ['matin', 'matin', 'nuit', 'nuit', 'repos', 'repos'];
const demoChips = todayIdx => demo.map((t, i) => `
  <span class="chip${i === todayIdx ? ' is-today' : ''}" style="${typeVars(t)}">
    <span class="chip-num">J${i + 1}</span><span class="chip-icon">${icon(t, 14)}</span><span class="chip-label">${LABELS[t]}</span>
  </span>`).join('');
$('#demo-cycle').innerHTML = demoChips(-1);
$('#demo-today').innerHTML = demoChips(2);

const calendar = initCalendar();
const options = initOptions();

store.subscribe(() => {
  applyTheme(store.state);
  calendar.render();
  options.render();
});

// ----- Navigation par ancre (#reglages, #guide, #apropos) -----
const ROUTES = { '#reglages': 'options', '#guide': 'help', '#apropos': 'about' };
const TITLES = {
  calendar: 'PlanningPro',
  options: 'Réglages · PlanningPro',
  help: 'Guide · PlanningPro',
  about: 'À propos · PlanningPro',
};

function route() {
  const name = ROUTES[location.hash] ?? 'calendar';
  options.closeSheet();
  for (const v of $$('.view')) v.hidden = v.dataset.view !== name;
  document.title = TITLES[name];
  if (name === 'calendar') calendar.refreshToday();
  if (name === 'options') options.render();
  if (name === 'help') {
    $('#help-back').hidden = store.isNew;
    $('#btn-start').textContent = store.isNew ? 'Configurer mon cycle' : 'Ouvrir les réglages';
  }
  window.scrollTo(0, 0);
}

$('#btn-start').addEventListener('click', () => {
  store.save();
  location.hash = '#reglages';
});

if (store.isNew) history.replaceState(null, '', '#guide');
calendar.render();
route();
addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => { if (!document.hidden) calendar.refreshToday(); });

if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
