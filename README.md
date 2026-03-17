# Business Manager パッケージ

中小企業向けの統合ビジネス管理システム。案件管理・PL管理・請求書発行・クライアント管理をワンストップで提供。

## 主要機能

| モジュール | 機能 |
|---|---|
| **案件管理** | カンバンボード＋テーブル表示、ステータス管理、MRR集計、PL自動連携 |
| **業務委託・経費管理** | 委託先DB、アサイン管理、月次コスト集計、PL自動反映 |
| **PL管理** | 月次損益計算書、粗利・営業利益自動計算、役員報酬按分、法人税プール |
| **請求書** | PDF生成（税抜/税込）、ステータス管理、確定案件からワンクリック作成 |
| **クライアント管理** | 企業・連絡先DB、人材ネットワーク管理 |

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 にアクセス。

### 初回起動

1. ログイン画面で「デモデータを投入」ボタンをクリック
2. デフォルトパスワード `demo1234` でログイン

## カスタマイズ

`src/lib/config.ts` を編集するだけで以下を変更可能：

- **appName** — アプリ名（ナビ・ログイン画面に表示）
- **defaultUsers** — デフォルトユーザー名
- **defaultPassword** — 初期パスワード
- **pl.taxRate** — 法人税プール率
- **pl.executiveCount** — 役員人数（報酬按分用）
- **invoice.companyName** — 請求書PDFフッターの会社名

## 技術スタック

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- SQLite（ローカル） / Turso（クラウド対応）
- jsPDF（請求書PDF生成）

## デプロイ

### ローカルDB（デフォルト）
そのまま `npm run build && npm start` で起動可能。データは `data/local.db` に保存。

### Turso（クラウドDB）
`.env.local` に以下を設定：
```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
JWT_SECRET=your-secret
```
