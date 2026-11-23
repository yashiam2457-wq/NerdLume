/* =========================================================
   NerdLume — auth.js
   Auth, session, sidebar, pricing popup, paywall gates
   ========================================================= */

// ── Demo Users (All demo accounts removed as requested) ────────
const DEMO_USERS = [];

// ── Plan Config & Quota Limits ─────────────────────────────
window.PLAN_QUOTAS = {
  guest: { notes: 5, explain: 2, quick: 5 },
  free: { notes: 5, explain: 2, quick: 5 },
  'free-premium': { notes: 30, explain: 30, quick: 60 },
  diamond: { notes: 120, explain: 120, quick: 240 }
};

const PLAN_CONFIG = {
  free: {
    label: 'Free Scholar', badgeClass: 'free', dotClass: 'free',
    avatarClass: '', color: '#6b7080', icon: 'F',
  },
  'free-premium': {
    label: 'Scholar Pro', badgeClass: 'premium', dotClass: 'premium',
    avatarClass: 'premium-avatar', color: '#b8ff57', icon: 'P',
  },
  diamond: {
    label: 'Diamond Researcher', badgeClass: 'diamond', dotClass: 'diamond',
    avatarClass: 'diamond-avatar', color: '#57c8ff', icon: 'D',
  },
};

// ── Session ────────────────────────────────────────────────
function getSession() {
  try {
    const s = localStorage.getItem('nb_session');
    if (!s) return null;
    const sessionObj = JSON.parse(s);
    if (typeof NB_Tracker !== 'undefined') {
      const trackerPlan = NB_Tracker.getPlan();
      if (sessionObj.plan !== trackerPlan) {
        sessionObj.plan = trackerPlan;
        localStorage.setItem('nb_session', JSON.stringify(sessionObj));
      }
    }
    return sessionObj;
  }
  catch { return null; }
}

function setSession(user) {
  const userPlan = user.plan || 'free';
  if (typeof NB_Tracker !== 'undefined') {
    NB_Tracker.setPlan(userPlan);
  }
  const s = {
    id: user.id || user._id || '',
    email: user.email, username: user.username,
    firstName: user.firstName, lastName: user.lastName, plan: userPlan,
    joinDate: user.joinDate || new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    notesCount: user.notesCount || 0,
    sessionsCount: user.sessionsCount || 0,
    filesCount: user.filesCount || 0,
  };
  localStorage.setItem('nb_session', JSON.stringify(s));
  return s;
}

function clearSession() { localStorage.removeItem('nb_session'); }
function setApiSession(result) {
  if (result?.token) localStorage.setItem('nb_api_token', result.token);
  return setSession(result.user);
}
function getInitials(f, l) {
  const first = (f || l || 'U')[0] || 'U';
  const last = (l && l[0]) ? l[0] : '';
  return (first + last).toUpperCase();
}

// ── Toast ──────────────────────────────────────────────────
function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  const dot = t.querySelector('.toast-dot');
  if (dot) dot.style.background = type === 'error' ? '#ff6b57' : '#b8ff57';
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ══════════════════════════════════════════════════════════
//  PRICING POPUP MODAL
// ══════════════════════════════════════════════════════════

let _pricingYearly = false;

function buildPricingModalHTML() {
  return `
<div class="pm-backdrop" id="pricing-modal">
  <div class="pm-box">

    <button class="pm-close" onclick="closePricingModal()" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>

    <!-- Paywall banner (injected dynamically when triggered by locked feature) -->
    <div class="pm-paywall-banner" id="pm-paywall-banner" style="display:none;"></div>

    <div class="pm-header">
      <div class="pm-tag">Choose Your Plan</div>
      <h2 class="pm-title">Invest in your <em>grades.</em></h2>
      <p class="pm-sub">Start free. Upgrade when you need more power. No hidden fees.</p>
      <div class="pm-billing-toggle">
        <span class="pm-bt-label pm-bt-active" id="pm-monthly">Monthly</span>
        <div class="pm-bt-switch" id="pm-toggle-switch" onclick="pmToggleBilling()">
          <div class="pm-bt-knob"></div>
        </div>
        <span class="pm-bt-label" id="pm-yearly">Yearly <span class="pm-save-badge">Save 30%</span></span>
      </div>
    </div>

    <div class="pm-plans">

      <!-- FREE SCHOLAR -->
      <div class="pm-plan" id="pm-card-free">
        <div class="pm-plan-top">
          <div class="pm-plan-name">Free Scholar</div>
          <div class="pm-plan-desc">For students discovering NerdLume</div>
        </div>
        <div class="pm-price-wrap">
          <div class="pm-price"><span class="pm-currency">₹</span><span class="pm-amount" data-m="0" data-y="0">0</span></div>
          <div class="pm-period">forever</div>
        </div>
        <a href="signin.html?plan=free" class="pm-cta pm-cta-free">Start Free</a>
        <div class="pm-divider"></div>
        <ul class="pm-feats">
          <li class="pf-y"> 5 Notes generations / week</li>
          <li class="pf-y"> 5 Quick generations / week</li>
          <li class="pf-y"> 2 Explain sessions / week</li>
          <li class="pf-y"> Standard Cornell and Outline notes</li>
          <li class="pf-y"> Basic quizzes and MCQs</li>
          <li class="pf-y"> 3 file uploads per generation</li>
          <li class="pf-y"> Markdown, TXT and PDF exports</li>
          <li class="pf-y"> Basic flashcard generation</li>
          <li class="pf-y"> 30-day generation history</li>
          <li class="pf-y"> Standard processing priority</li>
        </ul>
      </div>

      <!-- SCHOLAR PRO -->
      <div class="pm-plan pm-popular" id="pm-card-free-premium">
        <div class="pm-popular-badge"><i data-lucide="sparkles" style="width:14px;height:14px;"></i> Most Popular</div>
        <div class="pm-plan-top">
          <div class="pm-plan-name pm-premium-name">Scholar Pro</div>
          <div class="pm-plan-desc">For everyday university and engineering students</div>
        </div>
        <div class="pm-price-wrap">
          <div class="pm-price"><span class="pm-currency">₹</span><span class="pm-amount" data-m="149" data-y="100">149</span></div>
          <div class="pm-period">per month</div>
          <div class="pm-yearly-note" id="pm-premium-ynote" style="display:none;">₹1,199/year — save ₹589</div>
        </div>
        <a href="signin.html?plan=free-premium" class="pm-cta pm-cta-premium">Get Scholar Pro</a>
        <div class="pm-divider"></div>
        <ul class="pm-feats">
          <li class="pf-y"> 30 Notes generations / month</li>
          <li class="pf-y"> 30 Explain sessions / month</li>
          <li class="pf-y"> 60 Quick generations / month</li>
          <li class="pf-y"> Feynman and SQ3R methodologies</li>
          <li class="pf-y"> Full examination simulator</li>
          <li class="pf-y"> Advanced flashcards &amp; Leitner tracking</li>
          <li class="pf-y"> Question Prediction Engine (limited)</li>
          <li class="pf-y"> 10 file uploads per generation</li>
          <li class="pf-y"> Advanced diagrams &amp; flowcharts</li>
          <li class="pf-y"> PDF, DOCX and Markdown exports</li>
          <li class="pf-y"> Faster processing priority</li>
          <li class="pf-y"> 90-day generation history &amp; 10% rollover</li>
        </ul>
      </div>

      <!-- DIAMOND RESEARCHER -->
      <div class="pm-plan pm-diamond-card" id="pm-card-diamond">
        <div class="pm-diamond-badge">Power User</div>
        <div class="pm-plan-top">
          <div class="pm-plan-name pm-diamond-name">Diamond Researcher</div>
          <div class="pm-plan-desc">For toppers, competitive aspirants &amp; researchers</div>
        </div>
        <div class="pm-price-wrap">
          <div class="pm-price"><span class="pm-currency">₹</span><span class="pm-amount" data-m="349" data-y="233">349</span></div>
          <div class="pm-period">per month</div>
          <div class="pm-yearly-note" id="pm-diamond-ynote" style="display:none;">₹2,799/year — save ₹1,389</div>
        </div>
        <a href="signin.html?plan=diamond" class="pm-cta pm-cta-diamond">Go Diamond</a>
        <div class="pm-divider"></div>
        <ul class="pm-feats">
          <li class="pf-y"> 4× Scholar Pro compute allowance</li>
          <li class="pf-y"> Access to advanced reasoning models</li>
          <li class="pf-y"> Advanced multi-document synthesis</li>
          <li class="pf-y"> Unlimited document storage within policy</li>
          <li class="pf-y"> Large batch generation</li>
          <li class="pf-y"> Full Question Prediction Engine</li>
          <li class="pf-y"> Advanced mathematical derivations</li>
          <li class="pf-y"> Priority GPU/CPU-backed processing</li>
          <li class="pf-y"> Export automation &amp; batch downloads</li>
          <li class="pf-y"> Extended history &amp; Diamond profile badge</li>
        </ul>
      </div>

    </div>

    <div class="pm-footer-note">
      All paid plans include a <strong>7-day money-back guarantee</strong>.
      Students get <strong>20% off</strong> — verify your .edu email after signup.
    </div>

  </div>
</div>`;
}

function ensurePricingModal() {
  if (!document.getElementById('pricing-modal')) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildPricingModalHTML();
    document.body.appendChild(wrapper.firstElementChild);

    // Close on backdrop click
    document.getElementById('pricing-modal').addEventListener('click', function (e) {
      if (e.target === this) closePricingModal();
    });
    if (window.lucide) { lucide.createIcons(); }
  }
}

async function upgradePlanDirectly(plan) {
  if (plan === 'free') {
    await executePlanUpgrade(plan);
    return;
  }

  // Show payment gateway modal simulation
  const cardNum = prompt(`NERDLUME SECURE PAYMENT GATEWAY\nUpgrading to: ${plan === 'free-premium' ? 'Premium (₹99/mo)' : 'Diamond (₹249/mo)'}\n\nPlease enter your 16-digit Card Number to confirm payment:`, "4000 1234 5678 9010");
  if (!cardNum || cardNum.trim().replace(/\s+/g, '').length < 16) {
    showToast('Payment cancelled or invalid card details.', 'error');
    return;
  }

  const pin = prompt(`Enter 3-digit CVV:`, "123");
  if (!pin || pin.trim().length < 3) {
    showToast('CVV verification failed.', 'error');
    return;
  }

  showToast('Processing payment...', 'info');

  setTimeout(async () => {
    showToast('Payment Successful! Upgrading plan...', 'success');
    await executePlanUpgrade(plan);
  }, 1500);
}

async function executePlanUpgrade(plan) {
  const NB_API = window.NB_API_BASE || (window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:5050');
  const token = localStorage.getItem('nb_api_token') || '';

  if (token) {
    try {
      const res = await fetch(`${NB_API}/api/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: plan })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.ok && result.user) {
          localStorage.setItem('nb_session', JSON.stringify(result.user));
          if (typeof NB_Tracker !== 'undefined') {
            NB_Tracker.setPlan(plan);
          }
          showToast(`Plan successfully updated to ${result.user.plan}!`, 'success');
          closePricingModal();
          setTimeout(() => window.location.reload(), 800);
          return;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Plan upgrade is not allowed.', 'error');
        return;
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to contact server for plan upgrade.', 'error');
      return;
    }
  }

  // Local fallback if no token
  if (typeof NB_Tracker !== 'undefined') {
    NB_Tracker.setPlan(plan);
  }
  closePricingModal();
  setTimeout(() => window.location.reload(), 800);
}

function openPricingModal(highlightPlan) {
  ensurePricingModal();
  const modal = document.getElementById('pricing-modal');

  // Hide paywall banner if opening plain
  if (!highlightPlan) {
    const b = document.getElementById('pm-paywall-banner');
    if (b) b.style.display = 'none';
  }

  // Remove previous highlights
  document.querySelectorAll('.pm-plan').forEach(p => p.classList.remove('pm-highlight'));
  if (highlightPlan) {
    const el = document.getElementById('pm-card-' + highlightPlan);
    if (el) el.classList.add('pm-highlight');
  }

  // Show only relevant plans for logged in users
  const session = getSession();
  const userPlan = session ? session.plan || 'free' : 'guest';

  const cardFree = document.getElementById('pm-card-free');
  const cardPremium = document.getElementById('pm-card-free-premium');
  const cardDiamond = document.getElementById('pm-card-diamond');

  if (cardFree) cardFree.style.display = '';
  if (cardPremium) cardPremium.style.display = '';
  if (cardDiamond) cardDiamond.style.display = '';

  const plansContainer = modal.querySelector('.pm-plans');
  let highestTierMsg = document.getElementById('pm-highest-tier-msg');
  if (highestTierMsg) highestTierMsg.style.display = 'none';

  if (session) {
    if (userPlan === 'free') {
      if (cardFree) cardFree.style.display = 'none';
    } else if (userPlan === 'free-premium') {
      if (cardFree) cardFree.style.display = 'none';
      if (cardPremium) cardPremium.style.display = 'none';
    } else if (userPlan === 'diamond') {
      if (cardFree) cardFree.style.display = 'none';
      if (cardPremium) cardPremium.style.display = 'none';
      if (cardDiamond) cardDiamond.style.display = 'none';

      if (!highestTierMsg) {
        highestTierMsg = document.createElement('div');
        highestTierMsg.id = 'pm-highest-tier-msg';
        highestTierMsg.style.textAlign = 'center';
        highestTierMsg.style.gridColumn = '1 / -1';
        highestTierMsg.style.padding = '40px 20px';
        highestTierMsg.style.color = 'var(--accent)';
        highestTierMsg.style.fontFamily = "'Syne', sans-serif";
        highestTierMsg.style.fontSize = '1.2rem';
        highestTierMsg.style.fontWeight = '800';
        highestTierMsg.innerHTML = `<span style="font-size:1.1rem; color:var(--accent); font-weight:700;">You are subscribed to the highest tier: Diamond Plan</span><br><span style="font-size:0.85rem; color:var(--muted); font-weight:400; font-family:var(--font-main); margin-top:10px; display:inline-block;">Thank you for supporting NerdLume!</span>`;
        plansContainer.appendChild(highestTierMsg);
      } else {
        highestTierMsg.style.display = 'block';
      }
    }

    const ctaFree = modal.querySelector('.pm-cta-free');
    const ctaPremium = modal.querySelector('.pm-cta-premium');
    const ctaDiamond = modal.querySelector('.pm-cta-diamond');

    if (ctaFree) {
      ctaFree.removeAttribute('href');
      ctaFree.onclick = (e) => { e.preventDefault(); upgradePlanDirectly('free'); };
      ctaFree.textContent = 'Switch to Free';
    }
    if (ctaPremium) {
      ctaPremium.removeAttribute('href');
      ctaPremium.onclick = (e) => { e.preventDefault(); upgradePlanDirectly('free-premium'); };
      ctaPremium.textContent = 'Upgrade to Premium';
    }
    if (ctaDiamond) {
      ctaDiamond.removeAttribute('href');
      ctaDiamond.onclick = (e) => { e.preventDefault(); upgradePlanDirectly('diamond'); };
      ctaDiamond.textContent = 'Upgrade to Diamond';
    }
  }

  modal.classList.add('pm-open');
  document.body.style.overflow = 'hidden';
}

function closePricingModal() {
  const modal = document.getElementById('pricing-modal');
  if (!modal) return;
  modal.classList.remove('pm-open');
  document.body.style.overflow = '';
  // Reset paywall banner
  const b = document.getElementById('pm-paywall-banner');
  if (b) { b.style.display = 'none'; b.innerHTML = ''; }
  // Remove highlights
  document.querySelectorAll('.pm-plan').forEach(p => p.classList.remove('pm-highlight'));
}

function pmToggleBilling() {
  _pricingYearly = !_pricingYearly;
  document.getElementById('pm-toggle-switch')?.classList.toggle('pm-on', _pricingYearly);
  document.getElementById('pm-monthly')?.classList.toggle('pm-bt-active', !_pricingYearly);
  document.getElementById('pm-yearly')?.classList.toggle('pm-bt-active', _pricingYearly);
  document.querySelectorAll('.pm-amount').forEach(el => {
    el.textContent = _pricingYearly ? el.dataset.y : el.dataset.m;
  });
  document.querySelectorAll('.pm-yearly-note').forEach(el => {
    el.style.display = _pricingYearly ? 'block' : 'none';
  });
}

// ── Homepage welcome popup (on index page refresh) ──
function maybeShowWelcomePopup() {
  const isHomepage = window.location.pathname.endsWith('index.html')
    || window.location.pathname === '/'
    || window.location.pathname.endsWith('/')
    || window.location.pathname === '';
  if (!isHomepage) return;

  const session = getSession();
  if (session && session.plan && session.plan !== 'free') return; // subscribed users skip auto-popup on refresh

  setTimeout(() => openPricingModal(), 600);
}

// ── Paywall entry point (locked feature → popup) ──────────
function openPaywallModal(featureName, requiredPlan) {
  ensurePricingModal();
  const pc = PLAN_CONFIG[requiredPlan] || PLAN_CONFIG['free-premium'];
  const banner = document.getElementById('pm-paywall-banner');
  if (banner) {
    banner.innerHTML = `
      <div class="pm-pw-text">
        <strong>${featureName}</strong> requires the
        <span class="pm-pw-plan ${pc.badgeClass === 'diamond' ? 'pm-pw-diamond' : 'pm-pw-premium'}">${pc.label}</span> plan or higher.
        Choose a plan below to unlock it instantly.
      </div>`;
    banner.style.display = 'flex';
  }
  openPricingModal(requiredPlan);
}

// ── Dedicated Generation Limit Exceeded Modal ──────────────────────────────
function ensureLimitModal() {
  if (document.getElementById('limit-exceeded-modal')) return;

  const style = document.createElement('style');
  style.id = 'limit-modal-styles';
  style.textContent = `
    .limit-modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: limitFadeIn .25s ease-out;
    }
    @keyframes limitFadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .limit-modal-box {
      background: #141418;
      border: 1px solid rgba(255, 77, 79, 0.4);
      box-shadow: 0 20px 60px rgba(255, 77, 79, 0.25), 0 0 40px rgba(0, 0, 0, 0.9);
      border-radius: 18px;
      max-width: 480px;
      width: 100%;
      padding: 32px 28px;
      text-align: center;
      position: relative;
      color: #fff;
      font-family: inherit;
    }
    .limit-modal-close {
      position: absolute;
      top: 16px; right: 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      width: 34px; height: 34px;
      border-radius: 10px;
      font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .2s ease;
      z-index: 10;
    }
    .limit-modal-close:hover { background: rgba(255, 107, 87, 0.25); border-color: rgba(255, 107, 87, 0.5); color: #ffffff; transform: scale(1.08); }
    .limit-modal-icon { font-size: 3rem; margin-bottom: 8px; line-height: 1; }
    .limit-modal-badge {
      display: inline-block;
      background: rgba(255, 77, 79, 0.15);
      color: #ff4d4f;
      border: 1px solid rgba(255, 77, 79, 0.35);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      padding: 4px 14px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    .limit-modal-title { font-size: 1.45rem; font-weight: 700; margin: 0 0 10px 0; color: #fff; }
    .limit-modal-msg { font-size: 0.95rem; color: #ccc; line-height: 1.5; margin-bottom: 20px; }
    .limit-modal-msg strong { color: #ff7875; }
    .limit-modal-progress-wrap { margin-bottom: 20px; background: rgba(255, 255, 255, 0.03); padding: 12px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.06); }
    .limit-modal-pb-bg { background: rgba(255, 255, 255, 0.1); height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 8px; }
    .limit-modal-pb-fill { background: linear-gradient(90deg, #ff4d4f, #ff7875); height: 100%; border-radius: 5px; transition: width 0.4s ease; }
    .limit-modal-pb-text { font-size: 0.78rem; color: #ff7875; font-weight: 600; text-align: right; }
    .limit-modal-info { background: rgba(255, 255, 255, 0.04); border-radius: 10px; padding: 12px 14px; font-size: 0.83rem; color: #aaa; line-height: 1.45; margin-bottom: 24px; text-align: left; border-left: 3px solid #ff4d4f; }
    .limit-modal-actions { display: flex; gap: 12px; justify-content: center; }
    .limit-modal-btn {
      padding: 12px 20px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.92rem;
      cursor: pointer;
      transition: all .2s;
      border: none;
      flex: 1;
    }
    .limit-modal-btn-upgrade {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #fff;
      box-shadow: 0 4px 15px rgba(168, 85, 247, 0.35);
    }
    .limit-modal-btn-upgrade:hover { opacity: 0.92; transform: translateY(-1px); }
    .limit-modal-btn-close {
      background: rgba(255, 255, 255, 0.08);
      color: #ccc;
    }
    .limit-modal-btn-close:hover { background: rgba(255, 255, 255, 0.16); color: #fff; }
  `;
  document.head.appendChild(style);

  const modalHtml = `
    <div class="limit-modal-backdrop" id="limit-exceeded-modal" style="display:none;" onclick="if(event.target===this) closeLimitExceededModal();">
      <div class="limit-modal-box">
        <button class="limit-modal-close" onclick="closeLimitExceededModal()" aria-label="Close" title="Close"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        <div class="limit-modal-icon"><i data-lucide="alert-triangle" style="width:36px;height:36px;"></i></div>
        <div class="limit-modal-badge">Limit Exceeded</div>
        <h2 class="limit-modal-title">Generation Limit Reached</h2>
        <p class="limit-modal-msg" id="limit-modal-message">
          You have reached your weekly generation limit on your current plan.
        </p>
        <div class="limit-modal-progress-wrap">
          <div class="limit-modal-pb-bg">
            <div class="limit-modal-pb-fill" id="limit-modal-pb-fill" style="width: 100%;"></div>
          </div>
          <div class="limit-modal-pb-text" id="limit-modal-pb-text">100% Weekly Quota Used</div>
        </div>
        <div class="limit-modal-info">
          Weekly limits reset automatically every 7 days. Upgrade your plan to get higher limits or unlimited generations instantly!
        </div>
        <div class="limit-modal-actions">
          <button class="limit-modal-btn limit-modal-btn-upgrade" id="limit-modal-btn-upgrade">
            Upgrade Plan Now <i data-lucide="zap" style="width:16px;height:16px;"></i>
          </button>
          <button class="limit-modal-btn limit-modal-btn-close" onclick="closeLimitExceededModal()">
            Got It
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  if (window.lucide) { lucide.createIcons(); }
}

function showLimitExceededModal(categoryName, usedCount, limitCount, requiredPlan) {
  ensureLimitModal();
  const msgEl = document.getElementById('limit-modal-message');
  const pbTextEl = document.getElementById('limit-modal-pb-text');
  const pbFillEl = document.getElementById('limit-modal-pb-fill');
  const modal = document.getElementById('limit-exceeded-modal');
  const btnUpgrade = document.getElementById('limit-modal-btn-upgrade');

  const catName = categoryName || 'Generation';
  const plan = getCurrentUserPlan();
  const reqPlan = requiredPlan || (plan === 'free' ? 'free-premium' : 'diamond');
  const usedText = typeof usedCount !== 'undefined' && typeof limitCount !== 'undefined' ? `${usedCount} / ${limitCount}` : 'Quota Reached';

  if (msgEl) {
    msgEl.innerHTML = `You have reached your weekly generation limit for <strong>${catName}</strong> on your current plan.`;
  }

  if (pbTextEl) {
    pbTextEl.textContent = `100% Quota Used`;
  }

  if (pbFillEl) {
    pbFillEl.style.width = '100%';
  }

  if (btnUpgrade) {
    btnUpgrade.onclick = () => {
      closeLimitExceededModal();
      openPricingModal(reqPlan);
    };
  }

  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeLimitExceededModal() {
  const modal = document.getElementById('limit-exceeded-modal');
  if (modal) modal.style.display = 'none';
}

// Alias for old callers
function openPricing() { openPricingModal(); }

// ══════════════════════════════════════════════════════════
//  AUTH HANDLERS
// ══════════════════════════════════════════════════════════

async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-btn');
  const fname = document.getElementById('fname').value.trim();
  const lname = document.getElementById('lname').value.trim();
  const email = document.getElementById('email').value.trim();
  const uname = document.getElementById('username').value.trim().replace('@', '');
  const pwd = document.getElementById('password').value;
  const cpwd = document.getElementById('confirm-password').value;
  const plan = document.querySelector('input[name="plan"]:checked')?.value || 'free';

  if (pwd !== cpwd) { showToast('Passwords do not match!', 'error'); return; }
  if (pwd.length < 8) { showToast('Password needs 8+ characters', 'error'); return; }

  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loader').style.display = 'inline';
  btn.disabled = true;

  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: fname, lastName: lname, email, username: uname, password: pwd })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to create account');
    setApiSession(result);
    showToast('Account created! Redirecting...', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 700);
  } catch (error) {
    showToast(error.message, 'error');
    btn.disabled = false;
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.btn-loader').style.display = 'none';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.auth-submit-btn');
  const id = document.getElementById('login-id').value.trim();
  const pwd = document.getElementById('login-password').value;

  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loader').style.display = 'inline';
  btn.disabled = true;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: id, password: pwd })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Invalid credentials');
    setApiSession(result);
    showToast('Welcome back, ' + result.user.firstName + '!', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 700);
  } catch (error) {
    showToast(error.message, 'error');
    btn.disabled = false;
    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.btn-loader').style.display = 'none';
  }
}

function togglePwd(id, btn) {
  const input = document.getElementById(id);
  if (input.type === 'password') { input.type = 'text'; btn.innerHTML = '<i data-lucide="eye-off" style="width:16px;height:16px;"></i>'; }
  else { input.type = 'password'; btn.innerHTML = '<i data-lucide="eye" style="width:16px;height:16px;"></i>'; }
  if (window.lucide) { lucide.createIcons(); }
}

// Sidebar history functions removed in favor of tracker.js profile history

function initStrengthMeter() {
  const pwd = document.getElementById('password');
  if (!pwd) return;
  pwd.addEventListener('input', () => {
    const val = pwd.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const bar = document.getElementById('strength-bar');
    const lbl = document.getElementById('strength-label');
    if (bar) bar.className = 'strength-bar s' + score;
    if (lbl) lbl.textContent = val.length ? ['', 'Weak', 'Fair', 'Good', 'Strong'][score] : 'Password strength';
  });
}

function initPlanSelector() {
  const cards = document.querySelectorAll('.psm-card');
  cards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (!radio) return;
    card.addEventListener('click', () => {
      radio.checked = true;
      cards.forEach(c => c.classList.remove('is-checked'));
      card.classList.add('is-checked');
    });
  });
  const urlPlan = new URLSearchParams(window.location.search).get('plan') || 'free';
  const target = document.querySelector(`input[value="${urlPlan}"]`);
  if (target) { target.checked = true; target.closest('.psm-card')?.classList.add('is-checked'); }
  else document.querySelector('.psm-card')?.classList.add('is-checked');
}

function showForgotModal() { const m = document.getElementById('forgot-modal'); if (m) m.style.display = 'flex'; }
function hideForgotModal() { const m = document.getElementById('forgot-modal'); if (m) m.style.display = 'none'; }
function sendReset() {
  const e = document.getElementById('reset-email')?.value?.trim();
  if (!e) { showToast('Enter your email address', 'error'); return; }
  hideForgotModal();
  showToast('Reset link sent to ' + e, 'success');
}

// ══════════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════════

function ensureSidebarElements(session, forceRender = false) {
  const isProfilePage = window.location.pathname.includes('user.html');
  if (isProfilePage) return;

  let overlay = document.getElementById('sidebar-overlay');
  let sidebar = document.getElementById('user-sidebar');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.onclick = closeSidebar;
    document.body.appendChild(overlay);
  }

  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.className = 'user-sidebar';
    sidebar.id = 'user-sidebar';
    document.body.appendChild(sidebar);
    forceRender = true;
  }

  if (forceRender || !sidebar.innerHTML.trim()) {
    const userSession = session || getSession();
    sidebar.innerHTML = userSession ? buildSidebar(userSession) : buildGuestSidebar();
  }
}

function openSidebar() {
  window.location.href = 'user.html';
}

function closeSidebar() {
  document.getElementById('sidebar-overlay')?.classList.remove('open');
  document.getElementById('user-sidebar')?.classList.remove('open');
  document.body.style.overflow = '';
}

function logoutUser() {
  clearSession();
  showToast('Logged out. See you soon!');
  setTimeout(() => { window.location.href = 'index.html'; }, 1000);
}

function buildGuestSidebar() {
  return `
    <div class="sidebar-header">
      <div class="sidebar-header-title">Welcome to NerdLume</div>
      <button class="sidebar-close-btn" onclick="closeSidebar()" aria-label="Close"><i data-lucide="x"></i></button>
    </div>
    <div class="sidebar-profile">
      <div class="sidebar-avatar-row">
        <div class="sidebar-avatar free">NL</div>
        <div class="sidebar-avatar-info">
          <div class="sidebar-user-name">Guest Student</div>
          <div class="sidebar-username">@guest</div>
          <span class="sidebar-plan-badge free">FREE PLAN</span>
        </div>
      </div>
    </div>
    <div class="sidebar-body">
      <div class="sidebar-section">
        <div class="sidebar-section-label">Get Started</div>
        <a href="signin.html?mode=login" class="sidebar-nav-item"><span class="sni-icon"><i data-lucide="log-in" style="width:16px;height:16px;"></i></span><span class="sni-text">Sign In / Log In</span></a>
        <a href="signin.html" class="sidebar-nav-item"><span class="sni-icon"><i data-lucide="sparkles" style="width:16px;height:16px;"></i></span><span class="sni-text">Create Free Account</span></a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-label">Plans</div>
        <div class="sidebar-nav-item" onclick="closeSidebar(); openPricingModal()"><span class="sni-icon"><i data-lucide="gem" style="width:16px;height:16px;"></i></span><span class="sni-text">View Pricing &amp; Plans</span></div>
      </div>
      <div class="sidebar-upgrade-banner" style="margin-top:20px;">
        <div class="sub-upgrade-title">Study Smarter Today</div>
        <div class="sub-upgrade-desc">Sign up free to save your history, unlock Explain Mode &amp; flashcards.</div>
        <a href="signin.html" class="sub-upgrade-btn" style="text-align:center;display:block;text-decoration:none;">Sign Up Free <i data-lucide="arrow-right" style="width:14px;height:14px;"></i></a>
      </div>
    </div>`;
}

function buildSidebar(session) {
  const plan = session.plan || 'free';
  const pc = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  const fn = session.firstName || (session.name ? session.name.split(' ')[0] : '') || session.username || 'User';
  const ln = session.lastName || (session.name ? session.name.split(' ').slice(1).join(' ') : '') || '';
  const initials = getInitials(fn, ln);
  const showUpgrade = plan !== 'diamond';
  const userEmail = (session.email || '').trim().toLowerCase();

  const rawTrackerStats = (typeof NB_Tracker !== 'undefined') ? NB_Tracker.getStats(userEmail) : { notesCount: 0, sessionsCount: 0, filesCount: 0 };
  let localHistCount = 0;
  try {
    const hist = JSON.parse(localStorage.getItem('nb_generation_history_' + userEmail) || '[]');
    localHistCount = hist.length;
  } catch (e) { }

  const notesCount = Math.max(session.notesCount || 0, rawTrackerStats.notesCount || 0, localHistCount);
  const sessionsCount = Math.max(session.sessionsCount || 0, rawTrackerStats.sessionsCount || 0);
  const filesCount = Math.max(session.filesCount || 0, rawTrackerStats.filesCount || 0);

  const upgradeHTML = showUpgrade ? `
    <div class="sidebar-upgrade-banner">
      <div class="sub-upgrade-title">${plan === 'free' ? 'Upgrade to Premium' : 'Go Diamond'}</div>
      <div class="sub-upgrade-desc">${plan === 'free'
      ? 'Unlock Explain Mode, all note styles, flash cards & more.'
      : 'Unlock unlimited history, group study, API access & more.'}</div>
      <button class="sub-upgrade-btn" onclick="closeSidebar(); openPricingModal('${plan === 'free' ? 'free-premium' : 'diamond'}')">
        ${plan === 'free' ? 'See Plans <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>' : 'Go Diamond <i data-lucide="gem" style="width:14px;height:14px;"></i>'}
      </button>
    </div>` : '';

  return `
    <div class="sidebar-header">
      <div class="sidebar-header-title">My Account</div>
      <button class="sidebar-close-btn" onclick="closeSidebar()" aria-label="Close"><i data-lucide="x"></i></button>
    </div>
    <div class="sidebar-profile">
      <div class="sidebar-avatar-row">
        <div class="sidebar-avatar ${pc.avatarClass}">${initials}</div>
        <div class="sidebar-avatar-info">
          <div class="sidebar-user-name">${session.firstName} ${session.lastName || ''}</div>
          <div class="sidebar-username">@${session.username}</div>
          <span class="sidebar-plan-badge ${pc.badgeClass}">${pc.label}</span>
        </div>
      </div>
      <div class="sidebar-stats">
        <div class="sidebar-stat"><div class="sstat-num">${notesCount}</div><div class="sstat-label">Notes<br>Generated</div></div>
        <div class="sidebar-stat"><div class="sstat-num">${sessionsCount}</div><div class="sstat-label">Sessions<br>Done</div></div>
        <div class="sidebar-stat"><div class="sstat-num">${filesCount}</div><div class="sstat-label">Files<br>Uploaded</div></div>
      </div>
    </div>
    <div class="sidebar-body">
      <div class="sidebar-section">
        <div class="sidebar-section-label">Account &amp; Navigation</div>
        <a href="user.html" class="sidebar-nav-item" title="View your dashboard, profile, stats & history"><span class="sni-icon"><i data-lucide="layout-dashboard" style="width:16px;height:16px;"></i></span><span class="sni-text">Dashboard &amp; Profile</span></a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-label">Study Modes</div>
        <div class="sidebar-nav-item" onclick="closeSidebar(); document.getElementById('panel-notes')?.scrollIntoView({behavior:'smooth'});"><span class="sni-icon"><i data-lucide="book-open" style="width:16px;height:16px;"></i></span><span class="sni-text">Note Making</span></div>
        <div class="sidebar-nav-item" onclick="closeSidebar(); document.getElementById('panel-practice')?.scrollIntoView({behavior:'smooth'});"><span class="sni-icon"><i data-lucide="target" style="width:16px;height:16px;"></i></span><span class="sni-text">Practice &amp; Flash Cards</span></div>
        <div class="sidebar-nav-item" onclick="closeSidebar(); document.getElementById('panel-quick')?.scrollIntoView({behavior:'smooth'});"><span class="sni-icon"><i data-lucide="zap" style="width:16px;height:16px;"></i></span><span class="sni-text">Quick Assignment / Practical</span></div>
        <div class="sidebar-nav-item" onclick="closeSidebar(); document.getElementById('panel-explain')?.scrollIntoView({behavior:'smooth'});"><span class="sni-icon"><i data-lucide="lightbulb" style="width:16px;height:16px;"></i></span><span class="sni-text">Explain Mode</span></div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-label">Billing &amp; Subscription</div>
        <div class="sidebar-nav-item" onclick="closeSidebar(); openPricingModal()"><span class="sni-icon"><i data-lucide="gem" style="width:16px;height:16px;"></i></span><span class="sni-text">Plans &amp; Pricing</span></div>
        <div class="sidebar-nav-item" onclick="showToast('Member since ' + (session.joinDate || 'Feb 2026'))"><span class="sni-icon"><i data-lucide="calendar" style="width:16px;height:16px;"></i></span><span class="sni-text">Member since ${session.joinDate || 'Feb 2026'}</span></div>
      </div>
      ${upgradeHTML}
    </div>
    <div class="sidebar-footer">
      <button class="sidebar-logout-btn" onclick="logoutUser()"><span><i data-lucide="log-out" style="width:16px;height:16px;"></i></span><span>Log Out</span></button>
    </div>`;
}

function buildUserBadge(session) {
  const plan = session.plan || 'free';
  const pc = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  const fn = session.firstName || (session.name ? session.name.split(' ')[0] : '') || session.username || 'User';
  const ln = session.lastName || (session.name ? session.name.split(' ').slice(1).join(' ') : '') || '';
  const initials = getInitials(fn, ln);
  const displayName = fn ? `${fn} ${ln}`.trim() : (session.username || 'Account');
  const isPremium = plan !== 'free' && plan !== 'guest';

  return `
    <div class="header-user-wrap">
      <button class="h-subscription-banner" onclick="openPricingModal()" title="View Subscription Plans & Upgrade">
        <div class="h-sub-icon-wrap">
          <i data-lucide="${isPremium ? 'crown' : 'sparkles'}" style="width:14px;height:14px;"></i>
        </div>
        <div class="h-sub-text-wrap">
          <span class="h-sub-title">${isPremium ? 'Subscription' : 'Unlock Pro'}</span>
          <span class="h-sub-badge">${isPremium ? pc.label : 'PLANS'}</span>
        </div>
      </button>
      <a href="user.html" class="h-account-btn ${plan}" title="View Account Profile & History" style="text-decoration:none;">
        <div class="h-account-av-wrap">
          ${initials}
        </div>
        <div class="h-account-info">
          <div class="h-account-name">${displayName}</div>
          <div class="h-account-plan-badge">${pc.label}</div>
        </div>
        <i data-lucide="user" style="width:15px;height:15px;color:rgba(255,255,255,0.75);margin-left:2px;"></i>
      </a>
    </div>`;
}

function buildAuthButtons() {
  return `
    <div class="header-auth-btns">
      <button class="h-subscription-banner" onclick="openPricingModal()" title="View Subscription Plans">
        <div class="h-sub-icon-wrap">
          <i data-lucide="sparkles" style="width:14px;height:14px;"></i>
        </div>
        <div class="h-sub-text-wrap">
          <span class="h-sub-title">Plans &amp; Pricing</span>
          <span class="h-sub-badge">PRO</span>
        </div>
      </button>
      <a href="login.html" class="h-login-btn">Log In</a>
      <a href="signin.html" class="h-signup-btn">Sign Up Free</a>
    </div>`;
}

// ══════════════════════════════════════════════════════════
//  PLAN RESTRICTION ENGINE
// ══════════════════════════════════════════════════════════

window.PLAN_RANK = { guest: 0, free: 1, 'free-premium': 2, diamond: 3 };
function hasAccess(userPlan, requiredPlan) {
  return (window.PLAN_RANK[userPlan] ?? -1) >= (window.PLAN_RANK[requiredPlan] ?? 99);
}

// Single Source of Truth for Blocked Features & Generation Options
window.FEATURE_LOCKS = [
  // 1. Goal Cards
  { id: 'goal-explain', type: 'goal-card', required: 'free-premium', label: 'Explain Mode' },

  // 2. Techniques & Note Options
  { match: 'Video Notes', type: 'option-text', required: 'free-premium', label: 'Video Notes Generation' },
  { match: 'Feynman Technique', type: 'option-text', required: 'free-premium', label: 'Feynman Technique' },
  { match: 'SQ3R Method', type: 'option-text', required: 'free-premium', label: 'SQ3R Method' },

  // 3. Practice Types
  { match: 'Mock Test', type: 'option-text', required: 'free-premium', label: 'Mock Test Papers' },
  { match: 'Flash Cards', type: 'option-text', required: 'free-premium', label: 'Flash Cards' },
  { id: 'pmc-mock', type: 'pmode-card', required: 'free-premium', label: 'Mock Test' },
  { id: 'pmc-flash', type: 'pmode-card', required: 'free-premium', label: 'Flash Cards' }
];

window.blockGenerationOption = function (optionMatchText, requiredPlan = 'free-premium', customLabel = '') {
  const existing = window.FEATURE_LOCKS.find(l => l.match === optionMatchText || l.id === optionMatchText);
  if (existing) {
    existing.required = requiredPlan;
    if (customLabel) existing.label = customLabel;
  } else {
    window.FEATURE_LOCKS.push({
      match: optionMatchText,
      type: 'option-text',
      required: requiredPlan,
      label: customLabel || optionMatchText
    });
  }
  const session = getSession();
  applyPlanRestrictions(session?.plan || 'guest');
};

window.unblockGenerationOption = function (optionMatchText) {
  window.FEATURE_LOCKS = window.FEATURE_LOCKS.filter(l => l.match !== optionMatchText && l.id !== optionMatchText);
  document.querySelectorAll('.option-btn, .mode-card').forEach(el => {
    if (el.innerText.includes(optionMatchText) || el.id === optionMatchText) {
      el.classList.remove('is-locked', 'locked-option');
      const badge = el.querySelector('.lock-badge-icon');
      if (badge) badge.remove();
    }
  });
};

function applyPlanRestrictions(userPlan) {
  (window.FEATURE_LOCKS || []).forEach(lock => {
    if (hasAccess(userPlan, lock.required)) return;

    if (lock.type === 'goal-card') {
      const el = document.getElementById(lock.id);
      if (!el) return;
      el.classList.add('is-locked', 'locked-option');
      el.title = 'Requires ' + (PLAN_CONFIG[lock.required]?.label || 'upgrade');
      el.onclick = (e) => { e.stopPropagation(); openPaywallModal(lock.label, lock.required); };
    }

    if (lock.type === 'explain-card') {
      const el = document.getElementById(lock.id);
      if (!el) return;
      el.classList.add('is-locked', 'locked-option');
      el.title = 'Requires ' + (PLAN_CONFIG[lock.required]?.label || 'upgrade');
      el.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPaywallModal(lock.label, lock.required);
      };
    }

    if (lock.type === 'pmode-card') {
      const el = document.getElementById(lock.id);
      if (!el) return;
      el.classList.add('is-locked', 'locked-option');
      el.title = 'Requires ' + (PLAN_CONFIG[lock.required]?.label || 'upgrade');
      if (!el.querySelector('.badge-lock')) {
        const badge = document.createElement('span');
        badge.className = 'badge-lock';
        badge.style.cssText = 'font-size:10px; background:rgba(0,229,255,0.15); color:var(--accent,#00e5ff); padding:2px 6px; border-radius:4px; border:1px solid rgba(0,229,255,0.3); margin-left:6px;';
        badge.textContent = 'PRO';
        const nameEl = el.querySelector('.pmc-name');
        if (nameEl) nameEl.appendChild(badge);
      }
      el.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPaywallModal(lock.label, lock.required);
      };
    }

    if (lock.type === 'option-text') {
      document.querySelectorAll('.option-btn').forEach(btn => {
        if (!btn.innerText.includes(lock.match)) return;
        btn.classList.add('is-locked', 'locked-option');
        if (!btn.querySelector('.lock-badge-icon')) {
          const badge = document.createElement('span');
          badge.className = 'lock-badge-icon';
          badge.style.cssText = 'font-size:11px; margin-left:6px; color:#ff4d4f; display:inline-flex; align-items:center;';
          badge.innerHTML = '<i data-lucide="lock" style="width:12px;height:12px;color:#ff4d4f;"></i>';
          btn.appendChild(badge);
        }
        btn.title = `Requires ${PLAN_CONFIG[lock.required]?.label || 'Upgrade'} plan. Click to view plans.`;
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          openPaywallModal(lock.label, lock.required);
        };
      });
    }
  });
  if (typeof updatePromoBar === 'function') {
    updatePromoBar(userPlan);
  }
}
async function ensureGuestApiToken(forceRefresh = false) {
  if (!forceRefresh && localStorage.getItem('nb_api_token')) return localStorage.getItem('nb_api_token');
  const NB_API = (typeof getNbApiBase === 'function') ? getNbApiBase() : (window.NB_API_BASE || (window.location.protocol.startsWith('http') ? window.location.origin : 'http://localhost:5050'));
  try {
    const res = await fetch(`${NB_API}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `guest_${Date.now()}@nerdlume.local`,
        username: `guest_${Math.random().toString(36).slice(2, 8)}`,
        firstName: 'Guest',
        password: 'GuestPassword@123',
        plan: 'free'
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('nb_api_token', data.token);
        if (!localStorage.getItem('nb_session') && data.user) {
          setSession(data.user);
        }
        return data.token;
      }
    }
  } catch (e) { }
  return '';
}
// ══════════════════════════════════════════════════════════
//  DYNAMIC PROMO / UPGRADE BANNER (HOMEPAGE)
// ══════════════════════════════════════════════════════════
function updatePromoBar(userPlan) {
  const bar = document.getElementById('promo-bar');
  if (!bar) return;

  const session = getSession();
  const plan = userPlan || session?.plan || 'guest';

  // 1. Diamond accounts: completely hide the promo/upgrade bar
  if (plan === 'diamond') {
    bar.style.display = 'none';
    return;
  }

  // 2. Premium accounts: tailored banner to upgrade to Diamond
  if (plan === 'free-premium') {
    bar.style.display = 'flex';
    bar.style.background = 'linear-gradient(90deg, rgba(56,189,248,0.08), rgba(99,102,241,0.06))';
    bar.style.border = '1px solid rgba(56,189,248,0.28)';
    bar.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#38bdf8;box-shadow:0 0 8px rgba(56,189,248,0.6);flex-shrink:0;"></div>
        <div>
          <div style="font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:0.9rem; margin-bottom:2px; color:#fff;">Level up to Diamond — Unlimited AI &amp; Priority Speed</div>
          <div style="font-size:0.78rem; color:var(--text-secondary);">Zero weekly limits, unlimited generations, and full study vault access for &#8377;249/mo</div>
        </div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button onclick="openPricingModal('diamond')" style="font-family:'JetBrains Mono',monospace; font-size:0.72rem; color:var(--text-secondary); padding:7px 14px; border:1px solid rgba(255,255,255,0.12); border-radius:8px; background:rgba(255,255,255,0.04); cursor:pointer;">See Plans</button>
        <button onclick="openPricingModal('diamond')" style="font-family:'Space Grotesk',sans-serif; font-size:0.8rem; font-weight:700; color:#030712; background:linear-gradient(135deg,#38bdf8,#0ea5e9); border:none; padding:8px 18px; border-radius:8px; cursor:pointer;">Upgrade to Diamond &#8594;</button>
      </div>
    `;
    return;
  }

  // 3. Free plan accounts: tailored banner to upgrade to Premium
  if (plan === 'free') {
    bar.style.display = 'flex';
    bar.style.background = 'linear-gradient(90deg, rgba(168,85,247,0.08), rgba(34,197,94,0.06))';
    bar.style.border = '1px solid rgba(168,85,247,0.28)';
    bar.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="width:8px;height:8px;border-radius:50%;background:#a855f7;box-shadow:0 0 8px rgba(168,85,247,0.6);flex-shrink:0;"></div>
        <div>
          <div style="font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:0.9rem; margin-bottom:2px; color:#fff;">Upgrade to Premium — 7x Generations &amp; All Note Styles</div>
          <div style="font-size:0.78rem; color:var(--text-secondary);">Unlock Explain Mode, Flash Cards, and 10 file uploads for &#8377;99/mo</div>
        </div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button onclick="openPricingModal('free-premium')" style="font-family:'JetBrains Mono',monospace; font-size:0.72rem; color:var(--text-secondary); padding:7px 14px; border:1px solid rgba(255,255,255,0.12); border-radius:8px; background:rgba(255,255,255,0.04); cursor:pointer;">See Plans</button>
        <button onclick="openPricingModal('free-premium')" style="font-family:'Space Grotesk',sans-serif; font-size:0.8rem; font-weight:700; color:#fff; background:linear-gradient(135deg,#a855f7,#7c3aed); border:none; padding:8px 18px; border-radius:8px; cursor:pointer;">Upgrade to Premium &#8594;</button>
      </div>
    `;
    return;
  }

  // 4. Guest accounts (not logged in): prompt to sign up or view plans
  bar.style.display = 'flex';
  bar.style.background = 'linear-gradient(90deg, rgba(34,197,94,0.06), rgba(99,102,241,0.04))';
  bar.style.border = '1px solid rgba(34,197,94,0.18)';
  bar.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="width:8px;height:8px;border-radius:50%;background:var(--accent,#22c55e);flex-shrink:0;"></div>
      <div>
        <div style="font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:0.9rem; margin-bottom:2px; color:#fff;">Unlock the full NerdLume experience</div>
        <div style="font-size:0.78rem; color:var(--text-secondary);">Explain Mode, all note styles, flash cards &amp; more — from &#8377;99/mo</div>
      </div>
    </div>
    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
      <button onclick="openPricingModal()" style="font-family:'JetBrains Mono',monospace; font-size:0.72rem; color:var(--text-secondary); padding:7px 14px; border:1px solid rgba(255,255,255,0.12); border-radius:8px; background:rgba(255,255,255,0.04); cursor:pointer;">See Plans</button>
      <a href="signin.html" style="font-family:'Space Grotesk',sans-serif; font-size:0.8rem; font-weight:700; color:#07080d; background:var(--accent,#22c55e); padding:8px 18px; border-radius:8px; text-decoration:none;">Sign Up Free</a>
    </div>
  `;
}
window.updatePromoBar = updatePromoBar;

document.addEventListener('DOMContentLoaded', () => {
  ensureGuestApiToken();
  // Auth-page specifics
  initStrengthMeter();
  initPlanSelector();
  // Wire any [data-open-pricing] buttons to popup
  document.querySelectorAll('[data-open-pricing]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); openPricingModal(); });
  });

  const session = getSession();

  // ── Header: inject badge or auth buttons ──
  const headerBadge = document.querySelector('.header-badge');
  if (headerBadge) {
    headerBadge.outerHTML = session ? buildUserBadge(session) : buildAuthButtons();
  }

  // ── Plan restrictions & Promo Bar ──
  const userPlan = session?.plan || 'guest';
  applyPlanRestrictions(userPlan);
  updatePromoBar(userPlan);

  // ── ESC closes modals ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePricingModal();
      closeSidebar();
    }
  });
  // ── Auto-show plan popup on homepage for guests ──
  maybeShowWelcomePopup();

  // ── Live sync listeners for Sidebar & Session ──
  const syncSidebarLive = () => {
    const s = getSession();
    if (s && document.getElementById('user-sidebar')) {
      ensureSidebarElements(s, true);
    }
    updatePromoBar(s?.plan || 'guest');
  };
  window.addEventListener('nb-generation-created', syncSidebarLive);
  window.addEventListener('nb-file-uploaded', syncSidebarLive);
  window.addEventListener('nb-session-updated', syncSidebarLive);
  window.addEventListener('storage', syncSidebarLive);
});
