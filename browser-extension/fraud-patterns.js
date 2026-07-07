/**
 * fraud-patterns.js
 * 直接移植自 gateway_reviewer/db.py 的 L2.5 + L4 偵測邏輯
 * L2.5：LINE 外導（高信心，直接命中）
 * L4  ：類型內容態樣（多 pattern 全中才觸發）
 * 補充 ：高信心單一話術詞（可累積至警告門檻）
 */

// ── 分數門檻 ──────────────────────────────────────────────────────────────────
const FRAUD_THRESHOLD = 4; // >= 4 → 屏蔽
const WARN_THRESHOLD  = 3; // >= 3 → 軟性警告

// ── L2.5: LINE 外導偵測 ───────────────────────────────────────────────────────
// 排除 LINE Pay 付款語境、排除反詐騙警示語境

const _LINE_PAYMENT_RE  = /\bline\s*pay\b|linepay/i;

const _LINE_WARNING_RE  = /(?:不要|別|勿|切勿|請勿).{0,12}(?:加|加入|私訊|聯絡|搜尋)?\s*(?:line|賴|赖|瀨|籟)|(?:line|賴|赖|瀨|籟).{0,12}(?:詐騙|不要加|請勿加|切勿加)|詐騙.{0,12}(?:line|賴|赖|瀨|籟)/i;

const _LINE_EXTERNAL_RE = new RegExp(
  // lin.ee / line.me 直連
  String.raw`(?:lin\.ee|line\.me)\/(?:ti|R|[A-Za-z0-9_/?=&.\-]+)` +
  // 動詞 + line/賴 (0~12字間距)
  String.raw`|(?:加|加入|添加|私訊|私我|聯絡|聯繫|搜尋|搜|報名|應徵|了解工作|想了解工作|訂購|下單|購買)[\s\S]{0,12}(?:line|賴|赖|瀨|籟)` +
  // 動詞 + @帳號
  String.raw`|(?:加|加入|添加|搜尋|搜|聯絡|聯繫|報名|應徵|想了解工作|了解工作|記得加)\s*[@＠][a-z0-9_.\-]{3,}` +
  // line id/帳號: 後面接帳號
  String.raw`|(?:line)\s*(?:id|帳號|官方帳號|好友|群組|社群)?\s*[:：@＠]\s*@?[a-z0-9_.\-]{3,}` +
  // 賴/赖/瀨/籟 + 帳號
  String.raw`|(?:賴|赖|瀨|籟)\s*(?:id|帳號|好友|群組|社群|🆔|🪪)?\s*[:：@＠]?\s*@?[a-z0-9_.\-]{3,}` +
  // 請到 line 帳號
  String.raw`|(?:請到|前往|到)\s*(?:line)\s*(?:官方)?帳號` +
  // line 官方帳號 + 連結/加入
  String.raw`|(?:line)\s*(?:官方)?帳號[\s\S]{0,12}(?:連結|如下|加入|加)`,
  'i'
);

function _hasLineExternalIntent(text) {
  if (!text) return false;
  const t = text.replace(_LINE_PAYMENT_RE, ' ');
  if (_LINE_WARNING_RE.test(t)) return false;
  return _LINE_EXTERNAL_RE.test(t);
}

const _LINE_CATEGORY_PATTERNS = [
  ['虛寶詐騙',  /(?:遊戲|手遊|玩家).{0,30}(?:虛寶|虛擬寶物|遊戲幣|點券|鑽石|寶石|寶箱|禮包|裝備|皮膚|造型|序號|兌換碼)|(?:虛寶|虛擬寶物|遊戲幣|點券|鑽石|寶石|禮包|裝備|皮膚|造型|兌換碼)/i],
  ['假徵才',    /徵人|徵才|誠徵|招募|工作|薪資|月薪|日薪|時薪|應徵|報名|代儲|活動徵人|活動人員|展場人員/i],
  ['投資詐騙',  /投資|理財|股票|飆股|收益|獲利|月入|日賺|穩定收入|財富自由|期貨|外匯|加密|跟單|波段/i],
  ['假出售',    /訂購|下單|購買|預訂|出售|轉讓|二手|出清|付款|商品|客服|按摩|命理|測八字/i],
  ['交友詐騙',  /交友|伴侶|認識|聊天|固友|援交|包養/i],
];

function _inferLineCategory(text) {
  for (const [cat, re] of _LINE_CATEGORY_PATTERNS) {
    if (re.test(text)) return cat;
  }
  return '引導離站';
}

// ── L4: 類型內容態樣（每組全部 patterns 須命中）───────────────────────────────
// 移植自 db.py _CAT_CONTENT_PATTERNS，共 15 組

const _LC = /line\s*(?:id|[:：@＠]|帳號|官方帳號|好友|群組|社群)|line\.me|lin\.ee|加\s*line|加入\s*line|添加\s*line|賴|赖|瀨|籟/i; // LINE 聯繫基礎 pattern

const CAT_CONTENT_PATTERNS = [
  // ── product_service ──
  { label: '假出售',
    patterns: [
      /售|出售|轉讓|賣(?!場)|二手|釋出|搬家|出清|低價|閒置|拍賣|訂購|下單|購買|預訂/i,
      new RegExp(_LC.source + '|私訊|加我|聯繫', 'i'),
    ]},

  // ── investment ──
  { label: '投資詐騙',
    patterns: [
      /投資|基金|期貨|外匯|加密貨幣|獲利|月入|日賺|穩定收入|被動收入|翻倍|財富自由/i,
      new RegExp('加入|聯繫|私訊|' + _LC.source + '|加我|報名|敲我', 'i'),
    ]},
  { label: '投資詐騙（飆股引流）',
    patterns: [
      /飆股|台股明牌|股市明牌|股票明牌|飛天股/i,
      /按贊|按讚|追蹤|分享|敲我|聯絡/i,
    ]},
  { label: '投資詐騙（N年經驗宣稱）',
    patterns: [
      /(?:\d{1,2}年|多年)[\s\S]{0,10}(?:台股|股市|股票|投資|操盤)[\s\S]{0,10}(?:經驗|成績|心得)/i,
      /按贊|按讚|追蹤|分享|敲我|私訊|聯絡/i,
    ]},

  // ── job_recruitment ──
  { label: '假徵才',
    patterns: [
      /徵人|徵才|誠徵|招募|職缺|工作|薪資|月薪|日薪|時薪|訂單管理|居家|遠端|活動徵人|活動招募|活動人員|活動兼職|活動工讀|工讀生|展場人員/i,
      new RegExp(_LC.source + '|私訊|加我|聯繫|應徵|報名', 'i'),
    ]},
  { label: '假代工',
    patterns: [
      /(?:假代工|代工|紙袋串繩|紙袋穿繩|串繩|家庭代工|居家代工)[\s\S]{0,220}(?:提款卡|存摺|依量計薪|多勞多得|簡單好上手|無上門收送貨)/i,
      /歡迎加入|直接填表|填表詢問|想了解|有興趣/i,
    ]},

  // ── windfall ──
  { label: '假贈品（3C／現金）',
    patterns: [
      /switch|iphone|ipad|macbook|筆電|手機|禮品卡|現金|紅包|獎品|贈品/i,
      /送出|免費送|贈送|不要[💰錢]|不用錢|不收錢|免費拿|免費領/i,
    ]},
  { label: '假抽獎',
    patterns: [
      /中獎|贈送|抽獎|免費活動|回饋|好禮|獎品|贈品|送禮|禮品/i,
      new RegExp(_LC.source + '|私訊|加我|聯繫', 'i'),
    ]},
  { label: '假虛寶',
    patterns: [
      /遊戲|手遊|玩家|虛寶|虛擬寶物|遊戲幣|遊戲道具|點券|鑽石|寶石|禮包|裝備|皮膚|造型|序號|兌換碼/i,
      /免費送|免費領|贈送|福利|補償|領取|兌換|名額有限/i,
      new RegExp(_LC.source + '|私訊|加我|聯繫|連結|discord|報名', 'i'),
    ]},
  { label: '假虛寶（數量型）',
    patterns: [
      /免費領取|免費領|免費送|領取|贈送|福利|補償/i,
      /虛寶|虛擬寶物|遊戲幣|遊戲道具|點券|鑽石|寶石|寶箱|寶物|禮包|裝備|皮膚|造型/i,
      /[×xX]\s*\d+|\d{2,}/i,
    ]},

  // ── romance ──
  { label: '交友詐騙',
    patterns: [/援交|固友|包養|徵友|單親媽媽|約砲|炮友|私下見面|兼差陪伴/i]},
  { label: '交友詐騙',
    patterns: [/單身[\s\S]{0,90}(?:找個人|有人約|吃飯|聊天|看電影|認識)/i]},
  { label: '交友詐騙（搬來某地找朋友）',
    patterns: [/(?:搬來|來到|住了|剛到)[\s\S]{0,24}(?:高雄|台北|臺北|台中|臺中|台南|臺南|南部|北部)[\s\S]{0,180}(?:朋友|認識|交朋友)[\s\S]{0,140}(?:無聊|找朋友|吃飯|聊天|看電影)/i]},
  { label: '交友詐騙（固定台詞）',
    patterns: [/哭不[\s\S]{0,6}(?:代表|帶表|带表)[\s\S]{0,12}悲[傷伤][\s\S]{0,40}笑不[\s\S]{0,6}(?:代表|帶表|带表)[\s\S]{0,12}幸福/i]},
  { label: '交友詐騙',
    patterns: [/(?:本人|我|自己)?\s*\d{2}\s*歲[\s\S]{0,30}(?:孤獨|孤单|寂寞|鬱悶|郁闷|無聊|无聊)[\s\S]{0,50}(?:聊得來|聊得来|聊天|說話|说话)[\s\S]{0,20}(?:朋友|對象|伴)/i]},
];

// ── 補充高信心單一話術（可累積至警告門檻）──────────────────────────────────────
// 單獨不夠判詐騙，但與其他弱訊號組合可達 WARN_THRESHOLD

const SUPPLEMENTARY = [
  { weight: 2, label: '投資話術',   re: /穩定獲利|必賺|保證獲利|穩賺不賠|日入[0-9]|月入[0-9]|本金翻倍|放大獲利|帶單老師|跟單達人|複利操作|出金截圖|已出金/i },
  { weight: 2, label: '假兼職話術', re: /在家賺錢|零門檻.*兼職|滑手機.*賺|不用出門.*收入|日領[0-9]|兼職.*輕鬆.*[0-9]/i },
  { weight: 1, label: '緊迫話術',   re: /名額(?:只剩|有限|即將額滿)|限時.*(?:名額|優惠)|今天截止|最後.*名額|把握機會|錯過.*後悔/i },
  { weight: 1, label: '假見證',     re: /成功出金|已入帳.*[0-9]|獲利截圖|感謝.*老師.*獲利|跟著老師.*賺到/i },
];

// ── 主評分函數 ─────────────────────────────────────────────────────────────────

function calculateFraudScore(text) {
  if (!text) return { score: 0, categories: [] };

  const categories = [];
  let score = 0;

  // 1. L2.5 LINE 外導（最高信心，直接返回）
  if (_hasLineExternalIntent(text)) {
    const cat = _inferLineCategory(text);
    return { score: 5, categories: [`引導離站（LINE外導）：${cat}`] };
  }

  // 2. L4 類型態樣（全中才計，第一組命中即停）
  for (const { label, patterns } of CAT_CONTENT_PATTERNS) {
    if (patterns.every(p => p.test(text))) {
      categories.push(label);
      score += 4;
      break;
    }
  }

  // 3. 補充話術（可累積，最多加到 FRAUD_THRESHOLD - 1，避免單獨誤判）
  if (score < FRAUD_THRESHOLD) {
    for (const { weight, label, re } of SUPPLEMENTARY) {
      if (re.test(text)) {
        categories.push(label);
        score += weight;
      }
    }
  }

  return { score, categories };
}
