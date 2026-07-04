// Fraud pattern definitions for Taiwan Threads anti-fraud detection
// Each category has a weight; total score >= FRAUD_THRESHOLD triggers blocking

const FRAUD_PATTERNS = {
  // Off-platform redirection — highest confidence signal
  offPlatform: {
    weight: 4,
    label: '引導離站',
    patterns: [
      /加(我|我的)?\s*(LINE|賴|line)/i,
      /LINE\s*ID\s*[:：\s]/i,
      /line\.me\//i,
      /私(訊|信|聊)(我|聯繫|聯絡)/i,
      /Telegram\s*(頻道|群|ID|@)/i,
      /WhatsApp\s*(聯繫|加我)/i,
      /WeChat\s*(ID|號)/i,
      /IG\s*私(訊|信)(我)/i,
      /加賴\s*[:：]/i,
    ]
  },

  // Investment & financial fraud
  investment: {
    weight: 3,
    label: '投資詐騙',
    patterns: [
      /穩定(獲利|收益|報酬|入金)/i,
      /每[月週周天日](獲利|收益|收入|入帳)\s*\d+/i,
      /報酬率\s*\d+\s*%/i,
      /[必穩]賺\s*(不賠|保證)/i,
      /(股票|外匯|加密貨幣|虛擬貨幣|比特幣|以太幣|BTC|ETH|USDT).*(?:操作|投資|帶單)/i,
      /帶單.*(?:獲利|老師|達人)/i,
      /投資.*(?:月入|日入|週入)\s*\d+/i,
      /資金盤/i,
      /(成功)?出金\s*(截圖|紀錄|成功)/i,
      /已出金\s*\d+/i,
      /本金翻倍/i,
      /放大獲利/i,
    ]
  },

  // Part-time job / task scams
  partTime: {
    weight: 3,
    label: '假兼職',
    patterns: [
      /兼職.*(?:輕鬆|在家|不用出門)/i,
      /在家.*(?:賺錢|接單|做任務)/i,
      /不用(?:出門|上班).*(?:收入|賺|日薪)/i,
      /日薪\s*[０-９0-9,，]+/i,
      /(?:接單|做任務|刷單|點讚).*(?:賺|收入|日薪)/i,
      /副業.*月入\s*[０-９0-9]+/i,
      /手機.*(?:在家|輕鬆).*賺錢/i,
      /零門檻.*兼職/i,
      /滑手機.*賺/i,
    ]
  },

  // Urgency / scarcity pressure tactics
  urgency: {
    weight: 2,
    label: '製造緊迫感',
    patterns: [
      /名額(只剩|有限|即將額滿)/i,
      /限時\s*(優惠|免費|名額)/i,
      /機會難得.*把握/i,
      /最後\s*[０-９0-9]+\s*名額/i,
      /今天截止/i,
      /錯過.*後悔/i,
    ]
  },

  // Fake testimonials / proof
  testimonials: {
    weight: 2,
    label: '假見證',
    patterns: [
      /成功出金.*(?:截圖|分享)/i,
      /已入帳\s*[０-９0-9,，]+/i,
      /獲利截圖/i,
      /真實獲利.*截圖/i,
      /感謝.*老師.*獲利/i,
      /跟著老師.*賺到/i,
    ]
  },

  // Romantic / social engineering scams
  romance: {
    weight: 2,
    label: '交友詐騙',
    patterns: [
      /認識新朋友.*投資/i,
      /交朋友.*(?:賺錢|獲利)/i,
      /聊天.*(?:賺錢|兼職)/i,
      /單身.*(?:賺錢|兼職|投資)/i,
    ]
  }
};

// Minimum score to trigger blocking
const FRAUD_THRESHOLD = 4;

// Minimum score to show a warning
const WARN_THRESHOLD = 3;

function calculateFraudScore(text) {
  let score = 0;
  const triggeredCategories = [];

  for (const [key, config] of Object.entries(FRAUD_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        score += config.weight;
        triggeredCategories.push(config.label);
        break; // Each category counted once
      }
    }
  }

  return { score, categories: triggeredCategories };
}
