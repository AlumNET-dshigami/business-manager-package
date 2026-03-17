import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun, dbBatch } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const invoices = await dbAll(
      `SELECT i.*, c.企業名 as client_name FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.id = ?`,
      [Number(id)]
    );
    if (invoices.length === 0) return NextResponse.json({ error: "請求書が見つかりません" }, { status: 404 });
    const items = await dbAll("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id", [Number(id)]);
    return NextResponse.json({ ...invoices[0], items });
  }

  const status = req.nextUrl.searchParams.get("ステータス");
  let query = `SELECT i.*, c.企業名 as client_name FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE 1=1`;
  const params: string[] = [];
  if (status) { query += " AND i.ステータス = ?"; params.push(status); }
  query += " ORDER BY i.created_at DESC";

  const invoices = await dbAll(query, params);
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const existing = await dbAll("SELECT COUNT(*) as c FROM invoices WHERE invoice_no LIKE ?", [`INV-${today}%`]);
  const count = Number(existing[0]?.c ?? 0) + 1;
  const invoiceNo = `INV-${today}-${String(count).padStart(3, "0")}`;

  const items: { 項目名: string; 数量: number; 単価: number }[] = body.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.数量 || 1) * (item.単価 || 0), 0);
  const taxRate = body.税率 ?? 0.1;
  const tax = Math.floor(subtotal * taxRate);
  const total = subtotal + tax;

  const result = await dbRun(
    `INSERT INTO invoices (invoice_no, deal_id, client_id, 件名, 発行日, 支払期限, ステータス, 小計, 税率, 税額, 合計, 備考)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoiceNo, body.deal_id || 0, body.client_id || 0, body.件名 || "", body.発行日 || new Date().toISOString().slice(0, 10), body.支払期限 || "", body.ステータス || "下書き", subtotal, taxRate, tax, total, body.備考 || ""]
  );

  const invoiceId = Number(result.lastInsertRowid);
  if (items.length > 0) {
    const stmts = items.map((item) => ({
      sql: "INSERT INTO invoice_items (invoice_id, 項目名, 数量, 単価, 金額) VALUES (?, ?, ?, ?, ?)",
      args: [invoiceId, item.項目名 || "", item.数量 || 1, item.単価 || 0, (item.数量 || 1) * (item.単価 || 0)],
    }));
    await dbBatch(stmts);
  }

  return NextResponse.json({ id: invoiceId, invoice_no: invoiceNo });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const items: { 項目名: string; 数量: number; 単価: number }[] = body.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.数量 || 1) * (item.単価 || 0), 0);
  const taxRate = body.税率 ?? 0.1;
  const tax = Math.floor(subtotal * taxRate);
  const total = subtotal + tax;

  await dbRun(
    `UPDATE invoices SET deal_id=?, client_id=?, 件名=?, 発行日=?, 支払期限=?, ステータス=?, 小計=?, 税率=?, 税額=?, 合計=?, 備考=? WHERE id=?`,
    [body.deal_id || 0, body.client_id || 0, body.件名 || "", body.発行日 || "", body.支払期限 || "", body.ステータス || "下書き", subtotal, taxRate, tax, total, body.備考 || "", body.id]
  );

  await dbRun("DELETE FROM invoice_items WHERE invoice_id=?", [body.id]);
  if (items.length > 0) {
    const stmts = items.map((item) => ({
      sql: "INSERT INTO invoice_items (invoice_id, 項目名, 数量, 単価, 金額) VALUES (?, ?, ?, ?, ?)",
      args: [body.id, item.項目名 || "", item.数量 || 1, item.単価 || 0, (item.数量 || 1) * (item.単価 || 0)],
    }));
    await dbBatch(stmts);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await req.json();
  await dbRun("DELETE FROM invoice_items WHERE invoice_id=?", [id]);
  await dbRun("DELETE FROM invoices WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}
