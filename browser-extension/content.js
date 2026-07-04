// Threads anti-fraud content script
// Priority: backend /ext/check → local pattern matching → no action

const STORAGE_KEY = 'threadsFraudBlocker';

let settings = {
  enabled: true,
  mode: 'hide',
  blockedCount: 0,
  gatewayUrl: '',
  extToken: '',
};

let processedPosts = new WeakSet();

// Load settings then start scanning
chrome.storage.local.get(STORAGE_KEY, (data) => {
  if (data[STORAGE_KEY]) settings = { ...settings, ...data[STORAGE_KEY] };
  startObserver();
});

// React to settings changes from popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    settings = { ...settings, ...changes[STORAGE_KEY].newValue };
    // Re-scan on mode change
    document.querySelectorAll('[data-fraud-checked]').forEach((el) => {
      el.removeAttribute('data-fraud-checked');
      processedPosts.delete(el);
    });
    scanAllPosts();
  }
});

function saveSettings() {
  chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

// ── DOM helpers ──────────────────────────────────────────────────────────────

function findPostContainers() {
  const selectors = ['article', '[role="article"]', 'div[data-pressable-container="true"]'];
  const found = new Set();
  selectors.forEach((sel) => document.querySelectorAll(sel).forEach((el) => found.add(el)));
  return [...found];
}

function getPostText(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"], img, video, svg').forEach((n) => n.remove());
  return (clone.innerText || clone.textContent || '').trim();
}

// Extract the canonical Threads post URL from within a post element
function getPostUrl(el) {
  const links = el.querySelectorAll('a[href]');
  for (const a of links) {
    const href = a.href || '';
    if (href.includes('/post/') && href.includes('threads.')) return href;
  }
  return null;
}

// ── Display helpers ──────────────────────────────────────────────────────────

function hidePost(el) {
  el.style.display = 'none';
  el.setAttribute('data-fraud-hidden', '1');
}

function injectWarningBanner(el, tags, summary) {
  if (el.querySelector('.fraud-warning-banner')) return;

  const banner = document.createElement('div');
  banner.className = 'fraud-warning-banner';

  const tagHtml = tags.length
    ? `<small>${tags.slice(0, 3).join('、')}</small>`
    : '';
  const summaryHtml = summary
    ? `<small style="margin-top:2px;font-style:italic">${summary.slice(0, 80)}</small>`
    : '';

  banner.innerHTML = `
    <span class="fraud-icon">⚠️</span>
    <span class="fraud-text">
      <strong>疑似詐騙貼文</strong>
      ${tagHtml}
      ${summaryHtml}
    </span>
    <button class="fraud-dismiss" title="忽略此警告">✕</button>
  `;

  banner.querySelector('.fraud-dismiss').addEventListener('click', (e) => {
    e.stopPropagation();
    banner.remove();
    el.style.removeProperty('opacity');
    el.style.removeProperty('filter');
  });

  el.style.opacity = '0.5';
  el.style.filter = 'grayscale(40%)';
  el.insertAdjacentElement('afterbegin', banner);
}

function applyVerdict(el, fraudRiskLevel, riskTags, summary) {
  const isHighRisk = fraudRiskLevel === 'agree-fraud' || fraudRiskLevel === 'likely-fraud';
  if (!isHighRisk) return;

  settings.blockedCount += 1;
  saveSettings();

  if (settings.mode === 'hide') {
    hidePost(el);
  } else {
    injectWarningBanner(el, riskTags || [], summary || '');
  }
}

// ── Per-post processing ──────────────────────────────────────────────────────

async function processPost(el) {
  if (!settings.enabled) return;
  if (processedPosts.has(el)) return;
  processedPosts.add(el);
  el.setAttribute('data-fraud-checked', '1');

  const text = getPostText(el);
  if (!text) return;

  const postUrl = getPostUrl(el);

  // 1. Ask background SW to query backend (has fraud DB + LINE ID index)
  if (settings.gatewayUrl) {
    try {
      const result = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'checkFraud', url: postUrl, text },
          (res) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(res);
          }
        );
      });

      if (result && result.source !== 'none' && result.fraudRiskLevel) {
        applyVerdict(el, result.fraudRiskLevel, result.riskTags, result.summary);
        return; // backend gave a verdict — trust it, skip local patterns
      }
    } catch {
      // Backend unavailable — fall through to local patterns
    }
  }

  // 2. Fallback: local pattern matching
  const { score, categories } = calculateFraudScore(text);
  if (score >= FRAUD_THRESHOLD) {
    applyVerdict(el, 'agree-fraud', categories, null);
  } else if (score >= WARN_THRESHOLD) {
    injectWarningBanner(el, categories, null);
  }
}

function scanAllPosts() {
  if (!settings.enabled) return;
  findPostContainers().forEach((el) => processPost(el));
}

// ── Styles ───────────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('fraud-blocker-styles')) return;
  const style = document.createElement('style');
  style.id = 'fraud-blocker-styles';
  style.textContent = `
    .fraud-warning-banner {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: rgba(255, 160, 0, 0.15);
      border: 1.5px solid rgba(255, 160, 0, 0.6);
      border-radius: 8px;
      padding: 8px 12px;
      margin: 8px 8px 4px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 10;
      position: relative;
    }
    .fraud-icon { font-size: 18px; flex-shrink: 0; padding-top: 2px; }
    .fraud-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .fraud-text strong { color: #cc6600; font-weight: 600; }
    .fraud-text small  { color: #888; font-size: 11px; }
    .fraud-dismiss {
      background: none; border: none; cursor: pointer;
      color: #aaa; font-size: 14px; padding: 0 4px; line-height: 1; flex-shrink: 0;
    }
    .fraud-dismiss:hover { color: #666; }
  `;
  document.head.appendChild(style);
}

// ── MutationObserver ─────────────────────────────────────────────────────────

function startObserver() {
  injectStyles();
  scanAllPosts();

  const observer = new MutationObserver((mutations) => {
    const hasNew = mutations.some((m) => m.addedNodes.length > 0);
    if (hasNew) scanAllPosts();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
