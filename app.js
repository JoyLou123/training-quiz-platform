/* ================= 多系统练习系统 · 主逻辑 ================= */
const SYSTEMS = window.SYSTEM_DEFS || [];
const STORE_KEY = 'sb_quiz_state_v2';

const state = {
  sysKey: localStorage.getItem('sb_cur_sys') || (SYSTEMS[0] ? SYSTEMS[0].key : null),
  mode: null,
  list: [],
  idx: 0,
  answered: {},
  exam: { active:false, startedAt:0, remaining:0, timer:null, subSelf:{}, subDone:false, kind:'exam' },
};
let store = loadStore();

/* ---------- 当前系统 & 数据 ---------- */
function curSys(){ return SYSTEMS.find(s=>s.key===state.sysKey) || SYSTEMS[0]; }
function BANK(){ return curSys().bank; }
function CHAPTERS(){ return curSys().chapters; }
function DIMENSIONS(){ return curSys().dimensions; }
function sysStore(){
  if(!store[state.sysKey]) store[state.sysKey] = { wrong:{}, fav:{}, done:{}, examCount:0 };
  return store[state.sysKey];
}

function defaultStore(){
  const s = {};
  SYSTEMS.forEach(sy=>{ s[sy.key] = { wrong:{}, fav:{}, done:{}, examCount:0 }; });
  return s;
}
function loadStore(){
  try{ const s = JSON.parse(localStorage.getItem(STORE_KEY)); if(s) return Object.assign(defaultStore(), s); }catch(e){}
  return defaultStore();
}
function saveStore(){ localStorage.setItem(STORE_KEY, JSON.stringify(store)); }

/* ---------- 工具 ---------- */
const $ = id => document.getElementById(id);
const DIM_PALETTE = ['#2563eb','#7c3aed','#ea580c','#0891b2','#16a34a','#dc2626','#db2777','#d97706'];
function dimColor(d){ const i = DIMENSIONS().indexOf(d); return DIM_PALETTE[i % DIM_PALETTE.length] || '#64748b'; }
const typeLabel = {single:'单选',multi:'多选',judge:'判断',fill:'填空',subjective:'主观题'};
const diffLabel = {1:'●○○',2:'●●○',3:'●●●'};
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

/* ---------- 视图切换 ---------- */
function show(id){
  ['pageSystem','pageHome','pageChapter','pageQuiz','pageExamIntro'].forEach(p=>$(p).classList.add('hidden'));
  $(id).classList.remove('hidden');
  const isHome = id==='pageHome';
  const isSys = id==='pageSystem';
  $('btnSheet').classList.toggle('hidden', id!=='pageQuiz');
  $('btnBack').classList.toggle('hidden', isHome || isSys);
  $('btnSys').classList.toggle('hidden', isSys);
  // 系统选择页时导航显示平台名；进入具体系统时显示系统名
  if(isSys){
    $('navTitle').textContent = '业务系统营销培训练习平台';
    $('navLogo').textContent = '📚';
    $('navLogo').style.background = 'linear-gradient(135deg,#1e293b,#334155)';
  }
}

function goHome(){ stopExamTimer(); state.exam.active=false; renderHome(); show('pageHome'); }

/* ================= 系统选择页 ================= */
function showSystemPage(){ stopExamTimer(); state.exam.active=false; renderSystemGrid(); show('pageSystem'); }

function renderSystemGrid(){
  const grid = $('systemGrid'); grid.innerHTML='';
  SYSTEMS.forEach(s=>{
    const ss = store[s.key] || { wrong:{}, fav:{}, done:{} };
    const done = Object.keys(ss.done||{}).length;
    const isCur = s.key===state.sysKey;
    const card = document.createElement('div');
    card.className = 'sys-card' + (isCur?' cur':'');
    card.innerHTML = `
      <div class="sys-head">
        <div class="sys-ic" style="background:${s.color}">${s.icon}</div>
        <div class="sys-nm">${s.name}</div>
      </div>
      <div class="sys-sub">${s.sub||''}</div>
      <div class="sys-stat">
        <span>题库 <b>${s.bank.length}</b></span>
        <span>已练 <b>${done}</b></span>
        <span>错题 <b>${Object.keys(ss.wrong||{}).length}</b></span>
      </div>
      <div class="sys-go">›</div>`;
    card.onclick = ()=>{ switchSystem(s.key); };
    grid.appendChild(card);
  });
}

function switchSystem(key){
  state.sysKey = key;
  localStorage.setItem('sb_cur_sys', key);
  state.mode=null; state.list=[]; state.idx=0; state.answered={};
  stopExamTimer(); state.exam.active=false;
  renderHome(); show('pageHome');
}

/* ================= 首页 ================= */
function renderHome(){
  const sys = curSys();
  const bank = BANK();
  const ss = sysStore();
  const total = bank.length;
  const done = Object.keys(ss.done||{}).length;
  let right=0;
  Object.values(ss.done||{}).forEach(d=>{ if(d.correct) right++; });
  const wrong = Object.keys(ss.wrong||{}).length;

  // 导航与 hero
  $('navLogo').textContent = sys.icon;
  $('navLogo').style.background = 'linear-gradient(135deg,'+sys.color+',#334155)';
  $('navTitle').textContent = sys.name + ' · 练习系统';
  $('heroTitle').textContent = sys.name + ' · 营销培训练习系统';
  $('heroSub').textContent = sys.sub || '驾校科目一式刷题';
  $('heroBox').style.background = 'linear-gradient(135deg,'+sys.color+',#334155)';

  $('stTotal').textContent = total;
  $('stDone').textContent = done;
  $('stAcc').textContent = done? Math.round(right/done*100)+'%' : '0%';
  $('stWrong').textContent = wrong;
  $('badgeWrong').textContent = wrong;
  $('badgeFav').textContent = Object.keys(ss.fav||{}).length;

  // 考试描述
  const exam = sys.exam||{};
  $('examDesc').textContent = `闭卷 · 100 分 · ${Math.round((exam.duration||7200)/60)} 分钟 · ${exam.pass||80} 分通过`;

  // 现场模拟考试入口（仅含现场考试题的系统显示）
  const oralCount = bank.filter(q=>q.section==='现场考试题库').length;
  $('oralExamCard').classList.toggle('hidden', !oralCount);

  $('abilityTitle').textContent = DIMENSIONS().length + ' 维能力画像';
  $('footerNote').textContent = `数据来源：《${sys.name}培训评测考试体系》 · 仅供内部培训使用`;

  renderAbility();
}

function renderAbility(){
  const card = $('abilityCard'); card.innerHTML='';
  const bank = BANK(); const ss = sysStore();
  DIMENSIONS().forEach(d=>{
    const qs = bank.filter(q=>q.dimension===d && q.type!=='subjective');
    if(!qs.length) return;
    let right=0; qs.forEach(q=>{ if(ss.done && ss.done[q.id] && ss.done[q.id].correct) right++; });
    const pct = Math.round(right/qs.length*100);
    const row = document.createElement('div'); row.className='ability-row';
    row.innerHTML = `<div class="dim">${d}</div>
      <div class="bar"><i style="width:${pct}%;background:${dimColor(d)}"></i></div>
      <div class="pct">${pct}%</div>`;
    card.appendChild(row);
  });
}

/* ================= 章节选择 ================= */
function renderChapters(){
  const list = $('chapterList'); list.innerHTML='';
  const bank = BANK();
  CHAPTERS().forEach(ch=>{
    const qs = bank.filter(q=>q.chapter===ch);
    if(!qs.length) return;
    const card = document.createElement('div');
    card.className='mode-card'; card.style.marginBottom='12px';
    card.innerHTML = `<div class="ic ic-blue">📚</div><div class="nm">${ch}</div>
      <div class="ds">${qs.length} 题</div>`;
    card.onclick = ()=>startQuiz(qs.map(q=>q.id), ch);
    list.appendChild(card);
  });
}

/* ================= 启动模式 ================= */
function startMode(mode){
  const bank = BANK(); const ss = sysStore();
  if(mode==='seq'){ startQuiz(bank.map(q=>q.id), curSys().name+' · 顺序练习'); return; }
  if(mode==='random'){ startQuiz(shuffle(bank).map(q=>q.id), curSys().name+' · 随机练习'); return; }
  if(mode==='chapter'){ renderChapters(); show('pageChapter'); return; }
  if(mode==='wrong'){
    const ids = Object.keys(ss.wrong||{});
    if(!ids.length){ alert('暂无错题，先去练习吧！'); return; }
    startQuiz(ids, curSys().name+' · 错题重练'); return;
  }
  if(mode==='fav'){
    const ids = Object.keys(ss.fav||{});
    if(!ids.length){ alert('暂无收藏，遇到重点题点 ⭐ 收藏吧！'); return; }
    startQuiz(ids, curSys().name+' · 我的收藏'); return;
  }
}

/* ================= 练习主流程 ================= */
function startQuiz(ids, title){
  state.mode='quiz'; state.list=ids; state.idx=0;
  state.answered={};
  state.exam.active=false; stopExamTimer();
  $('navTitle').textContent = title;
  show('pageQuiz');
  renderQuestion();
}

function renderQuestion(){
  const q = BANK().find(x=>x.id===state.list[state.idx]);
  if(!q){ return; }
  const total = state.list.length;
  $('qCnt').textContent = `${state.idx+1}/${total}`;
  $('qProg').style.width = (state.idx/total*100)+'%';

  const card = $('qCard');
  const ss = sysStore();
  const favOn = ss.fav && ss.fav[q.id];
  const typeCls = q.type==='multi'?'multi':q.type;
  const favHtml = `<button class="btn btn-fav ${favOn?'on':''}" onclick="toggleFav('${q.id}')"><span class="star">${favOn?'★':'☆'}</span></button>`;

  let body='';
  if(q.type==='single'){
    body = q.options.map((o,i)=>{
      const key = String.fromCharCode(65+i);
      return `<div class="opt" data-i="${i}" onclick="answerSingle(${i})"><div class="key">${key}</div><div class="txt">${o}</div></div>`;
    }).join('');
  } else if(q.type==='multi'){
    body = q.options.map((o,i)=>{
      const key = String.fromCharCode(65+i);
      return `<div class="opt" data-i="${i}" onclick="toggleMulti(${i})"><div class="key">${key}</div><div class="txt">${o}</div></div>`;
    }).join('');
    body += `<div style="margin-top:6px"><button class="btn btn-primary" style="width:100%" onclick="confirmMulti()">确认答案</button></div>`;
  } else if(q.type==='judge'){
    body = `<div class="judge-wrap">
      <div class="judge-btn yes" onclick="answerJudge(0)">✓ 对</div>
      <div class="judge-btn no" onclick="answerJudge(1)">✗ 错</div>
    </div>`;
  } else if(q.type==='fill'){
    body = `<input class="fill-input" id="fillInput" placeholder="请输入答案…" autocomplete="off">
      <div style="margin-top:10px"><button class="btn btn-primary" style="width:100%" onclick="answerFill()">确认答案</button></div>`;
  } else if(q.type==='subjective'){
    body = `<div style="font-size:14px;color:var(--text-2);background:var(--gray-l);border-radius:10px;padding:14px;line-height:1.7">
      📝 本题为<b>主观题</b>（无自动判分）。请口头或书面作答后，对照下方「评分要点」自评。</div>
      <div style="margin-top:14px"><button class="btn btn-ghost" style="width:100%" onclick="toggleRubric(this)">📋 查看评分要点</button></div>
      <div class="feedback rubric-box" id="rubricBox"><div class="fb-explain"><div class="fb-answer">评分要点：</div><div class="rubric">${q.rubric||''}</div></div></div>`;
  }

  card.innerHTML = `
    <div class="q-meta">
      <span class="chip type ${typeCls}">${typeLabel[q.type]}</span>
      <span class="chip dim">${q.dimension}</span>
      <span class="chip diff">${diffLabel[q.difficulty]}</span>
      ${state.exam.active? `<span class="chip" style="background:var(--amber-l);color:var(--amber)">${q.score||3}分</span>`:''}
      <span class="chip chap">${q.chapter}</span>
    </div>
    <div class="q-text">${q.q}</div>
    ${body}
    <div class="feedback" id="feedback"></div>`;

  // 恢复已答状态
  const prev = state.answered[q.id];
  if(prev){
    if(q.type==='single') markSingle(prev.chosen[0], prev.correct);
    else if(q.type==='multi'){ prev.chosen.forEach(i=>{const el=card.querySelector(`.opt[data-i="${i}"]`); if(el)el.classList.add('sel');}); markMulti(prev.chosen, prev.correct); }
    else if(q.type==='judge') markJudge(prev.chosen[0], prev.correct);
    else if(q.type==='fill'){ const inp=$('fillInput'); if(inp){inp.value=prev.chosen[0]; inp.disabled=true; inp.classList.add(prev.correct?'right':'wrong');} showFeedback(prev.correct,q); }
  }

  // 操作栏
  let bar = favHtml;
  if(state.idx>0) bar += `<button class="btn btn-ghost" onclick="move(-1)">上一题</button>`;
  if(state.idx<total-1) bar += `<button class="btn btn-primary" onclick="move(1)">下一题</button>`;
  else bar += `<button class="btn btn-success" onclick="finishQuiz()">完成练习</button>`;
  $('actionBar').innerHTML = bar;
  $('actionBar').style.display='flex';
}

/* ================= 答题逻辑 ================= */
const KEYS='ABCDEFGH';
function normAnswer(ans){ return [...ans].sort().join(''); }

function markSingle(i, correct){
  const card=$('qCard'); const opts=card.querySelectorAll('.opt');
  opts.forEach(o=>o.classList.add('disabled'));
  if(correct){ opts[i].classList.add('right'); }
  else {
    opts[i].classList.add('wrong');
    const q = BANK().find(x=>x.id===state.list[state.idx]);
    q.answer.forEach(a=>{ const ai=KEYS.indexOf(a); if(ai>=0) opts[ai].classList.add('right'); });
  }
}
function markJudge(i, correct){
  const card=$('qCard'); const btns=card.querySelectorAll('.judge-btn');
  btns.forEach(b=>b.classList.add('dim'));
  if(correct){ btns[i].classList.add('right'); }
  else { btns[i].classList.add('wrong'); btns[1-i].classList.add('right'); }
}
function markMulti(chosen, correct){
  const card=$('qCard'); const opts=card.querySelectorAll('.opt');
  opts.forEach(o=>o.classList.add('disabled'));
  const q = BANK().find(x=>x.id===state.list[state.idx]);
  const chosenSet = chosen.map(i=>KEYS[i]).sort().join('');
  opts.forEach((o,idx)=>{
    const k=KEYS[idx];
    const inAns = q.answer.includes(k);
    const inChosen = chosenSet.includes(k);
    if(inAns && inChosen) o.classList.add('right');
    else if(inChosen && !inAns) o.classList.add('wrong');
    else if(inAns && !inChosen) o.classList.add('right');
    else o.classList.add('dim');
  });
}
function showFeedback(correct, q){
  const fb = $('feedback'); fb.className='feedback show '+(correct?'right':'wrong');
  const correctText = q.type==='judge' ? (q.answer[0]==='对'?'对':'错')
    : q.type==='fill' ? q.answer : q.answer.join('、');
  let html = `<div class="fb-title">${correct?'✓ 回答正确':'✗ 回答错误'}</div>`;
  if(!correct) html += `<div class="fb-answer">正确答案：${q.type==='subjective'?'见评分要点':correctText}</div>`;
  if(q.explain) html += `<div class="fb-explain">💡 ${q.explain}</div>`;
  fb.innerHTML = html;
  fb.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function record(id, correct, chosen){
  state.answered[id] = {correct, chosen};
  const ss = sysStore();
  ss.done[id] = {correct, chosen};
  if(correct){ delete ss.wrong[id]; } else { ss.wrong[id] = true; }
  saveStore();
}

function answerSingle(i){
  const q = BANK().find(x=>x.id===state.list[state.idx]);
  if(state.answered[q.id]) return;
  const chosen = KEYS[i];
  const correct = q.answer.includes(chosen);
  markSingle(i, correct);
  showFeedback(correct, q);
  record(q.id, correct, [i]);
}
function answerJudge(i){
  const q = BANK().find(x=>x.id===state.list[state.idx]);
  if(state.answered[q.id]) return;
  const chosen = i===0?'对':'错';
  const correct = q.answer[0]===chosen;
  markJudge(i, correct);
  showFeedback(correct, q);
  record(q.id, correct, [i]);
}

let multiSel = new Set();
function toggleMulti(i){
  const q = BANK().find(x=>x.id===state.list[state.idx]);
  if(state.answered[q.id]) return;
  const el = document.querySelector(`.opt[data-i="${i}"]`);
  if(multiSel.has(i)){ multiSel.delete(i); el.classList.remove('sel'); }
  else { multiSel.add(i); el.classList.add('sel'); }
}
function confirmMulti(){
  const q = BANK().find(x=>x.id===state.list[state.idx]);
  if(state.answered[q.id]) return;
  if(!multiSel.size){ alert('请先选择至少一个选项'); return; }
  const chosen = [...multiSel].sort().map(i=>KEYS[i]);
  const correct = normAnswer(chosen) === normAnswer(q.answer);
  const chosenIdx = [...multiSel];
  markMulti(chosenIdx, correct);
  showFeedback(correct, q);
  record(q.id, correct, chosenIdx);
  renderQuestion();
}

function answerFill(){
  const q = BANK().find(x=>x.id===state.list[state.idx]);
  if(state.answered[q.id]) return;
  const inp = $('fillInput'); if(!inp) return;
  const val = inp.value.trim();
  if(!val){ inp.focus(); return; }
  const correct = (q.keywords||[]).some(k=>val.toLowerCase().includes(k.toLowerCase())) || val===q.answer;
  inp.disabled=true;
  inp.classList.add(correct?'right':'wrong');
  showFeedback(correct,q);
  record(q.id, correct, [val]);
  renderQuestion();
}

function toggleRubric(btn){
  const box = $('rubricBox');
  const show = !box.classList.contains('show');
  box.classList.toggle('show', show);
  btn.textContent = show? '收起评分要点' : '📋 查看评分要点';
}

function move(d){
  state.idx += d;
  multiSel = new Set();
  if(state.idx<0) state.idx=0;
  if(state.idx>=state.list.length) state.idx=state.list.length-1;
  renderQuestion();
  window.scrollTo({top:0});
}

function finishQuiz(){
  const total=state.list.length, done=Object.keys(state.answered).length;
  let right=0; Object.values(state.answered).forEach(a=>{if(a.correct)right++;});
  alert(`本次练习完成！\n\n共 ${total} 题，已作答 ${done} 题\n答对 ${right} 题${done? '，正确率 '+Math.round(right/done*100)+'%':''}\n\n错题已自动加入「错题重练」。`);
  goHome();
}

/* ================= 收藏 ================= */
function toggleFav(id){
  const ss = sysStore();
  if(ss.fav[id]){ delete ss.fav[id]; } else { ss.fav[id]=true; }
  saveStore();
  renderQuestion();
}

/* ================= 答题卡 ================= */
function toggleSheet(){
  const s=$('sheet');
  const open = s.classList.contains('hidden');
  if(open){ renderSheet(); s.classList.remove('hidden'); }
  else s.classList.add('hidden');
}
function renderSheet(){
  const grid=$('sheetGrid'); grid.innerHTML='';
  state.list.forEach((id,idx)=>{
    const cell=document.createElement('div');
    cell.className='cell';
    const a=state.answered[id];
    if(a){ cell.classList.add(a.correct?'right':'wrong'); }
    if(idx===state.idx) cell.classList.add('cur');
    cell.textContent = idx+1;
    cell.onclick=()=>{ state.idx=idx; multiSel=new Set(); toggleSheet(); renderQuestion(); };
    grid.appendChild(cell);
  });
}

/* ================= 模拟考试 ================= */
function examCfg(){ return curSys().exam || { total:100, duration:90*60, pass:80 }; }
// 综合考试题 = 带 score 且非「现场考试题库」的题
function examIds(){ return BANK().filter(q=>q.score && q.score>0 && q.section!=='现场考试题库').map(q=>q.id); }
// 现场考试题 = section 为「现场考试题库」的题
function oralExamIds(){ return BANK().filter(q=>q.section==='现场考试题库').map(q=>q.id); }

function startExam(){
  state.mode='exam';
  state.exam.kind='exam';
  const cfg = examCfg();
  const mins = Math.round((cfg.duration||7200)/60);
  const pass = cfg.pass||80;
  $('navTitle').textContent = curSys().name+' · 模拟考试';
  $('examRuleText').innerHTML = `
    <b>${curSys().name} · ${cfg.title||'综合考试'}</b><br>
    · 闭卷 ${mins} 分钟 · 100 分 · <b>${pass} 分通过</b><br>
    · 客观题自动判分，主观题对照评分要点自评<br>
    · 交卷后生成得分与定级，请认真作答`;
  $('examStartBtnText').textContent = '开始考试';
  $('examStartBtnSub').textContent = `计时开始后不可暂停，请预留 ${mins} 分钟`;
  show('pageExamIntro');
}

function startOralExam(){
  const ids = oralExamIds();
  if(!ids.length){ alert('该系统暂无现场考试题'); return; }
  state.mode='exam';
  state.exam.kind='oral';
  $('navTitle').textContent = curSys().name+' · 现场模拟考试';
  $('examRuleText').innerHTML = `
    <b>${curSys().name} · 现场面对面口试模拟</b><br>
    · 19 题 · 100 分（口述 + 情景 + 合规）<br>
    · 客观题自动判分，口述/情景/合规题对照评分要点自评<br>
    · <b>四档定级</b>：精通 90–100 / 掌握 80–89 / 理解 70–79 / 熟悉 60–69<br>
    · <b style="color:#dc2626">一票否决</b>：合规题全错降一档；价格/投产比/分利/安全承诺题口头承诺具体数字 = 该题 0 分`;
  $('examStartBtnText').textContent = '开始现场考试';
  $('examStartBtnSub').textContent = '建议按真实口试节奏，逐题口述后自评';
  show('pageExamIntro');
}

function beginExam(){
  const ids = state.exam.kind==='oral' ? oralExamIds() : examIds();
  if(!ids.length){ alert('该题库暂无考试题'); return; }
  state.list = ids;
  state.idx = 0;
  state.answered = {};
  state.exam.active = true;
  state.exam.subSelf = {};
  state.exam.subDone = false;
  multiSel = new Set();
  startExamTimer();
  $('navTitle').textContent = curSys().name+' · '+(state.exam.kind==='oral'?'现场模拟考试':'模拟考试');
  show('pageQuiz');
  renderExamBar();
  renderQuestion();
}

function renderExamBar(){
  let bar = $('examTimerBar');
  if(!bar){
    bar = document.createElement('div');
    bar.id='examTimerBar';
    bar.className='exam-timer';
    $('pageQuiz').insertBefore(bar, $('pageQuiz').firstChild);
  }
  const mins = Math.floor(examDuration()/60);
  bar.innerHTML = `⏱ 剩余时间 <span class="clock" id="examClock">${mins}:00</span>`;
}

function examDuration(){
  // 现场考试 50 分钟，综合考试按系统配置
  return state.exam.kind==='oral' ? 50*60 : (examCfg().duration || 5400);
}

function startExamTimer(){
  const dur = examDuration();
  state.exam.remaining = dur;
  state.exam.startedAt = Date.now();
  clearInterval(state.exam.timer);
  state.exam.timer = setInterval(()=>{
    const elapsed = Math.floor((Date.now()-state.exam.startedAt)/1000);
    state.exam.remaining = Math.max(0, dur - elapsed);
    const mm = String(Math.floor(state.exam.remaining/60)).padStart(2,'0');
    const ss = String(state.exam.remaining%60).padStart(2,'0');
    const clk = $('examClock'); if(clk) clk.textContent = `${mm}:${ss}`;
    const bar = $('examTimerBar');
    if(bar){ bar.classList.toggle('warn', state.exam.remaining<=600); }
    if(state.exam.remaining<=0){ submitExam(true); }
  }, 1000);
}
function stopExamTimer(){ clearInterval(state.exam.timer); }

function submitExam(force){
  if(!force && !confirm('确定交卷吗？交卷后不可修改。')) return;
  stopExamTimer();
  state.exam.active=false;

  const bank = BANK();
  const objIds = state.list.filter(id=>{ const q=bank.find(x=>x.id===id); return q.type!=='subjective'; });
  const subIds = state.list.filter(id=>{ const q=bank.find(x=>x.id===id); return q.type==='subjective'; });

  let objScore=0, objFull=0;
  objIds.forEach(id=>{
    const q=bank.find(x=>x.id===id);
    const sc = q.score||3;
    objFull += sc;
    const a=state.answered[id];
    if(a && a.correct) objScore += sc;
  });

  if(subIds.length && !state.exam.subDone){
    askSubjectiveScore(subIds, objScore, objFull);
    return;
  }
  let subScore=0, subFull=0;
  subIds.forEach(id=>{
    const q=bank.find(x=>x.id===id);
    subFull += (q.score||8);
    subScore += (state.exam.subSelf[id]||0);
  });

  const totalScore = objScore + subScore;
  const totalFull = objFull + subFull;
  const pass = examCfg().pass || 80;

  // 合规一票否决（仅含"合规"维度的系统生效）
  const complianceIds = state.list.filter(id=>{ const q=bank.find(x=>x.id===id); return q.dimension==='合规'; });
  let compAllWrong = complianceIds.length>0;
  complianceIds.forEach(id=>{
    const q=bank.find(x=>x.id===id);
    if(q.type==='subjective'){ if((state.exam.subSelf[id]||0)>0) compAllWrong=false; }
    else { const a=state.answered[id]; if(a && a.correct) compAllWrong=false; }
  });

  const isPass = totalScore>=pass;
  const finalPass = isPass && !compAllWrong;

  showResult({objScore, objFull, subScore, subFull, totalScore, totalFull, pass, isPass, finalPass, compAllWrong, kind: state.exam.kind});
}

function askSubjectiveScore(subIds, objScore, objFull){
  state.exam.subDone = true;
  subIds.forEach(id=>{
    const q=BANK().find(x=>x.id===id);
    const full = q.score||8;
    const raw = prompt(`主观题自评（0-${full} 分）\n\n${q.q}\n\n评分要点：\n${q.rubric||'（无）'}\n\n请输入本题得分（0-${full}）：`, '');
    let sc = parseInt(raw);
    if(isNaN(sc)) sc=0;
    sc = Math.max(0, Math.min(full, sc));
    state.exam.subSelf[id]=sc;
  });
  submitExam(false);
}

function showResult(r){
  stopExamTimer();
  $('navTitle').textContent = curSys().name+' · 考试成绩';
  const q = $('qCard'); q.innerHTML='';
  $('actionBar').style.display='none';

  const isOral = r.kind==='oral';
  const pct = r.totalFull? Math.round(r.totalScore/r.totalFull*100) : 0;

  let grade, gradeCls, meaning, tips='';

  if(isOral){
    // 现场考试：四档定级（熟悉60-69/理解70-79/掌握80-89/精通90-100），合规全错降一档
    const score = r.totalScore;
    let g;
    if(score>=90) g={name:'精通', cls:'grade-a', m:'灵活组合多套方法、从容应对追问与对抗、主动管理预期，可独立拜访、担任导师'};
    else if(score>=80) g={name:'掌握', cls:'grade-b', m:'标准场景能独立完成、常规追问能接住、口径基本准确，可结对跟访客户'};
    else if(score>=70) g={name:'理解', cls:'grade-c', m:'能用自己的话说清概念与机制，应用场景不流畅需引导'};
    else if(score>=60) g={name:'熟悉', cls:'grade-d', m:'能准确复述定位、关键数字与标准口径，为什么与怎么用需提示'};
    else g={name:'未达熟悉', cls:'grade-d', m:'事实底账不牢，需回炉重学后再考'};
    // 一票否决：合规题全错降一档
    let downgraded = false;
    if(r.compAllWrong && score>=60){
      const order=['精通','掌握','理解','熟悉'];
      const idx=order.indexOf(g.name);
      if(idx>=0){ g={name:order[Math.min(idx+1,3)], cls:idx+1>=2?'grade-c':g.cls, m:g.m}; downgraded=true; }
    }
    grade=g.name; gradeCls=g.cls; meaning=g.m;
    if(downgraded) tips += `<span class="warn-line">· 合规题全部答错，触发「一票否决」降一档！价格、投产比、分利、安全承诺口径是红线。</span><br>`;
    else if(r.compAllWrong) tips += `<span class="warn-line">· 合规题全部答错（一票否决），请重点复习口径纪律。</span><br>`;
    if(score<60) tips += `· 未达「熟悉」，建议先刷「阶段一 · 懂产品」顺序练习补齐事实底账。<br>`;
    if(score<80) tips += `· 距「掌握」还差 <b>${80-score}</b> 分，多做角色扮演与情景题。<br>`;
    if(score>=90 && !r.compAllWrong) tips += `· 已达「精通」，合规零失误，可独立拜访客户。<br>`;
  } else {
    if(r.finalPass && pct>=90){ grade='优秀'; gradeCls='grade-a'; meaning='知识过硬、话术熟练，可独立见客户'; }
    else if(r.finalPass){ grade='良好'; gradeCls='grade-b'; meaning='掌握扎实，个别场景需补'; }
    else if(pct>=60 && !r.compAllWrong){ grade='合格'; gradeCls='grade-c'; meaning='基本掌握，应用不熟，多做练习'; }
    else { grade='待提升'; gradeCls='grade-d'; meaning='知识底账不牢或口径纪律失守，回炉重学后再考'; }
    if(!r.isPass) tips += `· 距离通过（${r.pass} 分）还差 <b>${r.pass - r.totalScore}</b> 分，建议针对性刷「错题重练」与对应章节。<br>`;
    if(r.compAllWrong) tips += `<span class="warn-line">· 合规维题目全部答错，触发「一票否决」！价格、投产比、安全承诺口径是红线，请重点复习。</span><br>`;
    if(pct<80) tips += `· 得分率 ${pct}%，客观题 ${r.objScore}/${r.objFull} 分，需加强事实底账。<br>`;
    if(r.finalPass && pct>=90) tips += `· 已达标，可独立拜访客户。<br>`;
  }

  const titleText = isOral? (curSys().name+' · 现场口试成绩') : (curSys().name+' · 综合考试成绩');
  const gradeSuffix = isOral ? '' : (r.finalPass?' · 通过':' · 未通过');
  const scoreColor = isOral
    ? (r.totalScore>=80?'var(--green)':(r.totalScore>=60?'var(--amber)':'var(--red)'))
    : (r.totalScore>=r.pass?'var(--green)':'var(--red)');
  const totalCell = isOral
    ? `<td>${r.totalScore>=90?'精通':(r.totalScore>=80?'掌握':(r.totalScore>=70?'理解':(r.totalScore>=60?'熟悉':'未达熟悉')))}</td>`
    : `<td>${r.isPass?`≥${r.pass} 达标`:`未达 ${r.pass}`}</td>`;
  const retryBtn = isOral? `<button class="btn btn-primary" onclick="startOralExam()">再考一次</button>`
                         : `<button class="btn btn-primary" onclick="startExam()">再考一次</button>`;

  q.innerHTML = `<div class="result">
    <div style="font-size:14px;color:var(--text-2)">${titleText}</div>
    <div class="score-big" style="color:${scoreColor}">${r.totalScore}<span style="font-size:22px">/${r.totalFull}</span></div>
    <div class="grade ${gradeCls}">${grade}${gradeSuffix}</div>
    <div style="font-size:14px;color:var(--text-2);margin-bottom:16px">${meaning}</div>
    <table class="breakdown">
      <tr><th>项目</th><th>得分</th><th>满分</th><th>说明</th></tr>
      <tr><td>客观题</td><td><b>${r.objScore}</b></td><td>${r.objFull}</td><td>单选/多选/填空</td></tr>
      <tr><td>主观题</td><td><b>${r.subScore}</b></td><td>${r.subFull}</td><td>口述/情景/合规（自评）</td></tr>
      <tr><td><b>总分</b></td><td><b>${r.totalScore}</b></td><td>${r.totalFull}</td>${totalCell}</tr>
    </table>
    <div class="tips">${tips || '继续加油，保持练习！'}</div>
    <div class="action-bar" style="display:flex;margin-top:18px">
      <button class="btn btn-ghost" onclick="goHome()">返回首页</button>
      ${retryBtn}
    </div>
  </div>`;

  const ss = sysStore();
  ss.examCount = (ss.examCount||0)+1;
  saveStore();
}

/* ================= 初始化 ================= */
if(SYSTEMS.length){
  if(!SYSTEMS.find(s=>s.key===state.sysKey)) state.sysKey = SYSTEMS[0].key;
  if(!store[state.sysKey]) store[state.sysKey] = { wrong:{}, fav:{}, done:{}, examCount:0 };
  renderSystemGrid();
  show('pageSystem');
} else {
  $('heroTitle').textContent = '题库未加载';
  $('heroSub').textContent = '请确认数据文件已正确引入';
  show('pageSystem');
}
