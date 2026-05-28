// 問い合わせの言語・分類・リスク（ルールベース・第1版）

export const INTENT_LABELS = {
  inventory: "在庫確認",
  shipping_schedule: "発送予定",
  tracking: "追跡番号",
  price_negotiation: "値下げ交渉",
  condition: "商品状態",
  combine_shipping: "同梱依頼",
  customs: "関税・税金",
  cancel: "キャンセル",
  return_refund: "返品・返金",
  damage: "破損報告",
  claim: "クレーム（説明違い等）",
  other: "その他",
};

const LANGUAGE_HINTS = [
  { lang: "es", pattern: /\b(hola|gracias|pedido|envío|cuándo|disponible)\b/i },
  { lang: "fr", pattern: /\b(bonjour|merci|commande|expédition|disponible)\b/i },
  { lang: "de", pattern: /\b(hallo|danke|bestellung|versand|wann|verfügbar)\b/i },
  { lang: "it", pattern: /\b(ciao|grazie|ordine|spedizione|disponibile)\b/i },
  { lang: "zh", pattern: /[\u4e00-\u9fff]/ },
  { lang: "ja", pattern: /[\u3040-\u30ff]/ },
];

const INTENT_RULES = [
  { id: "claim", risk: "high", patterns: [/not as described/i, /not as advertised/i, /fake/i, /counterfeit/i] },
  { id: "damage", risk: "high", patterns: [/damaged/i, /broken/i, /cracked/i, /破損/i, /壊れ/] },
  { id: "return_refund", risk: "high", patterns: [/refund/i, /return/i, /money back/i, /返金/i, /返品/i] },
  { id: "cancel", risk: "high", patterns: [/cancel/i, /キャンセル/i] },
  { id: "tracking", risk: "low", patterns: [/tracking/i, /track number/i, /where is my/i, /追跡/i, /届か/] },
  { id: "shipping_schedule", risk: "low", patterns: [/when will you ship/i, /when.*ship/i, /shipping time/i, /発送/i, /ship my/i, /enviarán/i, /envío/] },
  { id: "inventory", risk: "low", patterns: [/available/i, /in stock/i, /still have/i, /is this available/i, /在庫/i, /購入可能/i, /disponible/i] },
  { id: "customs", risk: "medium", patterns: [/customs/i, /duty/i, /import tax/i, /関税/i, /税金/i] },
  { id: "price_negotiation", risk: "medium", patterns: [/lower price/i, /discount/i, /best offer/i, /値下げ/i, /安く/] },
  { id: "condition", risk: "medium", patterns: [/condition/i, /scratch/i, /defect/i, /状態/i, /傷/] },
  { id: "combine_shipping", risk: "medium", patterns: [/combine shipping/i, /bundle/i, /同梱/i] },
];

const SUMMARY_JA = {
  inventory: "在庫・購入可否の確認です。",
  shipping_schedule: "発送予定・発送時期の確認です。",
  tracking: "追跡番号・配送状況の確認です。",
  price_negotiation: "値下げ・価格交渉の問い合わせです。",
  condition: "商品の状態・傷などの確認です。",
  combine_shipping: "同梱発送の依頼です。",
  customs: "関税・輸入税に関する質問です。",
  cancel: "注文キャンセルの依頼です。要・人間対応。",
  return_refund: "返品・返金の依頼です。要・人間対応。",
  damage: "破損・不良の報告です。要・人間対応。",
  claim: "商品が説明と違う等のクレームです。要・人間対応。",
  other: "内容を確認して返信してください。",
};

export function detectLanguage(text) {
  for (const { lang, pattern } of LANGUAGE_HINTS) {
    if (pattern.test(text)) return lang;
  }
  return "en";
}

export function classifyMessage(text) {
  const normalized = text.trim();
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((p) => p.test(normalized))) {
      return {
        intent: rule.id,
        riskLevel: rule.risk,
        summaryJa: SUMMARY_JA[rule.id],
      };
    }
  }
  return {
    intent: "other",
    riskLevel: "medium",
    summaryJa: SUMMARY_JA.other,
  };
}

export function getMessagePolicy(intent, riskLevel) {
  const humanReviewRequired = riskLevel === "high" || riskLevel === "medium";
  const autoReplyAllowed = riskLevel === "low" && ["inventory", "shipping_schedule", "tracking"].includes(intent);
  return { humanReviewRequired, autoReplyAllowed };
}
