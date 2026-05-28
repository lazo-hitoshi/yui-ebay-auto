"use client";

import { useMemo } from "react";
import {
  RESEARCH_RISK_ITEMS,
  sumRiskScore,
  getRiskVerdict,
} from "../../src/utils/researchRisk.js";

export default function ResearchChecklist({
  checked,
  onCheckedChange,
  sellerRatingCount,
}) {
  const score = useMemo(() => sumRiskScore(checked), [checked]);
  const verdict = useMemo(() => getRiskVerdict(score), [score]);

  return (
    <div className={`research-checklist research-risk-${verdict.level}`}>
      <div className="research-checklist-header">
        <strong>出品者リスクチェック</strong>
        <span className={`badge badge-risk-${verdict.level}`}>
          {score}点 — {verdict.label}
        </span>
      </div>
      <p className="form-hint">{verdict.hint}</p>
      {sellerRatingCount != null && (
        <p className="form-hint">
          取得した評価件数: <strong>{sellerRatingCount}</strong> 件
          {sellerRatingCount < 10 && "（10件未満 → 該当にチェックを推奨）"}
        </p>
      )}
      <ul className="risk-check-list">
        {RESEARCH_RISK_ITEMS.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={checked.includes(item.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onCheckedChange([...checked, item.id]);
                  } else {
                    onCheckedChange(checked.filter((id) => id !== item.id));
                  }
                }}
              />
              {item.label}
              <span className="risk-points">+{item.points}</span>
            </label>
          </li>
        ))}
      </ul>
      <input type="hidden" name="seller_risk_score" value={score} />
      <input
        type="hidden"
        name="research_checklist"
        value={JSON.stringify(checked)}
      />
    </div>
  );
}

export function RiskScoreCell({ score }) {
  if (score == null || score === "") {
    return <span className="muted-text">—</span>;
  }
  const n = Number(score);
  const verdict = getRiskVerdict(n);
  return (
    <>
      <span className={`badge badge-risk-${verdict.level}`}>{verdict.label}</span>
      <br />
      <span className="muted-text">{n}点</span>
    </>
  );
}
