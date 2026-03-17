import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search");
  let query = "SELECT * FROM clients WHERE 1=1";
  const params: string[] = [];
  if (search) {
    query += " AND (企業名 LIKE ? OR 担当者名 LIKE ? OR メール LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  query += " ORDER BY created_at DESC";
  const clients = await dbAll(query, params);
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const result = await dbRun(
    `INSERT INTO clients (企業名, 担当者名, メール, 電話番号, 住所, 備考) VALUES (?, ?, ?, ?, ?, ?)`,
    [body.企業名 || "", body.担当者名 || "", body.メール || "", body.電話番号 || "", body.住所 || "", body.備考 || ""]
  );
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  await dbRun(
    `UPDATE clients SET 企業名=?, 担当者名=?, メール=?, 電話番号=?, 住所=?, 備考=? WHERE id=?`,
    [body.企業名 || "", body.担当者名 || "", body.メール || "", body.電話番号 || "", body.住所 || "", body.備考 || "", body.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await req.json();
  await dbRun("DELETE FROM clients WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}
