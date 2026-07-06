# anti-fraud-policy

Threads 防詐屏蔽插件 — 台灣政府防詐協作計畫（Wistron Software × 數位部）。

自動識別並屏蔽 Threads 上的詐騙貼文（投資、假兼職、引導離站加 LINE 等常見話術）。

## 專案結構

```
browser-extension/
├── manifest.json       # MV3 設定
├── content.js          # 注入 Threads 頁面，掃描與處理貼文
├── fraud-patterns.js   # 本機加權關鍵字規則
├── background.js       # Service worker，代理後端 API、換頁重置計數
├── popup.html / popup.js  # 控制面板（開關、模式、後端設定）
└── icons/              # 圖示
```

## 運作方式

1. **後端優先**：若在控制面板設定 Gateway URL，貼文文字/網址會送至後端 `/ext/check` 查詢詐騙資料庫。
2. **本機規則備援**：未設後端或後端無結論時，退回本機關鍵字加權評分（總分 ≥4 屏蔽、≥3 警告）。
3. **處理方式**：可選「直接隱藏」或「顯示橘色警告橫幅」。

## 安裝

見 [browser-extension/INSTALL.md](browser-extension/INSTALL.md)。

## 隱私

- **未設定後端時**：偵測全在本機執行，不上傳任何資料。
- **設定後端後**：公開貼文的文字（最多 500 字）與網址會上傳至你設定的後端比對。
- 僅讀取頁面已公開顯示的貼文文字，不蒐集個人資訊。

完整條款見 [privacy.md](privacy.md)。
