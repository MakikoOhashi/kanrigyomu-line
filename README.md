# Line Study Bot (管理業務主任者 120問ブロック型)

LINEで毎朝1問配信し、
1タップ回答 → 即正誤判定 → ブロック進捗・正答率表示まで行う学習ボット。

---

## 🎯 目的

- 1日1問（6:00配信）
- 固定順ブロック進行
- ブロック内進捗％表示
- ブロック正答率表示
- 全体進捗表示
- 連続日数カウント

---

## 🏗 アーキテクチャ

LINE Official Account  
↓ (Webhook)  
Vercel (Next.js API Routes)  
↓  
Supabase (DB)

+ Vercel Cron（毎朝6:00に /api/push/daily 実行）

---

## 📦 技術スタック

- Next.js (TypeScript)
- Vercel
- Supabase
- LINE Messaging API

---

## 🔐 必要な環境変数

VercelのEnvironment Variablesに設定すること。


LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

TZ=Asia/Tokyo


---

## 🗂 ディレクトリ構成（想定）


/app
/api
/webhook/route.ts
/push/daily/route.ts

/lib
/line.ts
/supabase.ts
/progress.ts
/questions.ts


---

## 🗃 DB設計（Supabase）

### 1. users

| column | type |
|--------|------|
| id | uuid (PK) |
| line_user_id | text |
| current_block | int |
| current_question_index | int |
| streak_count | int |
| last_answer_date | date |

---

### 2. questions

| column | type |
|--------|------|
| id | uuid |
| block_number | int |
| order_index | int |
| question_text | text |
| choice_1 | text |
| choice_2 | text |
| choice_3 | text |
| choice_4 | text |
| correct_choice | int |
| explanation | text |

---

### 3. answers

| column | type |
|--------|------|
| id | uuid |
| user_id | uuid |
| question_id | uuid |
| selected_choice | int |
| is_correct | boolean |
| answered_at | timestamp |

---

## 🔁 出題ロジック

- 固定順
- ブロック内 order_index 昇順
- ブロック終了 → 次ブロックへ
- ブロック正答率 70%未満なら同ブロック再周回

---

## ⏰ Cron設定（Vercel）

vercel.json:

```json
{
  "crons": [
    {
      "path": "/api/push/daily",
      "schedule": "0 21 * * *"
    }
  ]
}

※ UTC基準
6:00 JST = 21:00 UTC（前日）

📩 LINE設定手順

LINE公式アカウント作成

Messaging APIチャネル作成

Channel Access Token発行

Webhook URLに以下を設定


https://your-app.vercel.app/api/webhook


Webhook有効化

📊 返信フォーマット例
✅ 正解：③
理由：重要行為は同意必要→違反は取消可能

Block1：12/30（40%）
Block正答率：67%
総進捗：12/120（10%）
連続：3日
🚀 開発手順

Private repo 作成

Next.js (TypeScript) 初期化

Supabaseプロジェクト作成

VercelにImport

環境変数設定

Webhook動作確認

Cron確認

🧠 設計思想

長文を読ませない

10秒で終わる問題

圧をかけない進捗表示

「理解」より「慣れ」を優先

🔒 セキュリティ注意

.env は絶対にコミットしない

Service Role Keyはサーバ側のみ使用

Webhook署名検証を必ず実装する

🧭 今後の拡張

ブロック別苦手分析

自動復習問題挿入

LIFFダッシュボード

管理者画面


---