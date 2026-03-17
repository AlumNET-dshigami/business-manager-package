"use client";

import { useEffect, useState, useCallback } from "react";
import Nav from "../components/Nav";
import { APP_CONFIG } from "@/lib/config";

type PLItem = { id: number; カテゴリ: string; サブカテゴリ: string; 案件名: string; year_month: string; 金額: number; 備考: string; _auto?: string };
type PLData = Record<string, Record<string, Record<string, number>>>;

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const EDITABLE_CATEGORIES = ["売上", "原価", "販管費"];
const CATEGORY_LABELS: Record<string, string> = { "売上": "売上高", "原価": "売上原価", "販管費": "販売管理費" };

export default function PLPage() {
  const [items, setItems] = useState<PLItem[]>([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [editing, setEditing] = useState<Partial<PLItem> | null>(null);

  const fetchPL = useCallback(async () => { const res = await fetch(`/api/pl?year=${year}`); if (res.ok) setItems(await res.json()); }, [year]);
  useEffect(() => { fetchPL(); }, [fetchPL]);

  const data: PLData = {};
  const autoNamesByCat: Record<string, Set<string>> = {};
  for (const cat of EDITABLE_CATEGORIES) { data[cat] = {}; autoNamesByCat[cat] = new Set(); }
  for (const item of items) {
    const cat = item.カテゴリ;
    if (!data[cat]) data[cat] = {};
    if (!autoNamesByCat[cat]) autoNamesByCat[cat] = new Set();
    if (!data[cat][item.案件名]) data[cat][item.案件名] = {};
    const month = item.year_month.split("-")[1];
    data[cat][item.案件名][month] = (data[cat][item.案件名][month] || 0) + item.金額;
    if (item._auto) autoNamesByCat[cat].add(item.案件名);
  }

  function catMonthTotal(cat: string, m: string): number { return Object.values(data[cat] || {}).reduce((sum, row) => sum + (row[m] || 0), 0); }
  function catRowTotal(cat: string, name: string): number { return Object.values(data[cat]?.[name] || {}).reduce((sum, v) => sum + v, 0); }
  function catTotal(cat: string): number { return Object.keys(data[cat] || {}).reduce((sum, name) => sum + catRowTotal(cat, name), 0); }

  // 粗利 = 売上 - 原価
  const grossByMonth = (m: string) => catMonthTotal("売上", m) - catMonthTotal("原価", m);
  const totalGross = catTotal("売上") - catTotal("原価");

  // 営業利益 = 粗利 - 販管費
  const operatingByMonth = (m: string) => grossByMonth(m) - catMonthTotal("販管費", m);
  const totalOperating = totalGross - catTotal("販管費");

  // 率の計算
  const pct = (num: number, den: number) => den === 0 ? 0 : (num / den) * 100;
  const costRateByMonth = (m: string) => pct(catMonthTotal("原価", m), catMonthTotal("売上", m));
  const grossRateByMonth = (m: string) => pct(grossByMonth(m), catMonthTotal("売上", m));
  const opRateByMonth = (m: string) => pct(operatingByMonth(m), catMonthTotal("売上", m));
  const totalCostRate = pct(catTotal("原価"), catTotal("売上"));
  const totalGrossRate = pct(totalGross, catTotal("売上"));
  const totalOpRate = pct(totalOperating, catTotal("売上"));

  function fmt(n: number): string { return n === 0 ? "-" : n.toLocaleString(); }

  async function savePLItem() {
    if (!editing?.案件名 || !editing.カテゴリ) return;
    await fetch("/api/pl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    setEditing(null); fetchPL();
  }

  function openEditor(cat: string, name: string, month: string) {
    const existing = items.find(i => i.カテゴリ === cat && i.案件名 === name && i.year_month === `${year}-${month}`);
    setEditing(existing || { カテゴリ: cat, 案件名: name, year_month: `${year}-${month}`, 金額: 0 });
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">PL管理</h1>
          <div className="flex items-center gap-3">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
              {APP_CONFIG.pl.years.map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <button onClick={() => setEditing({ カテゴリ: "売上", 案件名: "", year_month: `${year}-01`, 金額: 0 })} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 追加</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryCard label="売上高" value={catTotal("売上")} color="blue" />
          <SummaryCard label="売上原価" value={catTotal("原価")} color="orange" rate={totalCostRate} rateLabel="原価率" />
          <SummaryCard label="売上粗利" value={totalGross} color="green" rate={totalGrossRate} rateLabel="粗利率" />
          <SummaryCard label="営業利益" value={totalOperating} color={totalOperating >= 0 ? "emerald" : "red"} rate={totalOpRate} rateLabel="利益率" />
        </div>

        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-48 sticky left-0 bg-gray-50 z-10">項目</th>
                {MONTHS.map(m => <th key={m} className="px-2 py-2 text-right font-medium w-20">{parseInt(m)}月</th>)}
                <th className="px-3 py-2 text-right font-medium w-24 bg-gray-100">FY{year}</th>
              </tr>
            </thead>
            <tbody>
              <CategorySection cat="売上" data={data} fmt={fmt} catMonthTotal={catMonthTotal} catRowTotal={catRowTotal} catTotal={catTotal} onCellClick={(name, m) => openEditor("売上", name, m)} bgColor="bg-blue-50" autoNames={autoNamesByCat["売上"]} />
              <CategorySection cat="原価" data={data} fmt={fmt} catMonthTotal={catMonthTotal} catRowTotal={catRowTotal} catTotal={catTotal} onCellClick={(name, m) => openEditor("原価", name, m)} bgColor="bg-orange-50" autoNames={autoNamesByCat["原価"]} />
              <RateRow label="原価率" byMonth={costRateByMonth} total={totalCostRate} />
              <ComputedRow label="売上粗利" byMonth={grossByMonth} total={totalGross} bg="bg-green-50" totalBg="bg-green-100" />
              <RateRow label="粗利率" byMonth={grossRateByMonth} total={totalGrossRate} good />
              <CategorySection cat="販管費" data={data} fmt={fmt} catMonthTotal={catMonthTotal} catRowTotal={catRowTotal} catTotal={catTotal} onCellClick={(name, m) => openEditor("販管費", name, m)} bgColor="bg-purple-50" autoNames={autoNamesByCat["販管費"]} />
              <ComputedRow label="営業利益" byMonth={operatingByMonth} total={totalOperating} bg="bg-emerald-50" totalBg="bg-emerald-100" bold />
              <RateRow label="営業利益率" byMonth={opRateByMonth} total={totalOpRate} good bold />
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          ※ <span className="px-1 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px]">自動</span> = 確定案件・稼働中業務委託から自動反映
        </p>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">PL項目 {editing.id ? "編集" : "追加"}</h2>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">カテゴリ</label><select value={editing.カテゴリ || ""} onChange={(e) => setEditing({...editing, カテゴリ: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">{EDITABLE_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">案件名/項目名</label><input value={editing.案件名 || ""} onChange={(e) => setEditing({...editing, 案件名: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">月</label><select value={editing.year_month || ""} onChange={(e) => setEditing({...editing, year_month: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">{MONTHS.map(m => <option key={m} value={`${year}-${m}`}>{parseInt(m)}月</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">金額</label><input type="number" value={editing.金額 || ""} onChange={(e) => setEditing({...editing, 金額: parseInt(e.target.value) || 0})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600">キャンセル</button><button onClick={savePLItem} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, rate, rateLabel }: { label: string; value: number; color: string; rate?: number; rateLabel?: string }) {
  const colorMap: Record<string, string> = { blue: "text-blue-700", green: "text-green-700", gray: "text-gray-700", orange: "text-orange-700", emerald: "text-emerald-700", red: "text-red-600" };
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
      <p className={`text-lg font-bold mt-1 ${colorMap[color] || ""}`}>{value === 0 ? "-" : `¥${value.toLocaleString()}`}</p>
      {rate !== undefined && rateLabel && (
        <p className="text-[11px] text-gray-500 mt-1">{rateLabel} <span className={`font-semibold ${colorMap[color] || ""}`}>{rate.toFixed(1)}%</span></p>
      )}
    </div>
  );
}

function ComputedRow({ label, byMonth, total, bg, totalBg, bold }: { label: string; byMonth: (m: string) => number; total: number; bg: string; totalBg: string; bold?: boolean }) {
  return (
    <tr className={`${bg} font-medium ${bold ? "border-t-2 border-b-2" : "border-t-2"}`}>
      <td className={`px-3 py-2 sticky left-0 z-10 ${bg} ${bold ? "font-bold" : ""}`}>{label}</td>
      {MONTHS.map(m => { const v = byMonth(m); return <td key={m} className={`px-2 py-2 text-right ${bold ? "font-bold" : ""} ${v < 0 ? "text-red-600" : ""}`}>{v === 0 ? "-" : v.toLocaleString()}</td>; })}
      <td className={`px-3 py-2 text-right font-bold ${totalBg} ${total < 0 ? "text-red-600" : ""}`}>{total === 0 ? "-" : total.toLocaleString()}</td>
    </tr>
  );
}

function RateRow({ label, byMonth, total, good, bold }: { label: string; byMonth: (m: string) => number; total: number; good?: boolean; bold?: boolean }) {
  const fmtPct = (v: number) => v === 0 ? "-" : `${v.toFixed(1)}%`;
  const color = good ? "text-emerald-600" : "text-orange-600";
  return (
    <tr className={`bg-gray-50/50 ${bold ? "border-b-2" : ""}`}>
      <td className={`px-3 py-1 pl-6 sticky left-0 z-10 bg-gray-50/50 text-[10px] ${color} ${bold ? "font-bold" : "font-medium"}`}>{label}</td>
      {MONTHS.map(m => <td key={m} className={`px-2 py-1 text-right text-[10px] ${color} ${bold ? "font-bold" : ""}`}>{fmtPct(byMonth(m))}</td>)}
      <td className={`px-3 py-1 text-right text-[10px] font-bold bg-gray-100 ${color}`}>{fmtPct(total)}</td>
    </tr>
  );
}

function CategorySection({ cat, data, fmt, catMonthTotal, catRowTotal, catTotal, onCellClick, bgColor, autoNames }: {
  cat: string; data: PLData; fmt: (n: number) => string; catMonthTotal: (cat: string, m: string) => number; catRowTotal: (cat: string, name: string) => number; catTotal: (cat: string) => number; onCellClick: (name: string, month: string) => void; bgColor: string; autoNames?: Set<string>;
}) {
  const rows = Object.keys(data[cat] || {});
  if (rows.length === 0 && catTotal(cat) === 0) return null;
  return (<>
    <tr className={`${bgColor} font-medium border-t`}>
      <td className={`px-3 py-2 sticky left-0 z-10 ${bgColor}`}>{CATEGORY_LABELS[cat] || cat}</td>
      {MONTHS.map(m => <td key={m} className="px-2 py-2 text-right font-medium">{fmt(catMonthTotal(cat, m))}</td>)}
      <td className="px-3 py-2 text-right font-bold bg-gray-100">{fmt(catTotal(cat))}</td>
    </tr>
    {rows.map((name) => {
      const isAuto = autoNames?.has(name);
      return (
        <tr key={name} className="hover:bg-gray-50">
          <td className="px-3 py-1.5 pl-6 text-gray-600 sticky left-0 bg-white z-10">{name}{isAuto && <span className="ml-1 px-1 py-0.5 text-[9px] bg-emerald-100 text-emerald-600 rounded">自動</span>}</td>
          {MONTHS.map(m => { const val = data[cat][name][m] || 0; return <td key={m} className={`px-2 py-1.5 text-right ${isAuto ? "text-emerald-700" : "cursor-pointer hover:bg-blue-50"}`} onClick={() => !isAuto && onCellClick(name, m)}>{fmt(val)}</td>; })}
          <td className="px-3 py-1.5 text-right bg-gray-50 font-medium">{fmt(catRowTotal(cat, name))}</td>
        </tr>
      );
    })}
  </>);
}
