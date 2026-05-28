import AppNav from "../components/AppNav.js";
import MessageWorkbench from "../components/MessageWorkbench.js";
import { loadMessages } from "../actions/messages.js";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const result = await loadMessages();
  const messages = result.messages ?? [];
  const error = result.ok ? null : result.error;

  if (error && messages.length === 0) {
    return (
      <div className="container">
        <header className="header">
          <h1>💬 問い合わせ対応</h1>
          <AppNav active="messages" />
        </header>
        <div className="alert alert-error">
          <strong>接続エラー:</strong> {error}
          <br />
          <span className="form-hint">
            Supabase で <code>supabase/migrations/003_messages.sql</code> を実行してください。
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>💬 問い合わせ対応</h1>
        <p>貼り付け → 日本語要約・返信下書き → 人が確認 → eBayで手動送信</p>
        <AppNav active="messages" />
      </header>
      <MessageWorkbench initialMessages={messages} />
    </div>
  );
}
