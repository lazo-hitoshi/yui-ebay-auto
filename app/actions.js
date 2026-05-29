"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "../lib/supabaseAdmin.js";
import { getServerProfitDefaults } from "../lib/profitConfig.js";
import { runStockCheck } from "../src/monitors/stockEngine.js";
import { calculateProfit } from "../src/utils/profitCalculator.js";
import { checkedLabels } from "../src/utils/researchRisk.js";
import { resolveYahooSellerInfo } from "../src/monitors/yahooSellerChecker.js";
import { sendResearchReviewAlert } from "../src/services/lineNotify.js";

function parseOptionalNumber(formData, name) {
  const raw = formData.get(name)?.toString().trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function createProduct(formData) {
  try {
    const ebay_item_id = formData.get("ebay_item_id")?.toString().trim();
    const title = formData.get("title")?.toString().trim();
    const supplier = formData.get("supplier")?.toString().trim();
    const supplier_url = formData.get("supplier_url")?.toString().trim();
    const supplier_product_id =
      formData.get("supplier_product_id")?.toString().trim() || null;

    if (!ebay_item_id || !title || !supplier || !supplier_url) {
      return { ok: false, error: "必須項目を入力してください" };
    }

    const defaults = getServerProfitDefaults();
    const supplier_price = parseOptionalNumber(formData, "supplier_price");
    const domestic_shipping =
      parseOptionalNumber(formData, "domestic_shipping") ?? 0;
    const international_shipping =
      parseOptionalNumber(formData, "international_shipping") ?? 0;
    const packaging_cost = parseOptionalNumber(formData, "packaging_cost") ?? 0;
    const ebay_price_usd = parseOptionalNumber(formData, "ebay_price_usd");
    const fx_rate = parseOptionalNumber(formData, "fx_rate") ?? defaults.fxRate;

    const profit =
      supplier_price != null && ebay_price_usd != null
        ? calculateProfit({
            ebayPriceUsd: ebay_price_usd,
            supplierPriceJpy: supplier_price,
            domesticShippingJpy: domestic_shipping,
            internationalShippingJpy: international_shipping,
            packagingJpy: packaging_cost,
            fxRate: fx_rate,
            ...defaults,
          })
        : null;

    const research_notes =
      formData.get("research_notes")?.toString().trim() || null;
    const supplier_seller_url =
      formData.get("supplier_seller_url")?.toString().trim() || null;
    const seller_risk_score = parseOptionalNumber(formData, "seller_risk_score");
    const seller_rating_count = parseOptionalNumber(
      formData,
      "seller_rating_count"
    );

    let research_checklist = null;
    const checklistRaw = formData.get("research_checklist")?.toString();
    if (checklistRaw) {
      try {
        research_checklist = JSON.parse(checklistRaw);
      } catch {
        /* ignore */
      }
    }

    const row = {
      ebay_item_id,
      title,
      supplier,
      supplier_url,
      supplier_product_id,
      is_in_stock: true,
      ebay_active: true,
      research_notes,
      supplier_seller_url,
      seller_risk_score,
      seller_rating_count,
      research_checklist,
    };

    if (supplier_price != null) {
      Object.assign(row, {
        supplier_price,
        domestic_shipping,
        international_shipping,
        packaging_cost,
        ebay_price_usd,
        fx_rate,
        expected_profit_jpy: profit?.expectedProfitJpy ?? null,
        profit_rate_percent: profit?.profitRatePercent ?? null,
      });
    }

    const supabase = createAdminClient();
    const { data: inserted, error } = await supabase
      .from("products")
      .insert(row)
      .select()
      .single();

    if (error) {
      const hint =
        error.message?.includes("column") || error.code === "PGRST204"
          ? " Supabase で supabase/migrations/ の SQL（001・002）を実行してください。"
          : "";
      return { ok: false, error: error.message + hint };
    }

    if (seller_risk_score != null && seller_risk_score >= 60 && inserted) {
      const reasons = Array.isArray(research_checklist)
        ? checkedLabels(research_checklist)
        : [];
      await sendResearchReviewAlert(inserted, {
        score: seller_risk_score,
        reasons,
      });
    }

    revalidatePath("/");
    return {
      ok: true,
      profit,
      researchAlert: seller_risk_score != null && seller_risk_score >= 60,
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err.message ||
        "サーバー接続エラー。npm run dev を止めて再起動し、.env.local の Supabase キーを確認してください。",
    };
  }
}

export async function deleteProduct(productId) {
  if (!productId) {
    return { ok: false, error: "商品IDがありません" };
  }

  const supabase = createAdminClient();

  // stock_logs が残っていると products の削除で FK エラーになる
  const { error: logsError } = await supabase
    .from("stock_logs")
    .delete()
    .eq("product_id", productId);

  if (logsError) {
    return { ok: false, error: logsError.message };
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function fetchYahooSellerAction(sellerUrl, auctionUrl) {
  try {
    return await resolveYahooSellerInfo(sellerUrl, auctionUrl);
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function runCheckAction() {
  try {
    const result = await runStockCheck();
    revalidatePath("/");
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
