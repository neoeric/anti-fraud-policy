// Service worker — proxies API calls and resets blocked count on navigation

const STORAGE_KEY = 'threadsFraudBlocker';

// Reset blocked count on Threads navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'loading' &&
    tab.url &&
    tab.url.includes('threads.')
  ) {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      const current = data[STORAGE_KEY] || {};
      chrome.storage.local.set({ [STORAGE_KEY]: { ...current, blockedCount: 0 } });
    });
  }
});

// Handle check requests from content script
// Background SW can make cross-origin fetch without CORS issues
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action !== 'checkFraud') return false;

  chrome.storage.local.get(STORAGE_KEY, async (data) => {
    const settings = data[STORAGE_KEY] || {};
    const gatewayUrl = (settings.gatewayUrl || '').replace(/\/$/, '');
    const extToken   = settings.extToken || '';

    if (!gatewayUrl) {
      sendResponse({ source: 'none', fraudRiskLevel: null });
      return;
    }

    const params = new URLSearchParams();
    if (msg.url)  params.set('url',  msg.url);
    if (msg.text) params.set('text', msg.text.slice(0, 500)); // truncate to avoid huge query

    const headers = {};
    if (extToken) headers['Authorization'] = `Bearer ${extToken}`;

    try {
      const res = await fetch(`${gatewayUrl}/ext/check?${params}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        sendResponse({ source: 'none', fraudRiskLevel: null });
        return;
      }
      const data = await res.json();
      sendResponse(data);
    } catch {
      sendResponse({ source: 'none', fraudRiskLevel: null });
    }
  });

  return true; // async response
});
