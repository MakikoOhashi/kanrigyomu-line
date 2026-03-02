# LINE Study Bot (Render + Express + TypeScript)

Render上で動く、管理業務主任者向けのLINE日次1問ボットです。

## Endpoints

- `POST /webhook`
  - LINEのWebhook受信
  - `x-line-signature` を raw body で検証
  - `follow` でユーザー登録
  - `postback(qid,c)` で回答保存・進捗計算・即時返信
- `POST /push/daily`
  - 日次配信
  - `daily_assignments(user_id,date)` で冪等性担保
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

## Notes

- 署名検証は raw body 前提です。`express.json({ verify })` で保持しています。
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー専用で扱い、クライアントに露出しません。
- DBスキーマは `db/schema.sql` を利用してください。
