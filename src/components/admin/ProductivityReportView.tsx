import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { db } from '../../lib/firebase';
import { doc, setDoc, deleteDoc, onSnapshot, getDoc, getDocs, collection } from 'firebase/firestore';
import { 
  FileSpreadsheet, 
  Upload, 
  Trash2, 
  Users, 
  CheckSquare, 
  TrendingUp, 
  BarChart2, 
  Search, 
  ChevronRight, 
  Info, 
  Layers, 
  Calculator, 
  ArrowUpDown,
  FileCheck,
  Percent,
  Activity,
  Download,
  Clock,
  Loader2
} from 'lucide-react';

interface NormalizedRow {
  usuario: string;     // Column C / User
  quantidade: number;   // Column E / Quantity
  tpDepos: string;     // Column H / TpDepós
  hora: string;        // Column M / Hour
}

interface ParsedFile {
  name: string;
  headers: string[];
  rows: any[];
  keyMap: {
    colaborador: string;
    quantidade: string;
    horaData: string;
    setor: string;
  };
  normalizedRows?: NormalizedRow[];
  rowCount?: number;
}

interface ProductivityReportViewProps {
  isAdmin?: boolean;
}

export function ProductivityReportView({ isAdmin = false }: ProductivityReportViewProps) {
  const [conferenceFile, setConferenceFile] = useState<ParsedFile | null>(() => {
    try {
      const saved = localStorage.getItem('productivity_conf_file');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [separationFile, setSeparationFile] = useState<ParsedFile | null>(() => {
    try {
      const saved = localStorage.getItem('productivity_sep_file');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [activeSubTab, setActiveSubTab] = useState<'conferencia' | 'separacao'>('conferencia');
  const [searchQuery, setSearchQuery] = useState('');
  
  // TV Mode state
  const [tvMode, setTvMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('productivity_tv_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Matrix and Custom UI mode configurations
  const [viewModeConf, setViewModeConf] = useState<'matrix' | 'list'>('matrix');
  const [viewModeSep, setViewModeSep] = useState<'matrix' | 'list'>('matrix');
  
  const [selectedTpDeposConf, setSelectedTpDeposConf] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prod_selected_tp_depos_conf');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedTpDeposSep, setSelectedTpDeposSep] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prod_selected_tp_depos_sep');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedHoursConf, setSelectedHoursConf] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prod_selected_hours_conf');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedHoursSep, setSelectedHoursSep] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prod_selected_hours_sep');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [confMatrixSort, setConfMatrixSort] = useState<'usuario' | 'total'>('usuario');
  const [confMatrixDir, setConfMatrixDir] = useState<'asc' | 'desc'>('asc');
  const [sepMatrixSort, setSepMatrixSort] = useState<'usuario' | 'total'>('usuario');
  const [sepMatrixDir, setSepMatrixDir] = useState<'asc' | 'desc'>('asc');

  const [isProcessingConf, setIsProcessingConf] = useState(false);
  const [isProcessingSep, setIsProcessingSep] = useState(false);

  // Firestore Synchronization Helpers
  const saveFileToFirestore = async (type: 'conferencia' | 'separacao', file: ParsedFile) => {
    try {
      const mainDocRef = doc(db, 'productivity_reports', type);
      const mainDocSnap = await getDoc(mainDocRef);
      let prevChunkCount = 0;
      if (mainDocSnap.exists()) {
        prevChunkCount = mainDocSnap.data().chunkCount || 0;
      }

      const normalizedRows = file.normalizedRows || [];
      const CHUNK_SIZE = 1500;
      const chunks: NormalizedRow[][] = [];
      
      for (let i = 0; i < normalizedRows.length; i += CHUNK_SIZE) {
        chunks.push(normalizedRows.slice(i, i + CHUNK_SIZE));
      }

      // Write chunks
      const chunkPromises = chunks.map((chunkData, index) => {
        const chunkRef = doc(db, 'productivity_reports', type, 'chunks', 'chunk_' + index);
        return setDoc(chunkRef, { rows: chunkData });
      });
      await Promise.all(chunkPromises);

      // Clean up leftover old chunks if previous chunkCount was higher
      if (prevChunkCount > chunks.length) {
        const deletePromises = [];
        for (let i = chunks.length; i < prevChunkCount; i++) {
          deletePromises.push(deleteDoc(doc(db, 'productivity_reports', type, 'chunks', 'chunk_' + i)));
        }
        await Promise.all(deletePromises);
      }

      // Save main/metadata document
      const docData = {
        name: file.name,
        headers: file.headers || [],
        keyMap: file.keyMap || { colaborador: '', quantidade: '', horaData: '', setor: '' },
        rowCount: file.rowCount || 0,
        chunkCount: chunks.length,
        updatedAt: new Date().toISOString()
      };
      await setDoc(mainDocRef, docData);
    } catch (err) {
      console.error("Erro ao salvar relatório de produtividade no Firestore:", err);
    }
  };

  const deleteFileFromFirestore = async (type: 'conferencia' | 'separacao') => {
    try {
      const mainDocRef = doc(db, 'productivity_reports', type);
      const mainDocSnap = await getDoc(mainDocRef);
      if (mainDocSnap.exists()) {
        const chunkCount = mainDocSnap.data().chunkCount || 0;
        const deletePromises = [];
        for (let i = 0; i < chunkCount; i++) {
          deletePromises.push(deleteDoc(doc(db, 'productivity_reports', type, 'chunks', 'chunk_' + i)));
        }
        await Promise.all(deletePromises);
      }
      await deleteDoc(mainDocRef);
    } catch (err) {
      console.error("Erro ao remover relatório de produtividade no Firestore:", err);
    }
  };

  // Live listener to Firestore so both files sync in real-time across devices
  useEffect(() => {
    const unsubConf = onSnapshot(doc(db, 'productivity_reports', 'conferencia'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const chunkCount = data.chunkCount || 0;
        let allRows: NormalizedRow[] = [];

        if (chunkCount > 0) {
          try {
            const promises = [];
            for (let i = 0; i < chunkCount; i++) {
              promises.push(getDoc(doc(db, 'productivity_reports', 'conferencia', 'chunks', 'chunk_' + i)));
            }
            const snaps = await Promise.all(promises);
            snaps.forEach(snap => {
              if (snap.exists()) {
                const snapData = snap.data();
                if (snapData && Array.isArray(snapData.rows)) {
                  allRows.push(...snapData.rows);
                }
              }
            });
          } catch (err) {
            console.error("Erro ao recuperar chunks de conferência:", err);
          }
        } else if (data.normalizedRows) {
          allRows = data.normalizedRows;
        }

        setConferenceFile({
          name: data.name || '',
          headers: data.headers || [],
          rows: [],
          keyMap: data.keyMap || { colaborador: '', quantidade: '', horaData: '', setor: '' },
          normalizedRows: allRows,
          rowCount: data.rowCount || 0
        });
      } else {
        setConferenceFile(null);
      }
    });

    const unsubSep = onSnapshot(doc(db, 'productivity_reports', 'separacao'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const chunkCount = data.chunkCount || 0;
        let allRows: NormalizedRow[] = [];

        if (chunkCount > 0) {
          try {
            const promises = [];
            for (let i = 0; i < chunkCount; i++) {
              promises.push(getDoc(doc(db, 'productivity_reports', 'separacao', 'chunks', 'chunk_' + i)));
            }
            const snaps = await Promise.all(promises);
            snaps.forEach(snap => {
              if (snap.exists()) {
                const snapData = snap.data();
                if (snapData && Array.isArray(snapData.rows)) {
                  allRows.push(...snapData.rows);
                }
              }
            });
          } catch (err) {
            console.error("Erro ao recuperar chunks de separação:", err);
          }
        } else if (data.normalizedRows) {
          allRows = data.normalizedRows;
        }

        setSeparationFile({
          name: data.name || '',
          headers: data.headers || [],
          rows: [],
          keyMap: data.keyMap || { colaborador: '', quantidade: '', horaData: '', setor: '' },
          normalizedRows: allRows,
          rowCount: data.rowCount || 0
        });
      } else {
        setSeparationFile(null);
      }
    });

    return () => {
      unsubConf();
      unsubSep();
    };
  }, []);

  // Synchronize TV mode to localStorage
  useEffect(() => {
    localStorage.setItem('productivity_tv_mode', String(tvMode));
  }, [tvMode]);

  // TV mode intervals: switches between Conferencia and Separacao every 10 seconds
  useEffect(() => {
    if (!tvMode) return;
    const interval = setInterval(() => {
      setActiveSubTab((prev) => (prev === 'conferencia' ? 'separacao' : 'conferencia'));
    }, 10000);
    return () => clearInterval(interval);
  }, [tvMode]);

  // Sync selected filters to localStorage
  useEffect(() => {
    localStorage.setItem('prod_selected_tp_depos_conf', JSON.stringify(selectedTpDeposConf));
  }, [selectedTpDeposConf]);

  useEffect(() => {
    localStorage.setItem('prod_selected_tp_depos_sep', JSON.stringify(selectedTpDeposSep));
  }, [selectedTpDeposSep]);

  useEffect(() => {
    localStorage.setItem('prod_selected_hours_conf', JSON.stringify(selectedHoursConf));
  }, [selectedHoursConf]);

  useEffect(() => {
    localStorage.setItem('prod_selected_hours_sep', JSON.stringify(selectedHoursSep));
  }, [selectedHoursSep]);

  // Pivot options for Conference
  const [confGroupBy, setConfGroupBy] = useState<string>('colaborador');
  const [confMetric, setConfMetric] = useState<'sum' | 'count' | 'average'>('sum');
  const [confSortField, setConfSortField] = useState<'grouped' | 'value' | 'count'>('value');
  const [confSortOrder, setConfSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pivot options for Separation
  const [sepGroupBy, setSepGroupBy] = useState<string>('colaborador');
  const [sepMetric, setSepMetric] = useState<'sum' | 'count' | 'average'>('sum');
  const [sepSortField, setSepSortField] = useState<'grouped' | 'value' | 'count'>('value');
  const [sepSortOrder, setSepSortOrder] = useState<'asc' | 'desc'>('desc');

  const confInputRef = useRef<HTMLInputElement>(null);
  const sepInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect columns based on common logistics/spreadsheet patterns
  const autoDetectColumns = (headers: string[]): ParsedFile['keyMap'] => {
    const map = { colaborador: '', quantidade: '', horaData: '', setor: '' };
    
    const colLabels = ['colaborador', 'usuario', 'usuário', 'nome', 'operador', 'conferente', 'separador', 'id_usuario', 'user', 'owner', 'funcionário', 'funcionario'];
    const qtyLabels = ['quantidade', 'qtd', 'volume', 'it_unidades', 'pecas', 'peças', 'unidades', 'total', 'caixas', 'cubagem', 'conferida', 'conferido', 'separado', 'lancamentos', 'lançamentos'];
    const timeLabels = ['hora', 'data', 'data/hora', 'data_hora', 'time', 'date', 'registro', 'timestamp', 'horario', 'horário', 'periodo', 'período'];
    const sectorLabels = ['setor', 'área', 'area', 'zona', 'corredor', 'linha', 'tipo', 'operacao', 'operação', 'modulo', 'módulo'];

    const findMatch = (labels: string[]) => {
      const match = headers.find(h => {
        const norm = h.toLowerCase().trim();
        return labels.some(lbl => norm === lbl || norm.includes(lbl));
      });
      return match || '';
    };

    map.colaborador = findMatch(colLabels) || headers[0] || '';
    map.quantidade = findMatch(qtyLabels) || headers.find(h => h.toLowerCase().includes('qtd') || h.toLowerCase().includes('un')) || '';
    map.horaData = findMatch(timeLabels) || '';
    map.setor = findMatch(sectorLabels) || '';

    return map;
  };

  // Safe helper to clean value to number
  const safeParseFloat = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = val.toString().trim();
    if (str === '—' || str === '') return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  };

  // Hour parsing and formatting helper
  const formatHourBlock = (val: any): string => {
    if (!val) return '01:00:00'; // Default backup
    let str = val.toString().trim();
    
    // If it's a date-time like "2026-06-16 17:34:23", extract the time part
    if (str.includes(' ') && str.includes(':')) {
      str = str.split(' ')[1];
    }
    
    // Check if we have an hour match like HH:MM:SS or HH:MM
    const match = str.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const hh = match[1].padStart(2, '0');
      return `${hh}:00:00`;
    }
    
    // Fallback: if it's a number representing numeric hour
    if (!isNaN(Number(str))) {
      const num = Math.floor(Number(str));
      if (num >= 0 && num < 24) {
        return `${num.toString().padStart(2, '0')}:00:00`;
      }
    }
    
    // If it is already something like HHh, normalize
    const cleanHourMatch = str.match(/^(\d{1,2})/);
    if (cleanHourMatch) {
      return `${cleanHourMatch[1].padStart(2, '0')}:00:00`;
    }

    return str;
  };

  // Extractor matching excel column positions with high resilience
  const getRowValByLetter = (row: any, letter: string, indexFallback: number, keys: string[]): any => {
    if (Array.isArray(row)) {
      return row[indexFallback];
    }
    if (typeof row === 'object' && row !== null) {
      // Direct property letter lookup
      if (letter in row) return row[letter];
      const upperLetter = letter.toUpperCase();
      if (upperLetter in row) return row[upperLetter];
      const lowerLetter = letter.toLowerCase();
      if (lowerLetter in row) return row[lowerLetter];

      // Index based matching
      if (keys && keys[indexFallback]) {
        return row[keys[indexFallback]];
      }

      // Special __EMPTY_ prefix used by sheet_to_json for nameless columns
      const rowKeys = Object.keys(row);
      const emptyMatchKey = rowKeys.find(k => k.includes(`__EMPTY_${indexFallback}`));
      if (emptyMatchKey) return row[emptyMatchKey];

      // Named checks
      if (letter === 'C') {
        const foundKey = rowKeys.find(k => ['colaborador', 'usuario', 'usuário', 'operador', 'conferente', 'separador'].some(x => k.toLowerCase().includes(x)));
        if (foundKey) return row[foundKey];
      } else if (letter === 'E') {
        const foundKey = rowKeys.find(k => ['quantidade', 'qtd', 'volume', 'it_unidades', 'pecas', 'peças', 'unidades'].some(x => k.toLowerCase().includes(x)));
        if (foundKey) return row[foundKey];
      } else if (letter === 'H') {
        const foundKey = rowKeys.find(k => ['tpdepós.', 'tpdepós', 'tpdepós', 'tipo depósito', 'deposito', 'depósito', 'tpdepos', 'tp.dep'].some(x => k.toLowerCase().includes(x)));
        if (foundKey) return row[foundKey];
      } else if (letter === 'M') {
        const foundKey = rowKeys.find(k => ['hora', 'horário', 'horario', 'time'].some(x => k.toLowerCase().includes(x)));
        if (foundKey) return row[foundKey];
      } else if (letter === 'J') {
        const foundKey = rowKeys.find(k => ['colaborador', 'usuario', 'usuário', 'operador', 'conferente', 'separador', 'id_usuario'].some(x => k.toLowerCase().includes(x)));
        if (foundKey) return row[foundKey];
      } else if (letter === 'D') {
        const foundKey = rowKeys.find(k => ['quantidade', 'qtd', 'volume', 'it_unidades', 'pecas', 'peças', 'unidades', 'contagem', 'codigo', 'item', 'id'].some(x => k.toLowerCase().includes(x)));
        if (foundKey) return row[foundKey];
      } else if (letter === 'I') {
        const foundKey = rowKeys.find(k => ['hora', 'horário', 'horario', 'time'].some(x => k.toLowerCase().includes(x)));
        if (foundKey) return row[foundKey];
      } else if (letter === 'O') {
        const foundKey = rowKeys.find(k => ['tpdepós.', 'tpdepós', 'tpdepós', 'tipo depósito', 'deposito', 'depósito', 'tpdepos', 'tp.dep'].some(x => k.toLowerCase().includes(x)));
        if (foundKey) return row[foundKey];
      }
    }
    return undefined;
  };

  const normalizeRows = (rawRows: any[], keys: string[], type: 'conferencia' | 'separacao'): NormalizedRow[] => {
    const result: NormalizedRow[] = [];
    
    rawRows.forEach((row) => {
      let rawUser;
      let qVal = 0;
      let rawTp;
      let rawHour;

      if (type === 'conferencia') {
        rawUser = getRowValByLetter(row, 'C', 2, keys);
        const rawQty = getRowValByLetter(row, 'E', 4, keys);
        rawTp = getRowValByLetter(row, 'H', 7, keys);
        rawHour = getRowValByLetter(row, 'M', 12, keys);
        qVal = safeParseFloat(rawQty);
      } else {
        // separacao: J (index 9) for User, D (index 3) for Counting, I (index 8) for Hour, O (index 14) for TpDepós
        rawUser = getRowValByLetter(row, 'J', 9, keys);
        const rawValD = getRowValByLetter(row, 'D', 3, keys);
        rawTp = getRowValByLetter(row, 'O', 14, keys);
        rawHour = getRowValByLetter(row, 'I', 8, keys);

        // For counting of Column D:
        if (rawValD !== undefined && rawValD !== null) {
          const dStr = rawValD.toString().trim();
          if (dStr !== '' && dStr !== '—') {
            qVal = 1;
          }
        }
      }

      const userStr = rawUser ? rawUser.toString().trim() : '';
      const tpStr = rawTp ? rawTp.toString().trim() : '';
      
      // Skip the header row itself if it is parsed as data
      const userLower = userStr.toLowerCase();
      if (
        userLower === 'usuário' || 
        userLower === 'usuario' || 
        userLower === 'colaborador' ||
        userLower === 'separador' ||
        userLower === 'conferente' ||
        tpStr.toLowerCase() === 'tpdepós.' || 
        tpStr.toLowerCase() === 'tpdepós' ||
        tpStr.toLowerCase() === 'tpdepos'
      ) {
        return; 
      }

      if (!rawUser && qVal === 0 && !rawTp && !rawHour) {
        // Skip entirely empty row
        return;
      }

      result.push({
        usuario: userStr || (type === 'conferencia' ? 'CONFERENTE INDEFINIDO' : 'SEPARADOR INDEFINIDO'),
        quantidade: qVal,
        tpDepos: tpStr || 'Outros',
        hora: formatHourBlock(rawHour)
      });
    });

    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'conferencia' | 'separacao') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'conferencia') {
      setIsProcessingConf(true);
    } else {
      setIsProcessingSep(true);
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            if (results.data && results.data.length > 0) {
              const rawRows = results.data as any[][];
              const headers = (rawRows[0] as string[]) || [];
              
              // Generate standard schema mapping using raw letters
              const keyMap = autoDetectColumns(headers);
              const normalized = normalizeRows(rawRows, headers, type);

              const parsed: ParsedFile = {
                name: file.name,
                headers,
                rows: rawRows,
                keyMap,
                normalizedRows: normalized,
                rowCount: rawRows.length
              };
              if (type === 'conferencia') {
                setConferenceFile(parsed);
                await saveFileToFirestore('conferencia', parsed);
                try {
                  // Strip the giant raw rows array before persisting to prevent QuotaExceededError and slow JSON parsing
                  const storageParsed = { ...parsed, rows: [] };
                  localStorage.setItem('productivity_conf_file', JSON.stringify(storageParsed));
                } catch (err) {
                  console.warn("Storage quota limit reached, skipping serialization of full report:", err);
                }
              } else {
                setSeparationFile(parsed);
                await saveFileToFirestore('separacao', parsed);
                try {
                  // Strip the giant raw rows array before persisting
                  const storageParsed = { ...parsed, rows: [] };
                  localStorage.setItem('productivity_sep_file', JSON.stringify(storageParsed));
                } catch (err) {
                  console.warn("Storage quota limit reached, skipping serialization of full report:", err);
                }
              }
            }
          } catch (err) {
            console.error("Error processing CSV contents:", err);
          } finally {
            if (type === 'conferencia') {
              setIsProcessingConf(false);
            } else {
              setIsProcessingSep(false);
            }
            if (e.target) {
              e.target.value = '';
            }
          }
        },
        error: (err) => {
          console.error("Error parsing CSV:", err);
          if (type === 'conferencia') {
            setIsProcessingConf(false);
          } else {
            setIsProcessingSep(false);
          }
          if (e.target) {
            e.target.value = '';
          }
        }
      });
    } else {
      // Excel Reader
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          
          // Clean, multi-layered resilient accessor for SheetJS (xlsx)
          const readFn = (typeof XLSX !== 'undefined' && XLSX && XLSX.read) || (XLSX as any)?.default?.read || (typeof window !== 'undefined' && (window as any).XLSX?.read);
          const utilsObj = (typeof XLSX !== 'undefined' && XLSX && XLSX.utils) || (XLSX as any)?.default?.utils || (typeof window !== 'undefined' && (window as any).XLSX?.utils);

          if (!readFn || !utilsObj) {
            console.error("XLSX library loading failed. Details:");
            throw new Error("Não foi possível carregar as funções de leitura da biblioteca de planilhas (XLSX).");
          }

          const workbook = readFn(bstr, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = utilsObj.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (rawRows.length > 0) {
            const headers = (rawRows[0] as string[]) || [];
            const keyMap = autoDetectColumns(headers);
            const normalized = normalizeRows(rawRows, headers, type);

            const parsed: ParsedFile = {
              name: file.name,
              headers,
              rows: rawRows,
              keyMap,
              normalizedRows: normalized,
              rowCount: rawRows.length
            };
            if (type === 'conferencia') {
              setConferenceFile(parsed);
              await saveFileToFirestore('conferencia', parsed);
              try {
                const storageParsed = { ...parsed, rows: [] };
                localStorage.setItem('productivity_conf_file', JSON.stringify(storageParsed));
              } catch (err) {
                console.warn("Storage quota limit reached, skipping serialization of full report:", err);
              }
            } else {
              setSeparationFile(parsed);
              await saveFileToFirestore('separacao', parsed);
              try {
                const storageParsed = { ...parsed, rows: [] };
                localStorage.setItem('productivity_sep_file', JSON.stringify(storageParsed));
              } catch (err) {
                console.warn("Storage quota limit reached, skipping serialization of full report:", err);
              }
            }
          }
        } catch (err) {
          console.error("Error parsing Excel:", err);
        } finally {
          if (type === 'conferencia') {
            setIsProcessingConf(false);
          } else {
            setIsProcessingSep(false);
          }
          if (e.target) {
            e.target.value = '';
          }
        }
      };
      reader.onerror = () => {
        if (type === 'conferencia') {
          setIsProcessingConf(false);
        } else {
          setIsProcessingSep(false);
        }
        if (e.target) {
          e.target.value = '';
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const removeFile = (type: 'conferencia' | 'separacao') => {
    if (type === 'conferencia') {
      setConferenceFile(null);
      deleteFileFromFirestore('conferencia');
      localStorage.removeItem('productivity_conf_file');
      if (confInputRef.current) confInputRef.current.value = '';
    } else {
      setSeparationFile(null);
      deleteFileFromFirestore('separacao');
      localStorage.removeItem('productivity_sep_file');
      if (sepInputRef.current) sepInputRef.current.value = '';
    }
  };

  // Generate dynamic pivot array
  const generatePivotData = (file: ParsedFile, groupByField: string, metric: 'sum' | 'count' | 'average') => {
    // If we have normalized rows, prioritize them for consistency and respect multi-select deposit filters!
    if (file.normalizedRows) {
      const activeSelectedTpDepos = activeSubTab === 'conferencia' ? selectedTpDeposConf : selectedTpDeposSep;
      let rowsList = file.normalizedRows;
      
      // Apply the exact same multi-select filter!
      if (activeSelectedTpDepos.length > 0) {
        rowsList = rowsList.filter(r => r.tpDepos && activeSelectedTpDepos.includes(r.tpDepos.trim()));
      }

      const groups: Record<string, { grouped: string; value: number; count: number; rawValues: number[] }> = {};
      let totalGlobalVolume = 0;

      rowsList.forEach(r => {
        let groupVal = '';
        if (groupByField === 'colaborador') {
          groupVal = r.usuario;
        } else if (groupByField === 'setor') {
          groupVal = r.tpDepos;
        } else if (groupByField === 'horaData') {
          groupVal = r.hora;
        } else {
          groupVal = r.usuario;
        }

        const qVal = r.quantidade;
        totalGlobalVolume += qVal;

        if (!groups[groupVal]) {
          groups[groupVal] = {
            grouped: groupVal,
            value: 0,
            count: 0,
            rawValues: []
          };
        }

        groups[groupVal].rawValues.push(qVal);
        groups[groupVal].count += 1;
      });

      // Compute metric values
      const resultList = Object.values(groups).map(g => {
        let val = 0;
        if (metric === 'sum') {
          val = g.rawValues.reduce((sum, v) => sum + v, 0);
        } else if (metric === 'count') {
          val = g.count;
        } else if (metric === 'average') {
          const sum = g.rawValues.reduce((sum, v) => sum + v, 0);
          val = g.rawValues.length > 0 ? sum / g.rawValues.length : 0;
        }

        return {
          grouped: g.grouped,
          value: Number(val.toFixed(2)),
          count: g.count,
          percentShare: totalGlobalVolume > 0 ? (g.rawValues.reduce((sum, v) => sum + v, 0) / totalGlobalVolume) * 105 : 0 // Normalized index
        };
      });

      return {
        rows: resultList,
        totalVolume: totalGlobalVolume,
        totalTransactions: rowsList.length
      };
    }

    const key = file.keyMap[groupByField as keyof ParsedFile['keyMap']] || groupByField;
    const qtyKey = file.keyMap.quantidade;

    // Grouping container
    const groupsFallback: Record<string, { grouped: string; value: number; count: number; rawValues: number[] }> = {};

    let totalGlobalVolumeFallback = 0;

    file.rows.forEach(row => {
      let groupVal = row[key] ? row[key].toString().trim() : 'Não Informado';
      // format hour grouping if configured
      if (groupByField === 'horaData' && groupVal.includes(':')) {
        // e.g. "17:34:23" -> "17:00" Hour blocks
        const match = groupVal.match(/^(\d{2})/);
        if (match) groupVal = `${match[1]}:00`;
      }

      const qVal = qtyKey ? safeParseFloat(row[qtyKey]) : 1;
      totalGlobalVolumeFallback += qVal;

      if (!groupsFallback[groupVal]) {
        groupsFallback[groupVal] = {
          grouped: groupVal,
          value: 0,
          count: 0,
          rawValues: []
        };
      }

      groupsFallback[groupVal].rawValues.push(qVal);
      groupsFallback[groupVal].count += 1;
    });

    // Compute metric values
    const resultListFallback = Object.values(groupsFallback).map(g => {
      let val = 0;
      if (metric === 'sum') {
        val = g.rawValues.reduce((sum, v) => sum + v, 0);
      } else if (metric === 'count') {
        val = g.count;
      } else if (metric === 'average') {
        const sum = g.rawValues.reduce((sum, v) => sum + v, 0);
        val = g.rawValues.length > 0 ? sum / g.rawValues.length : 0;
      }

      return {
        grouped: g.grouped,
        value: Number(val.toFixed(2)),
        count: g.count,
        percentShare: totalGlobalVolumeFallback > 0 ? (g.rawValues.reduce((sum, v) => sum + v, 0) / totalGlobalVolumeFallback) * 105 : 0 // Normalized index
      };
    });

    return {
      rows: resultListFallback,
      totalVolume: totalGlobalVolumeFallback,
      totalTransactions: file.rows.length
    };
  };

  // Sort and filter results
  const computeTableResults = (
    file: ParsedFile | null, 
    groupBy: string, 
    metric: 'sum' | 'count' | 'average',
    sortField: 'grouped' | 'value' | 'count',
    sortOrder: 'asc' | 'desc'
  ) => {
    if (!file) return { rows: [], totalVolume: 0, totalTransactions: 0 };
    
    let { rows, totalVolume, totalTransactions } = generatePivotData(file, groupBy, metric);

    // Apply filter search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => r.grouped.toLowerCase().includes(q));
    }

    // Sort results
    rows.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });

    return { rows, totalVolume, totalTransactions };
  };

  const activeFile = activeSubTab === 'conferencia' ? conferenceFile : separationFile;

  // Compute stats
  const activePivot = computeTableResults(
    activeFile,
    activeSubTab === 'conferencia' ? confGroupBy : sepGroupBy,
    activeSubTab === 'conferencia' ? confMetric : sepMetric,
    activeSubTab === 'conferencia' ? confSortField : sepSortField,
    activeSubTab === 'conferencia' ? confSortOrder : sepSortOrder
  );

  const toggleSort = (field: 'grouped' | 'value' | 'count') => {
    if (activeSubTab === 'conferencia') {
      if (confSortField === field) {
        setConfSortOrder(confSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setConfSortField(field);
        setConfSortOrder('desc');
      }
    } else {
      if (sepSortField === field) {
        setSepSortOrder(sepSortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSepSortField(field);
        setSepSortOrder('desc');
      }
    }
  };

  const triggerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const renderMatrixView = () => {
    if (!activeFile || !activeFile.normalizedRows) {
      return (
        <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-xs font-black uppercase text-slate-705">Estrutura de Matriz Não Carregada</h4>
          <p className="text-[10px] text-slate-450 mt-1 max-w-sm mx-auto">
            {activeSubTab === 'conferencia' 
              ? 'Certifique-se de que o relatório de Conferência possui as colunas correspondentes de Usuário (C), Quantidade (E), Tipo Depósito (H) e Hora (M).'
              : 'Certifique-se de que o relatório de Separação possui as colunas correspondentes de Usuário (J), Contagem (D), Tipo Depósito (O) e Hora (I).'}
          </p>
        </div>
      );
    }

    // 1. Filter normalized rows
    let rows = activeFile.normalizedRows;

    // Filter by tpDepos multi-select
    const activeSelectedTpDepos = activeSubTab === 'conferencia' ? selectedTpDeposConf : selectedTpDeposSep;
    const setActiveSelectedTpDepos = activeSubTab === 'conferencia' ? setSelectedTpDeposConf : setSelectedTpDeposSep;

    if (activeSelectedTpDepos.length > 0) {
      rows = rows.filter(r => r.tpDepos && activeSelectedTpDepos.includes(r.tpDepos.trim()));
    }

    // Filter by hour multi-select (Sync'ed from local state, visible on Admin)
    const activeSelectedHours = activeSubTab === 'conferencia' ? selectedHoursConf : selectedHoursSep;
    const setActiveSelectedHours = activeSubTab === 'conferencia' ? setSelectedHoursConf : setSelectedHoursSep;

    if (activeSelectedHours.length > 0) {
      rows = rows.filter(r => r.hora && activeSelectedHours.includes(r.hora.trim()));
    }

    // Filter by Search Query (matching usuario)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => r.usuario.toLowerCase().includes(q));
    }

    // 2. Extract unique users and unique hours
    const uniqueUsersSet = new Set<string>();
    const uniqueHoursSet = new Set<string>();

    rows.forEach(r => {
      uniqueUsersSet.add(r.usuario);
      uniqueHoursSet.add(r.hora);
    });

    const uniqueUsers = Array.from(uniqueUsersSet);
    const uniqueHours = Array.from(uniqueHoursSet).sort((a, b) => a.localeCompare(b));

    // 3. Populate matrix aggregation
    const matrix: Record<string, Record<string, number>> = {};
    const userTotals: Record<string, number> = {};
    const hourTotals: Record<string, number> = {};
    let grandTotal = 0;

    uniqueUsers.forEach(u => {
      matrix[u] = {};
      userTotals[u] = 0;
      uniqueHours.forEach(h => {
        matrix[u][h] = 0;
      });
    });

    uniqueHours.forEach(h => {
      hourTotals[h] = 0;
    });

    rows.forEach(r => {
      const u = r.usuario;
      const h = r.hora;
      const q = r.quantidade;

      if (matrix[u] && matrix[u][h] !== undefined) {
        matrix[u][h] += q;
        userTotals[u] += q;
        hourTotals[h] += q;
        grandTotal += q;
      }
    });

    const currentTarget = activeSubTab === 'conferencia' ? 600 : 150;

    // 4. Sort unique users
    const activeSort = activeSubTab === 'conferencia' ? confMatrixSort : sepMatrixSort;
    const activeDir = activeSubTab === 'conferencia' ? confMatrixDir : sepMatrixDir;

    const toggleMatrixSort = (field: 'usuario' | 'total') => {
      if (activeSubTab === 'conferencia') {
        if (confMatrixSort === field) {
          setConfMatrixDir(confMatrixDir === 'asc' ? 'desc' : 'asc');
        } else {
          setConfMatrixSort(field);
          setConfMatrixDir('desc');
        }
      } else {
        if (sepMatrixSort === field) {
          setSepMatrixDir(sepMatrixDir === 'asc' ? 'desc' : 'asc');
        } else {
          setSepMatrixSort(field);
          setSepMatrixDir('desc');
        }
      }
    };

    const sortedUsers = [...uniqueUsers].sort((a, b) => {
      if (activeSort === 'usuario') {
        return activeDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      } else {
        const totalA = userTotals[a] || 0;
        const totalB = userTotals[b] || 0;
        return activeDir === 'asc' ? totalA - totalB : totalB - totalA;
      }
    });

    // 5. Build dynamic chips for TpDepós and Hours (from source rows so user can always select them)
    const uniqueTpDeposValuesSet = new Set<string>();
    const uniqueHoursValuesSet = new Set<string>();
    activeFile.normalizedRows.forEach(r => {
      if (r.tpDepos) {
        const cleaned = r.tpDepos.trim();
        if (cleaned) uniqueTpDeposValuesSet.add(cleaned);
      }
      if (r.hora) {
        const cleaned = r.hora.trim();
        if (cleaned) uniqueHoursValuesSet.add(cleaned);
      }
    });
    const uniqueTpDeposValues = Array.from(uniqueTpDeposValuesSet).sort();
    const uniqueHoursValues = Array.from(uniqueHoursValuesSet).sort();

    const handleToggleTpDepos = (val: string) => {
      if (activeSelectedTpDepos.length === 0) {
        setActiveSelectedTpDepos([val]);
      } else {
        if (activeSelectedTpDepos.includes(val)) {
          const next = activeSelectedTpDepos.filter(item => item !== val);
          setActiveSelectedTpDepos(next);
        } else {
          setActiveSelectedTpDepos([...activeSelectedTpDepos, val]);
        }
      }
    };

    const handleSelectAll = () => {
      setActiveSelectedTpDepos([]);
    };

    const handleToggleHours = (val: string) => {
      if (activeSelectedHours.length === 0) {
        setActiveSelectedHours([val]);
      } else {
        if (activeSelectedHours.includes(val)) {
          const next = activeSelectedHours.filter(item => item !== val);
          setActiveSelectedHours(next);
        } else {
          setActiveSelectedHours([...activeSelectedHours, val]);
        }
      }
    };

    const handleSelectAllHours = () => {
      setActiveSelectedHours([]);
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chips filter bar (matching image TpDepós. but now supporting MULTI-SELECT!) */}
          <div className="p-5 bg-slate-50 border border-slate-150 rounded-2xl space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1 px-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-[10px] font-black uppercase tracking-wide">
                  Depósitos (TpDepós)
                </span>
                <div className="text-xs font-bold text-slate-500">
                  <span className="bg-blue-100 px-2 text-blue-700 font-extrabold rounded">
                    {activeSelectedTpDepos.length === 0 ? 'TODOS' : `${activeSelectedTpDepos.length} depots`}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
              <button
                onClick={handleSelectAll}
                className={`px-3 py-1.5 border text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                  activeSelectedTpDepos.length === 0
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todos (Limpar)
              </button>
              {uniqueTpDeposValues.map(val => {
                const isSelected = activeSelectedTpDepos.includes(val);
                return (
                  <button
                    key={val}
                    onClick={() => handleToggleTpDepos(val)}
                    className={`px-3 py-1.5 border text-[10px] rounded-xl transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-black'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-400'}`} />
                    {val}
                  </button>
                );
              })}
            </div>

            {activeSelectedTpDepos.length > 0 && (
              <p className="text-[10px] text-slate-450 font-bold tracking-tight italic">
                Filtrando: <span className="text-blue-600">{activeSelectedTpDepos.join(', ')}</span>
              </p>
            )}
          </div>

          {/* New Hours Filter Bar */}
          <div className="p-5 bg-slate-50 border border-slate-150 rounded-2xl space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1 px-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-[10px] font-black uppercase tracking-wide">
                  Horário de Lançamento (M)
                </span>
                <div className="text-xs font-bold text-slate-500">
                  <span className="bg-blue-100 px-2 text-blue-700 font-extrabold rounded">
                    {activeSelectedHours.length === 0 ? 'TODAS HORAS' : `${activeSelectedHours.length} horas`}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
              <button
                onClick={handleSelectAllHours}
                className={`px-3 py-1.5 border text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                  activeSelectedHours.length === 0
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todas Horas (Limpar)
              </button>
              {uniqueHoursValues.map(val => {
                const isSelected = activeSelectedHours.includes(val);
                const displayVal = val.length === 8 && val.includes(':') ? val.substring(0, 5) + 'h' : val;
                return (
                  <button
                    key={val}
                    onClick={() => handleToggleHours(val)}
                    className={`px-3 py-1.5 border text-[10px] rounded-xl transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-black'
                        : 'bg-white border-slate-200 text-slate-705 hover:bg-slate-105 font-bold'
                    }`}
                  >
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-400'}`} />
                    {displayVal}
                  </button>
                );
              })}
            </div>

            {activeSelectedHours.length > 0 && (
              <p className="text-[10px] text-slate-450 font-bold tracking-tight italic">
                Filtrando: <span className="text-blue-600">{activeSelectedHours.map(h => h.length === 8 && h.includes(':') ? h.substring(0, 5) + 'h' : h).join(', ')}</span>
              </p>
            )}
          </div>
        </div>

        {/* Visual Legend of targets for better guidance */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 border border-slate-150 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Meta de Produtividade Ativa:</span>
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-black">
              {activeSubTab === 'conferencia' ? '600 Unidades (Conferência)' : '150 Contagens (Separação)'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3.5 text-[10px] uppercase font-black tracking-wider">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-3 h-3 bg-emerald-500 rounded-md" />
              Atingiu Meta (≥ {activeSubTab === 'conferencia' ? '600' : '150'})
            </div>
            <div className="flex items-center gap-1.5 text-rose-650">
              <span className="w-3 h-3 bg-rose-500 rounded-md" />
              Abaixo da Meta (&lt; {activeSubTab === 'conferencia' ? '600' : '150'})
            </div>
          </div>
        </div>

        {/* Dynamic Matrix Table */}
        <div className="overflow-x-auto border border-slate-150 rounded-2xl shadow-sm bg-white">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              {/* Top Sub-Header */}
              <tr className="bg-blue-50/70 border-b border-slate-200">
                <th colSpan={uniqueHours.length + 2} className="px-5 py-2.5 text-[10px] font-extrabold text-blue-900 uppercase tracking-widest bg-blue-50/50">
                  {activeSubTab === 'conferencia' 
                    ? 'Soma de Quantidade Hora por Usuário (Coluna E/M)'
                    : 'Contagem de Registros Hora por Usuário (Coluna D/I - Contagem)'}
                </th>
              </tr>
              {/* Standard Headers Row */}
              <tr className="bg-slate-50/80 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-150">
                <th 
                  className="px-5 py-3 cursor-pointer hover:bg-slate-100/85 transition-colors uppercase border-r border-slate-150 w-[240px]"
                  onClick={() => toggleMatrixSort('usuario')}
                >
                  <div className="flex items-center gap-1">
                    {activeSubTab === 'conferencia' ? 'Conferente' : 'Separador'} (Coluna {activeSubTab === 'conferencia' ? 'C' : 'J'})
                    <ArrowUpDown className="w-3 text-slate-400" />
                  </div>
                </th>
                {uniqueHours.map(hour => (
                  <th key={hour} className="px-4 py-3 text-center border-r border-slate-150 min-w-[100px] text-slate-800 font-black">
                    {hour}
                  </th>
                ))}
                <th 
                  className="px-5 py-3 text-right cursor-pointer hover:bg-slate-100/85 transition-colors font-black text-slate-900"
                  onClick={() => toggleMatrixSort('total')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Total Geral
                    <ArrowUpDown className="w-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={uniqueHours.length + 2} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Nenhum colaborador encontrado para estes filtros.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => {
                  const uTotal = userTotals[user] || 0;
                  return (
                    <tr key={user} className="border-b border-slate-150 hover:bg-blue-50/20 transition-all font-mono text-xs">
                      {/* User Info Column */}
                      <td className="px-5 py-3 text-slate-900 border-r border-slate-100 text-left font-black tracking-tight select-all">
                        {user}
                      </td>
                      {/* Hourly Columns style based on Hourly value or general is_productive flag */}
                      {uniqueHours.map(hour => {
                        const cellVal = matrix[user]?.[hour] || 0;
                        const meetsTarget = cellVal >= currentTarget;
                        return (
                          <td 
                            key={hour} 
                            className={`px-4 py-3 text-center border-r border-slate-100 font-bold text-xs ${
                              cellVal === 0 
                                ? 'text-slate-350 font-normal bg-slate-50/5' 
                                : meetsTarget
                                  ? 'text-emerald-600 font-black bg-emerald-50/15'
                                  : 'text-rose-600 font-extrabold bg-rose-50/10'
                            }`}
                          >
                            {cellVal > 0 ? cellVal : '—'}
                          </td>
                        );
                      })}
                      {/* Row Total styled strictly by the target */}
                      <td className={`px-5 py-3 text-right font-black border-l border-slate-150 ${
                        uTotal === 0
                          ? 'text-slate-350 bg-slate-50/10'
                          : uTotal >= currentTarget
                            ? 'text-emerald-600 bg-emerald-50/30'
                            : 'text-rose-650 bg-rose-50/30'
                      }`}>
                        {uTotal > 0 ? uTotal : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
              {/* Grand Total Row at bottom */}
              {sortedUsers.length > 0 && (
                <tr className="bg-slate-100/85 border-t-2 border-slate-300 font-mono text-xs font-black text-slate-900">
                  <td className="px-5 py-3 border-r border-slate-250 font-black text-slate-800 uppercase tracking-wider">
                    Total Geral
                  </td>
                  {uniqueHours.map(hour => {
                    const hTotal = hourTotals[hour] || 0;
                    const meetsTarget = hTotal >= currentTarget;
                    return (
                      <td 
                        key={hour} 
                        className={`px-4 py-3 text-center border-r border-slate-250 font-black ${
                          hTotal === 0
                            ? 'text-slate-400'
                            : meetsTarget
                              ? 'text-emerald-700 font-black'
                              : 'text-rose-700 font-extrabold'
                        }`}
                      >
                        {hTotal > 0 ? hTotal : '—'}
                      </td>
                    );
                  })}
                  <td className={`px-5 py-3 text-right font-black ${
                    grandTotal >= currentTarget
                      ? 'text-emerald-700 bg-emerald-100/40'
                      : 'text-rose-700 bg-rose-100/30'
                  }`}>
                    {grandTotal}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderOperationsView = () => {
    const activeFile = activeSubTab === 'conferencia' ? conferenceFile : separationFile;

    if (!activeFile || !activeFile.normalizedRows || activeFile.normalizedRows.length === 0) {
      return (
        <div className="space-y-8 max-w-7xl mx-auto">
          {/* Beautiful Header */}
          <div className="p-6 bg-gradient-to-r from-slate-900 to-blue-900 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_50%)]" />
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Painel de Operações</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Métricas de Produtividade</h2>
              <p className="text-slate-350 text-xs font-semibold max-w-2xl leading-relaxed">
                Painel visual focado em desempenho, cumprimento de metas e rankings para conferência e separação de mercadorias.
              </p>
            </div>
            
            <div className="flex bg-slate-800/40 p-1 rounded-2xl border border-slate-700 relative z-10 flex-wrap gap-2 items-center">
              <button
                onClick={() => setTvMode(!tvMode)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                  tvMode 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' 
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${tvMode ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
                <span>Modo TV: {tvMode ? 'On' : 'Off'}</span>
              </button>
              <div className="h-5 w-px bg-slate-700/60" />
              <button
                onClick={() => { setActiveSubTab('conferencia'); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeSubTab === 'conferencia' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Conferência
              </button>
              <button
                onClick={() => { setActiveSubTab('separacao'); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeSubTab === 'separacao' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Separação
              </button>
            </div>
          </div>

          {/* Empty State Card */}
          <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center shadow-sm">
            <div className="p-4 bg-amber-50 rounded-full text-amber-500 mb-4 animate-pulse">
              <Info className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-lg uppercase tracking-tight">Aguardando dados da operação</h3>
            <p className="text-slate-500 max-w-md mt-2 leading-relaxed text-xs">
              Atualmente não há dados de {activeSubTab === 'conferencia' ? 'Conferência' : 'Separação'} carregados para visualização.
            </p>
            <p className="text-slate-405 max-w-md mt-1 leading-relaxed text-[11px] font-medium">
              Por favor, solicite ao Administrador do sistema que efetue a carga do relatório Excel/CSV correspondente na área administrativa de produtividade.
            </p>
          </div>
        </div>
      );
    }

    // 1. Calculate unique deposit types and hours from normalizedRows
    const allTpDeposSet = new Set<string>();
    const allUniqueHoursSet = new Set<string>();
    activeFile.normalizedRows.forEach(r => {
      if (r.tpDepos) allTpDeposSet.add(r.tpDepos.trim());
      if (r.hora) allUniqueHoursSet.add(r.hora.trim());
    });
    const uniqueTpDepos = Array.from(allTpDeposSet).sort();
    const uniqueHours = Array.from(allUniqueHoursSet).sort();

    // Pivot state sharing variables
    const activeSelectedTpDepos = activeSubTab === 'conferencia' ? selectedTpDeposConf : selectedTpDeposSep;
    const setActiveSelectedTpDepos = activeSubTab === 'conferencia' ? setSelectedTpDeposConf : setSelectedTpDeposSep;

    const activeSelectedHours = activeSubTab === 'conferencia' ? selectedHoursConf : selectedHoursSep;
    const setActiveSelectedHours = activeSubTab === 'conferencia' ? setSelectedHoursConf : setSelectedHoursSep;

    // Toggle deposit chips
    const handleDepositChipClick = (tp: string) => {
      if (activeSelectedTpDepos.includes(tp)) {
        setActiveSelectedTpDepos(activeSelectedTpDepos.filter(item => item !== tp));
      } else {
        setActiveSelectedTpDepos([...activeSelectedTpDepos, tp]);
      }
    };

    // Toggle hour chips
    const handleHourChipClick = (hr: string) => {
      if (activeSelectedHours.includes(hr)) {
        setActiveSelectedHours(activeSelectedHours.filter(item => item !== hr));
      } else {
        setActiveSelectedHours([...activeSelectedHours, hr]);
      }
    };

    // 2. Filter normalized rows
    let rows = activeFile.normalizedRows;
    if (activeSelectedTpDepos.length > 0) {
      rows = rows.filter(r => r.tpDepos && activeSelectedTpDepos.includes(r.tpDepos.trim()));
    }
    if (activeSelectedHours.length > 0) {
      rows = rows.filter(r => r.hora && activeSelectedHours.includes(r.hora.trim()));
    }

    // Dynamic search applied on collaborators name for leaderboard
    const rawFilteredRows = rows;
    
    const currentTarget = activeSubTab === 'conferencia' ? 600 : 150;

    // 3. Compute stats
    const totalVolume = rawFilteredRows.reduce((acc, r) => acc + r.quantidade, 0);
    
    // Aggregation per user
    const userTotalsMap: Record<string, number> = {};
    const userHourCountsMap: Record<string, Set<string>> = {};
    const userTransactionsMap: Record<string, number> = {};

    rawFilteredRows.forEach(r => {
      userTotalsMap[r.usuario] = (userTotalsMap[r.usuario] || 0) + r.quantidade;
      userTransactionsMap[r.usuario] = (userTransactionsMap[r.usuario] || 0) + 1;
      if (!userHourCountsMap[r.usuario]) {
        userHourCountsMap[r.usuario] = new Set<string>();
      }
      userHourCountsMap[r.usuario].add(r.hora);
    });

    const activeUsersList = Object.keys(userTotalsMap);
    const usersWhoMetTarget = activeUsersList.filter(u => userTotalsMap[u] >= currentTarget);
    const metaAchievementPct = activeUsersList.length > 0 ? (usersWhoMetTarget.length / activeUsersList.length) * 100 : 0;

    // Compute dynamic shifts & Active hours
    const allRegisteredHoursSet = new Set<string>();
    rawFilteredRows.forEach(r => allRegisteredHoursSet.add(r.hora));
    const activeHoursSorted = Array.from(allRegisteredHoursSet).sort();

    // Calculate shifts averages
    let totalWorkerHours = 0;
    Object.values(userHourCountsMap).forEach(s => {
      totalWorkerHours += s.size;
    });
    const productivityAvg = totalWorkerHours > 0 ? totalVolume / totalWorkerHours : 0;

    // Shift champion
    let bestOperator = 'Não identificado';
    let bestOperatorQty = 0;
    Object.entries(userTotalsMap).forEach(([user, qty]) => {
      if (qty > bestOperatorQty) {
        bestOperatorQty = qty;
        bestOperator = user;
      }
    });

    // 4. Grouped elements for ranking (applying search filter)
    const leaderboard = Object.entries(userTotalsMap)
      .map(([name, total]) => ({
        name,
        total,
        transactions: userTransactionsMap[name] || 0,
        activeHours: userHourCountsMap[name]?.size || 1,
        hourlyAverage: (userHourCountsMap[name]?.size || 1) > 0 ? total / (userHourCountsMap[name]?.size || 1) : total
      }))
      .filter(u => searchQuery.trim() === '' || u.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.total - a.total);

    // 5. Hourly Volumetry Chart
    const hourlyVolumetry: Record<string, { total: number; uniqueUsers: Set<string> }> = {};
    activeHoursSorted.forEach(h => {
      hourlyVolumetry[h] = { total: 0, uniqueUsers: new Set<string>() };
    });

    rawFilteredRows.forEach(r => {
      if (hourlyVolumetry[r.hora]) {
        hourlyVolumetry[r.hora].total += r.quantidade;
        hourlyVolumetry[r.hora].uniqueUsers.add(r.usuario);
      }
    });

    const maxHourVolume = Math.max(...Object.values(hourlyVolumetry).map(x => x.total), 1);

    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Modern Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_50%)]" />
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Painel Operacional</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight uppercase">Dashboard de Produtividade</h2>
            <p className="text-slate-350 text-xs font-semibold max-w-2xl leading-relaxed">
              Métricas consolidadas de desempenho e acompanhamento de metas para as atividades do turno.
            </p>
          </div>

          <div className="flex bg-slate-800/60 p-1 rounded-2xl border border-slate-700/50 relative z-10 antialiased font-sans flex-wrap gap-2 items-center">
            <button
              onClick={() => setTvMode(!tvMode)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                tvMode 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${tvMode ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
              <span>Modo TV: {tvMode ? 'Ativo (10s)' : 'Inativo'}</span>
            </button>
            <div className="h-5 w-px bg-slate-700/50 hidden md:block" />
            <button
              onClick={() => { setActiveSubTab('conferencia'); setSearchQuery(''); }}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeSubTab === 'conferencia' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Conferência
            </button>
            <button
              onClick={() => { setActiveSubTab('separacao'); setSearchQuery(''); }}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeSubTab === 'separacao' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              Separação
            </button>
          </div>
        </div>

        {/* Dynamic target alert info */}
        <div className={`px-6 py-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          activeSubTab === 'conferencia' ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950' : 'bg-blue-50/40 border-blue-200 text-blue-950'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`p-2 rounded-xl text-xs font-black ${
              activeSubTab === 'conferencia' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>
              Meta: {currentTarget} {activeSubTab === 'conferencia' ? 'Unid/Hora' : 'Contagens/Hora'}
            </span>
            <div className="text-xs font-semibold">
              <span className="font-extrabold text-slate-900 block md:inline mr-1">Regra de Destaque:</span>
              Colaboradores com volume acumulado acima ou igual à meta estão destacados em <span className="text-emerald-600 font-extrabold bg-emerald-100/35 px-1 rounded">verde</span>. Abaixo da meta em <span className="text-rose-600 font-extrabold bg-rose-100/25 px-1 rounded">vermelho</span>.
            </div>
          </div>
          <div className="text-[10px] font-black uppercase text-slate-500 truncate">
            Arquivo Ativo: {activeFile.name}
          </div>
        </div>

        {/* Bento Board: Strategic Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Meta Achievement % */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-blue-500 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Atingimento de Meta</span>
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition-transform">
                <CheckSquare className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <span className="text-3xl font-black text-slate-800 block tracking-tight">
                {metaAchievementPct.toFixed(0)}%
              </span>
              <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                <span className="text-emerald-600 font-extrabold">{usersWhoMetTarget.length}</span> de <span className="font-bold">{activeUsersList.length}</span> operadores atingiram a meta diária de {currentTarget}.
              </p>
            </div>
          </div>

          {/* Card 2: Productivity Average */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-blue-500 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest font-sans">Produtividade Média</span>
              <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <span className="text-3xl font-black text-slate-800 block tracking-tight">
                {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(productivityAvg)}
              </span>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                Média de unidades processadas por colaborador por hora ativa.
              </p>
            </div>
          </div>

          {/* Card 3: Leader Operator */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-blue-500 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Destaque do Turno</span>
              <span className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <span className="text-base font-black text-slate-800 block truncate uppercase" title={bestOperator}>
                {bestOperator}
              </span>
              <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                Líder operacional com total acumulado de <span className="font-black text-amber-600">{new Intl.NumberFormat('pt-BR').format(bestOperatorQty)}</span> unidades.
              </p>
            </div>
          </div>

          {/* Card 4: Total Volume Processed */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:border-blue-500 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest font-sans">Volumetria Total</span>
              <span className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <span className="text-3xl font-black text-slate-800 block tracking-tight">
                {new Intl.NumberFormat('pt-BR').format(totalVolume)}
              </span>
              <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                Volume consolidado processado em <span className="font-bold">{activeHoursSorted.length}</span> faixas horárias.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Deposit Filter Chips */}
          {uniqueTpDepos.length > 0 && (
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-450">Filtro por Depósito / Área</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
                <button
                  onClick={() => setActiveSelectedTpDepos([])}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    activeSelectedTpDepos.length === 0
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos Depósitos
                </button>
                {uniqueTpDepos.map(tp => {
                  const isSelected = activeSelectedTpDepos.includes(tp);
                  return (
                    <button
                      key={tp}
                      onClick={() => handleDepositChipClick(tp)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tp}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hour Filter Chips */}
          {uniqueHours.length > 0 && (
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-450">Filtro por Hora de Lançamento</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1">
                <button
                  onClick={() => setActiveSelectedHours([])}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                    activeSelectedHours.length === 0
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas as Horas
                </button>
                {uniqueHours.map(hr => {
                  const isSelected = activeSelectedHours.includes(hr);
                  const displayHr = hr.length === 8 && hr.includes(':') ? hr.substring(0, 5) + 'h' : hr;
                  return (
                    <button
                      key={hr}
                      onClick={() => handleHourChipClick(hr)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {displayHr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Two-Column Strategic Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Leaderboard with custom progress bars and badges */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[580px]">
            <div className="p-6 border-b border-slate-150 flex items-center justify-between flex-wrap gap-4 bg-slate-50/20">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase">Ranking Geral de Colaboradores</h4>
                <p className="text-[10px] text-slate-400 font-semibold max-w-sm mt-0.5">Colaboradores ordenados de maior a menor produtividade de Peças/Volumes.</p>
              </div>

              {/* Leaderboard Inline Search */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Pesquisar operador..."
                  value={searchQuery}
                  onChange={triggerSearch}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-extrabold"
                />
              </div>
            </div>

            {/* Scrollable Leaderboard Area */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-4 space-y-3 scrollbar-none">
              {leaderboard.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="text-xs font-bold block">Nenhum operador encontrado.</span>
                  <span className="text-[10px] text-slate-400">Certifique-se de limpar os filtros de pesquisa ou depósito.</span>
                </div>
              ) : (
                leaderboard.map((item, idx) => {
                  const metTarget = item.total >= currentTarget;
                  const percentOfTarget = Math.round((item.total / currentTarget) * 100);
                  
                  // Rank Placement Icons
                  let medalBadge = '';
                  if (idx === 0) medalBadge = '👑 🏆';
                  else if (idx === 1) medalBadge = '🥈';
                  else if (idx === 2) medalBadge = '🥉';

                  return (
                    <div key={item.name} className="p-3 hover:bg-slate-50/50 rounded-2xl transition-all border border-transparent hover:border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Circle Medal or Index */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 shadow-sm ${
                          idx === 0 
                            ? 'bg-amber-100 text-amber-700 border border-amber-300' 
                            : idx === 1
                              ? 'bg-slate-200 text-slate-700 border border-slate-300'
                              : idx === 2
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'bg-slate-50 text-slate-500'
                        }`}>
                          {idx + 1}
                        </div>

                        {/* Name and visual bar */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-800 truncate block">
                              {item.name}
                            </span>
                            {medalBadge && (
                              <span className="text-xs shrink-0" title="Top Performer">{medalBadge}</span>
                            )}
                          </div>
                          
                          {/* Modern horizontal progress bars relative to the meta target */}
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  metTarget 
                                    ? 'bg-emerald-500' 
                                    : 'bg-rose-500'
                                }`} 
                                style={{ width: `${Math.min(percentOfTarget, 100)}%` }} 
                              />
                            </div>
                            <span className={`text-[9px] font-black shrink-0 ${metTarget ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {percentOfTarget}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Yield Total right-aligned stats */}
                      <div className="text-right shrink-0 space-y-1">
                        <span className={`text-sm font-black block tracking-tight ${metTarget ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {new Intl.NumberFormat('pt-BR').format(item.total)}
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          metTarget
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {metTarget ? 'Meta Atingida' : 'Abaixo da Meta'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Histogram hourly breakdown visualizer */}
          <div className="lg:col-span-12 lg:col-start-1 xl:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[580px]">
            <div className="p-6 border-b border-slate-150 bg-slate-50/20">
              <h4 className="text-sm font-black text-slate-800 uppercase">Volumetria de Produção Por Hora</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Visão do fluxo operacional por faixa horária consolidada de lançamentos.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeHoursSorted.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="text-xs font-bold block">Nenhum dado horário disponível.</span>
                </div>
              ) : (
                activeHoursSorted.map(hour => {
                  const hourStats = hourlyVolumetry[hour];
                  const hourVal = hourStats?.total || 0;
                  const operatorsCount = hourStats?.uniqueUsers?.size || 1;
                  const hourlyHourAverage = operatorsCount > 0 ? hourVal / operatorsCount : 0;
                  const hourMeetsTarget = hourlyHourAverage >= currentTarget;
                  
                  // percentage relative to maximum hour volume in shift for styling graph bars
                  const graphPct = maxHourVolume > 0 ? (hourVal / maxHourVolume) * 100 : 0;

                  return (
                    <div key={hour} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-mono font-bold shrink-0">
                            {hour.substring(0, 5)}h
                          </span>
                          <span className="text-slate-400 font-semibold text-[10px]">
                            {operatorsCount} {operatorsCount === 1 ? 'operador ativo' : 'operadores ativos'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-slate-800 block">
                            {new Intl.NumberFormat('pt-BR').format(hourVal)} un
                          </span>
                          <span className={`text-[9px] font-black uppercase ${hourMeetsTarget ? 'text-emerald-500' : 'text-rose-600'}`}>
                            Média: {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(hourlyHourAverage)} / meta {currentTarget}
                          </span>
                        </div>
                      </div>

                      {/* Custom horizontal volume density graph bar */}
                      <div className="relative w-full bg-slate-50 h-6 border border-slate-100 rounded-xl overflow-hidden flex items-center pr-3 group">
                        <div 
                          className={`h-full opacity-15 rounded-r-lg transition-all duration-500 ${
                            hourMeetsTarget ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(graphPct, 4)}%` }}
                        />
                        {/* Overlay border accent */}
                        <div 
                          className={`absolute left-0 top-0 h-full w-1.5 ${
                            hourMeetsTarget ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        
                        {/* Subtle text percent on hover */}
                        <div className="absolute right-3 text-[9px] font-black text-slate-400 uppercase group-hover:text-slate-600 transition-colors">
                          {graphPct.toFixed(0)}% do pico do turno
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dummy template downloader for easier user setup
  const downloadModeloCSV = (type: 'conferencia' | 'separacao') => {
    let headers = '';
    let dataRows = '';
    
    if (type === 'conferencia') {
      headers = 'Conferente;Qtd_Unidades;Hora_Lancamento;Setor\n';
      dataRows = 
        'JOAO SILVA;540;17:23:10;CONFERENCIA SUL\n' +
        'MARIA OLIVEIRA;320;18:12:00;CONFERENCIA SUL\n' +
        'PEDRO SOUZA;450;19:05:40;CONFERENCIA NORTE\n' +
        'JOAO SILVA;210;20:15:30;CONFERENCIA SUL';
    } else {
      headers = 'Separador;Qtd_Pecas;Hora_Registro;Regiao\n';
      dataRows = 
        'ANTONIO COST;1200;17:30:00;CORREDOR A\n' +
        'CARLA PINTO;950;18:40:00;CORREDOR B\n' +
        'ANTONIO COST;800;19:10:00;CORREDOR A\n' +
        'MARIO FERREIRA;1450;20:00:00;MEZANINO';
    }

    const blob = new Blob(["\uFEFF" + headers + dataRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `modelo_produtividade_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) {
    return renderOperationsView();
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Dynamic Header */}
      <div className="p-6 bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 animate-pulse" />
            </span>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Painel Inteligente</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight uppercase">Tabela Dinâmica de Produtividade</h2>
          <p className="text-slate-350 text-xs font-semibold max-w-2xl leading-relaxed">
            Faça upload dos relatórios brutos exportados do sistema (formato CSV, XLSX ou XLS) para cruzar automaticamente dados de produtividade individual por Conferente e por Separador.
          </p>
        </div>
      </div>

      {/* File Dropzone Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unit 1: Conferência File Import */}
        <div className={`p-6 rounded-3xl border transition-all relative overflow-hidden ${
          conferenceFile ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'
        }`}>
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-250">
            <div className="flex items-center gap-2.5">
              <span className={`p-2 rounded-xl flex items-center justify-center ${
                conferenceFile ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'
              }`}>
                <FileCheck className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Arquivo 1</span>
                <h4 className="text-sm font-black text-slate-805 uppercase">Fila de Conferência</h4>
              </div>
            </div>
            {conferenceFile ? (
              <button 
                onClick={() => removeFile('conferencia')} 
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                title="Remover arquivo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={() => downloadModeloCSV('conferencia')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase transition-all"
              >
                <Download className="w-3" /> Modelo CSV
              </button>
            )}
          </div>

          {isProcessingConf ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <span className="text-xs font-black text-slate-700 uppercase">Processando...</span>
              <span className="text-[10px] text-slate-400 mt-1 animate-pulse">Lendo dados e sincronizando na nuvem...</span>
            </div>
          ) : !conferenceFile ? (
            <div className="py-8 flex flex-col items-center justify-center text-center cursor-pointer" onClick={() => !isProcessingConf && confInputRef.current?.click()}>
              <Upload className="w-8 h-8 text-slate-400 mb-3" />
              <span className="text-xs font-black text-slate-700 uppercase">Selecione ou arraste o arquivo</span>
              <span className="text-[10px] text-slate-450 mt-1">Formatos suportados: .csv, .xlsx, .xls</span>
              <input 
                ref={confInputRef}
                type="file" 
                accept=".csv,.xlsx,.xls" 
                disabled={isProcessingConf}
                onChange={(e) => handleFileUpload(e, 'conferencia')}
                className="hidden" 
              />
            </div>
          ) : (
            <div className="py-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{conferenceFile.name}</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-750 text-[10px] rounded font-black uppercase tracking-wider">PROCESSED</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase">Registros</span>
                  <span className="text-sm font-black text-slate-800">
                    {conferenceFile.rowCount || conferenceFile.normalizedRows?.length || conferenceFile.rows?.length || 0} linhas
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase">Colunas Mapeadas</span>
                  <span className="text-sm font-bold text-slate-800 truncate block">Colab: {conferenceFile.keyMap.colaborador || 'Automático'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Unit 2: Separação File Import */}
        <div className={`p-6 rounded-3xl border transition-all relative overflow-hidden ${
          separationFile ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-300'
        }`}>
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-250">
            <div className="flex items-center gap-2.5">
              <span className={`p-2 rounded-xl flex items-center justify-center ${
                separationFile ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'
              }`}>
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Arquivo 2</span>
                <h4 className="text-sm font-black text-slate-805 uppercase">Fila de Separação</h4>
              </div>
            </div>
            {separationFile ? (
              <button 
                onClick={() => removeFile('separacao')} 
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                title="Remover arquivo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={() => downloadModeloCSV('separacao')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase transition-all"
              >
                <Download className="w-3" /> Modelo CSV
              </button>
            )}
          </div>

          {isProcessingSep ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <span className="text-xs font-black text-slate-700 uppercase">Processando...</span>
              <span className="text-[10px] text-slate-400 mt-1 animate-pulse">Lendo dados e sincronizando na nuvem...</span>
            </div>
          ) : !separationFile ? (
            <div className="py-8 flex flex-col items-center justify-center text-center cursor-pointer" onClick={() => !isProcessingSep && sepInputRef.current?.click()}>
              <Upload className="w-8 h-8 text-slate-400 mb-3" />
              <span className="text-xs font-black text-slate-700 uppercase">Selecione ou arraste o arquivo</span>
              <span className="text-[10px] text-slate-450 mt-1">Formatos suportados: .csv, .xlsx, .xls</span>
              <input 
                ref={sepInputRef}
                type="file" 
                accept=".csv,.xlsx,.xls" 
                disabled={isProcessingSep}
                onChange={(e) => handleFileUpload(e, 'separacao')}
                className="hidden" 
              />
            </div>
          ) : (
            <div className="py-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{separationFile.name}</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-750 text-[10px] rounded font-black uppercase tracking-wider">PROCESSED</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase">Registros</span>
                  <span className="text-sm font-black text-slate-800">
                    {separationFile.rowCount || separationFile.normalizedRows?.length || separationFile.rows?.length || 0} linhas
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase">Colunas Mapeadas</span>
                  <span className="text-sm font-bold text-slate-800 truncate block">Colab: {separationFile.keyMap.colaborador || 'Automático'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {conferenceFile || separationFile ? (
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden">
          {/* Subtab bar switcher */}
          <div className="flex border-b border-slate-100 p-4 justify-between items-center bg-slate-50/50 flex-wrap gap-4">
            <div className="flex bg-slate-100 p-1 rounded-2xl flex-wrap gap-1">
              <button
                onClick={() => { setActiveSubTab('conferencia'); setSearchQuery(''); }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeSubTab === 'conferencia' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                Produtividade da Conferência
              </button>
              <button
                onClick={() => { setActiveSubTab('separacao'); setSearchQuery(''); }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeSubTab === 'separacao' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                Produtividade da Separação
              </button>
            </div>

            {/* View Mode Toggle: Matrix vs generic pivot list */}
            <div className="flex bg-slate-150 p-1 rounded-xl">
              <button
                onClick={() => {
                  if (activeSubTab === 'conferencia') setViewModeConf('matrix');
                  else setViewModeSep('matrix');
                }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  (activeSubTab === 'conferencia' ? viewModeConf : viewModeSep) === 'matrix'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                Matriz Hora a Hora
              </button>
              <button
                onClick={() => {
                  if (activeSubTab === 'conferencia') setViewModeConf('list');
                  else setViewModeSep('list');
                }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  (activeSubTab === 'conferencia' ? viewModeConf : viewModeSep) === 'list'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Tabela Resumo
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Filtrar colaborador..."
                value={searchQuery}
                onChange={triggerSearch}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold"
              />
            </div>
          </div>

          {!activeFile ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <Upload className="w-12 h-12 text-slate-300 mb-3 animate-bounce" />
              <h3 className="font-black text-slate-805 text-lg uppercase">Nenhum Relatório Carregado Para Este Processo</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">Carregue o arquivo correspondente nas caixas acima para gerar a Tabela Dinâmica interativa.</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Conditional view rendering: Matrix View vs Dynamic Pivot list */}
              {(activeSubTab === 'conferencia' ? viewModeConf : viewModeSep) === 'matrix' ? (
                renderMatrixView()
              ) : (
                <div className="space-y-6">
                  {/* Controls bar */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-150">
                    {/* 1. Group By Configuration */}
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Agrupar Por (Linhas)</label>
                      <select
                        value={activeSubTab === 'conferencia' ? confGroupBy : sepGroupBy}
                        onChange={(e) => {
                          if (activeSubTab === 'conferencia') setConfGroupBy(e.target.value);
                          else setSepGroupBy(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="colaborador">Colaborador / Operador</option>
                        {activeFile.keyMap.setor && <option value="setor">Setor / Área de Atuação</option>}
                        {activeFile.keyMap.horaData && <option value="horaData">Faixa Horária (Em Blocos)</option>}
                      </select>
                    </div>

                    {/* 2. Compute Metric Selector */}
                    <div>
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Métrica Calculada</label>
                      <select
                        value={activeSubTab === 'conferencia' ? confMetric : sepMetric}
                        onChange={(e) => {
                          if (activeSubTab === 'conferencia') setConfMetric(e.target.value as any);
                          else setSepMetric(e.target.value as any);
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="sum">Soma Volume (Itens / Peças)</option>
                        <option value="count">Contagem de Operações (Transações)</option>
                        <option value="average">Média de Itens por Transação</option>
                      </select>
                    </div>

                    {/* KPI Display Metrics */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-3 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0">
                      <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="block text-[8px] font-black text-slate-400 uppercase">Volume Unidade Total</span>
                          <span className="text-sm font-black text-slate-800">
                            {new Intl.NumberFormat('pt-BR').format(activePivot.totalVolume)}
                          </span>
                        </div>
                        <Activity className="w-5 h-5 text-blue-500/25 shrink-0" />
                      </div>
                      <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="block text-[8px] font-black text-slate-400 uppercase">Total Lançamentos</span>
                          <span className="text-sm font-black text-slate-805">
                            {activePivot.totalTransactions} transações
                          </span>
                        </div>
                        <CheckSquare className="w-5 h-5 text-emerald-500/25 shrink-0" />
                      </div>
                    </div>
                  </div>

                  {/* Pivot Table element */}
                  <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-150">
                          <th 
                            className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => toggleSort('grouped')}
                          >
                            <div className="flex items-center gap-1.5 uppercase tracking-widest">
                              Agrupamento
                              <ArrowUpDown className="w-3" />
                            </div>
                          </th>
                          <th 
                            className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => toggleSort('value')}
                          >
                            <div className="flex items-center gap-1.5 uppercase tracking-widest">
                              Métrica Calculada
                              <ArrowUpDown className="w-3" />
                            </div>
                          </th>
                          <th 
                            className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => toggleSort('count')}
                          >
                            <div className="flex items-center gap-1.5 uppercase tracking-widest">
                              Total de Lançamentos
                              <ArrowUpDown className="w-3" />
                            </div>
                          </th>
                          <th className="px-6 py-4">Contribuição / Participação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activePivot.rows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-450 font-medium">
                              Nenhum resultado encontrado para os filtros selecionados.
                            </td>
                          </tr>
                        ) : (
                          activePivot.rows.map((row, index) => (
                            <tr 
                              key={index}
                              className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors last:border-0"
                            >
                              <td className="px-6 py-4 font-black text-slate-800 text-xs shadow-sm bg-slate-55/10">
                                {row.grouped}
                              </td>
                              <td className={`px-6 py-4 text-xs font-black ${
                                (activeSubTab === 'conferencia' ? confGroupBy : sepGroupBy) === 'colaborador' && (activeSubTab === 'conferencia' ? confMetric : sepMetric) === 'sum' 
                                  ? row.value >= (activeSubTab === 'conferencia' ? 600 : 150)
                                    ? 'text-emerald-600 bg-emerald-50/20 font-extrabold'
                                    : 'text-rose-650 bg-rose-50/10 font-bold'
                                  : 'text-slate-805'
                              }`}>
                                {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(row.value)}
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 font-semibold">
                                {row.count}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-full max-w-xs bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500 rounded-full" 
                                      style={{ width: `${Math.min(row.percentShare, 100)}%` }} 
                                    />
                                  </div>
                                  <span className="text-[10px] font-black text-slate-450">
                                    {Math.min(row.percentShare, 100).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Dynamic Insights Footer */}
              <div className="p-4 bg-blue-50/50 border border-blue-105 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="block text-[10px] font-black uppercase text-blue-700 tracking-wider">Metodologia da Tabela Dinâmica</span>
                  <p className="text-xs text-blue-950 font-medium leading-relaxed">
                    Sua tabela dinâmica agrupa registros somando as metas obtidas e calculando médias em tempo real. Os dados gerados aqui são mantidos localmente na sessão para garantir máxima velocidade operacional sem enviar arquivos para a internet.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>
      ) : (
        <div className="p-16 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center">
          <FileSpreadsheet className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Primeiros Passos</h3>
          <p className="text-slate-500 max-w-md mt-2 leading-relaxed">
            Comece fazendo upload dos seus 2 arquivos acima. O sistema processará automaticamente os dados de Conferência e Separação, gerando tabelas dinâmicas independentes com filtros e ordenações personalizadas.
          </p>
        </div>
      )}
    </div>
  );
}
