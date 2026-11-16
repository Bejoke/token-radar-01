// Token Radar dashboard: renders window.RADAR (written by main.ts as data.js) with no network.
//
// Board: every ranked row, sortable by header, filterable by text, category, chain and the
// watchlist. A row opens its detail view: the model breakdown that priced it and its farm plan.
// Live tokens: the market's own values, shown for calibration and never ranked. Model: the
// formula and the peer table it is priced from. Views are addressable: #tab=live, #q=<text>,
// #detail=<slug>, so a screenshot can open exactly the view it shows.
(function () {
  'use strict';
  var D = window.RADAR;
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function num(n) { return n.toLocaleString('en-US'); }
  function pct(n) { return n === null ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%'; }
  function age(n) { return n === null ? '—' : n >= 365 ? (n / 365).toFixed(1) + 'y' : n + 'd'; }
  function mult(n) { return '×' + n.toFixed(2); }

  var state = { q: '', category: '', chain: '', watchlist: false, sort: 'value', dir: -1, selected: null, tab: 'board' };
  var watchlist = {};
  (D.watchlist || []).forEach(function (s) { watchlist[s] = true; });

  // ---- stats ---------------------------------------------------------------
  var top = D.rows[0];
  var vals = D.rows.map(function (r) { return r.implied_value_usd; }).sort(function (a, b) { return a - b; });
  var medianVal = vals[Math.floor(vals.length / 2)];
  $('stats').innerHTML =
    '<div><dt>Protocols ranked</dt><dd>' + num(D.rows.length) + '</dd></div>' +
    '<div><dt>Watchlist covered</dt><dd>' + D.watchlist_size + ' / ' + D.watchlist_size + '</dd></div>' +
    '<div><dt>Top implied value</dt><dd>' + money(top.implied_value_usd) + '</dd></div>' +
    '<div><dt>Median implied value</dt><dd>' + money(medianVal) + '</dd></div>' +
    '<div><dt>Snapshot</dt><dd>' + esc(D.as_of) + '</dd></div>';

  // ---- filter controls -----------------------------------------------------
  var cats = [];
  var chains = [];
  D.rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    r.chains.forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort();
  chains.sort();
  $('category').innerHTML = '<option value="">All categories</option>' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  $('chain').innerHTML = '<option value="">All chains</option>' + chains.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');

  // ---- board ---------------------------------------------------------------
  function filtered() {
    var q = state.q.trim().toLowerCase();
    return D.rows.filter(function (r) {
      if (state.watchlist && !watchlist[r.slug]) return false;
      if (state.category && r.category !== state.category) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function sorted(rows) {
    var key = state.sort;
    var dir = state.dir;
    function cmp(a, b) {
      var x, y;
      if (key === 'value') { x = a.implied_value_usd; y = b.implied_value_usd; }
      else if (key === 'tvl') { x = a.tvl_usd; y = b.tvl_usd; }
      else if (key === 'growth') { x = a.change_7d === null ? -Infinity : a.change_7d; y = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { x = a.age_days === null ? -1 : a.age_days; y = b.age_days === null ? -1 : b.age_days; }
      else if (key === 'name') { return dir * (a.name < b.name ? -1 : a.name > b.name ? 1 : 0); }
      else if (key === 'category') { return dir * ((a.category || '') < (b.category || '') ? -1 : (a.category || '') > (b.category || '') ? 1 : 0); }
      else { x = a.rank; y = b.rank; }
      return dir * (x < y ? -1 : x > y ? 1 : (a.slug < b.slug ? -1 : 1));
    }
    return rows.slice().sort(cmp);
  }
  function renderBoard() {
    var rows = sorted(filtered());
    $('count').textContent = 'Showing ' + num(rows.length) + ' of ' + num(D.rows.length) + ' ranked protocols' +
      (state.watchlist ? ' · watchlist only' : '') + (state.q ? ' · matching “' + state.q + '”' : '');
    $('rows').innerHTML = rows.map(function (r) {
      var g = r.change_7d === null ? '' : (r.change_7d >= 0 ? 'pos' : 'neg');
      return '<tr data-slug="' + esc(r.slug) + '"' + (state.selected === r.slug ? ' class="selected"' : '') + '>' +
        '<td class="num">' + r.rank + '</td>' +
        '<td>' + esc(r.name) + (watchlist[r.slug] ? '<span class="badge">watchlist</span>' : '') + '<span class="sub">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + g + '">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num value">' + money(r.implied_value_usd) + '</td></tr>';
    }).join('');
    document.querySelectorAll('#rows tr').forEach(function (tr) {
      tr.addEventListener('click', function () { openDetail(tr.getAttribute('data-slug')); });
    });
    document.querySelectorAll('#board thead th[data-sort]').forEach(function (th) {
      th.classList.toggle('sorted', th.getAttribute('data-sort') === state.sort);
    });
  }
  document.querySelectorAll('#board thead th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-sort');
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'name' || key === 'category' ? 1 : -1; }
      renderBoard();
    });
  });
  $('q').addEventListener('input', function () { state.q = $('q').value; renderBoard(); });
  $('category').addEventListener('change', function () { state.category = $('category').value; renderBoard(); });
  $('chain').addEventListener('change', function () { state.chain = $('chain').value; renderBoard(); });
  $('watchlist').addEventListener('change', function () { state.watchlist = $('watchlist').checked; renderBoard(); });
  $('sort').addEventListener('change', function () {
    state.sort = $('sort').value;
    state.dir = state.sort === 'name' ? 1 : -1;
    renderBoard();
  });

  // ---- detail --------------------------------------------------------------
  function findRow(slug) {
    for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === slug) return D.rows[i];
    return null;
  }
  function openDetail(slug) {
    var r = findRow(slug);
    if (!r) return;
    state.selected = slug;
    var base = r.tvl_usd * r.category_multiple;
    $('detail').hidden = false;
    $('detail').innerHTML =
      '<h2>#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<p class="meta">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) +
      ' · listed ' + esc(r.listed_at || 'unknown') + ' · records no token</p>' +
      '<h3>Why it is worth ' + money(r.implied_value_usd) + '</h3>' +
      '<table><thead><tr><th>Step</th><th class="num">Figure</th><th class="num">Multiplier</th></tr></thead><tbody>' +
      '<tr><td>TVL</td><td class="num">' + money(r.tvl_usd) + '</td><td class="num">—</td></tr>' +
      '<tr><td>Category multiple (' + esc(r.category || 'Uncategorised') + ', ' + r.category_peers + ' live peers)</td><td class="num">' + money(Math.round(base)) + '</td><td class="num">' + mult(r.category_multiple) + '</td></tr>' +
      '<tr><td>7-day growth ' + pct(r.change_7d) + '</td><td class="num">—</td><td class="num">' + mult(r.growth_multiplier) + '</td></tr>' +
      '<tr><td>Maturity (' + age(r.age_days) + ' with no token)</td><td class="num">—</td><td class="num">' + mult(r.maturity_multiplier) + '</td></tr>' +
      '<tr><td>Chains (' + r.chains.length + ')</td><td class="num">—</td><td class="num">' + mult(r.chain_multiplier) + '</td></tr>' +
      '<tr><td><strong>Implied value</strong></td><td class="num value"><strong>' + money(r.implied_value_usd) + '</strong></td><td class="num">—</td></tr>' +
      '</tbody></table>' +
      '<h3>Farm plan — six steps</h3>' +
      '<ol class="steps">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p><button type="button" id="close-detail">Close detail</button></p>';
    $('close-detail').addEventListener('click', function () {
      state.selected = null;
      $('detail').hidden = true;
      $('detail').innerHTML = '';
      setHash();
      renderBoard();
    });
    setHash();
    renderBoard();
    $('detail').scrollIntoView({ block: 'nearest' });
  }

  // ---- live ----------------------------------------------------------------
  $('liverows').innerHTML = D.live.map(function (p) {
    var g = p.change_7d === null ? '' : (p.change_7d >= 0 ? 'pos' : 'neg');
    return '<tr><td>' + esc(p.name) + '<span class="sub">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td>' +
      '<td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + money(p.mcap_usd || 0) + '</td>' +
      '<td class="num">' + (p.mcap_per_tvl === null ? '—' : mult(p.mcap_per_tvl)) + '</td>' +
      '<td class="num ' + g + '">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  // ---- model ---------------------------------------------------------------
  var peers = D.peers.slice().sort(function (a, b) { return b.multiple - a.multiple; });
  $('peerrows').innerHTML = peers.map(function (p) {
    return '<tr><td>' + esc(p.category) + '</td><td class="num">' + p.peers + '</td><td class="num">' + mult(p.multiple) + '</td></tr>';
  }).join('') +
  '<tr><td><strong>All live-token protocols (fallback)</strong></td><td class="num">—</td><td class="num"><strong>' + mult(D.global_multiple) + '</strong></td></tr>';

  // ---- tabs + hash ---------------------------------------------------------
  function showTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.tabs button').forEach(function (b) {
      var on = b.getAttribute('data-tab') === tab;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('view-board').hidden = tab !== 'board';
    $('view-live').hidden = tab !== 'live';
    $('view-model').hidden = tab !== 'model';
    setHash();
  }
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
  });
  function setHash() {
    var parts = [];
    if (state.tab !== 'board') parts.push('tab=' + state.tab);
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.selected) parts.push('detail=' + encodeURIComponent(state.selected));
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : '#');
  }
  function readHash() {
    var h = location.hash.replace(/^#/, '');
    if (!h) return;
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      var k = kv[0], v = decodeURIComponent(kv[1] || '');
      if (k === 'tab' && (v === 'live' || v === 'model' || v === 'board')) showTab(v);
      if (k === 'q') { state.q = v; $('q').value = v; }
      if (k === 'detail') state.selected = v;
    });
  }

  readHash();
  renderBoard();
  if (state.selected) openDetail(state.selected);
  document.querySelector('main').setAttribute('aria-busy', 'false');
})();
