import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CheckCircle2, FileDown, Home, Printer } from 'lucide-react';
import { VoteRecord } from '../types';
import { KpuLogoSvg } from './CivicArt';
import { generateVoteReceiptPdf } from '../utils/pdfGenerator';

interface NotificationPageProps {
  voteRecord: VoteRecord;
  sheetsSynced: boolean;
  onReturnToDashboard: () => void;
}

export const NotificationPage: React.FC<NotificationPageProps> = ({
  voteRecord,
  sheetsSynced,
  onReturnToDashboard,
}) => {
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(
      JSON.stringify({
        id: voteRecord.idSuara,
        kodeQR: voteRecord.kodeQR,
        kategori: voteRecord.kategoriSah,
        waktu: voteRecord.waktu,
        barcode: voteRecord.barcodeValue,
      }),
      {
        width: 260,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      }
    )
      .then((url) => setQrImageUrl(url))
      .catch((err) => console.error('QR generation failed:', err));
  }, [voteRecord]);

  const handlePrintToPrinter = () => {
    const handleAfterPrint = () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      onReturnToDashboard();
    };
    window.addEventListener('afterprint', handleAfterPrint);
    window.print();
  };

  const handleSavePdf = async () => {
    setIsExportingPdf(true);
    try {
      await generateVoteReceiptPdf(voteRecord);
      // After saving PDF to device, return to Dashboard as required
      setTimeout(() => {
        onReturnToDashboard();
      }, 450);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Generate deterministic visual barcode bars from barcodeValue
  const barcodeBars = Array.from(voteRecord.barcodeValue).flatMap((ch, idx) => {
    const code = ch.charCodeAt(0);
    return [
      { key: `${idx}-a`, width: (code % 3) + 2, dark: true },
      { key: `${idx}-b`, width: ((code >> 2) % 2) + 1, dark: false },
      { key: `${idx}-c`, width: ((code >> 4) % 2) + 1, dark: true },
      { key: `${idx}-d`, width: 2, dark: false },
    ];
  });

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl bg-white border-2 border-slate-300 shadow-sm overflow-hidden">
        {/* Success Notification Header */}
        <header className="border-b border-slate-200 bg-emerald-50 px-6 py-6 sm:px-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Data Anda Sudah Tersimpan
          </h1>
          <p className="mt-1.5 text-sm text-emerald-800 font-medium">
            {sheetsSynced
              ? 'Suara Anda telah berhasil dicatat ke database Google Sheets.'
              : 'Suara Anda telah berhasil disimpan pada sesi pemilihan.'}
          </p>
        </header>

        {/* Printable Receipt Area with Barcode */}
        <section className="p-6 sm:p-8 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <KpuLogoSvg className="h-10 w-10 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 font-display">
                    BUKTI PEMILIHAN KEPALA DESA
                  </p>
                  <p className="text-xs text-slate-600">
                    Desa Pamanukan Hilir · Kec. Pamanukan (2026–2034)
                  </p>
                </div>
              </div>
              <span className="font-mono-code text-xs font-bold text-slate-700">
                {voteRecord.idSuara}
              </span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Kode QR Pemilih</dt>
                <dd className="font-mono-code font-semibold text-slate-900">{voteRecord.kodeQR}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Waktu Tercatat</dt>
                <dd className="font-mono-code font-semibold text-slate-900">{voteRecord.waktu}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Kategori Suara</dt>
                <dd
                  className={`font-bold ${
                    voteRecord.kategoriSah === 'Suara Sah' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {voteRecord.kategoriSah}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Nomor / Pilihan</dt>
                <dd className="font-bold text-slate-900">
                  {voteRecord.nomorCalon !== '-'
                    ? `No. ${voteRecord.nomorCalon} · ${voteRecord.pilihan}`
                    : voteRecord.pilihan}
                </dd>
              </div>
            </dl>

            {/* Barcode & QR Code Output */}
            <div className="pt-4 border-t border-slate-200 flex flex-col items-center gap-4 bg-white rounded-lg p-4 border">
              {qrImageUrl && (
                <img
                  src={qrImageUrl}
                  alt={`QR Bukti Suara ${voteRecord.barcodeValue}`}
                  className="h-36 w-36 object-contain"
                />
              )}

              {/* Linear Barcode */}
              <div className="flex flex-col items-center">
                <div
                  className="flex items-stretch h-12 bg-white px-3 py-1 border border-slate-200 rounded-md"
                  aria-label={`Barcode ${voteRecord.barcodeValue}`}
                >
                  {barcodeBars.map((bar) => (
                    <span
                      key={bar.key}
                      style={{ width: `${bar.width}px` }}
                      className={bar.dark ? 'bg-slate-900 h-full block' : 'bg-white h-full block'}
                    />
                  ))}
                </div>
                <span className="mt-1.5 font-mono-code text-xs font-bold tracking-widest text-slate-800">
                  {voteRecord.barcodeValue}
                </span>
              </div>
            </div>
          </div>

          {/* Print & PDF Actions (hidden during print) */}
          <div className="no-print space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handlePrintToPrinter}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Printer className="h-4 w-4" />
                Cetak ke Printer
              </button>

              <button
                type="button"
                onClick={handleSavePdf}
                disabled={isExportingPdf}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <FileDown className="h-4 w-4" />
                {isExportingPdf ? 'Menyimpan PDF...' : 'Cetak ke File PDF'}
              </button>
            </div>

            <button
              type="button"
              onClick={onReturnToDashboard}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Home className="h-4 w-4" />
              Selesai & Kembali ke Dashboard
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
