import { useCallback, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Candidate,
  DriveSpreadsheetItem,
  PageView,
  PendingSelection,
  SpreadsheetInfo,
  VoteRecord,
  VoterQR,
} from './types';
import {
  getAccessToken,
  googleSignIn,
  initAuth,
  logout as googleLogout,
} from './services/googleAuth';
import {
  appendVoteToSheet,
  createPilkadesSpreadsheet,
  ensurePilkadesTabs,
  extractSpreadsheetIdFromInput,
  fetchAllSheetData,
  listAppSpreadsheets,
  overwriteCandidatesSheet,
  overwriteVotersSheet,
} from './services/googleSheets';
import { DashboardPage } from './components/DashboardPage';
import { BallotPage } from './components/BallotPage';
import { ConfirmationPage } from './components/ConfirmationPage';
import { NotificationPage } from './components/NotificationPage';
import { QRScannerModal } from './components/QRScannerModal';
import { ConfirmModal } from './components/ConfirmModal';

const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'calon-1',
    nomorUrut: 1,
    namaLengkap: 'UDIN JAMALUDIN',
    photoType: 'preset_1',
    photoUrl: '',
    visiSingkat: 'Mewujudkan Desa Pamanukan Hilir yang Maju, Transparan, dan Sejahtera.',
  },
  {
    id: 'calon-2',
    nomorUrut: 2,
    namaLengkap: 'CARMIN',
    photoType: 'preset_2',
    photoUrl: '',
    visiSingkat: 'Menguatkan Ekonomi Kerakyatan, Pertanian, dan Pelayanan Publik Desa.',
  },
  {
    id: 'calon-3',
    nomorUrut: 3,
    namaLengkap: 'ARI GUNAWAN',
    photoType: 'uploaded_3',
    photoUrl: '/assets/aistudio/Calon_No._3_e8a665c8.jpeg',
    visiSingkat: 'Desa Pamanukan Hilir Bersih, Inovatif, dan Berdaya Saing 2026–2034.',
  },
];

const INITIAL_VOTERS: VoterQR[] = [
  {
    kodeQR: 'PILKADES-2026-001',
    namaPemilih: 'H. Dedi Kurniawan',
    nik: '3213101204780001',
    rtRw: 'RT 01 / RW 01 · TPS 01',
    statusPilih: 'Belum Memilih',
    waktuScan: '',
  },
  {
    kodeQR: 'PILKADES-2026-002',
    namaPemilih: 'Ibu Siti Aminah',
    nik: '3213105408820003',
    rtRw: 'RT 02 / RW 01 · TPS 01',
    statusPilih: 'Belum Memilih',
    waktuScan: '',
  },
  {
    kodeQR: 'PILKADES-2026-003',
    namaPemilih: 'Bapak Tarsim',
    nik: '3213100911750002',
    rtRw: 'RT 03 / RW 02 · TPS 02',
    statusPilih: 'Belum Memilih',
    waktuScan: '',
  },
];

interface PendingConfirmAction {
  title: string;
  description: string;
  confirmLabel: string;
  variant: 'danger' | 'primary';
  execute: () => Promise<void>;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [voters, setVoters] = useState<VoterQR[]>(INITIAL_VOTERS);
  const [votes, setVotes] = useState<VoteRecord[]>([]);

  // Admin & Voter Session State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [activeVoter, setActiveVoter] = useState<
    VoterQR | { kodeQR: string; namaPemilih: string; isDemo: boolean } | null
  >(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [completedVote, setCompletedVote] = useState<VoteRecord | null>(null);
  const [isSavingVote, setIsSavingVote] = useState(false);
  const [voteSaveError, setVoteSaveError] = useState<string | null>(null);
  const [lastVoteSyncedToSheets, setLastVoteSyncedToSheets] = useState(false);

  // QR Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Google Workspace OAuth & Sheets State (token cached in memory via googleAuth.ts)
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<SpreadsheetInfo | null>(null);
  const [availableSpreadsheets, setAvailableSpreadsheets] = useState<DriveSpreadsheetItem[]>([]);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  // Confirmation dialog for Google Sheets mutations/deletions
  const [confirmAction, setConfirmAction] = useState<PendingConfirmAction | null>(null);
  const [isExecutingConfirm, setIsExecutingConfirm] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
        setHasGoogleToken(Boolean(getAccessToken()));
      },
      () => {
        setGoogleUser(null);
        setHasGoogleToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const syncFromSpreadsheet = useCallback(async (token: string, spreadsheetId: string) => {
    setIsSyncingSheets(true);
    setSheetsError(null);
    try {
      const info = await ensurePilkadesTabs(
        token,
        spreadsheetId,
        INITIAL_CANDIDATES,
        INITIAL_VOTERS
      );
      setSpreadsheetInfo(info);
      const data = await fetchAllSheetData(token, spreadsheetId);
      if (data.candidates.length > 0) {
        // Ensure Calon 3 keeps its uploaded asset photo if photoUrl matches or is uploaded_3
        const normalized = data.candidates.map((c) =>
          c.photoType === 'uploaded_3' && !c.photoUrl
            ? { ...c, photoUrl: '/assets/aistudio/Calon_No._3_e8a665c8.jpeg' }
            : c
        );
        setCandidates(normalized);
      }
      setVoters(data.voters);
      setVotes(data.votes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyinkronkan Google Sheets.';
      setSheetsError(msg);
    } finally {
      setIsSyncingSheets(false);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoggingIn(true);
    setSheetsError(null);
    try {
      const { user, accessToken } = await googleSignIn();
      setGoogleUser(user);
      setHasGoogleToken(true);

      const files = await listAppSpreadsheets(accessToken);
      setAvailableSpreadsheets(files);

      // Automatically attach the most recent Pilkades spreadsheet if one exists
      const existing = files.find((f) => f.name.includes('Pilkades Pamanukan Hilir'));
      if (existing) {
        await syncFromSpreadsheet(accessToken, existing.id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      setSheetsError(msg);
    } finally {
      setIsGoogleLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleLogout();
    setGoogleUser(null);
    setHasGoogleToken(false);
    setSpreadsheetInfo(null);
    setAvailableSpreadsheets([]);
  };

  const handleCreateSpreadsheet = async () => {
    const token = getAccessToken();
    if (!token) {
      setSheetsError('Silakan Sign in with Google terlebih dahulu.');
      return;
    }
    setIsSyncingSheets(true);
    setSheetsError(null);
    try {
      const info = await createPilkadesSpreadsheet(token, candidates, voters);
      setSpreadsheetInfo(info);
      const files = await listAppSpreadsheets(token);
      setAvailableSpreadsheets(files);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat spreadsheet baru.';
      setSheetsError(msg);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleConnectSpreadsheet = async (input: string) => {
    const token = getAccessToken();
    if (!token) {
      setSheetsError('Silakan Sign in with Google terlebih dahulu.');
      return;
    }
    const id = extractSpreadsheetIdFromInput(input);
    if (!id) return;
    await syncFromSpreadsheet(token, id);
  };

  const handleRefreshFromSheets = async () => {
    const token = getAccessToken();
    if (!token || !spreadsheetInfo) return;
    await syncFromSpreadsheet(token, spreadsheetInfo.spreadsheetId);
  };

  // Candidate Save / Edit with Confirmation Modal when Google Sheets is connected
  const handleSaveCandidate = (candidate: Candidate, isEdit: boolean) => {
    const nextCandidates = isEdit
      ? candidates.map((c) => (c.id === candidate.id ? candidate : c))
      : [...candidates, candidate];
    nextCandidates.sort((a, b) => a.nomorUrut - b.nomorUrut);

    const token = getAccessToken();
    if (token && spreadsheetInfo) {
      setConfirmAction({
        title: isEdit ? 'Perbarui Data Calon di Google Sheets?' : 'Simpan Calon Baru ke Google Sheets?',
        description: `Apakah Anda yakin ingin menyimpan perubahan data calon "${candidate.namaLengkap}" (No. ${candidate.nomorUrut}) ke tab "${spreadsheetInfo.title} / Calon"?`,
        confirmLabel: 'Simpan ke Google Sheets',
        variant: 'primary',
        execute: async () => {
          setIsSyncingSheets(true);
          setSheetsError(null);
          try {
            await overwriteCandidatesSheet(token, spreadsheetInfo.spreadsheetId, nextCandidates);
            setCandidates(nextCandidates);
          } catch (err) {
            setSheetsError(err instanceof Error ? err.message : 'Gagal menyimpan calon ke Google Sheets.');
          } finally {
            setIsSyncingSheets(false);
          }
        },
      });
    } else {
      setCandidates(nextCandidates);
    }
  };

  // Candidate Delete with Confirmation Modal
  const handleDeleteCandidate = (candidateId: string) => {
    const target = candidates.find((c) => c.id === candidateId);
    if (!target) return;
    const nextCandidates = candidates.filter((c) => c.id !== candidateId);
    const token = getAccessToken();

    setConfirmAction({
      title: 'Hapus Data Calon Kepala Desa?',
      description:
        token && spreadsheetInfo
          ? `Hapus calon "${target.namaLengkap}" (No. ${target.nomorUrut}) dari daftar dan perbarui Google Sheets "${spreadsheetInfo.title}"? Tindakan ini tidak dapat dibatalkan.`
          : `Apakah Anda yakin ingin menghapus calon "${target.namaLengkap}" (No. ${target.nomorUrut}) dari daftar pemilihan?`,
      confirmLabel: 'Hapus Data',
      variant: 'danger',
      execute: async () => {
        if (token && spreadsheetInfo) {
          setIsSyncingSheets(true);
          setSheetsError(null);
          try {
            await overwriteCandidatesSheet(token, spreadsheetInfo.spreadsheetId, nextCandidates);
            setCandidates(nextCandidates);
          } catch (err) {
            setSheetsError(err instanceof Error ? err.message : 'Gagal menghapus calon di Google Sheets.');
          } finally {
            setIsSyncingSheets(false);
          }
        } else {
          setCandidates(nextCandidates);
        }
      },
    });
  };

  // Voter Add with Confirmation Modal when Google Sheets is connected
  const handleAddVoter = (voter: VoterQR) => {
    const nextVoters = [...voters, voter];
    const token = getAccessToken();

    if (token && spreadsheetInfo) {
      setConfirmAction({
        title: 'Simpan QR Pemilih ke Google Sheets?',
        description: `Tambahkan pemilih "${voter.namaPemilih}" (${voter.kodeQR}) ke Google Sheets "${spreadsheetInfo.title}"?`,
        confirmLabel: 'Simpan ke Google Sheets',
        variant: 'primary',
        execute: async () => {
          setIsSyncingSheets(true);
          setSheetsError(null);
          try {
            await overwriteVotersSheet(token, spreadsheetInfo.spreadsheetId, nextVoters);
            setVoters(nextVoters);
          } catch (err) {
            setSheetsError(err instanceof Error ? err.message : 'Gagal menyimpan pemilih ke Google Sheets.');
          } finally {
            setIsSyncingSheets(false);
          }
        },
      });
    } else {
      setVoters(nextVoters);
    }
  };

  // Voter Delete with Confirmation Modal
  const handleDeleteVoter = (kodeQR: string) => {
    const target = voters.find((v) => v.kodeQR === kodeQR);
    if (!target) return;
    const nextVoters = voters.filter((v) => v.kodeQR !== kodeQR);
    const token = getAccessToken();

    setConfirmAction({
      title: 'Hapus Data QR Code Pemilih?',
      description:
        token && spreadsheetInfo
          ? `Hapus QR Code "${target.kodeQR}" atas nama "${target.namaPemilih}" dari Google Sheets "${spreadsheetInfo.title}"?`
          : `Apakah Anda yakin ingin menghapus QR Code "${target.kodeQR}" atas nama "${target.namaPemilih}"?`,
      confirmLabel: 'Hapus QR Pemilih',
      variant: 'danger',
      execute: async () => {
        if (token && spreadsheetInfo) {
          setIsSyncingSheets(true);
          setSheetsError(null);
          try {
            await overwriteVotersSheet(token, spreadsheetInfo.spreadsheetId, nextVoters);
            setVoters(nextVoters);
          } catch (err) {
            setSheetsError(err instanceof Error ? err.message : 'Gagal menghapus QR pemilih di Google Sheets.');
          } finally {
            setIsSyncingSheets(false);
          }
        } else {
          setVoters(nextVoters);
        }
      },
    });
  };

  // QR Scan Verification -> Navigates to Page 2 (BallotPage)
  const handleQRScanSuccess = (scannedCode: string) => {
    const found = voters.find((v) => v.kodeQR.toUpperCase() === scannedCode.toUpperCase());
    if (!found) {
      setScannerError(`Kode QR "${scannedCode}" tidak terdaftar di daftar pemilih.`);
      return;
    }
    if (found.statusPilih === 'Sudah Memilih') {
      setScannerError(
        `Pemilih "${found.namaPemilih}" (${found.kodeQR}) sudah menggunakan hak pilihnya.`
      );
      return;
    }

    setScannerError(null);
    setScannerOpen(false);
    setActiveVoter(found);
    setPendingSelection(null);
    setCurrentPage('ballot');
  };

  // Demo Mode -> Navigates directly to Page 2 (BallotPage)
  const handleStartDemoVoting = () => {
    setScannerError(null);
    setActiveVoter({
      kodeQR: `DEMO-${Date.now().toString().slice(-5)}`,
      namaPemilih: 'Pemilih Mode Demo',
      isDemo: true,
    });
    setPendingSelection(null);
    setCurrentPage('ballot');
  };

  // Page 3 -> Confirm "Pilih" -> Save to Google Sheets & Local State -> Page 4 (Notification)
  const handleConfirmVote = async () => {
    if (!pendingSelection || !activeVoter) return;
    setIsSavingVote(true);
    setVoteSaveError(null);

    const now = new Date();
    const waktu = now.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const idSuara = `SUARA-${now.getFullYear()}-${String(votes.length + 1).padStart(4, '0')}`;
    const barcodeValue = `PHL2026${String(now.getTime()).slice(-8)}`;

    const pilihanLabel =
      pendingSelection.validity === 'Suara Sah' && pendingSelection.chosenCandidate
        ? pendingSelection.chosenCandidate.namaLengkap
        : pendingSelection.selectedBlanko
          ? 'Calon Blanko (Tidak Sah)'
          : `Suara Tidak Sah (${pendingSelection.reason})`;

    const nomorCalon =
      pendingSelection.validity === 'Suara Sah' && pendingSelection.chosenCandidate
        ? String(pendingSelection.chosenCandidate.nomorUrut)
        : '-';

    const newVote: VoteRecord = {
      idSuara,
      waktu,
      kodeQR: activeVoter.kodeQR,
      namaPemilih: activeVoter.namaPemilih,
      pilihan: pilihanLabel,
      kategoriSah: pendingSelection.validity,
      nomorCalon,
      barcodeValue,
    };

    const isDemo = 'isDemo' in activeVoter && activeVoter.isDemo;
    const updatedVoters = isDemo
      ? voters
      : voters.map((v) =>
          v.kodeQR === activeVoter.kodeQR
            ? { ...v, statusPilih: 'Sudah Memilih' as const, waktuScan: waktu }
            : v
        );

    const token = getAccessToken();
    let synced = false;
    if (token && spreadsheetInfo) {
      try {
        await appendVoteToSheet(
          token,
          spreadsheetInfo.spreadsheetId,
          newVote,
          isDemo ? undefined : updatedVoters
        );
        synced = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan suara ke Google Sheets.';
        setVoteSaveError(msg);
        setIsSavingVote(false);
        return;
      }
    }

    setVotes((prev) => [...prev, newVote]);
    if (!isDemo) {
      setVoters(updatedVoters);
    }
    setCompletedVote(newVote);
    setLastVoteSyncedToSheets(synced);
    setIsSavingVote(false);
    setCurrentPage('notification');
  };

  const handleReturnToDashboard = () => {
    setActiveVoter(null);
    setPendingSelection(null);
    setCompletedVote(null);
    setVoteSaveError(null);
    setCurrentPage('dashboard');
  };

  return (
    <>
      {currentPage === 'dashboard' && (
        <DashboardPage
          candidates={candidates}
          voters={voters}
          votes={votes}
          googleUser={googleUser}
          hasGoogleToken={hasGoogleToken}
          isGoogleLoggingIn={isGoogleLoggingIn}
          spreadsheetInfo={spreadsheetInfo}
          availableSpreadsheets={availableSpreadsheets}
          isSyncingSheets={isSyncingSheets}
          sheetsError={sheetsError}
          scannerError={scannerError}
          isAdminAuthenticated={isAdminAuthenticated}
          onAdminLoginSuccess={() => setIsAdminAuthenticated(true)}
          onAdminLogout={() => setIsAdminAuthenticated(false)}
          onOpenScanner={() => {
            setScannerError(null);
            setScannerOpen(true);
          }}
          onStartDemoVoting={handleStartDemoVoting}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleLogout={handleGoogleLogout}
          onCreateSpreadsheet={handleCreateSpreadsheet}
          onConnectSpreadsheet={handleConnectSpreadsheet}
          onRefreshFromSheets={handleRefreshFromSheets}
          onSaveCandidate={handleSaveCandidate}
          onDeleteCandidate={handleDeleteCandidate}
          onAddVoter={handleAddVoter}
          onDeleteVoter={handleDeleteVoter}
        />
      )}

      {currentPage === 'ballot' && activeVoter && (
        <BallotPage
          candidates={candidates}
          activeVoter={activeVoter}
          initialSelection={pendingSelection}
          onCancelToDashboard={handleReturnToDashboard}
          onProceedToConfirmation={(selection) => {
            setPendingSelection(selection);
            setVoteSaveError(null);
            setCurrentPage('confirmation');
          }}
        />
      )}

      {currentPage === 'confirmation' && pendingSelection && (
        <ConfirmationPage
          selection={pendingSelection}
          isSaving={isSavingVote}
          saveError={voteSaveError}
          onRepeat={() => setCurrentPage('ballot')}
          onConfirmVote={handleConfirmVote}
        />
      )}

      {currentPage === 'notification' && completedVote && (
        <NotificationPage
          voteRecord={completedVote}
          sheetsSynced={lastVoteSyncedToSheets}
          onReturnToDashboard={handleReturnToDashboard}
        />
      )}

      {/* QR Code Scanner Modal */}
      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
        errorMessage={scannerError}
      />

      {/* Explicit Confirmation Modal for Google Sheets Mutations & Deletions */}
      <ConfirmModal
        open={Boolean(confirmAction)}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmLabel={confirmAction?.confirmLabel}
        variant={confirmAction?.variant || 'danger'}
        isLoading={isExecutingConfirm}
        onCancel={() => {
          if (!isExecutingConfirm) setConfirmAction(null);
        }}
        onConfirm={async () => {
          if (!confirmAction) return;
          setIsExecutingConfirm(true);
          try {
            await confirmAction.execute();
          } finally {
            setIsExecutingConfirm(false);
            setConfirmAction(null);
          }
        }}
      />
    </>
  );
}
