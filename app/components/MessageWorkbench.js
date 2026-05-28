"use client";

import { useState, useTransition } from "react";
import {
  analyzeMessagePreview,
  saveInquiryMessage,
  updateMessageStatus,
} from "../actions/messages.js";

const INTENT_LABELS = {
  inventory: "在庫確認",
  shipping_schedule: "発送予定",
  tracking: "追跡番号",
  price_negotiation: "値下げ交渉",
  condition: "商品状態",
  combine_shipping: "同梱依頼",
  customs: "関税・税金",
  cancel: "キャンセル",
  return_refund: "返品・返金",
  damage: "破損報告",
  claim: "クレーム",
  other: "その他",
};

const RISK_LABELS = { low: "低", medium: "中", high: "高" };

const STATUS_LABELS = {
  pending: "確認待ち",
  approved: "承認済",
  replied: "返信済",
  manual: "手動対応",
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

export default function MessageWorkbench({ initialMessages }) {
  const [messages, setMessages] = useState(initialMessages);
  const [preview, setPreview] = useState(null);
  const [editedReply, setEditedReply] = useState("");
  const [banner, setBanner] = useState(null);
  const [pending, startTransition] = useTransition();

  function showOk(text) {
    setBanner({ type: "success", text });
  }
  function showNg(text) {
    setBanner({ type: "error", text });
  }

  function handlePreview(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      setBanner(null);
      const res = await analyzeMessagePreview(formData);
      if (res.ok) {
        setPreview(res.preview);
        setEditedReply(res.preview.draftReplyOriginal);
        showOk(`下書きを生成しました（${res.intentLabel} / リスク${RISK_LABELS[res.preview.riskLevel]}）`);
      } else {
        showNg(res.error);
      }
    });
  }

  function handleSave(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    if (editedReply) formData.set("human_edited_reply", editedReply);
    if (preview) {
      formData.set("draft_reply_original", preview.draftReplyOriginal);
      formData.set("draft_reply_japanese", preview.draftReplyJapanese);
    }
    startTransition(async () => {
      const res = await saveInquiryMessage(formData);
      if (res.ok) {
        setMessages((prev) => [res.message, ...prev]);
        setPreview(null);
        setEditedReply("");
        form.reset();
        showOk(
          `保存しました${res.lineSent ? "（要確認のLINEを送信）" : ""}。eBayには手動で貼り付けて送信してください。`
        );
      } else {
        showNg(res.error);
      }
    });
  }

  function handleStatus(id, status) {
    startTransition(async () => {
      const res = await updateMessageStatus(id, status);
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status } : m))
        );
        showOk(`ステータスを「${STATUS_LABELS[status]}」に更新しました`);
      } else {
        showNg(res.error);
      }
    });
  }

  function loadIntoForm(msg) {
    setPreview({
      language: msg.language,
      intentCategory: msg.intent_category,
      riskLevel: msg.risk_level,
      messageJapaneseSummary: msg.message_japanese_summary,
      draftReplyOriginal: msg.draft_reply_original,
      draftReplyJapanese: msg.draft_reply_japanese,
      autoReplyAllowed: msg.auto_reply_allowed,
      humanReviewRequired: msg.human_review_required,
    });
    setEditedReply(msg.human_edited_reply || msg.draft_reply_original || "");
    document.getElementById("message_original")?.focus?.();
  }

  return (
    <>
      {banner && (
        <div
          className={`alert ${
            banner.type === "success" ? "alert-success" : "alert-error"
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <h2>問い合わせ一覧（{messages.length}件）</h2>
          <p className="form-hint" style={{ marginBottom: 12 }}>
            eBay API連携前の運用: 下書きをコピーし、eBayメッセージ画面で人が送信します。
          </p>
          {messages.length === 0 ? (
            <p className="empty">まだ問い合わせがありません</p>
          ) : (
            <ul className="log-list message-list">
              {messages.map((m) => (
                <li key={m.id}>
                  <div className="message-list-head">
                    <strong>{INTENT_LABELS[m.intent_category] || m.intent_category}</strong>
                    <span className={`badge badge-risk-${m.risk_level === "high" ? "reject" : m.risk_level === "medium" ? "review" : "safe"}`}>
                      リスク{RISK_LABELS[m.risk_level] || m.risk_level}
                    </span>
                    <span className="badge badge-muted">{STATUS_LABELS[m.status] || m.status}</span>
                  </div>
                  <div className="muted-text">{m.message_japanese_summary}</div>
                  <div className="muted-text">{formatDate(m.created_at)} · {m.language} · {m.buyer_country || "国不明"}</div>
                  <div className="toolbar" style={{ marginTop: 8 }}>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => loadIntoForm(m)}>
                      再表示
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary" disabled={pending} onClick={() => handleStatus(m.id, "approved")}>
                      承認
                    </button>
                    <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => handleStatus(m.id, "replied")}>
                      返信済
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside>
          <section className="card">
            <h2>メッセージを貼り付け</h2>
            <form id="inquiry-form" onSubmit={handleSave}>
              <div className="form-group">
                <label htmlFor="message_original">購入者メッセージ（原文）*</label>
                <textarea
                  id="message_original"
                  name="message_original"
                  rows={5}
                  required
                  placeholder="eBayのメッセージをコピー＆ペースト"
                />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="buyer_country">購入者の国</label>
                  <input id="buyer_country" name="buyer_country" placeholder="Germany, USA..." />
                </div>
                <div className="form-group">
                  <label htmlFor="language">言語（空=自動）</label>
                  <select id="language" name="language" defaultValue="">
                    <option value="">自動判定</option>
                    <option value="en">英語</option>
                    <option value="es">スペイン語</option>
                    <option value="de">ドイツ語</option>
                    <option value="fr">フラ語</option>
                    <option value="ja">日本語</option>
                  </select>
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="ebay_item_id">eBay出品ID</label>
                  <input id="ebay_item_id" name="ebay_item_id" placeholder="任意" />
                </div>
                <div className="form-group">
                  <label htmlFor="order_id">注文番号</label>
                  <input id="order_id" name="order_id" placeholder="任意" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="product_title">商品名</label>
                <input id="product_title" name="product_title" placeholder="任意" />
              </div>
              <div className="form-group">
                <label htmlFor="handling_days">発送目安（営業日）</label>
                <input id="handling_days" name="handling_days" type="number" min="1" max="30" defaultValue={3} />
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", marginBottom: 10 }}
                disabled={pending}
                onClick={(e) => {
                  const form = document.getElementById("inquiry-form");
                  handlePreview({ preventDefault: () => {}, currentTarget: form });
                }}
              >
                {pending ? "処理中..." : "下書きを生成（プレビュー）"}
              </button>

              {preview && (
                <div className={`research-checklist research-risk-${preview.riskLevel === "high" ? "reject" : preview.riskLevel === "medium" ? "review" : "safe"}`}>
                  <p><strong>日本語要約:</strong> {preview.messageJapaneseSummary}</p>
                  <p>
                    <strong>分類:</strong> {INTENT_LABELS[preview.intentCategory]} /{" "}
                    <strong>リスク:</strong> {RISK_LABELS[preview.riskLevel]}
                    {preview.autoReplyAllowed ? " · 自動返信候補" : ""}
                    {preview.humanReviewRequired ? " · 人間確認必須" : ""}
                  </p>
                  <div className="form-group">
                    <label htmlFor="draft_edit">返信文（編集してから保存・eBayへコピー）</label>
                    <textarea
                      id="draft_edit"
                      rows={8}
                      value={editedReply}
                      onChange={(e) => setEditedReply(e.target.value)}
                    />
                  </div>
                  <p className="form-hint"><strong>日本語訳:</strong><br />{preview.draftReplyJapanese}</p>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="edit_notes">修正メモ（学習用）</label>
                <input id="edit_notes" name="edit_notes" placeholder="例: 発送日を断定しないよう修正" />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={pending || !preview}>
                {pending ? "保存中..." : "承認待ちとして保存"}
              </button>
              {!preview && (
                <p className="form-hint">先に「下書きを生成」を押してください</p>
              )}
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
