// Formularz kontaktowy – wysyłka na e-mail przez Web3Forms bez przeładowania strony.
// Bez JavaScriptu formularz działa zwykłym POST-em i wraca na stronę z podziękowaniem (pole redirect).
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
      const r = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) throw new Error(j.message || r.status);
      podziekuj();
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      btn.disabled = false;
      pokaz('Nie udało się wysłać wiadomości. Spróbuj ponownie za chwilę albo napisz bezpośrednio na adres e-mail podany wyżej.', false);
    }
  });
})();
