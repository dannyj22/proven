(() => {
const C = window.CONFIG, API = window.API;
const $ = s => document.querySelector(s);
/* Everything from the backend goes through esc() or safeUrl() before reaching the page. */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const safeUrl = u => { try { const x = new URL(u, location.href); return ['http:', 'https:'].includes(x.protocol) ? esc(x.href) : ''; } catch { return ''; } };
const list = v => Array.isArray(v) ? v : [];
const pct = v => Math.max(0, Math.min(100, Number(v) || 0));
const words = t => t.split(/\s+/).filter(Boolean).length;
const btn = (label, a, v = '', cls = '', off = false) => `<button class="${cls}" data-a="${a}" data-v="${esc(v)}" ${off ? 'disabled' : ''}>${label}</button>`;
const state = (text, retry) => `<div class="state ${retry ? 'err' : ''}" role="${retry ? 'alert' : 'status'}"><p>${esc(text)}</p>${retry ? btn('Try again', retry) : ''}</div>`;
const link = (url, label) => safeUrl(url) ? `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : esc(label);
const agent = k => C.agents[k] || { name: 'Agent', role: '', color: '#b9a2ff' };
const av = k => `<span class="av" style="--c:${agent(k).color}" aria-hidden="true">${esc(agent(k).name[0])}</span>`;
const ICON = { chat:'M4 5h16v11H9l-5 4z', studies:'M4 4h6a2 2 0 012 2v14a3 3 0 00-3-2H4zM20 4h-6a2 2 0 00-2 2v14a3 3 0 013-2h5z',
  learn:'M12 3a9 9 0 100 18 9 9 0 000-18zM10 8l6 4-6 4z', portfolio:'M3 8h18v12H3zM9 8V4h6v4M3 13h18', path:'M12 3a9 9 0 100 18 9 9 0 000-18zM16 8l-2 6-6 2 2-6z',
  memory:'M12 4a4 4 0 00-4 4 4 4 0 000 8 4 4 0 008 0 4 4 0 000-8 4 4 0 00-4-4zM12 4v16', theme:'M20 14A8 8 0 0110 4a8 8 0 1010 10z' };
const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;
const VIEWS = { chat:'Agent', studies:'Studies', learn:'Learn', portfolio:'Portfolio', path:'Path', memory:'Memory' };

const blankIntro = () => ({ step:1, name:'', level:'', goalId:'', hours:6, exams:false, answers:{}, goals:[], questions:[], loading:true, error:'', saving:false });
const blankChat = () => ({ messages:[], suggestions:[], loaded:false, loading:false, sending:false, error:'', draft:'' });
let view = '', arg = '', session = null, intro = blankIntro(), chat = blankChat();
let task = null, taskId = '', taskBusy = false, taskError = '', work = '', explanation = '', saveTimer, saveNote = '';
let page = { data:null, loading:false, error:'', busy:false }, proof = null, notes = '', nav = 0, armed = '', pane = 'chat';

/* theme preference stays in this browser */
const store = { get(){ try { return localStorage.getItem('theme'); } catch { return null; } }, set(v){ try { localStorage.setItem('theme', v); } catch {} } };
if (store.get()) document.documentElement.dataset.theme = store.get();

const go = hash => { if (location.hash === hash) route(); else location.hash = hash; };
async function route() {
  const [v, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  view = v; arg = decodeURIComponent(rest.join('/')); const n = ++nav; armed = '';
  window.scrollTo(0, 0);
  if (!v) return render();
  if (v !== 'start' && !VIEWS[v]) return go('#');
  if (!session) {
    page = { data:null, loading:true, error:'' }; renderGate();
    try { const s = await API.session(); if (n !== nav) return; session = s; }
    catch (e) { if (n === nav) { page = { loading:false, error:e.message }; renderGate(); } return; }
  }
  if (!session.onboarded && v !== 'start') return go('#start');
  if (v === 'start') { if (session.onboarded) return go('#chat'); render(); return loadIntro(n); }
  page = { data:null, loading: v !== 'chat', error:'', busy:false }; proof = null;
  render();
  if (v === 'chat') { if (!chat.loaded) loadChat(); if (taskId && !task) loadTask(); return; }
  loadPage(n);
}
async function loadPage(n = nav) {
  const calls = { studies: API.topics, learn: API.courses, portfolio: API.portfolio, path: API.path, memory: API.memory };
  page.loading = true; page.error = ''; render();
  try {
    const data = await calls[view]();
    if (n !== nav) return; page.data = data;
    if (view === 'learn' && arg) {
      const course = list(data.courses).find(c => String(c.id) === arg);
      if (!course) throw new Error('That course was not found.');
      const quiz = await API.quiz(arg); if (n !== nav) return;
      proof = { course, questions:list(quiz.questions), minWords:Number(quiz.minWords) || 0, answers:{}, note:'', link:'', file:null, result:null, error:'' };
    }
  } catch (e) { if (n !== nav) return; page.error = e.message; }
  page.loading = false; render();
}

/* landing */
const FLOW = [['', 'You share what you are studying.'], ['reader', 'I pick out the skills in your lesson.'], ['client', 'I turn those skills into a practical problem.'],
  ['', 'You work on a solution.'], ['reviewer', 'I check your work and show what to improve.'], ['scout', 'I recommend where to learn what you are missing.'], ['mentor', 'I use your progress and feedback to plan what comes next.']];
let playing = 0;
async function play() {
  const run = ++playing, log = $('#lp-log'), still = matchMedia('(prefers-reduced-motion:reduce)').matches; if (!log) return; log.innerHTML = '';
  for (const [k, text] of FLOW) {
    if (run !== playing || !log.isConnected) return;
    log.insertAdjacentHTML('beforeend', k ? `<div class="msg new">${av(k)}<div class="body"><span class="who">${esc(agent(k).name)}</span><div class="bubble"><p>${text}</p></div></div></div>` : `<div class="msg me new"><div class="body"><div class="bubble"><p>${text}</p></div></div></div>`);
    log.scrollTop = log.scrollHeight;
    if (!still) await new Promise(r => setTimeout(r, 1200));
  }
  if (still) log.scrollTop = 0;
}
function landing() {
  const go2 = (c = '') => btn('Get started', 'open', '', 'lp-cta ' + c);
  const jump = (id, t) => btn(t, 'jump', id, 'lp-links');
  const steps = [['Share','Tell the agent what you studied and what you want to try.','#ffc53d'],['Practise','Solve a task framed as a request from a client.','#ff8a65'],['Improve','Get feedback and hints, then try again.','#ff5c7a'],['Learn','Study a recommended course and answer questions on it.','#8a3ff0'],['Show','Build a portfolio from your work and proof of learning.','#0fbf93']];
  return `<div id="landing"><div class="lp-hero"><nav class="lp-w lp-nav" aria-label="Main"><span class="logo" aria-hidden="true">${esc(C.appName[0])}</span><strong>${esc(C.appName)}</strong>${jump('how','How it works')}${jump('agents','Agents')}${jump('data','Your data')}<button data-a="theme" aria-label="Light or dark">${svg('theme')}</button>${go2()}</nav>
  <div class="lp-w lp-split"><div><h1>Turn this week’s lecture into work practice</h1><p class="lp-lead">An AI agent for computer science students. It gives you realistic tasks, coaches you through them and helps you discover where you want to go.</p><div class="row">${go2('lp-big')}${btn('See how it works','jump','how','lp-big')}</div></div>
  <div class="lp-demo"><header><b>How your agent team works</b>${btn('Replay','replay')}</header><div id="lp-log"></div></div></div></div>
  <main>
  <section class="lp-w lp-sec"><h2>Knowing the theory is only the start</h2><p>Class exercises often name the method to use. Work usually starts with a problem, and you decide which method fits.</p><div class="lp-two" style="margin-top:1.4rem"><div class="lp-box"><p class="muted">In class</p><p class="lp-quote">Apply the concept you have just been taught to a set exercise.</p></div><div class="lp-box warm"><p>In practice</p><p class="lp-quote">Understand a need, choose an approach, deliver a solution and explain your decisions.</p></div></div></section>
  <section class="lp-w lp-sec" id="how"><h2>From lecture to portfolio</h2><ol class="lp-steps">${steps.map(([h, t, c]) => `<li style="--c:${c}"><h3>${h}</h3><p>${t}</p></li>`).join('')}</ol></section>
  <section class="lp-w lp-sec" id="agents"><h2>A path that grows with you</h2><div class="lp-two" style="margin-top:1.4rem"><div class="lp-box"><h3>Guidance over time</h3><p>The agent considers your completed work and what you say you like before suggesting a direction.</p></div><div class="lp-box"><h3>Proof you can explain</h3><p>Your portfolio brings together practical work and learning, with a note on how each item was checked.</p></div></div></section>
  <section class="lp-w lp-sec" id="data"><h2>You control what the agent remembers</h2><p>See each memory and where it came from, pause memory, or delete it.</p></section>
  <div class="lp-w"><div class="lp-end"><h2>Start with what you are learning now</h2><p>Practise using it to solve a problem.</p>${go2('lp-big')}</div></div>
  </main><footer class="lp-w">© ${new Date().getFullYear()} ${esc(C.appName)}</footer></div>`;
}
function renderGate() {
  $('#root').innerHTML = `<div id="intro"><div class="onboard">${btn('Back to home','home')}${page.loading ? state('Loading your account…') : state(page.error, 'reload')}</div></div>`;
}

/* introduction */
async function loadIntro(n) {
  intro.loading = true; intro.error = ''; render();
  try { const [o, a] = await Promise.all([API.options(), API.assessment()]); if (n !== nav) return; intro.goals = list(o.goals); intro.questions = list(a.questions); }
  catch (e) { if (n !== nav) return; intro.error = e.message; intro.loadFailed = true; intro.loading = false; return render(); }
  intro.loading = false; intro.loadFailed = false; render();
}
function introView() {
  const I = intro, total = I.questions.length ? 3 : 2;
  const choice = (f, v, label, on) => `<button data-a="set" data-f="${f}" data-v="${esc(v)}" aria-pressed="${on}">${esc(label)}</button>`;
  let body = '';
  if (I.loading) body = state('Loading…');
  else if (I.loadFailed) body = state(I.error, 'reload');
  else {
    if (I.step === 1) body = `<h1>Practise your course on realistic work</h1><p class="muted">Your agent starts here. Tell it where you are now.</p><label for="name"><b>Your first name</b></label><p><input class="field" id="name" maxlength="60" autocomplete="given-name" value="${esc(I.name)}"></p>
      <fieldset><legend>Your experience</legend><div class="choices">${['Complete beginner','Some knowledge','Taken courses'].map(v => choice('level', v, v, I.level === v)).join('')}</div></fieldset>
      <fieldset><legend>Where do you want to go?</legend><div class="choices">${[{ id:'', label:'Not sure yet' }, ...I.goals].map(g => choice('goalId', g.id, g.label, String(I.goalId) === String(g.id))).join('')}</div></fieldset>`;
    if (I.step === 2) body = `<h1>Fit practice around school</h1><label for="hours"><b>Hours you can practise each week: <output id="hv">${I.hours}</output></b></label><p><input type="range" id="hours" min="1" max="30" value="${I.hours}"></p>
      <fieldset><legend>Are exams happening now?</legend><div class="choices">${choice('exams','no','No', !I.exams)}${choice('exams','yes','Yes, keep tasks light', I.exams)}</div></fieldset>`;
    if (I.step === 3) body = `<h1>Quick starting check</h1><p class="muted">It is fine not to know. This only picks your starting point.</p>${I.questions.map((q, i) => `<fieldset><legend>${esc(q.text)}</legend><div class="choices">${[...list(q.options), 'I don’t know yet'].map((o, j) => `<button data-a="answer" data-q="${i}" data-v="${j}" aria-pressed="${I.answers[i] === j}">${esc(o)}</button>`).join('')}</div></fieldset>`).join('')}`;
    const ready = I.step < 3 || Object.keys(I.answers).length === I.questions.length;
    body = `<div class="steps" aria-label="Step ${I.step} of ${total}">${Array.from({ length:total }, (_, i) => `<i class="${i < I.step ? 'on' : ''}"></i>`).join('')}</div>${body}
      ${I.error ? state(I.error) : ''}<div class="row">${I.step > 1 ? btn('Back','back') : ''}${I.step < total ? btn('Continue','next','','go') : btn(I.saving ? 'Saving…' : 'Meet my agent','finish','','go', !ready || I.saving)}${btn('Skip introduction','skip','','', I.saving)}</div>`;
  }
  return `<div id="intro"><div class="onboard">${btn('Back to home','home')}<br><br>${body}</div></div>`;
}
async function finishIntro(skipped) {
  const I = intro; I.saving = true; I.error = ''; render();
  const data = skipped ? { skipped:true } : { skipped:false, name:I.name.trim(), level:I.level || null, goalId:I.goalId || null, hoursPerWeek:I.hours, examsNow:I.exams,
    answers:I.questions.map((q, i) => ({ questionId:q.id, optionIndex: I.answers[i] < list(q.options).length ? I.answers[i] : null })) };
  try { await API.onboard(data); session = { ...session, onboarded:true }; chat = blankChat(); go('#chat'); }
  catch (e) { I.error = e.message; I.saving = false; render(); }
}

/* chat and workspace */
function absorb(r = {}) {
  const seen = new Set(chat.messages.map(m => m.id));
  chat.messages.push(...list(r.messages).filter(m => !seen.has(m.id)));
  if (r.suggestions !== undefined) chat.suggestions = list(r.suggestions);
  if (r.task && String(r.task.id) === String(taskId)) setTask(r.task);
}
async function loadChat() {
  chat.loading = true; chat.error = ''; render();
  try { const r = await API.messages(); chat.messages = []; absorb(r); chat.loaded = true; }
  catch (e) { chat.error = e.message; }
  chat.loading = false; render();
}
async function send(text, suggestionId) {
  if (chat.sending || !text) return;
  const temp = { id:`local-${Date.now()}`, role:'student', text };
  chat.messages.push(temp); chat.sending = true; chat.error = ''; if (!suggestionId) chat.draft = ''; render();
  try {
    const r = await API.send({ text, suggestionId: suggestionId || null, taskId: taskId || null });
    if (list(r.messages).some(m => m.role === 'student')) chat.messages = chat.messages.filter(m => m !== temp);
    absorb(r); if (r.openTaskId) openTask(r.openTaskId);
  } catch (e) { chat.messages = chat.messages.filter(m => m !== temp); if (!suggestionId) chat.draft = text; chat.error = e.message; }
  chat.sending = false; render();
}
function message(m) {
  if (m.role === 'student') return `<div class="msg me"><div class="body"><div class="bubble"><p>${esc(m.text)}</p></div></div></div>`;
  const plan = list(m.plan).length ? `<ol class="plan">${m.plan.map(p => `<li class="${p.status === 'done' ? 'done' : p.status === 'active' ? 'on' : ''}">${esc(p.label)}</li>`).join('')}</ol>` : '';
  const res = list(m.resources).map(r => `<div class="course">${link(r.url, r.title)}<span class="small muted">${esc(r.provider)}</span>${r.courseId ? btn('I studied this, test me','prove', r.courseId) : ''}</div>`).join('');
  const open = m.taskId ? `<div class="row">${btn('Open workspace','task', m.taskId, 'go')}</div>` : '';
  return `<div class="msg">${av(m.agent)}<div class="body"><span class="who">${esc(agent(m.agent).name)}</span><div class="bubble">${m.text ? `<p>${esc(m.text)}</p>` : ''}${plan}${res}${open}</div>${m.reason ? `<details><summary>Why this?</summary><span class="small muted">${esc(m.reason)}</span></details>` : ''}</div></div>${m.memoryNote ? `<div class="memo">Memory updated: ${esc(m.memoryNote)}</div>` : ''}`;
}
function setTask(t) {
  const fresh = !task || task.id !== t.id; task = t;
  if (fresh || t.work !== undefined) work = t.work ?? t.starterCode ?? '';
}
function openTask(id) { if (String(id) !== String(taskId)) { flushSave(); taskId = id; task = null; explanation = ''; saveNote = ''; } pane = 'side'; if (view !== 'chat') return go('#chat'); render(); if (!task) loadTask(); }
async function loadTask() {
  const id = taskId; taskError = ''; taskBusy = true; render();
  try { const t = await API.task(id); if (id !== taskId) return; setTask(t); } catch (e) { if (id !== taskId) return; taskError = e.message; }
  taskBusy = false; render();
}
function flushSave() {
  if (!saveTimer) return; clearTimeout(saveTimer); saveTimer = null;
  const id = taskId, text = work;
  API.saveWork(id, text).then(() => note(id, 'Saved'), e => note(id, `Not saved. ${e.message}`));
}
function note(id, text) { if (id !== taskId) return; saveNote = text; const el = $('#saved'); if (el) el.textContent = text; }
async function taskCall(fn) {
  if (taskBusy) return; clearTimeout(saveTimer); saveTimer = null; taskBusy = true; taskError = ''; render();
  const id = taskId, was = task.status;
  try { const r = await fn(id); absorb(r); if (id === taskId && r.task?.status === 'completed' && was !== 'completed') party(); }
  catch (e) { taskError = e.message; }
  taskBusy = false; render();
}
function workspace() {
  if (!taskId) return `<h2>Your workspace</h2>${state('When your agent gives you a task, it opens here.')}`;
  const head = `<div class="row" style="justify-content:space-between"><h2>Workspace</h2>${btn('Close','close')}</div>`;
  if (!task) return head + (taskError ? state(taskError, 'retrytask') : state('Loading the task…'));
  const t = task, req = list(t.requirements), done = t.status === 'completed', good = req.filter(r => r.status === 'passed').length;
  return `${head}<div class="card"><h3>${esc(t.title)}</h3>${t.from ? `<p class="small muted">${esc(t.from)}${t.minutes ? `, about ${esc(t.minutes)} minutes` : ''}</p>` : ''}<p class="pre">${esc(t.brief)}</p>${t.changeRequest ? `<p style="color:var(--rose)"><b>New request:</b> ${esc(t.changeRequest)}</p>` : ''}
  ${req.length ? `<div class="bar"><i style="width:${good / req.length * 100}%"></i></div><ul class="checks">${req.map(r => `<li class="${r.status === 'passed' ? 'ok' : r.status === 'failed' ? 'no' : ''}"><div>${esc(r.label)}<span class="sr">, ${esc(r.status || 'pending')}</span>${r.feedback ? `<br><span class="small muted">${esc(r.feedback)}</span>` : ''}</div></li>`).join('')}</ul>` : ''}</div>
  <label for="code"><b>Your work</b>${t.language ? ` <span class="muted small">${esc(t.language)}</span>` : ''}</label><textarea class="code" id="code" spellcheck="false" ${done || taskBusy ? 'readonly' : ''}>${esc(work)}</textarea><p class="small muted" id="saved" role="status">${esc(saveNote)}</p>
  ${taskError ? state(taskError) : ''}${done ? '<p style="color:var(--ok)"><b>Task completed.</b></p>' : `<div class="row">${btn(taskBusy ? 'Working…' : 'Check my work','check','','go', taskBusy)}${t.hintsRemaining === 0 ? '' : btn('Hint','hint','','', taskBusy)}</div>`}
  ${t.status === 'needs_explanation' ? `<div class="card" style="margin-top:.8rem"><label for="why"><b>${esc(t.question || 'Explain your choices.')}</b></label><p><textarea id="why" class="field" rows="4" style="width:100%">${esc(explanation)}</textarea></p>${btn('Submit explanation','explain','','go', taskBusy)}</div>` : ''}
  ${list(t.hints).map((h, i) => `<div class="card" style="margin-top:.6rem"><b>Hint ${i + 1}</b><p class="pre">${esc(h)}</p></div>`).join('')}`;
}
function chatView() {
  const log = chat.loading ? state('Loading your conversation…') : !chat.loaded && chat.error ? state(chat.error, 'retrychat')
    : (chat.messages.length ? chat.messages.map(message).join('') : state('Tell your agent what you studied this week.'))
    + (chat.sending ? '<p class="muted small" role="status">Your agent is working…</p>' : '') + (chat.error ? state(chat.error) : '');
  return `<div id="chatview" class="${taskId ? 'working' : ''}" data-pane="${pane}"><div class="tabs">${['chat','side'].map(p => `<button data-a="pane" data-v="${p}" aria-pressed="${pane === p}">${p === 'chat' ? 'Chat' : 'Workspace'}</button>`).join('')}</div>
  <aside class="col team" aria-label="Agent team"><h3>Agent team</h3>${Object.entries(C.agents).map(([k, a]) => `<div class="agent">${av(k)}<div><b>${esc(a.name)}</b><span class="muted small">${esc(a.role)}</span></div></div>`).join('')}</aside>
  <main class="chat"><div class="top"><h2>Your practice room</h2>${btn('Home','home','','lp-home')}</div><div id="log" role="log" aria-live="polite">${log}</div>
  <div class="chips">${chat.sending ? '' : chat.suggestions.map((s, i) => btn(esc(s.label),'suggest', i)).join('')}</div>
  <form id="form"><input id="say" autocomplete="off" aria-label="Message your agent" placeholder="Type a message to your agent" value="${esc(chat.draft)}"><button class="go" ${chat.sending || !chat.loaded ? 'disabled' : ''}>Send</button></form></main>
  <aside class="col side">${workspace()}</aside></div>`;
}

/* data pages */
function studies(d) {
  const t = list(d.topics);
  return `<h1>Your studies</h1><p class="muted">Tell your agent what was taught and turn it into practice.</p>${t.length ? `<div class="grid">${t.map(x => `<div class="card"><h2>${esc(x.title)}</h2><p class="muted">${esc(x.course)}</p><p>${list(x.skills).map(esc).join(', ')}</p><p class="small muted">${esc(x.status)}</p>${btn('Practise this','practise', x.id, 'go', page.busy)}</div>`).join('')}</div>` : state('No topics yet. Add your first one below.')}
  <div class="card"><label for="notes"><b>Add a topic or lecture notes</b></label><p><textarea id="notes" class="field" rows="5" style="width:100%" placeholder="Describe what was covered in class">${esc(notes)}</textarea></p>${page.actionError ? state(page.actionError) : ''}${btn(page.busy ? 'Sending…' : 'Send to my agent','addtopic','','go', page.busy)}</div>`;
}
function learn(d) {
  if (arg && proof) return proofView();
  const c = list(d.courses);
  return `<h1>Learn, then prove it</h1><p class="muted">Study a recommended course, answer questions and add your proof.</p>${c.length ? `<div class="grid">${c.map(x => `<div class="card"><h3>${esc(x.title)}</h3><p class="muted">${[x.topic, x.provider, x.duration, x.cost].filter(Boolean).map(esc).join(', ')}</p>${x.proven ? '<p style="color:var(--ok)"><b>In your portfolio</b></p>' : ''}<div class="row">${link(x.url, 'Open course')}${x.proven ? '' : btn('Prove what I learned','prove', x.id, 'go')}</div></div>`).join('')}</div>` : state('No course recommendations yet. Your agent adds them as you practise.')}`;
}
function proofView() {
  const p = proof, res = Object.fromEntries(list(p.result?.results).map(r => [r.questionId, r]));
  if (p.result?.passed) return `${btn('All courses','allcourses')}<h1 style="margin-top:1rem">Added to your portfolio</h1><div class="card"><h3>${esc(p.course.title)}</h3>${btn('View portfolio','view','portfolio','go')}</div>`;
  return `${btn('All courses','allcourses')}<h1 style="margin-top:1rem">Show what you learned</h1><p>${link(p.course.url, p.course.title)} <span class="muted">${esc(p.course.provider)}</span></p>
  ${p.questions.map((q, n) => `<div class="card" role="group" aria-label="Question ${n + 1}"><p><b>${n + 1}. ${esc(q.text)}</b></p><div class="choices">${list(q.options).map((o, j) => `<button data-a="quiz" data-q="${n}" data-v="${j}" aria-pressed="${p.answers[n] === j}">${esc(o)}</button>`).join('')}</div>${res[q.id] ? `<p style="color:var(${res[q.id].correct ? '--ok' : '--rose'})">${res[q.id].correct ? 'Correct.' : 'Not correct yet.'} ${esc(res[q.id].feedback)}</p>` : ''}</div>`).join('')}
  <div class="card"><label for="pnote"><b>What did you learn or build?</b>${p.minWords ? ` <span class="muted">At least ${p.minWords} words.</span>` : ''}</label><p><textarea id="pnote" class="field" rows="4" style="width:100%">${esc(p.note)}</textarea></p>
  <label for="plink"><b>Link to your work or certificate (optional)</b></label><p><input id="plink" class="field" type="url" style="width:100%" placeholder="https://" value="${esc(p.link)}"></p>
  <label for="pfile"><b>Attach a screenshot or certificate (optional)</b></label><p><input type="file" id="pfile" accept="image/*,.pdf"> <span class="small muted">${p.file ? 'Selected: ' + esc(p.file.name) : 'Image or PDF, up to 10 MB.'}</span></p>
  ${p.error ? state(p.error) : ''}${btn(page.busy ? 'Submitting…' : 'Submit proof','submit','','go', page.busy)}</div>`;
}
function portfolio(d) {
  const items = list(d.items);
  return `<h1>${d.name ? esc(d.name) + '’s portfolio' : 'Your portfolio'}</h1><p class="muted">Each item says how it was checked.</p>${page.actionError ? state(page.actionError) : ''}
  ${items.length ? `<p>${btn(page.busy ? 'Preparing…' : 'Download portfolio','export','','go', page.busy)}</p>${items.map(x => `<article class="card">${x.verification ? `<span class="tag">${esc(x.verification)}</span>` : ''}<h3>${esc(x.title)}</h3><p class="muted small">${[x.type, x.date].filter(Boolean).map(esc).join(', ')}</p><p class="pre">${esc(x.summary)}</p>${x.work ? `<details><summary>View the work</summary><pre>${esc(x.work)}</pre></details>` : ''}<div class="row">${x.link ? link(x.link, 'Proof link') : ''}${x.fileUrl ? link(x.fileUrl, 'Attached file') : ''}</div></article>`).join('')}` : state('No portfolio items yet. Complete a task or prove a course to add one.')}`;
}
function path(d) {
  const roles = list(d.roles);
  return `<h1>${esc(d.headline || 'Your path')}</h1><p class="muted">${esc(d.explanation)}</p>${d.goal ? `<p>Your stated goal: ${esc(d.goal)}</p>` : ''}${roles.length ? `<div class="grid">${roles.map(r => `<div class="card"><h3>${esc(r.name)}</h3><span class="small">Evidence from your work: ${pct(r.evidence)}%</span><div class="bar"><i style="width:${pct(r.evidence)}%"></i></div><span class="small">Interest: ${r.interest == null ? 'not known yet' : pct(r.interest) + '%'}</span><div class="bar" style="--c:var(--violet)"><i style="width:${pct(r.interest)}%"></i></div><p class="small muted">${esc(r.note)}</p></div>`).join('')}</div>` : state('There is not enough information to suggest a path yet.')}`;
}
function memory(d) {
  const m = list(d.items), off = page.busy;
  return `<h1>What your agent remembers</h1><p class="muted">Forget anything that is wrong.</p><div class="row" style="margin-bottom:1rem">${btn(d.paused ? 'Resume memory' : 'Pause memory','mpause','','', off)}${m.length ? btn(armed === 'wipe' ? 'Press again to delete all' : 'Forget everything','wipe','','', off) : ''}<span>${d.paused ? 'Memory is paused.' : ''}</span></div>${page.actionError ? state(page.actionError) : ''}
  ${m.length ? m.map(x => `<div class="card mem"><div><b>${esc(x.text)}</b><br><span class="muted small">Source: ${esc(x.source)}</span></div>${btn('Forget','forget', x.id, '', off)}</div>`).join('') : state('Nothing remembered yet.')}`;
}

function render() {
  const root = $('#root');
  if (!view) { root.innerHTML = landing(); play(); return; }
  if (view === 'start') { root.innerHTML = introView(); return; }
  if (!session) return renderGate();
  const keep = document.activeElement, keepId = keep?.id, a = keep?.dataset?.a, v = keep?.dataset?.v, q = keep?.dataset?.q, sel = keep?.selectionStart;
  const scroll = [$('#page'), $('.side')].map(e => e?.scrollTop || 0);
  const pages = { studies, learn, portfolio, path, memory };
  root.innerHTML = `<div class="app"><nav class="rail" aria-label="App"><button class="logo" data-a="home" aria-label="Home">${esc(C.appName[0])}</button>${Object.entries(VIEWS).map(([k, n]) => `<button data-a="view" data-v="${k}" ${view === k ? 'aria-current="page"' : ''}>${svg(k)}${n}</button>`).join('')}<button class="end" data-a="theme">${svg('theme')}Theme</button></nav>
  ${view === 'chat' ? chatView() : `<main class="page" id="page"><div>${page.loading ? state('Loading…') : page.error ? state(page.error, 'retrypage') : page.data ? pages[view](page.data) : ''}</div></main>`}</div>`;
  const log = $('#log'); if (log) log.scrollTop = log.scrollHeight;
  [$('#page'), $('.side')].forEach((e, i) => { if (e) e.scrollTop = scroll[i]; });
  const again = keepId ? document.getElementById(keepId) : a ? $(`[data-a="${a}"][data-v="${CSS.escape(v || '')}"]${q ? `[data-q="${q}"]` : ''}`) : null;
  if (again) { again.focus({ preventScroll:true }); if (sel != null) try { again.setSelectionRange(sel, sel); } catch {} }
}
function party() {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  for (let i = 0; i < 70; i++) { const e = document.createElement('i'); e.className = 'confetti'; e.style.left = Math.random() * 100 + 'vw'; e.style.background = ['#ffc53d','#ff5c7a','#0fbf93','#8a3ff0'][i % 4]; e.style.animationDelay = Math.random() * .5 + 's'; document.body.appendChild(e); setTimeout(() => e.remove(), 2500); }
}
/* runs a change on a data page, then reloads it */
async function pageAction(fn, reload = true) {
  if (page.busy) return; const n = nav; page.busy = true; page.actionError = ''; render();
  try { await fn(); if (n !== nav) return; if (reload) page.data = await ({ studies:API.topics, memory:API.memory }[view])(); }
  catch (e) { if (n !== nav) return; page.actionError = e.message; }
  if (n !== nav) return; page.busy = false; render();
}
async function submitProof() {
  const p = proof; p.error = '';
  p.error = Object.keys(p.answers).length < p.questions.length ? 'Answer every question.'
    : words(p.note) < p.minWords ? `Write at least ${p.minWords} words.`
    : p.link && !/^https?:\/\//i.test(p.link) ? 'Use a full link that starts with https://.'
    : p.file && p.file.size > 10 * 1024 * 1024 ? 'Choose a file smaller than 10 MB.' : '';
  if (p.error) return render();
  const f = new FormData();
  f.append('answers', JSON.stringify(p.questions.map((q, i) => ({ questionId:q.id, optionIndex:p.answers[i] }))));
  f.append('note', p.note.trim()); f.append('link', p.link); if (p.file) f.append('file', p.file);
  page.busy = true; render();
  try { const r = await API.proof(p.course.id, f); p.result = r; absorb(r); if (r.passed) party(); else if (!list(r.results).length) p.error = 'Your proof was not accepted yet.'; }
  catch (e) { p.error = e.message; }
  page.busy = false; render();
}
async function exportFolio() {
  const res = await API.exportFolio(), blob = await res.blob();
  const name = /filename="?([^";]+)"?/i.exec(res.headers.get('content-disposition') || '')?.[1] || 'portfolio.pdf';
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const ACT = {
  home: () => go('#'), open: () => go('#chat'), view: v => go('#' + v),
  jump: v => document.getElementById(v)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' }),
  theme: () => { const r = document.documentElement; r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark'; store.set(r.dataset.theme); },
  reload: () => route(), replay: () => play(),
  set: (v, d) => { intro[d.f] = d.f === 'exams' ? v === 'yes' : v; render(); $(`[data-f="${d.f}"][data-v="${CSS.escape(v)}"]`)?.focus(); },
  answer: (v, d) => { intro.answers[d.q] = +v; const top = $('#intro').scrollTop; render(); $('#intro').scrollTop = top; $(`[data-q="${d.q}"][data-v="${v}"]`)?.focus({ preventScroll:true }); },
  next: () => { intro.step++; render(); }, back: () => { intro.step--; render(); },
  finish: () => finishIntro(false), skip: () => finishIntro(true),
  pane: v => { pane = v; render(); }, suggest: v => { const s = chat.suggestions[v]; if (!s) return; if (VIEWS[s.view]) return go('#' + s.view); send(s.label, s.id); },
  task: v => openTask(v), close: () => { flushSave(); taskId = ''; task = null; pane = 'chat'; render(); },
  retrychat: () => loadChat(), retrytask: () => loadTask(), retrypage: () => loadPage(),
  check: () => taskCall(id => API.checkWork(id, work)),
  hint: () => taskCall(async id => { await API.saveWork(id, work); return API.hint(id); }),
  explain: () => { if (!explanation.trim()) { taskError = 'Write your explanation first.'; return render(); } taskCall(id => API.explain(id, explanation.trim())); },
  practise: v => pageAction(async () => { const r = await API.startTask(v); if (!chat.loaded) chat.messages = []; absorb(r); chat.loaded = false; if (r.taskId) openTask(r.taskId); else go('#chat'); }, false),
  addtopic: () => { if (!notes.trim()) { page.actionError = 'Add a topic or notes first.'; return render(); } pageAction(async () => { absorb(await API.addTopic(notes.trim())); notes = ''; chat.loaded = false; }); },
  prove: v => go('#learn/' + encodeURIComponent(v)), allcourses: () => go('#learn'),
  quiz: (v, d) => { proof.answers[d.q] = +v; proof.result = null; proof.error = ''; render(); }, submit: () => submitProof(),
  export: () => pageAction(exportFolio, false),
  mpause: () => pageAction(() => API.pauseMemory(!page.data.paused)),
  forget: v => pageAction(() => API.forget(v)),
  wipe: () => { if (armed !== 'wipe') { armed = 'wipe'; render(); setTimeout(() => { if (armed === 'wipe') { armed = ''; render(); } }, 3000); return; } armed = ''; pageAction(() => API.forgetAll()); }
};
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) ACT[b.dataset.a]?.(b.dataset.v, b.dataset); });
document.addEventListener('input', e => {
  const { id, value } = e.target;
  if (id === 'name') intro.name = value;
  if (id === 'hours') { intro.hours = +value; $('#hv').textContent = value; }
  if (id === 'say') chat.draft = value;
  if (id === 'notes') notes = value;
  if (id === 'why') explanation = value;
  if (id === 'pnote') proof.note = value;
  if (id === 'plink') proof.link = value.trim();
  if (id === 'code') { work = value; if (task) task.work = value; note(taskId, 'Saving…'); clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 900); }
});
document.addEventListener('change', e => { if (e.target.id === 'pfile') { proof.file = e.target.files[0] || null; render(); } });
document.addEventListener('submit', e => { e.preventDefault(); if (e.target.id === 'form' && chat.loaded) send(chat.draft.trim()); });
window.addEventListener('hashchange', () => { flushSave(); route(); });
window.addEventListener('pagehide', flushSave);
route();
})();
