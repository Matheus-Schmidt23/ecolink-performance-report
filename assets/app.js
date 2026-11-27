(function () {
  'use strict';
  var C = { g: '#00AC58', m: '#727376' };
  var nf = function (d) { return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var N = function (v, d) { return nf(d).format(v); };
  var R = function (v) { return 'R$ ' + N(v, 2); };
  var P = function (v, d) { return N(v, d == null ? 2 : d) + '%'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var sum = function (a, f) { return a.reduce(function (t, x) { return t + f(x); }, 0); };
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- login simples (proteção apenas visual) ---------- */
  var LOGIN_ENABLED = false; // true para exigir senha
  var PASS_HASH = 'fb5578230b4494a4a796005c8c36ad9038f1cfc75b49a210c95323efa9ba397d';
  function sha256js(s) { // reserva para navegadores sem crypto.subtle (ex.: arquivo local)
    var K = [], H = [], p = 2, n = 0, R = function (x, c) { return (x >>> c) | (x << (32 - c)); };
    while (n < 64) { for (var d = 2; d * d <= p; d++) if (p % d === 0) break; if (d * d > p) { if (n < 8) H[n] = (Math.pow(p, .5) * 4294967296) | 0; K[n++] = (Math.pow(p, 1 / 3) * 4294967296) | 0; } p++; }
    var b = unescape(encodeURIComponent(s)), l = b.length * 8, w = [], i, j;
    b += '\x80'; while (b.length % 64 - 56) b += '\x00';
    for (i = 0; i < b.length; i++) w[i >> 2] |= b.charCodeAt(i) << ((3 - i % 4) * 8);
    w[w.length] = (l / 4294967296) | 0; w[w.length] = l;
    for (j = 0; j < w.length; j += 16) {
      var a = H.slice(0), W = [];
      for (i = 0; i < 64; i++) {
        if (i < 16) W[i] = w[j + i] | 0;
        else W[i] = (R(W[i - 2], 17) ^ R(W[i - 2], 19) ^ (W[i - 2] >>> 10)) + W[i - 7] + (R(W[i - 15], 7) ^ R(W[i - 15], 18) ^ (W[i - 15] >>> 3)) + W[i - 16] | 0;
        var t1 = a[7] + (R(a[4], 6) ^ R(a[4], 11) ^ R(a[4], 25)) + ((a[4] & a[5]) ^ (~a[4] & a[6])) + K[i] + W[i], t2 = (R(a[0], 2) ^ R(a[0], 13) ^ R(a[0], 22)) + ((a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]));
        a = [(t1 + t2) | 0].concat(a); a[4] = (a[4] + t1) | 0; a.pop();
      }
      for (i = 0; i < 8; i++) H[i] = (H[i] + a[i]) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }
  function sha256(txt) {
    if (!(window.crypto && crypto.subtle)) return Promise.resolve(sha256js(txt));
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function (b) {
      return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function login(done) {
    if (sessionStorage.getItem('ecoAuth') === PASS_HASH) return done();
    document.body.classList.add('locked');
    var el = document.createElement('div'); el.className = 'login';
    el.innerHTML = '<form class="login-box" autocomplete="off"><img src="assets/logo-ecolink.png" alt="Ecolink Solutions"><p class="login-eb">Apresentação de Resultados</p>' +
      '<h1>Acesso restrito</h1><p class="login-sub">Digite a senha para visualizar os resultados.</p>' +
      '<input type="password" id="loginPass" placeholder="Senha" aria-label="Senha" required><p class="login-err" id="loginErr"></p>' +
      '<button class="btn" type="submit">Entrar →</button><img class="login-j9" src="assets/logo-j9.png" alt="J9 Marketing"></form>';
    document.body.appendChild(el);
    var inp = el.querySelector('#loginPass'); inp.focus();
    el.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      sha256(inp.value).then(function (h) {
        if (h === PASS_HASH) { sessionStorage.setItem('ecoAuth', h); el.remove(); document.body.classList.remove('locked'); done(); }
        else { $('loginErr').textContent = 'Senha incorreta. Tente novamente.'; inp.value = ''; inp.focus(); el.querySelector('.login-box').classList.remove('shake'); void el.offsetWidth; el.querySelector('.login-box').classList.add('shake'); }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (LOGIN_ENABLED) login(start); else start();
  });
  function start() {
    if (window.DASHBOARD) render(window.DASHBOARD);
    else $('app').innerHTML = '<p class="err">Não foi possível carregar <b>data/dashboard.js</b>. Verifique se o arquivo está na pasta <b>data/</b> e se o conteúdo é um JSON válido.</p>';
  }

  /* ---------- derived metrics ---------- */
  function derive(m) {
    m.meta.ctr = m.meta.clicks / m.meta.imp * 100;
    m.meta.cpc = m.meta.spend / m.meta.clicks;
    m.google.ctr = m.google.clicks / m.google.imp * 100;
    m.google.cpa = m.google.conv ? m.google.cost / m.google.conv : null;
    m.total = m.meta.spend + m.google.cost;
    return m;
  }
  function chg(cur, prev, inverse) {
    if (prev == null || cur == null || !prev) return '';
    var v = (cur - prev) / prev * 100, cls = Math.abs(v) < 0.5 ? 'flat' : ((v > 0) !== !!inverse ? 'up' : 'down');
    return '<span class="chg ' + cls + '">' + (v > 0 ? '▲ ' : v < 0 ? '▼ ' : '') + P(Math.abs(v), 1) + '</span>';
  }

  /* ---------- charts (inline SVG, no deps) ---------- */
  var tip = $('tip');
  function showTip(e, html) { tip.innerHTML = html; tip.style.opacity = 1; moveTip(e); }
  function moveTip(e) {
    var x = e.clientX + 14, y = e.clientY + 14, w = tip.offsetWidth, h = tip.offsetHeight;
    if (x + w > innerWidth - 8) x = e.clientX - w - 14;
    if (y + h > innerHeight - 8) y = e.clientY - h - 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { tip.style.opacity = 0; }
  function niceMax(v) { var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }

  function chart(el, o) {
    var W = 560, H = 250, pl = 46, pr = 8, pt = 12, pb = 30, iw = W - pl - pr, ih = H - pt - pb;
    var n = o.labels.length, bw = iw / n;
    var tot = o.labels.map(function (_, i) { return o.line ? Math.max.apply(null, o.series.map(function (s) { return s.values[i] || 0; })) : sum(o.series, function (s) { return s.values[i] || 0; }); });
    var max = niceMax(Math.max.apply(null, tot) || 1), y = function (v) { return pt + ih - v / max * ih; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title) + '">';
    for (var k = 0; k <= 4; k++) {
      var gv = max / 4 * k;
      s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(gv) + '" y2="' + y(gv) + '"/>' +
        '<text class="axis" x="' + (pl - 6) + '" y="' + (y(gv) + 3) + '" text-anchor="end">' + o.axis(gv) + '</text>';
    }
    o.labels.forEach(function (l, i) {
      if (n > 10 && (n - 1 - i) % 2) return;
      s += '<text class="axis" x="' + (pl + bw * i + bw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(l) + '</text>';
    });
    if (o.line) {
      o.series.forEach(function (se) {
        var pts = se.values.map(function (v, i) { return [pl + bw * i + bw / 2, y(v)]; });
        s += '<polyline fill="none" stroke="' + se.color + '" stroke-width="2" stroke-linejoin="round" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>';
        pts.forEach(function (p, i) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (o.partial === i ? 3 : 4) + '" fill="' + (o.partial === i ? '#fff' : se.color) + '" stroke="' + (o.partial === i ? se.color : '#fff') + '" stroke-width="2"/>'; });
      });
    }
    o.labels.forEach(function (_, i) {
      var x = pl + bw * i, g = '<g class="col" data-i="' + i + '">';
      if (!o.line) {
        var acc = 0, w = Math.max(6, bw * 0.58), bx = x + (bw - w) / 2;
        o.series.forEach(function (se, si) {
          var v = se.values[i] || 0; if (!v) return;
          var y0 = y(acc), y1 = y(acc + v), hgt = Math.max(1, y0 - y1 - (acc ? 2 : 0));
          var top = si === o.series.length - 1 || !o.series.slice(si + 1).some(function (z) { return z.values[i]; });
          g += '<path class="bar" fill="' + se.color + '" opacity="' + (o.partial === i ? 0.45 : 1) + '" d="' + rect(bx, y0 - (acc ? 2 : 0) - hgt, w, hgt, top ? 4 : 0) + '"/>';
          acc += v;
        });
      }
      g += '<rect x="' + x + '" y="' + pt + '" width="' + bw + '" height="' + ih + '" fill="transparent"/></g>';
      s += g;
    });
    el.innerHTML = s + '</svg>';
    Array.prototype.forEach.call(el.querySelectorAll('.col'), function (c) {
      var i = +c.dataset.i;
      c.addEventListener('mouseenter', function (e) {
        var h = '<b>' + esc(o.full[i]) + (o.partial === i ? ' (até 16/11)' : '') + '</b>';
        o.series.forEach(function (se) { h += '<div class="r"><span><i style="background:' + se.color + '"></i>' + esc(se.name) + '</span><span>' + o.fmt(se.values[i]) + '</span></div>'; });
        if (o.extra) h += o.extra(i);
        showTip(e, h);
      });
      c.addEventListener('mousemove', moveTip);
      c.addEventListener('mouseleave', hideTip);
      if (o.click) { c.style.cursor = 'pointer'; c.addEventListener('click', function () { hideTip(); o.click(i); }); }
    });
  }
  function rect(x, y, w, h, r) {
    r = Math.min(r, h, w / 2);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }
  function legend(items) { return '<div class="legend">' + items.map(function (it) { return '<span><i style="background:' + it[1] + '"></i>' + esc(it[0]) + '</span>'; }).join('') + '</div>'; }
  function card(id, title, sub, leg) {
    return '<div class="chart-card hbox reveal"><div class="chart-head"><div><p class="table-title">' + title + '</p><p class="chart-sub">' + sub + '</p></div>' + (leg || '') + '</div><div class="chart" id="' + id + '"></div></div>';
  }

  /* ---------- helpers de layout ---------- */
  var href = function (p) { return encodeURI(p); };
  var IMG = function (n) { return 'assets/img/' + n + '.jpg'; };
  function stat(v, l, c) { return '<div class="stat-item hbox reveal"><div class="stat-num">' + v + '</div><div class="stat-lbl">' + l + '</div>' + (c ? '<div class="stat-chg">' + c + '</div>' : '') + '</div>'; }
  function kpi(l, v, c) { return '<div class="kpi-tile hbox reveal"><span class="lbl">' + l + '</span><span class="val">' + v + '</span>' + (c || '') + '</div>'; }
  function head(eb, t, sub, cls) { return '<p class="eyebrow-lbl reveal ' + (cls || '') + '">' + eb + '</p><h2 class="sec-title reveal">' + t + '</h2>' + (sub ? '<p class="sec-sub reveal">' + sub + '</p>' : ''); }
  function fold(cls, inner, id) { return '<section class="fold ' + cls + (cls === 'dark' ? ' dark-section' : '') + '"' + (id ? ' id="' + id + '"' : '') + '><div class="wrap">' + inner + '</div></section>'; }
  function phero(img, eb, t, sub, nums, cue) {
    return '<header class="phero" style="background-image:linear-gradient(105deg,rgba(10,16,10,.92) 0%,rgba(14,26,14,.78) 45%,rgba(14,26,14,.35) 100%),url(\'' + IMG(img) + '\')"><div class="wrap">' +
      '<p class="phero-eb">' + eb + '</p><h1 class="phero-h1">' + t + '</h1><p class="phero-sub">' + sub + '</p>' +
      (nums ? '<div class="phero-nums">' + nums.map(function (n) { return '<div><b>' + n[0] + '</b><span>' + n[1] + '</span></div>'; }).join('') + '</div>' : '') +
      '</div>' + (cue ? '<a href="#" data-scroll="' + cue + '" class="scroll-cue">Rolar para ver mais<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></a>' : '') + '</header>';
  }
  function band(img, eb, quote, src) {
    return '<section class="band" style="background-image:linear-gradient(90deg,rgba(10,18,10,.88),rgba(10,18,10,.55)),url(\'' + IMG(img) + '\')"><div class="wrap reveal"><p class="band-eb">' + eb + '</p><p class="band-q">' + quote + '</p>' + (src ? '<p class="band-src">' + src + '</p>' : '') + '</div></section>';
  }
  function pdfBtns(path, title, light) {
    return '<div class="btn-row"><button class="btn" data-pdf="' + esc(path) + '" data-title="' + esc(title) + '">▣ Ver documento completo</button>' +
      '<a class="btn ' + (light ? 'light' : 'ghost') + '" target="_blank" rel="noopener" href="' + href(path) + '">↗ Abrir em nova aba</a></div>';
  }
  function hbars(rows, fmt, color) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; }));
    return '<div class="hbars">' + rows.map(function (r) {
      return '<div class="hb reveal"><div class="hb-l">' + r.l + '</div><div class="hb-t"><i style="width:' + (r.v / max * 100) + '%;background:' + (r.c || color || C.g) + '"></i></div><div class="hb-v">' + fmt(r.v) + '</div></div>';
    }).join('') + '</div>';
  }
  function donut(parts, center, sub) {
    var tot = sum(parts, function (p) { return p.v; }), c = 2 * Math.PI * 80, off = 0;
    var s = '<svg class="donut-svg" viewBox="0 0 200 200" style="width:170px;height:170px"><g transform="rotate(-90 100 100)">';
    parts.forEach(function (p) { var len = p.v / tot * c; s += '<circle cx="100" cy="100" r="80" fill="none" stroke="' + p.c + '" stroke-width="26" stroke-dasharray="' + (len - 2) + ' ' + c + '" stroke-dashoffset="' + (-off) + '"/>'; off += len; });
    return s + '</g><text x="100" y="96" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="800" font-size="28" fill="#20241F">' + center + '</text><text x="100" y="118" text-anchor="middle" font-size="11" fill="#5C6259">' + sub + '</text></svg>';
  }
  function cmp(label, a, b, fmt, inverse, note) {
    var max = Math.max(a, b), v = (b - a) / a * 100, good = (v > 0) !== !!inverse;
    return '<div class="cmp card hbox reveal"><div class="cmp-h"><span class="lbl">' + label + '</span><span class="chg ' + (good ? 'up' : 'down') + '">' + (v > 0 ? '▲ ' : '▼ ') + P(Math.abs(v), 0) + '</span></div>' +
      '<div class="cmp-r"><span>2025</span><div class="hb-t"><i style="width:' + (a / max * 100) + '%;background:#B9BABC"></i></div><b>' + fmt(a) + '</b></div>' +
      '<div class="cmp-r"><span>2026</span><div class="hb-t"><i style="width:' + (b / max * 100) + '%;background:' + C.g + '"></i></div><b>' + fmt(b) + '</b></div>' +
      (note ? '<p class="note" style="margin-top:8px">' + note + '</p>' : '') + '</div>';
  }
  var MS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  var shortOf = function (id) { return MS[+id.slice(5) - 1] + '/' + id.slice(2, 4); };
  var reveal = function (ids) { ids.forEach(function (id) { [].forEach.call($(id).querySelectorAll('.reveal'), function (e) { e.classList.add('in'); }); }); };
  var growth = function (a, b) { return b == null || !a ? '' : chg(a, b); };

  /* ---------- render ---------- */
  function render(D) {
    var M = D.months.map(derive), last = M[M.length - 1];
    var y26 = M.filter(function (m) { return m.id >= '2026-01'; }), y26full = y26.filter(function (m) { return !m.partial; }), y25 = M.filter(function (m) { return m.id < '2026-01'; });
    var T = {
      spend: sum(M, function (m) { return m.total; }), ms: sum(M, function (m) { return m.meta.spend; }), gs: sum(M, function (m) { return m.google.cost; }),
      clicks: sum(M, function (m) { return m.meta.clicks + m.google.clicks; }), mc: sum(M, function (m) { return m.meta.clicks; }), gc: sum(M, function (m) { return m.google.clicks; }),
      imp: sum(M, function (m) { return m.meta.imp + m.google.imp; }), video: sum(M, function (m) { return m.meta.video; }),
      conv26: sum(y26, function (m) { return m.google.conv; }), cost26: sum(y26, function (m) { return m.google.cost; })
    };
    var agg = function (a, p) { var imp = sum(a, function (m) { return m[p].imp; }), cl = sum(a, function (m) { return m[p].clicks; }), sp = sum(a, function (m) { return p === 'meta' ? m.meta.spend : m.google.cost; }); return { ctr: cl / imp * 100, cpc: sp / cl, cpm: cl / a.length, spm: sp / a.length, vid: p === 'meta' ? sum(a, function (m) { return m.meta.video; }) / a.length : 0 }; };
    var m25 = agg(y25, 'meta'), m26 = agg(y26full, 'meta'), g25 = agg(y25, 'google'), g26 = agg(y26full, 'google');
    var CT = D.content, posts = sum(CT, function (c) { return c.total_posts; }), arts = sum(CT, function (c) { return c.artigos.length; }), thumbs = sum(CT, function (c) { return c.thumbs || 0; });
    var labels = M.map(function (m) { return m.short; }), fulls = M.map(function (m) { return m.label; }), pi = last.partial ? M.length - 1 : null;
    var h = '';

    /* ===================== PÁGINA 01 · ANÁLISE ===================== */
    h += '<main class="page" data-page="analise">';
    h += phero('pavimentacao', '01 · Análise consolidada · ' + esc(D.info.periodLabel), 'Mais resultado com o <span class="hl">mesmo&nbsp;investimento</span>',
      'Resultados consolidados de Google Ads, Meta Ads e planejamento editorial da Ecolink Solutions, preparados por ' + esc(D.info.agency) + '.',
      [[R(T.spend), 'investidos em mídia paga'], [N(T.clicks), 'cliques gerados'], [N(T.conv26), 'conversões Google em 2026'], [M.length, 'relatórios mensais']], 'resumo');

    h += fold('white', head('Resumo executivo', 'O que 15 meses de operação entregaram', 'Google Ads + Meta Ads · ' + esc(D.info.periodLabel) + '.') +
      '<div class="bignums">' +
      stat(R(T.spend), 'Investimento total em mídia paga', R(T.gs) + ' Google · ' + R(T.ms) + ' Meta') +
      stat(N(T.clicks), 'Cliques em Google Ads + Meta Ads', N(T.mc) + ' Meta · ' + N(T.gc) + ' Google') +
      stat(N(T.imp), 'Impressões nas duas plataformas', 'Mais de 3,1 milhões de exibições') +
      stat(N(T.video), 'Visualizações de vídeo (Meta)', N(sum(y26, function (m) { return m.meta.video; })) + ' só em 2026') + '</div>' +
      '<div class="sumcards three q4">' + D.summaryCards.concat([{ tag: 'Conteúdo · total', big: N(posts + arts), unit: 'conteúdos planejados', text: 'em ' + CT.length + ' planos editoriais mensais, de ago/25 a nov/26.' }, { tag: 'Conteúdo · formatos', big: N(posts) + ' + ' + N(arts), unit: 'posts + artigos de blog', text: 'Reels, estáticos e carrosséis para as redes e artigos técnicos para o blog.' }]).map(function (s) { return '<div class="sumcard hbox reveal"><span class="tag g">' + esc(s.tag) + '</span><b>' + esc(s.big) + '</b><span class="u">' + esc(s.unit) + '</span><p>' + esc(s.text) + '</p></div>'; }).join('') + '</div>' +
      '<p class="note reveal">' + esc(D.info.kpiNote) + '</p>', 'resumo');

    h += fold('light', head('Investimento', 'Para onde foi a verba', 'Distribuição do investimento entre as plataformas e evolução mês a mês.') +
      '<div class="inv-grid"><div class="chart-card hbox reveal"><p class="table-title">Divisão do investimento</p><div class="donut-wrap">' +
      donut([{ v: T.gs, c: C.g }, { v: T.ms, c: C.m }], P(T.gs / T.spend * 100, 0), 'Google Ads') +
      '<div class="donut-legend"><div class="row"><span class="sw" style="background:' + C.g + '"></span><span>Google Ads</span><b>' + R(T.gs) + '</b></div><div class="row"><span class="sw" style="background:' + C.m + '"></span><span>Meta Ads</span><b>' + R(T.ms) + '</b></div>' +
      '<div class="row"><span class="sw" style="background:#DCE0DC"></span><span>Média mensal (meses completos)</span><b>' + R(sum(M.filter(function (m) { return !m.partial; }), function (m) { return m.total; }) / (M.length - 1)) + '</b></div></div></div></div>' +
      card('chInv', 'Investimento mensal', 'R$ por plataforma', legend([['Google Ads', C.g], ['Meta Ads', C.m]])) + '</div>' +
      '<p class="note reveal">' + esc(D.info.chartNote.split('. O gráfico')[0]) + '.</p>');

    h += band('estrada-campos', 'Destaque de 2026', 'Com investimento mensal praticamente estável no Meta (+' + N((m26.spm / m25.spm - 1) * 100, 1) + '%), os cliques por mês cresceram <b>' + N((m26.cpm / m25.cpm - 1) * 100, 0) + '%</b> e o custo por clique caiu <b>' + N((1 - m26.cpc / m25.cpc) * 100, 0) + '%</b>.', 'Médias mensais de 2026 (jan–out) vs. 2025 (ago–dez)');

    /* Meta deep dive */
    h += fold('light', head('Meta Ads · Facebook & Instagram', 'Eficiência que multiplicou o alcance', 'Comparativo das médias mensais: 2025 (ago–dez) vs. 2026 (jan–out).') +
      '<div class="cmp-grid">' + cmp('Cliques por mês', m25.cpm, m26.cpm, function (v) { return N(v); }) + cmp('CTR médio', m25.ctr, m26.ctr, function (v) { return P(v); }) +
      cmp('Custo por clique', m25.cpc, m26.cpc, R, true) + cmp('Visualizações de vídeo por mês', m25.vid, m26.vid, function (v) { return N(v); }) + '</div>' +
      '<div class="chart-grid" style="margin-top:22px">' + card('chClk', 'Cliques mensais', 'Cliques (todos) por plataforma', legend([['Google Ads', C.g], ['Meta Ads', C.m]])) +
      card('chVid', 'Visualizações de vídeo · Meta', 'Visualizações por mês') + '</div>');

    var CP = D.campaigns2026;
    h += fold('dark', head('Meta Ads · Campanhas 2026', 'Cada campanha cumprindo seu papel', esc(CP.periodo) + '.', 'ondark') +
      '<div class="camp-grid two">' + CP.meta.map(function (c) {
        return '<div class="card hbox reveal camp"><p class="table-title">' + esc(c.nome) + '</p><div class="camp-n">' +
          '<div><b>' + N(c.imp) + '</b><span>impressões</span>' + (c.prev ? growth(c.imp, c.prev.imp) : '') + '</div>' +
          '<div><b>' + N(c.clicks) + '</b><span>cliques</span>' + (c.prev ? growth(c.clicks, c.prev.clicks) : '') + '</div>' +
          '<div><b>' + N(c.video) + '</b><span>vídeo views</span>' + (c.prev ? growth(c.video, c.prev.video) : '') + '</div></div>' +
          (c.nota ? '<p class="note">' + esc(c.nota) + '</p>' : '<p class="note">Anterior: ' + N(c.prev.clicks) + ' cliques · ' + N(c.prev.imp) + ' impressões</p>') + '</div>';
      }).join('') + '</div>' + '<div class="btn-row" style="margin-top:22px">' + D.consolidated.slice(0, 1).map(function (c) { return '<button class="btn" data-pdf="' + esc(c.file) + '" data-title="' + esc(c.label) + '">▣ Ver relatório consolidado 2026</button>'; }).join('') + '</div>');

    /* Google deep dive */
    h += fold('white', head('Google Ads · Pesquisa', 'Mais relevância nas buscas', 'CTR por plataforma e evolução das conversões do Google Ads.') +
      '<div class="kpi-grid" style="margin-bottom:22px">' + kpi('CTR Google 2026', P(g26.ctr), chg(g26.ctr, g25.ctr)) + kpi('Conversões 2026 (até 16/11)', N(T.conv26)) + kpi('Custo por conversão 2026', R(T.cost26 / T.conv26)) + '</div>' +
      '<div class="chart-grid">' + card('chCtr', 'Taxa de cliques (CTR)', '% por plataforma', legend([['Google Ads', C.g], ['Meta Ads', C.m]])) +
      card('chConv', 'Conversões Google Ads', 'Dez/25 em diante · passe o mouse para ver o custo/conversão') + '</div>' +
      '<p class="note reveal">' + esc(D.info.chartNote.split('. O gráfico')[1] ? 'O gráfico' + D.info.chartNote.split('. O gráfico')[1] : '') + '</p>');

    h += fold('light', head('Google Ads · Campanhas 2026', 'Search: o motor de conversão', esc(CP.periodo) + '.') +
      '<div class="camp-grid two">' + CP.google.map(function (c) {
        return '<div class="card hbox reveal camp"><p class="table-title">' + esc(c.nome) + '</p><div class="camp-n">' +
          '<div><b>' + N(c.imp) + '</b><span>impressões</span>' + growth(c.imp, c.prev.imp) + '</div><div><b>' + N(c.clicks) + '</b><span>cliques</span>' + growth(c.clicks, c.prev.clicks) + '</div>' +
          '<div><b>' + N(c.conv) + '</b><span>conversões</span>' + growth(c.conv, c.prev.conv) + '</div></div><p class="note">Anterior: ' + N(c.prev.conv, 1) + ' conversões · ' + N(c.prev.clicks) + ' cliques</p></div>';
      }).join('') + '</div>' +
      '<div class="chart-card hbox reveal" style="margin-top:22px"><div class="chart-head"><div><p class="table-title">Parcela de impressões perdidas na pesquisa</p><p class="chart-sub">% perdida por orçamento e por classificação (rank)</p></div>' + legend([['Orçamento', '#FDD400'], ['Classificação', '#2A2A2A']]) + '</div><div class="chart" id="chShare"></div></div>' +
      '<p class="note reveal">A perda por orçamento caiu ao longo de 2026, enquanto a perda por classificação voltou a subir — tema central da recomendação (página 04).</p>');

    h += fold('white', head('Criativos', 'Os 6 anúncios com mais cliques em 2026', 'Meta Ads · 01/01 a 31/10/2026. CTR médio da conta no período: ' + P(m26.ctr) + '.') +
      '<div class="adcards">' + D.topAds2026.slice(0, 6).map(function (a, i) {
        var c = a.clicks / a.imp * 100;
        return '<div class="adcard hbox reveal">' + (a.img ? '<button class="ad-media' + (a.video ? ' vid' : '') + '" data-img="assets/ads/' + a.img + '" data-cap="' + esc(a.nome) + '"><img src="assets/ads/' + a.img + '" alt="' + esc(a.nome) + '" loading="lazy">' + (a.video ? '<i>▶ Vídeo</i>' : '') + '</button>' : '') + '<div class="ad-top"><span class="ad-rank">' + (i < 9 ? '0' : '') + (i + 1) + '</span><span class="tag ' + (a.produto === 'Institucional' ? '' : 'g') + '">' + esc(a.produto) + '</span></div>' +
          '<p class="ad-name">' + esc(a.nome) + '</p><div class="ad-nums"><div><b>' + N(a.clicks) + '</b><span>cliques</span></div><div><b class="' + (c >= m26.ctr ? 'gd' : 'lo') + '">' + P(c) + '</b><span>CTR</span></div></div></div>';
      }).join('') + '</div>');

    h += fold('dark', head('Principais conquistas', 'O que vale celebrar', '', 'ondark') + '<div class="ach-grid">' +
      D.achievements.map(function (a) { return '<div class="ach hbox reveal"><span class="tag ' + (a.tag === 'Google Ads' ? 'g' : a.tag === 'Meta Ads' ? '' : 'y') + '">' + esc(a.tag) + '</span><div class="big" style="margin-top:10px">' + esc(a.big) + '</div><h4>' + esc(a.title) + '</h4><p>' + a.text + '</p></div>'; }).join('') + '</div>');

    h += fold('light', head('Linha do tempo', 'Um destaque por mês', 'Selecione um mês na linha do tempo para ver o destaque e os principais números.') +
      '<div class="tlsel reveal"><div class="tl-track" id="tlTrack">' + M.map(function (m) { return '<button data-tl="' + m.id + '"><i></i><span>' + esc(m.short) + '</span></button>'; }).join('') + '</div><div id="tlCard"></div></div>');
    h += pager(0) + '</main>';

    /* ===================== PÁGINA 02 · RELATÓRIOS ===================== */
    h += '<main class="page" data-page="relatorios">';
    h += phero('rodovia', '02 · Relatórios', 'Resultados <span class="hl">mês a&nbsp;mês</span>', 'Os ' + M.length + ' relatórios mensais de tráfego pago e os 2 consolidados, com acesso ao documento original de cada período.',
      [[M.length, 'relatórios mensais'], ['2', 'consolidados'], [R(last.total), 'investidos em ' + esc(last.short) + ' (até 16/11)'], [N(last.google.conv), 'conversões em ' + esc(last.short)]], 'mapa');

    var MF = M.filter(function (m) { return !m.partial; });
    var best = function (f) { return MF.reduce(function (a, b) { return f(b) > f(a) ? b : a; }); };
    var mapCard = function (id, title, f, fmt, leg, avg) { var b = best(f), a = avg ? avg() : sum(MF, f) / MF.length; return '<div class="chart-card hbox reveal mapc"><div class="chart-head"><div><p class="table-title">' + title + '</p><p class="mapc-best"><b>' + fmt(a) + '</b><span>média mensal · melhor mês: ' + esc(b.short) + ' (' + fmt(f(b)) + ')</span></p></div>' + (leg || '') + '</div><div class="chart" id="' + id + '"></div></div>'; };
    h += fold('white', head('Mapa do período', 'Os 16 meses em quatro indicadores', 'Passe o mouse para ver os valores. Clique em uma barra para abrir o mês.') +
      '<div class="chart-grid">' +
      mapCard('mapInv', 'Investimento', function (m) { return m.total; }, R, legend([['Google', C.g], ['Meta', C.m]])) +
      mapCard('mapClk', 'Cliques', function (m) { return m.google.clicks + m.meta.clicks; }, function (v) { return N(v); }, legend([['Google', C.g], ['Meta', C.m]])) +
      mapCard('mapCtr', 'CTR Meta Ads', function (m) { return m.meta.ctr; }, function (v) { return P(v); }, '', function () { return sum(MF, function (m) { return m.meta.clicks; }) / sum(MF, function (m) { return m.meta.imp; }) * 100; }) +
      mapCard('mapVid', 'Visualizações de vídeo · Meta', function (m) { return m.meta.video; }, function (v) { return N(v); }) + '</div>', 'mapa');

    h += band('engenheiro-obra', 'Como ler os relatórios', 'Cada relatório traz a visão geral de <b>Meta Ads</b> e <b>Google Ads</b>, o desempenho por campanha e os principais anúncios do mês.', 'Conversões = leads registrados nas campanhas do Google Ads');

    var consPanels = D.consolidated.map(function (c, i) {
        var X = D.consolidatedExtra[i], set = i === 0 ? y26full : M.filter(function (m) { return m.id >= '2025-08' && m.id <= '2025-12'; });
        var s = function (f) { return sum(set, f); };
        var g = { imp: s(function (m) { return m.google.imp; }), cl: s(function (m) { return m.google.clicks; }), cost: s(function (m) { return m.google.cost; }), cv: s(function (m) { return m.google.conv; }) };
        var mt = { imp: s(function (m) { return m.meta.imp; }), cl: s(function (m) { return m.meta.clicks; }), sp: s(function (m) { return m.meta.spend; }), vid: s(function (m) { return m.meta.video; }) };
        var v = null, up = function (k) { return v ? '<span class="chg up">▲ ' + P(v[k], 1) + '</span>' : ''; };
        var tile = function (l, val, c2) { return '<div class="ct hbox"><span>' + l + '</span><b>' + val + '</b>' + (c2 || '') + '</div>'; };
        return '<article class="cons hbox reveal"><div class="cons-h"><div><span class="tag y">' + esc(X.periodo) + '</span><h3>' + esc(c.label) + '</h3><p>' + esc(X.intro) + '</p></div>' +
          '<div class="cons-tot"><b>' + R(g.cost + mt.sp) + '</b><span>investimento total · ' + set.length + ' meses</span></div></div>' +
          '<div class="cons-cols"><div><p class="plat"><i style="background:' + C.g + '"></i>Google Ads</p><div class="cons-grid">' +
          tile('Impressões', N(g.imp)) + tile('Cliques', N(g.cl)) + tile('CTR', P(g.cl / g.imp * 100)) + tile('Investimento', R(g.cost)) + tile('Conversões', N(g.cv, g.cv % 1 ? 1 : 0)) + tile('Custo/conversão', R(g.cost / g.cv)) + '</div></div>' +
          '<div><p class="plat"><i style="background:#B9BABC"></i>Meta Ads' + (v ? ' <small>' + esc(v.nota) + '</small>' : '') + '</p><div class="cons-grid">' +
          tile('Impressões', N(mt.imp), up('imp')) + tile('Cliques', N(mt.cl), up('clicks')) + tile('CTR', P(mt.cl / mt.imp * 100), up('ctr')) + tile('Custo por clique', R(mt.sp / mt.cl)) + tile('Vídeo views', N(mt.vid), up('video')) + tile('Investimento', R(mt.sp), up('spend')) + '</div></div></div>' +
          '<p class="plat" style="margin-top:26px">Destaques do período</p><div class="cons-hl">' + X.destaques.map(function (d) { return '<div><b>' + esc(d.big) + '</b><span>' + esc(d.t) + '</span><small>' + esc(d.p) + '</small></div>'; }).join('') + '</div>' +
          (i === 1 ? '<p class="note" style="color:#9FB49B">O PDF consolidado cobre agosto a outubro de 2025; novembro e dezembro estão nos relatórios mensais.</p>' : '') + pdfBtns(c.file, i === 1 ? 'Relatório consolidado ago–out/2025' : c.label) + '</article>';
    });
    h += fold('dark', head('Consolidados', 'Visões de período', 'Escolha o período para ver os indicadores de Google Ads e Meta Ads e os destaques do relatório consolidado.', 'ondark') +
      '<div class="chips cons-chips reveal" id="consChips">' + D.consolidated.map(function (c, i) { return '<button data-cons="' + i + '">' + (i === 0 ? '2026' : '2025') + '</button>'; }).join('') + '</div>' +
      '<div id="consDetail"></div><p class="note reveal">Indicadores somados a partir dos relatórios mensais do período. Destaques conforme os relatórios consolidado (2026) e mensais (2025).</p>');
    h += fold('light', head('Explorar mês', 'Detalhe do relatório', 'Escolha um mês para ver todos os indicadores, a variação contra o mês anterior e o documento original.') +
      '<div class="chips reveal" id="repChips">' + M.slice().reverse().map(function (m) { return '<button data-m="' + m.id + '">' + esc(m.short) + '</button>'; }).join('') + '</div><div id="repDetail"></div>', 'explorar');

    h += pager(1) + '</main>';

    /* ===================== PÁGINA 03 · CONTEÚDOS ===================== */
    var prodMap = {}, norm = function (p) { return /vedafull/i.test(p) ? 'Vedafull' : /espargidor/i.test(p) ? 'Caminhão espargidor' : p; };
    CT.forEach(function (c) { var seen = {}; c.produtos.forEach(function (p) { p = norm(p); if (!seen[p]) { seen[p] = 1; prodMap[p] = (prodMap[p] || 0) + 1; } }); });
    var prods = Object.keys(prodMap).map(function (k) { return { l: k, v: prodMap[k] }; }).sort(function (a, b) { return b.v - a.v; });
    h += '<main class="page" data-page="conteudos">';
    var LB = D.library, nE = LB.filter(function (x) { return x.f === 'e'; }).length, nC = LB.filter(function (x) { return x.f === 'c'; }).length;
    h += phero('estrada-rural', '03 · Conteúdos', 'Biblioteca de <span class="hl">conteúdo&nbsp;técnico</span>', 'Estáticos, carrosséis e artigos de blog dos ' + CT.length + ' planos mensais, organizados por formato e filtráveis por mês.',
      [[N(nE), 'estáticos'], [N(nC), 'carrosséis'], [N(arts), 'artigos de blog'], [prods.length, 'produtos em pauta']], 'cvisao');

    h += fold('white', head('Visão geral', 'Cadência e formatos', 'Quantidade de posts planejados por formato em cada mês.') +
      '<div class="chart-grid">' + card('chFmt', 'Posts planejados por mês', 'Reels, estáticos e carrosséis', legend([['Reels', C.g], ['Estáticos', '#2A2A2A'], ['Carrosséis', '#FDD400']])) +
      '<div class="chart-card hbox reveal"><p class="table-title">Produtos em pauta</p><p class="chart-sub" style="margin-bottom:14px">Em quantos dos ' + CT.length + ' meses cada produto aparece no plano</p>' + hbars(prods, function (v) { return v + ' meses'; }).replace('class="hbars"', 'class="hbars compact"') + '</div></div>' +
      '<div class="disclaimer reveal" style="margin-top:22px"><span>ⓘ</span><span>' + esc(D.info.contentNote) + '</span></div>', 'cvisao');

    var libChips = function (k) { return '<div class="chips lib-chips" data-lib="' + k + '">' + CT.slice().reverse().map(function (c) { return '<button data-lm="' + c.month + '">' + esc(shortOf(c.month)) + '</button>'; }).join('') + '</div>'; };
    h += fold('light', head('Biblioteca · 01', 'Estáticos', 'Posts de imagem única planejados para o feed. Clique para ampliar.') + libChips('e') + '<div class="lib-grid" id="lib-e"></div>', 'lib-est');
    h += fold('white', head('Biblioteca · 02', 'Carrosséis', 'Posts com várias telas. Clique para ver todas as telas do carrossel.') + libChips('c') + '<div class="lib-grid" id="lib-c"></div>', 'lib-car');
    h += fold('light', head('Biblioteca · 03', 'Artigos de blog', 'Pautas técnicas planejadas para o blog. Cada artigo abre o plano do mês.') + libChips('a') + '<div class="lib-grid arts" id="lib-a"></div>', 'lib-art');

    h += pager(2) + '</main>';

    /* ===================== PÁGINA 04 · RECOMENDAÇÃO ===================== */
    var RC = D.recommendation, gs = D.googleShare;
    h += '<main class="page" data-page="recomendacao">';
    h += phero('estrada-floresta', '04 · Recomendação estratégica', 'O próximo trecho da&nbsp;<span class="hl">estrada</span>', esc(RC.intro), null, 'diag');

    h += fold('white', head('Diagnóstico', 'O que os dados mostram') + '<div class="diag-grid">' + [
      [P(m26.ctr), 'CTR médio Meta em 2026', RC.diagnostico[0]], ['205/235', 'conversões vindas do Search', RC.diagnostico[1]],
      [P(gs[gs.length - 2].rank, 1), 'impressões perdidas por classificação (out/26)', RC.diagnostico[2]], ['9 → 28', 'conversões set → out/26', RC.diagnostico[3]]
    ].map(function (d) { return '<div class="diag card hbox reveal"><div class="big">' + d[0] + '</div><span class="lbl">' + d[1] + '</span><h4>' + esc(d[2].t) + '</h4><p>' + d[2].p + '</p></div>'; }).join('') + '</div>', 'diag');

    var fun = [[N(sum(y26full, function (m) { return m.google.imp; })), 'Impressões', 'Google Ads 2026 (jan–out)'], [N(sum(y26full, function (m) { return m.google.clicks; })), 'Cliques', 'CTR ' + P(g26.ctr)], [N(sum(y26full, function (m) { return m.google.conv; })), 'Conversões (leads)', 'registradas no Google Ads'], ['CRM', 'Vendas', 'próxima etapa: integrar leads e vendas']];
    h += fold('dark', head('Mensuração', 'Do clique à venda: o próximo passo', 'Funil do Google Ads em 2026 (jan–out). A integração com vendas é o próximo passo para medir o retorno.', 'ondark') +
      '<div class="funnel">' + fun.map(function (f, i) { return '<div class="fn hbox reveal' + (i === 3 ? ' miss' : '') + '" style="--w:' + (100 - i * 16) + '%"><b>' + f[0] + '</b><span>' + f[1] + '</span><small>' + f[2] + '</small></div>'; }).join('') + '</div>' +
      '<div class="rec-grid" style="margin-top:30px">' + RC.mensuracao.map(function (x) { return '<div class="mcard2 hbox reveal"><b>' + esc(x.big) + '</b><span class="u">' + esc(x.unit) + '</span><h4>' + esc(x.t) + '</h4><p>' + esc(x.p) + '</p></div>'; }).join('') + '</div>');

    var opImgs = ['assets/posts/2026-10-10.jpg', IMG('pavimentacao'), 'assets/posts/2026-10-06.jpg'];
    h += fold('light', head('Oportunidades', 'Onde crescer') + '<div class="op-grid">' + RC.oportunidades.map(function (o, i) {
      return '<article class="op card hbox reveal"><img src="' + opImgs[i] + '" alt="" loading="lazy"><div><span class="tag y">Oportunidade ' + (i + 1) + '</span><h4>' + esc(o.t) + '</h4><p>' + o.p + '</p></div></article>';
    }).join('') + '</div>');

    h += band('rodovia', 'Prioridade nº 1', '<b>Conversão não é venda.</b> Medir lead → proposta → venda é o passo que transforma eficiência de mídia em retorno comprovado.', 'Ação 01 do plano');

    h += fold('white', head('Plano de ação', 'Ações prioritárias para o próximo período', 'Ordenadas por impacto na mensuração e na geração de demanda.') +
      '<div class="act-grid">' + RC.acoes.map(function (a, i) { return '<div class="act hbox reveal"><div class="act-top"><span class="act-n">0' + (i + 1) + '</span><span class="tag ' + (a.tag === 'Google Ads' ? 'g' : a.tag === 'Mensuração' ? 'y' : a.tag === 'Conteúdo' ? 'plan' : '') + '">' + esc(a.tag) + '</span></div><h4>' + esc(a.t) + '</h4><p>' + esc(a.p) + '</p></div>'; }).join('') + '</div>');

    h += pager(3) + '<footer class="closing" id="contato"><div class="wrap"><h3>Obrigado.</h3><p>' + esc(D.info.closing) + '</p><p class="contact">Qualquer dúvida, fale com a gente.</p><a class="jq-wordmark" href="https://j9mkt.com.br" target="_blank" rel="noopener"><img src="assets/logo-j9.png" alt="J9 Marketing"></a><a href="#analise" class="back-top">Voltar ao início ↑</a><p class="credit">' + esc(D.images.fonte) + '</p></div></footer>';
    h += '</main>';

    $('app').innerHTML = h;

    /* charts */
    chart($('chInv'), { title: 'Investimento mensal', labels: labels, full: fulls, partial: pi, axis: function (v) { return 'R$' + N(v); }, fmt: R,
      series: [{ name: 'Google Ads', color: C.g, values: M.map(function (m) { return m.google.cost; }) }, { name: 'Meta Ads', color: C.m, values: M.map(function (m) { return m.meta.spend; }) }],
      extra: function (i) { return '<div class="r"><span>Total</span><b>' + R(M[i].total) + '</b></div>'; } });
    chart($('chClk'), { title: 'Cliques mensais', labels: labels, full: fulls, partial: pi, axis: function (v) { return N(v); }, fmt: function (v) { return N(v); },
      series: [{ name: 'Google Ads', color: C.g, values: M.map(function (m) { return m.google.clicks; }) }, { name: 'Meta Ads', color: C.m, values: M.map(function (m) { return m.meta.clicks; }) }] });
    chart($('chVid'), { title: 'Visualizações de vídeo', labels: labels, full: fulls, partial: pi, axis: function (v) { return N(v); }, fmt: function (v) { return N(v); },
      series: [{ name: 'Vídeo views', color: C.m, values: M.map(function (m) { return m.meta.video; }) }] });
    chart($('chCtr'), { title: 'CTR mensal', line: true, labels: labels, full: fulls, partial: pi, axis: function (v) { return N(v, 0) + '%'; }, fmt: function (v) { return P(v); },
      series: [{ name: 'Google Ads', color: C.g, values: M.map(function (m) { return m.google.ctr; }) }, { name: 'Meta Ads', color: C.m, values: M.map(function (m) { return m.meta.ctr; }) }] });
    var CV = M.filter(function (m) { return m.id >= '2025-12'; });
    chart($('chConv'), { title: 'Conversões Google Ads', labels: CV.map(function (m) { return m.short; }), full: CV.map(function (m) { return m.label; }), partial: last.partial ? CV.length - 1 : null,
      axis: function (v) { return N(v); }, fmt: function (v) { return N(v); }, series: [{ name: 'Conversões', color: C.g, values: CV.map(function (m) { return m.google.conv; }) }],
      extra: function (i) { return '<div class="r"><span>Custo/conversão</span><b>' + R(CV[i].google.cpa) + '</b></div>'; } });
    chart($('chShare'), { title: 'Impressões perdidas', line: true, labels: labels, full: fulls, partial: pi, axis: function (v) { return N(v, 0) + '%'; }, fmt: function (v) { return P(v); },
      series: [{ name: 'Orçamento', color: '#E0B800', values: gs.map(function (g) { return g.budget; }) }, { name: 'Classificação', color: '#2A2A2A', values: gs.map(function (g) { return g.rank; }) }] });
    var goMonth = function (i) { selRep(M[i].id); setTimeout(function () { $('explorar').scrollIntoView({ behavior: 'smooth' }); }, 30); };
    var mk = function (id, series, axis, fmt, line) { chart($(id), { title: id, line: line, labels: labels, full: fulls, partial: pi, axis: axis, fmt: fmt, series: series, click: goMonth }); };
    mk('mapInv', [{ name: 'Google Ads', color: C.g, values: M.map(function (m) { return m.google.cost; }) }, { name: 'Meta Ads', color: C.m, values: M.map(function (m) { return m.meta.spend; }) }], function (v) { return 'R$' + N(v); }, R);
    mk('mapClk', [{ name: 'Google Ads', color: C.g, values: M.map(function (m) { return m.google.clicks; }) }, { name: 'Meta Ads', color: C.m, values: M.map(function (m) { return m.meta.clicks; }) }], function (v) { return N(v); }, function (v) { return N(v); });
    mk('mapCtr', [{ name: 'CTR Meta', color: C.g, values: M.map(function (m) { return m.meta.ctr; }) }], function (v) { return N(v, 1) + '%'; }, function (v) { return P(v); });
    mk('mapVid', [{ name: 'Vídeo views', color: C.m, values: M.map(function (m) { return m.meta.video; }) }], function (v) { return N(v); }, function (v) { return N(v); });
    chart($('chFmt'), { title: 'Posts por formato', labels: CT.map(function (c) { return c.month.slice(5) + '/' + c.month.slice(2, 4); }), full: CT.map(function (c) { return c.label; }), partial: null, axis: function (v) { return N(v); }, fmt: function (v) { return N(v); },
      series: [{ name: 'Reels', color: C.g, values: CT.map(function (c) { return c.posts.reels; }) }, { name: 'Estáticos', color: '#2A2A2A', values: CT.map(function (c) { return c.posts.estatico; }) }, { name: 'Carrosséis', color: '#FDD400', values: CT.map(function (c) { return c.posts.carrossel; }) }],
      extra: function (i) { return '<div class="r"><span>Total</span><b>' + CT[i].total_posts + '</b></div>'; } });

    /* exploradores */
    var selCons = function (i) {
      $('consDetail').innerHTML = consPanels[i]; reveal(['consDetail']);
      [].forEach.call(document.querySelectorAll('#consChips button'), function (b) { b.classList.toggle('on', +b.dataset.cons === i); });
    };
    var selRep = function (id) {
      var m = M.filter(function (x) { return x.id === id; })[0], p = M[M.indexOf(m) - 1], pm = m.partial ? null : p, g = m.google, mm = m.meta, sh = gs.filter(function (x) { return x.id === id; })[0];
      var c = function (k, plat, inv) { return pm ? chg(m[plat][k], pm[plat][k], inv) : ''; };
      $('repDetail').innerHTML = '<div class="xp card hbox"><div class="xp-h"><div><h3>' + esc(m.label) + '</h3><p class="chart-sub">' + esc(m.period) + (pm ? ' · variações vs. ' + esc(pm.label) : ' · dados até 16/11') + '</p></div><div class="xp-tot"><b>' + R(m.total) + '</b><span>investimento no mês</span></div></div>' +
        '<div class="xp-cols"><div><p class="plat"><i style="background:' + C.g + '"></i>Google Ads</p><div class="kpi-grid">' + kpi('Impressões', N(g.imp), c('imp', 'google')) + kpi('Cliques', N(g.clicks), c('clicks', 'google')) + kpi('CTR', P(g.ctr), c('ctr', 'google')) +
        kpi('Investimento', R(g.cost), c('cost', 'google')) + kpi('Conversões', N(g.conv, g.conv % 1 ? 1 : 0), c('conv', 'google')) + kpi('Custo/conversão', g.cpa ? R(g.cpa) : '—', c('cpa', 'google', true)) + '</div>' +
        (sh ? '<p class="note">Impressões perdidas: ' + P(sh.budget) + ' por orçamento · ' + P(sh.rank) + ' por classificação.</p>' : '') + '</div>' +
        '<div><p class="plat"><i style="background:' + C.m + '"></i>Meta Ads</p><div class="kpi-grid">' + kpi('Impressões', N(mm.imp), c('imp', 'meta')) + kpi('Alcance', N(mm.reach), c('reach', 'meta')) + kpi('Cliques', N(mm.clicks), c('clicks', 'meta')) +
        kpi('CTR', P(mm.ctr), c('ctr', 'meta')) + kpi('Vídeo views', N(mm.video), c('video', 'meta')) + kpi('Investimento', R(mm.spend), c('spend', 'meta')) + '</div></div></div>' +
        '<div class="hl-box" style="margin-top:18px"><span class="hl-l">Destaque do mês</span>' + m.highlight + '</div>' + pdfBtns(m.report, 'Relatório · ' + m.label, true) + '</div>';
      reveal(['repDetail']); [].forEach.call(document.querySelectorAll('#repChips button'), function (b) { b.classList.toggle('on', b.dataset.m === id); });
    };
    var clean = function (s) { return String(s).replace(/[•☀-➿]/g, '').replace(/\s+/g, ' ').trim(); };
    var renderLib = function (k, mo) {
      var yr = function (m) { return m.slice(0, 4); }, html = '';
      if (k === 'a') {
        CT.slice().reverse().forEach(function (c) { if (mo !== 'all' && c.month !== mo) return; c.artigos.forEach(function (a, i) {
          html += '<article class="acard hbox"><span class="acard-n">' + (i < 9 ? '0' : '') + (i + 1) + '</span><span class="tag plan">' + esc(c.label) + '</span><h4>' + esc(a) + '</h4><button class="btn light" data-pdf="' + esc(c.file) + '" data-title="Plano de conteúdo · ' + esc(c.label) + '">▣ Ver no plano</button></article>'; }); });
      } else {
        LB.slice().reverse().forEach(function (x) { if (x.f !== k || (mo !== 'all' && x.m !== mo)) return;
          var cap = (k === 'e' ? 'Estático' : 'Carrossel') + ' · ' + x.d + '/' + yr(x.m), files = x.img.map(function (f) { return 'assets/lib/' + f; });
          var attr = !files.length ? '' : k === 'e' ? ' data-img="' + files[0] + '" data-cap="' + esc(cap) + '"' : ' data-slides="' + esc(files.join('|')) + '" data-cap="' + esc(cap) + '"';
          var paras = (D.captions && D.captions[x.m + '|' + x.f + '|' + x.d]) || [x.t];
          var capHtml = '<span class="lc-t">' + paras.map(function (p) { return '<span class="lp">' + esc(clean(p)) + '</span>'; }).join('') + '</span><button type="button" class="lc-more" data-more="1">Ver legenda ▾</button>';
          html += '<div class="lcard hbox' + (files.length ? '' : ' noimg') + '" role="button" tabindex="0"' + attr + '>' + (files.length ? '<span class="lc-img"><img src="' + files[0] + '" alt="" loading="lazy">' + (k === 'c' ? '<i>' + files.length + ' telas</i>' : '') + '</span>' : '<span class="lc-img lc-txt"><small>' + (k === 'e' ? 'Estático' : 'Carrossel') + '</small><b>' + esc(clean(x.t)) + '</b></span>') +
            '<span class="lc-d">' + esc(x.d + '/' + yr(x.m)) + '</span>' + capHtml + '</div>'; });
      }
      $('lib-' + k).innerHTML = html || '<p class="note">Sem itens deste formato no mês selecionado.</p>';
      [].forEach.call(document.querySelectorAll('.lib-chips[data-lib="' + k + '"] button'), function (b) { b.classList.toggle('on', b.dataset.lm === mo); });
    };
    var selTl = function (id) {
      var m = M.filter(function (x) { return x.id === id; })[0];
      $('tlCard').innerHTML = '<div class="tl-card hbox"><div class="tl-main"><span class="tl-d">' + esc(m.label) + '</span><p class="chart-sub">' + esc(m.period) + '</p><p class="tl-hl">' + m.highlight + '</p>' +
        '<div class="btn-row"><button class="btn" data-pdf="' + esc(m.report) + '" data-title="Relatório · ' + esc(m.label) + '">▣ Ver relatório completo</button><a class="btn light" href="#relatorios" data-month="' + m.id + '">Explorar o mês →</a></div></div>' +
        '<div class="tl-kpis">' + [[R(m.total), 'investimento'], [N(m.google.clicks + m.meta.clicks), 'cliques'], [N(m.google.conv, m.google.conv % 1 ? 1 : 0), 'conversões Google'], [P(m.meta.ctr), 'CTR Meta']].map(function (k) { return '<div><b>' + k[0] + '</b><span>' + k[1] + '</span></div>'; }).join('') + '</div></div>';
      [].forEach.call(document.querySelectorAll('#tlTrack button'), function (b) { b.classList.toggle('on', b.dataset.tl === id); });
    };
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-more],[data-cons],[data-m],[data-tl],[data-month],[data-pdf],[data-img],[data-slides],[data-lm]'); if (!t) return;
      if (t.dataset.more) { var lc = t.closest('.lcard'), op = lc.classList.toggle('open'); t.textContent = op ? 'Ocultar legenda ▴' : 'Ver legenda ▾'; return; }
      if (t.dataset.pdf) { e.preventDefault(); openPdf(t.dataset.pdf, t.dataset.title); }
      else if (t.dataset.img) { openImg(t.dataset.img, t.dataset.cap); }
      else if (t.dataset.cons) selCons(+t.dataset.cons);
      else if (t.dataset.tl) selTl(t.dataset.tl);
      else if (t.closest('#repChips')) selRep(t.dataset.m);
      else if (t.dataset.slides) openSlides(t.dataset.slides.split('|'), t.dataset.cap, 0);
      else if (t.dataset.lm) renderLib(t.parentNode.dataset.lib, t.dataset.lm);
      else if (t.dataset.month) { e.preventDefault(); selRep(t.dataset.month); location.hash = 'relatorios'; setTimeout(function () { $('explorar').scrollIntoView(); }, 30); }
    });
    selCons(0); selRep(last.id); selTl(last.id); ['e', 'c', 'a'].forEach(function (k) { renderLib(k, CT[CT.length - 1].month); });

    initUI();
  }

  /* ---------- modal (PDF / imagem) ---------- */
  /* download da imagem ampliada em PNG (converte via canvas) */
  function setDl(src, name) {
    var b = $('vwD'); b.style.display = '';
    b.onclick = function () {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        c.toBlob(function (blob) {
          var a = document.createElement('a'), u = URL.createObjectURL(blob);
          a.href = u; a.download = 'ecolink-' + String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() + '.png';
          document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
        }, 'image/png');
      };
      img.src = src;
    };
  }
  function modal() {
    var d = $('viewer'); if (d) return d;
    d = document.createElement('dialog'); d.id = 'viewer'; d.className = 'viewer';
    d.innerHTML = '<div class="vw-h"><b id="vwT"></b><div><button class="btn light" id="vwD" type="button">⤓ Baixar PNG</button><a id="vwO" class="btn light" target="_blank" rel="noopener">↗ Nova aba</a><button class="btn" id="vwX">✕ Fechar</button></div></div><div class="vw-b" id="vwB"></div>';
    document.body.appendChild(d);
    $('vwX').onclick = function () { d.close(); };
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    d.addEventListener('close', function () { $('vwB').innerHTML = ''; });
    return d;
  }
  function openPdf(p, t) { var d = modal(); $('vwT').textContent = t || 'Documento'; $('vwO').href = encodeURI(p); $('vwO').style.display = ''; $('vwD').style.display = 'none'; $('vwB').innerHTML = '<iframe src="' + encodeURI(p) + '#view=FitH" title="' + esc(t) + '"></iframe>'; d.showModal(); }
  function openSlides(files, cap, i) {
    var d = modal(), n = files.length;
    var show = function () {
      $('vwT').textContent = (cap || '') + ' · tela ' + (i + 1) + ' de ' + n; $('vwO').href = files[i]; setDl(files[i], (cap || 'imagem') + ' tela ' + (i + 1));
      $('vwB').innerHTML = '<button class="sl-nav prev" aria-label="Anterior">‹</button><img src="' + files[i] + '" alt="Tela ' + (i + 1) + '"><button class="sl-nav next" aria-label="Próxima">›</button>';
      $('vwB').querySelector('.prev').onclick = function () { i = (i - 1 + n) % n; show(); };
      $('vwB').querySelector('.next').onclick = function () { i = (i + 1) % n; show(); };
    };
    show(); if (!d.open) d.showModal();
  }
  function openImg(s, cap) { var d = modal(); $('vwT').textContent = cap || 'Imagem'; $('vwO').href = s; setDl(s, cap || 'imagem'); $('vwB').innerHTML = '<img src="' + s + '" alt="' + esc(cap) + '">'; d.showModal(); }

  function initUI() {
    var fill = $('scrollFill');
    var up = function () { var d = document.documentElement, mx = d.scrollHeight - d.clientHeight; fill.style.width = (mx > 0 ? d.scrollTop / mx * 100 : 0) + '%'; };
    addEventListener('scroll', up, { passive: true }); up();
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    var links = [].slice.call(document.querySelectorAll('#navLinks a')), pages = [].slice.call(document.querySelectorAll('.page'));
    var route = function () {
      var id = location.hash.slice(1);
      if (!PAGES.some(function (p) { return p[0] === id; })) id = PAGES[0][0];
      pages.forEach(function (p) { p.hidden = p.dataset.page !== id; });
      links.forEach(function (a) { a.classList.toggle('active', a.dataset.sec === id); });
      document.title = 'Ecolink Solutions · ' + PAGES.filter(function (p) { return p[0] === id; })[0][1];
      window.scrollTo(0, 0); up();
    };
    addEventListener('hashchange', route); route();
    document.addEventListener('click', function (e) { var a = e.target.closest('[data-scroll]'); if (a) { e.preventDefault(); $(a.dataset.scroll).scrollIntoView({ behavior: 'smooth' }); } });
  }

  var PAGES = [['analise', 'Análise consolidada'], ['relatorios', 'Relatórios'], ['conteudos', 'Conteúdos'], ['recomendacao', 'Recomendação estratégica']];
  function pager(i) {
    var p = PAGES[i - 1], n = PAGES[i + 1];
    return '<nav class="pager"><div class="wrap">' +
      (p ? '<a href="#' + p[0] + '"><small>← Anterior</small>' + p[1] + '</a>' : '<span></span>') +
      (n ? '<a class="next" href="#' + n[0] + '"><small>Próxima →</small>' + n[1] + '</a>' : '<span></span>') + '</div></nav>';
  }
})();
