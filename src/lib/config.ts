// ========================================
// ホワイトラベル設定
// この1ファイルを変更するだけで会社名・カラー・ユーザーを切り替え可能
// ========================================

export const APP_CONFIG = {
  // アプリケーション名（ナビゲーション・ログイン画面に表示）
  appName: "Business Manager",
  // アプリケーション説明
  description: "案件管理・PL管理・クライアント・請求書",

  // テーマカラー（Tailwind CSS クラス）
  primaryColor: "blue",     // blue, indigo, emerald, violet, etc.
  accentColor: "emerald",

  // デフォルトユーザー（初回起動時に自動作成）
  defaultUsers: ["管理者A", "管理者B"],
  defaultPassword: "demo1234",

  // PL設定
  pl: {
    fiscalYearStartMonth: 4,    // 決算開始月（4月 = 4）
    years: ["2025", "2026", "2027"],
  },

  // 請求書PDF設定
  invoice: {
    companyName: "株式会社サンプル",  // フッターに表示
    taxRate: 0.1,                     // デフォルト消費税率
  },

  // 案件ステータス定義
  dealStatuses: ["商談中", "検討中", "稼働中", "終了"],
  dealPriorities: ["高", "中", "低"],

  // 業務委託ステータス
  contractorStatuses: ["稼働中", "契約準備中", "契約終了", "休止中"],

  // 請求書ステータス
  invoiceStatuses: ["下書き", "発行済", "入金済", "取消"],
};
