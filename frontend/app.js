/* =========================================================
   NERDLUME — app.js
   ========================================================= */

function getCurrentUserPlan() {
  try {
    const s = localStorage.getItem('nb_session');
    return s ? JSON.parse(s).plan || 'free' : 'guest';
  } catch (e) {
    return 'guest';
  }
}

function hasAccess(userPlan, requiredPlan) {
  const ranks = { guest: -1, free: 0, 'free-premium': 1, diamond: 2 };
  return (ranks[userPlan] ?? -1) >= (ranks[requiredPlan] ?? 99);
}

// ── State ──────────────────────────────────────────────────
let currentGoal = 'notes';
let currentExplainType = 'numerical';
let currentQuickMode = 'assignment';
const fileStores = { 'learning-files': [], 'quick-files': [] };

// ── Mode Switching ─────────────────────────────────────────
function switchMode(mode, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('mode-' + mode).classList.add('active');
  checkAndApplyLimits();
}

// ── Learning Goal Selection ────────────────────────────────
function selectGoal(goal) {
  const plan = getCurrentUserPlan();

  if (goal === 'explain') {
    if (!hasAccess(plan, 'free-premium')) {
      openPaywallModal('Explain Mode', 'free-premium');
      return;
    }
    if (plan === 'free-premium') {
      currentExplainType = 'theory';
      selectExplainType('theory');
    }
  }

  currentGoal = goal;
  ['notes', 'practice', 'explain'].forEach(g => {
    const card = document.getElementById('goal-' + g);
    const panel = document.getElementById('panel-' + g);
    if (card) card.classList.toggle('selected', g === goal);
    if (panel) panel.classList.toggle('active', g === goal);
    if (g === 'explain' && card) card.classList.add('explain-card');
  });

  const cardGen = document.getElementById('card-03-generate');
  if (cardGen) {
    cardGen.style.display = (goal === 'practice') ? 'none' : '';
  }

  if (goal === 'practice') {
    selectPracticeMode(_currentPMode || 'quiz');
  }

  checkAndApplyLimits();
}

// ── Explain Sub-type Selection ─────────────────────────────
function selectExplainType(type) {
  const plan = getCurrentUserPlan();
  if (plan === 'free' || !hasAccess(plan, 'free-premium')) {
    openPaywallModal('Explain Mode', 'free-premium');
    return;
  }
  if (plan === 'free-premium' && ['numerical', 'code'].includes(type)) {
    openPaywallModal('Advanced explain guides', 'diamond');
    return;
  }

  currentExplainType = type;
  ['numerical', 'theory', 'code', 'example'].forEach(t => {
    document.getElementById('etype-' + t).classList.toggle('selected', t === type);
    document.getElementById('esub-' + t).classList.toggle('active', t === type);
  });
}

// ── Quick Mode Selection ───────────────────────────────────
function selectQuickMode(mode, el) {
  currentQuickMode = mode;
  document.querySelectorAll('.quick-option-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('panel-assignment').classList.toggle('active', mode === 'assignment');
  document.getElementById('panel-practical').classList.toggle('active', mode === 'practical');

  const title = mode === 'assignment' ? 'ASSIGNMENT.TXT' : 'PRACTICAL_FILE.TXT';
  const file = mode === 'assignment' ? 'assignment.txt' : 'practical_file.txt';
  document.getElementById('quick-output-title').textContent = title;
  document.getElementById('quick-dl-btn').setAttribute('onclick',
    `downloadOutput('quick-output-content', '${file}')`);
  checkAndApplyLimits();
}

// ── Option Button Toggles ──────────────────────────────────
function toggleOption(btn, group) {
  const groupName = String(group).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`toggleOption\\(this,\\s*['"]${groupName}['"]\\)`);
  document.querySelectorAll('.option-btn').forEach(b => {
    const onClick = b.getAttribute('onclick') || '';
    if (pattern.test(onClick)) b.classList.remove('selected');
  });
  btn.classList.add('selected');
}

function toggleMulti(btn) {
  btn.classList.toggle('selected');
}

function onDataGraphsClick(btn) {
  const hasDataFile = (fileStores['learning-files'] || []).some(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    return ['csv', 'xlsx', 'xls'].includes(ext);
  });

  if (!hasDataFile) {
    const input = document.getElementById('learning-file-input');
    if (input) input.click();
    showToast('Please upload a CSV or XLSX file to unlock Data Graphs!');
  } else {
    toggleMulti(btn);
  }
}

function updateDataGraphsLockState() {
  const btn = document.getElementById('btn-data-graphs');
  if (!btn) return;

  btn.classList.remove('locked-option');
  btn.style.opacity = '1';
  btn.style.cursor = 'pointer';
  const lockIcon = btn.querySelector('.btn-lock-icon');
  if (lockIcon) lockIcon.remove();
}

// ── File Handling ──────────────────────────────────────────
function handleFileInput(e, storeId) {
  addFiles(Array.from(e.target.files), storeId);
}

function handleDrag(e, zone) {
  e.preventDefault();
  zone.classList.add('dragover');
}

function handleDragLeave(e, zone) {
  zone.classList.remove('dragover');
}

function handleDrop(e, zone, storeId) {
  e.preventDefault();
  zone.classList.remove('dragover');
  addFiles(Array.from(e.dataTransfer.files), storeId);
}

function addFiles(files, storeId) {
  const plan = getCurrentUserPlan();
  const limits = { free: 2, 'free-premium': 10, diamond: Infinity, guest: 2 };
  const maxFiles = limits[plan] ?? 2;

  files.forEach(f => {
    if (fileStores[storeId].find(x => x.name === f.name)) return;
    if (fileStores[storeId].length >= maxFiles) {
      const planLabel = plan === 'free' ? 'Premium' : 'Diamond';
      const required = plan === 'free' ? 'free-premium' : 'diamond';
      openPaywallModal(`More than ${maxFiles} file upload`, required);
      return;
    }
    fileStores[storeId].push(f);
    if (typeof NB_Tracker !== 'undefined') {
      NB_Tracker.trackUpload(f);
    }
    const session = typeof getSession === 'function' ? getSession() : null;
    if (session) {
      session.filesCount = (session.filesCount || 0) + 1;
      try { localStorage.setItem('nb_session', JSON.stringify(session)); } catch(e){}
    }
  });
  renderFiles(storeId);
}

function removeFile(name, storeId) {
  fileStores[storeId] = fileStores[storeId].filter(f => f.name !== name);
  renderFiles(storeId);
}

function renderFiles(storeId) {
  const container = document.getElementById(storeId);
  container.innerHTML = '';
  fileStores[storeId].forEach(f => {
    const chip = document.createElement('div');
    chip.className = 'uploaded-chip';
    const shortName = f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name;
    chip.innerHTML = `<i data-lucide="paperclip" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;"></i> ${shortName} <button onclick="removeFile('${f.name}', '${storeId}')" aria-label="Remove" style="background:none;border:none;color:inherit;cursor:pointer;margin-left:6px;"><i data-lucide="x" style="width:12px;height:12px;vertical-align:middle;"></i></button>`;
    container.appendChild(chip);
  });
  if (window.lucide) { lucide.createIcons(); }
  if (storeId === 'learning-files') {
    updateDataGraphsLockState();
  }
}

const NB_API = window.NB_API_BASE || (window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:5050');

function nbApiToken() {
  return localStorage.getItem('nb_api_token') || '';
}

/** Read a File object as a base64 data string + mimeType */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ data: reader.result.split(',')[1], mimeType: file.type || 'application/octet-stream', name: file.name });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Show an "AI agent pipeline" loading message sequence */
function animateAILoader(mode) {
  const loadEl = document.getElementById('loading-' + mode);
  if (!loadEl) return;
  const messages = [
    'AI Generating: Analyzing reference files & topics…',
    'AI Generating: Reasoning & structuring content…',
    'AI Generating: Synthesizing details…',
    'AI Generating: Running self-correction refinement…',
    'AI Generating: Polishing response…',
    'AI Generating: Finalizing output…',
  ];
  let idx = 0;
  const msgEl = loadEl.querySelector('.loading-msg') || loadEl;
  const interval = setInterval(() => {
    if (msgEl && messages[idx]) msgEl.textContent = messages[idx];
    idx++;
    if (idx >= messages.length) clearInterval(interval);
  }, 1100);
  return interval;
}

/**
 * Prompt Filter & Sanitization Layer
 * Identifies if input is a valid topic/syllabus, strips greetings & filler,
 * blocks system commands / prompt injections, and detects gibberish.
 */
function filterAndSanitizePrompt(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return { isValid: false, cleanTopic: '', error: 'Please enter a topic or syllabus first!' };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { isValid: false, cleanTopic: '', error: 'Please enter a topic or syllabus first!' };
  }

  // Layer 1: Maximum Length Cap
  if (trimmed.length > 25000) {
    return { isValid: false, cleanTopic: '', error: 'Input is too long (maximum 25,000 characters). Please provide a shorter syllabus or topic.' };
  }

  const lower = trimmed.toLowerCase();

  // Layer 2: Script / Code Injection Checks
  const xssPatterns = [
    /<script[\s>]/i,
    /javascript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
    /eval\s*\(/i,
    /exec\s*\(/i,
    /document\.cookie/i,
  ];
  for (const pattern of xssPatterns) {
    if (pattern.test(lower)) {
      return {
        isValid: false,
        cleanTopic: '',
        error: 'Security violation: Script or executable code tags are not permitted in prompt inputs.'
      };
    }
  }

  // Layer 3: Prompt Injection / System Command Defense
  const injectionPatterns = [
    /(ignore|bypass|override|forget)\s+(all|any|previous|prior|system)\s+(instructions|prompts|rules|guidelines)/i,
    /(system\s+prompt|sysprompt|system\s+instructions|developer\s+mode|jailbreak|dan\s+mode)/i,
    /(output|print|show|display|reveal)\s+(the|your)\s+(system\s+prompt|hidden\s+prompt|instructions)/i,
    /(bypass|override|hack)\s+(limits|quota|auth|security|paywall|guardrails)/i,
    /you\s+are\s+now\s+(an?\s+unrestricted|a\s+dan|a\s+bot|in\s+developer\s+mode)/i,
  ];
  for (const pattern of injectionPatterns) {
    if (pattern.test(lower)) {
      return {
        isValid: false,
        cleanTopic: '',
        error: 'System commands, prompt overrides, and jailbreak attempts are not allowed. Please enter an educational topic or syllabus.'
      };
    }
  }

  // Layer 4: Detect Gibberish / Noise
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '');
  
  if (lettersOnly.length === 0) {
    return {
      isValid: false,
      cleanTopic: '',
      error: 'Input contains no words. Please enter a valid study topic or syllabus.'
    };
  }

  // Repeated character spam (e.g. "aaaaaa", "xxxxxx")
  if (/(.)\1{5,}/i.test(lettersOnly)) {
    return {
      isValid: false,
      cleanTopic: '',
      error: 'Input looks like random characters or gibberish. Please enter a valid subject topic.'
    };
  }

  // 6+ consecutive consonants check (e.g. asdfghjkl, zxcvbnm)
  if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(lower)) {
    return {
      isValid: false,
      cleanTopic: '',
      error: 'Input contains invalid character sequences or gibberish. Please enter a valid subject topic.'
    };
  }

  // Vowel ratio check for longer noise strings (length >= 8)
  if (lettersOnly.length >= 8) {
    const vowels = lettersOnly.match(/[aeiouAEIOU]/g) || [];
    const vowelRatio = vowels.length / lettersOnly.length;
    if (vowelRatio < 0.10) {
      return {
        isValid: false,
        cleanTopic: '',
        error: 'Input looks like random noise or keyboard mashing. Please enter a valid educational topic.'
      };
    }
  }

  // Layer 5: Strip leading greetings, polite filler & generation commands
  let cleaned = trimmed;

  const fillerPrefixes = [
    /^(hi|hello|hey|hey there|greetings|good morning|good afternoon|good evening|dear|bro|NERDLUME|yo)\b/i,
    /^(can you|could you|please|kindly|i want|i need|generate|create|make|write|give me|help me with|notes on|notes for|assignment on|assignment for|practical file for|explain)\b/i,
    /^(study notes on|summary of|quiz on|practice for|topic:?|subject:?)\b/i,
  ];

  let modified = true;
  while (modified) {
    modified = false;
    const prev = cleaned;
    for (const prefix of fillerPrefixes) {
      cleaned = cleaned.replace(prefix, '').trim().replace(/^[,:;\-\s]+/, '');
    }
    if (cleaned !== prev) modified = true;
  }

  // Strip trailing punctuation like ?, !, . for single-line inputs
  if (!cleaned.includes('\n')) {
    cleaned = cleaned.replace(/[?!.,;:\s]+$/, '');
  }

  const cleanedLetters = cleaned.replace(/[^a-zA-Z0-9]/g, '');

  if (cleanedLetters.length < 2) {
    return {
      isValid: false,
      cleanTopic: '',
      error: 'Please enter a valid study topic, unit name, or syllabus content (e.g. "Binary Search Trees" or "Newton\'s Laws").'
    };
  }

  const cleanTopic = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  return {
    isValid: true,
    cleanTopic: cleanTopic,
    error: null
  };
}

// ── Generate Button State Controller ────────────────────────
function setGenerateButtonState(mode, isGenerating) {
  const btnGen = document.getElementById('btn-gen-' + mode);
  if (!btnGen) return;
  if (isGenerating) {
    btnGen.classList.add('is-generating');
    btnGen.disabled = true;
    btnGen.innerHTML = '<span class="gen-box-spinner"><span class="logo-icon-inner">◈</span></span> <span>Generating...</span>';
  } else {
    btnGen.classList.remove('is-generating');
    btnGen.disabled = false;
    btnGen.innerHTML = '<span></span> Generate Now';
  }
}

// ── Generate ───────────────────────────────────────────────
async function generate(mode) {
  if (mode === 'learning' && typeof _isVideoNotes !== 'undefined' && _isVideoNotes) {
    generateVideoNotes();
    return;
  }

  const input = document.getElementById(mode + '-input').value.trim();
  const filterResult = filterAndSanitizePrompt(input);

  if (!filterResult.isValid) {
    showToast(filterResult.error);
    return;
  }

  if (mode === 'learning' && currentGoal === 'explain' && !ensureExplainAccess(currentExplainType)) {
    return;
  }

  const topic = filterResult.cleanTopic;
  const isPractice = mode === 'learning' && currentGoal === 'practice';
  const isExplain = mode === 'learning' && currentGoal === 'explain';
  const isQuick = mode === 'quick';

  // 0. Pre-check weekly generation limits before triggering loader
  const usage = await getWeeklyUsage();
  const limits = getLimits();
  const activeModeCategory = isQuick ? 'quick' : (isExplain ? 'explain' : 'notes');

  if (limits[activeModeCategory] !== Infinity && usage[activeModeCategory] >= limits[activeModeCategory]) {
    const categoryLabelMap = { notes: 'Note Making', explain: 'Explain Mode', quick: 'Quick Mode' };
    const catLabel = categoryLabelMap[activeModeCategory] || 'Generation';
    const plan = getCurrentUserPlan();
    const reqPlan = plan === 'free' ? 'free-premium' : 'diamond';

    if (typeof showLimitExceededModal === 'function') {
      showLimitExceededModal(catLabel, usage[activeModeCategory], limits[activeModeCategory], reqPlan);
    } else if (typeof openPaywallModal === 'function') {
      openPaywallModal(`${catLabel} Limit Reached (${usage[activeModeCategory]}/${limits[activeModeCategory]})`, reqPlan);
    } else if (typeof showToast === 'function') {
      showToast(`Weekly limit reached for ${catLabel} (${usage[activeModeCategory]}/${limits[activeModeCategory]}). Upgrade your plan!`, 'error');
    }
    await checkAndApplyLimits();
    return;
  }

  setGenerateButtonState(mode, true);
  document.getElementById('loading-' + mode).classList.add('active');
  document.getElementById('output-' + mode).classList.remove('visible');

  // Collect selected UI options to build the fixed prompt
  const noteStyle = document.querySelector('[onclick*="note-style"].selected')?.innerText?.trim() || 'Cornell Method';
  const genType = document.querySelector('[onclick*="gen-type"].selected')?.innerText?.trim() || 'Theory Only';
  // practiceType is driven by the _currentPMode state variable set by selectPracticeMode()
  const _pmodeLabels = { quiz: 'Quiz', mock: 'Mock Test', flash: 'Flash Cards', flashcard: 'Flash Cards' };
  const practiceType = _pmodeLabels[_currentPMode] || 'Quiz';
  // syllabus uses 'syl-mode' group (not 'syllabus-mode')
  const syllabus = document.querySelector('[onclick*="syl-mode"].selected')?.innerText?.trim() || 'Full Syllabus';
  // difficulty uses 'p-diff' group (not 'difficulty')
  const difficulty = document.querySelector('[onclick*="p-diff"].selected')?.innerText?.trim() || 'Medium';
  const questionCount = parseInt(document.querySelector('[onclick*="q-count"].selected')?.innerText?.replace(/\D/g, '') || '10');
  const language = getLang(isQuick ? 'quick-lang' : 'lang');
  // technique uses selectNoteTech() onclick (not 'technique' group)
  const technique = document.querySelector('.option-btn[onclick*="selectNoteTech"].selected')?.innerText?.trim() || 'Active Recall';

  // Collect output file format (.md, .txt, .docx)
  let selectedFileFormat = 'md';
  if (isQuick) {
    const qFmtBtn = document.querySelector(`#panel-${currentQuickMode} [onclick*="-file-fmt"].selected`);
    const qFmtTxt = qFmtBtn?.innerText?.toLowerCase() || '';
    if (qFmtTxt.includes('docx') || qFmtTxt.includes('word')) selectedFileFormat = 'docx';
    else if (qFmtTxt.includes('txt') || qFmtTxt.includes('text')) selectedFileFormat = 'txt';
    else if (qFmtTxt.includes('md') || qFmtTxt.includes('markdown')) selectedFileFormat = 'md';
    else selectedFileFormat = 'docx';
  } else {
    const lFmtBtn = document.querySelector(`#panel-${currentGoal === 'explain' ? 'explain' : 'notes'} [onclick*="-file-fmt"].selected`);
    const lFmtTxt = lFmtBtn?.innerText?.toLowerCase() || '';
    if (lFmtTxt.includes('docx') || lFmtTxt.includes('word')) selectedFileFormat = 'docx';
    else if (lFmtTxt.includes('txt') || lFmtTxt.includes('text')) selectedFileFormat = 'txt';
    else selectedFileFormat = 'md';
  }

  // Collect output formats (multi-select additions)
  const outputFormats = Array.from(document.querySelectorAll('.option-btn.selected'))
    .filter(btn => {
      const txt = btn.textContent || btn.innerText || "";
      return /Generated Text|Text File|ASCII Diagrams|Data Graphs|Summarize Uploaded/i.test(txt);
    })
    .map(btn => {
      const clone = btn.cloneNode(true);
      clone.querySelector('.option-dot')?.remove();
      return clone.innerText.trim();
    });

  // Collect Quick Mode sections if applicable
  let sections = [];
  if (isQuick) {
    const sectionsStoreId = currentQuickMode === 'assignment' ? 'panel-assignment' : 'panel-practical';
    sections = Array.from(document.querySelectorAll(`#${sectionsStoreId} .options-2col .option-btn.selected`))
      .map(btn => {
        const clone = btn.cloneNode(true);
        clone.querySelector('.option-dot')?.remove();
        return clone.innerText.trim();
      });
  }

  // Determine backend mode — use _currentPMode directly for practice to avoid string-matching bugs
  let apiMode = 'notes';
  if (isPractice) apiMode = (_currentPMode === 'flash' || _currentPMode === 'flashcard') ? 'flash' :
    _currentPMode === 'mock' ? 'mock' : 'quiz';
  if (isExplain) apiMode = 'explain';
  if (isQuick) apiMode = 'quick';

  // Build clean debug log of selected options
  const debugOptions = [];
  if (isQuick) {
    debugOptions.push(`Quick Mode: ${currentQuickMode}`);
    debugOptions.push(`Language: ${language}`);
    debugOptions.push(`Format: .${selectedFileFormat}`);
    if (sections.length > 0) debugOptions.push(`Sections: ${sections.join(', ')}`);
  } else if (isExplain) {
    debugOptions.push(`Explain Type: ${currentExplainType}`);
    debugOptions.push(`Format: .${selectedFileFormat}`);
  } else if (isPractice) {
    debugOptions.push(`Practice Type: ${practiceType}`);
    debugOptions.push(`Syllabus: ${syllabus}`);
    debugOptions.push(`Difficulty: ${difficulty}`);
    debugOptions.push(`Questions: ${questionCount}`);
  } else {
    debugOptions.push(`Style: ${noteStyle}`);
    debugOptions.push(`Technique: ${technique}`);
    debugOptions.push(`Type: ${genType}`);
    debugOptions.push(`Format: .${selectedFileFormat}`);
    if (outputFormats.length > 0) debugOptions.push(`Formats: ${outputFormats.join(', ')}`);
  }

  console.log('%c[DEBUG MODE — USER INPUT MONITOR]', 'color: #57c8ff; font-weight: bold; background: #111; padding: 4px 8px; border-radius: 4px;');
  console.log('• User Input Text :', input);
  if (filterResult.cleanTopic && filterResult.cleanTopic !== input) {
    console.log('• Sanitized Topic :', filterResult.cleanTopic);
  }

  // Encode uploaded files to base64 for Gemini
  const storeId = isQuick ? 'quick-files' : 'learning-files';
  let filesPayload = [];
  try {
    filesPayload = await Promise.all((fileStores[storeId] || []).map(fileToBase64));
  } catch (e) { /* ignore file encoding errors */ }

  // Build the unified fixed prompt body
  const requestBody = {
    mode: apiMode,
    topic,
    input,
    noteStyle,
    genType,
    practiceType,
    syllabusMode: syllabus,
    difficulty: difficulty.toLowerCase(),
    count: questionCount,
    questionCount,
    language,
    technique,
    explainType: currentExplainType,
    quickMode: currentQuickMode,
    files: filesPayload,
    outputFormat: selectedFileFormat,
    outputFormats,
    sections,
  };

  // Animate AI pipeline loader
  const loaderInterval = animateAILoader(mode);

  // ── Pre-request debug log ──
  const currentToken = nbApiToken();
  console.group('%c[NERDLUME] Sending Generation Request', 'color:#22c55e;font-weight:bold');
  console.log('📌 Topic      :', topic);
  console.log('🎯 Mode       :', apiMode);
  console.log('🌐 Endpoint   :', `${NB_API}/api/generate`);
  console.log('🔑 Token      :', currentToken ? `✅ Present (${currentToken.slice(0, 12)}...)` : '❌ MISSING — user not authenticated');
  console.log('📦 Payload    :', requestBody);
  console.groupEnd();

  if (!currentToken) {
    console.warn('[NERDLUME] No API token found — attempting guest token provisioning...');
    const fresh = (typeof ensureGuestApiToken === 'function') ? await ensureGuestApiToken(true) : '';
    if (!fresh) {
      console.error('[NERDLUME] Could not provision token — backend may be offline');
    }
  }

  try {
    const makeRequest = (token) => fetch(`${NB_API}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Session-Token': token,
      },
      body: JSON.stringify(requestBody),
    });

    let res = await makeRequest(nbApiToken());

    // If 401, attempt token refresh and retry once
    if (res.status === 401) {
      console.warn('[NERDLUME] 401 Unauthorized — refreshing token and retrying...');
      const freshToken = (typeof ensureGuestApiToken === 'function') ? await ensureGuestApiToken(true) : '';
      if (freshToken) {
        res = await makeRequest(freshToken);
        console.log('[NERDLUME] Retried with fresh token, status:', res.status);
      } else {
        console.error('[NERDLUME] Token refresh failed — backend may be offline or not running');
      }
    }

    clearInterval(loaderInterval);
    const data = await res.json();
    console.log('[NERDLUME] API response:', res.status, data.ok ? '✅ OK' : `❌ ${data.error || 'Failed'}`);

    document.getElementById('loading-' + mode).classList.remove('active');

    if (res.status === 429 || (!data.ok && data.error && (data.error.toLowerCase().includes('limit') || data.error.toLowerCase().includes('reach')))) {
      setGenerateButtonState(mode, false);
      const plan = getCurrentUserPlan();
      const reqPlan = plan === 'free' ? 'free-premium' : 'diamond';
      if (typeof showLimitExceededModal === 'function') {
        showLimitExceededModal(mode, undefined, undefined, reqPlan);
      } else if (typeof openPaywallModal === 'function') {
        openPaywallModal(data.error || 'Weekly Limit Reached', reqPlan);
      } else if (typeof showToast === 'function') {
        showToast(data.error || 'Weekly generation limit reached!', 'error');
      }
      await checkAndApplyLimits();
      return;
    }

    setGenerateButtonState(mode, false);
    const outArea = document.getElementById('output-' + mode);
    if (outArea) {
      outArea.classList.add('visible');
    }

    // Ensure standard output boxes are properly displayed (resets any display:none from video-notes)
    const lContentBox = document.getElementById('out-learning-content');
    if (lContentBox) {
      lContentBox.style.display = 'block';
    }
    const qContentBox = document.getElementById('quick-output-content');
    if (qContentBox) {
      qContentBox.style.display = 'block';
    }
    const priorVn = document.getElementById('vn-rich-output');
    if (priorVn && mode === 'learning' && (!apiMode || !apiMode.includes('video'))) {
      priorVn.remove();
    }

    if (data.ok && data.output) {
      if (isPractice && data.structured?.questions) {
        // ── Store structured practice data for quiz/mock/flashcard pages ──
        const practiceData = {
          topic,
          practiceType,
          mode: apiMode,
          count: questionCount,
          diff: difficulty.toLowerCase(),
          syl: syllabus,
          questions: data.structured.questions,
          generatedAt: data.generatedAt,
          provider: data.provider,
        };
        localStorage.setItem('nb_practice_data', JSON.stringify(practiceData));

        // Render the output text
        const titleMap = { flash: 'FLASHCARDS.TXT', mock: 'MOCKTEST.TXT' };
        document.getElementById('learning-out-title').textContent = titleMap[apiMode] || 'QUESTIONS.TXT';
        document.getElementById('out-learning-content').textContent = data.output;
        document.getElementById('out-answerkey-wrap').style.display = 'block';

        // Build answer key from structured data
        const qs = data.structured.questions;
        const akLines = ['ANSWER KEY', '═'.repeat(50), ''];
        qs.forEach(q => {
          const opts = q.opts || [];
          const ans = q.ans;
          let ansText = String(ans);
          if (q.type === 'mcq' && typeof ans === 'number' && opts[ans]) ansText = `(${String.fromCharCode(65 + ans)}) ${opts[ans]}`;
          if (q.type === 'msq' && Array.isArray(ans)) ansText = ans.map(i => String.fromCharCode(65 + i)).join(', ');
          akLines.push(`Q${q.id}. ${ansText}`);
          if (q.explanation) akLines.push(`   ↳ ${q.explanation}`);
        });
        document.getElementById('out-answerkey-content').textContent = akLines.join('\n');

        // Show launch buttons to practice pages
        _showPracticeLaunchButtons(practiceData);

      } else {
        // ── Notes / Explain / Quick ──
        const titleExt = selectedFileFormat.toUpperCase();
        const titleMap = {
          explain: `EXPLAIN_${(currentExplainType || 'theory').toUpperCase()}.${titleExt}`,
          quick: `${(currentQuickMode || 'assignment').toUpperCase()}.${titleExt}`,
          notes: `NOTES.${titleExt}`
        };

        const finalOutputText = (selectedFileFormat === 'txt') ? cleanPlainText(data.output) : data.output;

        if (isQuick) {
          // Quick mode uses different output element IDs
          const qTitle = document.getElementById('quick-output-title');
          const qContent = document.getElementById('quick-output-content');
          if (qTitle) qTitle.textContent = titleMap.quick;
          if (qContent) qContent.textContent = finalOutputText;
          const qDlBtn = document.getElementById('quick-dl-btn');
          if (qDlBtn) {
            const dlFileName = data.fileName || `${(currentQuickMode || 'assignment')}.${selectedFileFormat}`;
            if (data.downloadUrl) {
              qDlBtn.onclick = () => downloadGeneratedFile(data.downloadUrl, 'quick-output-content', dlFileName);
            } else {
              qDlBtn.onclick = () => downloadOutput('quick-output-content', dlFileName);
            }
          }
        } else {
          // Learning mode (Notes / Explain)
          const lTitle = document.getElementById('learning-out-title');
          const lContent = document.getElementById('out-learning-content');
          if (lTitle) lTitle.textContent = titleMap[apiMode] || `NOTES.${titleExt}`;
          if (lContent) lContent.textContent = finalOutputText;
          const lDlBtn = document.getElementById('learning-dl-btn');
          if (lDlBtn) {
            const dlFileName = data.fileName || `${(apiMode === 'explain' ? 'explain' : 'notes')}.${selectedFileFormat}`;
            if (data.downloadUrl) {
              lDlBtn.onclick = () => downloadGeneratedFile(data.downloadUrl, 'out-learning-content', dlFileName);
            } else {
              lDlBtn.onclick = () => downloadOutput('out-learning-content', dlFileName);
            }
          }
        }
        document.getElementById('out-answerkey-wrap').style.display = 'none';
      }

      // Track
      if (typeof NB_Tracker !== 'undefined') {
        NB_Tracker.trackGeneration(apiMode, topic, data.provider);
      }

      showToast('Generated successfully!');
      saveToDetailedHistory(mode, input, data.output, {
        fileName: data.fileName,
        fileFormat: data.fileFormat || selectedFileFormat,
        id: data.id || data.requestId,
        downloadUrl: data.downloadUrl
      });
      checkAndApplyLimits();
      if (outArea) {
        setTimeout(() => {
          outArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      throw new Error(data.error || 'Generation failed');
    }

  } catch (err) {
    clearInterval(loaderInterval);
    console.error('[NERDLUME API Error]', err);

    document.getElementById('loading-' + mode).classList.remove('active');
    setGenerateButtonState(mode, false);
    const outArea = document.getElementById('output-' + mode);
    if (outArea) {
      outArea.classList.add('visible');
    }

    // Ensure standard output boxes are properly displayed (resets any display:none from video-notes)
    const lContentBox = document.getElementById('out-learning-content');
    if (lContentBox) {
      lContentBox.style.display = 'block';
    }
    const qContentBox = document.getElementById('quick-output-content');
    if (qContentBox) {
      qContentBox.style.display = 'block';
    }
    const priorVn = document.getElementById('vn-rich-output');
    if (priorVn && mode === 'learning' && (!apiMode || !apiMode.includes('video'))) {
      priorVn.remove();
    }

    const errMessage = err.message || 'API request failed';
    const isAuthError = errMessage.toLowerCase().includes('unauthorized') || errMessage.includes('401');
    const tokenPresent = !!nbApiToken();
    const sep = '═'.repeat(52);
    const errLog = [
      '[GENERATION ERROR LOG]',
      sep,
      `TOPIC       : ${topic}`,
      `MODE        : ${apiMode}`,
      `STATUS      : ${isAuthError ? 'Authentication Failed (401 Unauthorized)' : 'API Generation Failed'}`,
      `TIMESTAMP   : ${new Date().toLocaleString()}`,
      `API URL     : ${NB_API}/api/generate`,
      `TOKEN       : ${tokenPresent ? '✓ Token present in localStorage' : '✗ No token — not logged in'}`,
      sep,
      '',
      `ERROR       : ${errMessage}`,
      '',
      isAuthError
        ? 'FIX         : Session token expired/missing.\n              → Log out, refresh page, and log back in.'
        : 'FIX         : Ensure backend server is running:\n              python backend/server.py\n              Ensure 1 API key is set in .env\n              (GEMINI_API_KEY / MISTRAL_API_KEY / GROQ_API_KEY / OPENAI_API_KEY)',
      sep
    ].join('\n');

    if (mode === 'learning') {
      const lTitle = document.getElementById('learning-out-title');
      const lContent = document.getElementById('out-learning-content');
      if (lTitle) lTitle.textContent = 'ERROR_LOG.TXT';
      if (lContent) lContent.textContent = errLog;
      const akWrap = document.getElementById('out-answerkey-wrap');
      if (akWrap) akWrap.style.display = 'none';
    } else {
      const qTitle = document.getElementById('quick-output-title');
      const qContent = document.getElementById('quick-output-content');
      if (qTitle) qTitle.textContent = 'ERROR_LOG.TXT';
      if (qContent) qContent.textContent = errLog;
    }

    if (typeof showToast === 'function') {
      showToast(`Generation failed: ${errMessage}`, 'error');
    }
  }
}

/** Show launch buttons to quiz/mock/flashcard pages after practice generation */
function _showPracticeLaunchButtons(data) {
  const wrap = document.getElementById('practice-launch-wrap');
  if (!wrap) return;
  const modeMap = { quiz: 'quiz.html', mock: 'mocktest.html', flash: 'flashcard.html', flashcard: 'flashcard.html' };
  const href = modeMap[data.mode] || 'quiz.html';
  const params = new URLSearchParams({ mode: data.mode, topic: data.topic, count: data.count, diff: data.diff, syl: data.syl });
  wrap.innerHTML = `<a href="${href}?${params}" class="launch-practice-btn" target="_blank">
    Open in ${data.practiceType} Mode →
  </a>`;
  wrap.style.display = 'block';
}


// ── Helper: get selected language ─────────────────────────
function getLang(group) {
  const selected = document.querySelector('.option-btn.selected[onclick*="lang"]');
  if (selected) {
    const text = selected.innerText.trim();
    if (text) return text;
  }
  const groupName = String(group || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (groupName) {
    const pattern = new RegExp(`toggleOption\\(this,\\s*['"]${groupName}['"]\\)`);
    const btn = Array.from(document.querySelectorAll('.option-btn.selected'))
      .find(b => pattern.test(b.getAttribute('onclick') || ''));
    if (btn) return btn.innerText.trim();
  }
  return 'Python';
}

// ── Learning Output ────────────────────────────────────────
function renderLearningOutput(input) {
  const topic = input.split('\n')[0].slice(0, 55);
  const isPractice = currentGoal === 'practice';
  const isExplain = currentGoal === 'explain';
  const noteStyle = document.querySelector('[onclick*="note-style"].selected')?.innerText?.trim() || 'Cornell Method';
  const genType = document.querySelector('[onclick*="gen-type"].selected')?.innerText?.trim() || 'Theory Only';
  const practiceType = document.querySelector('[onclick*="practice-type"].selected')?.innerText?.trim() || 'Quiz';

  document.getElementById('out-answerkey-wrap').style.display = 'none';

  // ── Explain mode ──
  if (isExplain) {
    document.getElementById('learning-out-title').textContent =
      'EXPLAIN_' + currentExplainType.toUpperCase() + '.TXT';
    document.getElementById('out-learning-content').textContent =
      renderExplainOutput(topic, currentExplainType);
    return;
  }

  document.getElementById('learning-out-title').textContent = isPractice ? 'QUESTIONS.TXT' : 'NOTES.TXT';

  // ── Notes ──
  if (!isPractice) {
    document.getElementById('out-learning-content').textContent =
      `╔══════════════════════════════════════════════════════╗
║  NERDLUME NOTES  —  ${noteStyle.toUpperCase().slice(0, 28).padEnd(28)}  ║
╚══════════════════════════════════════════════════════╝

  TOPIC    : ${topic}
  STYLE    : ${noteStyle}
  TYPE     : ${genType}
  GENERATED: ${new Date().toLocaleString()}

══════════════════════════════════════════════════════

UNIT 1 — INTRODUCTION & FUNDAMENTALS
─────────────────────────────────────────
Cue Column              │ Notes
────────────────────────┼──────────────────────────────
What is it?             │ Core definition of the subject
                        │ encompassing its key components
                        │ and theoretical foundation.
                        │
Key terms?              │ • Term A: Brief definition
                        │ • Term B: Related concept
                        │ • Term C: Supporting idea
                        │
Why important?          │ Provides the foundational
                        │ understanding required for
                        │ all advanced concepts.
────────────────────────┴──────────────────────────────

UNIT 2 — CORE CONCEPTS
─────────────────────────────────────────
Cue Column              │ Notes
────────────────────────┼──────────────────────────────
Main principle?         │ The primary principle states
                        │ that all elements follow a
                        │ hierarchical structure.
                        │
How is it applied?      │ Step 1: Identify the problem
                        │ Step 2: Choose the approach
                        │ Step 3: Implement the solution
                        │ Step 4: Verify and optimize
                        │
Common mistakes?        │ → Skipping validation
                        │ → Ignoring edge cases
                        │ → Poor time complexity
────────────────────────┴──────────────────────────────

SUMMARY BOX
─────────────────────────────────────────
The core principle establishes a framework where
each element builds upon the previous in a logical
sequence. The key takeaway is to understand both
the theoretical basis and the practical application.

══════════════════════════════════════════════════════
  [Generated by NERDLUME — Review before use]`;

    // ── Practice ──
  } else {
    document.getElementById('out-answerkey-wrap').style.display = 'block';
    document.getElementById('out-learning-content').textContent =
      `╔══════════════════════════════════════════════════════╗
║        NERDLUME — QUESTIONS FILE                     ║
╚══════════════════════════════════════════════════════╝

  TOPIC   : ${topic}
  TYPE    : ${practiceType}
  DATE    : ${new Date().toLocaleString()}

══════════════════════════════════════════════════════

Q1. [MCQ] Which of the following best defines the topic?
    (a) First interpretation
    (b) Correct and precise definition
    (c) Partially correct statement
    (d) Unrelated concept

Q2. [MCQ] What is the primary purpose of this concept?
    (a) To simplify redundant operations
    (b) To enhance memory efficiency
    (c) To enable hierarchical problem solving
    (d) All of the above

Q3. [Short Answer] Explain the main principle in 3-4 lines.

Q4. [True/False] The concept is applicable only in
    theoretical scenarios.

Q5. [Fill in Blank] The _______ method is used when
    dealing with recursive data structures.

Q6. [Short Answer] List 3 real-world applications of
    this concept.

══════════════════════════════════════════════════════
  ➤ See ANSWER_KEY.TXT for all answers
  [Generated by NERDLUME AI]`;

    document.getElementById('out-answerkey-content').textContent =
      `╔══════════════════════════════════════════════════════╗
║        NERDLUME — ANSWER KEY                         ║
╚══════════════════════════════════════════════════════╝

  TOPIC : ${topic}
  DATE  : ${new Date().toLocaleString()}

══════════════════════════════════════════════════════

Q1. Answer: (b) Correct and precise definition
    Explanation: Option (b) captures both the
    definitional scope and practical context.

Q2. Answer: (c) To enable hierarchical problem solving
    Explanation: The primary purpose is to structure
    complex problems into manageable hierarchies.

Q3. The main principle states that all elements in
    the system follow a defined order. This order
    ensures predictability, scalability, and logical
    consistency across all operations and use cases.

Q4. Answer: FALSE
    Explanation: The concept has wide real-world
    applications in software, engineering, and science.

Q5. Answer: Recursive / Divide-and-Conquer

Q6. Real-world applications:
    1. Database indexing and search optimization
    2. Network routing algorithms
    3. Compiler design and expression parsing

══════════════════════════════════════════════════════
  [Generated by NERDLUME AI — Verify before use]`;
  }
}

// ── Explain Output ─────────────────────────────────────────
function renderExplainOutput(topic, type) {
  const ts = new Date().toLocaleString();

  // ── Numerical ──
  if (type === 'numerical') {
    return `╔══════════════════════════════════════════════════════╗
║  NERDLUME — NUMERICAL EXPLANATION                    ║
╚══════════════════════════════════════════════════════╝

  TOPIC    : ${topic}
  TYPE     : Numerical — Step-by-Step
  GENERATED: ${ts}

══════════════════════════════════════════════════════

PROBLEM STATEMENT
─────────────────────
A body of mass 5 kg is moving with an initial velocity
of 10 m/s. A force of 20 N is applied for 4 seconds.
Find the final velocity and displacement.

══════════════════════════════════════════════════════

CONCEPT & LAW USED
──────────────────────
► Newton's Second Law of Motion
► Equations of Uniformly Accelerated Motion (Kinematics)

Key Formulas:
   F = m × a          ... (Newton's Second Law)
   v = u + at         ... (First Equation of Motion)
   s = ut + ½at²      ... (Second Equation of Motion)

══════════════════════════════════════════════════════

STEP-BY-STEP SOLUTION
──────────────────────────

  STEP 1 — Find Acceleration
  ┌────────────────────────────────────────┐
  │  Formula :  F = m × a                 │
  │  Rearrange: a = F / m                 │
  │  Values   :  a = 20 / 5              │
  │  Result   :  a = 4 m/s²              │
  └────────────────────────────────────────┘
  → Concept: Net force divided by mass gives
    the rate of change of velocity (acceleration).

  STEP 2 — Find Final Velocity
  ┌────────────────────────────────────────┐
  │  Formula :  v = u + at                │
  │  Values   :  v = 10 + (4)(4)         │
  │           :  v = 10 + 16             │
  │  Result   :  v = 26 m/s              │
  └────────────────────────────────────────┘
  → Concept: Initial velocity plus change in velocity
    (acceleration × time) gives final velocity.

  STEP 3 — Find Displacement
  ┌────────────────────────────────────────┐
  │  Formula :  s = ut + ½at²             │
  │  Values   :  s = (10)(4) + ½(4)(4²)  │
  │           :  s = 40 + ½(4)(16)       │
  │           :  s = 40 + 32             │
  │  Result   :  s = 72 m                │
  └────────────────────────────────────────┘
  → Concept: Total distance = initial motion component
    + extra distance due to acceleration.

══════════════════════════════════════════════════════

FINAL ANSWER
────────────────
   ┌──────────────────────────────┐
   │  Acceleration  =   4  m/s²  │
   │  Final Velocity = 26  m/s   │
   │  Displacement  = 72  m      │
   └──────────────────────────────┘

══════════════════════════════════════════════════════
  [Generated by NERDLUME AI — Verify before use]`;
  }

  // ── Theory ──
  if (type === 'theory') {
    const size = document.querySelector('[onclick*="theory-size"].selected')?.innerText?.trim() || '1-Liner';
    const answers = {
      '1-Liner':
        `► Newton's First Law states that an object remains at rest or in uniform motion unless acted upon by an external unbalanced force.`,
      'Key Points':
        `► Definition: An object resists any change in its state of motion.\n► Term: This property is called Inertia.\n► Condition: A net external force is needed to cause acceleration.\n► Applies to: All objects with mass in classical mechanics.\n► Named after: Sir Isaac Newton (Principia Mathematica, 1687).`,
      'Short Paragraph':
        `Newton's First Law of Motion, also called the Law of Inertia, states that every object at rest remains at rest, and every object in motion continues moving in a straight line at constant speed, unless acted upon by a net external force. Inertia is the measure of an object's resistance to change in motion and is directly proportional to the object's mass.`,
      'Long Paragraph':
        `Newton's First Law of Motion, commonly referred to as the Law of Inertia, establishes one of the most foundational principles in classical mechanics. The law states that an object will remain in its current state — whether at rest or moving at a constant velocity in a straight line — unless it is compelled to change that state by the action of a net external force. This observation was revolutionary because it challenged the then-dominant Aristotelian view that objects naturally slow down and stop without continuous effort. The concept of inertia, which quantifies how strongly an object resists changes in its motion, is directly tied to mass: the greater the mass, the greater the inertia. In everyday life, this law explains why passengers lurch forward when a car brakes suddenly — the body tends to continue in motion even when the vehicle stops. Similarly, a book resting on a table stays put unless someone pushes it.`,
      'Detailed Essay':
        `Newton's First Law of Motion — Law of Inertia\n\n1. INTRODUCTION\nNewton's First Law of Motion, formulated by Sir Isaac Newton in his landmark work "Philosophiæ Naturalis Principia Mathematica" (1687), forms the bedrock of classical mechanics.\n\n2. STATEMENT\n"Every body continues in its state of rest, or uniform motion in a right line, unless it is compelled to change that state by forces impressed upon it." — Isaac Newton\n\nIn modern language: An object at rest stays at rest and an object in motion stays in motion at constant velocity, unless acted upon by a net external force.\n\n3. CONCEPT OF INERTIA\nInertia is the inherent tendency of matter to resist any change in its current state of motion. It is not a force; it is a property. It is directly proportional to mass — doubling mass doubles inertia.\n\n4. APPLICATIONS\n   • Vehicle safety: Seatbelts prevent the body from continuing forward during sudden braking.\n   • Space travel: Spacecraft in deep space continue at constant velocity without engines.\n   • Sports: A cricket ball bowled continues on its path until friction, gravity, or bat intervenes.\n\n5. CONCLUSION\nNewton's First Law elegantly captures the natural tendency of matter to preserve its state of motion, establishing that force — not motion itself — is what requires explanation.`
    };
    const ans = answers[size] || answers['1-Liner'];
    return `╔══════════════════════════════════════════════════════╗
║  NERDLUME — THEORY EXPLANATION  [${size.toUpperCase().slice(0, 12).padEnd(12)}]  ║
╚══════════════════════════════════════════════════════╝

  TOPIC    : ${topic}
  FORMAT   : ${size}
  GENERATED: ${ts}

══════════════════════════════════════════════════════

${ans}

══════════════════════════════════════════════════════
  [Generated by NERDLUME AI — Verify before use]`;
  }

  // ── Code ──
  if (type === 'code') {
    const lang = document.querySelector('[onclick*="explain-lang"].selected')?.innerText?.trim() || 'Python';
    return `╔══════════════════════════════════════════════════════╗
║  NERDLUME — CODE EXPLANATION                         ║
╚══════════════════════════════════════════════════════╝

  TOPIC    : ${topic}
  LANGUAGE : ${lang}
  GENERATED: ${ts}

══════════════════════════════════════════════════════

REQUIREMENTS TO RUN
────────────────────────
  • Language : ${lang}
  • Runtime  : Python 3.8+ (or equivalent for chosen lang)
  • Libraries: None (standard library only)
  • IDE      : VS Code, PyCharm, or any terminal
  • Command  : python solution.py

══════════════════════════════════════════════════════

FULL CODE (with inline comments)
──────────────────────────────────────
def bubble_sort(arr):
    """
    Sorts a list using the Bubble Sort algorithm.
    Time Complexity : O(n²) worst/average, O(n) best
    Space Complexity: O(1) — in-place sort
    """
    n = len(arr)                     # Get total number of elements

    for i in range(n - 1):          # Outer loop: n-1 passes needed
        swapped = False              # Optimization flag

        for j in range(n - i - 1):  # Inner loop: compare adjacent pairs
            if arr[j] > arr[j + 1]: # If current > next, swap them
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True       # Mark that a swap occurred

        if not swapped:              # If no swaps, array is already sorted
            break                    # Early exit — best case O(n)

    return arr

# ── DRIVER CODE ──
data = [64, 34, 25, 12, 22, 11, 90]
print("Before:", data)
result = bubble_sort(data)
print("After :", result)

══════════════════════════════════════════════════════

LINE-BY-LINE EXPLANATION
─────────────────────────────
  Line 1  │ def bubble_sort(arr):
           │ → Defines a function that accepts a list 'arr'

  Line 6  │ n = len(arr)
           │ → Stores length to avoid repeated len() calls

  Line 8  │ for i in range(n - 1):
           │ → Outer loop controls the number of passes
           │   After each pass, the largest element "bubbles up"
           │   to its correct position at the end

  Line 11 │ for j in range(n - i - 1):
           │ → Inner loop compares adjacent elements

  Line 12 │ if arr[j] > arr[j + 1]:
           │ → Compare: if left > right, they're out of order

  Line 13 │ arr[j], arr[j + 1] = arr[j + 1], arr[j]
           │ → Python's elegant simultaneous swap (no temp variable)

  Line 16 │ if not swapped: break
           │ → Optimization: if no swaps occurred, array is sorted

══════════════════════════════════════════════════════

SAMPLE OUTPUT
──────────────────
  Before: [64, 34, 25, 12, 22, 11, 90]
  After : [11, 12, 22, 25, 34, 64, 90]

══════════════════════════════════════════════════════
  [Generated by NERDLUME AI — Verify before use]`;
  }

  // ── Example Guide ──
  if (type === 'example') {
    const lang = document.querySelector('[onclick*="example-lang"].selected')?.innerText?.trim() || 'Python';
    return `╔══════════════════════════════════════════════════════╗
║  NERDLUME — EXAMPLE GUIDE                            ║
╚══════════════════════════════════════════════════════╝

  TOPIC    : ${topic}
  LANGUAGE : ${lang}
  GENERATED: ${ts}

══════════════════════════════════════════════════════

PLAIN LANGUAGE EXPLANATION
────────────────────────────────
Recursion is when a function calls itself to solve a
smaller version of the same problem. Think of it like
Russian nesting dolls — each doll contains a smaller
copy of itself, until you reach the tiniest one.

══════════════════════════════════════════════════════

REAL-WORLD ANALOGY
───────────────────────
Imagine you're standing in a queue and want to know
what number you are. You can't see the front directly.

  You ask the person in front: "What's your number?"
  → They ask the person in front of them.
  → This keeps going until the first person says "I'm #1"
  → Each person adds 1 and passes it back.

  That's recursion: each step delegates to a simpler
  version until a base case (person #1) is reached.

══════════════════════════════════════════════════════

CODE EXAMPLE — Factorial using Recursion (${lang})
──────────────────────────────────────────────────────
def factorial(n):
    # BASE CASE: stop the recursion
    if n == 0 or n == 1:
        return 1

    # RECURSIVE CASE: n! = n × (n-1)!
    return n * factorial(n - 1)

# Real-world context: How many ways can 5 people
# sit in 5 chairs? → 5! = 120 arrangements
print(factorial(5))   # Output: 120
print(factorial(0))   # Output: 1 (by definition)

──────────────────────────────────────────────────────
Execution trace for factorial(4):
  factorial(4)
    └→ 4 × factorial(3)
           └→ 3 × factorial(2)
                  └→ 2 × factorial(1)
                         └→ returns 1     ◄ BASE CASE
                  └→ returns 2 × 1 = 2
           └→ returns 3 × 2 = 6
    └→ returns 4 × 6 = 24

══════════════════════════════════════════════════════

INDUSTRY USE CASES
───────────────────────
  1. File Systems  — traversing nested folders
  2. JSON Parsing  — nested objects in API responses
  3. UI Rendering  — React component trees
  4. Compilers     — recursive descent parsers (ASTs)
  5. Game Dev      — maze solving, pathfinding

══════════════════════════════════════════════════════

COMMON MISCONCEPTIONS
──────────────────────────
  ✗ "Recursion is always better than loops"
    → Loops are often faster & use less memory.

  ✗ "Recursion never ends"
    → It ends if you define a correct BASE CASE.

  ✗ "Recursion can't handle large inputs"
    → For very deep recursion, use iteration or
       tail-call optimization (language dependent).

══════════════════════════════════════════════════════
  [Generated by NERDLUME AI — Verify before use]`;
  }

  return `[Generated by NERDLUME AI — Select a sub-type and regenerate]`;
}

// ── Quick Mode Output ──────────────────────────────────────
function renderQuickOutput(input) {
  const topic = input.slice(0, 60);
  const isAssignment = currentQuickMode === 'assignment';
  const lang = getLang(isAssignment ? 'lang-a' : 'lang-p');

  const isCodeTopic = /code|program|class|function|array|list|sort|search|tree|graph|implement/i.test(topic);

  const codeBlock = {
    Python: `# NERDLUME — ${topic}
def main():
    data   = []
    result = process(data)
    print(f"Output: {result}")

def process(data):
    return "Completed Successfully"

if __name__ == "__main__":
    main()`,
    'C++': `// NERDLUME — ${topic}
#include <iostream>
using namespace std;

class Solution {
public:
    void execute() {
        cout << "Processing: ${topic}" << endl;
        cout << "Output: Completed Successfully" << endl;
    }
};

int main() { Solution sol; sol.execute(); return 0; }`,
    Java: `// NERDLUME — ${topic}
public class Solution {
    public static void main(String[] args) {
        new Solution().execute();
    }
    public void execute() {
        System.out.println("Output: Completed Successfully");
    }
}`,
    C: `/* NERDLUME — ${topic} */
#include <stdio.h>
void execute() { printf("Output: Completed Successfully\\n"); }
int main() { printf("Processing: ${topic}\\n"); execute(); return 0; }`,
    JavaScript: `// NERDLUME — ${topic}
async function main() {
  const result = await process([]);
  console.log("Output:", result);
}
async function process(data) { return "Completed Successfully"; }
main().catch(console.error);`
  };

  const code = codeBlock[lang] || `// NERDLUME — ${topic}\n// Language: ${lang}\n// Implementation here`;

  if (isAssignment) {
    const selectedSecs = Array.from(document.querySelectorAll('#panel-assignment .options-2col .option-btn.selected'))
      .map(btn => {
        const clone = btn.cloneNode(true);
        clone.querySelector('.option-dot')?.remove();
        return clone.innerText.trim().toLowerCase();
      });

    let outputParts = [];
    if (selectedSecs.length === 0 || selectedSecs.includes('theoretical answers') || selectedSecs.includes('summary / abstract')) {
      outputParts.push(`1. INTRODUCTION\n───────────────\nThis assignment covers the fundamental concepts, background,\nand practical context of: ${topic}.`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('theoretical answers')) {
      outputParts.push(`2. THEORY & BACKGROUND\n───────────────────────\nKey concepts and theoretical foundations include:\n  • Primary definition and scope of the subject\n  • Core principles and governing frameworks\n  • Historical evolution and key milestones\n  • Industry relevance and current developments`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('theoretical answers')) {
      outputParts.push(`3. REAL-LIFE EXAMPLE / CASE STUDY\n──────────────────────────────────\nA notable real-world application of ${topic} is:\n  • Context: How organizations or professionals apply this concept\n  • Solution: The structured methodology used to resolve problems\n  • Impact: Measurable outcomes, efficiency gains, and key benefits\n  • Lessons Learned: Crucial takeaways for students and practitioners`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('code generation') || selectedSecs.includes('implementation')) {
      if (isCodeTopic) {
        outputParts.push(`3. CODE IMPLEMENTATION (${lang})\n────────────────────────────────\n${code}`);
      }
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('ascii diagrams & flowcharts')) {
      outputParts.push(`ASCII FLOWCHART:\n┌──────────────┐\n│    START     │\n└──────┬───────┘\n       ▼\n┌──────────────┐    NO    ┌──────────────┐\n│  Input Valid?├──────────►  Return Error│\n└──────┬───────┘          └──────────────┘\n       │ YES\n       ▼\n┌──────────────┐\n│  Process Data│\n└──────┬───────┘\n       ▼\n┌──────────────┐\n│     END      │\n└──────────────┘`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('theoretical answers') || selectedSecs.includes('conclusion')) {
      outputParts.push(`4. DISCUSSION & CONCLUSION\n─────────────────────────\nIn conclusion, studying ${topic} provides critical insights\nthat connect theoretical models with modern real-world success.`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('references & citations')) {
      outputParts.push(`5. REFERENCES\n──────────────\n  [1] Reference Textbook / Academic Journal\n  [2] Professional Industry Guidelines\n  [3] Verified Case Study Reports`);
    }

    const output = `╔══════════════════════════════════════════════════════╗
║          NERDLUME — ASSIGNMENT FILE                  ║
╚══════════════════════════════════════════════════════╝

  TOPIC    : ${topic}
  DATE     : ${new Date().toLocaleString()}

══════════════════════════════════════════════════════

` + outputParts.join('\n\n') + `\n\n══════════════════════════════════════════════════════\n  [Generated by NERDLUME AI — Edit before submission]`;

    document.getElementById('quick-output-content').textContent = output;
    return;
  } else {
    const selectedSecs = Array.from(document.querySelectorAll('#panel-practical .options-2col .option-btn.selected'))
      .map(btn => {
        const clone = btn.cloneNode(true);
        clone.querySelector('.option-dot')?.remove();
        return clone.innerText.trim().toLowerCase();
      });

    let outputParts = [];
    if (selectedSecs.length === 0 || selectedSecs.includes('aim & objective') || selectedSecs.includes('aim')) {
      outputParts.push(`AIM\n────\nTo implement and study: ${topic}\n\nOBJECTIVE\n──────────\n  1. Understand the theoretical concepts involved\n  2. Implement a working solution using ${lang}\n  3. Analyze the output and verify correctness`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('theory background') || selectedSecs.includes('theory')) {
      outputParts.push(`THEORY\n───────\nThis practical explores the core principles of the\ngiven topic including concept definition, underlying\nalgorithm, time/space complexity, and applications.`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('procedure / algorithm') || selectedSecs.includes('procedure') || selectedSecs.includes('algorithm')) {
      outputParts.push(`ALGORITHM / PROCEDURE\n──────────────────────\n  Step 1 : Define the problem and required inputs\n  Step 2 : Choose appropriate data structures\n  Step 3 : Implement the logic in ${lang}\n  Step 4 : Test with sample and edge case inputs\n  Step 5 : Record and verify the output`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('code with comments') || selectedSecs.includes('code')) {
      outputParts.push(`CODE (${lang})\n──────────────────────────────────────────────────────\n${code}\n──────────────────────────────────────────────────────`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('expected output')) {
      outputParts.push(`EXPECTED OUTPUT\n────────────────\n  Processing: ${topic}\n  Output: Completed Successfully`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('conclusion')) {
      outputParts.push(`CONCLUSION\n───────────\nThrough this practical, we successfully implemented\n${topic} and reinforced understanding of the core algorithm.`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('result table')) {
      outputParts.push(`RESULT\n───────\nThe program was compiled and executed successfully.`);
    }
    if (selectedSecs.length === 0 || selectedSecs.includes('viva questions') || selectedSecs.includes('viva')) {
      outputParts.push(`VIVA QUESTIONS\n───────────────\n  Q1. What is the time complexity of your solution?\n  Q2. What data structure did you use and why?\n  Q3. How would you optimize this further?\n  Q4. What are the real-world applications?`);
    }

    const output = `╔══════════════════════════════════════════════════════╗
║          NERDLUME — PRACTICAL FILE                   ║
╚══════════════════════════════════════════════════════╝

  Date    : ${new Date().toLocaleDateString()}
  Roll No : _______________
  Batch   : _______________
  Subject : _______________

══════════════════════════════════════════════════════

` + outputParts.join('\n\n') + `\n\n══════════════════════════════════════════════════════\n  [Generated by NERDLUME AI — Verify before submission]`;

    document.getElementById('quick-output-content').textContent = output;
  }
}

// ── Utilities ──────────────────────────────────────────────
function cleanMathFormulas(text) {
  if (!text) return '';
  let t = text;
  // Delimiters
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
  t = t.replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  t = t.replace(/(?<!\w)\$(?!\s)([\s\S]*?)(?<!\s)\$(?!\w)/g, '$1');

  // Fractions and roots
  t = t.replace(/\\(?:d)?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
  t = t.replace(/\\sqrt\[([^{}]+)\]\{([^{}]+)\}/g, '$1√($2)');
  t = t.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');

  // Text / font macros
  t = t.replace(/\\(?:text|mathbf|mathrm|operatorname|mathit|bm|mathcal)\{([^{}]+)\}/g, '$1');

  // Functions
  t = t.replace(/\\(tanh|sinh|cosh|sin|cos|tan|cot|sec|csc|log|ln|exp|lim|min|max|argmax|argmin|det|dim|ker|deg|gcd)(?![a-zA-Z])/g, '$1');

  // Greek Map
  const greek = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\Gamma': 'Γ',
    '\\delta': 'δ', '\\Delta': 'Δ', '\\epsilon': 'ε', '\\varepsilon': 'ε',
    '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\Theta': 'Θ',
    '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\Lambda': 'Λ',
    '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\Xi': 'Ξ',
    '\\pi': 'π', '\\Pi': 'Π', '\\rho': 'ρ', '\\varrho': 'ρ',
    '\\sigma': 'σ', '\\Sigma': 'Σ', '\\tau': 'τ', '\\upsilon': 'υ',
    '\\phi': 'φ', '\\Phi': 'Φ', '\\varphi': 'φ', '\\chi': 'χ',
    '\\psi': 'ψ', '\\Psi': 'Ψ', '\\omega': 'ω', '\\Omega': 'Ω'
  };
  for (const [m, s] of Object.entries(greek)) {
    t = t.replace(new RegExp(m.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g'), s);
  }

  // Operators Map
  const ops = {
    '\\cdot': '·', '\\odot': '⊙', '\\otimes': '⊗', '\\times': '×',
    '\\div': '÷', '\\pm': '±', '\\mp': '∓', '\\approx': '≈',
    '\\neq': '≠', '\\ne': '≠', '\\leq': '≤', '\\le': '≤',
    '\\geq': '≥', '\\ge': '≥', '\\ll': '≪', '\\gg': '≫',
    '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
    '\\sum': '∑', '\\prod': '∏', '\\int': '∫',
    '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\subseteq': '⊆',
    '\\cup': '∪', '\\cap': '∩', '\\forall': '∀', '\\exists': '∃',
    '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←',
    '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔',
    '\\leftrightarrow': '↔', '\\dots': '...', '\\cdots': '...', '\\ldots': '...'
  };
  for (const [m, s] of Object.entries(ops)) {
    t = t.replace(new RegExp(m.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g'), s);
  }

  // Superscripts & Subscripts
  t = t.replace(/\^\{?2\}?/g, '²');
  t = t.replace(/\^\{?3\}?/g, '³');
  t = t.replace(/\^\{?(?:T|\\top)\}?/g, 'ᵀ');
  t = t.replace(/\^\{?(-1)\}?/g, '⁻¹');
  t = t.replace(/_\{([a-zA-Z0-9\+\-\*\/\s]+)\}/g, '_($1)');

  // Stray backslashes
  t = t.replace(/\\([\{\}\[\]])/g, '$1');
  t = t.replace(/\\,/g, ' ').replace(/\\;/g, ' ').replace(/\\quad/g, '  ').replace(/\\qquad/g, '    ');

  return t;
}

function cleanPlainText(text) {
  if (!text) return '';
  let t = cleanMathFormulas(text);
  t = t.replace(/^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```\s*$/gi, '$1');
  t = t.replace(/^'''(?:markdown|md|text)?\s*\n([\s\S]*?)\n'''\s*$/gi, '$1');

  const lines = t.split('\n');
  const diagramChars = new Set(['┌','┐','└','┘','├','┤','┬','┴','┼','│','─','║','═','╔','╗','╚','╝','╠','╣','▲','▼','◄','►','┼','╭','╮','╯','╰','╱','╲']);
  let inCode = false;
  const cleaned = [];

  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith('```') || stripped.startsWith("'''")) {
      inCode = !inCode;
      cleaned.push('');
      continue;
    }
    if (inCode || Array.from(line).some(ch => diagramChars.has(ch))) {
      cleaned.push(line);
      continue;
    }
    if (/(\+[-=]+\+|\s*-->\s*|\s*<--\s*|\s*==>\s*)/.test(line)) {
      cleaned.push(line);
      continue;
    }
    if (stripped.startsWith('|') && stripped.endsWith('|')) {
      const parts = stripped.replace(/^\||\|$/g, '').split('|').map(c => c.trim().replace(/\*\*/g, '').replace(/\*/g, ''));
      cleaned.push('  | ' + parts.join(' | ') + ' |');
      continue;
    }
    if (!stripped) {
      cleaned.push('');
      continue;
    }

    let l = stripped;
    // Strip bold & italic while preserving subscripts
    l = l.replace(/\*{2,3}(.*?)\*{2,3}/g, '$1');
    l = l.replace(/\*([^*\n]+)\*/g, '$1');
    l = l.replace(/(?<=\s)_(?!\s)([^_\n]+?)(?<!\s)_(?=\s|[.,;:!?]|$)/g, '$1');
    l = l.replace(/\*\*/g, '').replace(/___/g, '').replace(/__/g, '');
    l = l.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
    l = l.replace(/`([^`]+)`/g, '$1');

    if (l.startsWith('###') || l.startsWith('####')) {
      let sub = l.replace(/^#+\s*/, '').trim();
      if (!sub.endsWith(':')) sub += ':';
      cleaned.push('');
      cleaned.push(`  ${sub}`);
    } else if (l.startsWith('##')) {
      const sec = l.replace(/^#+\s*/, '').trim();
      const div = '-'.repeat(Math.min(Math.max(sec.length + 4, 30), 60));
      cleaned.push('');
      cleaned.push(sec);
      cleaned.push(div);
    } else if (l.startsWith('#')) {
      const title = l.replace(/^#+\s*/, '').trim();
      const border = '='.repeat(Math.min(Math.max(title.length + 6, 36), 72));
      cleaned.push('');
      cleaned.push(border);
      cleaned.push(`  ${title.toUpperCase()}`);
      cleaned.push(border);
      cleaned.push('');
    } else if (/^[-*+•\u2022\u25cf\u25cb\u25aa\u25ab]\s*/.test(l)) {
      const item = l.replace(/^[-*+•\u2022\u25cf\u25cb\u25aa\u25ab]\s*/, '').trim();
      cleaned.push(`  - ${item}`);
    } else if (/^\d+[\.\)]\s+/.test(l)) {
      const m = l.match(/^(\d+[\.\)])\s+(.*)/);
      if (m) cleaned.push(`  ${m[1]} ${m[2]}`);
      else cleaned.push(`  ${l}`);
    } else {
      cleaned.push(`  ${l}`);
    }
  }

  const res = [];
  for (const cl of cleaned) {
    if (cl === '' && res.length && res[res.length - 1] === '') continue;
    res.push(cl);
  }
  return res.join('\n').trim();
}

function downloadOutput(id, filename) {
  let content = document.getElementById(id)?.textContent;
  if (!content) { showToast('Nothing to download yet!'); return; }
  if (filename.toLowerCase().endsWith('.txt')) {
    content = cleanPlainText(content);
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  a.download = filename;
  a.click();
  showToast('Downloaded: ' + filename);
}

async function downloadGeneratedFile(downloadUrl, fallbackTextId, fallbackFileName) {
  const token = nbApiToken();
  const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${NB_API}${downloadUrl}`;
  const authenticatedUrl = token ? `${fullUrl}?token=${encodeURIComponent(token)}` : fullUrl;

  try {
    const headers = token ? { 'Authorization': `Bearer ${token}`, 'X-Session-Token': token } : {};
    const res = await fetch(authenticatedUrl, { headers });
    if (res.ok) {
      const blob = await res.blob();
      let filename = fallbackFileName || 'assignment.docx';
      const disposition = res.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded: ${filename}`);
      return;
    }
  } catch (err) {
    console.warn('Authenticated download fetch failed, falling back to local file generation:', err);
  }

  // Fallback to local text blob
  if (fallbackTextId) {
    downloadOutput(fallbackTextId, fallbackFileName || 'assignment.txt');
  }
}

function copyOutput(id) {
  const content = document.getElementById(id)?.textContent;
  if (!content) { showToast('Nothing to copy!'); return; }
  navigator.clipboard.writeText(content).then(() => showToast('Copied to clipboard!'));
}

function clearAll(mode) {
  document.getElementById(mode + '-input').value = '';
  const storeId = mode + '-files';
  fileStores[storeId] = [];
  renderFiles(storeId);
  document.getElementById('output-' + mode).classList.remove('visible');
  showToast('Cleared!');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

/* =========================================================
   VIDEO NOTES FEATURE
   ========================================================= */

let _isVideoNotes = false;
let _currentVideoId = null;

// ── Technique selector that handles video panel show/hide ──
function selectNoteTech(btn, isVideo) {
  // Deselect all technique buttons
  document.querySelectorAll('.option-btn[onclick*="selectNoteTech"]').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  _isVideoNotes = isVideo;
  const panel = document.getElementById('video-notes-panel');
  if (!panel) return;

  if (isVideo) {
    panel.classList.add('visible');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    panel.classList.remove('visible');
  }
}

// ── YouTube URL parsing ────────────────────────────────────
function extractYtVideoId(url) {
  try {
    const u = new URL(url);
    // Standard: youtube.com/watch?v=ID
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return u.searchParams.get('v');
    }
    // Short: youtu.be/ID
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('?')[0];
    }
    // Shorts: youtube.com/shorts/ID
    const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
    if (shorts) return shorts[1];
    // Embed: youtube.com/embed/ID
    const embed = u.pathname.match(/\/embed\/([^/?]+)/);
    if (embed) return embed[1];
  } catch { /* invalid URL */ }
  return null;
}

function handleYtUrl(val) {
  const input = document.getElementById('yt-url-input');
  const clearBtn = document.getElementById('vn-clear-btn');
  const preview = document.getElementById('vn-preview-card');
  const errEl = document.getElementById('vn-url-error');

  // Show/hide clear button
  if (clearBtn) clearBtn.style.display = val.length ? 'flex' : 'none';

  if (!val.trim()) {
    input.className = 'vn-url-input';
    if (preview) preview.style.display = 'none';
    if (errEl) errEl.style.display = 'none';
    _currentVideoId = null;
    return;
  }

  const videoId = extractYtVideoId(val.trim());

  if (videoId) {
    _currentVideoId = videoId;
    input.className = 'vn-url-input vn-valid';
    if (errEl) errEl.style.display = 'none';

    // Show preview card with YouTube thumbnail
    if (preview) {
      const thumb = document.getElementById('vn-preview-thumb');
      const vidId = document.getElementById('vn-preview-vid-id');
      if (thumb) thumb.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      if (vidId) vidId.textContent = `Video ID: ${videoId}  •  youtube.com/watch?v=${videoId}`;
      preview.style.display = 'flex';
    }
  } else {
    _currentVideoId = null;
    input.className = 'vn-url-input vn-invalid';
    if (preview) preview.style.display = 'none';
    if (errEl) errEl.style.display = 'block';
  }
}

function clearYtUrl() {
  const input = document.getElementById('yt-url-input');
  const clearBtn = document.getElementById('vn-clear-btn');
  const preview = document.getElementById('vn-preview-card');
  const errEl = document.getElementById('vn-url-error');
  if (input) { input.value = ''; input.className = 'vn-url-input'; input.focus(); }
  if (clearBtn) clearBtn.style.display = 'none';
  if (preview) preview.style.display = 'none';
  if (errEl) errEl.style.display = 'none';
  _currentVideoId = null;
}

// ── Video Notes Generation ─────────────────────────────────
function generateVideoNotes() {
  const topic = document.getElementById('learning-input').value.trim();
  const vidId = _currentVideoId;

  if (!topic && !vidId) {
    showToast('Enter a topic or YouTube URL first!');
    return;
  }
  if (_isVideoNotes && !vidId) {
    showToast('Paste a valid YouTube URL to generate Video Notes!');
    document.getElementById('yt-url-input')?.focus();
    return;
  }

  setGenerateButtonState('learning', true);
  document.getElementById('loading-learning').classList.add('active');
  document.getElementById('output-learning').classList.remove('visible');

  const delay = 2200 + Math.random() * 800;
  setTimeout(() => {
    setGenerateButtonState('learning', false);
    document.getElementById('loading-learning').classList.remove('active');
    document.getElementById('output-learning').classList.add('visible');
    renderVideoNotesOutput(topic || 'YouTube Video', vidId);
  }, delay);
}

// ── Video Notes Output Renderer ────────────────────────────
function renderVideoNotesOutput(topic, videoId) {
  const format = document.querySelector('[onclick*="vn-format"].selected')?.innerText?.trim() || 'Timeline + Frames';
  const ssFreq = document.querySelector('[onclick*="ss-freq"].selected')?.innerText?.trim() || 'At key concepts';
  const ts = new Date().toLocaleString();

  // Simulated frames with timestamps, concepts, notes, quotes
  const frames = [
    {
      t: '00:00',
      concept: 'Introduction & Overview',
      notes: `The video opens by establishing the context and scope of the topic. The presenter introduces the core problem being solved and explains why this concept matters in real-world applications. Key terminology is defined from the start.`,
      quote: `"Understanding this concept is foundational — everything else we discuss builds on this."`,
      tags: ['introduction', 'overview', 'context'],
    },
    {
      t: '02:14',
      concept: 'Core Principle Explained',
      notes: `The main principle is demonstrated with a clear visual. The presenter breaks it into three components:\n  1. The input mechanism and how data flows\n  2. The transformation or processing step\n  3. The output and how results are validated\n\nEach component is color-coded on the diagram shown on screen.`,
      quote: `"This is the part most textbooks get wrong — the order of operations here is critical."`,
      tags: ['core concept', 'diagram', 'three components'],
    },
    {
      t: '07:45',
      concept: 'Step-by-Step Walkthrough',
      notes: `A worked example is shown live. The presenter codes the solution in real time, explaining each line. Notable points:\n  • Edge cases are handled explicitly\n  • Time complexity is discussed: O(n log n)\n  • The solution is tested with two different input sets\n\nThe code is clean and uses well-named variables for clarity.`,
      quote: `"Always test with the smallest possible input first — bugs hide in the base case."`,
      tags: ['walkthrough', 'code', 'complexity'],
    },
    {
      t: '13:22',
      concept: 'Common Mistakes & Pitfalls',
      notes: `The presenter lists the top 4 mistakes beginners make with this topic:\n  ✘ Off-by-one errors in loop bounds\n  ✘ Confusing shallow vs deep copy\n  ✘ Ignoring null/empty input edge cases\n  ✘ Over-engineering the solution\n\nEach mistake is shown with a bad example vs the correct approach side-by-side.`,
      quote: `"I've reviewed hundreds of submissions — these four mistakes account for 80% of wrong answers."`,
      tags: ['mistakes', 'debugging', 'tips'],
    },
    {
      t: '18:09',
      concept: 'Real-World Applications',
      notes: `Three industry use-cases are presented:\n  1. Used in database query optimization at scale\n  2. Powers recommendation engines in streaming platforms\n  3. Applied in compression algorithms for file storage\n\nFor each use-case, the presenter links back to the core principle shown earlier.`,
      quote: `"This isn't just academic — every major tech company uses this in production systems."`,
      tags: ['applications', 'industry', 'examples'],
    },
    {
      t: '23:51',
      concept: 'Summary & Key Takeaways',
      notes: `Final recap covers:\n  → The three core components from the introduction\n  → The correct implementation pattern to remember\n  → The most common mistake to avoid\n  → Next steps: practice problems and further reading resources\n\nThe presenter recommends 3 specific problems to solve for consolidation.`,
      quote: `"If you remember nothing else, remember this: simplicity beats cleverness every time."`,
      tags: ['summary', 'key points', 'next steps'],
    },
  ];

  // Build the output HTML (rendered as rich DOM, not plain text)
  const outContent = document.getElementById('out-learning-content');
  const outTitle = document.getElementById('learning-out-title');

  if (outTitle) outTitle.textContent = 'VIDEO_NOTES.TXT';

  // Switch to rich HTML mode for video notes
  outContent.style.display = 'none'; // hide textarea-style box
  outContent.style.fontFamily = 'inherit';

  // Find or create rich output container
  let richWrap = document.getElementById('vn-rich-output');
  if (!richWrap) {
    richWrap = document.createElement('div');
    richWrap.id = 'vn-rich-output';
    richWrap.className = 'vn-output-wrap';
    outContent.parentNode.insertBefore(richWrap, outContent);
  }

  richWrap.classList.add('visible');

  // Build thumbnail base URL
  const thumbBase = videoId
    ? `https://img.youtube.com/vi/${videoId}/`
    : null;

  // Quality thumbnails from YouTube (real URLs)
  const ytQualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
  const thumbQuality = 'mqdefault'; // reliable fallback

  richWrap.innerHTML = `
    <!-- Header -->
    <div class="vn-out-header">
      <span style="font-size:1.4rem;">🎬</span>
      <div class="vn-out-title">${topic}</div>
      <div class="vn-out-meta">Format: ${format} &nbsp;|&nbsp; ${ts}</div>
    </div>

    ${videoId ? `
    <!-- Source row -->
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px; padding:10px 14px; background:rgba(255,107,87,0.05); border:1px solid rgba(255,107,87,0.2); border-radius:10px;">
      <svg width="18" height="13" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/></svg>
      <span style="font-family:'Space Mono',monospace; font-size:0.7rem; color:var(--muted);">Source:</span>
      <a href="https://youtube.com/watch?v=${videoId}" target="_blank" style="font-family:'Space Mono',monospace; font-size:0.7rem; color:var(--accent2); text-decoration:none;">youtube.com/watch?v=${videoId}</a>
    </div>
    ` : ''}

    <!-- Stats bar -->
    <div class="vn-summary-bar">
      <div class="vn-sum-stat"><div class="vn-sum-num">${frames.length}</div><div class="vn-sum-label">Frames<br>Captured</div></div>
      <div class="vn-sum-stat"><div class="vn-sum-num">${frames.length}</div><div class="vn-sum-label">Key<br>Concepts</div></div>
      <div class="vn-sum-stat"><div class="vn-sum-num">~24 min</div><div class="vn-sum-label">Video<br>Duration</div></div>
      <div class="vn-sum-stat"><div class="vn-sum-num">${ssFreq}</div><div class="vn-sum-label">Capture<br>Mode</div></div>
    </div>

    <!-- Frame entries -->
    <div id="vn-frames-container">
      ${frames.map((f, i) => `
        <div class="vn-frame-entry" style="animation-delay:${i * 0.07}s;">
          <div class="vn-frame-left">
            <div class="vn-frame-img-wrap">
              ${thumbBase
      ? `<img class="vn-frame-img" src="${thumbBase}${thumbQuality}.jpg" alt="Frame at ${f.t}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div class="vn-frame-img-placeholder" style="display:none;"><span></span><span>${f.t}</span></div>`
      : `<div class="vn-frame-img-placeholder"><span></span><span>${f.t}</span></div>`
    }
            </div>
            <div class="vn-timestamp-badge">⏱ ${f.t}</div>
          </div>
          <div class="vn-frame-right">
            <div class="vn-frame-concept">${f.concept}</div>
            <div class="vn-frame-notes">${f.notes.replace(/\n/g, '<br>')}</div>
            <div class="vn-frame-quote">${f.quote}</div>
            <div class="vn-frame-tags">
              ${f.tags.map(tag => `<span class="vn-frame-tag">${tag}</span>`).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Footer note -->
    <div style="margin-top:20px; padding:14px 16px; background:rgba(255,255,255,0.02); border:1px dashed var(--border); border-radius:10px; font-size:0.74rem; color:var(--muted); text-align:center; font-family:'Space Mono',monospace; line-height:1.6;">
      🎬 Video Notes generated by NERDLUME AI &nbsp;|&nbsp; ${frames.length} frames captured &nbsp;|&nbsp; Verify against source video
    </div>
  `;

  // Save video notes to detailed history
  const textRep = buildVideoNotesText(topic, videoId, format, ssFreq, frames);
  saveToDetailedHistory('learning', topic, textRep);
  checkAndApplyLimits();
}

/* ─── Practice Panel (index.html) ─────────────────────── */
let _currentPMode = 'quiz';
let _timerPerQ = 120;   // seconds per question (default 2 min)
let _timerIsCustom = false;

/* ── Mode selector ── */
function selectPracticeMode(mode, el) {
  const normalizedMode = (mode === 'flashcard' || mode === 'flashcards') ? 'flash' : mode;
  const plan = getCurrentUserPlan();

  if ((normalizedMode === 'mock' || normalizedMode === 'flash') && !hasAccess(plan, 'free-premium')) {
    if (typeof openPaywallModal === 'function') {
      openPaywallModal(normalizedMode === 'mock' ? 'Mock Test' : 'Flash Cards', 'free-premium');
    } else if (typeof openPricingModal === 'function') {
      openPricingModal();
    }
    return;
  }

  _currentPMode = normalizedMode;
  document.querySelectorAll('.pmode-card').forEach(c => c.classList.remove('selected'));
  if (el) {
    el.classList.add('selected');
  } else {
    const cardEl = document.getElementById('pmc-' + _currentPMode);
    if (cardEl) cardEl.classList.add('selected');
  }

  const names = { quiz: 'Quiz', mock: 'Mock Test', flash: 'Flash Cards' };
  const btnNames = { quiz: 'Launch Quiz →', mock: 'Launch Mock Test →', flash: 'Launch Flash Cards →' };

  const iconEl = document.getElementById('plaunch-icon');
  if (iconEl) iconEl.textContent = '';

  const txtEl = document.getElementById('plaunch-txt');
  if (txtEl) txtEl.textContent = btnNames[_currentPMode] || `Launch ${names[_currentPMode] || 'Practice'} →`;

  const btn = document.querySelector('.plaunch-btn');
  if (btn) {
    btn.className = 'plaunch-btn';
    if (_currentPMode === 'mock') btn.classList.add('mock-mode');
    if (_currentPMode === 'flash') btn.classList.add('flash-mode');
  }

  /* Show/hide timer row — only for mock */
  const timerRow = document.getElementById('ptimer-row');
  if (timerRow) {
    if (_currentPMode === 'mock') timerRow.classList.add('visible');
    else timerRow.classList.remove('visible');
  }

  updateLaunchInfo();
  checkAndApplyLimits();
}

/* ── Timer preset selection ── */
function selectTimerPreset(secs, el) {
  document.querySelectorAll('.ptimer-preset').forEach(p => p.classList.remove('active'));
  el.classList.add('active');

  const customBox = document.getElementById('ptimer-custom');

  if (secs === 'custom') {
    _timerIsCustom = true;
    if (customBox) customBox.classList.add('show');
    const inp = document.getElementById('ptimer-custom-input');
    const mins = inp ? (parseFloat(inp.value) || 2) : 2;
    _timerPerQ = Math.round(mins * 60);
  } else {
    _timerIsCustom = false;
    _timerPerQ = secs;
    if (customBox) customBox.classList.remove('show');
  }

  refreshTimerPreview();
  updateLaunchInfo();
}

/* ── Custom timer input ── */
function onCustomTimerInput(val) {
  const mins = Math.max(0.5, Math.min(60, parseFloat(val) || 2));
  _timerPerQ = Math.round(mins * 60);
  refreshTimerPreview();
  updateLaunchInfo();
}

/* ── Timer preview label ── */
function refreshTimerPreview() {
  const previewEl = document.getElementById('ptimer-preview');
  if (!previewEl) return;
  const cnt = parseInt(document.querySelector('[onclick*="q-count"].selected')?.innerText?.replace(/\D/g, '') || '10');
  const total = _timerPerQ * cnt;
  const tMins = Math.floor(total / 60);
  const minsPerQ = (_timerPerQ / 60).toFixed(1).replace('.0', '');
  previewEl.textContent = `⏱ ${minsPerQ} min / question · ${tMins} min total`;
}

/* ── Launch info strip ── */
function updateLaunchInfo() {
  const el = document.getElementById('plaunch-info');
  if (!el) return;
  const mode = _currentPMode;
  const syl = document.querySelector('[onclick*="syl-mode"].selected')?.innerText?.trim() || 'Full Syllabus';
  const diff = document.querySelector('[onclick*="p-diff"].selected')?.innerText?.trim() || 'Medium';
  const cnt = document.querySelector('[onclick*="q-count"].selected')?.innerText?.trim() || '10 Questions';
  const icons = { quiz: '', mock: '', flash: '' };
  const names = { quiz: 'Quiz', mock: 'Mock Test', flash: 'Flash Cards' };

  if (mode === 'mock') {
    const minsPerQ = (_timerPerQ / 60).toFixed(1).replace('.0', '');
    el.textContent = `${icons[mode]} ${names[mode]} · ${cnt} · ${diff} · ${syl} · ⏱ ${minsPerQ} min/Q`;
  } else {
    el.textContent = `${icons[mode]} ${names[mode]} · ${cnt} · ${diff} · ${syl}`;
  }

  /* Also refresh timer preview when question count changes */
  if (mode === 'mock') refreshTimerPreview();
}

/* ── Launch ── */
async function launchPractice() {
  const mode = _currentPMode;
  const plan = getCurrentUserPlan();

  if ((mode === 'mock' || mode === 'flash') && !hasAccess(plan, 'free-premium')) {
    if (typeof openPaywallModal === 'function') {
      openPaywallModal(mode === 'mock' ? 'Mock Test' : 'Flash Cards', 'free-premium');
    } else if (typeof openPricingModal === 'function') {
      openPricingModal();
    }
    return;
  }

  const syl = (document.querySelector('[onclick*="syl-mode"].selected')?.innerText?.trim() || 'Full Syllabus').replace(/\s/g, '+');
  const diff = (document.querySelector('[onclick*="p-diff"].selected')?.innerText?.trim() || 'Medium').toLowerCase();
  const cnt = parseInt(document.querySelector('[onclick*="q-count"].selected')?.innerText?.replace(/\D/g, '') || '10');
  const topic = (document.getElementById('learning-input')?.value?.trim()?.split('\n')[0]?.slice(0, 80) || 'General Topic');
  const pages = { quiz: 'quiz.html', mock: 'mocktest.html', flash: 'flashcard.html' };
  const page = pages[mode] || 'quiz.html';

  let url = `${page}?mode=${mode}&syl=${encodeURIComponent(syl)}&diff=${diff}&count=${cnt}&topic=${encodeURIComponent(topic)}`;
  if (mode === 'mock') url += `&timer=${_timerPerQ}`;

  // Keep the latest launch settings for pages that need a fallback.
  try {
    sessionStorage.setItem('nb_practice_launch', JSON.stringify({
      mode, syl, diff, count: cnt, topic, timer: _timerPerQ,
      ts: Date.now(),
    }));
  } catch (e) { }

  window.location.href = url;
}

// openPricingModal is implemented in auth.js

/* ════════════════════════════════════════════════════════════
   DETAILED HISTORY & LIMITS MANAGEMENT ENGINE
   ════════════════════════════════════════════════════════════ */

function getWeekStartDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return monday > sevenDaysAgo ? monday : sevenDaysAgo;
}

async function getWeeklyUsage() {
  const weekStart = getWeekStartDate();
  let useNotes = 0;
  let useExplain = 0;
  let useQuick = 0;

  const session = (typeof getSession === 'function') ? getSession() : null;
  const userEmail = (session && session.email) ? session.email.trim().toLowerCase() : 'guest';
  const statsKey = 'nb_stats_' + userEmail;

  const token = localStorage.getItem('nb_api_token') || '';
  let apiHistory = [];
  let apiSuccess = false;

  if (token) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${NB_API}/api/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        apiHistory = data.history || [];
        apiSuccess = true;
      }
    } catch (e) {
      apiSuccess = false;
    }
  }

  const demoFileNames = ["NOTES_BINARY_SEARCH_TREES.TXT", "EXPLAIN_DIJKSTRA_ALGORITHM.TXT", "ASSIGNMENT_OPERATING_SYSTEMS.TXT", "QUIZ_COMPUTER_NETWORKS.TXT", "MOCK_TEST_DBMS.TXT", "VIDEO_NOTES_DEEP_LEARNING.TXT"];

  if (apiSuccess) {
    apiHistory.forEach(entry => {
      if (entry && !demoFileNames.includes(entry.fileName) && !String(entry.id || '').startsWith('demo')) {
        const entryDate = new Date(entry.createdAt || entry.ts);
        if (entryDate >= weekStart) {
          if (['notes', 'practice', 'quiz', 'mock', 'flash', 'flashcard', 'video', 'video-notes'].includes(entry.kind)) {
            useNotes++;
          } else if (entry.kind === 'explain') {
            useExplain++;
          } else if (entry.kind === 'quick') {
            useQuick++;
          }
        }
      }
    });
  } else {
    // Local account tracking fallback (when server is offline during testing)
    try {
      const statsData = localStorage.getItem(statsKey);
      if (statsData) {
        const parsed = JSON.parse(statsData);
        const generations = (parsed.generations || []).filter(g => g && (!g.id || !String(g.id).startsWith('demo')));
        generations.forEach(g => {
          const gDate = new Date(g.ts || g.createdAt);
          if (gDate >= weekStart) {
            if (['notes', 'practice', 'quiz', 'mock', 'flash', 'flashcard', 'video', 'video-notes'].includes(g.type)) {
              useNotes++;
            } else if (g.type === 'explain') {
              useExplain++;
            } else if (g.type === 'quick') {
              useQuick++;
            }
          }
        });
      }
    } catch (e) {}
  }

  return { notes: useNotes, explain: useExplain, quick: useQuick };
}

function getLimits() {
  const plan = getCurrentUserPlan();
  const limits = (window.PLAN_QUOTAS) ? window.PLAN_QUOTAS : {
    guest:          { notes: 3, explain: 2, quick: 7 },
    free:           { notes: 3, explain: 2, quick: 7 },
    'free-premium': { notes: 7, explain: 5, quick: 14 },
    diamond:        { notes: Infinity, explain: Infinity, quick: Infinity }
  };
  return limits[plan] || limits.free;
}

async function checkAndApplyLimits() {
  const usage = await getWeeklyUsage();
  const limits = getLimits();
  const plan = getCurrentUserPlan();

  const isNotesLocked = limits.notes !== Infinity && usage.notes >= limits.notes;
  const isExplainLocked = limits.explain !== Infinity && usage.explain >= limits.explain;
  const isQuickLocked = limits.quick !== Infinity && usage.quick >= limits.quick;

  const activeGoal = (typeof currentGoal !== 'undefined' ? currentGoal : 'notes').toLowerCase();

  const btnGenLearning = document.getElementById('btn-gen-learning');
  const btnGenQuick = document.getElementById('btn-gen-quick');
  const btnPLaunch = document.querySelector('.plaunch-btn');

  const requiredPlan = plan === 'free' ? 'free-premium' : 'diamond';

  // 1. Lock/unlock Learning Panel Generate Button based on the active goal/mode
  if (btnGenLearning) {
    let modeLocked = false;
    let categoryName = '';
    let usedCount = 0;
    let limitCount = 0;

    if (activeGoal === 'explain') {
      if (isExplainLocked) {
        modeLocked = true;
        categoryName = 'Explain Mode';
        usedCount = usage.explain;
        limitCount = limits.explain;
      }
    } else if (['notes', 'practice', 'quiz', 'mock', 'flash', 'flashcard', 'video', 'video-notes'].includes(activeGoal)) {
      if (isNotesLocked) {
        modeLocked = true;
        categoryName = 'Note Making';
        usedCount = usage.notes;
        limitCount = limits.notes;
      }
    }

    if (modeLocked) {
      btnGenLearning.disabled = false;
      btnGenLearning.setAttribute('data-locked', 'true');
      btnGenLearning.innerHTML = `<span><i data-lucide="lock" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i></span> Generate Now`;
      if (window.lucide) { lucide.createIcons(); }
      btnGenLearning.style.opacity = '1';
      btnGenLearning.style.cursor = 'pointer';
      btnGenLearning.style.pointerEvents = 'auto';
      btnGenLearning.title = `Click to generate or upgrade ${categoryName}!`;
      btnGenLearning.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof showLimitExceededModal === 'function') {
          showLimitExceededModal(categoryName, usedCount, limitCount, requiredPlan);
        } else if (typeof openPaywallModal === 'function') {
          openPaywallModal(`${categoryName} Limit Reached (${usedCount}/${limitCount})`, requiredPlan);
        } else if (typeof showToast === 'function') {
          showToast(`Weekly limit reached for ${categoryName} (${usedCount}/${limitCount}). Upgrade your plan!`, 'error');
        }
      };
    } else {
      btnGenLearning.disabled = false;
      btnGenLearning.removeAttribute('data-locked');
      btnGenLearning.innerHTML = `<span></span> Generate Now`;
      btnGenLearning.style.opacity = '';
      btnGenLearning.style.cursor = '';
      btnGenLearning.style.pointerEvents = '';
      btnGenLearning.title = '';
      btnGenLearning.onclick = (e) => { if (e) e.preventDefault(); generate('learning'); };
    }
  }

  // 2. Lock/unlock Practice Launch Button
  if (btnPLaunch) {
    const txtEl = document.getElementById('plaunch-txt');
    const names = { quiz: 'Launch Quiz →', mock: 'Launch Mock Test →', flash: 'Launch Flash Cards →' };
    const pLabelText = names[_currentPMode] || 'Launch Practice →';
    const isModeProLocked = (_currentPMode === 'mock' || _currentPMode === 'flash') && !hasAccess(plan, 'free-premium');

    if (isModeProLocked) {
      btnPLaunch.disabled = false;
      btnPLaunch.setAttribute('data-locked', 'true');
      btnPLaunch.innerHTML = `<i data-lucide="lock" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> <span id="plaunch-txt">Unlock with Premium</span>`;
      if (window.lucide) { lucide.createIcons(); }
      btnPLaunch.style.opacity = '1';
      btnPLaunch.style.cursor = 'pointer';
      btnPLaunch.style.pointerEvents = 'auto';
      btnPLaunch.title = `Upgrade to Premium or Diamond to unlock ${_currentPMode === 'mock' ? 'Mock Tests' : 'Flash Cards'}!`;
      btnPLaunch.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof openPaywallModal === 'function') {
          openPaywallModal(_currentPMode === 'mock' ? 'Mock Test' : 'Flash Cards', 'free-premium');
        } else if (typeof openPricingModal === 'function') {
          openPricingModal();
        }
      };
    } else if (isNotesLocked) {
      btnPLaunch.disabled = false;
      btnPLaunch.setAttribute('data-locked', 'true');
      btnPLaunch.innerHTML = `<i data-lucide="lock" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> <span id="plaunch-txt">${pLabelText}</span>`;
      if (window.lucide) { lucide.createIcons(); }
      btnPLaunch.style.opacity = '1';
      btnPLaunch.style.cursor = 'pointer';
      btnPLaunch.style.pointerEvents = 'auto';
      btnPLaunch.title = `Click to launch or upgrade Practice & Note Making!`;
      btnPLaunch.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof showLimitExceededModal === 'function') {
          showLimitExceededModal('Practice & Note Making', usage.notes, limits.notes, requiredPlan);
        } else if (typeof openPaywallModal === 'function') {
          openPaywallModal(`Practice Limit Reached (${usage.notes}/${limits.notes})`, requiredPlan);
        } else if (typeof showToast === 'function') {
          showToast(`Weekly limit reached for Practice & Note Making!`, 'error');
        }
      };
    } else {
      btnPLaunch.disabled = false;
      btnPLaunch.removeAttribute('data-locked');
      if (txtEl) txtEl.textContent = pLabelText;
      else btnPLaunch.innerHTML = `<span id="plaunch-txt">${pLabelText}</span>`;
      btnPLaunch.style.opacity = '';
      btnPLaunch.style.cursor = '';
      btnPLaunch.style.pointerEvents = '';
      btnPLaunch.title = '';
      btnPLaunch.onclick = (e) => { if (e) e.preventDefault(); launchPractice(); };
    }
  }

  // 3. Lock/unlock Quick Mode Generate Button
  if (btnGenQuick) {
    if (isQuickLocked) {
      btnGenQuick.disabled = false;
      btnGenQuick.setAttribute('data-locked', 'true');
      btnGenQuick.innerHTML = `<span><i data-lucide="lock" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i></span> Generate File`;
      if (window.lucide) { lucide.createIcons(); }
      btnGenQuick.style.opacity = '1';
      btnGenQuick.style.cursor = 'pointer';
      btnGenQuick.style.pointerEvents = 'auto';
      btnGenQuick.title = `Click to generate or upgrade Quick Mode!`;
      btnGenQuick.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof showLimitExceededModal === 'function') {
          showLimitExceededModal('Quick Mode', usage.quick, limits.quick, requiredPlan);
        } else if (typeof openPaywallModal === 'function') {
          openPaywallModal(`Quick Mode Limit Reached (${usage.quick}/${limits.quick})`, requiredPlan);
        } else if (typeof showToast === 'function') {
          showToast(`Weekly limit reached for Quick Mode (${usage.quick}/${limits.quick}). Upgrade your plan!`, 'error');
        }
      };
    } else {
      btnGenQuick.disabled = false;
      btnGenQuick.removeAttribute('data-locked');
      btnGenQuick.innerHTML = `<span></span> Generate File`;
      btnGenQuick.style.opacity = '';
      btnGenQuick.style.cursor = '';
      btnGenQuick.style.pointerEvents = '';
      btnGenQuick.title = '';
      btnGenQuick.onclick = (e) => { if (e) e.preventDefault(); generate('quick'); };
    }
  }
}

function buildVideoNotesText(topic, videoId, format, ssFreq, frames) {
  let lines = [
    `NERDLUME — VIDEO NOTES`,
    `═`.repeat(50),
    `TOPIC        : ${topic}`,
    `VIDEO ID     : ${videoId || 'N/A'}`,
    `FORMAT       : ${format}`,
    `CAPTURE MODE : ${ssFreq}`,
    `DATE         : ${new Date().toLocaleString()}`,
    `═`.repeat(50),
    `STATS:`,
    `  • Frames Captured: ${frames.length}`,
    `  • Key Concepts   : ${frames.length}`,
    `═`.repeat(50),
    `DETAILED TIMELINE:`,
    ``
  ];

  frames.forEach(f => {
    lines.push(`[${f.t}] ${f.concept.toUpperCase()}`);
    lines.push(`-`.repeat(30));
    lines.push(`Notes: ${f.notes}`);
    lines.push(`Quote: ${f.quote}`);
    lines.push(`Tags : ${f.tags.join(', ')}`);
    lines.push(``);
  });

  lines.push(`═`.repeat(50));
  lines.push(`[Generated by NERDLUME AI — Video Notes]`);
  return lines.join('\n');
}

function saveToDetailedHistory(mode, input, output, meta = {}) {
  try {
    const isPractice = mode === 'learning' && currentGoal === 'practice';
    const isExplain = mode === 'learning' && currentGoal === 'explain';
    const isQuick = mode === 'quick';

    let generationType = 'Note Making';
    let selectedOptions = [];

    if (isQuick) {
      generationType = currentQuickMode === 'assignment' ? 'Assignment' : 'Practical File';
      const lang = getLang('quick-lang') || 'Python';
      selectedOptions.push(`Language: ${lang}`);
      const sectionsStoreId = currentQuickMode === 'assignment' ? 'panel-assignment' : 'panel-practical';
      const sections = Array.from(document.querySelectorAll(`#${sectionsStoreId} .options-2col .option-btn.selected`))
        .map(btn => {
          const clone = btn.cloneNode(true);
          clone.querySelector('.option-dot')?.remove();
          return clone.innerText.trim();
        });
      if (sections.length > 0) {
        selectedOptions.push(`Sections: ${sections.join(', ')}`);
      }
    } else if (isExplain) {
      generationType = `Explain Mode (${currentExplainType})`;
      if (currentExplainType === 'numerical') {
        const steps = Array.from(document.querySelectorAll('#esub-numerical .option-btn.selected')).map(btn => {
          const clone = btn.cloneNode(true);
          clone.querySelector('.option-dot')?.remove();
          return clone.innerText.trim();
        });
        selectedOptions.push(`Steps: ${steps.join(', ')}`);
      } else if (currentExplainType === 'theory') {
        const size = document.querySelector('#esub-theory [onclick*="theory-size"].selected')?.innerText?.trim();
        if (size) selectedOptions.push(`Size: ${size}`);
      } else if (currentExplainType === 'code') {
        const lang = document.querySelector('#esub-code [onclick*="explain-lang"].selected')?.innerText?.trim();
        if (lang) selectedOptions.push(`Language: ${lang}`);
      }
    } else if (isPractice) {
      generationType = `Practice (${_currentPMode})`;
      const diff = document.querySelector('[onclick*="p-diff"].selected')?.innerText?.trim();
      const cnt = document.querySelector('[onclick*="q-count"].selected')?.innerText?.trim();
      if (diff) selectedOptions.push(`Difficulty: ${diff}`);
      if (cnt) selectedOptions.push(`Questions: ${cnt}`);
    } else {
      const style = document.querySelector('[onclick*="note-style"].selected')?.innerText?.trim();
      const tech = document.querySelector('[onclick*="technique"].selected')?.innerText?.trim();
      const gen = document.querySelector('[onclick*="gen-type"].selected')?.innerText?.trim();
      if (style) selectedOptions.push(`Style: ${style}`);
      if (tech) selectedOptions.push(`Technique: ${tech}`);
      if (gen) selectedOptions.push(`Type: ${gen}`);
    }

    const session = typeof getSession === 'function' ? getSession() : null;
    const userEmail = session ? session.email.trim().toLowerCase() : 'guest';
    
    const now = new Date();
    const format = (meta.fileFormat || 'md').toLowerCase();
    const safeTopic = (input || 'generated').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 40) || 'file';
    const finalFileName = meta.fileName || `${safeTopic}-${mode}.${format}`;

    const item = {
      id: meta.id || Math.random().toString(36).substring(2, 9),
      inputText: input,
      generationType: generationType,
      fileName: finalFileName,
      fileFormat: format,
      downloadUrl: meta.downloadUrl || '',
      options: selectedOptions.join(' | '),
      date: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.getTime(),
      output: output,
      userEmail: userEmail
    };

    const userKey = 'nb_generation_history_' + userEmail;
    let history = JSON.parse(localStorage.getItem(userKey) || '[]');

    function normalizePrompt(txt) {
      return (txt || '').toLowerCase()
        .replace(/^[\d\.\)\s\-]+/, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 30);
    }

    const normInput = normalizePrompt(input);
    // Replace any recent entry with same prompt within 3 mins (guarantees single card for final output only)
    const existingIndex = history.findIndex(h => {
      const normH = normalizePrompt(h.inputText);
      const isSameText = normH && normInput && (normH === normInput || normH.includes(normInput) || normInput.includes(normH));
      const timeDiff = Math.abs((h.timestamp || 0) - now.getTime());
      return isSameText && timeDiff < 180000;
    });

    if (existingIndex >= 0) {
      history[existingIndex] = item;
    } else {
      history.unshift(item);
    }

    if (history.length > 50) history.pop();
    localStorage.setItem(userKey, JSON.stringify(history));

    try {
      localStorage.setItem('nb_last_generation', JSON.stringify({
        mode: mode,
        output: output,
        title: finalFileName,
        topic: input,
        timestamp: now.getTime()
      }));
    } catch (e) {}

    renderHistory();
    try { window.dispatchEvent(new CustomEvent('nb-generation-created', { detail: item })); } catch(e) {}
  } catch (e) {
    console.error('Failed to save detailed history', e);
  }
}

function renderHistory() {
  const grid = document.getElementById('history-grid');
  if (!grid) return;

  const session = typeof getSession === 'function' ? getSession() : null;
  const userEmail = session ? session.email.trim().toLowerCase() : 'guest';
  const userKey = 'nb_generation_history_' + userEmail;
  let history = JSON.parse(localStorage.getItem(userKey) || '[]');
  
  if (history.length === 0 && userEmail !== 'guest') {
    const guestHistory = JSON.parse(localStorage.getItem('nb_generation_history_guest') || '[]');
    history = guestHistory;
  }

  // Token-based keyword normalization for deduplicating identical requests across iterations & filter changes
  function getTopicTokens(txt) {
    const stopWords = new Set(['the','and','of','in','on','at','to','a','an','is','for','also','with','by','this','that','what','define','explain','write','all','between']);
    return (txt || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));
  }

  function isSameGen(a, b) {
    if (!a || !b) return false;
    if (a.id && b.id && a.id === b.id) return true;
    const sameDateTime = (a.date && b.date && a.date === b.date && a.time && b.time && a.time === b.time);
    const timeDiff = Math.abs((a.timestamp || 0) - (b.timestamp || 0));
    const isClose = sameDateTime || (timeDiff < 240000);
    if (!isClose) return false;
    const tokensA = getTopicTokens(a.inputText);
    const tokensB = getTopicTokens(b.inputText);
    if (tokensA.length === 0 || tokensB.length === 0) return sameDateTime;
    const setB = new Set(tokensB);
    const common = tokensA.filter(t => setB.has(t));
    const overlapRatio = common.length / Math.min(tokensA.length, tokensB.length);
    return overlapRatio >= 0.35 || sameDateTime;
  }

  const cleanHistory = [];
  history.forEach(item => {
    const idx = cleanHistory.findIndex(c => isSameGen(c, item));
    if (idx >= 0) {
      if ((item.inputText || '').length > (cleanHistory[idx].inputText || '').length) {
        cleanHistory[idx] = item;
      }
    } else {
      cleanHistory.push(item);
    }
  });
  history = cleanHistory;
  
  if (history.length === 0) {
    grid.innerHTML = `<div class="history-empty">No recent generations found. Generate notes, explanations, or assignments to start your history feed!</div>`;
    return;
  }

  grid.innerHTML = history.map(item => {
    const safePrompt = item.inputText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 100) + (item.inputText.length > 100 ? '...' : '');
    const safeOptions = item.options.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <div class="history-card" onclick="openHistModal('${item.id}')">
        <div class="history-card-header">
          <span class="history-type-badge">${item.generationType}</span>
          <span class="history-time">${item.date} ${item.time}</span>
        </div>
        <div class="history-topic">${safePrompt}</div>
        <div class="history-options">${safeOptions || 'Default Options'}</div>
      </div>
    `;
  }).join('');
}

function openHistModal(itemId) {
  const session = typeof getSession === 'function' ? getSession() : null;
  const userEmail = session ? session.email.trim().toLowerCase() : 'guest';
  const userKey = 'nb_generation_history_' + userEmail;
  let history = JSON.parse(localStorage.getItem(userKey) || '[]');
  if (history.length === 0 && userEmail !== 'guest') {
    history = JSON.parse(localStorage.getItem('nb_generation_history_guest') || '[]');
  }
  const item = history.find(h => h.id === itemId);
  if (!item) return;

  const modal = document.getElementById('hist-modal');
  if (!modal) return;

  document.getElementById('hm-title').textContent = item.generationType;
  document.getElementById('hm-meta').textContent = `${item.date} at ${item.time}`;
  document.getElementById('hm-prompt').textContent = item.inputText;
  document.getElementById('hm-options').textContent = item.options || 'None';
  
  const formattedTitle = `${item.generationType.replace(/[^A-Za-z0-9_-]/g, '_').toUpperCase()}_GEN.TXT`;
  document.getElementById('hm-output-title').textContent = formattedTitle;
  
  const outputEl = document.getElementById('hm-output');
  outputEl.textContent = item.output;

  const copyBtn = document.getElementById('hm-copy-btn');
  const dlBtn = document.getElementById('hm-dl-btn');

  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(item.output).then(() => {
        showToast('Copied to clipboard!');
      });
    };
  }

  if (dlBtn) {
    dlBtn.onclick = async () => {
      const token = nbApiToken();
      if (item.id && token) {
        try {
          const dlUrl = `${NB_API}/api/history/${item.id}/download?token=${encodeURIComponent(token)}`;
          const res = await fetch(dlUrl, { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (item.fileName || formattedTitle).toLowerCase();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Download started!');
            return;
          }
        } catch (e) {
          console.warn('History download failed, using fallback:', e);
        }
      }
      const blob = new Blob([item.output], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = formattedTitle.toLowerCase();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Download started!');
    };
  }

  modal.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeHistModal() {
  const modal = document.getElementById('hist-modal');
  if (modal) modal.classList.remove('visible');
  document.body.style.overflow = '';
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateDataGraphsLockState, 200);
  renderHistory();
  checkAndApplyLimits();

  // Restore latest generated output if available across reloads
  try {
    const lastGen = JSON.parse(localStorage.getItem('nb_last_generation') || 'null');
    if (lastGen && lastGen.mode && lastGen.output) {
      const outArea = document.getElementById('output-' + lastGen.mode);
      const contentEl = document.getElementById(lastGen.mode === 'quick' ? 'quick-output-content' : 'out-learning-content');
      const titleEl = document.getElementById(lastGen.mode === 'quick' ? 'quick-output-title' : 'learning-out-title');
      if (outArea && contentEl) {
        contentEl.style.display = 'block';
        contentEl.textContent = lastGen.output;
        if (titleEl && lastGen.title) titleEl.textContent = String(lastGen.title).toUpperCase();
        outArea.classList.add('visible');
      }
    }
  } catch (e) {}
});
