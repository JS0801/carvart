/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Project P&L Dashboard — V4 (Fast)
 * - Grouped search for summary (small payload, fast load)
 * - Individual transactions fetched ONLY on drill-down click via AJAX
 * - Light theme, instant client-side filtering on summary data
 */
define(['N/search', 'N/log', 'N/runtime', 'N/url'],
    (search, log, runtime, url) => {

        const onRequest = (context) => {
            const action = context.request.parameters.action;

            if (action === 'drilldown') {
                // Return JSON for drill-down
                context.response.setHeader({ name: 'Content-Type', value: 'application/json' });
                return handleDrilldown(context);
            }

            return renderPage(context);
        };

        /* ═══════════════════════════════════════
           MAIN PAGE — grouped data embedded
           ═══════════════════════════════════════ */
        const renderPage = (context) => {
            const scriptUrl = getScriptUrl();
            const reportData = loadGroupedData();
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
html{font-size:14px}body{font-family:var(--ff);background:var(--bg);color:var(--tx);min-height:100vh}
.hdr{padding:22px 32px 18px;background:var(--wh);border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:flex-start;box-shadow:var(--sh)}
.hdr h1{font-size:1.4rem;font-weight:700;letter-spacing:-.4px;color:var(--tx)}.hdr h1 em{font-style:normal;color:var(--acc)}
.hdr p{color:var(--tx2);font-size:.78rem;margin-top:3px}.hdr-b{display:flex;gap:8px}
.btn{font-family:var(--ff);padding:8px 18px;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer;border:1px solid var(--bdr);transition:all .15s;display:inline-flex;align-items:center;gap:6px;background:var(--wh);color:var(--tx2)}
.btn:hover{background:var(--bg2);color:var(--tx);border-color:var(--bdr2)}
.btn-a{background:var(--acc);color:#fff;border-color:var(--acc)}.btn-a:hover{background:#4338ca;box-shadow:0 2px 8px var(--accG)}
.fbar{padding:14px 32px;background:var(--wh);border-bottom:1px solid var(--bdr);display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.fbar .tag{font-size:.68rem;font-weight:700;color:var(--acc);text-transform:uppercase;letter-spacing:1.2px;margin-right:2px;white-space:nowrap}
.fg{position:relative}.fg label{position:absolute;top:-7px;left:10px;font-size:.58rem;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:var(--tx3);background:var(--wh);padding:0 5px;z-index:1}
.fg select,.fg input[type=date]{font-family:var(--ff);padding:9px 12px;padding-top:11px;border:1.5px solid var(--bdr);border-radius:8px;font-size:.76rem;background:var(--wh);color:var(--tx);min-width:152px;transition:border-color .2s}
.fg select:focus,.fg input:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px var(--accG)}
.clr{font-size:.72rem;color:var(--tx3);cursor:pointer;text-decoration:underline;background:0 0;border:0;font-family:var(--ff);margin-left:2px}.clr:hover{color:var(--red)}
.sstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:18px 32px}
.sc{background:var(--wh);border:1px solid var(--bdr);border-radius:var(--rl);padding:18px 20px;position:relative;overflow:hidden;transition:all .15s;box-shadow:var(--sh)}
.sc:hover{box-shadow:var(--sh2);transform:translateY(-1px)}.sc .bar{position:absolute;top:0;left:0;right:0;height:3px}
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
thead th:hover{color:var(--tx)}thead th:first-child{text-align:left;padding-left:20px}
thead th .si{margin-left:3px;opacity:.3;font-size:.6rem}thead th.sorted .si{opacity:1;color:var(--acc)}
tbody tr{border-bottom:1px solid var(--bdr);transition:background .1s}
tbody tr:hover{background:var(--accL)}
tbody td{padding:10px 16px;text-align:right;font-size:.82rem}
tbody td:first-child{text-align:left;padding-left:20px;font-weight:600;color:var(--tx);max-width:280px;overflow:hidden;text-overflow:ellipsis}
.am{display:inline-block;font-family:var(--mono);font-size:.76rem;font-weight:600;padding:5px 12px;border-radius:7px;cursor:pointer;transition:all .15s;border:1px solid transparent;min-width:82px;text-align:right}
.am:hover{transform:scale(1.04);box-shadow:var(--sh)}
.am.z{color:var(--tx3);background:0 0;cursor:default;font-weight:400;opacity:.5}.am.z:hover{transform:none;box-shadow:none}
.am.cg{color:var(--grn);background:var(--grnBg);border-color:var(--grnB)}.am.cg:hover{box-shadow:0 2px 8px rgba(5,150,105,.2)}
.am.cr{color:var(--red);background:var(--redBg);border-color:var(--redB)}.am.cr:hover{box-shadow:0 2px 8px rgba(220,38,38,.2)}
.am.co{color:var(--org);background:var(--orgBg);border-color:var(--orgB)}.am.co:hover{box-shadow:0 2px 8px rgba(217,119,6,.2)}
.am.cp{color:var(--pur);background:var(--purBg);border-color:var(--purB)}.am.cp:hover{box-shadow:0 2px 8px rgba(124,58,237,.2)}
.am.ct{color:var(--tel);background:var(--telBg);border-color:var(--telB)}.am.ct:hover{box-shadow:0 2px 8px rgba(13,148,136,.2)}
.am.ck{color:var(--pnk);background:var(--pnkBg);border-color:var(--pnkB)}.am.ck:hover{box-shadow:0 2px 8px rgba(219,39,119,.2)}
.am.mp{color:var(--grn);background:var(--grnBg);border-color:var(--grnB)}
.am.mn{color:var(--red);background:var(--redBg);border-color:var(--redB)}
tbody tr.tot{background:var(--bg2);border-top:2px solid var(--acc)}tbody tr.tot td{font-weight:700;padding:14px 16px}tbody tr.tot td:first-child{color:var(--acc)}
.mo{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.35);backdrop-filter:blur(4px);justify-content:center;align-items:center;padding:24px}
.mo.open{display:flex}
.mdl{background:var(--wh);border:1px solid var(--bdr);border-radius:var(--rl);width:100%;max-width:1250px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,.15);animation:mi .2s ease}
@keyframes mi{from{opacity:0;transform:translateY(12px) scale(.98)}}
.mhd{padding:16px 24px;border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center;background:var(--bg2);border-radius:var(--rl) var(--rl) 0 0}
.mhd h3{font-size:.95rem;font-weight:700;display:flex;align-items:center;gap:10px;color:var(--tx)}
.mhd .badge{font-size:.66rem;padding:3px 10px;border-radius:20px;font-weight:600;font-family:var(--mono);background:var(--accL);color:var(--acc)}
.mx{width:32px;height:32px;border-radius:8px;border:1px solid var(--bdr);background:var(--wh);color:var(--tx3);cursor:pointer;font-size:.95rem;display:flex;align-items:center;justify-content:center;transition:all .15s}
.mx:hover{background:var(--redBg);color:var(--red);border-color:var(--red)}
.mbd{overflow:auto;flex:1}
.mbd table{width:100%}
.mbd thead th{font-size:.6rem;padding:10px 14px;background:var(--bg);text-align:left}
.mbd tbody td{padding:9px 14px;font-size:.76rem;text-align:left;border-bottom:1px solid var(--bdr)}
.mbd tbody td:last-child{text-align:right}
.mbd tbody tr:hover{background:var(--accL)}
.mbd a{color:var(--acc);text-decoration:none;font-weight:600}.mbd a:hover{text-decoration:underline}
.mft{padding:14px 24px;border-top:1px solid var(--bdr);display:flex;justify-content:space-between;font-size:.75rem;color:var(--tx2);font-family:var(--mono);background:var(--bg2);border-radius:0 0 var(--rl) var(--rl)}
.mft .tv{font-weight:700;color:var(--tx);font-size:.85rem}
.empty{text-align:center;padding:50px;color:var(--tx3);font-size:.85rem}
.ld{display:flex;flex-direction:column;align-items:center;padding:50px;gap:14px}
.ldr{width:34px;height:34px;border:3px solid var(--bdr);border-top-color:var(--acc);border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}.ld span{color:var(--tx2);font-size:.8rem}
@media(max-width:900px){.sstrip{grid-template-columns:repeat(2,1fr)}.fbar{padding:10px 16px}.tw,.sstrip{margin-left:16px;margin-right:16px}.hdr{padding:18px 16px}}
</style>
</head>
<body>

<div class="hdr">
  <div><h1><em>&#9632;</em> Project P&amp;L Dashboard</h1><p>Filters apply instantly &middot; Click amounts to drill down into transactions</p></div>
  <div class="hdr-b">
    <button class="btn" onclick="exportCSV()">&#11015; Export CSV</button>
    <button class="btn btn-a" onclick="window.location.reload()">&#8635; Refresh</button>
  </div>
</div>

<div class="fbar">
  <span class="tag">&#9889; Filters</span>
  <div class="fg"><label>Project</label><select id="fP" onchange="af()"><option value="">All Projects</option></select></div>
  <div class="fg"><label>Class</label><select id="fC" onchange="af()"><option value="">All Classes</option></select></div>
  <div class="fg"><label>Project Mgr</label><select id="fM" onchange="af()"><option value="">All Managers</option></select></div>
  <div class="fg"><label>Job Type</label><select id="fJ" onchange="af()"><option value="">All Types</option></select></div>
  <button class="clr" onclick="rf()">&#10005; Clear all</button>
</div>

<div class="sstrip">
  <div class="sc sp"><div class="bar"></div><div class="lb">Projects</div><div class="vl" id="sP">0</div><div class="sb">Matching filters</div></div>
  <div class="sc si"><div class="bar"></div><div class="lb">Total Income</div><div class="vl" id="sI">$0</div><div class="sb">Invoices, Credits, Journals</div></div>
  <div class="sc se"><div class="bar"></div><div class="lb">Total Costs</div><div class="vl" id="sE">$0</div><div class="sb">Bills, Checks, CC, Journals</div></div>
  <div class="sc sm"><div class="bar"></div><div class="lb">Net Margin</div><div class="vl" id="sM">$0</div><div class="sb" id="sMp"></div></div>
</div>

<div class="tw">
  <div class="ttb">
    <input class="sbox" type="text" id="sBox" placeholder="&#128269; Search projects..." oninput="af()">
    <span class="ct" id="rCt">0 projects</span>
  </div>
  <div class="ts">
    <table>
      <thead><tr>
        <th data-c="projectName" onclick="doSort('projectName')" style="text-align:left">Project <span class="si">&#9650;</span></th>
        <th data-c="income" onclick="doSort('income')">Income / Revenue <span class="si">&#9650;</span></th>
        <th data-c="bills" onclick="doSort('bills')">Bills <span class="si">&#9650;</span></th>
        <th data-c="billCredit" onclick="doSort('billCredit')">Bill Credit <span class="si">&#9650;</span></th>
        <th data-c="checks" onclick="doSort('checks')">Checks <span class="si">&#9650;</span></th>
        <th data-c="journals" onclick="doSort('journals')">Journals <span class="si">&#9650;</span></th>
        <th data-c="creditCard" onclick="doSort('creditCard')">Credit Card <span class="si">&#9650;</span></th>
        <th data-c="margin" onclick="doSort('margin')">Net Margin <span class="si">&#9650;</span></th>
      </tr></thead>
      <tbody id="tB"></tbody>
    </table>
  </div>
</div>

<div class="mo" id="ov" onclick="if(event.target===this)cm()">
  <div class="mdl">
    <div class="mhd"><h3><span id="mT">Transactions</span><span class="badge" id="mBd">0</span></h3><button class="mx" onclick="cm()">&#10005;</button></div>
    <div class="mbd" id="mB"></div>
    <div class="mft"><span id="mTo"></span><span id="mPr"></span></div>
  </div>
</div>

<script>
/* ═══ EMBEDDED: grouped summary (tiny payload) + filter options ═══ */
var ALL = ${JSON.stringify(reportData)};
var FO  = ${JSON.stringify(filterOpts)};
var SU  = '${scriptUrl}';

var filtered = [], sortCol = 'margin', sortDir = -1;

(function(){
  ps('fP',FO.projects||[]);
  ps('fC',FO.classes||[]);
  ps('fM',FO.projectManagers||[]);
  ps('fJ',FO.jobTypes||[]);
  af();
})();

function ps(id,items){
  var s=document.getElementById(id);
  items.forEach(function(i){var o=document.createElement('option');o.value=i.id;o.textContent=i.name;s.appendChild(o)});
}
function gv(id){return document.getElementById(id).value}

/* ═══ FILTER (client-side on summary data) ═══ */
function af(){
  var fp=gv('fP'),fc=gv('fC'),fm=gv('fM'),fj=gv('fJ'),q=gv('sBox').toLowerCase();
  filtered=ALL.filter(function(r){
    if(fp&&r.projectId!==fp)return false;
    if(fc&&r.classId&&r.classId!==fc)return false;
    if(fm&&r.projMgrId&&r.projMgrId!==fm)return false;
    if(fj&&r.jobTypeId&&r.jobTypeId!==fj)return false;
    if(q&&(r.projectName||'').toLowerCase().indexOf(q)<0)return false;
    return true;
  });
  applySort();renderTable();renderSummary();
}
function rf(){
  ['fP','fC','fM','fJ'].forEach(function(id){document.getElementById(id).value=''});
  document.getElementById('sBox').value='';af();
}

/* ═══ SORT ═══ */
function doSort(col){
  if(sortCol===col)sortDir*=-1;else{sortCol=col;sortDir=col==='projectName'?1:-1}
  document.querySelectorAll('thead th').forEach(function(th){
    th.classList.toggle('sorted',th.dataset.c===col);
    if(th.dataset.c===col)th.querySelector('.si').innerHTML=sortDir===1?'&#9650;':'&#9660;';
  });
  applySort();renderTable();
}
function applySort(){
  filtered.sort(function(a,b){
    var va=a[sortCol],vb=b[sortCol];
    if(sortCol!=='projectName'){va=pf(va);vb=pf(vb)}
    else{va=(va||'').toLowerCase();vb=(vb||'').toLowerCase()}
    return va<vb?-sortDir:va>vb?sortDir:0;
  });
}

/* ═══ RENDER TABLE ═══ */
function renderTable(){
  var tb=document.getElementById('tB');
  document.getElementById('rCt').textContent=filtered.length+' projects';
  if(!filtered.length){tb.innerHTML='<tr><td colspan="8" class="empty">No matching projects found</td></tr>';return}
  var h='',tI=0,tB=0,tBC=0,tCh=0,tJ=0,tCC=0,tM=0;
  filtered.forEach(function(r){
    var i=pf(r.income),b=pf(r.bills),bc=pf(r.billCredit),ch=pf(r.checks),jo=pf(r.journals),cc=pf(r.creditCard),mg=pf(r.margin);
    tI+=i;tB+=b;tBC+=bc;tCh+=ch;tJ+=jo;tCC+=cc;tM+=mg;
    h+='<tr><td>'+esc(r.projectName)+'</td>'
      +amtCell(i,'cg',r.projectId,'Income')
      +amtCell(b,'cr',r.projectId,'Bills')
      +amtCell(bc,'co',r.projectId,'BillCredit')
      +amtCell(ch,'cp',r.projectId,'Checks')
      +amtCell(jo,'ct',r.projectId,'Journals')
      +amtCell(cc,'ck',r.projectId,'CreditCard')
      +amtCell(mg,mg>=0?'mp':'mn',r.projectId,'All')
      +'</tr>';
  });
  h+='<tr class="tot"><td>TOTAL ('+filtered.length+')</td>'
    +'<td><span class="am cg">'+$(tI)+'</span></td>'
    +'<td><span class="am cr">'+$(tB)+'</span></td>'
    +'<td><span class="am co">'+$(tBC)+'</span></td>'
    +'<td><span class="am cp">'+$(tCh)+'</span></td>'
    +'<td><span class="am ct">'+$(tJ)+'</span></td>'
    +'<td><span class="am ck">'+$(tCC)+'</span></td>'
    +'<td><span class="am '+(tM>=0?'mp':'mn')+'">'+$(tM)+'</span></td></tr>';
  tb.innerHTML=h;
}
function amtCell(v,cls,pid,type){
  if(v===0)return '<td><span class="am z">&mdash;</span></td>';
  return "<td><span class='am "+cls+"' onclick=\"dd('"+pid+"','"+type+"')\">"+$(v)+"</span></td>";
}

/* ═══ SUMMARY ═══ */
function renderSummary(){
  var ti=0,te=0,tm=0;
  filtered.forEach(function(r){
    ti+=pf(r.income);
    te+=Math.abs(pf(r.bills))+Math.abs(pf(r.billCredit))+Math.abs(pf(r.checks))+Math.abs(pf(r.journals))+Math.abs(pf(r.creditCard));
    tm+=pf(r.margin);
  });
  document.getElementById('sP').textContent=filtered.length;
  document.getElementById('sI').textContent=$(ti);
  document.getElementById('sE').textContent=$(te);
  var mEl=document.getElementById('sM');
  mEl.textContent=$(tm);mEl.style.color=tm>=0?'var(--grn)':'var(--red)';
  document.getElementById('sMp').textContent=ti?(((tm/ti)*100).toFixed(1)+'% margin'):'';
}

/* ═══════════════════════════════════════════════
   DRILL DOWN — AJAX call to fetch transactions
   ═══════════════════════════════════════════════ */
function dd(projectId,type){
  document.getElementById('ov').classList.add('open');
  document.getElementById('mB').innerHTML='<div class="ld"><div class="ldr"></div><span>Loading transactions...</span></div>';
  var projName=(ALL.find(function(d){return d.projectId===projectId})||{}).projectName||'';
  var labels={Income:'Income / Revenue',Bills:'Bills',BillCredit:'Bill Credits',Checks:'Checks',Journals:'Journals',CreditCard:'Credit Card',All:'All Transactions'};
  document.getElementById('mT').textContent=(labels[type]||type)+' \\u2014 '+projName;
  document.getElementById('mPr').textContent=projName;
  document.getElementById('mBd').textContent='...';
  document.getElementById('mTo').textContent='';

  var drillUrl=SU+'&action=drilldown&projectId='+encodeURIComponent(projectId)+'&type='+encodeURIComponent(type)+'&classId='+encodeURIComponent(gv('fC'));

  fetch(drillUrl)
    .then(function(resp){
      if(!resp.ok)throw new Error('HTTP '+resp.status);
      return resp.json();
    })
    .then(function(data){
      renderModal(data);
    })
    .catch(function(e){
      document.getElementById('mB').innerHTML='<div class="ld"><span style="color:var(--red)">Error loading: '+esc(e.message)+'</span></div>';
    });
}

function renderModal(data){
  document.getElementById('mBd').textContent=data.length+' transactions';
  if(!data.length){
    document.getElementById('mB').innerHTML='<div class="empty">No transactions found for this selection</div>';
    document.getElementById('mTo').textContent='';
    return;
  }
  var rows='';
  data.forEach(function(t){
    var recType=t.recordType||'transaction';
    var nsUrl='/app/accounting/transactions/'+esc(recType)+'.nl?id='+t.id;
    rows+='<tr>'
      +'<td><a href="'+nsUrl+'" target="_blank">'+esc(t.tranId||t.id)+'</a></td>'
      +'<td>'+esc(t.date)+'</td>'
      +'<td>'+esc(t.type)+'</td>'
      +'<td>'+esc(t.entity)+'</td>'
      +'<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(t.memo)+'</td>'
      +'<td>'+esc(t.account)+'</td>'
      +'<td>'+esc(t.className)+'</td>'
      +'<td>'+esc(t.department)+'</td>'
      +'<td style="text-align:right;font-family:var(--mono);font-weight:600">'+$(pf(t.amount))+'</td>'
      +'</tr>';
  });
  document.getElementById('mB').innerHTML='<table><thead><tr>'
    +'<th>Doc #</th><th>Date</th><th>Type</th><th>Entity</th><th>Memo</th><th>Account</th><th>Class</th><th>Dept</th><th style="text-align:right">Amount</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table>';
  var total=data.reduce(function(s,t){return s+pf(t.amount)},0);
  document.getElementById('mTo').innerHTML='Total: <span class="tv">'+$(total)+'</span>';
}

function cm(){document.getElementById('ov').classList.remove('open')}
document.addEventListener('keydown',function(e){if(e.key==='Escape')cm()});

/* ═══ EXPORT ═══ */
function exportCSV(){
  if(!filtered.length)return;
  var csv='Project,Income,Bills,Bill Credits,Checks,Journals,Credit Card,Net Margin\\n';
  filtered.forEach(function(r){csv+='"'+(r.projectName||'').replace(/"/g,'""')+'",'+pf(r.income)+','+pf(r.bills)+','+pf(r.billCredit)+','+pf(r.checks)+','+pf(r.journals)+','+pf(r.creditCard)+','+pf(r.margin)+'\\n'});
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='Project_PnL_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

/* ═══ UTILS ═══ */
function pf(v){return parseFloat(v)||0}
function $(n){return(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2})}
function esc(s){if(!s)return '';var d=document.createElement('div');d.textContent=s;return d.innerHTML}
</script>
</body>
</html>`;
            context.response.write(html);
        };

        /* ═════════════════════════════════════════════════════
           GROUPED SEARCH — small, fast payload for summary
           ═════════════════════════════════════════════════════ */
        const loadGroupedData = () => {
            const results = [];
            try {
                const s = search.create({
                    type: 'transaction',
                    filters: [
                        ['posting', 'is', 'T'], 'AND',
                        ['accounttype', 'noneof', 'OthCurrAsset', 'FixedAsset', 'OthAsset', 'OthCurrLiab'], 'AND',
                        ['class', 'anyof', '1', '2'], 'AND',
                        ['custcol_cv_project', 'noneof', '@NONE@']
                    ],
                    columns: [
                        search.createColumn({ name: 'custcol_cv_project', summary: 'GROUP' }),
                        search.createColumn({ name: 'formulanumeric', summary: 'SUM',
                            formula: "case when {type} in ('Invoice','Credit Memo') then {amount} when {type} = 'Journal' AND {accounttype} = 'Income' then {amount} else 0 end" }),
                        search.createColumn({ name: 'formulanumeric', summary: 'SUM',
                            formula: "case when {type} = 'Bill' then {amount} else 0 end" }),
                        search.createColumn({ name: 'formulanumeric', summary: 'SUM',
                            formula: "case when {type} = 'Bill Credit' then {amount} else 0 end" }),
                        search.createColumn({ name: 'formulanumeric', summary: 'SUM',
                            formula: "case when {type} = 'Check' then {amount} else 0 end" }),
                        search.createColumn({ name: 'formulanumeric', summary: 'SUM',
                            formula: "case when {type} = 'Journal' AND {accounttype} != 'Income' then {amount} else 0 end" }),
                        search.createColumn({ name: 'formulanumeric', summary: 'SUM',
                            formula: "case when {type} = 'Credit Card' then {amount} else 0 end" }),
                        search.createColumn({ name: 'formulanumeric', summary: 'SUM',
                            formula: "(case when {type} in ('Invoice','Credit Memo') then {amount} when {type} = 'Journal' AND {accounttype} = 'Income' then {amount} else 0 end) - ((case when {type} = 'Bill' then {amount} else 0 end) + case when {type} = 'Bill Credit' then {amount} else 0 end ) - (case when {type} = 'Journal' AND {accounttype} != 'Income' then {amount} else 0 end) - (case when {type} = 'Credit Card' then {amount} else 0 end) - (case when {type} = 'Check' then {amount} else 0 end)" })
                    ]
                });
                const paged = s.runPaged({ pageSize: 1000 });
                paged.pageRanges.forEach(pr => {
                    paged.fetch({ index: pr.index }).data.forEach(r => {
                        const c = r.columns;
                        results.push({
                            projectId: r.getValue(c[0]) || '',
                            projectName: r.getText(c[0]) || '',
                            income: r.getValue(c[1]) || 0,
                            bills: r.getValue(c[2]) || 0,
                            billCredit: r.getValue(c[3]) || 0,
                            checks: r.getValue(c[4]) || 0,
                            journals: r.getValue(c[5]) || 0,
                            creditCard: r.getValue(c[6]) || 0,
                            margin: r.getValue(c[7]) || 0
                        });
                    });
                });
            } catch (e) { log.error('loadGroupedData', e); }
            log.debug('Grouped rows', results.length);
            return results;
        };

        /* ═════════════════════════════════════════════════════
           DRILL-DOWN HANDLER — fetches individual transactions
           ═════════════════════════════════════════════════════ */
        const handleDrilldown = (context) => {
            const p = context.request.parameters;
            const projectId = p.projectId;
            const type = p.type;

            const filters = [
                ['posting', 'is', 'T'], 'AND',
                ['accounttype', 'noneof', 'OthCurrAsset', 'FixedAsset', 'OthAsset', 'OthCurrLiab'], 'AND',
                ['custcol_cv_project', 'anyof', projectId]
            ];

            // Class filter
            if (p.classId) {
                filters.push('AND', ['class', 'anyof', p.classId]);
            } else {
                filters.push('AND', ['class', 'anyof', '1', '2']);
            }

            // Type-specific filters
            if (type === 'Income') {
                filters.push('AND', [
                    [['type', 'anyof', 'CustInvc', 'CustCred']],
                    'OR',
                    [['type', 'anyof', 'Journal'], 'AND', ['accounttype', 'anyof', 'Income']]
                ]);
            } else if (type === 'Bills') {
                filters.push('AND', ['type', 'anyof', 'VendBill']);
            } else if (type === 'BillCredit') {
                filters.push('AND', ['type', 'anyof', 'VendCred']);
            } else if (type === 'Checks') {
                filters.push('AND', ['type', 'anyof', 'Check']);
            } else if (type === 'Journals') {
                filters.push('AND', ['type', 'anyof', 'Journal']);
                filters.push('AND', ['accounttype', 'noneof', 'Income']);
            } else if (type === 'CreditCard') {
                filters.push('AND', ['type', 'anyof', 'CardChrg']);
            }
            // 'All' = no additional type filter

            const results = [];
            try {
                const txnSearch = search.create({
                    type: 'transaction',
                    filters: filters,
                    columns: [
                        search.createColumn({ name: 'tranid', sort: search.Sort.DESC }),
                        search.createColumn({ name: 'trandate' }),
                        search.createColumn({ name: 'type' }),
                        search.createColumn({ name: 'entity' }),
                        search.createColumn({ name: 'memo' }),
                        search.createColumn({ name: 'account' }),
                        search.createColumn({ name: 'class' }),
                        search.createColumn({ name: 'department' }),
                        search.createColumn({ name: 'amount' }),
                        search.createColumn({ name: 'recordtype' }),
                        search.createColumn({ name: 'custcol_cv_project' }),
                        search.createColumn({ name: 'debitamount' }),
                        search.createColumn({ name: 'creditamount' }),
                        search.createColumn({ name: 'location' })
                    ]
                });

                const paged = txnSearch.runPaged({ pageSize: 1000 });
                paged.pageRanges.forEach(pr => {
                    paged.fetch({ index: pr.index }).data.forEach(r => {
                        results.push({
                            id: r.id,
                            tranId: r.getValue('tranid') || '',
                            date: r.getValue('trandate') || '',
                            type: r.getText('type') || '',
                            entity: r.getText('entity') || '',
                            memo: r.getValue('memo') || '',
                            account: r.getText('account') || '',
                            className: r.getText('class') || '',
                            department: r.getText('department') || '',
                            amount: r.getValue('amount') || 0,
                            recordType: r.getValue('recordtype') || 'transaction'
                        });
                    });
                });
            } catch (e) {
                log.error('handleDrilldown', e);
            }

            log.debug('Drilldown results', 'Project=' + projectId + ' Type=' + type + ' Count=' + results.length);
            context.response.write(JSON.stringify(results));
        };

        /* ═══════ FILTER OPTIONS ═══════ */
        const loadAllFilterOptions = () => {
            const r = { projects: [], classes: [], projectManagers: [], jobTypes: [] };
            try {
                search.create({ type: 'customrecord_cv_project', filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => { r.projects.push({ id: res.id, name: res.getValue('name') }); return true; });
            } catch (e) {
                try {
                    search.create({ type: 'job', filters: [['isinactive', 'is', 'F']],
                        columns: [search.createColumn({ name: 'entityid', sort: search.Sort.ASC })]
                    }).run().each(res => { r.projects.push({ id: res.id, name: res.getValue('entityid') }); return true; });
                } catch (e2) { log.debug('proj', e2); }
            }
            try {
                search.create({ type: 'classification', filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => { r.classes.push({ id: res.id, name: res.getValue('name') }); return true; });
            } catch (e) { log.debug('cls', e); }
            try {
                search.create({ type: 'employee', filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'entityid', sort: search.Sort.ASC })]
                }).run().each(res => { r.projectManagers.push({ id: res.id, name: res.getValue('entityid') }); return true; });
            } catch (e) { log.debug('pm', e); }
            try {
                search.create({ type: 'customlist_job_type',
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => { r.jobTypes.push({ id: res.id, name: res.getValue('name') }); return true; });
            } catch (e) { log.debug('jt', e); }
            return r;
        };

        const getScriptUrl = () => {
            const script = runtime.getCurrentScript();
            return '/app/site/hosting/scriptlet.nl?script=' + script.id + '&deploy=' + script.deploymentId;
        };

        return { onRequest };
    });