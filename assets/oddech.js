// Oddech z wydłużonym wydechem + trzyminutowa przestrzeń oddechowa (MBCT).

const $ = (id) => document.getElementById(id);
const bezRuchu = matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- zakładki
const tabs = [$('t-oddech'), $('t-przestrzen')];
function pokazZakladke(id) {
  tabs.forEach((t) => {
    const on = t.id === id;
    t.setAttribute('aria-selected', on);
    $(t.getAttribute('aria-controls')).hidden = !on;
  });
  stopOddech(); stopPrzestrzen();
  history.replaceState(null, '', id === 't-przestrzen' ? '#przestrzen' : location.pathname);
}
tabs.forEach((t) => t.addEventListener('click', () => pokazZakladke(t.id)));
if (location.hash === '#przestrzen') pokazZakladke('t-przestrzen');

// Blokada wygaszania ekranu na czas ćwiczenia (jeśli przeglądarka pozwala).
let blokada = null;
async function nieWygaszaj(on) {
  try {
    if (on && 'wakeLock' in navigator) blokada = await navigator.wakeLock.request('screen');
    else if (!on && blokada) { await blokada.release(); blokada = null; }
  } catch (e) { /* bez znaczenia */ }
}

// ================= ODDECH =================
let tOd = null, tLicz = null, koniecOd = 0, startOd = 0;
const kolo = $('kolo');

function faza(nazwa, sek, skala) {
  $('faza').textContent = nazwa;
  kolo.style.transitionDuration = bezRuchu ? '0s' : sek + 's';
  if (skala != null) kolo.style.transform = `scale(${skala})`;
  let n = sek;
  $('licz').textContent = n;
  clearInterval(tLicz);
  tLicz = setInterval(() => { n -= 1; $('licz').textContent = n > 0 ? n : ''; }, 1000);
  if ($('wibracje').checked && navigator.vibrate) navigator.vibrate(60);
}

function cykl() {
  const [wd, p1, wy, p2] = $('rytm-od').value.split(',').map(Number);
  const kroki = [['Wdech', wd, 1], ['Zatrzymaj', p1, null], ['Wydech', wy, 0.62], ['Pauza', p2, null]].filter((k) => k[1] > 0);
  let i = 0;
  const nast = () => {
    if (Date.now() >= koniecOd && i % kroki.length === 0) { finiszOd(); return; }
    const [n, s, sk] = kroki[i % kroki.length];
    faza(n, s, sk);
    i += 1;
    tOd = setTimeout(nast, s * 1000);
  };
  nast();
}

function postepOd() {
  const calosc = koniecOd - startOd;
  $('postep').style.width = Math.min(100, (Date.now() - startOd) / calosc * 100) + '%';
}
let tPost = null;

function startOddech() {
  startOd = Date.now(); koniecOd = startOd + (+$('czas-od').value) * 1000;
  $('start-od').hidden = true; $('stop-od').hidden = false;
  $('rytm-od').disabled = $('czas-od').disabled = true;
  nieWygaszaj(true);
  tPost = setInterval(postepOd, 500);
  cykl();
}
function stopOddech() {
  clearTimeout(tOd); clearInterval(tLicz); clearInterval(tPost);
  kolo.style.transitionDuration = '.6s'; kolo.style.transform = 'scale(.62)';
  $('faza').textContent = 'Gotowy?'; $('licz').textContent = '';
  $('postep').style.width = '0';
  $('start-od').hidden = false; $('start-od').textContent = 'Start'; $('stop-od').hidden = true;
  $('rytm-od').disabled = $('czas-od').disabled = false;
  nieWygaszaj(false);
}
function finiszOd() {
  stopOddech();
  $('postep').style.width = '100%';
  $('faza').textContent = 'Koniec';
  $('licz').textContent = 'Zauważ, jak się czujesz';
  $('start-od').textContent = 'Jeszcze raz';
  if ($('wibracje').checked && navigator.vibrate) navigator.vibrate([80, 80, 80]);
}
$('start-od').addEventListener('click', startOddech);
$('stop-od').addEventListener('click', stopOddech);

// ================= TRZYMINUTOWA PRZESTRZEŃ =================
const KROKI = [
  { t: 'Zauważ', czas: 60, tekst: 'Przyjmij wyprostowaną, godną postawę. Zapytaj siebie: <em>Co teraz jest?</em> Jakie myśli przepływają przez umysł? Jakie emocje są obecne? Jakie doznania w ciele? Nie oceniaj i niczego nie poprawiaj – tylko zauważ.' },
  { t: 'Zbierz', czas: 60, tekst: 'Skieruj uwagę na oddech – tam, gdzie czujesz go najwyraźniej, najlepiej w brzuchu. Wdech… wydech. Gdy uwaga odpłynie, zauważ to i łagodnie wróć do oddechu. Oddech jest kotwicą w teraźniejszości.' },
  { t: 'Rozszerz', czas: 60, tekst: 'Poszerz uwagę na całe ciało: postawę, wyraz twarzy, dłonie, przestrzeń wokół. Oddychaj całym ciałem. Na koniec zapytaj: <em>Czego teraz potrzebuję?</em> – i zabierz tę uważność do kolejnego zadania.' },
];
$('kroki').innerHTML = KROKI.map((k, i) => `<article class="sp-step" id="k${i}"><h3>${i + 1}. ${k.t} <small id="c${i}">1:00</small></h3><p>${k.tekst}</p></article>`).join('');

let tSp = null, krok = -1, zostalo = 0;
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function ustawKrok(i) {
  krok = i;
  KROKI.forEach((_, j) => {
    $('k' + j).classList.toggle('on', j === i);
    $('k' + j).classList.toggle('done', j < i);
    $('c' + j).textContent = j < i ? '✓' : mmss(KROKI[j].czas);
  });
  if (i >= KROKI.length) { finiszSp(); return; }
  zostalo = KROKI[i].czas;
  $('k' + i).scrollIntoView({ behavior: bezRuchu ? 'auto' : 'smooth', block: 'center' });
  if ($('wibracje').checked && navigator.vibrate) navigator.vibrate(60);
}
function tik() {
  zostalo -= 1;
  $('c' + krok).textContent = mmss(Math.max(0, zostalo));
  const upl = KROKI.slice(0, krok).reduce((s, k) => s + k.czas, 0) + (KROKI[krok].czas - zostalo);
  $('postep-sp').style.width = upl / KROKI.reduce((s, k) => s + k.czas, 0) * 100 + '%';
  if (zostalo <= 0) ustawKrok(krok + 1);
}
function startPrzestrzen() {
  $('start-sp').hidden = true; $('dalej-sp').hidden = false; $('stop-sp').hidden = false;
  nieWygaszaj(true);
  ustawKrok(0);
  tSp = setInterval(tik, 1000);
}
function stopPrzestrzen() {
  clearInterval(tSp); krok = -1;
  KROKI.forEach((k, j) => { $('k' + j).classList.remove('on', 'done'); $('c' + j).textContent = mmss(k.czas); });
  $('postep-sp').style.width = '0';
  $('start-sp').hidden = false; $('dalej-sp').hidden = true; $('stop-sp').hidden = true;
  nieWygaszaj(false);
}
function finiszSp() {
  clearInterval(tSp);
  $('postep-sp').style.width = '100%';
  $('start-sp').hidden = false; $('start-sp').textContent = 'Jeszcze raz';
  $('dalej-sp').hidden = true; $('stop-sp').hidden = true;
  nieWygaszaj(false);
  if ($('wibracje').checked && navigator.vibrate) navigator.vibrate([80, 80, 80]);
}
$('start-sp').addEventListener('click', startPrzestrzen);
$('dalej-sp').addEventListener('click', () => ustawKrok(krok + 1));
$('stop-sp').addEventListener('click', stopPrzestrzen);
