/* Odporni i gotowi — wspólny rdzeń narzędzi
   Dane zapisywane są wyłącznie w przeglądarce uczestnika (localStorage).
   Nic nie jest wysyłane automatycznie. Raport wysyła uczestnik z własnej poczty. */
(function () {
  'use strict';
  var EMAIL = 'jaroslaw.chybicki@lyrapolska.pl';
  var P = 'fortum:';

  /* ---------- katalog narzędzi ---------- */
  var CATALOG = [
    { stage: 1, id: 'kolo-zycia', title: 'Koło życia lidera', desc: 'Oceń 8 obszarów życia, wskaż Dźwignię: obszar, którego zmiana pociągnie resztę.', time: '15 min' },
    { stage: 1, id: 'wartosci', title: 'Co jest dla mnie ważne?', desc: 'Wybierz swoje wartości (ACT), wskaż Top 3 i sprawdź, na ile obecnie według nich żyjesz.', time: '20 min' },
    { stage: 1, id: 'act-matrix', title: 'Matryca ACT', desc: 'Jedna kartka, cztery pola: co ważne, co robię „ku”, co przeszkadza, co robię „od”.', time: '15 min' },
    { stage: 1, id: 'dziennik-energii', title: 'Dziennik energii (Thayer)', desc: 'Przez 5 dni notuj energię i napięcie 3–4 razy dziennie. Zobacz swoją mapę i „czerwoną linię”.', time: '5 dni × 2 min' },
    { stage: 2, id: 'drivery', title: 'Wewnętrzne drivery', desc: '25 stwierdzeń, 5 driverów (Kahler). Twój dominujący driver i osobiste „pozwolenie”.', time: '10 min' },
    { stage: 2, id: 'koszt-standardow', title: 'Koszt moich standardów', desc: 'Bilans reguły „muszę dopilnować wszystkiego” + defuzja + eksperyment behawioralny.', time: '20 min' },
    { stage: 2, id: 'ruminacja', title: 'Myśleć o problemie czy problemem?', desc: 'Protokół MCT: odraczanie ruminacji, dziennik, uważność zdystansowana.', time: '10 min + dziennik' },
    { stage: 2, id: 'praktyki', title: 'Praktyki regulacji', desc: 'HEAL, przestrzeń trzech kroków, oddech 4–6, przerwa na samowspółczucie, próg sali.', time: '1–5 min' },
    { stage: 3, id: 'delegowanie', title: 'Mapa delegowania', desc: '7 poziomów delegowania: gdzie jest dziś każda decyzja, a gdzie powinna być.', time: '20 min' },
    { stage: 3, id: 'regeneracja', title: 'Regeneracja i strategiczne wyspy', desc: '4 wymiary regeneracji (Sonnentag i Fritz) i plan „wysp” w tygodniu.', time: '15 min' },
    { stage: 3, id: 'woop', title: 'WOOP: plan jeśli–to', desc: 'Życzenie, Efekt, Przeszkoda, Plan. Intencje implementacyjne i 14-dniowy monitoring.', time: '10 min' },
    { stage: 3, id: 'sygnaly', title: 'Protokół wczesnych sygnałów', desc: 'Zielona, żółta, czerwona strefa: co zauważam, co robię, kto mnie wspiera.', time: '20 min' },
    { stage: 0, id: 'gas', title: 'Moje cele procesu (GAS)', desc: 'Skala osiągania celów: 1–3 cele, poziomy od −2 do +2, pomiar na starcie i na końcu.', time: '15 min' },
    { stage: 0, id: 'po-sesji', title: 'Informacja zwrotna po sesji', desc: 'Cztery suwaki i dwa pytania. 60 sekund, które pomagają dopasować kolejne spotkanie.', time: '1 min' }
  ];
  var STAGES = {
    1: { name: 'Sesja 1', sub: 'Mapa i kierunek' },
    2: { name: 'Sesja 2', sub: 'Mechanizmy przeciążenia' },
    3: { name: 'Sesja 3', sub: 'Zmiana i transfer' },
    0: { name: 'Przez cały proces', sub: 'Cele i informacja zwrotna' }
  };

  /* ---------- pamięć przeglądarki ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(P + k); } catch (e) {} },
    keys: function () { try { return Object.keys(localStorage).filter(function (k) { return k.indexOf(P) === 0; }).map(function (k) { return k.slice(P.length); }); } catch (e) { return []; } }
  };

  /* ---------- pomocnicze ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function today() { var d = new Date(); return d.toLocaleDateString('pl-PL'); }
  function isoDate() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function autoGrow(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); var a = arguments; t = setTimeout(function () { fn.apply(null, a); }, ms); }; }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/markdown;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function copy(text) { try { if (navigator.clipboard) return navigator.clipboard.writeText(text).then(function(){return true;}, function(){return false;}); } catch (e) {} return Promise.resolve(false); }
  function nameOf() { return store.get('name', '') || ''; }

  /* Markdown builders */
  var md = {
    h: function (t, l) { return '\n' + '#'.repeat(l || 2) + ' ' + t + '\n'; },
    f: function (label, v) { v = (v == null ? '' : String(v)).trim(); return v ? '**' + label + ':** ' + (v.indexOf('\n') > -1 ? '\n' + v : v) + '\n\n' : ''; },
    list: function (arr) { return arr.filter(Boolean).map(function (x) { return '- ' + x; }).join('\n') + (arr.length ? '\n\n' : ''); },
    table: function (head, rows) {
      if (!rows.length) return '';
      var c = function (x) { return String(x == null ? '' : x).replace(/\|/g, '/').replace(/\n/g, ' '); };
      return '| ' + head.map(c).join(' | ') + ' |\n|' + head.map(function () { return '---'; }).join('|') + '|\n' +
        rows.map(function (r) { return '| ' + r.map(c).join(' | ') + ' |'; }).join('\n') + '\n\n';
    }
  };

  /* ---------- wspólny nagłówek i stopka ---------- */
  function chrome(current) {
    var h = $('header.site');
    if (h) h.innerHTML = '<div class="wrap"><a class="brand" href="../"><img src="../assets/znak-jasny.png" alt="">Odporni i gotowi <small>Narzędzia coachingowe</small></a>' +
      '<nav aria-label="Główna"><a href="index.html"' + (current === 'index' ? ' aria-current="page"' : '') + '>Narzędzia</a>' +
      '<a href="praktyki.html"' + (current === 'praktyki' ? ' aria-current="page"' : '') + '>Praktyki</a>' +
      '<a href="moj-proces.html"' + (current === 'moj-proces' ? ' aria-current="page"' : '') + '>Mój proces</a>' +
      '<a href="../">Strona główna</a></nav></div>';
    var f = $('footer.site');
    if (f) f.innerHTML = '<div class="wrap"><div><b>Odporni i gotowi</b> · program dla zespołu zarządzającego Fortum<br>' +
      'Twoje odpowiedzi zapisują się tylko w tej przeglądarce. Nikt poza Tobą ich nie widzi, dopóki sam(a) ich nie wyślesz.</div>' +
      '<div>Prowadzący: Jarosław Chybicki<br><a href="mailto:' + EMAIL + '">' + EMAIL + '</a> · <a href="https://lyrapolska.pl" rel="noopener">lyrapolska.pl</a> · <a href="../#napisz">Napisz wiadomość</a></div></div>';
  }

  /* ---------- modal ---------- */
  function modal(title, html, buttons) {
    var m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="box"><h2>' + esc(title) + '</h2><div>' + html + '</div><div class="actions"></div></div>';
    var act = $('.actions', m);
    (buttons || [{ label: 'OK', primary: true }]).forEach(function (b) {
      var el = document.createElement('button'); el.textContent = b.label; if (b.primary) el.className = 'primary'; if (b.danger) el.className = 'danger';
      el.onclick = function () { m.remove(); if (b.onClick) b.onClick(); }; act.appendChild(el);
    });
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { m.remove(); document.removeEventListener('keydown', k); } });
    document.body.appendChild(m); var first = $('button.primary', m) || $('button', m); if (first) first.focus();
  }

  /* ---------- wysyłka raportu ---------- */
  function sendReport(title, text, fileName) {
    download(fileName, text);
    copy(text);
    var subject = 'Raport – ' + title + (nameOf() ? ' – ' + nameOf() : '');
    var body;
    if (text.length < 1600) body = text;
    else body = 'Dzień dobry,\n\nw załączniku przesyłam plik „' + fileName + '” (' + title + ').\n\nPozdrawiam\n' + (nameOf() || '');
    var href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    modal('Wysyłka do Jarka',
      '<p>Plik <b>' + esc(fileName) + '</b> został pobrany do folderu <i>Pobrane</i>, a jego treść skopiowana do schowka.</p>' +
      '<p>Za chwilę otworzy się Twój program pocztowy z adresem <b>' + EMAIL + '</b> i tematem „' + esc(subject) + '”.</p>' +
      (text.length < 1600 ? '<p>Raport jest już w treści maila. Możesz go wysłać od razu.</p>' : '<p><b>Dołącz pobrany plik jako załącznik</b> albo wklej treść ze schowka (Ctrl+V / ⌘V).</p>') +
      '<p class="small muted">Jeśli program pocztowy się nie otworzył, napisz bezpośrednio na ' + EMAIL + '.</p>',
      [{ label: 'Anuluj' }, { label: 'Otwórz pocztę', primary: true, onClick: function () { window.location.href = href; } }]);
  }

  /* ---------- pasek narzędzi ---------- */
  function toolbar(api) {
    var host = $('[data-toolbar]'); if (!host) return;
    host.className = 'toolbar no-print';
    host.innerHTML = '<div class="wrap"><label class="who">Imię lub inicjały <input type="text" data-global="name" autocomplete="off"></label>' +
      '<span class="saved" aria-live="polite">✓ Zapisano</span><span class="spacer"></span>' +
      '<button type="button" data-act="md">Pobierz .md</button>' +
      '<button type="button" data-act="print">Drukuj / PDF</button>' +
      '<button type="button" class="primary" data-act="send">Wyślij do Jarka</button>' +
      '<button type="button" class="ghost danger" data-act="reset" title="Usuń odpowiedzi z tego narzędzia">Wyczyść</button></div>';
    var n = $('[data-global=name]', host); n.value = nameOf();
    n.addEventListener('input', function () { store.set('name', n.value.trim()); api && api.save(); });
    $$('[data-act]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === 'md') download(api.fileName(), api.markdown());
        if (a === 'print') window.print();
        if (a === 'send') sendReport(api.title, api.markdown(), api.fileName());
        if (a === 'reset') modal('Wyczyścić odpowiedzi?', '<p>Usuniesz wszystko, co wpisano w tym narzędziu w tej przeglądarce. Tej operacji nie można cofnąć.</p><p class="small muted">Wskazówka: najpierw pobierz plik .md jako kopię.</p>',
          [{ label: 'Anuluj' }, { label: 'Wyczyść', danger: true, onClick: api.reset }]);
      });
    });
  }

  /* ---------- rejestracja narzędzia ---------- */
  function Tool(cfg) {
    chrome(cfg.id);
    var key = 'tool:' + cfg.id;
    var fresh = function () { var d = cfg.defaults ? cfg.defaults() : {}; d.f = d.f || {}; return d; };
    var state = store.get(key, null) || fresh();
    state.f = state.f || {};
    var savedEl;
    var persist = debounce(function () {
      state.updated = new Date().toISOString();
      var ok = store.set(key, state);
      try { store.set('md:' + cfg.id, { title: cfg.title, updated: state.updated, md: api.markdown() }); } catch (e) {}
      savedEl = savedEl || $('.saved');
      if (savedEl && ok) { savedEl.classList.add('on'); setTimeout(function () { savedEl.classList.remove('on'); }, 1200); }
    }, 350);

    var api = {
      title: cfg.title, state: function () { return state; },
      save: function () { persist(); },
      fileName: function () { return slug(cfg.title) + (nameOf() ? '-' + slug(nameOf()) : '') + '-' + isoDate() + '.md'; },
      markdown: function () {
        var head = '# ' + cfg.title + '\n\n*Odporni i gotowi · Lyra Polska × Fortum*  \n' +
          (nameOf() ? '**Uczestnik:** ' + nameOf() + '  \n' : '') + '**Data:** ' + today() + '\n';
        var body = (cfg.toMarkdown ? cfg.toMarkdown(state, api) : '');
        // usuń puste nagłówki sekcji (nagłówek, po którym od razu jest kolejny nagłówek lub koniec)
        body = body.replace(/\n#{2,3} [^\n]+\n+(?=\n#{2,3} |\s*$)/g, '\n');
        return head + body + '\n---\n*Materiał poufny, przeznaczony do pracy coachingowej.*\n';
      },
      reset: function () { store.del(key); store.del('md:' + cfg.id); state = fresh(); location.reload(); },
      bind: bindFields,
      md: md, esc: esc, store: store, $: $, $$: $$, autoGrow: autoGrow
    };

    function bindFields(root) {
      $$('[data-k]', root || document).forEach(function (el) {
        if (el._bound) return; el._bound = true;
        var k = el.getAttribute('data-k'), v = state.f[k];
        if (el.type === 'checkbox') el.checked = !!v;
        else if (el.type === 'radio') el.checked = (v === el.value);
        else if (v != null) el.value = v;
        var out = el.type === 'range' ? el.parentNode.querySelector('output') : null;
        if (out) out.textContent = el.value;
        var h = function () {
          if (el.type === 'checkbox') state.f[k] = el.checked;
          else if (el.type === 'radio') { if (el.checked) state.f[k] = el.value; }
          else state.f[k] = el.value;
          if (out) out.textContent = el.value;
          if (el.tagName === 'TEXTAREA') autoGrow(el);
          if (cfg.onChange) cfg.onChange(state, api, k);
          persist();
        };
        el.addEventListener('input', h); el.addEventListener('change', h);
        if (el.tagName === 'TEXTAREA') setTimeout(function () { autoGrow(el); }, 0);
      });
    }

    toolbar(api);
    if (cfg.init) cfg.init(state, api);
    bindFields();
    if (cfg.onChange) cfg.onChange(state, api, null);
    window.addEventListener('beforeprint', function () { $$('textarea').forEach(autoGrow); });
    window.addEventListener('resize', debounce(function () { $$('textarea').forEach(autoGrow); }, 200));
    return api;
  }

  window.OG = { Tool: Tool, CATALOG: CATALOG, STAGES: STAGES, store: store, md: md, esc: esc, $: $, $$: $$, chrome: chrome,
    download: download, sendReport: sendReport, modal: modal, slug: slug, isoDate: isoDate, today: today, nameOf: nameOf, EMAIL: EMAIL, autoGrow: autoGrow };
})();
