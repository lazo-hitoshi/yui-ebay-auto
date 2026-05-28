// 商品リサーチ PDF に基づく出品者リスク加点

export const RESEARCH_RISK_ITEMS = [
  { id: "bad_recent", label: "直近30〜90日で悪い評価あり", points: 40 },
  { id: "shipping_delay", label: "発送遅延のコメントあり", points: 30 },
  { id: "cancel", label: "キャンセル関連のコメントあり", points: 40 },
  { id: "fake_mismatch", label: "偽物・説明違いのコメントあり", points: 50 },
  { id: "rating_under_10", label: "評価数が10件未満", points: 30 },
  { id: "low_price_ratings", label: "低額商品の評価ばかり", points: 25 },
  { id: "same_rater", label: "同一評価者が多い", points: 25 },
  { id: "no_high_value", label: "高額商品の販売実績なし", points: 20 },
  { id: "account_new", label: "アカウント作成直後っぽい", points: 20 },
  { id: "price_too_cheap", label: "価格が相場より極端に安い", points: 30 },
];

export function sumRiskScore(checkedIds) {
  const set = new Set(checkedIds);
  return RESEARCH_RISK_ITEMS.filter((item) => set.has(item.id)).reduce(
    (sum, item) => sum + item.points,
    0
  );
}

export function getRiskVerdict(score) {
  if (score >= 90) {
    return {
      level: "reject",
      label: "仕入れ禁止",
      hint: "この仕入れ元は避けてください",
    };
  }
  if (score >= 60) {
    return {
      level: "review",
      label: "要確認",
      hint: "自動出品せず、人間が最終判断",
    };
  }
  if (score >= 30) {
    return {
      level: "caution",
      label: "注意",
      hint: "慎重に判断してください",
    };
  }
  return {
    level: "safe",
    label: "安全寄り",
    hint: "他のスコア（利益・在庫）も確認して出品",
  };
}

export function checkedLabels(checkedIds) {
  const set = new Set(checkedIds);
  return RESEARCH_RISK_ITEMS.filter((item) => set.has(item.id)).map(
    (item) => item.label
  );
}
