"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "../../lib/supabaseAdmin.js";
import { buildMessageDraft } from "../../src/utils/messageDraft.js";
import { INTENT_LABELS } from "../../src/utils/messageClassifier.js";
import { sendInquiryReviewAlert } from "../../src/services/lineNotify.js";

export async function loadMessages() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ebay_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return { ok: true, messages: data ?? [] };
  } catch (err) {
    return { ok: false, error: err.message, messages: [] };
  }
}

export async function analyzeMessagePreview(formData) {
  const messageOriginal = formData.get("message_original")?.toString() || "";
  const draft = buildMessageDraft({
    messageOriginal,
    language: formData.get("language")?.toString(),
    handlingDays: Number(formData.get("handling_days")) || 3,
  });
  if (!draft.ok) return draft;
  return {
    ok: true,
    preview: draft,
    intentLabel: INTENT_LABELS[draft.intentCategory] || draft.intentCategory,
  };
}

export async function saveInquiryMessage(formData) {
  try {
    const messageOriginal = formData.get("message_original")?.toString().trim();
    if (!messageOriginal) {
      return { ok: false, error: "購入者メッセージを入力してください" };
    }

    const draft = buildMessageDraft({
      messageOriginal,
      language: formData.get("language")?.toString(),
      handlingDays: Number(formData.get("handling_days")) || 3,
    });
    if (!draft.ok) return draft;

    const humanEdited = formData.get("human_edited_reply")?.toString().trim();
    const draftReplyOriginal =
      humanEdited || formData.get("draft_reply_original")?.toString().trim() || draft.draftReplyOriginal;

    const row = {
      buyer_country: formData.get("buyer_country")?.toString().trim() || null,
      language: draft.language,
      order_id: formData.get("order_id")?.toString().trim() || null,
      ebay_item_id: formData.get("ebay_item_id")?.toString().trim() || null,
      product_title: formData.get("product_title")?.toString().trim() || null,
      message_original: messageOriginal,
      message_japanese_summary: draft.messageJapaneseSummary,
      intent_category: draft.intentCategory,
      risk_level: draft.riskLevel,
      draft_reply_original: draftReplyOriginal,
      draft_reply_japanese:
        formData.get("draft_reply_japanese")?.toString().trim() ||
        draft.draftReplyJapanese,
      auto_reply_allowed: draft.autoReplyAllowed,
      human_review_required: draft.humanReviewRequired,
      status: "pending",
      human_edited_reply: humanEdited || null,
      edit_notes: formData.get("edit_notes")?.toString().trim() || null,
    };

    const supabase = createAdminClient();
    const { data: inserted, error } = await supabase
      .from("ebay_messages")
      .insert(row)
      .select()
      .single();

    if (error) {
      const hint =
        error.message?.includes("column") ||
        error.message?.includes("ebay_messages") ||
        error.code === "PGRST204"
          ? " Supabase で supabase/migrations/003_messages.sql を実行してください。"
          : "";
      return { ok: false, error: error.message + hint };
    }

    const lineSent = draft.riskLevel === "high";
    if (lineSent) {
      await sendInquiryReviewAlert(inserted);
    }

    revalidatePath("/messages");
    return {
      ok: true,
      message: inserted,
      lineSent,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function updateMessageStatus(messageId, status, humanEditedReply) {
  try {
    const supabase = createAdminClient();
    const patch = { status };
    if (humanEditedReply?.trim()) {
      patch.human_edited_reply = humanEditedReply.trim();
    }
    if (status === "replied" || status === "approved") {
      patch.replied_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("ebay_messages")
      .update(patch)
      .eq("id", messageId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/messages");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
