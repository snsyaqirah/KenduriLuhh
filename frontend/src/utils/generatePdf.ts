import jsPDF from 'jspdf';
import type { ParsedOutput } from './parseMessages';

function fmt(n: number | null): string {
  if (n === null) return '—';
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateQuotationPdf(data: ParsedOutput, mode: 'katering' | 'rewang', language: 'ms' | 'en' = 'ms') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 20;
  const col2 = 130;
  let y = 20;

  const line = (text: string, size = 11, style: 'normal' | 'bold' = 'normal') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    doc.text(text, margin, y);
    y += size * 0.5 + 2;
  };

  const divider = () => {
    doc.setDrawColor(220, 220, 215);
    doc.line(margin, y, W - margin, y);
    y += 4;
  };

  const keyval = (key: string, value: string, bold = false) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(key, margin, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(value, col2, y);
    y += 6;
  };

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, W, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('KenduriLuhh', margin, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const locale = language === 'ms' ? 'ms-MY' : 'en-MY';
  const subtitle = mode === 'katering'
    ? (language === 'en' ? 'Catering Quotation' : 'Sebut Harga Katering')
    : (language === 'en' ? 'Rewang Shopping Summary' : 'Ringkasan Belian Rewang');
  doc.text(subtitle, margin, 22);
  doc.text(new Date().toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' }), W - margin, 22, { align: 'right' });

  y = 40;
  doc.setTextColor(30, 30, 30);

  // ── Summary ───────────────────────────────────────────────────────────────
  line(mode === 'katering' ? 'QUOTATION SUMMARY' : 'REWANG SUMMARY', 13, 'bold');
  divider();

  if (data.totalPax) keyval('Number of Guests:', `${data.totalPax} pax`);
  if (data.budget?.perHead) keyval('Cost Per Head:', fmt(data.budget.perHead));
  if (mode === 'katering' && data.budget?.quotation) {
    keyval('QUOTATION PRICE:', fmt(data.budget.quotation), true);
  } else if (data.budget?.subtotal) {
    keyval('Total Cost:', fmt(data.budget.subtotal), true);
  }
  if (data.budget) {
    keyval('Budget Status:', data.budget.isApproved ? '✓ Approved' : '✗ Over Budget');
  }
  y += 4;

  // ── Menu ──────────────────────────────────────────────────────────────────
  if (data.menuItems.length > 0) {
    line('CONFIRMED MENU', 12, 'bold');
    divider();
    data.menuItems.forEach((item, i) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${i + 1}.  ${item}`, margin + 4, y);
      y += 6;
    });
    y += 4;
  }

  // ── Cost Breakdown ────────────────────────────────────────────────────────
  if (data.budget) {
    line('COST BREAKDOWN', 12, 'bold');
    divider();
    const rows = [
      ['Ingredient Cost', fmt(data.budget.rawMaterial)],
      ['Overhead (15%)', fmt(data.budget.overhead)],
      ['Labour', fmt(data.budget.labour)],
      ['Transport', fmt(data.budget.transport)],
    ].filter(([, v]) => v !== fmt(null));

    rows.forEach(([k, v]) => keyval(k, v));

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Cost', margin, y);
    doc.text(fmt(data.budget.subtotal), col2, y);
    y += 6;

    if (mode === 'katering' && data.budget.marginRm) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Profit Margin (${data.budget.marginPct ?? ''}%)`, margin, y);
      doc.text(fmt(data.budget.marginRm), col2, y);
      y += 6;
    }
    if (mode === 'katering' && data.budget.quotation) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('QUOTATION PRICE', margin, y);
      doc.text(fmt(data.budget.quotation), col2, y);
      doc.setTextColor(30, 30, 30);
      y += 6;
    }
    y += 4;
  }

  // ── Shopping list (Rewang) ────────────────────────────────────────────────
  if (mode === 'rewang' && data.shoppingLines.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    line('SHOPPING LIST', 12, 'bold');
    divider();
    data.shoppingLines.forEach((item) => {
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`☐  ${item}`, margin + 2, y);
      y += 5.5;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 4;
  }

  // ── Logistics ─────────────────────────────────────────────────────────────
  if (data.logistics.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    line('LOGISTICS TIMELINE', 12, 'bold');
    divider();
    data.logistics.forEach((ev) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${ev.key} — ${ev.label}${ev.date ? ` (${ev.date})` : ''}`, margin, y);
      y += 5.5;
      if (ev.tasks) {
        const wrapped = doc.splitTextToSize(ev.tasks, W - margin * 2 - 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(wrapped, margin + 4, y);
        y += wrapped.length * 4.5 + 3;
      }
      if (y > 270) { doc.addPage(); y = 20; }
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 155);
    doc.text('Generated by KenduriLuhh AI · Code; Without Barriers Hackathon 2026', margin, 290);
    doc.text(`Page ${i} / ${totalPages}`, W - margin, 290, { align: 'right' });
  }

  const filename = mode === 'katering' ? 'KenduriLuhh_Quotation.pdf' : 'KenduriLuhh_ShoppingList.pdf';
  doc.save(filename);
}
