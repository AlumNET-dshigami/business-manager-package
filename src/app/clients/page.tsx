"use client";

import { useEffect, useState, useCallback } from "react";
import Nav from "../components/Nav";

type Client = { id: number; 企業名: string; 担当者名: string; メール: string; 電話番号: string; 住所: string; 備考: string };
type Alumni = { id: number; 氏名: string; 企業名: string; 役職: string; メール: string; 電話番号: string; スキル: string; ステータス: string; facebook_url: string; 備考: string };
type Tab = "clients" | "alumni";

export default function ClientsPage() {
  const [tab, setTab] = useState<Tab>("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [alumniSearch, setAlumniSearch] = useState("");

  const fetchClients = useCallback(async () => { const params = new URLSearchParams(); if (search) params.set("search", search); const res = await fetch(`/api/clients?${params}`); if (res.ok) setClients(await res.json()); }, [search]);
  const fetchAlumni = useCallback(async () => { const params = new URLSearchParams(); if (alumniSearch) params.set("search", alumniSearch); const res = await fetch(`/api/alumni?${params}`); if (res.ok) setAlumni(await res.json()); }, [alumniSearch]);
  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { fetchAlumni(); }, [fetchAlumni]);

  async function saveClient() { if (!editing?.企業名) return; await fetch("/api/clients", { method: editing.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) }); setEditing(null); fetchClients(); }
  async function deleteClient(id: number) { if (!confirm("削除しますか？")) return; await fetch("/api/clients", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); fetchClients(); }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">クライアントリスト</h1>
          <div className="flex items-center gap-3">
            {tab === "clients" ? (<>
              <input type="text" placeholder="企業名・担当者名で検索..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm w-64" />
              <button onClick={() => setEditing({ 企業名: "", 担当者名: "", メール: "", 電話番号: "", 住所: "", 備考: "" })} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 新規</button>
            </>) : (
              <input type="text" placeholder="氏名・企業名・スキルで検索..." value={alumniSearch} onChange={(e) => setAlumniSearch(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm w-64" />
            )}
          </div>
        </div>

        <div className="flex gap-1 mb-4 border-b">
          <button onClick={() => setTab("clients")} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === "clients" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>クライアント企業 ({clients.length})</button>
          <button onClick={() => setTab("alumni")} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === "alumni" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>人材ネットワーク ({alumni.length})</button>
        </div>

        {tab === "clients" ? (
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3 font-medium">企業名</th><th className="px-4 py-3 font-medium">担当者名</th><th className="px-4 py-3 font-medium">メール</th><th className="px-4 py-3 font-medium">電話番号</th><th className="px-4 py-3 font-medium">住所</th><th className="px-4 py-3 font-medium">備考</th><th className="px-4 py-3 font-medium"></th></tr></thead>
              <tbody className="divide-y">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setEditing(c)}>
                    <td className="px-4 py-3 font-medium">{c.企業名}</td><td className="px-4 py-3">{c.担当者名}</td><td className="px-4 py-3 text-gray-600">{c.メール}</td><td className="px-4 py-3 text-gray-600">{c.電話番号}</td><td className="px-4 py-3 text-gray-600 max-w-48 truncate">{c.住所}</td><td className="px-4 py-3 text-gray-500 max-w-32 truncate">{c.備考}</td>
                    <td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }} className="text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clients.length === 0 && <p className="text-center text-gray-400 py-12">クライアントがありません</p>}
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3 font-medium">氏名</th><th className="px-4 py-3 font-medium">企業名</th><th className="px-4 py-3 font-medium">役職</th><th className="px-4 py-3 font-medium">スキル</th><th className="px-4 py-3 font-medium">メール</th><th className="px-4 py-3 font-medium">ステータス</th></tr></thead>
              <tbody className="divide-y">
                {alumni.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.氏名}</td><td className="px-4 py-3 text-gray-600">{a.企業名}</td><td className="px-4 py-3 text-gray-600">{a.役職}</td><td className="px-4 py-3 text-gray-600 max-w-48 truncate">{a.スキル}</td><td className="px-4 py-3 text-gray-600">{a.メール}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.ステータス === "アクティブ" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{a.ステータス}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {alumni.length === 0 && <p className="text-center text-gray-400 py-12">人材がいません</p>}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{editing.id ? "クライアント編集" : "新規クライアント"}</h2>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">企業名 *</label><input value={editing.企業名 || ""} onChange={(e) => setEditing({...editing, 企業名: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">担当者名</label><input value={editing.担当者名 || ""} onChange={(e) => setEditing({...editing, 担当者名: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">メール</label><input type="email" value={editing.メール || ""} onChange={(e) => setEditing({...editing, メール: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">電話番号</label><input value={editing.電話番号 || ""} onChange={(e) => setEditing({...editing, 電話番号: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">住所</label><input value={editing.住所 || ""} onChange={(e) => setEditing({...editing, 住所: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">備考</label><textarea value={editing.備考 || ""} onChange={(e) => setEditing({...editing, 備考: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div className="flex justify-between pt-2"><div>{editing.id && <button onClick={() => { deleteClient(editing.id!); setEditing(null); }} className="text-red-500 text-sm">削除</button>}</div><div className="flex gap-2"><button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600">キャンセル</button><button onClick={saveClient} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
}
