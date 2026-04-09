/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/file', 'N/log'],
    (search, file, log) => {

        const FOLDER_ID = 13983;

        const onRequest = (context) => {
            return renderPage(context);
        };

        const renderPage = (context) => {
            let meta = null;
            let chunks = [];
            let gen = 0;
            let loadError = '';

            try {
                // Step 1: Read the generation pointer
                gen = readCurrentGen();

                if (gen > 0) {
                    // Step 2: Load all files for this generation
                    const fileMap = loadGenFiles(gen);

                    // Step 3: Parse meta
                    const metaKey = 'pnl_v' + gen + '_meta.json';
                    if (fileMap[metaKey]) {
                        const f = file.load({ id: fileMap[metaKey] });
                        meta = JSON.parse(f.getContents());
                    }

                    // Step 4: Parse chunks in order
                    if (meta) {
                        for (let i = 0; i < meta.chunks; i++) {
                            const chunkKey = 'pnl_v' + gen + '_chunk_' + i + '.json';
                            if (fileMap[chunkKey]) {
                                const cf = file.load({ id: fileMap[chunkKey] });
                                chunks.push(cf.getContents());
                            } else {
                                loadError = 'Missing chunk file: ' + chunkKey;
                                log.error('Suitelet', loadError);
                            }
                        }
                    }
                }
            } catch (e) {
                loadError = e.message;
                log.error('Suitelet', 'Load error: ' + e.message);
            }

            const metaJson = meta
    ? JSON.stringify({ generatedAt: meta.generatedAt, count: meta.count, filterOptions: meta.filterOptions, chunks: meta.chunks, gen: meta.gen, compressed: meta.compressed })
    : 'null';
            const chunksJs = chunks.length ? chunks.join(',') : '';

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
  --bg:#f4f6f9;--wh:#fff;--bg2:#eef0f4;
  --bdr:#e0e3ea;--bdr2:#cdd1da;
  --tx:#1a1d26;--tx2:#555a6e;--tx3:#8b90a0;
  --acc:#4f46e5;--accL:#eef2ff;--accG:rgba(79,70,229,.1);
  --grn:#059669;--grnBg:#ecfdf5;--grnB:#a7f3d0;
  --red:#dc2626;--redBg:#fef2f2;--redB:#fecaca;
  --org:#d97706;--orgBg:#fffbeb;--orgB:#fde68a;
  --pur:#7c3aed;--purBg:#f5f3ff;--purB:#ddd6fe;
  --tel:#0d9488;--telBg:#f0fdfa;--telB:#99f6e4;
  --pnk:#db2777;--pnkBg:#fdf2f8;--pnkB:#fbcfe8;
  --r:10px;--rl:14px;
  --ff:'DM Sans',system-ui,sans-serif;--mono:'JetBrains Mono',monospace;
  --sh:0 1px 3px rgba(0,0,0,.05),0 1px 2px rgba(0,0,0,.03);
  --sh2:0 4px 16px rgba(0,0,0,.07);
}
html{font-size:14px}body{font-family:var(--ff);background:var(--bg);color:var(--tx);min-height:100vh}
.hdr{padding:20px 32px 16px;background:var(--wh);border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:flex-start;box-shadow:var(--sh)}
.hdr h1{font-size:1.35rem;font-weight:700;letter-spacing:-.4px}.hdr h1 em{font-style:normal;color:var(--acc)}
.hdr p{color:var(--tx2);font-size:.76rem;margin-top:3px}
.hdr .meta{font-size:.68rem;color:var(--tx3);margin-top:2px;font-family:var(--mono)}
.hdr-b{display:flex;gap:8px}
.btn{font-family:var(--ff);padding:8px 16px;border-radius:8px;font-size:.76rem;font-weight:600;cursor:pointer;border:1px solid var(--bdr);transition:all .15s;display:inline-flex;align-items:center;gap:5px;background:var(--wh);color:var(--tx2)}
.btn:hover{background:var(--bg2);color:var(--tx);border-color:var(--bdr2)}
.btn-a{background:var(--acc);color:#fff;border-color:var(--acc)}.btn-a:hover{background:#4338ca}
.fbar{padding:12px 32px;background:var(--wh);border-bottom:1px solid var(--bdr);display:flex;align-items:center;gap:11px;flex-wrap:wrap}
.fbar .tag{font-size:.66rem;font-weight:700;color:var(--acc);text-transform:uppercase;letter-spacing:1.1px;white-space:nowrap}
.fg{position:relative}.fg label{position:absolute;top:-7px;left:10px;font-size:.56rem;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:var(--tx3);background:var(--wh);padding:0 5px;z-index:1}
.fg select,.fg input[type=date]{font-family:var(--ff);padding:8px 11px;padding-top:10px;border:1.5px solid var(--bdr);border-radius:8px;font-size:.74rem;background:var(--wh);color:var(--tx);min-width:148px;transition:border-color .2s}
.fg select:focus,.fg input:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px var(--accG)}
.clr{font-size:.7rem;color:var(--tx3);cursor:pointer;text-decoration:underline;background:0 0;border:0;font-family:var(--ff)}.clr:hover{color:var(--red)}
.sstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px 32px}
.sc{background:var(--wh);border:1px solid var(--bdr);border-radius:var(--rl);padding:16px 18px;position:relative;overflow:hidden;transition:all .15s;box-shadow:var(--sh)}
.sc:hover{box-shadow:var(--sh2);transform:translateY(-1px)}
.sc .bar{position:absolute;top:0;left:0;right:0;height:3px}
.sc .lb{font-size:.66rem;font-weight:600;text-transform:uppercase;letter-spacing:.9px;color:var(--tx3);margin-bottom:6px}
.sc .vl{font-family:var(--mono);font-size:1.3rem;font-weight:600}
.sc .sb{font-size:.68rem;color:var(--tx3);margin-top:4px}
.sc.si .bar{background:var(--grn)}.sc.si .vl{color:var(--grn)}
.sc.se .bar{background:var(--red)}.sc.se .vl{color:var(--red)}
.sc.sm .bar{background:var(--acc)}.sc.sm .vl{color:var(--acc)}
.sc.sp .bar{background:var(--org)}.sc.sp .vl{color:var(--org)}
.tw{margin:0 32px 32px;border-radius:var(--rl);overflow:hidden;border:1px solid var(--bdr);background:var(--wh);box-shadow:var(--sh)}
.ttb{padding:10px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--bdr)}
.ttb .ct{font-size:.7rem;color:var(--tx3);font-family:var(--mono)}
.sbox{font-family:var(--ff);padding:7px 13px;border-radius:8px;border:1.5px solid var(--bdr);background:var(--wh);color:var(--tx);font-size:.76rem;width:230px;transition:border-color .2s}
.sbox:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px var(--accG)}
.ts{overflow-x:auto;max-height:62vh;overflow-y:auto}
table{width:100%;border-collapse:collapse;}
thead{position:sticky;top:0;z-index:5}
thead th{padding:10px 14px;text-align:right;font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--tx3);background:var(--bg2);border-bottom:2px solid var(--bdr);cursor:pointer;user-select:none;transition:color .15s}
thead th:hover{color:var(--tx)}thead th:first-child{text-align:left;padding-left:18px}
thead th .si{margin-left:3px;opacity:.3;font-size:.58rem}thead th.sorted .si{opacity:1;color:var(--acc)}
tbody tr{border-bottom:1px solid var(--bdr);transition:background .1s}tbody tr:hover{background:var(--accL)}
tbody td{padding:9px 14px;text-align:right;font-size:.8rem}
tbody td:first-child{text-align:left;padding-left:18px;font-weight:600;color:var(--tx);max-width:260px;white-space:normal;word-break:break-word;overflow-wrap:anywhere}
.am{display:inline-block;font-family:var(--mono);font-size:.74rem;font-weight:600;padding:4px 11px;border-radius:6px;cursor:pointer;transition:all .15s;border:1px solid transparent;min-width:80px;text-align:right}
.am:hover{transform:scale(1.04);box-shadow:var(--sh)}
.am.z{color:var(--tx3);background:0 0;cursor:default;font-weight:400;opacity:.4}.am.z:hover{transform:none;box-shadow:none}
.am.cg{color:var(--grn);background:var(--grnBg);border-color:var(--grnB)}.am.cg:hover{box-shadow:0 2px 8px rgba(5,150,105,.15)}
.am.cr{color:var(--red);background:var(--redBg);border-color:var(--redB)}.am.cr:hover{box-shadow:0 2px 8px rgba(220,38,38,.15)}
.am.co{color:var(--org);background:var(--orgBg);border-color:var(--orgB)}.am.co:hover{box-shadow:0 2px 8px rgba(217,119,6,.15)}
.am.cp{color:var(--pur);background:var(--purBg);border-color:var(--purB)}.am.cp:hover{box-shadow:0 2px 8px rgba(124,58,237,.15)}
.am.ct{color:var(--tel);background:var(--telBg);border-color:var(--telB)}.am.ct:hover{box-shadow:0 2px 8px rgba(13,148,136,.15)}
.am.ck{color:var(--pnk);background:var(--pnkBg);border-color:var(--pnkB)}.am.ck:hover{box-shadow:0 2px 8px rgba(219,39,119,.15)}
.am.mp{color:var(--grn);background:var(--grnBg);border-color:var(--grnB)}
.am.mn{color:var(--red);background:var(--redBg);border-color:var(--redB)}
tbody tr.tot{background:var(--bg2);border-top:2px solid var(--acc)}tbody tr.tot td{font-weight:700;padding:13px 14px}tbody tr.tot td:first-child{color:var(--acc)}
.mo{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.3);backdrop-filter:blur(3px);justify-content:center;align-items:center;padding:20px}
.mo.open{display:flex}
.mdl{background:var(--wh);border:1px solid var(--bdr);border-radius:var(--rl);width:100%;max-width:1250px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.12);animation:mi .2s ease}
@keyframes mi{from{opacity:0;transform:translateY(10px) scale(.98)}}
.mhd{padding:14px 22px;border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center;background:var(--bg2);border-radius:var(--rl) var(--rl) 0 0}
.mhd h3{font-size:.92rem;font-weight:700;display:flex;align-items:center;gap:10px}
.mhd .badge{font-size:.64rem;padding:3px 10px;border-radius:20px;font-weight:600;font-family:var(--mono);background:var(--accL);color:var(--acc)}
.mx{width:30px;height:30px;border-radius:8px;border:1px solid var(--bdr);background:var(--wh);color:var(--tx3);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;transition:all .15s}
.mx:hover{background:var(--redBg);color:var(--red);border-color:var(--red)}
.mbd{overflow:auto;flex:1}.mbd table{width:100%}
.mbd thead th{font-size:.58rem;padding:9px 12px;background:var(--bg);text-align:left}
.mbd tbody td{padding:8px 12px;font-size:.74rem;text-align:left;border-bottom:1px solid var(--bdr)}
.mbd tbody td:last-child{text-align:right}.mbd tbody tr:hover{background:var(--accL)}
.mbd a{color:var(--acc);text-decoration:none;font-weight:600}.mbd a:hover{text-decoration:underline}
.mft{padding:12px 22px;border-top:1px solid var(--bdr);display:flex;justify-content:space-between;font-size:.72rem;color:var(--tx2);font-family:var(--mono);background:var(--bg2);border-radius:0 0 var(--rl) var(--rl)}
.mft .tv{font-weight:700;color:var(--tx);font-size:.82rem}
.empty{text-align:center;padding:50px;color:var(--tx3);font-size:.85rem}
.banner{margin:16px 32px;padding:16px 20px;background:#fffbeb;border:1px solid #fde68a;border-radius:var(--rl);font-size:.82rem;color:#92400e}
.banner b{color:#78350f}
@media(max-width:900px){.sstrip{grid-template-columns:repeat(2,1fr)}.fbar{padding:10px 16px}.tw,.sstrip{margin-left:16px;margin-right:16px}.hdr{padding:16px 16px}}
</style>
</head>
<body>

<div class="hdr">
  <div>
    <h1><em>&#9632;</em> Project P&amp;L Dashboard</h1>
    <p>Filters apply instantly &middot; Click any amount to drill down</p>
    <div class="meta" id="metaInfo"></div>
  </div>
  <div class="hdr-b">
    <button class="btn" onclick="exportCSV()">&#11015; Export CSV</button>
    <button class="btn btn-a" onclick="window.location.reload()">&#8635; Reload</button>
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

<div id="banner"></div>

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
var META=${metaJson};
var CHUNKS=[${chunksJs}];
var RAW=[],FO={},agg=[],sortCol='margin',sortDir=-1;

if(META){
  FO = META.filterOptions || {};
CHUNKS.forEach(function(chunk){
  chunk.forEach(function(r){
    RAW.push({
      id: r.id || '',
      ti: r.ti || '',
      dt: r.dt || '',
      tp: r.tp || '',
      en: r.en || '',
      me: r.me || '',
      ac: r.ac || '',
      at: r.at || '',
      cn: r.cn || '',
      ci: r.ci || '',
      am: parseFloat(r.am) || 0,
      pi: r.pi || '',
      pn: r.pn || '',
      rt: r.rt || 'transaction',
      pm: r.pm || ''
    });
  });
});
  var d=new Date(META.generatedAt);
  document.getElementById('metaInfo').textContent='Data as of: '+d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})+' \\u00B7 '+META.count+' transactions \\u00B7 Gen '+META.gen;
}
CHUNKS=null;
if(!RAW.length)document.getElementById('banner').innerHTML='<div class="banner"><b>&#9888;&#65039; No Data.</b> Run the scheduled script first, then reload.</div>';

(function(){ps('fP',FO.projects||[]);ps('fC',FO.classes||[]);ps('fM',FO.projectManagers||[]);ps('fJ',FO.jobTypes||[]);af()})();
function ps(id,items){var s=document.getElementById(id);items.forEach(function(i){var o=document.createElement('option');o.value=String(i.id);o.textContent=i.name;s.appendChild(o)})}

function classify(t){var tp=t.tp,at=t.at;if(tp==='Invoice'||tp==='Credit Memo')return'income';if(tp==='Journal'&&at==='Income')return'income';if(tp==='Bill')return'bills';if(tp==='Bill Credit')return'billCredit';if(tp==='Check')return'checks';if(tp==='Journal'&&at!=='Income')return'journals';if(tp==='Credit Card')return'creditCard';return'other'}

function af(){
  var fp = gv('fP'),
      fc = gv('fC'),
      fm_ = gv('fM'),
      fj = gv('fJ'),
      q = gv('sBox').toLowerCase(),
      fdf = gv('fDF'),
      fdt = gv('fDT');

  function normDate(v){
    if(!v) return '';
    if(v.indexOf('-') > -1) return v; // already yyyy-mm-dd

    var p = v.split('/');
    if(p.length === 3){
      var mm = p[0].length === 1 ? '0' + p[0] : p[0];
      var dd = p[1].length === 1 ? '0' + p[1] : p[1];
      var yy = p[2];
      return yy + '-' + mm + '-' + dd;
    }
    return v;
  }

  var fromDate = normDate(fdf);
  var toDate   = normDate(fdt);

  var filtered = RAW.filter(function(t){
    var txDate = normDate(t.dt);

    if(fp && t.pi !== fp) return false;
    if(fc && t.ci !== fc) return false;
    if(fm_ && t.pm && t.pm !== fm_) return false;
    if(q && (t.pn || '').toLowerCase().indexOf(q) < 0) return false;
    if(fromDate && txDate && txDate < fromDate) return false;
    if(toDate && txDate && txDate > toDate) return false;

    return true;
  });

  var map = {};
  filtered.forEach(function(t){
    var pid = t.pi;
    if(!map[pid]){
      map[pid] = {
        projectId: pid,
        projectName: (t.pn || ''),
        income: 0,
        bills: 0,
        billCredit: 0,
        checks: 0,
        journals: 0,
        creditCard: 0,
        margin: 0,
        txns: []
      };
    }

    var cat = classify(t),
        amt = parseFloat(t.am) || 0;

    if(cat === 'income') map[pid].income += amt;
    else if(cat === 'bills') map[pid].bills += amt;
    else if(cat === 'billCredit') map[pid].billCredit += amt;
    else if(cat === 'checks') map[pid].checks += amt;
    else if(cat === 'journals') map[pid].journals += amt;
    else if(cat === 'creditCard') map[pid].creditCard += amt;

    map[pid].txns.push(t);
  });

  agg = Object.keys(map).map(function(k){
    var r = map[k];
    r.margin = r.income - (r.bills + r.billCredit) - r.journals - r.creditCard - r.checks;
    return r;
  });

  ds();
  rt();
  rs();
}
function rf(){['fDF','fDT','fP','fC','fM','fJ'].forEach(function(id){document.getElementById(id).value=''});document.getElementById('sBox').value='';af()}
function gv(id){return document.getElementById(id).value}
function srt(col){if(sortCol===col)sortDir*=-1;else{sortCol=col;sortDir=col==='projectName'?1:-1}document.querySelectorAll('thead th').forEach(function(th){th.classList.toggle('sorted',th.dataset.c===col);if(th.dataset.c===col)th.querySelector('.si').innerHTML=sortDir===1?'&#9650;':'&#9660;'});ds();rt()}
function ds(){agg.sort(function(a,b){var va=a[sortCol],vb=b[sortCol];if(sortCol!=='projectName'){va=parseFloat(va)||0;vb=parseFloat(vb)||0}else{va=(va||'').toLowerCase();vb=(vb||'').toLowerCase()}return va<vb?-sortDir:va>vb?sortDir:0})}

function rt(){
  var tb=document.getElementById('tB');document.getElementById('rCt').textContent=agg.length+' projects';
  if(!agg.length){tb.innerHTML='<tr><td colspan="8" class="empty">No matching projects found</td></tr>';return}
  var h='',tI=0,tB=0,tBC=0,tCh=0,tJ=0,tCC=0,tM=0;
  agg.forEach(function(r,idx){tI+=r.income;tB+=r.bills;tBC+=r.billCredit;tCh+=r.checks;tJ+=r.journals;tCC+=r.creditCard;tM+=r.margin;
    h+='<tr><td>'+esc(r.projectName)+'</td>'+atd(r.income,'cg',idx,'income')+atd(r.bills,'cr',idx,'bills')+atd(r.billCredit,'co',idx,'billCredit')+atd(r.checks,'cp',idx,'checks')+atd(r.journals,'ct',idx,'journals')+atd(r.creditCard,'ck',idx,'creditCard')+atd(r.margin,r.margin>=0?'mp':'mn',idx,'all')+'</tr>'});
  h+='<tr class="tot"><td>TOTAL ('+agg.length+')</td><td><span class="am cg">'+fmn(tI)+'</span></td><td><span class="am cr">'+fmn(tB)+'</span></td><td><span class="am co">'+fmn(tBC)+'</span></td><td><span class="am cp">'+fmn(tCh)+'</span></td><td><span class="am ct">'+fmn(tJ)+'</span></td><td><span class="am ck">'+fmn(tCC)+'</span></td><td><span class="am '+(tM>=0?'mp':'mn')+'">'+fmn(tM)+'</span></td></tr>';
  tb.innerHTML=h;
}
function atd(v,cls,idx,cat){if(v===0)return'<td><span class="am z">&mdash;</span></td>';return'<td><span class="am '+cls+'" onclick="dd('+idx+',\\''+cat+'\\')">'+fmn(v)+'</span></td>'}

function rs(){var ti=0,te=0,tm=0;agg.forEach(function(r){ti+=r.income;te+=Math.abs(r.bills)+Math.abs(r.billCredit)+Math.abs(r.checks)+Math.abs(r.journals)+Math.abs(r.creditCard);tm+=r.margin});document.getElementById('sP').textContent=agg.length;document.getElementById('sI').textContent=fmn(ti);document.getElementById('sE').textContent=fmn(te);var mEl=document.getElementById('sM');mEl.textContent=fmn(tm);mEl.style.color=tm>=0?'var(--grn)':'var(--red)';document.getElementById('sMp').textContent=ti?(((tm/ti)*100).toFixed(1)+'% margin'):''}

function dd(idx,cat){
  var row=agg[idx];if(!row)return;var txns=row.txns;
  var filtered=cat==='all'?txns:txns.filter(function(t){return classify(t)===cat});
  document.getElementById('ov').classList.add('open');
  var labels={income:'Income / Revenue',bills:'Bills',billCredit:'Bill Credits',checks:'Checks',journals:'Journals',creditCard:'Credit Card',all:'All Transactions'};
  document.getElementById('mT').textContent=(labels[cat]||cat)+' \\u2014 '+row.projectName;
  document.getElementById('mBd').textContent=filtered.length+' txns';
  document.getElementById('mPr').textContent=row.projectName;
  if(!filtered.length){document.getElementById('mB').innerHTML='<div class="empty">No transactions found</div>';document.getElementById('mTo').textContent='';return}
  var rows='';
  filtered.forEach(function(t){var url='/app/accounting/transactions/transaction.nl?id='+t.id});
  rows+='<tr><td><a href="'+url+'" target="_blank">'+esc(t.ti||t.id)+'</a></td><td>'+esc(t.dt)+'</td><td>'+esc(t.tp)+'</td><td>'+esc(t.st||'')+'</td><td>'+esc(t.en)+'</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">'+esc(t.me)+'</td><td>'+esc(t.ac)+'</td><td>'+esc(t.cn)+'</td><td style="text-align:right;font-family:var(--mono);font-weight:600">'+fmn(parseFloat(t.am)||0)+'</td></tr>';
  document.getElementById('mB').innerHTML='<table><thead><tr><th>Doc #</th><th>Date</th><th>Type</th><th>Status</th><th>Entity</th><th>Memo</th><th>Account</th><th>Class</th><th style="text-align:right">Amount</th></tr></thead><tbody>'+rows+'</tbody></table>';
  var total=filtered.reduce(function(s,t){return s+(parseFloat(t.am)||0)},0);
  document.getElementById('mTo').innerHTML='Total: <span class="tv">'+fmn(total)+'</span>';
}
function cm(){document.getElementById('ov').classList.remove('open')}
document.addEventListener('keydown',function(e){if(e.key==='Escape')cm()});

function exportCSV(){if(!agg.length)return;var csv='Project,Income,Bills,Bill Credits,Checks,Journals,Credit Card,Net Margin\\n';agg.forEach(function(r){csv+='"'+(r.projectName||'').replace(/"/g,'""')+'",'+r.income.toFixed(2)+','+r.bills.toFixed(2)+','+r.billCredit.toFixed(2)+','+r.checks.toFixed(2)+','+r.journals.toFixed(2)+','+r.creditCard.toFixed(2)+','+r.margin.toFixed(2)+'\\n'});var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='Project_PnL_'+new Date().toISOString().slice(0,10)+'.csv';a.click()}

function fmn(n){return(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2})}
function esc(s){if(!s)return'';var d=document.createElement('div');d.textContent=s;return d.innerHTML}
</script>
</body>
</html>`;
            context.response.write(html);
        };

        /* ═══════ READ GENERATION POINTER ═══════ */
        const readCurrentGen = () => {
            try {
                const results = [];
                search.create({
                    type: 'file',
                    filters: [['name', 'is', 'pnl_gen.json'], 'AND', ['folder', 'anyof', FOLDER_ID]],
                    columns: ['internalid']
                }).run().each(r => { results.push(r.id); return true; });

                if (results.length > 0) {
                    const f = file.load({ id: results[0] });
                    return JSON.parse(f.getContents()).gen || 0;
                }
            } catch (e) {
                log.debug('Suitelet', 'No gen pointer: ' + e.message);
            }
            return 0;
        };

        /* ═══════ LOAD ALL FILES FOR A GENERATION ═══════ */
        const loadGenFiles = (gen) => {
            const prefix = 'pnl_v' + gen + '_';
            const fileMap = {};
            try {
                search.create({
                    type: 'file',
                    filters: [['folder', 'anyof', FOLDER_ID], 'AND', ['name', 'startswith', prefix]],
                    columns: ['internalid', 'name']
                }).run().each(result => {
                    fileMap[result.getValue('name')] = result.id;
                    return true;
                });
            } catch (e) {
                log.error('Suitelet', 'Error finding gen ' + gen + ' files: ' + e.message);
            }
            return fileMap;
        };

        return { onRequest };
    });