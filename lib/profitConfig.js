import { getProfitDefaults } from "../src/utils/profitCalculator.js";

export function getServerProfitDefaults() {
  return getProfitDefaults({
    DEFAULT_USD_JPY_RATE: process.env.DEFAULT_USD_JPY_RATE,
    PROFIT_SAFE_FX_BUFFER: process.env.PROFIT_SAFE_FX_BUFFER,
    EBAY_FEE_PERCENT: process.env.EBAY_FEE_PERCENT,
    PROFIT_SAFETY_BUFFER_JPY: process.env.PROFIT_SAFETY_BUFFER_JPY,
    MIN_PROFIT_RATE_PERCENT: process.env.MIN_PROFIT_RATE_PERCENT,
  });
}
