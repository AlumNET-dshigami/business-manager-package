import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const filter = req.nextUrl.searchParams.get("担当者");
  const status = req.nextUrl.searchParams.get("進捗状況");

  let query = "SELECT * FROM deals WHERE 1=1";
  const params: string[] = [];

  if (filter) { query += " AND 担当者 = ?"; params.push(filter); }
  if (status) { query += " AND 進捗状況 = ?"; params.push(status); }

  query += " ORDER BY CASE 優先度 WHEN '高' THEN 1 WHEN '中' THEN 2 WHEN '低' THEN 3 END, updated_at DESC";

  const deals = await dbAll(query, params);
  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const status = body.進捗状況 || "";
  const confirmed = (status === "受注" || status === "終了") ? 1 : (body.確定 ? 1 : 0);
  const result = await dbRun(
    `INSERT INTO deals (担当者, 企業名, 属性, 進捗状況, 次アクション, 優先度, 提出資料, 見積もり, 発注書, 契約書, 備考, 月額売上, 月額原価, 契約開始月, 契約終了月, 確定)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.担当者 || session.name, body.企業名, body.属性 || "",
      status, body.次アクション || "", body.優先度 || "中",
      body.提出資料 ? 1 : 0, body.見積もり ? 1 : 0, body.発注書 ? 1 : 0, body.契約書 ? 1 : 0,
      body.備考 || "",
      body.月額売上 || 0, body.月額原価 || 0, body.契約開始月 || "", body.契約終了月 || "",
      confirmed,
    ]
  );
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const statusU = body.進捗状況 || "";
  const confirmedU = (statusU === "受注" || statusU === "終了") ? 1 : (body.確定 ? 1 : 0);
  await dbRun(
    `UPDATE deals SET 担当者=?, 企業名=?, 属性=?, 進捗状況=?, 次アクション=?, 優先度=?,
     提出資料=?, 見積もり=?, 発注書=?, 契約書=?, 備考=?, 月額売上=?, 月額原価=?,
     契約開始月=?, 契約終了月=?, 確定=?, updated_at=datetime('now')
     WHERE id=?`,
    [
      body.担当者, body.企業名, body.属性, statusU, body.次アクション, body.優先度,
      body.提出資料 ? 1 : 0, body.見積もり ? 1 : 0, body.発注書 ? 1 : 0, body.契約書 ? 1 : 0,
      body.備考 || "",
      body.月額売上 || 0, body.月額原価 || 0, body.契約開始月 || "", body.契約終了月 || "",
      confirmedU, body.id,
    ]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await req.json();
  await dbRun("DELETE FROM deals WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}
