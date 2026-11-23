/* =========================================================
   NerdLume — practice.js
   Engine: Quiz · Mock Test · Flash Cards
   ========================================================= */

/* ── URL params ────────────────────────────────────────────── */
const QP = new URLSearchParams(location.search);
const CFG = {
  mode  : QP.get('mode')   || 'quiz',
  syl   : QP.get('syl')    || 'Full+Syllabus',
  diff  : QP.get('diff')   || 'medium',
  count : Math.min(50, Math.max(10, parseInt(QP.get('count') || '10'))),
  topic : decodeURIComponent(QP.get('topic') || 'General Studies'),
};

/* ── State ─────────────────────────────────────────────────── */
const S = {
  qs        : [],      // questions/cards array
  cur       : 0,      // current index
  answers   : {},     // { index → answer }
  status    : {},     // { index → 'correct'|'wrong'|'skipped' }
  fcKnew    : {},     // flashcard: 'got'|'meh'|'nope'
  fcFlipped : {},     // flashcard: bool
  submitted : false,
  startMs   : Date.now(),
  timerLeft : 0,
  timerTick : null,
};

/* ════════════════════════════════════════════════════════════
   QUESTION BANK
════════════════════════════════════════════════════════════ */

const CASE_CTX = `Meena is a 3rd-year engineering student building a college event management app for 5,000 users.
The app needs user authentication, event registration, real-time seat availability, and email notifications.
She has 3 weeks before the event and is choosing between SQL (PostgreSQL) and NoSQL (MongoDB) for the backend,
and must decide whether to use REST or GraphQL for the API layer.`.trim();

const MCQ_BANK = [
  { q:`Which data structure gives O(log n) search, insert, and delete?`, opts:['Linked List','Binary Heap','Balanced BST','Hash Table'], ans:2 },
  { q:`What does HTTP status code 403 mean?`, opts:['Not Found','Internal Server Error','Forbidden','Bad Request'], ans:2 },
  { q:`Which sorting algorithm is best for nearly-sorted data?`, opts:['Merge Sort','Quick Sort','Insertion Sort','Heap Sort'], ans:2 },
  { q:`In OOP, what prevents direct access to class internals?`, opts:['Inheritance','Polymorphism','Encapsulation','Abstraction'], ans:2 },
  { q:`What does ACID stand for in databases?`, opts:['Atomicity,Consistency,Isolation,Durability','Access,Control,Index,Data','Atomic,Correct,Isolated,Durable','Availability,Concurrency,Integration,Delivery'], ans:0 },
  { q:`Which HTTP method is idempotent but NOT safe?`, opts:['GET','POST','PUT','HEAD'], ans:2 },
  { q:`What is the worst-case time complexity of Quick Sort?`, opts:['O(n log n)','O(n²)','O(n)','O(log n)'], ans:1 },
  { q:`Which OSI layer handles end-to-end communication?`, opts:['Network','Data Link','Transport','Session'], ans:2 },
  { q:`What does DNS do?`, opts:['Encrypts packets','Translates domain names to IP addresses','Manages HTTP sessions','Assigns MAC addresses'], ans:1 },
  { q:`In relational databases, what is a foreign key?`, opts:['Primary identifier of a table','A key that links two tables via referential integrity','An encrypted index','A composite key'], ans:1 },
  { q:`What is the purpose of a semaphore in OS?`, opts:['To schedule CPU tasks','To manage file systems','To control access to shared resources','To encrypt memory'], ans:2 },
  { q:`Which algorithm finds the shortest path in a weighted graph?`, opts:['BFS','DFS','Dijkstra\'s','Kruskal\'s'], ans:2 },
  { q:`What is tail recursion?`, opts:['Recursion with no base case','A recursive call as the last operation in a function','Recursion using stacks','Recursion with multiple base cases'], ans:1 },
  { q:`What does "idempotent" mean in REST APIs?`, opts:['Returns the same response format always','Multiple identical requests produce the same result','The request never fails','The API is stateless'], ans:1 },
  { q:`Which memory area stores local variables in a function call?`, opts:['Heap','Global Segment','Stack','Register'], ans:2 },
];

const MSQ_BANK = [
  { q:`Which of the following are properties of a RESTful API? (Select ALL that apply)`, opts:['Stateless communication','Uses only XML for data','Client–server architecture','Supports caching','Requires persistent connections'], ans:[0,2,3] },
  { q:`Which are valid HTTP 4xx client error codes? (Select ALL that apply)`, opts:['200 OK','400 Bad Request','401 Unauthorized','403 Forbidden','500 Internal Server Error'], ans:[1,2,3] },
  { q:`Select ALL characteristics of a Binary Search Tree:`, opts:['Left subtree values are less than root','Right subtree values are greater than root','All nodes must have exactly two children','In-order traversal produces sorted output','Duplicate keys are generally not allowed'], ans:[0,1,3,4] },
  { q:`Which of the following are ACID properties of a database? (Select ALL that apply)`, opts:['Atomicity','Availability','Consistency','Isolation','Durability'], ans:[0,2,3,4] },
  { q:`Which operations does a stack support? (Select ALL that apply)`, opts:['Push','Enqueue','Pop','Peek','Dequeue'], ans:[0,2,3] },
  { q:`Which of the following contribute to a deadlock? (Select ALL)`, opts:['Mutual Exclusion','Round-robin scheduling','Hold and Wait','No Preemption','Circular Wait'], ans:[0,2,3,4] },
];

const TXT_BANK = [
  { q:`Explain memoization and give a use case where it significantly improves performance.`, model:`Memoization caches the results of expensive function calls and returns the cached result when the same inputs occur again. Classic use case: Fibonacci numbers — without memoization, fib(40) requires ~2 billion recursive calls; with memoization, just 40. It converts exponential O(2ⁿ) time to linear O(n).` },
  { q:`What is the difference between a process and a thread?`, model:`A process is an independent program execution with its own memory space, file handles, and resources. A thread is a lightweight unit of execution within a process — threads share the same memory space, making communication faster but requiring synchronization to avoid race conditions.` },
  { q:`Briefly explain the CAP theorem.`, model:`CAP theorem states a distributed system can guarantee only 2 of 3: Consistency (all nodes see same data simultaneously), Availability (every request receives a response), and Partition Tolerance (system continues despite network failures). In practice, partition tolerance is required, so systems trade off between CP (e.g., HBase) or AP (e.g., Cassandra).` },
  { q:`Describe the difference between stack and heap memory.`, model:`Stack memory is statically allocated, LIFO-based, and stores local variables and function call frames — it is fast and managed automatically. Heap memory is dynamically allocated at runtime (malloc/new), larger, but slower and must be manually freed or managed by garbage collection.` },
  { q:`What is virtual memory and why is it useful?`, model:`Virtual memory is a memory management technique that gives each process the illusion of a large, private address space by using disk storage to extend RAM. It enables running programs larger than physical RAM, provides isolation between processes, and simplifies memory management via paging or segmentation.` },
];

const FLASH_BANK = [
  { q:'What is Big-O notation?',            a:'Big-O describes the upper bound of an algorithm\'s growth rate as input size increases. It characterizes worst-case performance — O(n) means linear growth, O(n²) quadratic, O(log n) logarithmic.' },
  { q:'Define polymorphism in OOP.',         a:'Polymorphism lets objects of different classes be treated via a common interface. Achieved through method overriding (runtime) and overloading (compile-time). Enables writing generic, reusable code.' },
  { q:'What is a hash collision?',           a:'Occurs when two different keys produce the same hash value. Resolved via chaining (linked list at each bucket) or open addressing (linear/quadratic probing to find next empty slot).' },
  { q:'TCP vs UDP — key differences?',       a:'TCP: connection-oriented, reliable, ordered, slower. UDP: connectionless, no delivery guarantee, faster. TCP → web, email. UDP → video streaming, gaming, DNS.' },
  { q:'What is a deadlock in OS?',           a:'Deadlock: two or more processes blocked forever, each waiting for a resource held by another. Four conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait. All four must hold simultaneously.' },
  { q:'Define database normalization.',       a:'Organizing a DB to reduce redundancy and improve data integrity by decomposing tables and applying normal forms: 1NF (no repeating groups), 2NF (full functional dependency), 3NF (no transitive dependency), BCNF.' },
  { q:'What is a Binary Search Tree?',       a:'BST: each node\'s left subtree has keys less than the node, right subtree has keys greater. In-order traversal yields sorted output. Average O(log n) operations; worst O(n) if unbalanced.' },
  { q:'Explain recursion and its requirements.', a:'A function calling itself to solve a smaller sub-problem. Requires: (1) a base case that terminates recursion, (2) a recursive case that moves toward the base case. Managed via call stack — deep recursion can cause stack overflow.' },
  { q:'What is a semaphore?',                a:'Synchronization primitive for controlling shared resource access. Binary semaphore (0 or 1) acts as mutex. Counting semaphore allows N concurrent accesses. Operations: wait (P) and signal (V).' },
  { q:'What is encapsulation in OOP?',       a:'Bundling data (attributes) and methods into a single class while restricting direct access using access modifiers (private, protected, public). Hides implementation details and exposes only a clean interface.' },
  { q:'What is virtual memory?',             a:'A memory management technique using disk storage to extend RAM, giving each process its own virtual address space. Implemented via paging — OS maps virtual pages to physical frames, swapping as needed.' },
  { q:'Explain the CAP theorem.',            a:'A distributed system can guarantee only 2 of 3: Consistency, Availability, Partition Tolerance. Since network partitions are unavoidable, systems choose CP (consistent + partition-tolerant) or AP (available + partition-tolerant).' },
  { q:'What is a race condition?',           a:'A race condition occurs when output depends on uncontrollable timing of concurrent threads accessing shared data. Example: two threads reading and writing a counter simultaneously. Prevented with mutexes, semaphores, or atomic operations.' },
  { q:'Abstract class vs Interface?',        a:'Abstract class: can have concrete methods, instance variables, constructors — single inheritance. Interface: only abstract methods (Java 7) or default/static (Java 8+), no state, supports multiple implementation. Abstract class for "is-a"; interface for "can-do".' },
  { q:'What is memoization?',                a:'Caching technique that stores results of expensive function calls. If same inputs occur again, return cached result. Converts exponential recursion (e.g., fib: O(2ⁿ)) to linear O(n). Core to dynamic programming.' },
  { q:'Define a Queue and its operations.',  a:'Queue: FIFO (First In First Out). Operations: enqueue (add to rear), dequeue (remove from front), peek (view front), isEmpty. Used in BFS, CPU scheduling, print spooling.' },
  { q:'What is an index in a database?',     a:'A data structure (B-tree or hash) that speeds up data retrieval by allowing the DB to locate rows without scanning every record. Tradeoff: faster reads, slower writes, more storage. Types: clustered (determines physical order) vs non-clustered.' },
  { q:'Explain divide and conquer.',         a:'Algorithm paradigm: recursively split problem into smaller sub-problems, solve independently, combine results. Examples: Merge Sort O(n log n), Quick Sort, Binary Search O(log n), Strassen\'s matrix multiplication.' },
  { q:'What is the OSI model?',              a:'7-layer network model: Physical, Data Link, Network, Transport, Session, Presentation, Application. Each layer handles specific networking functions. TCP/IP collapses it to 4 layers: Link, Internet, Transport, Application.' },
  { q:'What is a stack overflow?',           a:'Occurs when the call stack exceeds its size limit, typically due to infinite or extremely deep recursion. Each function call adds a frame to the stack; without proper base cases or tail-call optimization, the stack fills up and the program crashes.' },
];

function buildQuestion(i, mode, syl, diff) {
  const DIFFS = ['easy','medium','hard'];
  const actualDiff = diff === 'mixed' ? DIFFS[i % 3] : diff;
  const isCase = (syl === 'Case+Study' || syl === 'Case Study') && (i % 3 === 0);

  // Rotate types: MCQ heavy, some MSQ and text
  const typeSeq = ['mcq','mcq','mcq','msq','text','mcq','mcq','msq','text','mcq'];
  const type = typeSeq[i % typeSeq.length];

  let data = {};
  if (type === 'mcq') {
    const src = MCQ_BANK[i % MCQ_BANK.length];
    data = { type:'mcq', text: isCase?`[Case Study] Based on the scenario above — ${src.q}`:src.q, opts:src.opts, ans:src.ans };
  } else if (type === 'msq') {
    const src = MSQ_BANK[i % MSQ_BANK.length];
    data = { type:'msq', text: isCase?`[Case Study] ${src.q}`:src.q, opts:src.opts, ans:src.ans };
  } else {
    const src = TXT_BANK[i % TXT_BANK.length];
    data = { type:'text', text: isCase?`[Case Study] ${src.q}`:src.q, model:src.model };
  }

  const markMap  = {easy:1, medium:2, hard:3};
  const negMap   = {easy:0, medium: mode==='mock'?-.5:0, hard: mode==='mock'?-1:0};

  return {
    id   : i+1,
    ...data,
    diff : actualDiff,
    marks: markMap[actualDiff] || 2,
    neg  : negMap[actualDiff] || 0,
    isCase,
    sylTag: syl.includes('PYQ') ? `PYQ ${2019+(i%6)}` : syl.replace('+',' '),
    topic: CFG.topic,
  };
}

/* ════════════════════════════════════════════════════════════
   QUIZ / MOCK ENGINE
════════════════════════════════════════════════════════════ */

function initQM() {
  // ── Try loading AI-generated questions from localStorage ──────────────────
  let aiLoaded = false;
  try {
    const stored = localStorage.getItem('nb_practice_data');
    if (stored) {
      const pd = JSON.parse(stored);
      // Use stored questions if mode & topic roughly match URL params
      const modeMatch  = !CFG.mode || pd.mode === CFG.mode || pd.practiceType?.toLowerCase().includes(CFG.mode);
      const topicMatch = !CFG.topic || pd.topic === CFG.topic || CFG.topic === 'General Studies';
      if (modeMatch && topicMatch && Array.isArray(pd.questions) && pd.questions.length > 0) {
        S.qs = pd.questions.slice(0, CFG.count);
        aiLoaded = true;
        // Show AI provider badge if present
        const badge = document.getElementById('ai-provider-badge');
        if (badge && pd.provider) badge.textContent = `${pd.provider}`;
      }
    }
  } catch (e) { /* ignore */ }

  // ── Fallback to static question bank ─────────────────────────────────────
  if (!aiLoaded) {
    S.qs = Array.from({length: CFG.count}, (_,i) => buildQuestion(i, CFG.mode, CFG.syl, CFG.diff));
  }

  S.cur       = 0;
  S.answers   = {};
  S.status    = {};
  S.submitted = false;
  S.startMs   = Date.now();

  // Set page title / badge
  const badge = document.getElementById('ph-badge');
  if (badge) { badge.textContent = CFG.mode === 'mock' ? 'Mock Test' : 'Quiz'; badge.className = `ph-mode-badge ${CFG.mode}`; }

  const topicEl = document.getElementById('ph-topic');
  if (topicEl) topicEl.textContent = CFG.topic;

  // Timer (mock only)
  if (CFG.mode === 'mock') {
    S.timerLeft = CFG.count * 90; // 90s per question
    updateTimer();
    S.timerTick = setInterval(() => { S.timerLeft--; updateTimer(); if (S.timerLeft <= 0) { clearInterval(S.timerTick); doSubmit(true); } }, 1000);
  }

  buildNav();
  renderQ(0);
  updateProgress();
}


function updateTimer() {
  const el = document.getElementById('ph-timer');
  if (!el) return;
  const m = String(Math.floor(S.timerLeft/60)).padStart(2,'0');
  const s = String(S.timerLeft%60).padStart(2,'0');
  el.textContent = `⏱ ${m}:${s}`;
  el.className = 'ph-timer' + (S.timerLeft < 300 ? ' warn' : '') + (S.timerLeft < 60 ? ' danger' : '');
}

/* Nav grid */
function buildNav() {
  const g = document.getElementById('qnav-grid');
  if (!g) return;
  g.innerHTML = S.qs.map((_,i) => `<div class="qnb${i===0?' cur':''}" id="qnb${i}" onclick="jumpTo(${i})">${i+1}</div>`).join('');
}

function refreshNav() {
  S.qs.forEach((_,i) => {
    const el = document.getElementById('qnb'+i);
    if (!el) return;
    el.className = 'qnb';
    if (i === S.cur) el.classList.add('cur');
    else if (S.status[i] === 'correct')  el.classList.add('correct');
    else if (S.status[i] === 'wrong')    el.classList.add('wrong');
    else if (S.status[i] === 'skipped')  el.classList.add('skipped');
    else if (S.answers[i] !== undefined) el.classList.add('answered');
  });
  // stats
  const answered = Object.keys(S.answers).filter(k => S.answers[k] !== undefined && S.answers[k] !== '').length;
  const el1 = document.getElementById('qns-answered'); if (el1) el1.textContent = answered;
  const el2 = document.getElementById('qns-remain');   if (el2) el2.textContent = CFG.count - answered;
}

function jumpTo(i) {
  if (S.submitted) return;
  S.cur = i;
  renderQ(i);
  updateProgress();
  refreshNav();
}

/* Render question */
function renderQ(i) {
  const q   = S.qs[i];
  const ans = S.answers[i];
  const area = document.getElementById('q-area');
  if (!area) return;

  const caseHTML = q.isCase ? `<div class="q-case-box"><div class="q-case-lbl">Case Study Context</div><div class="q-case-body">${CASE_CTX}</div></div>` : '';

  const typeLabels = {mcq:'MCQ — Single Correct',msq:'MSQ — Multiple Select',text:'Text / Short Answer'};

  let optsHTML = '';
  if (q.type === 'mcq') {
    optsHTML = `<div class="q-sub-lbl">Choose exactly one answer</div><div class="q-opts">`
      + q.opts.map((o,oi) => {
          const sel = ans === oi;
          return `<button class="q-opt${sel?' sel-mcq':''}" onclick="pickMCQ(${i},${oi})">
            <div class="q-ind">${String.fromCharCode(65+oi)}</div><div>${o}</div></button>`;
        }).join('') + `</div>`;
  } else if (q.type === 'msq') {
    const selArr = Array.isArray(ans) ? ans : [];
    optsHTML = `<div class="q-sub-lbl">Select all correct answers</div><div class="q-opts msq-mode">`
      + q.opts.map((o,oi) => {
          const sel = selArr.includes(oi);
          return `<button class="q-opt${sel?' sel-msq':''}" onclick="pickMSQ(${i},${oi})">
            <div class="q-ind">${sel?'✓':String.fromCharCode(65+oi)}</div><div>${o}</div></button>`;
        }).join('') + `</div>`;
  } else {
    optsHTML = `<div class="q-sub-lbl">Write your answer below</div>
      <textarea class="q-textinput" id="ta${i}" placeholder="Type your answer here…"
        oninput="saveText(${i},this.value)" rows="4">${ans||''}</textarea>
      ${CFG.mode==='quiz' ? `<div class="q-feedback info" id="qf${i}" style="display:block;margin-top:10px;">
        This is a text question — write your understanding. Model answer shown after submission.</div>` : ''}`;
  }

  const markStr = `[${q.marks} mark${q.marks>1?'s':''}${q.neg?` | ${q.neg} neg`:''}]`;
  const pyqTag  = CFG.syl.includes('PYQ') ? ` · ${q.sylTag}` : '';

  area.innerHTML = `
    ${caseHTML}
    <div class="q-card">
      <div class="q-meta">
        <span class="q-num-lbl">Question ${i+1} / ${CFG.count}</span>
        <span class="q-type-tag ${q.type}">${typeLabels[q.type]}</span>
        <span class="q-diff-tag ${q.diff}">${q.diff}${pyqTag}</span>
        <span class="q-marks">${markStr}</span>
      </div>
      <div class="q-text">${q.text}</div>
      ${optsHTML}
      <div class="q-feedback" id="qfb${i}"></div>
    </div>`;
}

/* Answer pickers */
function pickMCQ(qi, oi) {
  if (S.submitted) return;
  S.answers[qi] = oi;
  refreshNav(); renderQ(qi); updateProgress();
}
function pickMSQ(qi, oi) {
  if (S.submitted) return;
  let arr = Array.isArray(S.answers[qi]) ? [...S.answers[qi]] : [];
  const idx = arr.indexOf(oi);
  idx === -1 ? arr.push(oi) : arr.splice(idx,1);
  S.answers[qi] = arr;
  refreshNav(); renderQ(qi); updateProgress();
}
function saveText(qi, val) {
  S.answers[qi] = val;
  refreshNav(); updateProgress();
}

/* Progress */
function updateProgress() {
  const answered = Object.keys(S.answers).filter(k => {
    const v = S.answers[k];
    return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length;
  const pct = Math.round(answered / CFG.count * 100);
  const fill = document.getElementById('qp-fill');
  const info = document.getElementById('qp-info');
  if (fill) { fill.style.width = pct+'%'; fill.className = `qp-fill ${CFG.mode}`; }
  if (info) info.textContent = `${answered} / ${CFG.count} answered · Q${S.cur+1} of ${CFG.count}`;
  refreshNav();
}

/* Navigation */
function prevQ() {
  if (S.cur > 0) { S.cur--; renderQ(S.cur); updateProgress(); refreshNav(); }
}
function nextQ() {
  if (S.cur < CFG.count-1) { S.cur++; renderQ(S.cur); updateProgress(); refreshNav(); }
  else if (confirm(`Last question reached. Submit the ${CFG.mode==='mock'?'Mock Test':'Quiz'} now?`)) doSubmit();
}
function skipQ() {
  S.status[S.cur] = 'skipped';
  nextQ();
}

/* Submit */
function trySubmit() {
  if (S.submitted) return;
  const unanswered = CFG.count - Object.keys(S.answers).filter(k=>{const v=S.answers[k];return v!==undefined&&v!==''&&!(Array.isArray(v)&&!v.length);}).length;
  const msg = unanswered > 0
    ? `You have ${unanswered} unanswered question${unanswered>1?'s':''}. Submit anyway?`
    : `Submit the ${CFG.mode==='mock'?'Mock Test':'Quiz'}?`;
  if (confirm(msg)) doSubmit();
}

function doSubmit(auto=false) {
  if (S.submitted) return;
  S.submitted = true;
  clearInterval(S.timerTick);

  // Grade
  let correct=0, wrong=0, earned=0, totalMarks=0;
  S.qs.forEach((q,i) => {
    const a = S.answers[i];
    totalMarks += q.marks;
    if (a===undefined||a===''||(Array.isArray(a)&&!a.length)) { S.status[i]='skipped'; return; }

    let ok = false;
    if (q.type==='mcq')  ok = a === q.ans;
    if (q.type==='msq')  ok = Array.isArray(a) && JSON.stringify([...a].sort((x,y)=>x-y)) === JSON.stringify([...q.ans].sort((x,y)=>x-y));
    if (q.type==='text') ok = true; // auto-credit in demo

    if (ok) { S.status[i]='correct'; earned+=q.marks; correct++; }
    else    { S.status[i]='wrong';   earned+=q.neg;   wrong++; }
  });

  S._result = {correct, wrong, earned, totalMarks, total:CFG.count, time:Date.now()-S.startMs};

  // Save to completed mock test / quiz history
  try {
    const session = typeof getSession === 'function' ? getSession() : null;
    const userEmail = session ? session.email.trim().toLowerCase() : 'guest';
    const mockKey = 'nb_mock_history_' + userEmail;
    const hist = JSON.parse(localStorage.getItem(mockKey) || '[]');
    const pct = Math.round(correct / CFG.count * 100);
    const timeTaken = Math.round((Date.now() - S.startMs) / 1000);
    hist.unshift({
      topic: CFG.topic,
      syl: CFG.syl,
      diff: CFG.diff,
      count: CFG.count,
      score: earned,
      maxScore: totalMarks,
      pct,
      correct,
      wrong,
      timeTaken,
      date: new Date().toISOString()
    });
    localStorage.setItem(mockKey, JSON.stringify(hist.slice(0, 50)));
  } catch (e) {}

  refreshNav();
  showResults();
}

/* Results screen */
function showResults() {
  const area    = document.getElementById('q-area');
  const prog    = document.getElementById('q-progress');
  const sidebar = document.getElementById('qnav');
  const res     = document.getElementById('results');
  if (area)    area.style.display    = 'none';
  if (prog)    prog.style.display    = 'none';
  if (sidebar) sidebar.style.display = 'none';
  if (res)     res.classList.add('show');

  const {correct,wrong,earned,totalMarks,total,time} = S._result;
  const skipped = total - correct - wrong;
  const pct     = Math.round(correct/total*100);
  const mins    = Math.floor(time/60000), secs = Math.floor((time%60000)/1000);
  const grade   = pct>=80?'Excellent!':pct>=60?'Good Job!':pct>=40?'Keep Going':'Needs Work';
  const C       = 2*Math.PI*54;
  const clr     = pct>=70?'var(--accent)':pct>=40?'#ffb347':'var(--accent3)';

  if (res) res.innerHTML = `
    <div class="res-hero">
      <div class="res-emoji"><i data-lucide="${pct>=70?'award':'book-open'}" style="width:48px;height:48px;color:var(--accent);"></i></div>
      <div class="res-title">${grade}</div>
      <div class="res-sub">${CFG.mode==='mock'?'Mock Test':'Quiz'} complete · ${CFG.topic} · ${decodeURIComponent(CFG.syl.replace(/\+/g,' '))}</div>
      <div class="res-ring">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle class="rr-bg" cx="70" cy="70" r="54"/>
          <circle class="rr-fill" cx="70" cy="70" r="54" stroke="${clr}"
            stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct/100)}"/>
        </svg>
        <div class="res-ring-inner">
          <div class="res-pct" style="color:${clr}">${pct}%</div>
          <div class="res-lbl">Score</div>
        </div>
      </div>
    </div>
    <div class="res-stats">
      <div class="rs"><div class="rs-n" style="color:var(--accent)"><i data-lucide="check-circle-2" style="width:20px;height:20px;"></i> ${correct}</div><div class="rs-l">Correct</div></div>
      <div class="rs"><div class="rs-n" style="color:var(--accent3)"><i data-lucide="x-circle" style="width:20px;height:20px;"></i> ${wrong}</div><div class="rs-l">Wrong</div></div>
      <div class="rs"><div class="rs-n" style="color:var(--muted)"><i data-lucide="minus-circle" style="width:20px;height:20px;"></i> ${skipped}</div><div class="rs-l">Skipped</div></div>
      <div class="rs"><div class="rs-n"><i data-lucide="clock" style="width:20px;height:20px;"></i> ${mins}m ${secs}s</div><div class="rs-l">Time</div></div>
    </div>
    ${CFG.mode==='mock'?`<div class="res-marks"><div class="res-marks-n">${Math.max(0,earned).toFixed(1)} / ${totalMarks}</div><div class="res-marks-l">Marks Scored (negative marking applied)</div></div>`:''}
    <div class="res-actions">
      <button class="res-btn pri" onclick="retryAll()">🔁 Retry</button>
      <button class="res-btn" onclick="reviewAll()">📋 Review Answers</button>
      <a href="index.html" class="res-btn">🏠 Home</a>
    </div>`;
}

function retryAll() {
  S.answers={}; S.status={}; S.cur=0; S.submitted=false; S.startMs=Date.now();
  if (CFG.mode==='mock'){S.timerLeft=CFG.count*90;clearInterval(S.timerTick);updateTimer();S.timerTick=setInterval(()=>{S.timerLeft--;updateTimer();if(!S.timerLeft){clearInterval(S.timerTick);doSubmit(true);}},1000);}
  ['q-area','q-progress','qnav'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='';});
  const res=document.getElementById('results');if(res){res.classList.remove('show');res.innerHTML='';}
  buildNav(); renderQ(0); updateProgress();
}

function reviewAll() {
  S.cur=0;
  const area=document.getElementById('q-area'),prog=document.getElementById('q-progress'),res=document.getElementById('results');
  if(area){area.style.display='';renderReview(0);}
  if(prog)prog.style.display='';
  if(res)res.classList.remove('show');
}

function renderReview(i) {
  const q   = S.qs[i];
  const ans = S.answers[i];
  const st  = S.status[i];
  const area = document.getElementById('q-area');
  if (!area) return;

  const caseHTML = q.isCase?`<div class="q-case-box"><div class="q-case-lbl">Case Study</div><div class="q-case-body">${CASE_CTX}</div></div>`:'';
  const icon = st==='correct'?'[v]':st==='wrong'?'[x]':'[-]';

  let optsHTML = '';
  if (q.type==='mcq') {
    optsHTML = `<div class="q-opts">`+q.opts.map((o,oi)=>{
      const isCorr = oi===q.ans, isSel = ans===oi;
      const cls = isCorr?'correct-ans':(isSel&&!isCorr?'wrong':'');
      return `<div class="q-opt disabled ${cls}">
        <div class="q-ind">${isCorr?'✓':String.fromCharCode(65+oi)}</div>
        <div>${o}${isCorr?` <span style="font-family:'Space Mono',monospace;font-size:.62rem;color:var(--accent);">← Correct</span>`:''}</div>
      </div>`;
    }).join('')+`</div>`;
  } else if (q.type==='msq') {
    const selArr = Array.isArray(ans)?ans:[];
    optsHTML = `<div class="q-opts msq-mode">`+q.opts.map((o,oi)=>{
      const isCorr=q.ans.includes(oi), isSel=selArr.includes(oi);
      const cls=isCorr?'correct-ans':(isSel?'wrong':'');
      return `<div class="q-opt disabled ${cls}">
        <div class="q-ind">${isCorr?'✓':String.fromCharCode(65+oi)}</div><div>${o}</div>
      </div>`;
    }).join('')+`</div>`;
  } else {
    optsHTML = `
      <div class="q-sub-lbl">Your Answer</div>
      <div style="padding:11px 13px;background:var(--surface2);border-radius:10px;font-size:.84rem;color:var(--muted);margin-bottom:12px;line-height:1.6">${ans||'(no answer)'}</div>
      <div class="q-sub-lbl">Model Answer</div>
      <div style="padding:11px 13px;background:rgba(184,255,87,.06);border:1px solid rgba(184,255,87,.2);border-radius:10px;font-size:.84rem;line-height:1.6">${q.model}</div>`;
  }

  area.innerHTML = `
    ${caseHTML}
    <div class="q-card">
      <div class="q-meta">
        <span class="q-num-lbl">Review — Q${i+1}</span>
        <span class="q-type-tag ${q.type}">${q.type.toUpperCase()}</span>
        <span style="margin-left:auto;font-size:1.1rem">${icon}</span>
      </div>
      <div class="q-text">${q.text}</div>
      ${optsHTML}
    </div>
    <div style="display:flex;gap:10px;margin-top:10px">
      <button class="q-btn" onclick="renderReview(${i-1})" ${i===0?'disabled':''}>← Prev</button>
      ${i<CFG.count-1
        ?`<button class="q-btn primary" onclick="renderReview(${i+1})">Next →</button>`
        :`<button class="q-btn primary" onclick="showResults()">Finish Review ✓</button>`}
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   FLASHCARD ENGINE
════════════════════════════════════════════════════════════ */

function initFlash() {
  // ── Try loading AI-generated flashcards from localStorage ────────────────
  let aiLoaded = false;
  try {
    const stored = localStorage.getItem('nb_practice_data');
    if (stored) {
      const pd = JSON.parse(stored);
      const isFlash = pd.mode === 'flash' || pd.mode === 'flashcard' ||
                      (pd.practiceType || '').toLowerCase().includes('flash');
      if (isFlash && Array.isArray(pd.questions) && pd.questions.length > 0) {
        S.qs = pd.questions.slice(0, CFG.count).map((q, i) => ({
          id:       q.id || i + 1,
          // Normalize: AI uses `text`/`ans`, flashcard engine uses `question`/`answer`
          question: q.text || q.question || q.q || `Card ${i + 1}`,
          answer:   typeof q.ans === 'string' ? q.ans :
                    (q.explanation || q.model || String(q.ans || '')),
          diff:     q.difficulty || q.diff || CFG.diff,
          topic:    q.topic || CFG.topic,
        }));
        aiLoaded = true;
        const badge = document.getElementById('ai-provider-badge');
        if (badge && pd.provider) badge.textContent = `${pd.provider}`;
      }
    }
  } catch (e) { /* ignore */ }

  // ── Fallback to static flash bank ─────────────────────────────────────────
  if (!aiLoaded) {
    const DIFF = ['easy','medium','hard'];
    S.qs = Array.from({length:CFG.count}, (_,i) => {
      const src = FLASH_BANK[i % FLASH_BANK.length];
      const d   = CFG.diff==='mixed' ? DIFF[i%3] : CFG.diff;
      return { id:i+1, question:src.q, answer:src.a, diff:d, topic:CFG.topic };
    });
  }

  S.cur=0; S.fcKnew={}; S.fcFlipped={};
  buildFCDots();
  renderFC(0, false);
  updateFCProgress();
}


function renderFC(i, flipped) {
  const card = S.qs[i];
  const wrap = document.getElementById('fc-wrap');
  if (!wrap) return;

  document.getElementById('fc-q-text').textContent  = card.question;
  document.getElementById('fc-a-text').textContent  = card.answer;
  document.getElementById('fc-topic').textContent   = card.topic;
  document.getElementById('fc-diff').textContent    = `Difficulty: ${card.diff}`;
  document.getElementById('fc-num').textContent     = `${i+1} / ${CFG.count}`;

  wrap.classList.toggle('flipped', flipped);
  S.fcFlipped[i] = flipped;

  const revBtn  = document.getElementById('fc-reveal');
  const knewRow = document.getElementById('fc-knew');
  const nextBtn = document.getElementById('fc-next');
  const prevBtn = document.getElementById('fc-prev');

  if (revBtn)  revBtn.innerHTML = flipped ? '<i data-lucide="rotate-ccw" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Flip Back' : '<i data-lucide="eye" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Show Answer';
  if (knewRow) knewRow.classList.toggle('show', flipped);
  if (nextBtn) nextBtn.innerHTML = i===CFG.count-1 ? '<i data-lucide="check" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Finish' : 'Next <i data-lucide="arrow-right" style="width:14px;height:14px;vertical-align:middle;margin-left:4px;"></i>';
  if (prevBtn) prevBtn.disabled    = i===0;
  if (window.lucide) { lucide.createIcons(); }

  updateFCDots();
  updateFCProgress();
}

function flipFC() {
  const flipped = !S.fcFlipped[S.cur];
  renderFC(S.cur, flipped);
}

function fcNext() {
  if (S.cur >= CFG.count-1) { showFCResults(); return; }
  doFCSlide('L', () => { S.cur++; renderFC(S.cur, false); });
}
function fcPrev() {
  if (S.cur <= 0) return;
  doFCSlide('R', () => { S.cur--; renderFC(S.cur, !!S.fcFlipped[S.cur]); });
}

function doFCSlide(dir, cb) {
  const scene = document.getElementById('fc-scene');
  if (!scene) { cb(); return; }
  scene.classList.add('slide-'+dir);
  setTimeout(() => { scene.classList.remove('slide-'+dir); cb(); }, 160);
}

function fcKnew(status) {
  S.fcKnew[S.cur] = status;
  updateFCDots();
  fcNext();
}

function buildFCDots() {
  const el = document.getElementById('fc-dots');
  if (!el) return;
  el.innerHTML = S.qs.map((_,i) =>
    `<div class="fc-dot${i===0?' cur':''}" id="fcd${i}" onclick="fcJump(${i})" title="Card ${i+1}"></div>`
  ).join('');
}
function updateFCDots() {
  S.qs.forEach((_,i) => {
    const d=document.getElementById('fcd'+i); if(!d) return;
    d.className='fc-dot';
    if(i===S.cur) d.classList.add('cur');
    else { const k=S.fcKnew[i]; if(k) d.classList.add(k); }
  });
}
function fcJump(i) {
  doFCSlide(i>S.cur?'L':'R', () => { S.cur=i; renderFC(i, !!S.fcFlipped[i]); });
}
function updateFCProgress() {
  const seen = Object.keys(S.fcKnew).length;
  const pct  = Math.round(seen/CFG.count*100);
  const fill = document.getElementById('fc-fill');
  const info = document.getElementById('fc-info');
  if (fill) { fill.style.width=pct+'%'; fill.className='qp-fill flash'; }
  if (info) info.textContent = `Card ${S.cur+1} of ${CFG.count} · ${seen} reviewed`;
}

function showFCResults() {
  const main = document.getElementById('flash-body');
  if (!main) return;
  const got=Object.values(S.fcKnew).filter(v=>v==='got').length;
  const meh=Object.values(S.fcKnew).filter(v=>v==='meh').length;
  const nope=Object.values(S.fcKnew).filter(v=>v==='nope').length;
  const total=CFG.count, pct=Math.round(got/total*100);
  const C=2*Math.PI*54;
  // Save to completed mock test / quiz / flash card history
  try {
    const session = typeof getSession === 'function' ? getSession() : null;
    const userEmail = session ? session.email.trim().toLowerCase() : 'guest';
    const mockKey = 'nb_mock_history_' + userEmail;
    const hist = JSON.parse(localStorage.getItem(mockKey) || '[]');
    const timeTaken = Math.round((Date.now() - S.startMs) / 1000);
    hist.unshift({
      topic: CFG.topic,
      syl: CFG.syl,
      diff: CFG.diff,
      count: CFG.count,
      score: got,
      maxScore: total,
      pct,
      correct: got,
      wrong: nope,
      timeTaken,
      type: 'Flash Cards',
      date: new Date().toISOString()
    });
    localStorage.setItem(mockKey, JSON.stringify(hist.slice(0, 50)));
  } catch (e) {}

  main.innerHTML=`
    <div class="results show" style="max-width:500px;padding-top:10px">
      <div class="res-hero">
        <div class="res-emoji" style="margin-bottom:12px;"><i data-lucide="${pct>=70?'trophy':'book-open'}" style="width:48px;height:48px;color:${pct>=70?'var(--nb-primary)':'var(--nb-accent)'};"></i></div>
        <div class="res-title">${pct>=70?'Great recall!':'Keep practicing!'}</div>
        <div class="res-sub">Flash Cards complete · ${CFG.topic}</div>
        <div class="res-ring">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle class="rr-bg" cx="70" cy="70" r="54"/>
            <circle class="rr-fill" cx="70" cy="70" r="54" stroke="#c084fc"
              stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct/100)}"/>
          </svg>
          <div class="res-ring-inner">
            <div class="res-pct" style="color:#c084fc">${pct}%</div>
            <div class="res-lbl">Knew It</div>
          </div>
        </div>
      </div>
      <div class="res-stats">
        <div class="rs"><div class="rs-n" style="color:var(--accent)">${got}</div><div class="rs-l">Got It</div></div>
        <div class="rs"><div class="rs-n" style="color:#ffb347">${meh}</div><div class="rs-l">Unsure</div></div>
        <div class="rs"><div class="rs-n" style="color:var(--accent3)">${nope}</div><div class="rs-l">Didn't Know</div></div>
        <div class="rs"><div class="rs-n">${total}</div><div class="rs-l">Total Cards</div></div>
      </div>
      <div class="res-actions">
        <button class="res-btn pri" onclick="location.reload()"><i data-lucide="refresh-cw" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Restart</button>
        <a href="index.html" class="res-btn"><i data-lucide="home" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Home</a>
      </div>
    </div>`;
  if (window.lucide) { lucide.createIcons(); }
}

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (CFG.mode === 'flash') initFlash();
  else if (document.getElementById('q-area')) initQM();
});
