import {
  Candidate,
  DriveSpreadsheetItem,
  SpreadsheetInfo,
  VoteRecord,
  VoterQR,
} from '../types';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

export const TAB_CALON = 'Calon';
export const TAB_PEMILIH = 'Pemilih_QR';
export const TAB_SUARA = 'Suara';

const CALON_HEADERS = ['ID', 'NomorUrut', 'NamaLengkap', 'PhotoType', 'PhotoUrl', 'VisiSingkat'];
const PEMILIH_HEADERS = ['KodeQR', 'NamaPemilih', 'NIK', 'RTRW', 'StatusPilih', 'WaktuScan'];
const SUARA_HEADERS = ['IDSuara', 'Waktu', 'KodeQR', 'NamaPemilih', 'Pilihan', 'KategoriSah', 'NomorCalon', 'BarcodeValue'];

async function apiFetch<T>(url: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    let message = `Google API Error (${res.status})`;
    try {
      const parsed = JSON.parse(errText);
      message = parsed?.error?.message || message;
    } catch {
      if (errText) message = errText;
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export async function listAppSpreadsheets(accessToken: string): Promise<DriveSpreadsheetItem[]> {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
  const data = await apiFetch<{ files?: DriveSpreadsheetItem[] }>(
    `${DRIVE_API}?q=${q}&fields=${fields}&orderBy=modifiedTime desc&pageSize=20`,
    accessToken
  );
  return data.files || [];
}

export async function inspectSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetInfo> {
  const data = await apiFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: Array<{ properties: { title: string; sheetId: number } }>;
  }>(
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties`,
    accessToken
  );

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Spreadsheet Pilkades',
    spreadsheetUrl: data.spreadsheetUrl,
    sheetNames: (data.sheets || []).map((s) => s.properties.title),
  };
}

export async function ensurePilkadesTabs(
  accessToken: string,
  spreadsheetId: string,
  initialCandidates: Candidate[],
  initialVoters: VoterQR[]
): Promise<SpreadsheetInfo> {
  let info = await inspectSpreadsheetMetadata(accessToken, spreadsheetId);
  const existing = new Set(info.sheetNames);
  const requests: Array<{ addSheet: { properties: { title: string } } }> = [];

  if (!existing.has(TAB_CALON)) {
    requests.push({ addSheet: { properties: { title: TAB_CALON } } });
  }
  if (!existing.has(TAB_PEMILIH)) {
    requests.push({ addSheet: { properties: { title: TAB_PEMILIH } } });
  }
  if (!existing.has(TAB_SUARA)) {
    requests.push({ addSheet: { properties: { title: TAB_SUARA } } });
  }

  if (requests.length > 0) {
    await apiFetch(`${SHEETS_API}/${encodeURIComponent(spreadsheetId)}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
    info = await inspectSpreadsheetMetadata(accessToken, spreadsheetId);
  }

  // Ensure headers exist in each tab
  const checkHeader = async (tabName: string, headers: string[], seedRows?: string[][]) => {
    const res = await apiFetch<{ values?: string[][] }>(
      `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${tabName}!A1:H2`)}`,
      accessToken
    );
    if (!res.values || res.values.length === 0) {
      const rows = [headers, ...(seedRows || [])];
      await apiFetch(
        `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${tabName}!A1`)}?valueInputOption=USER_ENTERED`,
        accessToken,
        {
          method: 'PUT',
          body: JSON.stringify({ values: rows }),
        }
      );
    }
  };

  await checkHeader(
    TAB_CALON,
    CALON_HEADERS,
    initialCandidates.map((c) => [
      c.id,
      String(c.nomorUrut),
      c.namaLengkap,
      c.photoType,
      c.photoUrl,
      c.visiSingkat || '',
    ])
  );

  await checkHeader(
    TAB_PEMILIH,
    PEMILIH_HEADERS,
    initialVoters.map((v) => [
      v.kodeQR,
      v.namaPemilih,
      v.nik,
      v.rtRw,
      v.statusPilih,
      v.waktuScan || '',
    ])
  );

  await checkHeader(TAB_SUARA, SUARA_HEADERS);

  return info;
}

export async function createPilkadesSpreadsheet(
  accessToken: string,
  initialCandidates: Candidate[],
  initialVoters: VoterQR[]
): Promise<SpreadsheetInfo> {
  const created = await apiFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: Array<{ properties: { title: string } }>;
  }>(SHEETS_API, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        title: 'Database Pilkades Pamanukan Hilir 2026-2034',
      },
      sheets: [
        { properties: { title: TAB_CALON } },
        { properties: { title: TAB_PEMILIH } },
        { properties: { title: TAB_SUARA } },
      ],
    }),
  });

  const spreadsheetId = created.spreadsheetId;

  await apiFetch(
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `${TAB_CALON}!A1`,
            values: [
              CALON_HEADERS,
              ...initialCandidates.map((c) => [
                c.id,
                String(c.nomorUrut),
                c.namaLengkap,
                c.photoType,
                c.photoUrl,
                c.visiSingkat || '',
              ]),
            ],
          },
          {
            range: `${TAB_PEMILIH}!A1`,
            values: [
              PEMILIH_HEADERS,
              ...initialVoters.map((v) => [
                v.kodeQR,
                v.namaPemilih,
                v.nik,
                v.rtRw,
                v.statusPilih,
                v.waktuScan || '',
              ]),
            ],
          },
          {
            range: `${TAB_SUARA}!A1`,
            values: [SUARA_HEADERS],
          },
        ],
      }),
    }
  );

  return {
    spreadsheetId,
    title: created.properties.title,
    spreadsheetUrl: created.spreadsheetUrl,
    sheetNames: [TAB_CALON, TAB_PEMILIH, TAB_SUARA],
  };
}

export async function fetchAllSheetData(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  candidates: Candidate[];
  voters: VoterQR[];
  votes: VoteRecord[];
}> {
  // Always verify sheet names from metadata first
  const info = await inspectSpreadsheetMetadata(accessToken, spreadsheetId);
  const available = new Set(info.sheetNames);

  const ranges: string[] = [];
  if (available.has(TAB_CALON)) ranges.push(`${TAB_CALON}!A2:F500`);
  if (available.has(TAB_PEMILIH)) ranges.push(`${TAB_PEMILIH}!A2:F5000`);
  if (available.has(TAB_SUARA)) ranges.push(`${TAB_SUARA}!A2:H10000`);

  if (ranges.length === 0) {
    return { candidates: [], voters: [], votes: [] };
  }

  const query = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const data = await apiFetch<{
    valueRanges: Array<{ range: string; values?: string[][] }>;
  }>(`${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values:batchGet?${query}`, accessToken);

  const getRowsForTab = (tabName: string): string[][] => {
    const match = (data.valueRanges || []).find((vr) => vr.range.startsWith(`'${tabName}'`) || vr.range.startsWith(tabName));
    return match?.values || [];
  };

  const candidates: Candidate[] = getRowsForTab(TAB_CALON)
    .filter((row) => row[0] && row[2])
    .map((row) => ({
      id: row[0],
      nomorUrut: Number(row[1]) || 1,
      namaLengkap: row[2],
      photoType: (row[3] as Candidate['photoType']) || 'custom_url',
      photoUrl: row[4] || '',
      visiSingkat: row[5] || '',
    }))
    .sort((a, b) => a.nomorUrut - b.nomorUrut);

  const voters: VoterQR[] = getRowsForTab(TAB_PEMILIH)
    .filter((row) => row[0] && row[1])
    .map((row) => ({
      kodeQR: row[0],
      namaPemilih: row[1],
      nik: row[2] || '',
      rtRw: row[3] || '',
      statusPilih: row[4] === 'Sudah Memilih' ? 'Sudah Memilih' : 'Belum Memilih',
      waktuScan: row[5] || '',
    }));

  const votes: VoteRecord[] = getRowsForTab(TAB_SUARA)
    .filter((row) => row[0])
    .map((row) => ({
      idSuara: row[0],
      waktu: row[1] || '',
      kodeQR: row[2] || '',
      namaPemilih: row[3] || '',
      pilihan: row[4] || '',
      kategoriSah: row[5] === 'Suara Sah' ? 'Suara Sah' : 'Suara Tidak Sah',
      nomorCalon: row[6] || '-',
      barcodeValue: row[7] || row[0],
    }));

  return { candidates, voters, votes };
}

export async function overwriteCandidatesSheet(
  accessToken: string,
  spreadsheetId: string,
  candidates: Candidate[]
): Promise<void> {
  await apiFetch(
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${TAB_CALON}!A2:F500`)}:clear`,
    accessToken,
    { method: 'POST', body: '{}' }
  );

  if (candidates.length === 0) return;

  const values = candidates.map((c) => [
    c.id,
    String(c.nomorUrut),
    c.namaLengkap,
    c.photoType,
    c.photoUrl.length > 45000 ? '' : c.photoUrl,
    c.visiSingkat || '',
  ]);

  await apiFetch(
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${TAB_CALON}!A2`)}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values }),
    }
  );
}

export async function overwriteVotersSheet(
  accessToken: string,
  spreadsheetId: string,
  voters: VoterQR[]
): Promise<void> {
  await apiFetch(
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${TAB_PEMILIH}!A2:F5000`)}:clear`,
    accessToken,
    { method: 'POST', body: '{}' }
  );

  if (voters.length === 0) return;

  const values = voters.map((v) => [
    v.kodeQR,
    v.namaPemilih,
    v.nik,
    v.rtRw,
    v.statusPilih,
    v.waktuScan || '',
  ]);

  await apiFetch(
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${TAB_PEMILIH}!A2`)}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values }),
    }
  );
}

export async function appendVoteToSheet(
  accessToken: string,
  spreadsheetId: string,
  vote: VoteRecord,
  updatedVoters?: VoterQR[]
): Promise<void> {
  const row = [
    vote.idSuara,
    vote.waktu,
    vote.kodeQR,
    vote.namaPemilih,
    vote.pilihan,
    vote.kategoriSah,
    vote.nomorCalon,
    vote.barcodeValue,
  ];

  await apiFetch(
    `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${TAB_SUARA}!A:H`)}:append?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ values: [row] }),
    }
  );

  if (updatedVoters) {
    await overwriteVotersSheet(accessToken, spreadsheetId, updatedVoters);
  }
}

export function extractSpreadsheetIdFromInput(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  return trimmed;
}
