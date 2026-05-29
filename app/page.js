import { createAdminClient } from "../lib/supabaseAdmin.js";
import { getServerProfitDefaults } from "../lib/profitConfig.js";
import Dashboard from "./components/Dashboard.js";
import { calculateProfit } from "../src/utils/profitCalculator.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

async function loadDashboardData() {
  try {
    const supabase = createAdminClient();

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("updated_at", { ascending: false });

    if (productsError) throw productsError;

    const { data: logs, error: logsError } = await supabase
      .from("stock_logs")
      .select("id, event, created_at, product_id, products(title)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (logsError) throw logsError;

    const defaults = getServerProfitDefaults();
    const enriched = (products ?? []).map((p) => {
      let profit = null;
      if (p.supplier_price != null && p.ebay_price_usd != null) {
        profit = calculateProfit({
          ebayPriceUsd: Number(p.ebay_price_usd),
          supplierPriceJpy: Number(p.supplier_price),
          domesticShippingJpy: Number(p.domestic_shipping) || 0,
          internationalShippingJpy: Number(p.international_shipping) || 0,
          packagingJpy: Number(p.packaging_cost) || 0,
          fxRate: Number(p.fx_rate) || defaults.fxRate,
          ...defaults,
        });
      }
      return { ...p, profit };
    });

    return {
      products: enriched,
      logs: logs ?? [],
      error: null,
      profitDefaults: defaults,
    };
  } catch (err) {
    return {
      products: [],
      logs: [],
      error: err.message || "データベースに接続できません",
    };
  }
}

export default async function Home() {
  const { products, logs, error, profitDefaults } = await loadDashboardData();

  if (error) {
    return (
      <div className="container">
        <header className="header">
          <h1>🛒 Yui eBay Auto 管理画面</h1>
        </header>
        <div className="alert alert-error">
          <strong>接続エラー:</strong> {error}
          <br />
          <span style={{ fontSize: "0.9rem" }}>
            .env の SUPABASE_URL と SUPABASE_SERVICE_KEY を確認してください。
            <br />
            「fetch failed」と出る場合は、ターミナルを止めてからもう一度{" "}
            <code>npm run dev</code> を実行してください（SSL 対策済み）。
            <br />
            ポートはターミナルに表示された URL（例: http://localhost:3001）を開いてください。
          </span>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      initialProducts={products}
      initialLogs={logs}
      profitDefaults={profitDefaults}
    />
  );
}
