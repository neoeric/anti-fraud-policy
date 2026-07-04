const STORAGE_KEY = 'threadsFraudBlocker';

let settings = {
  enabled: true,
  mode: 'hide',
  blockedCount: 0,
  gatewayUrl: '',
  extToken: '',
};

function updateStatusIndicator() {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const hint = document.getElementById('sourceHint');

  if (settings.gatewayUrl) {
    dot.className  = 'dot green';
    text.textContent = `後端已設定，優先查詢 DB`;
    hint.textContent = `後端 + 本機 pattern 雙重偵測`;
  } else {
    dot.className  = 'dot grey';
    text.textContent = '未設定後端（使用本機 pattern 偵測）';
    hint.textContent = '掃描並處理詐騙貼文';
  }
}

function render() {
  document.getElementById('enabledToggle').checked = settings.enabled;
  document.getElementById('blockedCount').textContent = settings.blockedCount;
  document.getElementById('gatewayUrl').value = settings.gatewayUrl || '';
  document.getElementById('extToken').value   = settings.extToken   || '';

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === settings.mode);
  });

  updateStatusIndicator();
}

function saveAndRender() {
  chrome.storage.local.set({ [STORAGE_KEY]: settings });
  render();
}

// Load settings
chrome.storage.local.get(STORAGE_KEY, (data) => {
  if (data[STORAGE_KEY]) settings = { ...settings, ...data[STORAGE_KEY] };
  render();
});

// Listen for count updates from content script
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    settings = { ...settings, ...changes[STORAGE_KEY].newValue };
    render();
  }
});

// Enable/disable toggle
document.getElementById('enabledToggle').addEventListener('change', (e) => {
  settings.enabled = e.target.checked;
  saveAndRender();
});

// Mode buttons
document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    settings.mode = btn.dataset.mode;
    saveAndRender();
  });
});

// Gateway URL input (debounced)
let urlTimer;
document.getElementById('gatewayUrl').addEventListener('input', (e) => {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    settings.gatewayUrl = e.target.value.trim().replace(/\/$/, '');
    saveAndRender();
  }, 600);
});

// EXT Token input (debounced)
let tokenTimer;
document.getElementById('extToken').addEventListener('input', (e) => {
  clearTimeout(tokenTimer);
  tokenTimer = setTimeout(() => {
    settings.extToken = e.target.value.trim();
    saveAndRender();
  }, 600);
});
