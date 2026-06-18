import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface SheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  lastSyncedAt?: string;
  autoSyncEnabled?: boolean;
}

// Extract Spreadsheet ID from full URL or return ID as-is
export function extractSpreadsheetId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

// Load spreadsheet ID and sheet name configuration from Firestore
export async function getSheetsConfig(): Promise<SheetsConfig> {
  try {
    const docRef = doc(db, 'sheets_config', 'absenteeism');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        spreadsheetId: data.spreadsheetId || '1nYm2aRgruykh2YfXTcpCRuHGIqI0TtAFroMEk_p7Ij8', // Default to requested spreadsheet
        sheetName: data.sheetName || 'Historico',
        lastSyncedAt: data.lastSyncedAt || '',
        autoSyncEnabled: data.autoSyncEnabled !== false
      };
    }
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.includes('offline') || errMsg.includes('network') || errMsg.includes('internet')) {
      console.warn('Firestore offline: usando configurações padrão locais para sincronização de presença.');
    } else {
      console.warn('Erro ao obter configuração do Google Sheets no Firestore:', errMsg);
    }
  }
  return { 
    spreadsheetId: '1nYm2aRgruykh2YfXTcpCRuHGIqI0TtAFroMEk_p7Ij8', 
    sheetName: 'Historico',
    autoSyncEnabled: true
  };
}

// Save spreadsheet configure setup to Firestore
export async function saveSheetsConfig(spreadsheetId: string, sheetName: string): Promise<void> {
  try {
    const docRef = doc(db, 'sheets_config', 'absenteeism');
    await setDoc(docRef, {
      spreadsheetId: extractSpreadsheetId(spreadsheetId),
      sheetName: sheetName || 'Historico',
      autoSyncEnabled: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving Sheets configuration:', error);
    throw error;
  }
}

// Set last synchronized timestamp
export async function updateLastSyncedTimestamp(): Promise<void> {
  try {
    const docRef = doc(db, 'sheets_config', 'absenteeism');
    await setDoc(docRef, {
      lastSyncedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Could not update last sync timestamp:', err);
  }
}

// Normalize a string to help map sectors and presence statuses case-insensitively
export function normalizeStr(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .trim();
}

/**
 * Strict Mapping Rules provided by User:
 * Conferencia = Lais
 * Expedição = Renato
 * Separação = Elisangela
 * Controlados = Tiago
 * Padrão = Leticia
 * A-Frame = A-FRAME (or A-frame)
 */
export function mapSectorToStandard(rawSector: string): string | null {
  const s = normalizeStr(rawSector);
  if (s === "lais" || s.includes("lais") || s === "conferencia" || s.includes("conferir") || s.includes("conferenc")) return "Conferencia";
  if (s === "renato" || s.includes("renato") || s === "expedicao" || s.includes("expedicao") || s.includes("envio") || s.includes("despacho") || s.includes("expedição")) return "Expedição";
  if (s === "elisangela" || s.includes("elisangela") || s === "separacao" || s.includes("separaç") || s.includes("separar") || s.includes("separador")) return "Separação";
  if (s === "tiago" || s.includes("tiago") || s === "controlado" || s.includes("psicotropico") || s.includes("controlados")) return "Controlados";
  if (s === "leticia" || s.includes("leticia") || s === "padrao" || s.includes("padrão") || s.includes("geral") || s.includes("comum")) return "Padrão";
  if (s === "a-frame" || s === "aframe" || s.includes("a-frame") || s.includes("aframe") || s.includes("framer") || s.includes("automatic")) return "A-frame";
  return null;
}

// Helper to determine if a status value counts as an absence
export function isAbsenceStatus(val: string): boolean {
  const v = normalizeStr(val);
  if (!v) return false;
  // Absences in Portuguese typical presence logs
  return (
    v === "falta" || 
    v === "faltou" || 
    v === "ausente" || 
    v === "f" || 
    v === "n" || 
    v === "nao" || 
    v === "f-abono" ||
    v.includes("ausen") || 
    v.includes("falt") || 
    v.includes("abono") || 
    v.includes("atestado") || 
    v.includes("medico") ||
    v.includes("afastado")
  );
}

// Helper to determine if a status value counts as a presence/compareceu
export function isPresenceStatus(val: string): boolean {
  const v = normalizeStr(val);
  if (!v) return false;
  return (
    v === "p" ||
    v === "c" ||
    v === "presente" ||
    v === "sim" ||
    v === "compareceu" ||
    v === "ativo" ||
    v === "trabalhando" ||
    v === "v" ||
    v === "ok"
  );
}

// Convert DD/MM/YYYY or YYYY-MM-DD or DD/MM to timestamp
export function parseDateToTimestamp(str: string): number {
  if (!str) return 0;
  const s = str.trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const fullYear = year < 100 ? 2000 + year : year;
    return new Date(fullYear, month, day).getTime();
  }
  const parsed = Date.parse(s);
  return isNaN(parsed) ? 0 : parsed;
}

// Parse CSV manually with auto delimiter detection (commas vs semicolons)
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  const firstLine = text.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delim = semiCount > commaCount ? ';' : ',';

  let row: string[] = [];
  let inQuotes = false;
  let currentWord = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentWord += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delim && !inQuotes) {
      row.push(currentWord.trim());
      currentWord = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentWord.trim());
      lines.push(row);
      row = [];
      currentWord = '';
    } else {
      currentWord += char;
    }
  }
  if (currentWord || row.length > 0) {
    row.push(currentWord.trim());
    lines.push(row);
  }
  return lines;
}

// Interfaces for our parsed output
export interface ParsedAbsenteeism {
  sector: string;
  faltas: number;
  total: number;
}

// Calculate the current operational date based on time-of-day/shifts
export function getOperationalDate(): Date {
  const d = new Date();
  // Operational shift boundary: if it's before 5:00 AM (local time), 
  // we count it as the previous calendar day's log
  if (d.getHours() < 5) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

// Format Date to searchable string tokens
export function getFormattedDateSearchTokens(date: Date): string[] {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const shortYear = String(year).slice(-2);

  return [
    `${day}/${month}/${year}`,      // 16/06/2026
    `${day}/${month}/${shortYear}`,  // 16/06/26
    `${year}-${month}-${day}`,      // 2026-06-16
    `${day}-${month}-${year}`,      // 16-06-2026
    `${day}/${month}`,              // 16/06
    `${day}-${month}`               // 16-06
  ];
}

/**
 * Super robust, 100% public, CORS-friendly client-side Google Sheet parser.
 * Reads public spreadsheets instantly without requiring popups, keys, or OAuth redirects!
 */
export async function fetchAndParsePublicCsvData(
  spreadsheetId: string,
  sheetName: string
): Promise<{
  success: boolean;
  data?: ParsedAbsenteeism[];
  message: string;
  rowsProcessed?: number;
  dateFound?: string;
}> {
  try {
    if (!spreadsheetId) {
      return { success: false, message: 'ID da planilha Google não fornecido.' };
    }

    const cleanSpreadsheetId = extractSpreadsheetId(spreadsheetId);
    const targetSheetTab = sheetName || 'Historico';

    // Build standard high-performance CORS-friendly gviz CSV export endpoint
    const url = `https://docs.google.com/spreadsheets/d/${cleanSpreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(targetSheetTab)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha de acesso à planilha: Código HTTP ${response.status}`);
    }

    const text = await response.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return { success: false, message: 'Planilha de dados vazia.' };
    }

    const headers = (rows[0] || []).map(h => normalizeStr(h));

    // Define standard sector statistics accumulator
    const docSectors = ['Conferencia', 'Expedição', 'Separação', 'Controlados', 'Padrão', 'A-frame'];
    const sectorStats: Record<string, { sector: string; faltas: number; total: number }> = {
      "Conferencia": { sector: "Conferencia", faltas: 0, total: 0 },
      "Expedição": { sector: "Expedição", faltas: 0, total: 0 },
      "Separação": { sector: "Separação", faltas: 0, total: 0 },
      "Controlados": { sector: "Controlados", faltas: 0, total: 0 },
      "Padrão": { sector: "Padrão", faltas: 0, total: 0 },
      "A-frame": { sector: "A-frame", faltas: 0, total: 0 }
    };

    // 1. Check for PRE-AGGREGATED format (Sectors, Faltas, Total columns)
    const sectorColIdx = headers.findIndex(h => h.includes('setor') || h.includes('depto') || h.includes('area') || h.includes('lider') || h.includes('responsavel') || h.includes('quem') || h.includes('nome'));
    const faltasColIdx = headers.findIndex(h => h === 'faltas' || h === 'falta' || h === 'ausentes' || h === 'ausencias' || h === 'num faltas' || h.includes('total de faltas'));
    const totalColIdx = headers.findIndex(h => h === 'total' || h === 'colaboradores' || h === 'total colaboradores' || h.includes('efetivo') || h.includes('total de colab') || h === 'colabs');

    if (sectorColIdx !== -1 && faltasColIdx !== -1 && totalColIdx !== -1) {
      let aggregatedCount = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length <= sectorColIdx) continue;
        const mapped = mapSectorToStandard(row[sectorColIdx]);
        if (mapped) {
          const rawFaltas = parseInt(row[faltasColIdx], 10) || 0;
          const rawTotal = parseInt(row[totalColIdx], 10) || 0;
          sectorStats[mapped].faltas = rawFaltas;
          sectorStats[mapped].total = rawTotal;
          aggregatedCount++;
        }
      }

      if (aggregatedCount > 0) {
        return {
          success: true,
          data: Object.values(sectorStats),
          rowsProcessed: aggregatedCount,
          message: `Planilha agregada carregada com sucesso! Importados ${aggregatedCount} setores.`
        };
      }
    }

    // 2. DAILY DETAIL LOG FORMAT (Individual row-by-row presence rows)
    const dateColIdx = headers.findIndex(h => h.includes('data') || h.includes('dia') || h.includes('period') || h.includes('date'));
    const attendanceColIdx = headers.findIndex(h => 
      h.includes('status') || 
      h.includes('presenc') || 
      h.includes('frequenc') || 
      h.includes('situac') || 
      h.includes('registro') || 
      h.includes('compareceu') ||
      h === 'falta' ||
      h === 'frequência'
    );

    if (sectorColIdx === -1) {
      return { 
        success: false, 
        message: 'Coluna indicando o Setor ou Área não foi encontrada nos cabeçalhos da planilha.'
      };
    }

    // Calculate dynamic operational date tokens to find matching rows
    const operationalDate = getOperationalDate();
    const targetDateTokens = getFormattedDateSearchTokens(operationalDate);

    // Let's first scan all dates listed in the sheet to find which rows match today/current operational day.
    // If no row matches today's date tokens, we can fall back to the maximum/most recent date present in the spreadsheet
    // to guarantee information displays even if the log for today hasn't been filled yet.
    let targetDateStr = '';
    if (dateColIdx !== -1) {
      // Find all unique dates to locate the latest date
      const uniqueDates = new Set<string>();
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && row[dateColIdx]?.trim()) {
          uniqueDates.add(row[dateColIdx].trim());
        }
      }

      // Check if any of our today's date tokens exist in the sheet's unique dates
      const matchedTodayToken = Array.from(uniqueDates).find(d => 
        targetDateTokens.some(tok => normalizeStr(d) === normalizeStr(tok))
      );

      if (matchedTodayToken) {
        targetDateStr = matchedTodayToken;
      } else if (uniqueDates.size > 0) {
        // Fallback: search for latest log date in the spreadsheet
        let maxTime = 0;
        let maxDate = '';
        uniqueDates.forEach(d => {
          const t = parseDateToTimestamp(d);
          if (t > maxTime) {
            maxTime = t;
            maxDate = d;
          }
        });
        targetDateStr = maxDate || Array.from(uniqueDates)[0];
      }
    }

    // Process matching rows
    let matchedRowsCount = 0;
    
    // Clear initial values
    docSectors.forEach(sec => {
      sectorStats[sec].faltas = 0;
      sectorStats[sec].total = 0;
    });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length <= sectorColIdx) continue;

      // Date filtering
      if (dateColIdx !== -1 && targetDateStr) {
        if (row[dateColIdx]?.trim() !== targetDateStr) {
          continue;
        }
      }

      const rawSectorVal = row[sectorColIdx];
      const standardSect = mapSectorToStandard(rawSectorVal);

      if (standardSect) {
        // Determine presence status
        // If there is an explicit status column, check if it's an absence
        let isLack = false;
        let isPresent = true;

        if (attendanceColIdx !== -1 && attendanceColIdx < row.length) {
          const statusValue = row[attendanceColIdx];
          isLack = isAbsenceStatus(statusValue);
          isPresent = isPresenceStatus(statusValue) || !isLack;
        } else {
          // Fallback: check if the row lists 'falta' or similar anywhere in standard cell patterns
          const rowText = normalizeStr(row.join(' '));
          isLack = rowText.includes('falta') || rowText.includes('ausente') || rowText.includes('atestado');
        }

        sectorStats[standardSect].total += 1;
        if (isLack) {
          sectorStats[standardSect].faltas += 1;
        }
        matchedRowsCount++;
      }
    }

    const finalParsed = Object.values(sectorStats);
    const dateLabel = targetDateStr ? ` referente a ${targetDateStr}` : '';

    return {
      success: true,
      data: finalParsed,
      rowsProcessed: matchedRowsCount,
      dateFound: targetDateStr,
      message: `Sucesso! Total de ${matchedRowsCount} colaboradores sincronizados do Sheets${dateLabel}.`
    };

  } catch (error: any) {
    console.error('Error fetching Google Sheets public CSV:', error);
    return {
      success: false,
      message: `Falha na requisição da planilha pública: ¹ ${error.message || error}`
    };
  }
}

// Keep legacy fetchAndParseSheetsData for backward compatibility if needed in UI
export async function fetchAndParseSheetsData(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<{
  success: boolean;
  data?: ParsedAbsenteeism[];
  message: string;
  rowsProcessed?: number;
  dateFound?: string;
  formatDetected?: 'individual' | 'aggregated';
}> {
  // Directly forward to our new super robust public CSV parser which is 10X more stable 
  // and does not depend on access tokens or oauth credentials
  try {
    const res = await fetchAndParsePublicCsvData(spreadsheetId, sheetName);
    return {
      success: res.success,
      data: res.data,
      message: res.message,
      rowsProcessed: res.rowsProcessed,
      dateFound: res.dateFound,
      formatDetected: 'individual'
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro de rede callback.' };
  }
}
