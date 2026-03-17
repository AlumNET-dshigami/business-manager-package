"use client";

import { useEffect, useState, useCallback } from "react";
import Nav from "../components/Nav";
import { APP_CONFIG } from "@/lib/config";

type Assignment = { id: number; contractor_id: number; 案件名: string; 月額単価: number; 契約開始月: string; 契約終了月: string; PL表示名: string; PLカテゴリ: string; 備考: string };
type Contractor = { id: number; 氏名: string; 会社名_屋号: string; 担当業務: string; 契約開始日: string; 契約終了日: string; 月額単価: number; 稼働時間: string; メール: string; 電話番号: string; ステータス: string; 備考: string; assignments?: Assignment[] };
type Expense = { id: number; 項目名: string; 月額: number; 開始月: string; 終了月: string; PLカテゴリ: string; PL表示名: string; 備考: string };
type Tab = "contractors" | "expenses";

const STATUS_COLORS: Record<string, string> = { "稼働中": "bg-green-100 text-green-700", "契約準備中": "bg-yellow-100 text-yellow-700", "契約終了": "bg-gray-100 text-gray-600", "休止中": "bg-red-100 text-red-600" };
const PL_CATEGORIES = ["販管費", "原価"];

function formatCurrency(n: number) { return n ? `¥${n.toLocaleString()}` : "-"; }

export default function ContractorsPage() {
  const [tab, setTab] = useState<Tab>("contractors");
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editing, setEditing] = useState<Partial<Contractor> | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Partial<Assignment> | null>(null);
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchContractors = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterStatus) params.set("ステータス", filterStatus);
    const res = await fetch(`/api/contractors?${params}`);
    if (!res.ok) return;
    const list: Contractor[] = await res.json();
    const aRes = await fetch("/api/contractors/assignments");
    if (aRes.ok) { const all: Assignment[] = await aRes.json(); for (const c of list) { c.assignments = all.filter(a => a.contractor_id === c.id); } }
    setContractors(list);
  }, [search, filterStatus]);

  const fetchExpenses = useCallback(async () => { const res = await fetch("/api/expenses"); if (res.ok) setExpenses(await res.json()); }, []);
  useEffect(() => { fetchContractors(); }, [fetchContractors]);
  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  async function saveContractor() { if (!editing?.氏名) return; await fetch("/api/contractors", { method: editing.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) }); setEditing(null); fetchContractors(); }
  async function deleteContractor(id: number) { if (!confirm("削除しますか？")) return; await fetch("/api/contractors", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); fetchContractors(); }
  async function saveAssignment() { if (!editingAssignment?.案件名) return; await fetch("/api/contractors/assignments", { method: editingAssignment.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingAssignment) }); setEditingAssignment(null); fetchContractors(); }
  async function deleteAssignment(id: number) { if (!confirm("削除しますか？")) return; await fetch("/api/contractors/assignments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); fetchContractors(); }
  async function saveExpense() { if (!editingExpense?.項目名) return; await fetch("/api/expenses", { method: editingExpense.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingExpense) }); setEditingExpense(null); fetchExpenses(); }
  async function deleteExpense(id: number) { if (!confirm("削除しますか？")) return; await fetch("/api/expenses", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); fetchExpenses(); }

  const totalMonthlyCost = contractors.filter(c => c.ステータス === "稼働中").reduce((sum, c) => sum + (c.assignments || []).reduce((s, a) => s + (a.月額単価 || 0), 0), 0);

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
          <h1 className="text-2xl font-bold">業務委託・経費管理</h1>
          <div className="flex flex-wrap items-center gap-3">
            {tab === "contractors" ? (<>
              <input type="text" placeholder="検索..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm w-64" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm"><option value="">全ステータス</option>{APP_CONFIG.contractorStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <button onClick={() => setEditing({ 氏名: "", 会社名_屋号: "", 担当業務: "", ステータス: "稼働中", 備考: "" })} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 新規登録</button>
            </>) : (
              <button onClick={() => setEditingExpense({ 項目名: "", 月額: 0, PLカテゴリ: "販管費", 備考: "" })} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 経費追加</button>
            )}
          </div>
        </div>

        <div className="flex gap-1 mb-4 border-b">
          <button onClick={() => setTab("contractors")} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === "contractors" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>業務委託人材 ({contractors.length})</button>
          <button onClick={() => setTab("expenses")} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === "expenses" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>経費 ({expenses.length})</button>
        </div>

        {tab === "contractors" ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">総人数</p><p className="text-2xl font-bold">{contractors.length}</p></div>
              <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">稼働中</p><p className="text-2xl font-bold text-green-600">{contractors.filter(c => c.ステータス === "稼働中").length}</p></div>
              <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">月額コスト合計</p><p className="text-2xl font-bold">{formatCurrency(totalMonthlyCost)}</p></div>
              <div className="bg-white rounded-xl border p-4"><p className="text-xs text-gray-500">契約終了</p><p className="text-2xl font-bold text-gray-500">{contractors.filter(c => c.ステータス === "契約終了").length}</p></div>
            </div>
            <div className="space-y-3">
              {contractors.map((c) => {
                const isExpanded = expandedId === c.id;
                const assignments = c.assignments || [];
                const totalAssignment = assignments.reduce((s, a) => s + (a.月額単価 || 0), 0);
                return (
                  <div key={c.id} className="bg-white rounded-xl border">
                    <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className="font-medium text-sm">{c.氏名}</span>{c.会社名_屋号 && <span className="text-xs text-gray-500">{c.会社名_屋号}</span>}<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.ステータス] || "bg-gray-100"}`}>{c.ステータス}</span></div>
                        {c.担当業務 && <p className="text-xs text-gray-500 mt-0.5">{c.担当業務}</p>}
                      </div>
                      <div className="text-right"><p className="text-sm font-mono font-medium">{formatCurrency(totalAssignment)}</p><p className="text-[10px] text-gray-400">{assignments.length}件</p></div>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setEditing(c); }} className="text-gray-400 hover:text-blue-500 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteContractor(c.id); }} className="text-gray-400 hover:text-red-500 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t bg-gray-50/50 px-4 py-3">
                        {assignments.length > 0 ? (
                          <table className="w-full text-sm mb-3"><thead><tr className="text-xs text-gray-500"><th className="text-left py-1 font-medium">案件名</th><th className="text-right py-1 font-medium">月額</th><th className="text-left py-1 font-medium">期間</th><th className="text-left py-1 font-medium">PLカテゴリ</th><th className="py-1 w-8"></th></tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {assignments.map(a => (
                              <tr key={a.id} className="hover:bg-white cursor-pointer" onClick={() => setEditingAssignment(a)}>
                                <td className="py-2 font-medium">{a.案件名}</td><td className="py-2 text-right font-mono">{formatCurrency(a.月額単価)}</td>
                                <td className="py-2 text-gray-600 text-xs">{a.契約開始月 ? `${a.契約開始月} 〜 ${a.契約終了月 || ""}` : "-"}</td>
                                <td className="py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${a.PLカテゴリ === "原価" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"}`}>{a.PLカテゴリ || "販管費"}</span></td>
                                <td className="py-2 text-right"><button onClick={(e) => { e.stopPropagation(); deleteAssignment(a.id); }} className="text-gray-400 hover:text-red-500"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></td>
                              </tr>
                            ))}
                          </tbody></table>
                        ) : <p className="text-xs text-gray-400 mb-3">アサインがありません</p>}
                        <button onClick={() => setEditingAssignment({ contractor_id: c.id, 案件名: "", 月額単価: 0, PLカテゴリ: "販管費", 備考: "" })} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ アサイン追加</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {contractors.length === 0 && <p className="text-center text-gray-400 py-12">業務委託メンバーがいません</p>}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm"><thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3 font-medium">項目名</th><th className="px-4 py-3 font-medium text-right">月額</th><th className="px-4 py-3 font-medium">期間</th><th className="px-4 py-3 font-medium">PLカテゴリ</th><th className="px-4 py-3 font-medium">備考</th><th className="px-4 py-3 w-12"></th></tr></thead>
            <tbody className="divide-y">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setEditingExpense(e)}>
                  <td className="px-4 py-3 font-medium">{e.項目名}</td><td className="px-4 py-3 text-right font-mono">{formatCurrency(e.月額)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{e.開始月 ? `${e.開始月} 〜 ${e.終了月 || ""}` : "通年"}</td>
                  <td className="px-4 py-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${e.PLカテゴリ === "原価" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"}`}>{e.PLカテゴリ}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-32 truncate">{e.備考 || "-"}</td>
                  <td className="px-4 py-3"><button onClick={(ev) => { ev.stopPropagation(); deleteExpense(e.id); }} className="text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                </tr>
              ))}
            </tbody></table>
            {expenses.length === 0 && <p className="text-center text-gray-400 py-12">経費がありません</p>}
          </div>
        )}
      </div>

      {editing && <Modal title={editing.id ? "メンバー編集" : "新規メンバー"} onClose={() => setEditing(null)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">氏名 *</label><input value={editing.氏名 || ""} onChange={(e) => setEditing({...editing, 氏名: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">ステータス</label><select value={editing.ステータス || "稼働中"} onChange={(e) => setEditing({...editing, ステータス: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">{APP_CONFIG.contractorStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">会社名/屋号</label><input value={editing.会社名_屋号 || ""} onChange={(e) => setEditing({...editing, 会社名_屋号: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">担当業務</label><input value={editing.担当業務 || ""} onChange={(e) => setEditing({...editing, 担当業務: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">メール</label><input type="email" value={editing.メール || ""} onChange={(e) => setEditing({...editing, メール: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">電話番号</label><input value={editing.電話番号 || ""} onChange={(e) => setEditing({...editing, 電話番号: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">備考</label><textarea value={editing.備考 || ""} onChange={(e) => setEditing({...editing, 備考: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="flex justify-between pt-2"><div>{editing.id && <button onClick={() => { deleteContractor(editing.id!); setEditing(null); }} className="text-red-500 text-sm">削除</button>}</div><div className="flex gap-2"><button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600">キャンセル</button><button onClick={saveContractor} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button></div></div>
        </div>
      </Modal>}

      {editingAssignment && <Modal title={editingAssignment.id ? "アサイン編集" : "新規アサイン"} onClose={() => setEditingAssignment(null)}>
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">案件名 *</label><input value={editingAssignment.案件名 || ""} onChange={(e) => setEditingAssignment({...editingAssignment, 案件名: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">月額単価（円）</label><input type="number" value={editingAssignment.月額単価 || ""} onChange={(e) => setEditingAssignment({...editingAssignment, 月額単価: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">PLカテゴリ</label><select value={editingAssignment.PLカテゴリ || "販管費"} onChange={(e) => setEditingAssignment({...editingAssignment, PLカテゴリ: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">{PL_CATEGORIES.map(c => <option key={c} value={c}>{c === "販管費" ? "販売管理費" : c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">契約開始月</label><input type="month" value={editingAssignment.契約開始月 || ""} onChange={(e) => setEditingAssignment({...editingAssignment, 契約開始月: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">契約終了月</label><input type="month" value={editingAssignment.契約終了月 || ""} onChange={(e) => setEditingAssignment({...editingAssignment, 契約終了月: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">PL表示名</label><input value={editingAssignment.PL表示名 || ""} onChange={(e) => setEditingAssignment({...editingAssignment, PL表示名: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="空欄で自動生成" /></div>
          <div className="flex justify-between pt-2"><div>{editingAssignment.id && <button onClick={() => { deleteAssignment(editingAssignment.id!); setEditingAssignment(null); }} className="text-red-500 text-sm">削除</button>}</div><div className="flex gap-2"><button onClick={() => setEditingAssignment(null)} className="px-4 py-2 text-sm text-gray-600">キャンセル</button><button onClick={saveAssignment} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button></div></div>
        </div>
      </Modal>}

      {editingExpense && <Modal title={editingExpense.id ? "経費編集" : "新規経費"} onClose={() => setEditingExpense(null)}>
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">項目名 *</label><input value={editingExpense.項目名 || ""} onChange={(e) => setEditingExpense({...editingExpense, 項目名: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">月額（円）</label><input type="number" value={editingExpense.月額 || ""} onChange={(e) => setEditingExpense({...editingExpense, 月額: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">PLカテゴリ</label><select value={editingExpense.PLカテゴリ || "販管費"} onChange={(e) => setEditingExpense({...editingExpense, PLカテゴリ: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">{PL_CATEGORIES.map(c => <option key={c} value={c}>{c === "販管費" ? "販売管理費" : c}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">開始月</label><input type="month" value={editingExpense.開始月 || ""} onChange={(e) => setEditingExpense({...editingExpense, 開始月: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">終了月</label><input type="month" value={editingExpense.終了月 || ""} onChange={(e) => setEditingExpense({...editingExpense, 終了月: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">PL表示名</label><input value={editingExpense.PL表示名 || ""} onChange={(e) => setEditingExpense({...editingExpense, PL表示名: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">備考</label><textarea value={editingExpense.備考 || ""} onChange={(e) => setEditingExpense({...editingExpense, 備考: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div className="flex justify-between pt-2"><div>{editingExpense.id && <button onClick={() => { deleteExpense(editingExpense.id!); setEditingExpense(null); }} className="text-red-500 text-sm">削除</button>}</div><div className="flex gap-2"><button onClick={() => setEditingExpense(null)} className="px-4 py-2 text-sm text-gray-600">キャンセル</button><button onClick={saveExpense} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button></div></div>
        </div>
      </Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
