// Threads anti-fraud content script
// Scans posts using pattern matching and hides or warns based on user settings

const STORAGE_KEY = 'threadsFraudBlocker';

let settings = {
  enabled: true,
  mode: 'hide',  // 'hide' | 'warn'
  blockedCount: 0,
};

let processedPosts = new WeakSet();

// Load settings from storage, then start scanning
chrome.storage.local.get(STORAGE_KEY, (data) => {
  if (data[STORAGE_KEY]) {
    settings = { ...settings, ...data[STORAGE_KEY] };
  }
  startObserver();
});

// Listen for settings changes from popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    settings = { ...settings, ...changes[STORAGE_KEY].newValue };
    // Re-scan visible posts when mode changes
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

// Find post containers in Threads DOM
// Threads uses React; article or [role=article] are most stable selectors
function findPostContainers() {
  const selectors = [
    'article',
    '[role="article"]',
    'div[data-pressable-container="true"]',
  ];
  const found = new Set();
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach((el) => found.add(el));
  }
  return [...found];
}

// Get the readable text of a post element
function getPostText(el) {
  // Avoid reading alt text of images and aria-hidden elements
  const clone = el.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"], img, video, svg').forEach((n) => n.remove());
  return clone.innerText || clone.textContent || '';
}

// Inject warning banner into a post element
function injectWarningBanner(el, categories) {
  if (el.querySelector('.fraud-warning-banner')) return;

  const banner = document.createElement('div');
  banner.className = 'fraud-warning-banner';
  banner.innerHTML = `
    <span class="fraud-icon">⚠️</span>
    <span class="fraud-text">
      <strong>疑似詐騙貼文</strong>
      <small>${categories.join('、')}</small>
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

// Apply blocking / warning to a post element
function processPost(el) {
  if (!settings.enabled) return;
  if (processedPosts.has(el)) return;
  processedPosts.add(el);
  el.setAttribute('data-fraud-checked', '1');

  const text = getPostText(el);
  if (!text.trim()) return;

  const { score, categories } = calculateFraudScore(text);

  if (score >= FRAUD_THRESHOLD) {
    settings.blockedCount += 1;
    saveSettings();

    if (settings.mode === 'hide') {
      el.style.display = 'none';
      el.setAttribute('data-fraud-hidden', '1');
    } else {
      injectWarningBanner(el, categories);
    }
  } else if (score >= WARN_THRESHOLD) {
    // Below hard threshold but still suspicious → always show soft warning
    injectWarningBanner(el, categories);
  }
}

function scanAllPosts() {
  if (!settings.enabled) return;
  findPostContainers().forEach(processPost);
}

// Inject CSS for warning banner
function injectStyles() {
  if (document.getElementById('fraud-blocker-styles')) return;
  const style = document.createElement('style');
  style.id = 'fraud-blocker-styles';
  style.textContent = `
    .fraud-warning-banner {
      display: flex;
      align-items: center;
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
    .fraud-icon {
      font-size: 18px;
      flex-shrink: 0;
    }
    .fraud-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .fraud-text strong {
      color: #cc6600;
      font-weight: 600;
    }
    .fraud-text small {
      color: #888;
      font-size: 11px;
    }
    .fraud-dismiss {
      background: none;
      border: none;
      cursor: pointer;
      color: #aaa;
      font-size: 14px;
      padding: 0 4px;
      line-height: 1;
      flex-shrink: 0;
    }
    .fraud-dismiss:hover {
      color: #666;
    }
  `;
  document.head.appendChild(style);
}

// Observe DOM mutations to catch dynamically loaded posts (SPA)
function startObserver() {
  injectStyles();
  scanAllPosts();

  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) scanAllPosts();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
