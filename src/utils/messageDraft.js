import {
  classifyMessage,
  detectLanguage,
  getMessagePolicy,
} from "./messageClassifier.js";
import { buildTemplateReply } from "./messageTemplates.js";

/**
 * 貼り付けメッセージから下書き一式を生成
 */
export function buildMessageDraft(input) {
  const messageOriginal = input.messageOriginal?.trim() || "";
  if (!messageOriginal) {
    return { ok: false, error: "購入者メッセージを入力してください" };
  }

  const language = input.language?.trim() || detectLanguage(messageOriginal);
  const { intent, riskLevel, summaryJa } = classifyMessage(messageOriginal);
  const { humanReviewRequired, autoReplyAllowed } = getMessagePolicy(
    intent,
    riskLevel
  );

  const { draftOriginal, draftJapanese } = buildTemplateReply(
    intent,
    language,
    { handlingDays: input.handlingDays ?? 3 }
  );

  return {
    ok: true,
    language,
    intentCategory: intent,
    riskLevel,
    messageJapaneseSummary: summaryJa,
    draftReplyOriginal: draftOriginal,
    draftReplyJapanese: draftJapanese,
    autoReplyAllowed,
    humanReviewRequired,
  };
}
