import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const rows = await dbAll("SELECT * FROM expenses ORDER BY 開始月 DESC, 項目名");
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const result = await dbRun(
    `INSERT INTO expenses (項目名, 月額, 開始月, 終了月, PLカテゴリ, PL表示名, 備考) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [body.項目名 || "", body.月額 || 0, body.開始月 || "", body.終了月 || "", body.PLカテゴリ || "販管費", body.PL表示名 || "", body.備考 || ""]
  );
  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  await dbRun(
    `UPDATE expenses SET 項目名=?, 月額=?, 開始月=?, 終了月=?, PLカテゴリ=?, PL表示名=?, 備考=? WHERE id=?`,
    [body.項目名 || "", body.月額 || 0, body.開始月 || "", body.終了月 || "", body.PLカテゴリ || "販管費", body.PL表示名 || "", body.備考 || "", body.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await req.json();
  await dbRun("DELETE FROM expenses WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}
