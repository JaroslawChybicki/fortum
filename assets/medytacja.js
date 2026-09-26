// Odtwarzacz nagrania medytacji – z zapamiętaniem miejsca, w którym przerwano słuchanie.
const $ = (id) => document.getElementById(id);
const a = $('audio');
const KLUCZ = 'fortum_medytacja_gory_pozycja';
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const IKONY_PL = {
  graj: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
  pauza: '<rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor"/>',
};

function zapisz() { try { localStorage.setItem(KLUCZ, String(Math.floor(a.currentTime))); } catch (e) { /* bez znaczenia */ } }
function odczyt() { try { return +localStorage.getItem(KLUCZ) || 0; } catch (e) { return 0; } }

function poWczytaniu() {
  $('pasek').max = Math.floor(a.duration);
  $('calosc').textContent = mmss(a.duration);
  const t = odczyt();
  if (t > 15 && t < a.duration - 20) {
    $('wznow').hidden = false;
    $('wznow').innerHTML = `Ostatnio przerwano w ${mmss(t)}. <button type="button" class="linkbtn" id="od-miejsca">Słuchaj od tego miejsca</button> · <button type="button" class="linkbtn" id="od-poczatku">od początku</button>`;
    $('od-miejsca').addEventListener('click', () => { a.currentTime = t; a.play(); $('wznow').hidden = true; });
    $('od-poczatku').addEventListener('click', () => { a.currentTime = 0; a.play(); $('wznow').hidden = true; });
  }
}
// Dane nagrania mogą być wczytane, zanim ten skrypt się uruchomi.
if (a.readyState >= 1) poWczytaniu(); else a.addEventListener('loadedmetadata', poWczytaniu, { once: true });
a.addEventListener('timeupdate', () => {
  $('pasek').value = Math.floor(a.currentTime);
  $('teraz').textContent = mmss(a.currentTime);
  if (Math.floor(a.currentTime) % 5 === 0) zapisz();
});
a.addEventListener('play', () => { $('ikona').innerHTML = IKONY_PL.pauza; $('graj').setAttribute('aria-label', 'Pauza'); });
a.addEventListener('pause', () => { $('ikona').innerHTML = IKONY_PL.graj; $('graj').setAttribute('aria-label', 'Odtwórz'); zapisz(); });
a.addEventListener('ended', () => { try { localStorage.removeItem(KLUCZ); } catch (e) { /* */ } a.currentTime = 0; });

$('graj').addEventListener('click', () => { $('wznow').hidden = true; if (a.paused) a.play(); else a.pause(); });
$('wstecz').addEventListener('click', () => { a.currentTime = Math.max(0, a.currentTime - 15); });
$('naprzod').addEventListener('click', () => { a.currentTime = Math.min(a.duration || 0, a.currentTime + 15); });
$('pasek').addEventListener('input', () => { a.currentTime = +$('pasek').value; });

// Tytuł i sterowanie na ekranie blokady telefonu.
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({ title: 'Medytacja góry', artist: 'Jarosław Chybicki', album: 'Odporni i gotowi' });
  navigator.mediaSession.setActionHandler('seekbackward', () => { a.currentTime = Math.max(0, a.currentTime - 15); });
  navigator.mediaSession.setActionHandler('seekforward', () => { a.currentTime = Math.min(a.duration, a.currentTime + 15); });
}
