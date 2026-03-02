# Line Study Bot (管理業務主任者)

LINEで毎朝1問を配信し、回答後に即時で正誤と進捗を返す学習ボットです。

## Stack

- Next.js App Router + TypeScript
- Vercel (API + Cron)
- Supabase (Postgres)
- LINE Messaging API

## 実装済みAPI

- `POST /api/webhook`
  - `x-line-signature` を `HMAC-SHA256 + Base64` で検証
  - `follow` を受けてユーザー登録
  - `postback (qid,c)` を受けて回答保存・進捗更新・即時返信
- `POST /api/push/daily`
  - JST日付で `daily_assignments(user_id,date)` を使った冪等配信
  - 固定順 (`block_number`, `order_index`) で問題決定
  - ブロック末尾で正答率70%以上なら次ブロック、未満なら同ブロック再周回

## 必須環境変数

```bash
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

任意:

```bash
# Cronエンドポイント保護（設定時のみ必須化）
CRON_SECRET=
# usersが空の場合の初期配信先
DEFAULT_LINE_USER_ID=
```

## DBセットアップ

Supabase SQL Editorで次を実行:

- `db/schema.sql`

テーブル:

- `users`
- `questions`
- `answers`
- `daily_assignments`

## Vercel Cron

`vercel.json` に以下設定済みです。

- `0 21 * * *` (UTC) = 毎日06:00 JST

## ローカル実行

```bash
npm install
npm run dev
```

## 動作確認

1. LINE DevelopersでWebhook URLを `https://<your-domain>/api/webhook` に設定
2. Webhook有効化
3. Supabaseに `questions` を投入
4. `POST /api/push/daily` を手動実行して配信確認
5. LINEで回答し、即時返信の進捗表示を確認
