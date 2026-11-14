import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { VoteRecord, VoterQR } from '../types';

export async function generateVoterQRsPdf(voters: VoterQR[]): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const drawHeader = (pageNum: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('KARTU QR CODE PEMILIH — PILKADES PAMANUKAN HILIR', pageWidth / 2, 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Periode Tahun 2026–2034 · Kecamatan Pamanukan · Halaman ' + pageNum, pageWidth / 2, 20, { align: 'center' });
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 24, pageWidth - 14, 24);
  };

  let pageNum = 1;
  drawHeader(pageNum);

  const colWidth = 86;
  const rowHeight = 56;
  const startX = 14;
  const startY = 30;
  const gapX = 10;
  const gapY = 6;

  for (let i = 0; i < voters.length; i++) {
    const idxOnPage = i % 8;
    if (i > 0 && idxOnPage === 0) {
      doc.addPage();
      pageNum += 1;
      drawHeader(pageNum);
    }

    const col = idxOnPage % 2;
    const row = Math.floor(idxOnPage / 2);
    const x = startX + col * (colWidth + gapX);
    const y = startY + row * (rowHeight + gapY);

    if (y + rowHeight > pageHeight - 10) {
      doc.addPage();
      pageNum += 1;
      drawHeader(pageNum);
    }

    const voter = voters[i];
    const qrDataUrl = await QRCode.toDataURL(voter.kodeQR, {
      width: 240,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    // Card border
    doc.setDrawColor(148, 163, 184);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, colWidth, rowHeight, 3, 3, 'FD');

    // Top red accent strip
    doc.setFillColor(185, 28, 28);
    doc.rect(x, y, colWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('KARTU VERIFIKASI PEMILIH · PAMANUKAN HILIR', x + 3, y + 4.8);

    // QR Code image
    doc.addImage(qrDataUrl, 'PNG', x + 4, y + 11, 34, 34);

    // Voter details
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(voter.namaPemilih.slice(0, 22), x + 41, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`NIK: ${voter.nik || '-'}`, x + 41, y + 23);
    doc.text(`Wilayah: ${voter.rtRw || '-'}`, x + 41, y + 29);
    doc.text(`Status: ${voter.statusPilih}`, x + 41, y + 35);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(voter.kodeQR, x + 41, y + 43);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Tunjukkan QR ini pada pemindai TPS', x + 4, y + 51.5);
  }

  doc.save('QR-Pemilih-Pamanukan-Hilir-2026-2034.pdf');
}

export async function generateVoteReceiptPdf(vote: VoteRecord): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Official border frame
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, pageWidth - 16, 194);

  // Header band
  doc.setFillColor(185, 28, 28);
  doc.rect(8, 8, pageWidth - 16, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('PANITIA PEMILIHAN KEPALA DESA', pageWidth / 2, 17, { align: 'center' });
  doc.setFontSize(10);
  doc.text('DESA PAMANUKAN HILIR · KEC. PAMANUKAN (2026–2034)', pageWidth / 2, 24, { align: 'center' });

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('BUKTI SIMPAN SUARA PEMILIHAN', pageWidth / 2, 43, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 163, 74);
  doc.text('Status: DATA SUARA ANDA SUDAH TERSIMPAN', pageWidth / 2, 50, { align: 'center' });

  // Details box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 57, pageWidth - 30, 56, 2, 2, 'FD');

  const rows: Array<[string, string]> = [
    ['ID Transaksi Suara', vote.idSuara],
    ['Waktu Tercatat', vote.waktu],
    ['Kode QR Pemilih', vote.kodeQR],
    ['Kategori Suara', vote.kategoriSah],
    ['Nomor Calon', vote.nomorCalon],
    ['Pilihan Tercatat', vote.pilihan],
  ];

  let ry = 66;
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 20, ry);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${val}`, 64, ry);
    ry += 8.5;
  });

  // QR Code & Linear Barcode Representation
  const qrDataUrl = await QRCode.toDataURL(
    JSON.stringify({
      id: vote.idSuara,
      kodeQR: vote.kodeQR,
      kategori: vote.kategoriSah,
      waktu: vote.waktu,
      barcode: vote.barcodeValue,
    }),
    {
      width: 280,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }
  );

  doc.addImage(qrDataUrl, 'PNG', pageWidth / 2 - 22, 120, 44, 44);

  // Draw clean linear barcode bars below QR
  const barStartX = 28;
  const barWidthTotal = pageWidth - 56;
  const barY = 170;
  const barH = 12;
  doc.setFillColor(15, 23, 42);
  let cursor = barStartX;
  for (let i = 0; i < vote.barcodeValue.length; i++) {
    const code = vote.barcodeValue.charCodeAt(i);
    const step = barWidthTotal / (vote.barcodeValue.length * 2.2);
    const w1 = ((code % 3) + 1) * (step * 0.45);
    const gap = (((code >> 2) % 2) + 1) * (step * 0.45);
    if (cursor + w1 < barStartX + barWidthTotal) {
      doc.rect(cursor, barY, w1, barH, 'F');
    }
    cursor += w1 + gap;
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(vote.barcodeValue, pageWidth / 2, 187, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Terima kasih telah menggunakan hak pilih Anda secara langsung, umum, bebas, dan rahasia.', pageWidth / 2, 196, {
    align: 'center',
  });

  doc.save(`Bukti-Pilih-${vote.idSuara}.pdf`);
}
