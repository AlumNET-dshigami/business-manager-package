import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search");
  const status = req.nextUrl.searchParams.get("ステータス");

  let query = "SELECT * FROM contractors WHERE 1=1";
  const params: string[] = [];

  if (search) {
    query += " AND (氏名 LIKE ? OR 会社名_屋号 LIKE ? OR 担当業務 LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (status) { query += " AND ステータス = ?"; params.push(status); }

  query += " ORDER BY created_at DESC";
  const contractors = await dbAll(query, params);
  return NextResponse.json(contractors);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const result = await dbRun(
    `INSERT INTO contractors (氏名, 会社名_屋号, 担当業務, 契約開始日, 契約終了日, 月額単価, 稼働時間, メール, 電話番号, ステータス, 備考)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [body.氏名 || "", body.会社名_屋号 || "", body.担当業務 || "", body.契約開始日 || "", body.契約終了日 || "", body.月額単価 || 0, body.稼働時間 || "", body.メール || "", body.電話番号 || "", body.ステータス || "稼働中", body.備考 || ""]
  );
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  await dbRun(
    `UPDATE contractors SET 氏名=?, 会社名_屋号=?, 担当業務=?, 契約開始日=?, 契約終了日=?, 月額単価=?, 稼働時間=?, メール=?, 電話番号=?, ステータス=?, 備考=? WHERE id=?`,
    [body.氏名 || "", body.会社名_屋号 || "", body.担当業務 || "", body.契約開始日 || "", body.契約終了日 || "", body.月額単価 || 0, body.稼働時間 || "", body.メール || "", body.電話番号 || "", body.ステータス || "稼働中", body.備考 || "", body.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await req.json();
  await dbRun("DELETE FROM contractors WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}
