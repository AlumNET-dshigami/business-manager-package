import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const contractorId = req.nextUrl.searchParams.get("contractor_id");
  if (contractorId) {
    const rows = await dbAll("SELECT * FROM contractor_assignments WHERE contractor_id = ? ORDER BY 契約開始月 DESC", [Number(contractorId)]);
    return NextResponse.json(rows);
  }

  const rows = await dbAll(
    `SELECT a.*, c.氏名, c.ステータス as contractor_status
     FROM contractor_assignments a
     JOIN contractors c ON c.id = a.contractor_id
     ORDER BY a.contractor_id, a.契約開始月 DESC`
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const result = await dbRun(
    `INSERT INTO contractor_assignments (contractor_id, 案件名, 月額単価, 契約開始月, 契約終了月, PL表示名, PLカテゴリ, 備考)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [body.contractor_id, body.案件名 || "", body.月額単価 || 0, body.契約開始月 || "", body.契約終了月 || "", body.PL表示名 || "", body.PLカテゴリ || "販管費", body.備考 || ""]
  );
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  await dbRun(
    `UPDATE contractor_assignments SET 案件名=?, 月額単価=?, 契約開始月=?, 契約終了月=?, PL表示名=?, PLカテゴリ=?, 備考=? WHERE id=?`,
    [body.案件名 || "", body.月額単価 || 0, body.契約開始月 || "", body.契約終了月 || "", body.PL表示名 || "", body.PLカテゴリ || "販管費", body.備考 || "", body.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await req.json();
  await dbRun("DELETE FROM contractor_assignments WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}
