import { NextRequest, NextResponse } from "next/server";
import { dbAll } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { APP_CONFIG } from "@/lib/config";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未認証" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  const taxMode = req.nextUrl.searchParams.get("taxMode") || "税抜";

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const invoices = await dbAll(
    `SELECT i.*, c.企業名 as client_name, c.住所 as client_address FROM invoices i
     LEFT JOIN clients c ON i.client_id = c.id WHERE i.id = ?`,
    [Number(id)]
  );
  if (invoices.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  const invoice = invoices[0];
  const items = await dbAll("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id", [Number(id)]);

  const subtotal = Number(invoice.小計);
  const taxRate = Number(invoice.税率);
  const tax = Number(invoice.税額);
  const total = Number(invoice.合計);
  const isTaxInc = taxMode === "税込";

  const itemRows = items.map(item => {
    const qty = Number(item.数量);
    const unitPrice = Number(item.単価);
    const amount = Number(item.金額);
    if (isTaxInc) {
      return { name: String(item.項目名), qty, unitPrice: Math.round(unitPrice * (1 + taxRate)), amount: Math.round(amount * (1 + taxRate)) };
    }
    return { name: String(item.項目名), qty, unitPrice, amount };
  }).filter(item => item.name);

  const displayTotal = total;
  const displaySubtotal = isTaxInc ? total : subtotal;
  const displayTax = isTaxInc ? 0 : tax;

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFontSize(22);
  doc.setTextColor(33, 33, 33);
  doc.text(isTaxInc ? "INVOICE (Tax Incl.)" : "INVOICE", 105, 25, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`No. ${String(invoice.invoice_no)}`, 190, 25, { align: "right" });

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(20, 30, 190, 30);

  doc.setFontSize(11);
  doc.setTextColor(33, 33, 33);
  doc.text(String(invoice.client_name || "---") + " Sama", 20, 42);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  if (invoice.client_address) doc.text(String(invoice.client_address), 20, 48);

  doc.text("Issue Date:", 140, 42);
  doc.text(String(invoice.発行日), 170, 42);
  doc.text("Due Date:", 140, 48);
  doc.text(String(invoice.支払期限 || "-"), 170, 48);

  doc.setFontSize(10);
  doc.setTextColor(33, 33, 33);
  doc.text("Subject: " + String(invoice.件名), 20, 58);

  const tableData = itemRows.map((item, i) => [
    String(i + 1), item.name, String(item.qty),
    "\\" + item.unitPrice.toLocaleString(), "\\" + item.amount.toLocaleString(),
  ]);

  autoTable(doc, {
    startY: 65,
    head: [["#", "Description", "Qty", "Unit Price", "Amount"]],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" }, 1: { cellWidth: 80 },
      2: { cellWidth: 20, halign: "right" }, 3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    theme: "grid",
    margin: { left: 20, right: 20 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 120;
  const totalsY = finalY + 10;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);

  if (isTaxInc) {
    doc.text("Total (Tax Included):", 140, totalsY);
    doc.setFontSize(13);
    doc.setTextColor(33, 33, 33);
    doc.text("\\" + displayTotal.toLocaleString(), 190, totalsY, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`(Includes ${Math.round(taxRate * 100)}% tax: \\${tax.toLocaleString()})`, 190, totalsY + 6, { align: "right" });
  } else {
    doc.text("Subtotal:", 140, totalsY);
    doc.text("\\" + displaySubtotal.toLocaleString(), 190, totalsY, { align: "right" });
    doc.text(`Tax (${Math.round(taxRate * 100)}%):`, 140, totalsY + 6);
    doc.text("\\" + displayTax.toLocaleString(), 190, totalsY + 6, { align: "right" });
    doc.setDrawColor(200, 200, 200);
    doc.line(140, totalsY + 9, 190, totalsY + 9);
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.text("Total:", 140, totalsY + 15);
    doc.text("\\" + displayTotal.toLocaleString(), 190, totalsY + 15, { align: "right" });
  }

  if (invoice.備考) {
    const remarkY = isTaxInc ? totalsY + 16 : totalsY + 25;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Remarks:", 20, remarkY);
    doc.text(String(invoice.備考), 20, remarkY + 5);
  }

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(APP_CONFIG.invoice.companyName, 105, 280, { align: "center" });

  const pdfBuffer = doc.output("arraybuffer");

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${String(invoice.invoice_no)}_${taxMode}.pdf"`,
    },
  });
}
