// Service worker — resets blocked count when navigating to Threads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'loading' &&
    tab.url &&
    (tab.url.includes('threads.net'))
  ) {
    chrome.storage.local.get('threadsFraudBlocker', (data) => {
      const current = data['threadsFraudBlocker'] || {};
      chrome.storage.local.set({
        threadsFraudBlocker: { ...current, blockedCount: 0 }
      });
    });
  }
});
