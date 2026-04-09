/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Project P&L Dashboard — Optimized Version
 *
 * Key changes:
 * 1. No full transaction dump into the browser
 * 2. Server-side summary search with grouped results
 * 3. Drill-down transactions fetched only on click
 * 4. Much smaller initial page load
 * 5. Filters applied on server, not against a giant RAW array in browser
 */

define(['N/search', 'N/log', 'N/runtime', 'N/url'],
    (search, log, runtime, url) => {

        const CONFIG = {
            DEFAULT_FROM: '2026-03-01',
            DEFAULT_TO: '2026-04-30',
            CLASS_SCOPE_IDS: ['1', '2'],

            PROJECT_FIELD: 'custcol_cv_project',
            PROJECT_MANAGER_FIELD: 'custbody_cv_projectmgrso',

            // If you want Job Type later, put exact field ids/joins here and re-add it.
            ENABLE_JOB_TYPE: false
        };

        function onRequest(context) {
            try {
                const req = context.request;
                const action = (req.parameters.action || '').toLowerCase();

                if (action === 'summary') {
                    return handleSummary(context);
                }

                if (action === 'drilldown') {
                    return handleDrilldown(context);
                }

                return renderPage(context);
            } catch (e) {
                log.error('onRequest error', e);
                context.response.write(buildErrorPage(e));
            }
        }

        function renderPage(context) {
            const suiteletUrl = url.resolveScript({
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId,
                returnExternalUrl: false
            });

            const filterOpts = loadAllFilterOptions();

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Project P&amp;L Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f4f6f9;--wh:#ffffff;--bg2:#f0f2f5;
  --bdr:#e2e5eb;--bdr2:#d0d4dc;
  --tx:#1a1d26;--tx2:#5c6070;--tx3:#8b90a0;
  --acc:#4f46e5;--accL:#eef2ff;--accG:rgba(79,70,229,.12);
  --grn:#059669;--grnBg:#ecfdf5;--grnB:#a7f3d0;
  --red:#dc2626;--redBg:#fef2f2;--redB:#fecaca;
  --org:#d97706;--orgBg:#fffbeb;--orgB:#fde68a;
  --pur:#7c3aed;--purBg:#f5f3ff;--purB:#ddd6fe;
  --tel:#0d9488;--telBg:#f0fdfa;--telB:#99f6e4;
  --pnk:#db2777;--pnkBg:#fdf2f8;--pnkB:#fbcfe8;
  --r:10px;--rl:14px;
  --ff:'DM Sans',system-ui,sans-serif;
  --mono:'JetBrains Mono',monospace;
  --sh:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --sh2:0 4px 16px rgba(0,0,0,.08);
}
html{font-size:14px}
body{font-family:var(--ff);background:var(--bg);color:var(--tx);min-height:100vh}
.hdr{padding:22px 32px 18px;background:var(--wh);border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:flex-start;box-shadow:var(--sh)}
.hdr h1{font-size:1.4rem;font-weight:700;letter-spacing:-.4px;color:var(--tx)}
.hdr h1 em{font-style:normal;color:var(--acc)}
.hdr p{color:var(--tx2);font-size:.78rem;margin-top:3px}
.hdr-b{display:flex;gap:8px}
.btn{font-family:var(--ff);padding:8px 18px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer;border:1px solid var(--bdr);transition:all .15s;display:inline-flex;align-items:center;gap:6px;background:var(--wh);color:var(--tx2)}
.btn:hover{background:var(--bg2);color:var(--tx);border-color:var(--bdr2)}
.btn-a{background:var(--acc);color:#fff;border-color:var(--acc)}
.btn-a:hover{background:#4338ca;box-shadow:0 2px 8px var(--accG)}
.fbar{padding:14px 32px;background:var(--wh);border-bottom:1px solid var(--bdr);display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.fbar .tag{font-size:.68rem;font-weight:700;color:var(--acc);text-transform:uppercase;letter-spacing:1.2px;margin-right:2px;white-space:nowrap}
.fg{position:relative}
.fg label{position:absolute;top:-7px;left:10px;font-size:.58rem;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:var(--tx3);background:var(--wh);padding:0 5px;z-index:1}
.fg select,.fg input[type=date]{font-family:var(--ff);padding:9px 12px;padding-top:11px;border:1.5px solid var(--bdr);border-radius:8px;font-size:.76rem;background:var(--wh);color:var(--tx);min-width:152px;transition:border-color .2s}
.fg select:focus,.fg input:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px var(--accG)}
.clr{font-size:.72rem;color:var(--tx3);cursor:pointer;text-decoration:underline;background:0 0;border:0;font-family:var(--ff);margin-left:2px}
.clr:hover{color:var(--red)}
.sstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:18px 32px}
.sc{background:var(--wh);border:1px solid var(--bdr);border-radius:var(--rl);padding:18px 20px;position:relative;overflow:hidden;transition:all .15s;box-shadow:var(--sh)}
.sc:hover{box-shadow:var(--sh2);transform:translateY(-1px)}
.sc .bar{position:absolute;top:0;left:0;right:0;height:3px}
.sc .lb{font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--tx3);margin-bottom:8px}
.sc .vl{font-family:var(--mono);font-size:1.35rem;font-weight:600}
.sc .sb{font-size:.7rem;color:var(--tx3);margin-top:5px}
.sc.si .bar{background:var(--grn)}.sc.si .vl{color:var(--grn)}
.sc.se .bar{background:var(--red)}.sc.se .vl{color:var(--red)}
.sc.sm .bar{background:var(--acc)}.sc.sm .vl{color:var(--acc)}
.sc.sp .bar{background:var(--org)}.sc.sp .vl{color:var(--org)}
.tw{margin:0 32px 32px;border-radius:var(--rl);overflow:hidden;border:1px solid var(--bdr);background:var(--wh);box-shadow:var(--sh)}
.ttb{padding:12px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--bdr)}
.ttb .ct{font-size:.72rem;color:var(--tx3);font-family:var(--mono)}
.sbox{font-family:var(--ff);padding:8px 14px;border-radius:8px;border:1.5px solid var(--bdr);background:var(--wh);color:var(--tx);font-size:.78rem;width:240px;transition:border-color .2s}
.sbox:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px var(--accG)}
.ts{overflow-x:auto;max-height:60vh;overflow-y:auto}
table{width:100%;border-collapse:collapse;white-space:nowrap}
thead{position:sticky;top:0;z-index:5}
thead th{padding:11px 16px;text-align:right;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--tx3);background:var(--bg2);border-bottom:2px solid var(--bdr);cursor:pointer;user-select:none;transition:color .15s}
thead th:hover{color:var(--tx)}
thead th:first-child{text-align:left;padding-left:20px}
thead th .si{margin-left:3px;opacity:.3;font-size:.6rem}
thead th.sorted .si{opacity:1;color:var(--acc)}
tbody tr{border-bottom:1px solid var(--bdr);transition:background .1s}
tbody tr:hover{background:var(--accL)}
tbody td{padding:10px 16px;text-align:right;font-size:.82rem}
tbody td:first-child{text-align:left;padding-left:20px;font-weight:600;color:var(--tx);max-width:280px;overflow:hidden;text-overflow:ellipsis}
.am{display:inline-block;font-family:var(--mono);font-size:.76rem;font-weight:600;padding:5px 12px;border-radius:7px;cursor:pointer;transition:all .15s;border:1px solid transparent;min-width:82px;text-align:right}
.am:hover{transform:scale(1.04);box-shadow:var(--sh)}
.am.z{color:var(--tx3);background:0 0;cursor:default;font-weight:400;opacity:.5}
.am.z:hover{transform:none;box-shadow:none}
.am.cg{color:var(--grn);background:var(--grnBg);border-color:var(--grnB)}
.am.cr{color:var(--red);background:var(--redBg);border-color:var(--redB)}
.am.co{color:var(--org);background:var(--orgBg);border-color:var(--orgB)}
.am.cp{color:var(--pur);background:var(--purBg);border-color:var(--purB)}
.am.ct{color:var(--tel);background:var(--telBg);border-color:var(--telB)}
.am.ck{color:var(--pnk);background:var(--pnkBg);border-color:var(--pnkB)}
.am.mp{color:var(--grn);background:var(--grnBg);border-color:var(--grnB)}
.am.mn{color:var(--red);background:var(--redBg);border-color:var(--redB)}
tbody tr.tot{background:var(--bg2);border-top:2px solid var(--acc)}
tbody tr.tot td{font-weight:700;padding:14px 16px}
tbody tr.tot td:first-child{color:var(--acc)}

.mo{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.35);backdrop-filter:blur(4px);justify-content:center;align-items:center;padding:24px}
.mo.open{display:flex}
.mdl{background:var(--wh);border:1px solid var(--bdr);border-radius:var(--rl);width:100%;max-width:1250px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,.15)}
.mhd{padding:16px 24px;border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center;background:var(--bg2);border-radius:var(--rl) var(--rl) 0 0}
.mhd h3{font-size:.95rem;font-weight:700;display:flex;align-items:center;gap:10px;color:var(--tx)}
.mhd .badge{font-size:.66rem;padding:3px 10px;border-radius:20px;font-weight:600;font-family:var(--mono);background:var(--accL);color:var(--acc)}
.mx{width:32px;height:32px;border-radius:8px;border:1px solid var(--bdr);background:var(--wh);color:var(--tx3);cursor:pointer;font-size:.95rem;display:flex;align-items:center;justify-content:center}
.mx:hover{background:var(--redBg);color:var(--red);border-color:var(--red)}
.mbd{overflow:auto;flex:1}
.mbd table{width:100%}
.mbd thead th{font-size:.6rem;padding:10px 14px;background:var(--bg);text-align:left}
.mbd tbody td{padding:9px 14px;font-size:.76rem;text-align:left;border-bottom:1px solid var(--bdr)}
.mbd tbody td:last-child{text-align:right}
.mbd tbody tr:hover{background:var(--accL)}
.mbd a{color:var(--acc);text-decoration:none;font-weight:600}
.mbd a:hover{text-decoration:underline}
.mft{padding:14px 24px;border-top:1px solid var(--bdr);display:flex;justify-content:space-between;font-size:.75rem;color:var(--tx2);font-family:var(--mono);background:var(--bg2);border-radius:0 0 var(--rl) var(--rl)}
.mft .tv{font-weight:700;color:var(--tx);font-size:.85rem}
.empty{text-align:center;padding:50px;color:var(--tx3);font-size:.85rem}
.loading{padding:24px;text-align:center;color:var(--tx3)}
.err{padding:24px;text-align:center;color:var(--red)}
@media(max-width:900px){
  .sstrip{grid-template-columns:repeat(2,1fr)}
  .fbar{padding:10px 16px}
  .tw,.sstrip{margin-left:16px;margin-right:16px}
  .hdr{padding:18px 16px}
}
</style>
</head>
<body>

<div class="hdr">
  <div>
    <h1><em>&#9632;</em> Project P&amp;L Dashboard</h1>
    <p>Optimized version &middot; Server-side summary &middot; Drill-down on demand</p>
  </div>
  <div class="hdr-b">
    <button class="btn" onclick="exportCSV()">&#11015; Export CSV</button>
    <button class="btn btn-a" onclick="loadSummary()">&#8635; Refresh Data</button>
  </div>
</div>

<div class="fbar">
  <span class="tag">&#9889; Filters</span>
  <div class="fg"><label>From</label><input type="date" id="fDF" value="${escapeHtml(CONFIG.DEFAULT_FROM)}"></div>
  <div class="fg"><label>To</label><input type="date" id="fDT" value="${escapeHtml(CONFIG.DEFAULT_TO)}"></div>
  <div class="fg"><label>Project</label><select id="fP"><option value="">All Projects</option></select></div>
  <div class="fg"><label>Class</label><select id="fC"><option value="">All Classes</option></select></div>
  <div class="fg"><label>Project Mgr</label><select id="fM"><option value="">All Managers</option></select></div>
  <button class="clr" onclick="resetFilters()">&#10005; Clear all</button>
</div>

<div class="sstrip">
  <div class="sc sp"><div class="bar"></div><div class="lb">Projects</div><div class="vl" id="sP">0</div><div class="sb">Matching filters</div></div>
  <div class="sc si"><div class="bar"></div><div class="lb">Total Income</div><div class="vl" id="sI">$0</div><div class="sb">Invoices, Credits, Journals</div></div>
  <div class="sc se"><div class="bar"></div><div class="lb">Total Costs</div><div class="vl" id="sE">$0</div><div class="sb">Bills, Checks, CC, Journals</div></div>
  <div class="sc sm"><div class="bar"></div><div class="lb">Net Margin</div><div class="vl" id="sM">$0</div><div class="sb" id="sMp"></div></div>
</div>

<div class="tw">
  <div class="ttb">
    <input class="sbox" type="text" id="sBox" placeholder="&#128269; Search projects...">
    <span class="ct" id="rCt">0 projects</span>
  </div>
  <div class="ts">
    <table>
      <thead><tr>
        <th data-c="projectName" onclick="sortBy('projectName')" style="text-align:left">Project <span class="si">&#9650;</span></th>
        <th data-c="income" onclick="sortBy('income')">Income / Revenue <span class="si">&#9650;</span></th>
        <th data-c="bills" onclick="sortBy('bills')">Bills <span class="si">&#9650;</span></th>
        <th data-c="billCredit" onclick="sortBy('billCredit')">Bill Credit <span class="si">&#9650;</span></th>
        <th data-c="checks" onclick="sortBy('checks')">Checks <span class="si">&#9650;</span></th>
        <th data-c="journals" onclick="sortBy('journals')">Journals <span class="si">&#9650;</span></th>
        <th data-c="creditCard" onclick="sortBy('creditCard')">Credit Card <span class="si">&#9650;</span></th>
        <th data-c="margin" onclick="sortBy('margin')">Net Margin <span class="si">&#9650;</span></th>
      </tr></thead>
      <tbody id="tB"><tr><td colspan="8" class="loading">Loading...</td></tr></tbody>
    </table>
  </div>
</div>

<div class="mo" id="ov" onclick="if(event.target===this)closeModal()">
  <div class="mdl">
    <div class="mhd">
      <h3><span id="mT">Transactions</span><span class="badge" id="mBd">0</span></h3>
      <button class="mx" onclick="closeModal()">&#10005;</button>
    </div>
    <div class="mbd" id="mB"></div>
    <div class="mft"><span id="mTo"></span><span id="mPr"></span></div>
  </div>
</div>

<script>
var SUITELET_URL = ${JSON.stringify(suiteletUrl)};
var FILTERS = ${JSON.stringify(filterOpts)};
var SUMMARY = [];
var VIEW = [];
var SORT_COL = 'margin';
var SORT_DIR = -1;
var DEBOUNCE = null;

(function init(){
  populateSelect('fP', FILTERS.projects || []);
  populateSelect('fC', FILTERS.classes || []);
  populateSelect('fM', FILTERS.projectManagers || []);

  document.getElementById('fDF').addEventListener('change', loadSummary);
  document.getElementById('fDT').addEventListener('change', loadSummary);
  document.getElementById('fP').addEventListener('change', loadSummary);
  document.getElementById('fC').addEventListener('change', loadSummary);
  document.getElementById('fM').addEventListener('change', loadSummary);

  document.getElementById('sBox').addEventListener('input', function(){
    if (DEBOUNCE) clearTimeout(DEBOUNCE);
    DEBOUNCE = setTimeout(applyClientSearchAndRender, 250);
  });

  loadSummary();
})();

function populateSelect(id, items){
  var s = document.getElementById(id);
  items.forEach(function(i){
    var o = document.createElement('option');
    o.value = i.id;
    o.textContent = i.name;
    s.appendChild(o);
  });
}

function getFilters(){
  return {
    from: document.getElementById('fDF').value || '',
    to: document.getElementById('fDT').value || '',
    projectId: document.getElementById('fP').value || '',
    classId: document.getElementById('fC').value || '',
    projMgrId: document.getElementById('fM').value || ''
  };
}

function buildQuery(params){
  var list = [];
  Object.keys(params).forEach(function(k){
    if (params[k] !== null && params[k] !== undefined) {
      list.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    }
  });
  return list.join('&');
}

function loadSummary(){
  document.getElementById('tB').innerHTML = '<tr><td colspan="8" class="loading">Loading summary...</td></tr>';

  var params = getFilters();
  params.action = 'summary';

  fetch(SUITELET_URL + '&' + buildQuery(params), { method: 'GET' })
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (!data || data.success !== true) {
        throw new Error((data && data.message) || 'Unable to load summary');
      }
      SUMMARY = data.rows || [];
      applyClientSearchAndRender();
    })
    .catch(function(err){
      console.error(err);
      document.getElementById('tB').innerHTML = '<tr><td colspan="8" class="err">Error loading data</td></tr>';
      SUMMARY = [];
      VIEW = [];
      renderSummaryCards();
    });
}

function applyClientSearchAndRender(){
  var q = (document.getElementById('sBox').value || '').toLowerCase();

  VIEW = SUMMARY.filter(function(r){
    return !q || ((r.projectName || '').toLowerCase().indexOf(q) !== -1);
  });

  sortCurrent();
  renderTable();
  renderSummaryCards();
}

function resetFilters(){
  document.getElementById('fDF').value = ${JSON.stringify(CONFIG.DEFAULT_FROM)};
  document.getElementById('fDT').value = ${JSON.stringify(CONFIG.DEFAULT_TO)};
  document.getElementById('fP').value = '';
  document.getElementById('fC').value = '';
  document.getElementById('fM').value = '';
  document.getElementById('sBox').value = '';
  loadSummary();
}

function sortBy(col){
  if (SORT_COL === col) {
    SORT_DIR = SORT_DIR * -1;
  } else {
    SORT_COL = col;
    SORT_DIR = (col === 'projectName') ? 1 : -1;
  }

  document.querySelectorAll('thead th').forEach(function(th){
    th.classList.toggle('sorted', th.dataset.c === col);
    if (th.dataset.c === col) {
      th.querySelector('.si').innerHTML = SORT_DIR === 1 ? '&#9650;' : '&#9660;';
    }
  });

  sortCurrent();
  renderTable();
}

function sortCurrent(){
  VIEW.sort(function(a, b){
    var va = a[SORT_COL];
    var vb = b[SORT_COL];

    if (SORT_COL === 'projectName') {
      va = (va || '').toLowerCase();
      vb = (vb || '').toLowerCase();
      return va < vb ? -SORT_DIR : va > vb ? SORT_DIR : 0;
    }

    va = parseFloat(va) || 0;
    vb = parseFloat(vb) || 0;
    return va < vb ? -SORT_DIR : va > vb ? SORT_DIR : 0;
  });
}

function renderTable(){
  var tb = document.getElementById('tB');
  document.getElementById('rCt').textContent = VIEW.length + ' projects';

  if (!VIEW.length) {
    tb.innerHTML = '<tr><td colspan="8" class="empty">No matching projects found</td></tr>';
    return;
  }

  var h = '';
  var tI = 0, tB = 0, tBC = 0, tCh = 0, tJ = 0, tCC = 0, tM = 0;

  VIEW.forEach(function(r){
    tI += num(r.income);
    tB += num(r.bills);
    tBC += num(r.billCredit);
    tCh += num(r.checks);
    tJ += num(r.journals);
    tCC += num(r.creditCard);
    tM += num(r.margin);

    h += '<tr>';
    h += '<td>' + esc(r.projectName) + '</td>';
    h += amountTd(r, 'income', 'cg');
    h += amountTd(r, 'bills', 'cr');
    h += amountTd(r, 'billCredit', 'co');
    h += amountTd(r, 'checks', 'cp');
    h += amountTd(r, 'journals', 'ct');
    h += amountTd(r, 'creditCard', 'ck');
    h += amountTd(r, 'all', r.margin >= 0 ? 'mp' : 'mn', r.margin);
    h += '</tr>';
  });

  h += '<tr class="tot">';
  h += '<td>TOTAL (' + VIEW.length + ')</td>';
  h += '<td><span class="am cg">' + fmt(tI) + '</span></td>';
  h += '<td><span class="am cr">' + fmt(tB) + '</span></td>';
  h += '<td><span class="am co">' + fmt(tBC) + '</span></td>';
  h += '<td><span class="am cp">' + fmt(tCh) + '</span></td>';
  h += '<td><span class="am ct">' + fmt(tJ) + '</span></td>';
  h += '<td><span class="am ck">' + fmt(tCC) + '</span></td>';
  h += '<td><span class="am ' + (tM >= 0 ? 'mp' : 'mn') + '">' + fmt(tM) + '</span></td>';
  h += '</tr>';

  tb.innerHTML = h;
}

function amountTd(row, cat, cls, explicitValue){
  var value = (cat === 'all') ? explicitValue : row[cat];
  value = num(value);

  if (value === 0) {
    return '<td><span class="am z">&mdash;</span></td>';
  }

  return '<td><span class="am ' + cls + '" onclick="openDrilldown(\\'' + escJs(row.projectId) + '\\',\\'' + escJs(row.projectName) + '\\',\\'' + cat + '\\')">' + fmt(value) + '</span></td>';
}

function renderSummaryCards(){
  var ti = 0, te = 0, tm = 0;
  VIEW.forEach(function(r){
    ti += num(r.income);
    te += Math.abs(num(r.bills)) + Math.abs(num(r.billCredit)) + Math.abs(num(r.checks)) + Math.abs(num(r.journals)) + Math.abs(num(r.creditCard));
    tm += num(r.margin);
  });

  document.getElementById('sP').textContent = VIEW.length;
  document.getElementById('sI').textContent = fmt(ti);
  document.getElementById('sE').textContent = fmt(te);

  var mEl = document.getElementById('sM');
  mEl.textContent = fmt(tm);
  mEl.style.color = tm >= 0 ? 'var(--grn)' : 'var(--red)';
  document.getElementById('sMp').textContent = ti ? ((tm / ti) * 100).toFixed(1) + '% margin' : '';
}

function openDrilldown(projectId, projectName, category){
  var modal = document.getElementById('ov');
  modal.classList.add('open');
  document.getElementById('mT').textContent = 'Loading...';
  document.getElementById('mBd').textContent = '0';
  document.getElementById('mB').innerHTML = '<div class="loading">Loading transactions...</div>';
  document.getElementById('mTo').textContent = '';
  document.getElementById('mPr').textContent = projectName || '';

  var params = getFilters();
  params.action = 'drilldown';
  params.projectId = projectId;
  params.category = category;

  fetch(SUITELET_URL + '&' + buildQuery(params), { method: 'GET' })
    .then(function(r){ return r.json(); })
    .then(function(data){
      if (!data || data.success !== true) {
        throw new Error((data && data.message) || 'Unable to load drilldown');
      }
      renderDrilldown(projectName, category, data.rows || []);
    })
    .catch(function(err){
      console.error(err);
      document.getElementById('mT').textContent = 'Error';
      document.getElementById('mB').innerHTML = '<div class="err">Error loading transactions</div>';
    });
}

function renderDrilldown(projectName, category, rows){
  var labels = {
    income: 'Income / Revenue',
    bills: 'Bills',
    billCredit: 'Bill Credits',
    checks: 'Checks',
    journals: 'Journals',
    creditCard: 'Credit Card',
    all: 'All Transactions'
  };

  document.getElementById('mT').textContent = (labels[category] || category) + ' — ' + (projectName || '');
  document.getElementById('mBd').textContent = rows.length + ' transactions';
  document.getElementById('mPr').textContent = projectName || '';

  if (!rows.length) {
    document.getElementById('mB').innerHTML = '<div class="empty">No transactions found</div>';
    document.getElementById('mTo').textContent = '';
    return;
  }

  var h = '<table><thead><tr>';
  h += '<th>Doc #</th><th>Date</th><th>Type</th><th>Entity</th><th>Memo</th><th>Account</th><th>Class</th><th style="text-align:right">Amount</th>';
  h += '</tr></thead><tbody>';

  var total = 0;
  rows.forEach(function(t){
    total += num(t.amount);
    h += '<tr>';
    h += '<td><a href="' + escAttr(t.url || '#') + '" target="_blank">' + esc(t.tranId || t.internalId || '') + '</a></td>';
    h += '<td>' + esc(t.date || '') + '</td>';
    h += '<td>' + esc(t.type || '') + '</td>';
    h += '<td>' + esc(t.entity || '') + '</td>';
    h += '<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">' + esc(t.memo || '') + '</td>';
    h += '<td>' + esc(t.account || '') + '</td>';
    h += '<td>' + esc(t.className || '') + '</td>';
    h += '<td style="text-align:right;font-family:var(--mono);font-weight:600">' + fmt(num(t.amount)) + '</td>';
    h += '</tr>';
  });

  h += '</tbody></table>';
  document.getElementById('mB').innerHTML = h;
  document.getElementById('mTo').innerHTML = 'Total: <span class="tv">' + fmt(total) + '</span>';
}

function closeModal(){
  document.getElementById('ov').classList.remove('open');
}

document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') closeModal();
});

function exportCSV(){
  if (!VIEW.length) return;

  var csv = 'Project,Income,Bills,Bill Credits,Checks,Journals,Credit Card,Net Margin\\n';
  VIEW.forEach(function(r){
    csv += '"' + (r.projectName || '').replace(/"/g, '""') + '",'
      + num(r.income) + ','
      + num(r.bills) + ','
      + num(r.billCredit) + ','
      + num(r.checks) + ','
      + num(r.journals) + ','
      + num(r.creditCard) + ','
      + num(r.margin) + '\\n';
  });

  var blob = new Blob([csv], { type: 'text/csv' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Project_PnL_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
}

function fmt(n){
  n = num(n);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}
function num(v){
  var n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}
function esc(s){
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escAttr(s){ return esc(s); }
function escJs(s){
  if (s === null || s === undefined) return '';
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
</script>
</body>
</html>`;

            context.response.write(html);
        }

        function handleSummary(context) {
            try {
                const params = context.request.parameters;
                const rows = loadSummaryRows(params);
                return writeJson(context, {
                    success: true,
                    rows: rows
                });
            } catch (e) {
                log.error('handleSummary', e);
                return writeJson(context, {
                    success: false,
                    message: e.message || e.toString()
                });
            }
        }

        function handleDrilldown(context) {
            try {
                const params = context.request.parameters;
                const rows = loadDrilldownRows(params);
                return writeJson(context, {
                    success: true,
                    rows: rows
                });
            } catch (e) {
                log.error('handleDrilldown', e);
                return writeJson(context, {
                    success: false,
                    message: e.message || e.toString()
                });
            }
        }

        function loadSummaryRows(params) {
            const resultMap = {};
            const filters = buildBaseFilters(params, false);

            const tranTypeCol = search.createColumn({ name: 'type', summary: search.Summary.GROUP });
            const acctTypeCol = search.createColumn({ name: 'accounttype', summary: search.Summary.GROUP });
            const projCol = search.createColumn({ name: CONFIG.PROJECT_FIELD, summary: search.Summary.GROUP, sort: search.Sort.ASC });
            const amtCol = search.createColumn({ name: 'amount', summary: search.Summary.SUM });

            const s = search.create({
                type: 'transaction',
                filters: filters,
                columns: [
                    projCol,
                    tranTypeCol,
                    acctTypeCol,
                    amtCol
                ]
            });

            const paged = s.runPaged({ pageSize: 1000 });
            paged.pageRanges.forEach(function(pr){
                const page = paged.fetch({ index: pr.index });
                page.data.forEach(function(r){
                    const projectId = r.getValue(projCol) || '';
                    const projectName = r.getText(projCol) || '';
                    const typeText = r.getText(tranTypeCol) || '';
                    const accountTypeText = r.getText(acctTypeCol) || '';
                    const amount = parseFloat(r.getValue(amtCol)) || 0;

                    if (!projectId) {
                        return;
                    }

                    if (!resultMap[projectId]) {
                        resultMap[projectId] = {
                            projectId: projectId,
                            projectName: projectName,
                            income: 0,
                            bills: 0,
                            billCredit: 0,
                            checks: 0,
                            journals: 0,
                            creditCard: 0,
                            margin: 0
                        };
                    }

                    const cat = classify(typeText, accountTypeText);
                    if (cat === 'income') {
                        resultMap[projectId].income += amount;
                    } else if (cat === 'bills') {
                        resultMap[projectId].bills += amount;
                    } else if (cat === 'billCredit') {
                        resultMap[projectId].billCredit += amount;
                    } else if (cat === 'checks') {
                        resultMap[projectId].checks += amount;
                    } else if (cat === 'journals') {
                        resultMap[projectId].journals += amount;
                    } else if (cat === 'creditCard') {
                        resultMap[projectId].creditCard += amount;
                    }
                });
            });

            const rows = [];
            Object.keys(resultMap).forEach(function(key){
                const row = resultMap[key];
                row.margin = row.income - row.bills - row.billCredit - row.checks - row.journals - row.creditCard;
                rows.push(row);
            });

            return rows;
        }

        function loadDrilldownRows(params) {
            const projectId = params.projectId || '';
            const category = params.category || 'all';

            if (!projectId) {
                return [];
            }

            const filters = buildBaseFilters(params, true);
            filters.push('AND', [CONFIG.PROJECT_FIELD, 'anyof', projectId]);

            addCategoryFilter(filters, category);

            const cols = [
                search.createColumn({ name: 'tranid' }),
                search.createColumn({ name: 'trandate', sort: search.Sort.DESC }),
                search.createColumn({ name: 'type' }),
                search.createColumn({ name: 'entity' }),
                search.createColumn({ name: 'memo' }),
                search.createColumn({ name: 'account' }),
                search.createColumn({ name: 'accounttype' }),
                search.createColumn({ name: 'class' }),
                search.createColumn({ name: 'amount' }),
                search.createColumn({ name: 'recordtype' })
            ];

            const s = search.create({
                type: 'transaction',
                filters: filters,
                columns: cols
            });

            const rows = [];
            const paged = s.runPaged({ pageSize: 1000 });

            paged.pageRanges.forEach(function(pr){
                const page = paged.fetch({ index: pr.index });
                page.data.forEach(function(r){
                    const recordType = r.getValue({ name: 'recordtype' }) || 'transaction';
                    const internalId = r.id;

                    rows.push({
                        internalId: internalId,
                        tranId: r.getValue({ name: 'tranid' }) || '',
                        date: normalizeNetSuiteDate(r.getValue({ name: 'trandate' }) || ''),
                        type: r.getText({ name: 'type' }) || '',
                        entity: r.getText({ name: 'entity' }) || '',
                        memo: r.getValue({ name: 'memo' }) || '',
                        account: r.getText({ name: 'account' }) || '',
                        accountType: r.getText({ name: 'accounttype' }) || '',
                        className: r.getText({ name: 'class' }) || '',
                        classId: r.getValue({ name: 'class' }) || '',
                        amount: parseFloat(r.getValue({ name: 'amount' })) || 0,
                        recordType: recordType,
                        url: '/app/accounting/transactions/' + recordType + '.nl?id=' + internalId
                    });
                });
            });

            return rows;
        }

        function buildBaseFilters(params, allowClassSpecific) {
            const filters = [
                ['posting', 'is', 'T'],
                'AND',
                ['accounttype', 'noneof', 'OthCurrAsset', 'FixedAsset', 'OthAsset', 'OthCurrLiab'],
                'AND',
                [CONFIG.PROJECT_FIELD, 'noneof', '@NONE@']
            ];

            const from = params.from || CONFIG.DEFAULT_FROM;
            const to = params.to || CONFIG.DEFAULT_TO;
            const nsFrom = toNsDate(from);
            const nsTo = toNsDate(to);

            if (nsFrom && nsTo) {
                filters.push('AND', ['trandate', 'within', nsFrom, nsTo]);
            }

            if (params.projectId) {
                filters.push('AND', [CONFIG.PROJECT_FIELD, 'anyof', params.projectId]);
            }

            if (params.classId) {
                filters.push('AND', ['class', 'anyof', params.classId]);
            } else if (allowClassSpecific !== false && CONFIG.CLASS_SCOPE_IDS && CONFIG.CLASS_SCOPE_IDS.length) {
                filters.push('AND', ['class', 'anyof'].concat(CONFIG.CLASS_SCOPE_IDS));
            }

            if (params.projMgrId) {
                filters.push('AND', [CONFIG.PROJECT_MANAGER_FIELD, 'anyof', params.projMgrId]);
            }

            return filters;
        }

        function addCategoryFilter(filters, category) {
            if (!category || category === 'all') {
                return;
            }

            if (category === 'income') {
                filters.push('AND', [
                    ['type', 'anyof', 'CustInvc', 'CustCred'],
                    'OR',
                    [
                        ['type', 'anyof', 'Journal'],
                        'AND',
                        ['accounttype', 'anyof', 'Income']
                    ]
                ]);
                return;
            }

            if (category === 'bills') {
                filters.push('AND', ['type', 'anyof', 'VendBill']);
                return;
            }

            if (category === 'billCredit') {
                filters.push('AND', ['type', 'anyof', 'VendCred']);
                return;
            }

            if (category === 'checks') {
                filters.push('AND', ['type', 'anyof', 'Check']);
                return;
            }

            if (category === 'journals') {
                filters.push('AND', [
                    ['type', 'anyof', 'Journal'],
                    'AND',
                    ['accounttype', 'noneof', 'Income']
                ]);
                return;
            }

            if (category === 'creditCard') {
                filters.push('AND', ['type', 'anyof', 'CardChrg', 'CardRfnd']);
            }
        }

        function classify(typeText, accountTypeText) {
            const tp = (typeText || '').toLowerCase();
            const at = (accountTypeText || '').toLowerCase();

            if (tp === 'invoice' || tp === 'credit memo') {
                return 'income';
            }
            if (tp === 'journal' && at === 'income') {
                return 'income';
            }
            if (tp === 'bill') {
                return 'bills';
            }
            if (tp === 'bill credit') {
                return 'billCredit';
            }
            if (tp === 'check') {
                return 'checks';
            }
            if (tp === 'journal' && at !== 'income') {
                return 'journals';
            }
            if (tp === 'credit card') {
                return 'creditCard';
            }
            return 'other';
        }

        function loadAllFilterOptions() {
            const result = {
                projects: [],
                classes: [],
                projectManagers: []
            };

            try {
                search.create({
                    type: 'customrecord_cv_project',
                    filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(function(res){
                    result.projects.push({
                        id: res.id,
                        name: res.getValue({ name: 'name' })
                    });
                    return true;
                });
            } catch (e1) {
                log.debug('project customrecord fallback', e1);
                try {
                    search.create({
                        type: 'job',
                        filters: [['isinactive', 'is', 'F']],
                        columns: [search.createColumn({ name: 'entityid', sort: search.Sort.ASC })]
                    }).run().each(function(res){
                        result.projects.push({
                            id: res.id,
                            name: res.getValue({ name: 'entityid' })
                        });
                        return true;
                    });
                } catch (e2) {
                    log.debug('project job fallback failed', e2);
                }
            }

            try {
                search.create({
                    type: 'classification',
                    filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(function(res){
                    result.classes.push({
                        id: res.id,
                        name: res.getValue({ name: 'name' })
                    });
                    return true;
                });
            } catch (e) {
                log.debug('class options', e);
            }

            try {
                search.create({
                    type: 'employee',
                    filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'entityid', sort: search.Sort.ASC })]
                }).run().each(function(res){
                    result.projectManagers.push({
                        id: res.id,
                        name: res.getValue({ name: 'entityid' })
                    });
                    return true;
                });
            } catch (e) {
                log.debug('project manager options', e);
            }

            return result;
        }

        function writeJson(context, obj) {
            context.response.setHeader({
                name: 'Content-Type',
                value: 'application/json; charset=utf-8'
            });
            context.response.write(JSON.stringify(obj));
        }

        function toNsDate(isoDate) {
            if (!isoDate) return '';
            const parts = String(isoDate).split('-');
            if (parts.length !== 3) return isoDate;
            return parts[1] + '/' + parts[2] + '/' + parts[0];
        }

        function normalizeNetSuiteDate(value) {
            if (!value) return '';
            return String(value);
        }

        function escapeHtml(s) {
            if (s === null || s === undefined) return '';
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function buildErrorPage(e) {
            const msg = escapeHtml(e && (e.message || e.toString()) || 'Unknown error');
            return '<html><body style="font-family:Arial;padding:24px;color:#b91c1c"><h3>Suitelet Error</h3><p>' + msg + '</p></body></html>';
        }

        return { onRequest: onRequest };
    });