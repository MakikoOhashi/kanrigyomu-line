# LINE Study Bot (Render + Express + TypeScript)

Render上で動く、管理業務主任者向けのLINE日次1問ボットです。

## Current Status (2026-03-02)

- Renderデプロイ済み（`/health` 200確認済み）
- Supabase接続済み
- LINE Messaging API連携済み（Webhook Verify Success）
- `follow` イベントで `kanrigyomu_users` への登録確認済み
- `POST /push/daily` 実行で配信確認済み
- LINE回答（postback）で `kanrigyomu_answers` 記録・即時返信確認済み

## Endpoints

- `POST /webhook`
  - LINEのWebhook受信
  - `x-line-signature` を raw body で検証
  - `follow` でユーザー登録
  - `postback(qid,c)` で回答保存・進捗計算・即時返信
- `POST /push/daily`
  - 日次配信
  - `kanrigyomu_daily_assignments(user_id,date)` で冪等性担保
  - 固定順（`block_number`, `order_index`）で出題
- `GET /health`
  - ヘルスチェック

## Required Environment Variables

```bash
PORT=3000
TZ=Asia/Tokyo
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional:

```bash
CRON_SECRET=
DEFAULT_LINE_USER_ID=
```

## Supabase Tables

- `kanrigyomu_users`
- `kanrigyomu_questions`
- `kanrigyomu_answers`
- `kanrigyomu_daily_assignments`

## Local Run

```bash
npm ci
npm run dev
```

## Build / Start

```bash
npm run build
npm start
```

## Render Setup

Web Service:
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`

Cron:
- 毎日 06:00 JST で `POST https://<your-service>.onrender.com/push/daily`
- `CRON_SECRET` を設定した場合は `Authorization: Bearer <CRON_SECRET>` を付与

## Next Steps

- Render Cronの定時実行設定（06:00 JST）
- `kanrigyomu_questions` へ本番問題（120問）投入
- 必要に応じて `DEFAULT_LINE_USER_ID` を削除（本番は `follow` 登録ユーザー配信が基本）

## Notes

- 署名検証は raw body 前提です。`express.json({ verify })` で保持しています。
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用で扱い、クライアントに露出しません。
- DBスキーマは `db/schema.sql` を利用してください。
