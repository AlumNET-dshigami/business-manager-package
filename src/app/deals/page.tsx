"use client";

import { useEffect, useState, useCallback } from "react";
import Nav from "../components/Nav";
import { APP_CONFIG } from "@/lib/config";

type Deal = {
  id: number; 担当者: string; 企業名: string; 属性: string; 進捗状況: string;
  次アクション: string; 優先度: string; 提出資料: number; 見積もり: number;
  発注書: number; 契約書: number; 備考: string; 月額売上: number; 月額原価: number;
  契約開始月: string; 契約終了月: string; 確定: number;
};

const STATUS_COLORS: Record<string, string> = {
  "商談中": "bg-blue-100 text-blue-700",
  "検討中": "bg-amber-100 text-amber-700",
  "稼働中": "bg-emerald-100 text-emerald-700",
  "終了": "bg-gray-200 text-gray-600",
};

const PRIORITY_DOTS: Record<string, string> = { "高": "bg-red-500", "中": "bg-yellow-500", "低": "bg-gray-400" };

const emptyDeal = (): Partial<Deal> => ({
  担当者: APP_CONFIG.defaultUsers[0], 企業名: "", 属性: "", 進捗状況: "商談中" as string,
  次アクション: "", 優先度: "中", 提出資料: 0, 見積もり: 0, 発注書: 0, 契約書: 0, 備考: "",
  月額売上: 0, 月額原価: 0, 契約開始月: "", 契約終了月: "", 確定: 0,
});

function fmt(n: number): string { return n ? `¥${n.toLocaleString()}` : "-"; }

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filterOwner, setFilterOwner] = useState("");
  const [editing, setEditing] = useState<Partial<Deal> | null>(null);
  const [view, setView] = useState<"table" | "board">("board");

  const fetchDeals = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterOwner) params.set("担当者", filterOwner);
    const res = await fetch(`/api/deals?${params}`);
    if (res.ok) setDeals(await res.json());
  }, [filterOwner]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  async function saveDeal() {
    if (!editing?.企業名) return;
    const method = editing.id ? "PUT" : "POST";
    await fetch("/api/deals", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    setEditing(null);
    fetchDeals();
  }

  async function deleteDeal(id: number) {
    if (!confirm("削除しますか？")) return;
    await fetch("/api/deals", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchDeals();
  }

  const activeDeals = deals.filter(d => d.進捗状況 === "稼働中");
  const totalRevenue = activeDeals.reduce((s, d) => s + (d.月額売上 || 0), 0);
  const totalCost = activeDeals.reduce((s, d) => s + (d.月額原価 || 0), 0);

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">案件管理</h1>
          <div className="flex items-center gap-3">
            <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
              <option value="">全担当者</option>
              {APP_CONFIG.defaultUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setView("board")} className={`px-3 py-1 text-sm rounded-md ${view === "board" ? "bg-white shadow-sm" : ""}`}>ボード</button>
              <button onClick={() => setView("table")} className={`px-3 py-1 text-sm rounded-md ${view === "table" ? "bg-white shadow-sm" : ""}`}>テーブル</button>
            </div>
            <button onClick={() => setEditing(emptyDeal())} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 新規案件</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">全案件</p><p className="text-2xl font-bold">{deals.length}</p></div>
          <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">稼働中</p><p className="text-2xl font-bold text-emerald-600">{activeDeals.length}</p></div>
          <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">MRR（月間売上）</p><p className="text-lg font-bold text-blue-600">{fmt(totalRevenue)}</p></div>
          <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">月間原価</p><p className="text-lg font-bold text-orange-600">{fmt(totalCost)}</p></div>
        </div>

        {view === "board" ? <BoardView deals={deals} onEdit={setEditing} /> : <TableView deals={deals} onEdit={setEditing} onDelete={deleteDeal} />}
      </div>

      {editing && <DealModal deal={editing} onChange={setEditing} onSave={saveDeal} onClose={() => setEditing(null)} onDelete={editing.id ? () => { deleteDeal(editing.id!); setEditing(null); } : undefined} />}
    </div>
  );
}

function BoardView({ deals, onEdit }: { deals: Deal[]; onEdit: (d: Deal) => void }) {
  const columns = APP_CONFIG.dealStatuses;
  return (
    <div className="grid gap-4 grid-cols-4">
      {columns.map((status) => {
        const col = deals.filter((d) => d.進捗状況 === status);
        return (
          <div key={status} className="min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-gray-100"}`}>{status}</span>
              <span className="text-xs text-gray-400">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((deal) => (
                <div key={deal.id} onClick={() => onEdit(deal)} className={`bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition ${deal.確定 ? "ring-2 ring-emerald-300" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5">
                      {deal.確定 ? <span className="text-emerald-500 text-xs">&#10003;</span> : null}
                      <span className="font-medium text-sm">{deal.企業名}</span>
                    </div>
                    <span className={`w-2 h-2 rounded-full mt-1 ${PRIORITY_DOTS[deal.優先度] || ""}`} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{deal.属性}</p>
                  {deal.月額売上 ? (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-blue-600 font-bold">{fmt(deal.月額売上)}<span className="text-xs font-normal">/月</span></p>
                      {deal.月額原価 ? <p className="text-xs text-gray-400">原価 {fmt(deal.月額原価)}</p> : null}
                    </div>
                  ) : null}
                  {deal.次アクション && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{deal.次アクション}</p>}
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-gray-400">{deal.担当者}</span>
                    <div className="flex gap-1 ml-auto">
                      {deal.提出資料 ? <DocBadge label="資" /> : null}
                      {deal.見積もり ? <DocBadge label="見" /> : null}
                      {deal.発注書 ? <DocBadge label="発" /> : null}
                      {deal.契約書 ? <DocBadge label="契" /> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DocBadge({ label }: { label: string }) {
  return <span className="w-5 h-5 bg-green-50 text-green-600 text-[10px] rounded flex items-center justify-center font-medium">{label}</span>;
}

function TableView({ deals, onEdit, onDelete }: { deals: Deal[]; onEdit: (d: Deal) => void; onDelete: (id: number) => void }) {
  return (
    <div className="bg-white rounded-xl border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">確定</th><th className="px-4 py-3 font-medium">担当</th>
            <th className="px-4 py-3 font-medium">企業名</th><th className="px-4 py-3 font-medium">属性</th>
            <th className="px-4 py-3 font-medium">進捗</th><th className="px-4 py-3 font-medium text-right">月額売上</th>
            <th className="px-4 py-3 font-medium">契約期間</th><th className="px-4 py-3 font-medium">優先度</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {deals.map((d) => (
            <tr key={d.id} className={`hover:bg-gray-50 cursor-pointer ${d.確定 ? "bg-emerald-50/50" : ""}`} onClick={() => onEdit(d)}>
              <td className="px-4 py-3 text-center">{d.確定 ? <span className="text-emerald-500 font-bold">&#10003;</span> : <span className="text-gray-300">-</span>}</td>
              <td className="px-4 py-3">{d.担当者}</td>
              <td className="px-4 py-3 font-medium">{d.企業名}</td>
              <td className="px-4 py-3 text-gray-600">{d.属性}</td>
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[d.進捗状況] || "bg-gray-100"}`}>{d.進捗状況}</span></td>
              <td className="px-4 py-3 text-right font-mono text-sm">{fmt(d.月額売上)}</td>
              <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{d.契約開始月 ? `${d.契約開始月} 〜 ${d.契約終了月 || ""}` : "-"}</td>
              <td className="px-4 py-3"><span className={`inline-block w-2 h-2 rounded-full ${PRIORITY_DOTS[d.優先度]}`} /><span className="ml-1.5">{d.優先度}</span></td>
              <td className="px-4 py-3">
                <button onClick={(e) => { e.stopPropagation(); onDelete(d.id); }} className="text-gray-400 hover:text-red-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {deals.length === 0 && <p className="text-center text-gray-400 py-12">案件がありません</p>}
    </div>
  );
}

function DealModal({ deal, onChange, onSave, onClose, onDelete }: {
  deal: Partial<Deal>; onChange: (d: Partial<Deal>) => void; onSave: () => void; onClose: () => void; onDelete?: () => void;
}) {
  const set = (key: string, value: string | number) => onChange({ ...deal, [key]: value });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{deal.id ? "案件編集" : "新規案件"}</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className={`text-sm font-medium ${deal.確定 ? "text-emerald-600" : "text-gray-400"}`}>PL確定</span>
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={!!deal.確定}
                onChange={(e) => onChange({ ...deal, 確定: e.target.checked ? 1 : 0, 進捗状況: e.target.checked ? "稼働中" : (["稼働中", "終了"].includes(deal.進捗状況 || "") ? "検討中" : deal.進捗状況) })} />
              <div className={`w-10 h-5 rounded-full transition ${deal.確定 ? "bg-emerald-500" : "bg-gray-300"}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${deal.確定 ? "translate-x-5" : ""}`} />
            </div>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">担当者</label>
            <select value={deal.担当者 || ""} onChange={(e) => set("担当者", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              {APP_CONFIG.defaultUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">優先度</label>
            <select value={deal.優先度 || "中"} onChange={(e) => set("優先度", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              {APP_CONFIG.dealPriorities.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">企業名</label>
          <input value={deal.企業名 || ""} onChange={(e) => set("企業名", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="企業名を入力" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">属性/案件</label><input value={deal.属性 || ""} onChange={(e) => set("属性", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">進捗状況</label>
            <select value={deal.進捗状況 || ""} onChange={(e) => set("進捗状況", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              {APP_CONFIG.dealStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-gray-500 mb-3">PL連携（確定時に自動反映）</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">月額売上（円）</label><input type="number" value={deal.月額売上 || ""} onChange={(e) => set("月額売上", parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">月額原価（円）</label><input type="number" value={deal.月額原価 || ""} onChange={(e) => set("月額原価", parseInt(e.target.value) || 0)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">契約開始月</label><input type="month" value={deal.契約開始月 || ""} onChange={(e) => set("契約開始月", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">契約終了月</label><input type="month" value={deal.契約終了月 || ""} onChange={(e) => set("契約終了月", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
        </div>
        <div><label className="block text-xs font-medium text-gray-500 mb-1">次アクション</label><textarea value={deal.次アクション || ""} onChange={(e) => set("次アクション", e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-500 mb-1">備考</label><textarea value={deal.備考 || ""} onChange={(e) => set("備考", e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-500 mb-1">書類</label>
          <div className="flex gap-4">
            {(["提出資料", "見積もり", "発注書", "契約書"] as const).map((key) => (
              <label key={key} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={!!deal[key]} onChange={(e) => set(key, e.target.checked ? 1 : 0)} className="rounded" />{key}</label>
            ))}
          </div>
        </div>
        <div className="flex justify-between pt-2">
          <div>{onDelete && <button onClick={onDelete} className="text-red-500 text-sm hover:text-red-700">削除</button>}</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">キャンセル</button>
            <button onClick={onSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
