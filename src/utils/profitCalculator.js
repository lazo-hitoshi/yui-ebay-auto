// 利益率の簡易計算（第2段階の入口）

const DEFAULT_EBAY_FEE_PERCENT = 13.25;
const DEFAULT_SAFE_FX_BUFFER = 5;
const DEFAULT_SAFETY_BUFFER_JPY = 500;
const DEFAULT_MIN_PROFIT_RATE_PERCENT = 10;

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {object} input
 * @returns {object|null} 計算結果。eBay価格または仕入れ価格が無い場合は null
 */
export function calculateProfit(input) {
  const ebayPriceUsd = toNum(input.ebayPriceUsd, NaN);
  const supplierPriceJpy = toNum(input.supplierPriceJpy, NaN);
  const domesticShippingJpy = toNum(input.domesticShippingJpy, 0);
  const internationalShippingJpy = toNum(input.internationalShippingJpy, 0);
  const packagingJpy = toNum(input.packagingJpy, 0);
  const fxRate = toNum(input.fxRate, NaN);
  const safeFxBuffer = toNum(input.safeFxBuffer, DEFAULT_SAFE_FX_BUFFER);
  const ebayFeePercent = toNum(input.ebayFeePercent, DEFAULT_EBAY_FEE_PERCENT);
  const safetyBufferJpy = toNum(input.safetyBufferJpy, DEFAULT_SAFETY_BUFFER_JPY);
  const minProfitRatePercent = toNum(
    input.minProfitRatePercent,
    DEFAULT_MIN_PROFIT_RATE_PERCENT
  );

  if (
    !Number.isFinite(ebayPriceUsd) ||
    ebayPriceUsd <= 0 ||
    !Number.isFinite(supplierPriceJpy) ||
    supplierPriceJpy < 0 ||
    !Number.isFinite(fxRate) ||
    fxRate <= 0
  ) {
    return null;
  }

  const safeFxRate = fxRate - safeFxBuffer;
  const saleJpy = ebayPriceUsd * safeFxRate;
  const ebayFeeJpy = saleJpy * (ebayFeePercent / 100);
  const totalCost =
    supplierPriceJpy +
    domesticShippingJpy +
    internationalShippingJpy +
    packagingJpy +
    ebayFeeJpy +
    safetyBufferJpy;
  const expectedProfitJpy = Math.round(saleJpy - totalCost);
  const profitRatePercent =
    saleJpy > 0
      ? Math.round((expectedProfitJpy / saleJpy) * 1000) / 10
      : 0;

  const fixedCostJpy =
    supplierPriceJpy +
    domesticShippingJpy +
    internationalShippingJpy +
    packagingJpy +
    safetyBufferJpy;
  const breakevenSaleJpy = fixedCostJpy / (1 - ebayFeePercent / 100);
  const breakevenUsd =
    Math.round((breakevenSaleJpy / safeFxRate) * 100) / 100;
  const minRecommendedUsd =
    Math.round(
      (breakevenSaleJpy / (1 - minProfitRatePercent / 100) / safeFxRate) * 100
    ) / 100;

  let status = "ok";
  if (expectedProfitJpy < 0) status = "danger";
  else if (profitRatePercent < minProfitRatePercent) status = "warn";

  return {
    safeFxRate,
    saleJpy: Math.round(saleJpy),
    ebayFeeJpy: Math.round(ebayFeeJpy),
    expectedProfitJpy,
    profitRatePercent,
    breakevenUsd,
    minRecommendedUsd,
    status,
  };
}

export function getProfitDefaults(env = {}) {
  return {
    fxRate: toNum(env.DEFAULT_USD_JPY_RATE, 155),
    safeFxBuffer: toNum(env.PROFIT_SAFE_FX_BUFFER, DEFAULT_SAFE_FX_BUFFER),
    ebayFeePercent: toNum(env.EBAY_FEE_PERCENT, DEFAULT_EBAY_FEE_PERCENT),
    safetyBufferJpy: toNum(env.PROFIT_SAFETY_BUFFER_JPY, DEFAULT_SAFETY_BUFFER_JPY),
    minProfitRatePercent: toNum(
      env.MIN_PROFIT_RATE_PERCENT,
      DEFAULT_MIN_PROFIT_RATE_PERCENT
    ),
  };
}

export function formatProfitSummary(result) {
  if (!result) return "—";
  const sign = result.expectedProfitJpy >= 0 ? "" : "";
  return `${sign}${result.expectedProfitJpy.toLocaleString("ja-JP")}円 (${result.profitRatePercent}%)`;
}
