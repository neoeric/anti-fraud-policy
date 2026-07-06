# 隱私政策 / Privacy Policy

**應用程式名稱 / App Name：** threads_search_keyword  
**最後更新 / Last Updated：** 2026年6月 / June 2026  
**開發單位 / Developer：** Wistron Software（緯創軟體）

---

## 應用程式說明

本應用程式是台灣政府**115年度通報查詢與防詐協作應用計畫**的一部分，在數位部（Ministry of Digital Affairs）授權下，與刑事局（Criminal Investigation Bureau）合作運作，用於識別 Threads 平台上的詐騙貼文，協助政府授權人員複核民眾通報的案件。

## About This App

This application is part of Taiwan's government-funded **Anti-Fraud Collaboration Project (Fiscal Year 115)**, operating under authorization from Taiwan's Ministry of Digital Affairs and in cooperation with the Criminal Investigation Bureau. It identifies fraudulent posts on Threads to assist authorized government reviewers in processing citizen fraud reports.

---

## 資料收集 / Data Collection

本應用程式僅存取以下公開資料：

This app only accesses the following public data:

- Threads 公開貼文內容（文字、媒體連結、時間戳記）  
  Public Threads post content (text, media URLs, timestamps)
- 貼文作者的公開帳號資訊（用戶名稱、所在地、個人檔案）  
  Public account information of post authors (username, location, profile)
- 公開回覆內容  
  Public reply content

---

## 資料使用 / Data Use

所有存取的資料**僅用於詐騙風險分析**，具體包括：

All accessed data is used **solely for fraud risk analysis**, including:

- 多訊號規則評分（話術特徵、模板複製、離站引導等）  
  Multi-signal rule-based scoring (scripted language, template copying, off-platform redirection, etc.)
- AI 語意分析，區分詐騙貼文與正常貼文  
  AI semantic analysis to distinguish fraudulent posts from legitimate content
- 提供政府授權審查人員複核的候選清單  
  Generating candidate lists for review by authorized government personnel

---

## 資料保護 / Data Protection

- 資料**不會對外分享、販售或用於任何商業目的**  
  Data is **not shared, sold, or used for any commercial purpose**
- 資料在複核週期完成後**不會長期保存**  
  Data is **not retained** beyond the review cycle
- 本應用程式**不會主動聯繫、回覆或對任何被標記帳號採取直接行動**  
  This app **does not contact, reply to, or take direct action** against any flagged accounts
- 所有資料處理在台灣政府授權基礎設施內進行  
  All data processing occurs within Taiwan government-authorized infrastructure

---

## 資料刪除 / Data Deletion

如需要求刪除與您相關的資料，請透過以下方式聯繫：

To request deletion of your data, please contact us at:

**Email：** eric912146@yahoo.com.tw

我們將在收到請求後 30 天內處理。  
We will process your request within 30 days of receipt.

---

## 聯絡方式 / Contact

**開發單位 / Developer：** Wistron Software（緯創軟體）  
**Email：** eric912146@yahoo.com.tw  
**計畫主管機關 / Supervising Authority：** 數位部（Ministry of Digital Affairs, Taiwan）

---

## 適用範圍 / Scope

本隱私政策適用於本計畫的兩個元件：

This privacy policy covers both components of this project:

1. **threads_search_keyword** — 透過 Meta Threads API 存取資料的後端應用程式  
   Backend application accessing data via the Meta Threads API
2. **Threads 防詐屏蔽插件** — 瀏覽器擴充功能。未設定後端時，偵測全在使用者本機執行、不傳輸任何資料；設定後端（Gateway URL）後，會將頁面上公開貼文的文字（最多 500 字）與貼文網址傳送至後端進行詐騙比對，不傳送任何使用者個人資訊或瀏覽紀錄  
   Browser extension. Without a backend configured, all detection runs locally and nothing is transmitted; with a Gateway URL configured, the text of public posts (up to 500 characters) and post URLs are sent to the backend for fraud matching. No user personal information or browsing history is transmitted.
