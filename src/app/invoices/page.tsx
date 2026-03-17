"use client";

import { useEffect, useState, useCallback } from "react";
import Nav from "../components/Nav";
import { APP_CONFIG } from "@/lib/config";

type Invoice = { id: number; invoice_no: string; deal_id: number; client_id: number; client_name: string; 件名: string; 発行日: string; 支払期限: string; ステータス: string; 小計: number; 税率: number; 税額: number; 合計: number; 備考: string; items?: InvoiceItem[] };
type InvoiceItem = { id?: number; 項目名: string; 数量: number; 単価: number; 金額: number };
type Client = { id: number; 企業名: string };
type Deal = { id: number; 企業名: string; 属性: string; 月額売上: number; 確定: number };
type TaxMode = "税抜" | "税込";
type EditingInvoice = Partial<Invoice> & { items: InvoiceItem[]; taxMode?: TaxMode };

const STATUS_COLORS: Record<string, string> = { "下書き": "bg-gray-100 text-gray-600", "発行済": "bg-blue-100 text-blue-700", "入金済": "bg-green-100 text-green-700", "取消": "bg-red-100 text-red-600" };

const emptyInvoice = (): EditingInvoice => ({
  client_id: 0, deal_id: 0, 件名: "", 発行日: new Date().toISOString().slice(0, 10), 支払期限: "",
  ステータス: "下書き", 税率: APP_CONFIG.invoice.taxRate, 備考: "", items: [{ 項目名: "", 数量: 1, 単価: 0, 金額: 0 }], taxMode: "税抜",
});

function fmt(n: number): string { return `¥${n.toLocaleString()}`; }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [editing, setEditing] = useState<EditingInvoice | null>(null);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [showDealPicker, setShowDealPicker] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);

  const fetchInvoices = useCallback(async () => { const params = new URLSearchParams(); if (filterStatus) params.set("ステータス", filterStatus); const res = await fetch(`/api/invoices?${params}`); if (res.ok) setInvoices(await res.json()); }, [filterStatus]);
  const fetchClients = useCallback(async () => { const res = await fetch("/api/clients"); if (res.ok) setClients(await res.json()); }, []);
  const fetchDeals = useCallback(async () => { const res = await fetch("/api/deals"); if (res.ok) { const all: Deal[] = await res.json(); setDeals(all.filter(d => d.確定)); } }, []);
  useEffect(() => { fetchInvoices(); fetchClients(); fetchDeals(); }, [fetchInvoices, fetchClients, fetchDeals]);

  async function loadDetail(id: number) { const res = await fetch(`/api/invoices?id=${id}`); if (res.ok) setDetail(await res.json()); }
  async function saveInvoice() { if (!editing?.件名) return; await fetch("/api/invoices", { method: editing.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) }); setEditing(null); fetchInvoices(); }
  async function deleteInvoice(id: number) { if (!confirm("削除しますか？")) return; await fetch("/api/invoices", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); fetchInvoices(); }

  async function editExisting(inv: Invoice) {
    const res = await fetch(`/api/invoices?id=${inv.id}`);
    if (res.ok) { const data = await res.json(); setEditing({ ...data, items: data.items?.length > 0 ? data.items : [{ 項目名: "", 数量: 1, 単価: 0, 金額: 0 }], taxMode: "税抜" }); }
  }

  function createFromDeal(deal: Deal) {
    const client = clients.find(c => c.企業名 === deal.企業名);
    setEditing({ client_id: client?.id || 0, deal_id: deal.id, 件名: `${deal.属性 || deal.企業名} 業務委託費`, 発行日: new Date().toISOString().slice(0, 10), 支払期限: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), ステータス: "下書き", 税率: APP_CONFIG.invoice.taxRate, 備考: "", items: [{ 項目名: deal.属性 || deal.企業名, 数量: 1, 単価: deal.月額売上 || 0, 金額: deal.月額売上 || 0 }], taxMode: "税抜" });
    setShowDealPicker(false);
  }

  async function downloadPdf(inv: Invoice, mode: TaxMode) {
    setPdfLoading(inv.id);
    try { const res = await fetch(`/api/invoices/pdf?id=${inv.id}&taxMode=${mode}`); if (!res.ok) throw new Error("PDF生成失敗"); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${inv.invoice_no}_${mode}.pdf`; a.click(); URL.revokeObjectURL(url); }
    catch (e) { alert(e instanceof Error ? e.message : "エラー"); } finally { setPdfLoading(null); }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">請求書管理</h1>
          <div className="flex items-center gap-3">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm"><option value="">全ステータス</option>{APP_CONFIG.invoiceStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <button onClick={() => setShowDealPicker(true)} className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-emerald-700">確定案件から作成</button>
            <button onClick={() => setEditing(emptyInvoice())} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700">+ 新規請求書</button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {APP_CONFIG.invoiceStatuses.map(s => {
            const count = invoices.filter(i => i.ステータス === s).length;
            const total = invoices.filter(i => i.ステータス === s).reduce((sum, i) => sum + Number(i.合計), 0);
            return (<div key={s} className="bg-white rounded-xl border p-4"><div className="flex items-center gap-2 mb-1"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s]}`}>{s}</span><span className="text-xs text-gray-400">{count}件</span></div><p className="text-lg font-bold">{fmt(total)}</p></div>);
          })}
        </div>

        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left"><tr><th className="px-4 py-3 font-medium">請求番号</th><th className="px-4 py-3 font-medium">クライアント</th><th className="px-4 py-3 font-medium">件名</th><th className="px-4 py-3 font-medium">発行日</th><th className="px-4 py-3 font-medium">支払期限</th><th className="px-4 py-3 font-medium">ステータス</th><th className="px-4 py-3 font-medium text-right">合計</th><th className="px-4 py-3 font-medium">PDF</th><th className="px-4 py-3 font-medium"></th></tr></thead>
            <tbody className="divide-y">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => loadDetail(inv.id)}>
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_no}</td>
                  <td className="px-4 py-3">{inv.client_name || "-"}</td>
                  <td className="px-4 py-3 font-medium">{inv.件名}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.発行日}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.支払期限}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.ステータス] || "bg-gray-100"}`}>{inv.ステータス}</span></td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(Number(inv.合計))}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={() => downloadPdf(inv, "税抜")} disabled={pdfLoading === inv.id} className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50">税抜</button>
                      <button onClick={() => downloadPdf(inv, "税込")} disabled={pdfLoading === inv.id} className="px-2 py-0.5 text-[10px] bg-orange-50 text-orange-600 rounded hover:bg-orange-100 disabled:opacity-50">税込</button>
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button onClick={() => editExisting(inv)} className="text-gray-400 hover:text-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => deleteInvoice(inv.id)} className="text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <p className="text-center text-gray-400 py-12">請求書がありません</p>}
        </div>
      </div>

      {showDealPicker && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowDealPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">確定案件から請求書を作成</h2>
            {deals.length === 0 ? <p className="text-gray-500 text-sm py-8 text-center">確定案件がありません</p> : (
              <div className="space-y-2 max-h-96 overflow-y-auto">{deals.map(d => (
                <button key={d.id} onClick={() => createFromDeal(d)} className="w-full text-left p-3 rounded-lg border hover:bg-emerald-50 transition">
                  <div className="flex items-center justify-between"><div><span className="font-medium">{d.企業名}</span>{d.属性 && <span className="text-xs text-gray-500 ml-2">{d.属性}</span>}</div><span className="font-mono text-sm text-blue-600">¥{(d.月額売上 || 0).toLocaleString()}/月</span></div>
                </button>
              ))}</div>
            )}
            <div className="flex justify-end mt-4"><button onClick={() => setShowDealPicker(false)} className="px-4 py-2 text-sm text-gray-600">閉じる</button></div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6"><div><h2 className="text-lg font-bold">{detail.件名}</h2><p className="text-sm text-gray-500 font-mono">{detail.invoice_no}</p></div><span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[detail.ステータス]}`}>{detail.ステータス}</span></div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6"><div><p className="text-gray-500">クライアント</p><p className="font-medium">{detail.client_name || "-"}</p></div><div><p className="text-gray-500">発行日</p><p className="font-medium">{detail.発行日}</p></div><div><p className="text-gray-500">支払期限</p><p className="font-medium">{detail.支払期限}</p></div></div>
            {detail.items && detail.items.length > 0 && (
              <table className="w-full text-sm mb-4"><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left font-medium">項目名</th><th className="px-3 py-2 text-right font-medium">数量</th><th className="px-3 py-2 text-right font-medium">単価</th><th className="px-3 py-2 text-right font-medium">金額</th></tr></thead>
              <tbody className="divide-y">{detail.items.map((item, i) => (<tr key={i}><td className="px-3 py-2">{item.項目名}</td><td className="px-3 py-2 text-right">{item.数量}</td><td className="px-3 py-2 text-right">{fmt(Number(item.単価))}</td><td className="px-3 py-2 text-right">{fmt(Number(item.金額))}</td></tr>))}</tbody></table>
            )}
            <div className="border-t pt-4 space-y-1 text-sm"><div className="flex justify-between"><span className="text-gray-500">小計</span><span>{fmt(Number(detail.小計))}</span></div><div className="flex justify-between"><span className="text-gray-500">消費税（{Math.round(Number(detail.税率) * 100)}%）</span><span>{fmt(Number(detail.税額))}</span></div><div className="flex justify-between font-bold text-base pt-2 border-t"><span>合計</span><span>{fmt(Number(detail.合計))}</span></div></div>
            <div className="flex items-center justify-between mt-6">
              <div className="flex gap-2"><button onClick={() => downloadPdf(detail, "税抜")} disabled={pdfLoading === detail.id} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">PDF(税抜)</button><button onClick={() => downloadPdf(detail, "税込")} disabled={pdfLoading === detail.id} className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">PDF(税込)</button></div>
              <button onClick={() => setDetail(null)} className="px-4 py-2 text-sm text-gray-600">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editing.id ? "請求書編集" : "新規請求書"}</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-medium text-gray-500">請求形式:</span>
                <div className="flex bg-white rounded-lg border p-0.5">
                  <button onClick={() => setEditing({ ...editing, taxMode: "税抜" })} className={`px-3 py-1 text-sm rounded-md transition ${(editing.taxMode || "税抜") === "税抜" ? "bg-blue-600 text-white" : "text-gray-600"}`}>税抜</button>
                  <button onClick={() => setEditing({ ...editing, taxMode: "税込" })} className={`px-3 py-1 text-sm rounded-md transition ${editing.taxMode === "税込" ? "bg-orange-600 text-white" : "text-gray-600"}`}>税込</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">クライアント</label><select value={editing.client_id || 0} onChange={(e) => setEditing({...editing, client_id: Number(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm"><option value={0}>-- 選択 --</option>{clients.map(c => <option key={c.id} value={c.id}>{c.企業名}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">ステータス</label><select value={editing.ステータス || "下書き"} onChange={(e) => setEditing({...editing, ステータス: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm">{APP_CONFIG.invoiceStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">件名 *</label><input value={editing.件名 || ""} onChange={(e) => setEditing({...editing, 件名: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">発行日</label><input type="date" value={editing.発行日 || ""} onChange={(e) => setEditing({...editing, 発行日: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">支払期限</label><input type="date" value={editing.支払期限 || ""} onChange={(e) => setEditing({...editing, 支払期限: e.target.value})} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">明細</label>
                <div className="space-y-2">
                  {editing.items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <input value={item.項目名} onChange={(e) => { const items = [...editing.items]; items[i] = {...items[i], 項目名: e.target.value}; setEditing({...editing, items}); }} className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="項目名" />
                      <input type="number" value={item.数量 || ""} onChange={(e) => { const items = [...editing.items]; const qty = parseInt(e.target.value) || 0; items[i] = {...items[i], 数量: qty, 金額: qty * (items[i].単価 || 0)}; setEditing({...editing, items}); }} className="w-20 border rounded-lg px-3 py-2 text-sm text-right" placeholder="数量" />
                      <input type="number" value={item.単価 || ""} onChange={(e) => { const items = [...editing.items]; const price = parseInt(e.target.value) || 0; items[i] = {...items[i], 単価: price, 金額: (items[i].数量 || 1) * price}; setEditing({...editing, items}); }} className="w-28 border rounded-lg px-3 py-2 text-sm text-right" placeholder="単価" />
                      <span className="w-24 py-2 text-sm text-right text-gray-600">{fmt(item.金額)}</span>
                      <button onClick={() => { const items = editing.items.filter((_, j) => j !== i); setEditing({...editing, items: items.length > 0 ? items : [{ 項目名: "", 数量: 1, 単価: 0, 金額: 0 }]}); }} className="text-gray-400 hover:text-red-500 py-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setEditing({...editing, items: [...editing.items, { 項目名: "", 数量: 1, 単価: 0, 金額: 0 }]})} className="mt-2 text-sm text-blue-600">+ 明細を追加</button>
              </div>
              {(() => { const taxMode = editing.taxMode || "税抜"; const subtotal = editing.items.reduce((sum, item) => sum + (item.数量 || 1) * (item.単価 || 0), 0); const taxRate = editing.税率 ?? 0.1; const tax = Math.floor(subtotal * taxRate); const total = taxMode === "税抜" ? subtotal + tax : subtotal; return (
                <div className="border-t pt-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">{taxMode === "税抜" ? "小計" : "税抜金額"}</span><span>{fmt(taxMode === "税抜" ? subtotal : Math.floor(subtotal / (1 + taxRate)))}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">消費税（{Math.round(taxRate * 100)}%）</span><span>{fmt(taxMode === "税抜" ? tax : Math.floor(subtotal - subtotal / (1 + taxRate)))}</span></div>
                  <div className="flex justify-between font-bold text-base pt-2 border-t"><span>{taxMode === "税抜" ? "合計（税込）" : "合計"}</span><span>{fmt(total)}</span></div>
                </div>
              ); })()}
              <div><label className="block text-xs font-medium text-gray-500 mb-1">備考</label><textarea value={editing.備考 || ""} onChange={(e) => setEditing({...editing, 備考: e.target.value})} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-4"><button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600">キャンセル</button><button onClick={saveInvoice} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
