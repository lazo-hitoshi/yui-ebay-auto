// src/monitors/stockEngine.js
// メイン在庫チェックエンジン
// 全仕入先の在庫を順番にチェックし、
// 在庫切れがあればeBayを自動停止 + LINE通知

import { supabase } from "../utils/supabase.js";
import { checkAmazonStock } from "./amazonChecker.js";
import { checkZaraStock } from "./zaraChecker.js";
import { checkYahooStock } from "./yahooChecker.js";
import { stopEbayListing, restartEbayListing } from "../services/ebayApi.js";
import { sendStockoutAlert, sendRestockAlert, sendLineNotify } from "../services/lineNotify.js";

/**
 * 仕入先に応じたチェッカーを呼び出す
 */
async function checkSupplierStock(product) {
  switch (product.supplier) {
    case "amazon":
      return await checkAmazonStock(product.supplier_product_id);
    case "zara":
      return await checkZaraStock(product.supplier_url);
    case "yahoo":
      return await checkYahooStock(product.supplier_url);
    case "mercari":
      // TODO: Phase 3 で実装（半自動）
      return { inStock: null, price: null, error: "未実装" };
    default:
      return { inStock: null, price: null, error: "不明な仕入先" };
  }
}

/**
 * 全商品の在庫チェックを実行
 * @returns {object} チェック結果サマリー
 */
export async function runStockCheck() {
  console.log("🔍 在庫チェック開始...", new Date().toISOString());

  const summary = {
    total: 0,
    checked: 0,
    stockouts: 0,      // 新たに在庫切れ検知
    restocks: 0,        // 在庫復活検知
    errors: 0,
    skipped: 0,
  };

  // DBから全商品を取得
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("last_checked_at", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("❌ DB読み込みエラー:", error.message);
    if (error.details) console.error("   詳細:", error.details);
    console.error("   → 診断: npm run test-supabase");
    return { ...summary, errors: 1, dbError: error.message };
  }

  summary.total = products.length;

  // 各商品を順番にチェック（APIレート制限のため並列にしない）
  for (const product of products) {
    try {
      const result = await checkSupplierStock(product);

      // チェック不能（未実装 or エラー）の場合はスキップ
      if (result.inStock === null) {
        summary.skipped++;
        continue;
      }

      summary.checked++;

      // --- 在庫切れを検知 ---
      if (!result.inStock && product.is_in_stock) {
        console.log(`🚨 在庫切れ: ${product.title}`);

        // eBay出品を停止
        await stopEbayListing(product.ebay_item_id);

        // DBを更新
        await supabase
          .from("products")
          .update({
            is_in_stock: false,
            ebay_active: false,
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        // ログ記録
        await supabase.from("stock_logs").insert({
          product_id: product.id,
          event: "stockout",
          details: { supplier_price: result.price },
        });

        // LINE通知
        await sendStockoutAlert(product);
        summary.stockouts++;
      }

      // --- 在庫復活を検知 ---
      else if (result.inStock && !product.is_in_stock) {
        console.log(`✅ 在庫復活: ${product.title}`);

        // eBay出品を再開
        await restartEbayListing(product.ebay_item_id);

        // DBを更新
        await supabase
          .from("products")
          .update({
            is_in_stock: true,
            ebay_active: true,
            supplier_price: result.price || product.supplier_price,
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        // ログ記録
        await supabase.from("stock_logs").insert({
          product_id: product.id,
          event: "restock",
          details: { supplier_price: result.price },
        });

        // LINE通知
        await sendRestockAlert(product);
        summary.restocks++;
      }

      // --- 変化なし ---
      else {
        // 最終チェック日時だけ更新
        await supabase
          .from("products")
          .update({
            supplier_price: result.price || product.supplier_price,
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", product.id);
      }

      // APIレート制限を避けるため少し待つ
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`❌ エラー (${product.title}):`, err.message);
      summary.errors++;
    }
  }

  // チェック完了サマリーをログ出力
  console.log("📊 チェック完了:", summary);

  // 在庫切れがあった場合はサマリーもLINEに送信
  if (summary.stockouts > 0 || summary.restocks > 0) {
    await sendLineNotify(
      `\n📊 定期チェック完了\n` +
      `チェック: ${summary.checked}品\n` +
      `新規在庫切れ: ${summary.stockouts}品\n` +
      `在庫復活: ${summary.restocks}品\n` +
      `エラー: ${summary.errors}品`
    );
  }

  return summary;
}
