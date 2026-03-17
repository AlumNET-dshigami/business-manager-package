import { NextRequest, NextResponse } from "next/server";
import { dbAll, dbRun, dbBatch } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { InStatement } from "@libsql/client";

function monthRange(start: string, end: string): string[] {
  if (!start) return [];
  const months: string[] = [];
  const [sy, sm] = start.split("-").map(Number);
  const endDate = end ? end.split("-").map(Number) : [9999, 12];
  let y = sy, m = sm;
  while (y < endDate[0] || (y === endDate[0] && m <= endDate[1])) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
    if (months.length > 60) break;
  }
  return months;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const year = req.nextUrl.searchParams.get("year") || new Date().getFullYear().toString();

  const manualItems = await dbAll(
    "SELECT * FROM pl_items WHERE year_month LIKE ? ORDER BY カテゴリ, 案件名, year_month",
    [`${year}-%`]
  );

  const confirmedDeals = await dbAll("SELECT * FROM deals WHERE 確定 = 1");

  const autoItems: Record<string, unknown>[] = [];
  for (const deal of confirmedDeals) {
    const months = monthRange(String(deal.契約開始月 || ""), String(deal.契約終了月 || ""));
    const yearMonths = months.filter(m => m.startsWith(year));
    for (const ym of yearMonths) {
      const dealName = String(deal.企業名) + (String(deal.属性 || "") ? " / " + String(deal.属性) : "");
      if (Number(deal.月額売上) > 0) {
        autoItems.push({ id: -1, カテゴリ: "売上", サブカテゴリ: "", 案件名: dealName, year_month: ym, 金額: Number(deal.月額売上), 備考: "", _auto: "deal" });
      }
      if (Number(deal.月額原価) > 0) {
        autoItems.push({ id: -1, カテゴリ: "原価", サブカテゴリ: "", 案件名: dealName, year_month: ym, 金額: Number(deal.月額原価), 備考: "", _auto: "deal" });
      }
    }
  }

  const assignments = await dbAll(
    `SELECT a.*, c.氏名, c.ステータス FROM contractor_assignments a
     JOIN contractors c ON c.id = a.contractor_id
     WHERE c.ステータス = '稼働中' OR (a.契約開始月 != '' AND a.契約終了月 != '')`
  );
  for (const a of assignments) {
    const startMonth = String(a.契約開始月 || "");
    const endMonth = String(a.契約終了月 || "");
    const months = startMonth ? monthRange(startMonth, endMonth) : [];
    const isActive = String(a.ステータス) === "稼働中";
    const yearMonths = months.length > 0
      ? months.filter(m => m.startsWith(year))
      : isActive ? Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`) : [];
    const plName = String(a.PL表示名 || "") || `業務委託:${String(a.氏名)}(${String(a.案件名)})`;
    const plCat = String(a.PLカテゴリ || "販管費");
    for (const ym of yearMonths) {
      if (Number(a.月額単価) > 0) {
        autoItems.push({ id: -1, カテゴリ: plCat, サブカテゴリ: "業務委託費", 案件名: plName, year_month: ym, 金額: Number(a.月額単価), 備考: "", _auto: "contractor" });
      }
    }
  }

  const expenses = await dbAll("SELECT * FROM expenses");
  for (const e of expenses) {
    const startMonth = String(e.開始月 || "");
    const endMonth = String(e.終了月 || "");
    const months = startMonth ? monthRange(startMonth, endMonth) : [];
    const yearMonths = months.length > 0
      ? months.filter(m => m.startsWith(year))
      : Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
    const plName = String(e.PL表示名 || "") || String(e.項目名);
    const plCat = String(e.PLカテゴリ || "販管費");
    for (const ym of yearMonths) {
      if (Number(e.月額) > 0) {
        autoItems.push({ id: -1, カテゴリ: plCat, サブカテゴリ: "経費", 案件名: plName, year_month: ym, 金額: Number(e.月額), 備考: "", _auto: "expense" });
      }
    }
  }

  const manualKeys = new Set(manualItems.map(i => `${i.カテゴリ}|${i.案件名}|${i.year_month}`));
  const filteredAuto = autoItems.filter(a => !manualKeys.has(`${a.カテゴリ}|${a.案件名}|${a.year_month}`));

  return NextResponse.json([...manualItems, ...filteredAuto]);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const sql = `INSERT INTO pl_items (カテゴリ, サブカテゴリ, 案件名, year_month, 金額, 備考)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(カテゴリ, 案件名, year_month)
    DO UPDATE SET 金額=excluded.金額, サブカテゴリ=excluded.サブカテゴリ, 備考=excluded.備考`;

  if (Array.isArray(body)) {
    const stmts: InStatement[] = body.map((item: Record<string, string | number>) => ({
      sql, args: [item.カテゴリ, item.サブカテゴリ || "", item.案件名, item.year_month, item.金額 || 0, item.備考 || ""],
    }));
    await dbBatch(stmts);
  } else {
    await dbRun(sql, [body.カテゴリ, body.サブカテゴリ || "", body.案件名, body.year_month, body.金額 || 0, body.備考 || ""]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const { id } = await req.json();
  await dbRun("DELETE FROM pl_items WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}
