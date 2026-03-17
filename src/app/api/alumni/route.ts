import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search");
  let query = "SELECT * FROM alumni WHERE 1=1";
  const params: string[] = [];
  if (search) {
    query += " AND (氏名 LIKE ? OR 企業名 LIKE ? OR スキル LIKE ? OR メール LIKE ? OR 役職 LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }
  query += " ORDER BY created_at DESC";
  const alumni = await dbAll(query, params);
  return NextResponse.json(alumni);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const result = await dbRun(
    `INSERT INTO alumni (氏名, 企業名, 役職, メール, 電話番号, スキル, ステータス, facebook_url, 備考) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [body.氏名 || "", body.企業名 || "", body.役職 || "", body.メール || "", body.電話番号 || "", body.スキル || "", body.ステータス || "アクティブ", body.facebook_url || "", body.備考 || ""]
  );
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  await dbRun(
    `UPDATE alumni SET 氏名=?, 企業名=?, 役職=?, メール=?, 電話番号=?, スキル=?, ステータス=?, facebook_url=?, 備考=? WHERE id=?`,
    [body.氏名 || "", body.企業名 || "", body.役職 || "", body.メール || "", body.電話番号 || "", body.スキル || "", body.ステータス || "アクティブ", body.facebook_url || "", body.備考 || "", body.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await req.json();
  await dbRun("DELETE FROM alumni WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}
