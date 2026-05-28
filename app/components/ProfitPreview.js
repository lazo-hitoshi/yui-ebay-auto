"use client";

import { useMemo } from "react";
import { calculateProfit } from "../../src/utils/profitCalculator.js";

export default function ProfitPreview({ values, defaults }) {
  const result = useMemo(
    () =>
      calculateProfit({
        ebayPriceUsd: values.ebayPriceUsd,
        supplierPriceJpy: values.supplierPriceJpy,
        domesticShippingJpy: values.domesticShippingJpy,
        internationalShippingJpy: values.internationalShippingJpy,
        packagingJpy: values.packagingJpy,
        fxRate: values.fxRate,
        ...defaults,
      }),
    [values, defaults]
  );

  if (!result) {
    return (
      <div className="profit-preview profit-preview-empty">
        仕入れ価格と eBay販売価格（USD）を入力すると、利益の目安が表示されます。
      </div>
    );
  }

  const statusLabel =
    result.status === "ok"
      ? "OK"
      : result.status === "warn"
        ? "注意"
        : "赤字";

  return (
    <div className={`profit-preview profit-${result.status}`}>
      <div className="profit-preview-title">
        利益プレビュー <span className={`badge badge-profit-${result.status}`}>{statusLabel}</span>
      </div>
      <dl className="profit-dl">
        <div>
          <dt>想定利益</dt>
          <dd>
            <strong>{result.expectedProfitJpy.toLocaleString("ja-JP")} 円</strong>
          </dd>
        </div>
        <div>
          <dt>利益率</dt>
          <dd>{result.profitRatePercent}%</dd>
        </div>
        <div>
          <dt>販売額（安全為替）</dt>
          <dd>{result.saleJpy.toLocaleString("ja-JP")} 円</dd>
        </div>
        <div>
          <dt>eBay手数料目安</dt>
          <dd>{result.ebayFeeJpy.toLocaleString("ja-JP")} 円</dd>
        </div>
        <div>
          <dt>損益分岐（USD）</dt>
          <dd>${result.breakevenUsd}</dd>
        </div>
        <div>
          <dt>最低推奨（USD）</dt>
          <dd>${result.minRecommendedUsd}</dd>
        </div>
      </dl>
      <p className="form-hint">
        安全為替 = 入力為替 − {defaults.safeFxBuffer}円 / 手数料{" "}
        {defaults.ebayFeePercent}% / 安全バッファ{" "}
        {defaults.safetyBufferJpy.toLocaleString("ja-JP")}円込み
      </p>
    </div>
  );
}

export function ProfitCell({ profit }) {
  if (!profit) {
    return <span className="muted-text">未入力</span>;
  }
  const statusLabel =
    profit.status === "ok" ? "OK" : profit.status === "warn" ? "注意" : "赤字";
  return (
    <>
      <span className={`badge badge-profit-${profit.status}`}>{statusLabel}</span>
      <br />
      <span className="profit-cell-amount">
        {profit.expectedProfitJpy.toLocaleString("ja-JP")}円
      </span>
      <br />
      <span className="muted-text">{profit.profitRatePercent}%</span>
    </>
  );
}
