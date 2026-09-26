// Quiz „Mity o stresie i wypaleniu” – treść w tresci/quiz.json (edycja w Pages CMS).

(async function () {
  const el = document.getElementById('quiz');
  let dane;
  try { dane = await wczytajJson('quiz.json'); } catch (e) { bladWczytania(el, e); return; }
  const pyt = (dane.pytania || []).filter((p) => p.twierdzenie && !p.ukryj);
  let i = 0; const odp = [];

  function start() {
    el.innerHTML = `<p class="cw-lead" style="margin:0 0 16px">${esc(dane.wstep || '')}</p>
      <div class="me-actions"><button type="button" class="btn" id="q-start">Zaczynamy</button></div>`;
    document.getElementById('q-start').addEventListener('click', () => { i = 0; odp.length = 0; pytanie(); });
  }

  function pytanie() {
    const p = pyt[i];
    el.innerHTML = `
      <div class="q-prog" aria-hidden="true"><span style="width:${i / pyt.length * 100}%"></span></div>
      <span class="q-num">Stwierdzenie ${i + 1} z ${pyt.length}</span>
      <p class="q-text">${esc(p.twierdzenie)}</p>
      <div class="q-btns"><button type="button" data-v="1">Prawda</button><button type="button" data-v="0">Fałsz</button></div>
      <div id="q-fb"></div>`;
    el.querySelectorAll('.q-btns button').forEach((b) => b.addEventListener('click', () => ocen(b)));
    el.querySelector('.q-btns button').focus({ preventScroll: true });
  }

  function ocen(b) {
    const p = pyt[i];
    const wybor = b.dataset.v === '1';
    const dobrze = wybor === !!p.prawda;
    odp.push(dobrze);
    el.querySelectorAll('.q-btns button').forEach((x) => {
      x.disabled = true;
      if ((x.dataset.v === '1') === !!p.prawda) x.classList.add('ok');
      else if (x === b) x.classList.add('bad');
    });
    const ost = i === pyt.length - 1;
    document.getElementById('q-fb').innerHTML = `
      <div class="q-fb ${dobrze ? '' : 'bad'}">
        <strong class="v">${dobrze ? 'Dobrze!' : 'Nie tym razem.'} To ${p.prawda ? 'prawda' : 'mit'}.</strong>
        <div class="md">${renderMd(p.wyjasnienie)}</div>
        ${p.link ? `<p style="margin:.6em 0 0"><a href="${esc(p.link)}">Więcej: ${esc(p.link_tekst || 'czytaj dalej')} →</a></p>` : ''}
      </div>
      <div class="me-actions"><button type="button" class="btn" id="q-next">${ost ? 'Zobacz wynik' : 'Dalej →'}</button></div>`;
    const n = document.getElementById('q-next');
    n.addEventListener('click', () => { i += 1; if (i < pyt.length) pytanie(); else wynik(); el.scrollIntoView({ block: 'start' }); });
    n.focus({ preventScroll: true });
    document.getElementById('q-fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function wynik() {
    const ok = odp.filter(Boolean).length;
    const kom = ok >= pyt.length - 1 ? 'Świetnie – dobrze znasz aktualną wiedzę o stresie i wypaleniu.'
      : ok >= pyt.length * 0.7 ? 'Dobry wynik. Kilka popularnych przekonań warto jeszcze zweryfikować – szczegóły poniżej.'
      : 'Wiele z tych mitów jest bardzo rozpowszechnionych – także wśród menedżerów. Przejrzyj wyjaśnienia poniżej.';
    el.innerHTML = `
      <div class="q-prog" aria-hidden="true"><span style="width:100%"></span></div>
      <span class="q-num">Wynik</span>
      <p class="q-sum">${ok} / ${pyt.length}</p>
      <p>${kom}</p>
      <ul class="q-review">${pyt.map((p, j) => `<li><span class="i ${odp[j] ? 'ok' : 'bad'}">${odp[j] ? '✓' : '✗'}</span>
        <span>${esc(p.twierdzenie)} <strong>${p.prawda ? 'Prawda' : 'Mit'}.</strong>${p.link ? ` <a href="${esc(p.link)}">Więcej →</a>` : ''}</span></li>`).join('')}</ul>
      <div class="me-actions"><button type="button" class="btn" id="q-again">Spróbuj jeszcze raz</button><a class="btn ghost" href="cwiczenia.html">Inne ćwiczenia</a></div>`;
    document.getElementById('q-again').addEventListener('click', () => { i = 0; odp.length = 0; pytanie(); });
  }

  start();
})();
