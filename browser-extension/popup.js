const STORAGE_KEY = 'threadsFraudBlocker';

let settings = {
  enabled: true,
  mode: 'hide',
  blockedCount: 0,
  gatewayUrl: '',
  extToken: '',
};

// Result of the latest permission check / connection test.
// null = untested, 'ok' | 'no-permission' | 'unreachable'
let gatewayStatus = null;

function originPattern(url) {
  try {
    return new URL(url).origin + '/*';
  } catch {
    return null;
  }
}

function updateStatusIndicator() {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  const hint = document.getElementById('sourceHint');

  if (!settings.gatewayUrl) {
    dot.className = 'dot grey';
    text.textContent = '未設定後端（使用本機 pattern 偵測）';
    hint.textContent = '掃描並處理詐騙貼文';
    return;
  }

  hint.textContent = '後端 + 本機 pattern 雙重偵測';

  switch (gatewayStatus) {
    case 'ok':
      dot.className = 'dot green';
      text.textContent = '後端連線正常，優先查詢 DB';
      break;
    case 'no-permission':
      dot.className = 'dot red';
      text.textContent = '尚未授權此網域，請按「授權並測試連線」';
      break;
    case 'unreachable':
      dot.className = 'dot red';
      text.textContent = '無法連線後端（將使用本機 pattern）';
      break;
    default:
      dot.className = 'dot grey';
      text.textContent = '後端已設定，尚未測試連線';
  }
}

function render() {
  document.getElementById('enabledToggle').checked = settings.enabled;
  document.getElementById('blockedCount').textContent = settings.blockedCount;

  // Don't clobber a field the user is currently typing in — a
  // blockedCount update from the content script would re-render
  // mid-keystroke otherwise.
  const urlInput   = document.getElementById('gatewayUrl');
  const tokenInput = document.getElementById('extToken');
  if (document.activeElement !== urlInput)   urlInput.value   = settings.gatewayUrl || '';
  if (document.activeElement !== tokenInput) tokenInput.value = settings.extToken   || '';

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === settings.mode);
  });

  updateStatusIndicator();
}

function saveAndRender() {
  chrome.storage.local.set({ [STORAGE_KEY]: settings });
  render();
}

// Check (without prompting) whether we hold permission for the gateway origin
function refreshPermissionStatus() {
  if (!settings.gatewayUrl) {
    gatewayStatus = null;
    updateStatusIndicator();
    return;
  }
  const pattern = originPattern(settings.gatewayUrl);
  if (!pattern) {
    gatewayStatus = 'unreachable';
    updateStatusIndicator();
    return;
  }
  chrome.permissions.contains({ origins: [pattern] }, (granted) => {
    gatewayStatus = granted ? gatewayStatus : 'no-permission';
    updateStatusIndicator();
  });
}

// Load settings
chrome.storage.local.get(STORAGE_KEY, (data) => {
  if (data[STORAGE_KEY]) settings = { ...settings, ...data[STORAGE_KEY] };
  render();
  refreshPermissionStatus();
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
    gatewayStatus = null; // URL changed — previous test no longer applies
    saveAndRender();
    refreshPermissionStatus();
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

// Authorize custom gateway origin + test connectivity.
// permissions.request() must run inside a user gesture, hence a button.
document.getElementById('testBtn').addEventListener('click', async () => {
  const btn = document.getElementById('testBtn');

  // Use the live input value so the user doesn't have to wait out the debounce
  const url = document.getElementById('gatewayUrl').value.trim().replace(/\/$/, '');
  settings.gatewayUrl = url;
  settings.extToken   = document.getElementById('extToken').value.trim();
  chrome.storage.local.set({ [STORAGE_KEY]: settings });

  if (!url) {
    gatewayStatus = null;
    updateStatusIndicator();
    return;
  }

  const pattern = originPattern(url);
  if (!pattern) {
    gatewayStatus = 'unreachable';
    updateStatusIndicator();
    return;
  }

  btn.disabled = true;
  btn.textContent = '測試中…';

  try {
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) {
      gatewayStatus = 'no-permission';
      return;
    }

    const headers = {};
    if (settings.extToken) headers['Authorization'] = `Bearer ${settings.extToken}`;
    const res = await fetch(`${url}/ext/check?text=ping`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    gatewayStatus = res.ok ? 'ok' : 'unreachable';
  } catch {
    gatewayStatus = 'unreachable';
  } finally {
    btn.disabled = false;
    btn.textContent = '授權並測試連線';
    updateStatusIndicator();
  }
});
