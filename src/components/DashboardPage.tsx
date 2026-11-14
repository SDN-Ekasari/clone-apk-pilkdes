import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Camera,
  Database,
  FileDown,
  FileSpreadsheet,
  KeyRound,
  LogOut,
  Play,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  BarChart3,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import {
  Candidate,
  DriveSpreadsheetItem,
  SpreadsheetInfo,
  VoteRecord,
  VoterQR,
} from '../types';
import { CandidatePhoto, KpuLogoSvg } from './CivicArt';
import { generateVoterQRsPdf } from '../utils/pdfGenerator';

interface DashboardPageProps {
  candidates: Candidate[];
  voters: VoterQR[];
  votes: VoteRecord[];
  googleUser: FirebaseUser | null;
  hasGoogleToken: boolean;
  isGoogleLoggingIn: boolean;
  spreadsheetInfo: SpreadsheetInfo | null;
  availableSpreadsheets: DriveSpreadsheetItem[];
  isSyncingSheets: boolean;
  sheetsError: string | null;
  scannerError: string | null;
  isAdminAuthenticated: boolean;
  onAdminLoginSuccess: () => void;
  onAdminLogout: () => void;
  onOpenScanner: () => void;
  onStartDemoVoting: () => void;
  onGoogleSignIn: () => void;
  onGoogleLogout: () => void;
  onCreateSpreadsheet: () => void;
  onConnectSpreadsheet: (spreadsheetIdOrUrl: string) => void;
  onRefreshFromSheets: () => void;
  onSaveCandidate: (candidate: Candidate, isEdit: boolean) => void;
  onDeleteCandidate: (candidateId: string) => void;
  onAddVoter: (voter: VoterQR) => void;
  onDeleteVoter: (kodeQR: string) => void;
}

type AdminTab = 'calon' | 'qr_pemilih' | 'rekap';

const QRThumb: React.FC<{ value: string }> = ({ value }) => {
  const [src, setSrc] = useState<string>('');
  useEffect(() => {
    QRCode.toDataURL(value, { width: 120, margin: 1 })
      .then(setSrc)
      .catch(() => {});
  }, [value]);

  if (!src) return <div className="h-14 w-14 bg-slate-100 rounded border border-slate-200" />;
  return <img src={src} alt={`QR ${value}`} className="h-14 w-14 rounded border border-slate-200 bg-white" />;
};

function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 240;
        const maxH = 320;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas tidak tersedia'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => reject(new Error('Gagal memuat file gambar'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  candidates,
  voters,
  votes,
  googleUser,
  hasGoogleToken,
  isGoogleLoggingIn,
  spreadsheetInfo,
  availableSpreadsheets,
  isSyncingSheets,
  sheetsError,
  scannerError,
  isAdminAuthenticated,
  onAdminLoginSuccess,
  onAdminLogout,
  onOpenScanner,
  onStartDemoVoting,
  onGoogleSignIn,
  onGoogleLogout,
  onCreateSpreadsheet,
  onConnectSpreadsheet,
  onRefreshFromSheets,
  onSaveCandidate,
  onDeleteCandidate,
  onAddVoter,
  onDeleteVoter,
}) => {
  // Admin Login state
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('calon');
  const [showAdminSection, setShowAdminSection] = useState<boolean>(isAdminAuthenticated);

  // Google Sheet ID input
  const [sheetIdInput, setSheetIdInput] = useState('');

  // Candidate Form state
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [candNomor, setCandNomor] = useState<string>(String(candidates.length + 1));
  const [candNama, setCandNama] = useState('');
  const [candVisi, setCandVisi] = useState('');
  const [candPhotoUrl, setCandPhotoUrl] = useState('');
  const [candFormError, setCandFormError] = useState<string | null>(null);

  // Voter QR Form state
  const [voterName, setVoterName] = useState('');
  const [voterNik, setVoterNik] = useState('');
  const [voterRtRw, setVoterRtRw] = useState('RT 01 / RW 01');
  const [voterSearch, setVoterSearch] = useState('');
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

  // Print-ready QR sheet state
  const [printQRMap, setPrintQRMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setShowAdminSection(isAdminAuthenticated);
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (!editingCandidateId) {
      const maxNo = candidates.reduce((m, c) => Math.max(m, c.nomorUrut), 0);
      setCandNomor(String(maxNo + 1));
    }
  }, [candidates, editingCandidateId]);

  useEffect(() => {
    let active = true;
    Promise.all(
      voters.map(async (v) => {
        const url = await QRCode.toDataURL(v.kodeQR, { width: 180, margin: 1 });
        return [v.kodeQR, url] as const;
      })
    ).then((pairs) => {
      if (active) {
        setPrintQRMap(Object.fromEntries(pairs));
      }
    });
    return () => {
      active = false;
    };
  }, [voters]);

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser === 'Admin' && adminPass === 'Admin12345') {
      setLoginError(null);
      setAdminPass('');
      onAdminLoginSuccess();
    } else {
      setLoginError('User dan password salah');
    }
  };

  const handleEditCandidateClick = (c: Candidate) => {
    setEditingCandidateId(c.id);
    setCandNomor(String(c.nomorUrut));
    setCandNama(c.namaLengkap);
    setCandVisi(c.visiSingkat || '');
    setCandPhotoUrl(c.photoUrl);
    setCandFormError(null);
  };

  const handleResetCandidateForm = () => {
    setEditingCandidateId(null);
    const maxNo = candidates.reduce((m, c) => Math.max(m, c.nomorUrut), 0);
    setCandNomor(String(maxNo + 1));
    setCandNama('');
    setCandVisi('');
    setCandPhotoUrl('');
    setCandFormError(null);
  };

  const handleCandidatePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setCandPhotoUrl(dataUrl);
      setCandFormError(null);
    } catch {
      setCandFormError('Gagal memproses file foto kandidat.');
    }
    e.target.value = '';
  };

  const handleCandidateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(candNomor);
    if (!candNama.trim()) {
      setCandFormError('Nama lengkap calon wajib diisi.');
      return;
    }
    if (!Number.isInteger(num) || num <= 0) {
      setCandFormError('Nomor urut calon harus berupa angka positif.');
      return;
    }

    const existing = editingCandidateId
      ? candidates.find((c) => c.id === editingCandidateId)
      : undefined;

    const newCandidate: Candidate = {
      id: existing ? existing.id : `calon-${Date.now()}`,
      nomorUrut: num,
      namaLengkap: candNama.trim().toUpperCase(),
      photoType: candPhotoUrl
        ? existing?.photoType === 'uploaded_3' && candPhotoUrl === existing.photoUrl
          ? 'uploaded_3'
          : 'custom_url'
        : existing?.photoType || (num === 1 ? 'preset_1' : num === 2 ? 'preset_2' : 'custom_url'),
      photoUrl: candPhotoUrl.trim(),
      visiSingkat: candVisi.trim(),
    };

    onSaveCandidate(newCandidate, Boolean(editingCandidateId));
    handleResetCandidateForm();
  };

  const handleVoterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterName.trim()) return;
    const seq = String(voters.length + 1).padStart(3, '0');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const kodeQR = `PILKADES-2026-${seq}-${rand}`;

    onAddVoter({
      kodeQR,
      namaPemilih: voterName.trim(),
      nik: voterNik.trim() || '-',
      rtRw: voterRtRw.trim() || 'Desa Pamanukan Hilir',
      statusPilih: 'Belum Memilih',
      waktuScan: '',
    });

    setVoterName('');
    setVoterNik('');
  };

  const handlePrintVotersToPrinter = () => {
    window.print();
  };

  const handleExportVotersToPdf = async () => {
    if (voters.length === 0) return;
    setIsPrintingPdf(true);
    try {
      await generateVoterQRsPdf(voters);
    } finally {
      setIsPrintingPdf(false);
    }
  };

  const filteredVoters = voters.filter(
    (v) =>
      v.namaPemilih.toLowerCase().includes(voterSearch.toLowerCase()) ||
      v.kodeQR.toLowerCase().includes(voterSearch.toLowerCase()) ||
      v.nik.toLowerCase().includes(voterSearch.toLowerCase())
  );

  // Tally vote statistics
  const totalVotes = votes.length;
  const invalidVotes = votes.filter((v) => v.kategoriSah === 'Suara Tidak Sah').length;
  const validVotes = votes.filter((v) => v.kategoriSah === 'Suara Sah').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Main Interactive App (Hidden during print of QR sheets) */}
      <div className="no-print">
        {/* Top Bar Contract: 3 zones */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
            {/* Zone 1: Brand Title */}
            <a
              href="#beranda"
              className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
            >
              Pilkades Pamanukan Hilir
            </a>

            {/* Zone 2: Clean single-line text nav links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <a
                href="#beranda"
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Beranda
              </a>
              <a
                href="#verifikasi-pemilih"
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Verifikasi QR
              </a>
              <a
                href="#menu-admin"
                onClick={() => setShowAdminSection(true)}
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Menu Admin
              </a>
              <a
                href="#kandidat"
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                Daftar Calon
              </a>
            </nav>

            {/* Zone 3: 1 Primary CTA */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenScanner}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Scan QR Pemilih
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          {/* Hero / Header Pemilihan */}
          <section
            id="beranda"
            className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8"
          >
            <div className="flex items-start gap-5 max-w-3xl">
              <KpuLogoSvg className="h-16 w-16 sm:h-20 sm:w-20 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-700 tracking-wide">
                  KECAMATAN PAMANUKAN · PERIODE TAHUN 2026–2034
                </p>
                <h1 className="mt-1.5 text-2xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight text-balance">
                  Aplikasi Tata Cara Pemilihan Kepala Desa Pamanukan Hilir
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                  Portal resmi pemungutan suara elektronik berbasis verifikasi QR Code pemilih, pencetakan kartu pemilih, bukti pemilihan barcode, serta sinkronisasi database Google Sheets.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>3 Calon Kepala Desa</span>
                  <span aria-hidden="true">·</span>
                  <span>{voters.length} Pemilih Terdaftar</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Database:{' '}
                    <strong className={spreadsheetInfo ? 'text-emerald-700' : 'text-slate-700'}>
                      {spreadsheetInfo ? `Google Sheets (${spreadsheetInfo.title})` : 'Sesi Lokal (Siap Dihubungkan ke Google Sheets)'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-64 shrink-0">
              <button
                type="button"
                onClick={onOpenScanner}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Camera className="h-4 w-4" />
                Verifikasi QR Pemilih
              </button>
              <button
                type="button"
                onClick={onStartDemoVoting}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="h-4 w-4" />
                Mode Demo Pemilihan
              </button>
            </div>
          </section>

          {/* Two Core Dashboard Portals: Verifikasi QR Pemilih & Login Admin */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Menu 1: Login Verifikasi QR Code Pemilih */}
            <div
              id="verifikasi-pemilih"
              className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 font-display">
                      Login Verifikasi QR Code Pemilih
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pindai kartu QR Code pemilih sebelum masuk ke bilik suara digital
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Mendukung pemindaian langsung menggunakan <strong>Kamera HD</strong>, <strong>HP Android (Google Lens)</strong>, <strong>Tablet Pintar</strong>, dan <strong>Kamera Laptop</strong>. Tersedia juga <strong>Mode Demo</strong> untuk simulasi langsung ke halaman pemilihan calon kepala desa.
                </p>

                {scannerError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {scannerError}
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">Contoh Kode QR Terdaftar (Siap Uji):</p>
                  <div className="flex flex-wrap gap-3 font-mono-code text-slate-700">
                    {voters.slice(0, 3).map((v) => (
                      <span key={v.kodeQR}>
                        {v.kodeQR} ({v.statusPilih})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Camera className="h-4 w-4" />
                  Scan Barcode / Google Lens
                </button>
                <button
                  type="button"
                  onClick={onStartDemoVoting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Play className="h-4 w-4" />
                  Mode Demo (Ke Halaman 2)
                </button>
              </div>
            </div>

            {/* Menu 2: Login Admin */}
            <div
              id="menu-admin"
              className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 flex flex-col justify-between space-y-6"
            >
              {!isAdminAuthenticated ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                        <KeyRound className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 font-display">
                          Menu Admin Panitia Pilkades
                        </h2>
                        <p className="text-xs text-slate-500">
                          Kelola calon, buat & cetak QR pemilih, dan koneksi database Google Sheets
                        </p>
                      </div>
                    </div>

                    {loginError && (
                      <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                      >
                        {loginError}
                      </div>
                    )}

                    <form id="admin-login-form" onSubmit={handleAdminLoginSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="admin-user" className="block text-xs font-semibold text-slate-700 mb-1.5">
                          User Admin
                        </label>
                        <input
                          id="admin-user"
                          type="text"
                          value={adminUser}
                          onChange={(e) => setAdminUser(e.target.value)}
                          placeholder="Masukkan User (Admin)"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="admin-pass" className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Password
                        </label>
                        <input
                          id="admin-pass"
                          type="password"
                          value={adminPass}
                          onChange={(e) => setAdminPass(e.target.value)}
                          placeholder="Masukkan Password"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        />
                      </div>
                    </form>
                  </div>

                  <button
                    type="submit"
                    form="admin-login-form"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <UserCheck className="h-4 w-4" />
                    Masuk Menu Admin
                  </button>
                </>
              ) : (
                <div className="flex flex-col justify-between h-full space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <UserCheck className="h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900 font-display">
                            Admin Aktif
                          </h2>
                          <p className="text-xs text-slate-600">
                            Panel pengelolaan calon, QR pemilih, dan Google Sheets terbuka di bawah.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">
                      Anda dapat menambah atau menghapus data calon, membuat kartu QR Code pemilih, mencetak ke printer atau file PDF, serta menghubungkan Google Sheets.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href="#panel-admin-lengkap"
                      onClick={() => setShowAdminSection(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap"
                    >
                      Buka Panel Admin
                    </a>
                    <button
                      type="button"
                      onClick={onAdminLogout}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar ke Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* FULL ADMIN WORKSPACE (Visible when Admin is authenticated) */}
          {isAdminAuthenticated && showAdminSection && (
            <section
              id="panel-admin-lengkap"
              className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs"
            >
              {/* Admin Header Bar */}
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 font-display">
                    Panel Administrasi Pilkades Pamanukan Hilir
                  </h2>
                  <p className="text-xs text-slate-600">
                    Kelola Calon · Pembuatan & Cetak QR Code Pemilih · Database Google Sheets
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onAdminLogout}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>

              {/* Google Sheets Connection Panel */}
              <div className="border-b border-slate-200 bg-white px-6 py-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-display">
                        Integrasi Database Google Sheets
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {hasGoogleToken && googleUser
                          ? `Terhubung sebagai ${googleUser.email || googleUser.displayName}.`
                          : 'Masuk dengan akun Google Anda untuk menyimpan & membaca data Calon, Pemilih QR, dan Suara secara langsung di Google Sheets.'}
                      </p>
                    </div>
                  </div>

                  {/* Official Sign in with Google button OR connected account controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    {!hasGoogleToken ? (
                      <button
                        type="button"
                        onClick={onGoogleSignIn}
                        disabled={isGoogleLoggingIn}
                        className="gsi-material-button"
                      >
                        <div className="gsi-material-button-state" />
                        <div className="gsi-material-button-content-wrapper">
                          <div className="gsi-material-button-icon">
                            <svg
                              version="1.1"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 48 48"
                              style={{ display: 'block' }}
                            >
                              <path
                                fill="#EA4335"
                                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                              />
                              <path
                                fill="#4285F4"
                                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                              />
                              <path
                                fill="#34A853"
                                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                              />
                              <path fill="none" d="M0 0h48v48H0z" />
                            </svg>
                          </div>
                          <span className="gsi-material-button-contents">
                            {isGoogleLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}
                          </span>
                        </div>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={onCreateSpreadsheet}
                          disabled={isSyncingSheets}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Buat Spreadsheet Baru
                        </button>
                        {spreadsheetInfo && (
                          <button
                            type="button"
                            onClick={onRefreshFromSheets}
                            disabled={isSyncingSheets}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                            Sinkronkan Data
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onGoogleLogout}
                          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Putus Akun Google
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {sheetsError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
                    {sheetsError}
                  </div>
                )}

                {hasGoogleToken && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                    {/* Connect Existing Spreadsheet */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (sheetIdInput.trim()) onConnectSpreadsheet(sheetIdInput);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={sheetIdInput}
                        onChange={(e) => setSheetIdInput(e.target.value)}
                        placeholder="Tempel URL atau ID Google Spreadsheet..."
                        className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={isSyncingSheets}
                        className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Hubungkan ID
                      </button>
                    </form>

                    {/* Select from existing app spreadsheets or view active */}
                    <div className="flex flex-wrap items-center gap-2">
                      {availableSpreadsheets.length > 0 && (
                        <select
                          value={spreadsheetInfo?.spreadsheetId || ''}
                          onChange={(e) => {
                            if (e.target.value) onConnectSpreadsheet(e.target.value);
                          }}
                          className="flex-1 min-w-48 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-700"
                          aria-label="Pilih Google Spreadsheet yang sudah ada"
                        >
                          <option value="">Pilih Spreadsheet Pilkades...</option>
                          {availableSpreadsheets.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {spreadsheetInfo && (
                        <a
                          href={spreadsheetInfo.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg whitespace-nowrap"
                        >
                          <Database className="h-3.5 w-3.5" />
                          Buka Google Sheet
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Sub-Navigation Tabs */}
              <div className="px-6 pt-4 border-b border-slate-200 flex flex-wrap items-center gap-2 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setActiveTab('calon')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'calon'
                      ? 'border-red-700 text-red-700 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Kelola Calon ({candidates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('qr_pemilih')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'qr_pemilih'
                      ? 'border-red-700 text-red-700 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                  QR Code Pemilih ({voters.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rekap')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'rekap'
                      ? 'border-red-700 text-red-700 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Rekapitulasi Suara ({votes.length})
                </button>
              </div>

              {/* TAB 1: Kelola Calon Kepala Desa */}
              {activeTab === 'calon' && (
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Input / Edit Calon Form */}
                  <form onSubmit={handleCandidateSubmit} className="lg:col-span-4 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 font-display">
                      {editingCandidateId ? 'Ubah Data Calon' : 'Input Data Calon Baru'}
                    </h3>

                    {candFormError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                        {candFormError}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nomor Urut Calon
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={candNomor}
                        onChange={(e) => setCandNomor(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-code"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Lengkap Calon
                      </label>
                      <input
                        type="text"
                        value={candNama}
                        onChange={(e) => setCandNama(e.target.value)}
                        placeholder="Contoh: UDIN JAMALUDIN"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Visi Singkat (Opsional)
                      </label>
                      <textarea
                        rows={2}
                        value={candVisi}
                        onChange={(e) => setCandVisi(e.target.value)}
                        placeholder="Visi pembangunan Desa Pamanukan Hilir..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Foto Calon (Unggah File atau URL)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCandidatePhotoUpload}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                      />
                      <input
                        type="text"
                        value={candPhotoUrl}
                        onChange={(e) => setCandPhotoUrl(e.target.value)}
                        placeholder="/assets/aistudio/... atau URL foto"
                        className="mt-2 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                      >
                        Simpan Data
                      </button>
                      {editingCandidateId && (
                        <button
                          type="button"
                          onClick={handleResetCandidateForm}
                          className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Saved Candidates Table */}
                  <div className="lg:col-span-8 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 font-display">
                      Data Calon Kepala Desa Tersimpan
                    </h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-3">No.</th>
                            <th className="px-4 py-3">Foto</th>
                            <th className="px-4 py-3">Nama Lengkap</th>
                            <th className="px-4 py-3">Keterangan</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {candidates.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-mono-code font-bold text-base text-slate-900">
                                {c.nomorUrut}
                              </td>
                              <td className="px-4 py-3">
                                <div className="h-14 w-11 rounded-md overflow-hidden border border-slate-200 bg-amber-300">
                                  <CandidatePhoto candidate={c} className="h-full w-full object-cover object-top" />
                                </div>
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900">
                                {c.namaLengkap}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                                {c.visiSingkat || 'Calon Kepala Desa Pamanukan Hilir'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditCandidateClick(c)}
                                    className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Calon"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteCandidate(c.id)}
                                    className="p-2 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Data Calon"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {candidates.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                                Belum ada data calon tersimpan.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Pembuatan & Pencetakan QR Code Pemilih */}
              {activeTab === 'qr_pemilih' && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Input QR Pemilih */}
                    <form onSubmit={handleVoterSubmit} className="lg:col-span-4 space-y-4">
                      <h3 className="text-base font-bold text-slate-900 font-display">
                        Buat QR Code Pemilih Baru
                      </h3>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nama Lengkap Pemilih
                        </label>
                        <input
                          type="text"
                          value={voterName}
                          onChange={(e) => setVoterName(e.target.value)}
                          placeholder="Contoh: H. Ahmad Sudrajat"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          NIK Pemilih
                        </label>
                        <input
                          type="text"
                          value={voterNik}
                          onChange={(e) => setVoterNik(e.target.value)}
                          placeholder="3213xxxxxxxxxxxx"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-code"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          RT / RW / TPS
                        </label>
                        <input
                          type="text"
                          value={voterRtRw}
                          onChange={(e) => setVoterRtRw(e.target.value)}
                          placeholder="RT 01 / RW 01 · TPS 01"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Simpan & Buat QR Pemilih
                      </button>
                    </form>

                    {/* Daftar & Aksi Cetak QR Pemilih */}
                    <div className="lg:col-span-8 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="relative flex-1 min-w-52">
                          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={voterSearch}
                            onChange={(e) => setVoterSearch(e.target.value)}
                            placeholder="Cari nama pemilih, NIK, atau kode QR..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePrintVotersToPrinter}
                            disabled={voters.length === 0}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                          >
                            <Printer className="h-4 w-4" />
                            Cetak ke Printer
                          </button>

                          <button
                            type="button"
                            onClick={handleExportVotersToPdf}
                            disabled={voters.length === 0 || isPrintingPdf}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                          >
                            <FileDown className="h-4 w-4" />
                            {isPrintingPdf ? 'Menyimpan PDF...' : 'Cetak ke File PDF'}
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                            <tr>
                              <th className="px-4 py-3">QR Code</th>
                              <th className="px-4 py-3">Kode & Nama Pemilih</th>
                              <th className="px-4 py-3">NIK / Wilayah</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Hapus</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {filteredVoters.map((v) => (
                              <tr key={v.kodeQR} className="hover:bg-slate-50/70">
                                <td className="px-4 py-2.5">
                                  <QRThumb value={v.kodeQR} />
                                </td>
                                <td className="px-4 py-2.5">
                                  <p className="font-bold text-slate-900">{v.namaPemilih}</p>
                                  <p className="font-mono-code text-xs text-slate-500">{v.kodeQR}</p>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-600">
                                  <p className="font-mono-code">{v.nik}</p>
                                  <p>{v.rtRw}</p>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`text-xs font-semibold ${
                                      v.statusPilih === 'Sudah Memilih'
                                        ? 'text-emerald-700'
                                        : 'text-slate-600'
                                    }`}
                                  >
                                    {v.statusPilih}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => onDeleteVoter(v.kodeQR)}
                                    className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus Data Pemilih"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {filteredVoters.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                                  Tidak ada data QR pemilih yang sesuai.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Rekapitulasi Suara */}
              {activeTab === 'rekap' && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">Total Suara Masuk</p>
                      <p className="mt-1 text-2xl font-extrabold text-slate-900 font-mono-code">
                        {totalVotes}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-medium text-emerald-700">Suara Sah</p>
                      <p className="mt-1 text-2xl font-extrabold text-emerald-800 font-mono-code">
                        {validVotes}
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-medium text-amber-800">Suara Tidak Sah / Blanko</p>
                      <p className="mt-1 text-2xl font-extrabold text-amber-900 font-mono-code">
                        {invalidVotes}
                      </p>
                    </div>
                  </div>

                  {/* Per-Candidate Tally */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {candidates.map((c) => {
                      const count = votes.filter(
                        (v) => v.kategoriSah === 'Suara Sah' && v.nomorCalon === String(c.nomorUrut)
                      ).length;
                      const pct = validVotes > 0 ? Math.round((count / validVotes) * 100) : 0;
                      return (
                        <div key={c.id} className="rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                          <div className="h-16 w-12 rounded-lg overflow-hidden border border-slate-200 bg-amber-300 shrink-0">
                            <CandidatePhoto candidate={c} className="h-full w-full object-cover object-top" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500">Calon No. {c.nomorUrut}</p>
                            <p className="font-bold text-slate-900 truncate">{c.namaLengkap}</p>
                            <p className="mt-1 text-sm font-mono-code font-bold text-blue-700">
                              {count} Suara ({pct}%)
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Log Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <tr>
                          <th className="px-4 py-3">ID Suara</th>
                          <th className="px-4 py-3">Waktu</th>
                          <th className="px-4 py-3">Kode QR</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3">Pilihan</th>
                          <th className="px-4 py-3">Barcode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {votes.map((v) => (
                          <tr key={v.idSuara}>
                            <td className="px-4 py-2.5 font-mono-code font-semibold">{v.idSuara}</td>
                            <td className="px-4 py-2.5 font-mono-code text-slate-600">{v.waktu}</td>
                            <td className="px-4 py-2.5 font-mono-code">{v.kodeQR}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`font-semibold ${
                                  v.kategoriSah === 'Suara Sah' ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                              >
                                {v.kategoriSah}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-900">{v.pilihan}</td>
                            <td className="px-4 py-2.5 font-mono-code text-slate-600">{v.barcodeValue}</td>
                          </tr>
                        ))}
                        {votes.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                              Belum ada suara masuk tercatat.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Candidate Showcase Preview on Dashboard */}
          <section id="kandidat" className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 font-display">
                  Daftar Calon Kepala Desa Pamanukan Hilir
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Periode Tahun 2026–2034 · Kecamatan Pamanukan
                </p>
              </div>
              <button
                type="button"
                onClick={onStartDemoVoting}
                className="text-sm font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-4 cursor-pointer"
              >
                Simulasi Surat Suara (Mode Demo)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {candidates.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-3/4 w-full bg-amber-300 border-b border-slate-200">
                    <CandidatePhoto
                      candidate={c}
                      className="h-full w-full object-cover object-top"
                    />
                    <div className="absolute top-3 left-3 flex h-11 min-w-11 px-2 items-center justify-center rounded-lg bg-white/95 text-slate-900 border-2 border-slate-900 shadow-sm font-display font-extrabold text-[24px] leading-none tabular-nums">
                      {c.nomorUrut}
                    </div>
                  </div>
                  <div className="p-5 flex-1">
                    <p className="text-xs font-medium text-slate-500">Calon Nomor Urut {c.nomorUrut}</p>
                    <h3 className="mt-1 text-lg font-extrabold text-slate-900 font-display">
                      {c.namaLengkap}
                    </h3>
                    {c.visiSingkat && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">{c.visiSingkat}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Dedicated Print-Only View for Voter QR Code Cards (Cetak ke Printer) */}
      <div className="hidden print-only p-6 bg-white text-slate-900">
        <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase">
            Kartu QR Code Pemilih — Pilkades Pamanukan Hilir
          </h1>
          <p className="text-sm text-slate-700">
            Periode Tahun 2026–2034 · Kecamatan Pamanukan
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {voters.map((v) => (
            <div
              key={v.kodeQR}
              className="print-break-inside-avoid border-2 border-slate-800 rounded-lg p-4 flex items-center gap-4"
            >
              {printQRMap[v.kodeQR] && (
                <img
                  src={printQRMap[v.kodeQR]}
                  alt={`QR ${v.kodeQR}`}
                  className="h-24 w-24 shrink-0"
                />
              )}
              <div className="min-w-0 text-xs space-y-1">
                <p className="text-[10px] font-bold uppercase text-red-700">
                  Kartu Verifikasi Pemilih
                </p>
                <p className="text-sm font-bold text-slate-900 truncate">{v.namaPemilih}</p>
                <p className="text-slate-700">NIK: {v.nik || '-'}</p>
                <p className="text-slate-700">{v.rtRw}</p>
                <p className="font-mono-code font-bold text-slate-900 pt-1">{v.kodeQR}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
