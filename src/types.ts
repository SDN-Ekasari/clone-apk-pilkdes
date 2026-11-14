export type PageView = 'dashboard' | 'ballot' | 'confirmation' | 'notification';

export interface Candidate {
  id: string;
  nomorUrut: number;
  namaLengkap: string;
  photoType: 'preset_1' | 'preset_2' | 'uploaded_3' | 'custom_url';
  photoUrl: string;
  visiSingkat?: string;
}

export interface VoterQR {
  kodeQR: string;
  namaPemilih: string;
  nik: string;
  rtRw: string;
  statusPilih: 'Belum Memilih' | 'Sudah Memilih';
  waktuScan?: string;
}

export type VoteValidity = 'Suara Sah' | 'Suara Tidak Sah';

export interface PendingSelection {
  selectedCandidateIds: string[];
  selectedBlanko: boolean;
  validity: VoteValidity;
  chosenCandidate: Candidate | null;
  reason: string;
}

export interface VoteRecord {
  idSuara: string;
  waktu: string;
  kodeQR: string;
  namaPemilih: string;
  pilihan: string;
  kategoriSah: VoteValidity;
  nomorCalon: string;
  barcodeValue: string;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheetNames: string[];
}

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}
