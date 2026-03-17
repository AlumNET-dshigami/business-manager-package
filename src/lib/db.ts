import { createClient, type Client, type InStatement } from "@libsql/client";
import bcrypt from "bcryptjs";
import { APP_CONFIG } from "./config";

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;

function getClient(): Client {
  if (!_client) {
    const url = (process.env.TURSO_DATABASE_URL || "file:data/local.db").trim();
    const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim() || undefined;
    _client = createClient({ url, authToken });
    _initPromise = initDb(_client);
  }
  return _client;
}

export async function ensureDb() {
  getClient();
  if (_initPromise) {
    await _initPromise;
    _initPromise = null;
  }
}

async function initDb(client: Client) {
  try {
    await client.batch([
      "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS deals (id INTEGER PRIMARY KEY AUTOINCREMENT, 担当者 TEXT NOT NULL, 企業名 TEXT NOT NULL, 属性 TEXT DEFAULT '', 進捗状況 TEXT DEFAULT '', 次アクション TEXT DEFAULT '', 優先度 TEXT DEFAULT '中', 提出資料 INTEGER DEFAULT 0, 見積もり INTEGER DEFAULT 0, 発注書 INTEGER DEFAULT 0, 契約書 INTEGER DEFAULT 0, 備考 TEXT DEFAULT '', 月額売上 INTEGER DEFAULT 0, 月額原価 INTEGER DEFAULT 0, 契約開始月 TEXT DEFAULT '', 契約終了月 TEXT DEFAULT '', 確定 INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
      "CREATE TABLE IF NOT EXISTS deal_monthly (id INTEGER PRIMARY KEY AUTOINCREMENT, deal_id INTEGER NOT NULL, year_month TEXT NOT NULL, status TEXT DEFAULT '', FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE, UNIQUE(deal_id, year_month))",
      "CREATE TABLE IF NOT EXISTS pl_items (id INTEGER PRIMARY KEY AUTOINCREMENT, カテゴリ TEXT NOT NULL, サブカテゴリ TEXT DEFAULT '', 案件名 TEXT NOT NULL, year_month TEXT NOT NULL, 金額 INTEGER DEFAULT 0, 備考 TEXT DEFAULT '', UNIQUE(カテゴリ, 案件名, year_month))",
      "CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, 企業名 TEXT NOT NULL, 担当者名 TEXT DEFAULT '', メール TEXT DEFAULT '', 電話番号 TEXT DEFAULT '', 住所 TEXT DEFAULT '', 備考 TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))",
      "CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_no TEXT NOT NULL UNIQUE, deal_id INTEGER, client_id INTEGER, 件名 TEXT NOT NULL, 発行日 TEXT NOT NULL, 支払期限 TEXT NOT NULL, ステータス TEXT DEFAULT '下書き', 小計 INTEGER DEFAULT 0, 税率 REAL DEFAULT 0.1, 税額 INTEGER DEFAULT 0, 合計 INTEGER DEFAULT 0, 備考 TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (deal_id) REFERENCES deals(id), FOREIGN KEY (client_id) REFERENCES clients(id))",
      "CREATE TABLE IF NOT EXISTS invoice_items (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, 項目名 TEXT NOT NULL, 数量 INTEGER DEFAULT 1, 単価 INTEGER DEFAULT 0, 金額 INTEGER DEFAULT 0, FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE)",
      "CREATE TABLE IF NOT EXISTS alumni (id INTEGER PRIMARY KEY AUTOINCREMENT, 氏名 TEXT NOT NULL, 企業名 TEXT DEFAULT '', 役職 TEXT DEFAULT '', メール TEXT DEFAULT '', 電話番号 TEXT DEFAULT '', スキル TEXT DEFAULT '', ステータス TEXT DEFAULT 'アクティブ', facebook_url TEXT DEFAULT '', 備考 TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))",
      "CREATE TABLE IF NOT EXISTS contractors (id INTEGER PRIMARY KEY AUTOINCREMENT, 氏名 TEXT NOT NULL, 会社名_屋号 TEXT DEFAULT '', 担当業務 TEXT DEFAULT '', 契約開始日 TEXT DEFAULT '', 契約終了日 TEXT DEFAULT '', 月額単価 INTEGER DEFAULT 0, 稼働時間 TEXT DEFAULT '', メール TEXT DEFAULT '', 電話番号 TEXT DEFAULT '', ステータス TEXT DEFAULT '稼働中', 備考 TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))",
      "CREATE TABLE IF NOT EXISTS contractor_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, contractor_id INTEGER NOT NULL, 案件名 TEXT NOT NULL, 月額単価 INTEGER DEFAULT 0, 契約開始月 TEXT DEFAULT '', 契約終了月 TEXT DEFAULT '', PL表示名 TEXT DEFAULT '', PLカテゴリ TEXT DEFAULT '販管費', 備考 TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE)",
      "CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, 項目名 TEXT NOT NULL, 月額 INTEGER DEFAULT 0, 開始月 TEXT DEFAULT '', 終了月 TEXT DEFAULT '', PLカテゴリ TEXT DEFAULT '販管費', PL表示名 TEXT DEFAULT '', 備考 TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))",
    ]);

    // デフォルトユーザー作成
    const hash = bcrypt.hashSync(APP_CONFIG.defaultPassword, 10);
    const res = await client.execute("SELECT COUNT(*) as c FROM users");
    const count = Number(res.rows[0]?.c ?? 0);
    if (count === 0) {
      const stmts: InStatement[] = APP_CONFIG.defaultUsers.map((name) => ({
        sql: "INSERT INTO users (name, password_hash) VALUES (?, ?)",
        args: [name, hash],
      }));
      await client.batch(stmts);
    }
  } catch (e) {
    console.error("initDb error:", e);
  }
}

export async function dbAll(sql: string, args: (string | number)[] = []) {
  await ensureDb();
  const res = await getClient().execute({ sql, args });
  return res.rows;
}

export async function dbRun(sql: string, args: (string | number)[] = []) {
  await ensureDb();
  return await getClient().execute({ sql, args });
}

export async function dbBatch(stmts: InStatement[]) {
  await ensureDb();
  return await getClient().batch(stmts);
}
