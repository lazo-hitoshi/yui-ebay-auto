"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createProduct,
  deleteProduct,
  runCheckAction,
  fetchYahooSellerAction,
} from "../actions.js";
import ProfitPreview, { ProfitCell } from "./ProfitPreview.js";
import ResearchChecklist, { RiskScoreCell } from "./ResearchChecklist.js";
import AppNav from "./AppNav.js";

const SUPPLIER_LABELS = {
  amazon: "Amazon",
  zara: "ZARA",
  yahoo: "ヤフオク",
  mercari: "メルカリ",
};

const EVENT_LABELS = {
  stockout: "在庫切れ",
  restock: "在庫復活",
  price_change: "価格変動",
  error: "エラー",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const emptyProfitForm = (defaults) => ({
  supplierPriceJpy: "",
  domesticShippingJpy: "0",
  internationalShippingJpy: "0",
  packagingJpy: "0",
  ebayPriceUsd: "",
  fxRate: String(defaults?.fxRate ?? 155),
});

export default function Dashboard({
  initialProducts,
  initialLogs,
  profitDefaults = { fxRate: 155, safeFxBuffer: 5, ebayFeePercent: 13.25, safetyBufferJpy: 500, minProfitRatePercent: 10 },
}) {
  const [message, setMessage] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [pending, startTransition] = useTransition();
  const [profitForm, setProfitForm] = useState(() => emptyProfitForm(profitDefaults));
  const [riskChecked, setRiskChecked] = useState([]);
  const [sellerUrl, setSellerUrl] = useState("");
  const [sellerRatingCount, setSellerRatingCount] = useState("");
  const [supplierUrlForFetch, setSupplierUrlForFetch] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());
  const router = useRouter();

  const refreshDashboard = useCallback(() => {
    router.refresh();
    setLastRefreshedAt(new Date());
  }, [router]);

  // 他端末（タブレット等）でも変更が届くよう、60秒ごとに再取得
  useEffect(() => {
    const timer = setInterval(refreshDashboard, 60_000);
    return () => clearInterval(timer);
  }, [refreshDashboard]);

  function updateProfitField(name, value) {
    setProfitForm((prev) => ({ ...prev, [name]: value }));
  }

  const profitPreviewValues = {
    supplierPriceJpy: profitForm.supplierPriceJpy,
    domesticShippingJpy: profitForm.domesticShippingJpy,
    internationalShippingJpy: profitForm.internationalShippingJpy,
    packagingJpy: profitForm.packagingJpy,
    ebayPriceUsd: profitForm.ebayPriceUsd,
    fxRate: profitForm.fxRate,
  };

  function showSuccess(text) {
    setMessage({ type: "success", text });
  }

  function showError(text) {
    setMessage({ type: "error", text });
  }

  function handleCreateSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      setMessage(null);
      const res = await createProduct(formData);
      if (res.ok) {
        const extra =
          res.profit != null
            ? `（想定利益 ${res.profit.expectedProfitJpy.toLocaleString("ja-JP")}円 / ${res.profit.profitRatePercent}%）`
            : "";
        const alertNote = res.researchAlert
          ? " ※リスク要確認のLINEを送信しました"
          : "";
        showSuccess(`商品を登録しました${extra}${alertNote}`);
        form.reset();
        setProfitForm(emptyProfitForm(profitDefaults));
        setRiskChecked([]);
        setSellerUrl("");
        setSellerRatingCount("");
        setSupplierUrlForFetch("");
        refreshDashboard();
      } else {
        showError(res.error);
      }
    });
  }

  function handleDelete(id, title) {
    if (!confirm(`「${title}」を削除しますか？`)) return;
    startTransition(async () => {
      const res = await deleteProduct(id);
      if (res.ok) {
        showSuccess("商品を削除しました");
        refreshDashboard();
      } else showError(res.error);
    });
  }

  function handleFetchSeller() {
    const auctionUrl =
      document.getElementById("supplier_url")?.value ||
      supplierUrlForFetch ||
      "";
    startTransition(async () => {
      setMessage(null);
      const res = await fetchYahooSellerAction(sellerUrl, auctionUrl);
      if (res.ok) {
        if (res.sellerUrl) setSellerUrl(res.sellerUrl);
        if (res.ratingCount != null) {
          setSellerRatingCount(String(res.ratingCount));
          if (res.suggestsLowRatingCount) {
            setRiskChecked((prev) =>
              prev.includes("rating_under_10")
                ? prev
                : [...prev, "rating_under_10"]
            );
          }
        }
        const note = res.note ? ` ${res.note}` : "";
        showSuccess(
          `出品者情報を取得しました（評価 ${res.ratingCount ?? "—"} 件）${note}`
        );
      } else {
        showError(res.error);
      }
    });
  }

  function handleCheck() {
    startTransition(async () => {
      setMessage(null);
      setCheckResult(null);
      const res = await runCheckAction();
      if (res.ok) {
        setCheckResult(res.result);
        showSuccess("在庫チェックが完了しました");
        refreshDashboard();
      } else {
        showError(res.error || "在庫チェックに失敗しました");
      }
    });
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🛒 Yui eBay Auto 管理画面</h1>
        <p>商品リサーチ・登録・在庫確認・利益率表示</p>
        <AppNav active="products" />
      </header>

      {message && (
        <div
          className={`alert ${
            message.type === "success" ? "alert-success" : "alert-error"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <h2>登録商品一覧（{initialProducts.length}件）</h2>
          <div className="toolbar">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCheck}
              disabled={pending}
            >
              {pending ? "実行中..." : "今すぐ在庫チェック"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={refreshDashboard}
              disabled={pending}
            >
              一覧を更新
            </button>
            <span className="refresh-hint">
              最終更新: {formatDate(lastRefreshedAt.toISOString())}
              （60秒ごとに自動更新）
            </span>
          </div>

          {checkResult && (
            <div className="alert alert-info">
              チェック: {checkResult.checked}件 / 在庫切れ: {checkResult.stockouts}
              件 / 復活: {checkResult.restocks}件 / スキップ: {checkResult.skipped}
              件 / エラー: {checkResult.errors}件
            </div>
          )}

          {initialProducts.length === 0 ? (
            <p className="empty">商品がありません。右のフォームから追加してください。</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>商品名</th>
                    <th>仕入先</th>
                    <th>利益</th>
                    <th>リスク</th>
                    <th>在庫</th>
                    <th>最終チェック</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {initialProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.title}</strong>
                        <br />
                        <span className="link-ext">eBay: {p.ebay_item_id}</span>
                      </td>
                      <td>{SUPPLIER_LABELS[p.supplier] || p.supplier}</td>
                      <td>
                        <ProfitCell profit={p.profit} />
                      </td>
                      <td>
                        <RiskScoreCell score={p.seller_risk_score} />
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            p.is_in_stock ? "badge-ok" : "badge-ng"
                          }`}
                        >
                          {p.is_in_stock ? "あり" : "切れ"}
                        </span>
                        {!p.ebay_active && (
                          <>
                            <br />
                            <span className="badge badge-muted">eBay停止</span>
                          </>
                        )}
                      </td>
                      <td>{formatDate(p.last_checked_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(p.id, p.title)}
                          disabled={pending}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside>
          <section className="card" style={{ marginBottom: 20 }}>
            <h2>商品を追加</h2>
            <form id="product-form" onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label htmlFor="title">商品名 *</label>
                <input id="title" name="title" required placeholder="例: テスト商品 ZARA" />
              </div>
              <div className="form-group">
                <label htmlFor="ebay_item_id">eBay 出品 ID *</label>
                <input
                  id="ebay_item_id"
                  name="ebay_item_id"
                  required
                  placeholder="例: 123456789012"
                />
              </div>
              <div className="form-group">
                <label htmlFor="supplier">仕入先 *</label>
                <select id="supplier" name="supplier" required defaultValue="zara">
                  <option value="zara">ZARA</option>
                  <option value="yahoo">ヤフオク</option>
                  <option value="amazon">Amazon</option>
                  <option value="mercari">メルカリ（未実装）</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="supplier_url">仕入先 URL *</label>
                <input
                  id="supplier_url"
                  name="supplier_url"
                  required
                  placeholder="https://..."
                  onChange={(e) => setSupplierUrlForFetch(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="supplier_product_id">仕入先商品 ID</label>
                <input
                  id="supplier_product_id"
                  name="supplier_product_id"
                  placeholder="Amazon の ASIN など"
                />
                <p className="form-hint">Amazon のときは ASIN を入力</p>
              </div>

              <fieldset className="profit-fieldset">
                <legend>商品リサーチ（任意）</legend>
                <div className="form-group">
                  <label htmlFor="supplier_seller_url">
                    ヤフオク URL（出品者 or 商品ページ）
                  </label>
                  <input
                    id="supplier_seller_url"
                    name="supplier_seller_url"
                    value={sellerUrl}
                    onChange={(e) => setSellerUrl(e.target.value)}
                    placeholder="空でも可。仕入先URLが商品ページならそれで取得"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: 8, width: "100%" }}
                    onClick={handleFetchSeller}
                    disabled={pending}
                  >
                    {pending ? "取得中..." : "出品者評価を取得（ヤフオク）"}
                  </button>
                  <p className="form-hint">
                    仕入先URLに
                    https://auctions.yahoo.co.jp/jp/auction/...
                    を入れたら、このボタンだけでOK（出品者URLは自動取得）
                  </p>
                </div>
                <div className="form-group">
                  <label htmlFor="seller_rating_count">評価件数（手動/取得）</label>
                  <input
                    id="seller_rating_count"
                    name="seller_rating_count"
                    type="number"
                    min="0"
                    value={sellerRatingCount}
                    onChange={(e) => setSellerRatingCount(e.target.value)}
                    placeholder="例: 312"
                  />
                </div>
                <ResearchChecklist
                  checked={riskChecked}
                  onCheckedChange={setRiskChecked}
                  sellerRatingCount={
                    sellerRatingCount ? Number(sellerRatingCount) : null
                  }
                />
                <div className="form-group">
                  <label htmlFor="research_notes">リサーチメモ</label>
                  <textarea
                    id="research_notes"
                    name="research_notes"
                    rows={3}
                    placeholder="相場メモ、直近の悪評、写真の所見など"
                  />
                </div>
              </fieldset>

              <fieldset className="profit-fieldset">
                <legend>利益計算（簡易・任意）</legend>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="supplier_price">仕入れ価格（円）</label>
                    <input
                      id="supplier_price"
                      name="supplier_price"
                      type="number"
                      min="0"
                      step="1"
                      placeholder="8000"
                      value={profitForm.supplierPriceJpy}
                      onChange={(e) =>
                        updateProfitField("supplierPriceJpy", e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ebay_price_usd">eBay販売価格（USD）</label>
                    <input
                      id="ebay_price_usd"
                      name="ebay_price_usd"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="49.99"
                      value={profitForm.ebayPriceUsd}
                      onChange={(e) =>
                        updateProfitField("ebayPriceUsd", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="domestic_shipping">国内送料（円）</label>
                    <input
                      id="domestic_shipping"
                      name="domestic_shipping"
                      type="number"
                      min="0"
                      step="1"
                      value={profitForm.domesticShippingJpy}
                      onChange={(e) =>
                        updateProfitField("domesticShippingJpy", e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="international_shipping">国際送料（円）</label>
                    <input
                      id="international_shipping"
                      name="international_shipping"
                      type="number"
                      min="0"
                      step="1"
                      value={profitForm.internationalShippingJpy}
                      onChange={(e) =>
                        updateProfitField(
                          "internationalShippingJpy",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="packaging_cost">梱包費（円）</label>
                    <input
                      id="packaging_cost"
                      name="packaging_cost"
                      type="number"
                      min="0"
                      step="1"
                      value={profitForm.packagingJpy}
                      onChange={(e) =>
                        updateProfitField("packagingJpy", e.target.value)
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="fx_rate">為替（1 USD = 円）</label>
                    <input
                      id="fx_rate"
                      name="fx_rate"
                      type="number"
                      min="1"
                      step="0.1"
                      value={profitForm.fxRate}
                      onChange={(e) => updateProfitField("fxRate", e.target.value)}
                    />
                  </div>
                </div>
                <ProfitPreview
                  values={profitPreviewValues}
                  defaults={profitDefaults}
                />
              </fieldset>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={pending}
              >
                {pending ? "保存中..." : "商品を登録"}
              </button>
            </form>
          </section>

          <section className="card">
            <h2>最近のログ</h2>
            {initialLogs.length === 0 ? (
              <p className="empty">ログはまだありません</p>
            ) : (
              <ul className="log-list">
                {initialLogs.map((log) => (
                  <li key={log.id}>
                    <strong>
                      {EVENT_LABELS[log.event] || log.event}
                    </strong>
                    {" — "}
                    {log.products?.title || "（商品名不明）"}
                    <br />
                    <span style={{ color: "var(--muted)" }}>
                      {formatDate(log.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
