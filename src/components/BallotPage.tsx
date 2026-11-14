import React, { useState } from 'react';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { Candidate, PendingSelection, VoterQR } from '../types';
import { BlankoBallotSvg, CandidatePhoto, KpuLogoSvg } from './CivicArt';

interface BallotPageProps {
  candidates: Candidate[];
  activeVoter: VoterQR | { kodeQR: string; namaPemilih: string; isDemo: boolean };
  initialSelection?: PendingSelection | null;
  onCancelToDashboard: () => void;
  onProceedToConfirmation: (selection: PendingSelection) => void;
}

export const BallotPage: React.FC<BallotPageProps> = ({
  candidates,
  activeVoter,
  initialSelection,
  onCancelToDashboard,
  onProceedToConfirmation,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelection?.selectedCandidateIds || []
  );
  const [selectedBlanko, setSelectedBlanko] = useState<boolean>(
    initialSelection?.selectedBlanko || false
  );

  const toggleCandidate = (candidateId: string) => {
    setSelectedIds((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const toggleBlanko = () => {
    setSelectedBlanko((prev) => !prev);
  };

  const handleSubmitBallot = () => {
    // Special election rules:
    // - If Blanko is selected -> Suara Tidak Sah
    // - If 0 candidates or > 1 candidate selected -> Suara Tidak Sah
    // - If exactly 1 candidate selected and Blanko is not selected -> Suara Sah
    if (selectedBlanko) {
      onProceedToConfirmation({
        selectedCandidateIds: selectedIds,
        selectedBlanko: true,
        validity: 'Suara Tidak Sah',
        chosenCandidate: null,
        reason: 'Pemilih memilih Calon Blanko',
      });
      return;
    }

    if (selectedIds.length === 0) {
      onProceedToConfirmation({
        selectedCandidateIds: [],
        selectedBlanko: false,
        validity: 'Suara Tidak Sah',
        chosenCandidate: null,
        reason: 'Tidak memilih salah satu calon',
      });
      return;
    }

    if (selectedIds.length > 1) {
      onProceedToConfirmation({
        selectedCandidateIds: selectedIds,
        selectedBlanko: false,
        validity: 'Suara Tidak Sah',
        chosenCandidate: null,
        reason: `Memilih lebih dari 1 calon (${selectedIds.length} calon dipilih)`,
      });
      return;
    }

    const chosen = candidates.find((c) => c.id === selectedIds[0]) || null;
    if (!chosen) {
      onProceedToConfirmation({
        selectedCandidateIds: [],
        selectedBlanko: false,
        validity: 'Suara Tidak Sah',
        chosenCandidate: null,
        reason: 'Data calon tidak ditemukan',
      });
      return;
    }

    onProceedToConfirmation({
      selectedCandidateIds: [chosen.id],
      selectedBlanko: false,
      validity: 'Suara Sah',
      chosenCandidate: chosen,
      reason: `Pilihan sah Calon Nomor ${chosen.nomorUrut}`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Utility Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <button
            type="button"
            onClick={onCancelToDashboard}
            className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Dashboard
          </button>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
            <span>Pemilih: <strong className="text-slate-900">{activeVoter.namaPemilih}</strong></span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-code text-slate-700">{activeVoter.kodeQR}</span>
          </div>
        </div>

        {/* Surat Suara Resmi */}
        <div className="rounded-2xl bg-white border-2 border-slate-300 shadow-sm overflow-hidden">
          {/* BAGIAN 1: Logo KPU, Teks "Pilih Calon Kepala Desa Anda", Gambar Calon Blanko (pojok kanan atas) */}
          <header className="relative flex flex-col md:flex-row items-center justify-between gap-6 border-b-2 border-slate-200 bg-white px-6 py-6 sm:px-8">
            <div className="flex items-center gap-4">
              <KpuLogoSvg className="h-16 w-16 sm:h-20 sm:w-20 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-semibold text-red-700 tracking-wide">
                  PANITIA PEMILIHAN KEPALA DESA PAMANUKAN HILIR
                </p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 font-display text-balance">
                  Pilih Calon Kepala Desa Anda
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Periode Tahun 2026–2034 · Kecamatan Pamanukan
                </p>
              </div>
            </div>

            {/* Gambar Calon Blanko di Pojok Kanan Atas */}
            <button
              type="button"
              onClick={toggleBlanko}
              aria-pressed={selectedBlanko}
              className={`group flex flex-col items-center justify-center rounded-xl p-3 transition-all cursor-pointer shrink-0 ${
                selectedBlanko
                  ? 'border-4 border-red-600 bg-red-50 shadow-md'
                  : 'border-2 border-dashed border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
              }`}
              title="Klik jika memilih Calon Blanko (Suara Tidak Sah)"
            >
              <BlankoBallotSvg className="h-16 w-16" selected={selectedBlanko} />
              <span
                className={`mt-1.5 text-xs font-bold whitespace-nowrap ${
                  selectedBlanko ? 'text-red-700' : 'text-slate-700'
                }`}
              >
                Calon Blanko
              </span>
              {selectedBlanko && (
                <span className="mt-0.5 text-[11px] font-semibold text-red-600">
                  Dipilih (Tidak Sah)
                </span>
              )}
            </button>
          </header>

          {/* Instruction Line */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 text-xs sm:text-sm text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <span>
              Klik kartu foto calon untuk memilih (garis tepi merah menandakan pilihan Anda). Memilih tepat 1 calon dihitung sebagai <strong>Suara Sah</strong>.
            </span>
            <span className="font-mono-code text-xs text-slate-700">
              Terpilih: {selectedBlanko ? 'Calon Blanko' : `${selectedIds.length} Calon`}
            </span>
          </div>

          {/* BAGIAN 2: Photo Calon, Nomor Calon (pojok kiri photo font 24px), Nama Lengkap Calon */}
          <section className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {candidates.map((candidate) => {
                const isSelected = selectedIds.includes(candidate.id);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => toggleCandidate(candidate.id)}
                    aria-pressed={isSelected}
                    className={`group relative flex flex-col rounded-xl bg-white text-left transition-all cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40 ${
                      isSelected
                        ? 'border-4 border-red-600 shadow-lg scale-[1.01]'
                        : 'border-2 border-slate-200 hover:border-slate-400 shadow-xs'
                    }`}
                  >
                    {/* Photo Calon Container */}
                    <div
                      className={`relative aspect-3/4 w-full overflow-hidden bg-amber-300 ${
                        isSelected ? 'border-b-4 border-red-600' : 'border-b border-slate-200'
                      }`}
                    >
                      <CandidatePhoto
                        candidate={candidate}
                        className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-[1.02]"
                      />

                      {/* Nomor Calon berada di photo calon pojok kiri dengan ukuran font 24px */}
                      <div
                        className={`absolute top-3 left-3 flex h-12 min-w-12 px-2.5 items-center justify-center rounded-lg shadow-md font-display font-extrabold text-[24px] leading-none tabular-nums ${
                          isSelected
                            ? 'bg-red-600 text-white border-2 border-white'
                            : 'bg-white/95 text-slate-900 border-2 border-slate-900'
                        }`}
                      >
                        {candidate.nomorUrut}
                      </div>

                      {/* Selection indicator inside photo top-right */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-md">
                          <CheckCircle2 className="h-4 w-4" />
                          Dipilih
                        </div>
                      )}
                    </div>

                    {/* Nama Lengkap Calon */}
                    <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Calon Kepala Desa No. {candidate.nomorUrut}
                        </p>
                        <h2 className="mt-1 text-xl font-extrabold text-slate-900 font-display tracking-tight">
                          {candidate.namaLengkap}
                        </h2>
                        {candidate.visiSingkat && (
                          <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2">
                            {candidate.visiSingkat}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                        <span className={isSelected ? 'text-red-600' : 'text-slate-500'}>
                          {isSelected ? 'Garis tepi merah aktif' : 'Klik untuk memilih'}
                        </span>
                        <span className="font-mono-code text-slate-400">#{candidate.nomorUrut}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* BAGIAN 3: Tombol warna biru dan teks putih "Pilih Kandidat ini" */}
          <footer className="border-t border-slate-200 bg-slate-50 px-6 py-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              {selectedBlanko ? (
                <span className="font-medium text-red-700">
                  Anda menandai Calon Blanko (akan dicatat sebagai Suara Tidak Sah).
                </span>
              ) : selectedIds.length === 1 ? (
                <span className="font-medium text-slate-800">
                  1 calon dipilih. Tekan tombol biru untuk melanjutkan ke halaman konfirmasi.
                </span>
              ) : selectedIds.length > 1 ? (
                <span className="font-medium text-amber-700">
                  Lebih dari 1 calon dipilih ({selectedIds.length} calon). Jika dilanjutkan akan dihitung Suara Tidak Sah.
                </span>
              ) : (
                <span>Belum ada calon yang dipilih. Silakan pilih salah satu calon kepala desa.</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmitBallot}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40"
            >
              Pilih Kandidat ini
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};
