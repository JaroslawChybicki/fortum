// Formularz kontaktowy – wysyłka przez Netlify Forms bez przeładowania strony.
// Bez JavaScriptu formularz działa zwykłym POST-em (Netlify obsługuje go tak samo).
(function () {
  const form = document.querySelector('form[name="kontakt"]');
  if (!form) return;
  const status = form.querySelector('.kstatus');
  const btn = form.querySelector('button[type=submit]');

  const pokaz = (txt, ok) => { status.textContent = txt; status.className = 'kstatus ' + (ok ? 'ok' : 'err'); };
  const podziekuj = () => {
    form.innerHTML = `<h2>Dziękuję za wiadomość</h2>
      <p class="kform-lead">Wiadomość dotarła. Odpowiem na podany adres e-mail – zwykle w ciągu 2 dni roboczych.</p>`;
    form.classList.add('sent');
  };

  if (new URLSearchParams(location.search).get('wyslano')) podziekuj();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    btn.disabled = true; pokaz('Wysyłam…', true);
    try {
      const r = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!r.ok) throw new Error(r.status);
      podziekuj();
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      btn.disabled = false;
      pokaz('Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę albo napisz bezpośrednio na adres e-mail podany wyżej.', false);
    }
  });
})();
