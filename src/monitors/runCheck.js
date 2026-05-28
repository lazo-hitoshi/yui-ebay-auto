// src/monitors/runCheck.js
// 在庫チェックの手動実行スクリプト
// 実行: npm run check-stock

import "dotenv/config";
import { runStockCheck } from "./stockEngine.js";

async function main() {
  console.log("=================================");
  console.log("  eBay 在庫チェック 手動実行");
  console.log("=================================\n");

  const result = await runStockCheck();

  console.log("\n=================================");
  console.log("  結果サマリー");
  console.log("=================================");
  console.log(`  全商品数:     ${result.total}`);
  console.log(`  チェック済:   ${result.checked}`);
  console.log(`  在庫切れ検知: ${result.stockouts}`);
  console.log(`  在庫復活:     ${result.restocks}`);
  console.log(`  スキップ:     ${result.skipped}`);
  console.log(`  エラー:       ${result.errors}`);
  console.log("=================================\n");
}

main().catch(console.error);
