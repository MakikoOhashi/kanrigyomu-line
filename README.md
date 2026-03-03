# kanrigyomu-line (Archive)

本リポジトリは移行元（Render + Express）のアーカイブです。

## 移行ステータス

- 本番運用先: `common-ai-api`（Cloudflare Workers）
- 本番Webhook: `https://common-ai-api.makiron19831014.workers.dev/webhook`
- 本番日次配信: `https://common-ai-api.makiron19831014.workers.dev/push/daily`

## このリポジトリの扱い

- 履歴参照用として保持
- 原則として新機能追加は行わない
- 本番設定の変更先は `common-ai-api` 側

## 参照用途

- 旧Express実装の構成確認
- Supabaseスキーマ確認（`db/schema.sql`）
- 過去の運用ログや設計意図の参照

## 旧構成（参考）

- Runtime: Node.js + Express
- Deploy: Render
- API: `POST /webhook`, `POST /push/daily`, `GET /health`

## 注意

このリポジトリ単体では現行本番に反映されません。
本番反映は `common-ai-api` 側で実施してください。
