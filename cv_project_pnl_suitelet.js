/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Project P&L Dashboard — Light Theme
 * Single search pulls ALL transactions at line level.
 * Client-side: aggregates into P&L summary + instant drill-down.
 * No second server call needed.
 */
define(['N/search', 'N/log', 'N/runtime'],
    (search, log, runtime) => {

        const onRequest = (context) => {
            return renderPage(context);
        };

        const renderPage = (context) => {
            const allTxns = loadAllTransactions();
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

/* MODAL */
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
@media(max-width:900px){.sstrip{grid-template-columns:repeat(2,1fr)}.fbar{padding:10px 16px}.tw,.sstrip{margin-left:16px;margin-right:16px}.hdr{padding:18px 16px}}
</style>
</head>
<body>

<div class="hdr">
  <div><h1><em>&#9632;</em> Project P&amp;L Dashboard</h1><p>All data loaded &middot; Filters apply instantly &middot; Click amounts to drill down</p></div>
  <div class="hdr-b">
    <button class="btn" onclick="exportCSV()">&#11015; Export CSV</button>
    <button class="btn btn-a" onclick="window.location.reload()">&#8635; Refresh Data</button>
  </div>
</div>

<div class="fbar">
  <span class="tag">&#9889; Filters</span>
  <div class="fg"><label>From</label><input type="date" id="fDF" onchange="af()"></div>
  <div class="fg"><label>To</label><input type="date" id="fDT" onchange="af()"></div>
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
        <th data-c="projectName" onclick="srt('projectName')" style="text-align:left">Project <span class="si">&#9650;</span></th>
        <th data-c="income" onclick="srt('income')">Income / Revenue <span class="si">&#9650;</span></th>
        <th data-c="bills" onclick="srt('bills')">Bills <span class="si">&#9650;</span></th>
        <th data-c="billCredit" onclick="srt('billCredit')">Bill Credit <span class="si">&#9650;</span></th>
        <th data-c="checks" onclick="srt('checks')">Checks <span class="si">&#9650;</span></th>
        <th data-c="journals" onclick="srt('journals')">Journals <span class="si">&#9650;</span></th>
        <th data-c="creditCard" onclick="srt('creditCard')">Credit Card <span class="si">&#9650;</span></th>
        <th data-c="margin" onclick="srt('margin')">Net Margin <span class="si">&#9650;</span></th>
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
/* ═══ ALL RAW TRANSACTIONS EMBEDDED ON PAGE LOAD ═══ */
var RAW = ${JSON.stringify(allTxns)};
var FO  = ${JSON.stringify(filterOpts)};
var agg = [], sc = 'margin', sd = -1;

(function(){
  ps('fP',FO.projects||[]);ps('fC',FO.classes||[]);ps('fM',FO.projectManagers||[]);ps('fJ',FO.jobTypes||[]);
  af();
})();

function ps(id,items){var s=document.getElementById(id);items.forEach(function(i){var o=document.createElement('option');o.value=i.id;o.textContent=i.name;s.appendChild(o)})}

/* ═══ CLASSIFY each transaction line ═══ */
function classify(t){
  var tp=t.type,at=t.accountType;
  if(tp==='Invoice'||tp==='Credit Memo')return 'income';
  if(tp==='Journal'&&at==='Income')return 'income';
  if(tp==='Bill')return 'bills';
  if(tp==='Bill Credit')return 'billCredit';
  if(tp==='Check')return 'checks';
  if(tp==='Journal'&&at!=='Income')return 'journals';
  if(tp==='Credit Card')return 'creditCard';
  return 'other';
}

/* ═══ FILTER raw txns + AGGREGATE by project ═══ */
function af(){
  var fp=gv('fP'),fc=gv('fC'),fm_=gv('fM'),fj=gv('fJ'),q=gv('sBox').toLowerCase(),fdf=gv('fDF'),fdt=gv('fDT');

  var filtered=RAW.filter(function(t){
    if(fp&&t.projectId!==fp)return false;
    if(fc&&t.classId!==fc)return false;
    if(fm_&&t.projMgrId&&t.projMgrId!==fm_)return false;
    if(fj&&t.jobTypeId&&t.jobTypeId!==fj)return false;
    if(q&&(t.projectName||'').toLowerCase().indexOf(q)<0)return false;
    if(fdf&&t.date<fdf)return false;
    if(fdt&&t.date>fdt)return false;
    return true;
  });

  var map={};
  filtered.forEach(function(t){
    var pid=t.projectId;
    if(!map[pid])map[pid]={projectId:pid,projectName:t.projectName,income:0,bills:0,billCredit:0,checks:0,journals:0,creditCard:0,margin:0,txns:[]};
    var cat=classify(t),amt=parseFloat(t.amount)||0;
    if(cat==='income')map[pid].income+=amt;
    else if(cat==='bills')map[pid].bills+=amt;
    else if(cat==='billCredit')map[pid].billCredit+=amt;
    else if(cat==='checks')map[pid].checks+=amt;
    else if(cat==='journals')map[pid].journals+=amt;
    else if(cat==='creditCard')map[pid].creditCard+=amt;
    map[pid].txns.push(t);
  });

  agg=Object.keys(map).map(function(k){
    var r=map[k];
    r.margin=r.income-(r.bills+r.billCredit)-r.journals-r.creditCard-r.checks;
    return r;
  });
  ds();rt();rs();
}

function rf(){['fDF','fDT','fP','fC','fM','fJ'].forEach(function(id){document.getElementById(id).value=''});document.getElementById('sBox').value='';af()}
function gv(id){return document.getElementById(id).value}

/* ═══ SORT ═══ */
function srt(col){
  if(sc===col)sd*=-1;else{sc=col;sd=col==='projectName'?1:-1}
  document.querySelectorAll('thead th').forEach(function(th){
    th.classList.toggle('sorted',th.dataset.c===col);
    if(th.dataset.c===col)th.querySelector('.si').innerHTML=sd===1?'&#9650;':'&#9660;';
  });
  ds();rt();
}
function ds(){
  agg.sort(function(a,b){
    var va=a[sc],vb=b[sc];
    if(sc!=='projectName'){va=parseFloat(va)||0;vb=parseFloat(vb)||0}
    else{va=(va||'').toLowerCase();vb=(vb||'').toLowerCase()}
    return va<vb?-sd:va>vb?sd:0;
  });
}

/* ═══ RENDER TABLE ═══ */
function rt(){
  var tb=document.getElementById('tB');
  document.getElementById('rCt').textContent=agg.length+' projects';
  if(!agg.length){tb.innerHTML='<tr><td colspan="8" class="empty">No matching projects found</td></tr>';return}
  var h='',tI=0,tB=0,tBC=0,tCh=0,tJ=0,tCC=0,tM=0;
  agg.forEach(function(r,idx){
    tI+=r.income;tB+=r.bills;tBC+=r.billCredit;tCh+=r.checks;tJ+=r.journals;tCC+=r.creditCard;tM+=r.margin;
    h+='<tr><td>'+esc(r.projectName)+'</td>'
      +atd(r.income,'cg',idx,'income')
      +atd(r.bills,'cr',idx,'bills')
      +atd(r.billCredit,'co',idx,'billCredit')
      +atd(r.checks,'cp',idx,'checks')
      +atd(r.journals,'ct',idx,'journals')
      +atd(r.creditCard,'ck',idx,'creditCard')
      +atd(r.margin,r.margin>=0?'mp':'mn',idx,'all')
      +'</tr>';
  });
  h+='<tr class="tot"><td>TOTAL ('+agg.length+')</td>'
    +'<td><span class="am cg">'+fmn(tI)+'</span></td>'
    +'<td><span class="am cr">'+fmn(tB)+'</span></td>'
    +'<td><span class="am co">'+fmn(tBC)+'</span></td>'
    +'<td><span class="am cp">'+fmn(tCh)+'</span></td>'
    +'<td><span class="am ct">'+fmn(tJ)+'</span></td>'
    +'<td><span class="am ck">'+fmn(tCC)+'</span></td>'
    +'<td><span class="am '+(tM>=0?'mp':'mn')+'">'+fmn(tM)+'</span></td></tr>';
  tb.innerHTML=h;
}

function atd(v,cls,idx,cat){
  if(v===0)return '<td><span class="am z">&mdash;</span></td>';
  return '<td><span class="am '+cls+'" onclick="dd('+idx+',\\''+cat+'\\')">'+fmn(v)+'</span></td>';
}

/* ═══ SUMMARY CARDS ═══ */
function rs(){
  var ti=0,te=0,tm=0;
  agg.forEach(function(r){
    ti+=r.income;
    te+=Math.abs(r.bills)+Math.abs(r.billCredit)+Math.abs(r.checks)+Math.abs(r.journals)+Math.abs(r.creditCard);
    tm+=r.margin;
  });
  document.getElementById('sP').textContent=agg.length;
  document.getElementById('sI').textContent=fmn(ti);
  document.getElementById('sE').textContent=fmn(te);
  var mEl=document.getElementById('sM');
  mEl.textContent=fmn(tm);
  mEl.style.color=tm>=0?'var(--grn)':'var(--red)';
  document.getElementById('sMp').textContent=ti?(((tm/ti)*100).toFixed(1)+'% margin'):'';
}

/* ═══ DRILL DOWN — 100% CLIENT SIDE ═══ */
function dd(idx,cat){
  var row=agg[idx];if(!row)return;
  var txns=row.txns;
  var filtered=cat==='all'?txns:txns.filter(function(t){return classify(t)===cat});

  document.getElementById('ov').classList.add('open');
  var labels={income:'Income / Revenue',bills:'Bills',billCredit:'Bill Credits',checks:'Checks',journals:'Journals',creditCard:'Credit Card',all:'All Transactions'};
  document.getElementById('mT').textContent=(labels[cat]||cat)+' \\u2014 '+row.projectName;
  document.getElementById('mBd').textContent=filtered.length+' transactions';
  document.getElementById('mPr').textContent=row.projectName;

  if(!filtered.length){
    document.getElementById('mB').innerHTML='<div class="empty">No transactions found</div>';
    document.getElementById('mTo').textContent='';return;
  }

  var rows='';
  filtered.forEach(function(t){
    var url='/app/accounting/transactions/'+esc(t.recordType||'transaction')+'.nl?id='+t.internalId;
    rows+='<tr>'
      +'<td><a href="'+url+'" target="_blank">'+esc(t.tranId||t.internalId)+'</a></td>'
      +'<td>'+esc(t.date)+'</td>'
      +'<td>'+esc(t.type)+'</td>'
      +'<td>'+esc(t.entity)+'</td>'
      +'<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">'+esc(t.memo)+'</td>'
      +'<td>'+esc(t.account)+'</td>'
      +'<td>'+esc(t.className)+'</td>'
      +'<td style="text-align:right;font-family:var(--mono);font-weight:600">'+fmn(parseFloat(t.amount)||0)+'</td>'
      +'</tr>';
  });

  document.getElementById('mB').innerHTML='<table><thead><tr>'
    +'<th>Doc #</th><th>Date</th><th>Type</th><th>Entity</th><th>Memo</th><th>Account</th><th>Class</th><th>Dept</th><th style="text-align:right">Amount</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table>';

  var total=filtered.reduce(function(s,t){return s+(parseFloat(t.amount)||0)},0);
  document.getElementById('mTo').innerHTML='Total: <span class="tv">'+fmn(total)+'</span>';
}

function cm(){document.getElementById('ov').classList.remove('open')}
document.addEventListener('keydown',function(e){if(e.key==='Escape')cm()});

/* ═══ EXPORT ═══ */
function exportCSV(){
  if(!agg.length)return;
  var csv='Project,Income,Bills,Bill Credits,Checks,Journals,Credit Card,Net Margin\\n';
  agg.forEach(function(r){csv+='"'+(r.projectName||'').replace(/"/g,'""')+'",'+r.income+','+r.bills+','+r.billCredit+','+r.checks+','+r.journals+','+r.creditCard+','+r.margin+'\\n'});
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='Project_PnL_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

function fmn(n){return(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2})}
function esc(s){if(!s)return '';var d=document.createElement('div');d.textContent=s;return d.innerHTML}
</script>
</body>
</html>`;
            context.response.write(html);
        };

        /* ══════════════════════════════════════════════════════════
           SINGLE SEARCH: pulls ALL transaction lines with details
           ══════════════════════════════════════════════════════════ */
        const loadAllTransactions = () => {
            const results = [];
            try {
                const s = search.create({
                    type: 'transaction',
                    filters: [
                        ['posting', 'is', 'T'], 'AND',
                        ['accounttype', 'noneof', 'OthCurrAsset', 'FixedAsset', 'OthAsset', 'OthCurrLiab'], 'AND',
                        ['class', 'anyof', '1', '2'], 'AND',
                        ['custcol_cv_project', 'noneof', '@NONE@'], 'AND',
                        ['trandate', 'between', '03/01/2026', '04/30/2026']
                    ],
                    columns: [
                        search.createColumn({ name: 'tranid' }),
                        search.createColumn({ name: 'trandate', sort: search.Sort.DESC }),
                        search.createColumn({ name: 'type' }),
                        search.createColumn({ name: 'entity' }),
                        search.createColumn({ name: 'memo' }),
                        search.createColumn({ name: 'account' }),
                        search.createColumn({ name: 'accounttype' }),
                        search.createColumn({ name: 'class' }),
                        search.createColumn({ name: 'amount' }),
                        search.createColumn({ name: 'custcol_cv_project' }),
                        search.createColumn({ name: 'recordtype' }),
                        search.createColumn({ name: 'custbody_cv_projectmgrso' }),
                        search.createColumn({ name: 'location' })
                    ]
                });

                const paged = s.runPaged({ pageSize: 1000 });
                paged.pageRanges.forEach(pr => {
                    paged.fetch({ index: pr.index }).data.forEach(r => {
                        results.push({
                            internalId: r.id,
                            tranId: r.getValue('tranid') || '',
                            date: r.getValue('trandate') || '',
                            type: r.getText('type') || '',
                            entity: r.getText('entity') || '',
                            memo: r.getValue('memo') || '',
                            account: r.getText('account') || '',
                            accountType: r.getText('accounttype') || '',
                            className: r.getText('class') || '',
                            classId: r.getValue('class') || '',
                            amount: r.getValue('amount') || 0,
                            projectId: r.getValue('custcol_cv_project') || '',
                            projectName: r.getText('custcol_cv_project') || '',
                            recordType: r.getValue('recordtype') || 'transaction',
                            projMgrId: r.getValue('custbody_cv_projectmgrso') || ''
                        });
                    });
                });
            } catch (e) {
                log.error('loadAllTransactions', e);
            }
            log.debug('Total transactions loaded', results.length);
            return results;
        };

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
                search.create({ type: 'customlist_cv_jobtype',
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => { r.jobTypes.push({ id: res.id, name: res.getValue('name') }); return true; });
            } catch (e) { log.debug('jt', e); }
            return r;
        };

        return { onRequest };
    });