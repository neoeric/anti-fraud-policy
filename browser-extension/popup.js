const STORAGE_KEY = 'threadsFraudBlocker';

let settings = { enabled: true, mode: 'hide', blockedCount: 0 };

function render() {
  document.getElementById('enabledToggle').checked = settings.enabled;
  document.getElementById('blockedCount').textContent = settings.blockedCount;

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === settings.mode);
  });
}

function saveAndRender() {
  chrome.storage.local.set({ [STORAGE_KEY]: settings });
  render();
}

// Load current settings
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
