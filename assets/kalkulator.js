// Kalkulator kosztów wypalenia, prezenteizmu i rotacji.
// Wartości domyślne i ich źródła: patrz etykiety w kalkulator.html.

const DOMYSLNE = {
  n: 12,          // osób w zespole
  brutto: 9260,   // zł/mies., GUS sierpień 2026
  narzut: 20.5,   // % składek po stronie pracodawcy
  absP: 10,       // % osób ze zwolnieniem z przyczyn psychicznych w roku (założenie)
  absD: 19,       // dni, ZUS 2024: 30,3 mln dni / 1,6 mln zwolnień
  absZ: 50,       // % wartości dnia pracy – koszt zastępstwa/utraconej pracy
  preP: 22,       // % osób z objawami wypalenia, McKinsey 2023
  preL: 15,       // % spadku efektywności (założenie ostrożne)
  rotN: 1,        // odejścia w roku
  rotK: 200,      // % rocznego wynagrodzenia – koszt zastąpienia (Gallup)
  prog: 0,        // zł, koszt programu – wpisuje użytkownik
  red: 20,        // % obniżenia kosztów dzięki programowi
};

const DNI_ROBOCZE = 250;
const LIMIT_CHOROBOWE = 33; // dni w roku płatne przez pracodawcę (art. 92 KP)

const f = document.getElementById('calc');
const zl = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
const pct = (x) => (Math.round(x * 10) / 10).toLocaleString('pl-PL') + '%';
const $ = (id) => document.getElementById(id);

function wartosci() {
  const v = {};
  for (const k of Object.keys(DOMYSLNE)) {
    const x = parseFloat(String(f.elements[k].value).replace(',', '.'));
    v[k] = Number.isFinite(x) && x >= 0 ? x : 0;
  }
  return v;
}

function ustaw(v) {
  for (const [k, x] of Object.entries(v)) if (f.elements[k]) f.elements[k].value = x;
}

function licz() {
  const v = wartosci();
  const rocznyBrutto = v.brutto * 12;
  const rocznyKoszt = rocznyBrutto * (1 + v.narzut / 100);   // koszt pracodawcy na osobę
  const dzienPracy = rocznyKoszt / DNI_ROBOCZE;
  const budzet = rocznyKoszt * v.n;

  // Absencja
  const osobyAbs = v.n * v.absP / 100;
  const dniChorobowe = Math.min(v.absD, LIMIT_CHOROBOWE);
  const chorobowe = osobyAbs * dniChorobowe * (v.brutto / 30) * 0.8;          // wypłata pracodawcy
  const dniRobocze = v.absD * 5 / 7;
  const zastepstwo = osobyAbs * dniRobocze * dzienPracy * v.absZ / 100;        // utracona praca
  const abs = chorobowe + zastepstwo;

  // Prezenteizm
  const osobyPre = v.n * v.preP / 100;
  const pre = osobyPre * rocznyKoszt * v.preL / 100;

  // Rotacja
  const rot = v.rotN * rocznyBrutto * v.rotK / 100;

  const suma = abs + pre + rot;

  $('d-team').textContent = `Roczny koszt pracodawcy na osobę: ${zl.format(rocznyKoszt)} · wartość dnia pracy: ${zl.format(dzienPracy)} · koszty wynagrodzeń zespołu: ${zl.format(budzet)}`;
  $('d-abs').textContent = `${osobyAbs.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} os. × ${v.absD} dni → wynagrodzenie chorobowe ${zl.format(chorobowe)} + utracona praca ${zl.format(zastepstwo)} = ${zl.format(abs)}`;
  $('d-pre').textContent = `${osobyPre.toLocaleString('pl-PL', { maximumFractionDigits: 1 })} os. × ${pct(v.preL)} efektywności → ${zl.format(pre)} rocznie`;
  $('d-rot').textContent = `${v.rotN} × ${pct(v.rotK)} rocznego wynagrodzenia → ${zl.format(rot)}`;

  const czesci = [['Absencja', abs, 'a'], ['Prezenteizm', pre, 'p'], ['Rotacja', rot, 'r']];
  const max = Math.max(...czesci.map((c) => c[1]), 1);
  $('bars').innerHTML = czesci.map(([n, x, c]) => `
    <div class="bar"><span class="lbl">${n}</span>
      <span class="track"><span class="fill ${c}" style="width:${(x / max * 100).toFixed(1)}%"></span></span>
      <span class="val">${zl.format(x)}</span></div>`).join('');

  $('t-sum').textContent = zl.format(suma);
  $('t-per').textContent = zl.format(v.n ? suma / v.n : 0);
  $('t-pct').textContent = budzet ? pct(suma / budzet * 100) : '–';

  const oszczednosc = suma * v.red / 100;
  const netto = oszczednosc - v.prog;
  $('r-save').textContent = zl.format(oszczednosc);
  $('r-net').textContent = v.prog ? zl.format(netto) : 'wpisz koszt programu';
  $('r-net').className = v.prog && netto < 0 ? 'neg' : (v.prog ? '' : 'hint');
  $('r-roi').textContent = v.prog ? (oszczednosc / v.prog).toLocaleString('pl-PL', { maximumFractionDigits: 2 }) + ' zł' : '–';

  f.querySelectorAll('output').forEach((o) => { o.textContent = pct(v[o.dataset.for]); });
  zapiszWAdresie(v);
}

// Wartości w adresie (#n=12&brutto=...) – link odtwarza wyliczenie.
function zapiszWAdresie(v) {
  const q = new URLSearchParams();
  for (const [k, x] of Object.entries(v)) if (x !== DOMYSLNE[k]) q.set(k, x);
  history.replaceState(null, '', q.toString() ? '#' + q : location.pathname + location.search);
}

function wczytajZAdresu() {
  const v = { ...DOMYSLNE };
  const q = new URLSearchParams(location.hash.slice(1));
  for (const k of Object.keys(DOMYSLNE)) {
    const x = parseFloat(q.get(k));
    if (Number.isFinite(x) && x >= 0) v[k] = x;
  }
  return v;
}

function toast(t) {
  const el = $('toast'); el.textContent = t;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.textContent = ''; }, 2500);
}

ustaw(wczytajZAdresu());
licz();
f.addEventListener('input', licz);
$('reset').addEventListener('click', () => { ustaw(DOMYSLNE); licz(); });
$('print').addEventListener('click', () => window.print());
$('share').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Link skopiowany'); }
  catch (e) { prompt('Skopiuj link:', location.href); }
});
