import React from 'react';
import { AlertCircle, Check, RotateCcw } from 'lucide-react';
import { PendingSelection } from '../types';
import { BlankoBallotSvg, CandidatePhoto, KpuLogoSvg } from './CivicArt';

interface ConfirmationPageProps {
  selection: PendingSelection;
  isSaving: boolean;
  saveError: string | null;
  onRepeat: () => void;
  onConfirmVote: () => void;
}

export const ConfirmationPage: React.FC<ConfirmationPageProps> = ({
  selection,
  isSaving,
  saveError,
  onRepeat,
  onConfirmVote,
}) => {
  const isValidCandidate = selection.validity === 'Suara Sah' && selection.chosenCandidate !== null;

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white border-2 border-slate-300 shadow-sm overflow-hidden">
        {/* BAGIAN 1: Teks "Apakah Anda Sudah Yakin dengan Pilihan Anda?" */}
        <header className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8 text-center">
          <div className="flex justify-center mb-3">
            <KpuLogoSvg className="h-14 w-14" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display text-balance">
            Apakah Anda Sudah Yakin dengan Pilihan Anda?
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Pemilihan Kepala Desa Pamanukan Hilir Periode 2026–2034 · Kecamatan Pamanukan
          </p>
        </header>

        {/* BAGIAN 2: Photo Calon Terpilih & Nama Lengkap (atau ringkasan Suara Tidak Sah) */}
        <section className="p-6 sm:p-8 flex flex-col items-center">
          {saveError && (
            <div className="mb-5 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {saveError}
            </div>
          )}

          {isValidCandidate && selection.chosenCandidate ? (
            <div className="w-full max-w-xs rounded-xl border-4 border-red-600 bg-white overflow-hidden shadow-md">
              <div className="relative aspect-3/4 w-full bg-amber-300 border-b-4 border-red-600">
                <CandidatePhoto
                  candidate={selection.chosenCandidate}
                  className="h-full w-full object-cover object-top"
                />
                <div className="absolute top-3 left-3 flex h-12 min-w-12 px-2.5 items-center justify-center rounded-lg bg-red-600 text-white border-2 border-white shadow-md font-display font-extrabold text-[24px] leading-none tabular-nums">
                  {selection.chosenCandidate.nomorUrut}
                </div>
              </div>
              <div className="p-5 text-center bg-white">
                <p className="text-xs font-semibold text-emerald-700">
                  Kategori: Suara Sah · Calon No. {selection.chosenCandidate.nomorUrut}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900 font-display">
                  {selection.chosenCandidate.namaLengkap}
                </h2>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md rounded-xl border-2 border-amber-300 bg-amber-50 p-6 text-center space-y-4">
              <div className="flex justify-center">
                <BlankoBallotSvg className="h-24 w-24" selected />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  Kategori: Suara Tidak Sah
                </div>
                <h2 className="mt-1 text-xl font-extrabold text-slate-900 font-display">
                  {selection.selectedBlanko
                    ? 'Calon Blanko (Tidak Sah)'
                    : 'Suara Tidak Sah'}
                </h2>
                <p className="mt-1.5 text-sm text-slate-700">
                  Keterangan: {selection.reason}. Jika Anda menekan tombol <strong>Pilih</strong>, pilihan ini akan tercatat sebagai <strong>Suara Tidak Sah</strong>.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* BAGIAN 3: Tombol dengan teks "Ulangi", Tombol dengan teks "Pilih" */}
        <footer className="border-t border-slate-200 bg-slate-50 px-6 py-6 sm:px-8 flex flex-col-reverse sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onRepeat}
            disabled={isSaving}
            className="w-full sm:w-44 inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-slate-800 bg-white border-2 border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Ulangi
          </button>

          <button
            type="button"
            onClick={onConfirmVote}
            disabled={isSaving}
            className="w-full sm:w-48 inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <Check className="h-5 w-5" />
            {isSaving ? 'Menyimpan...' : 'Pilih'}
          </button>
        </footer>
      </div>
    </div>
  );
};
