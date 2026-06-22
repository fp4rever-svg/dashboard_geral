export interface ZWM0255PData {
  caixasSeparacao: number;
  cxSepEmUso: number;
  recFaltas: number;
  separacao: number;
  conferencia: number;
  postoEmbalagem: number;
  expedicao: number;
}

export interface RouteSalesCutsData {
  vendas: number;
  cortes: number;
  percentCorte: number;
}

export interface RouteCombinedData {
  rota: string;
  zwm?: ZWM0255PData;
  salesCuts?: RouteSalesCutsData;
}

export const ZWM0255P_RAW: Record<string, Omit<ZWM0255PData, 'expedicao'> & { expedicao?: number }> = {
  '700': { caixasSeparacao: 88, cxSepEmUso: 6, recFaltas: 9, separacao: 82, conferencia: 82, postoEmbalagem: 72, expedicao: 0 },
  '720': { caixasSeparacao: 248, cxSepEmUso: 84, recFaltas: 54, separacao: 194, conferencia: 164, postoEmbalagem: 149, expedicao: 0 },
  '721': { caixasSeparacao: 675, cxSepEmUso: 587, recFaltas: 306, separacao: 369, conferencia: 88, postoEmbalagem: 88, expedicao: 0 },
  '722': { caixasSeparacao: 687, cxSepEmUso: 11, recFaltas: 5, separacao: 682, conferencia: 676, postoEmbalagem: 652, expedicao: 0 },
  '723': { caixasSeparacao: 110, cxSepEmUso: 34, recFaltas: 32, separacao: 78, conferencia: 76, postoEmbalagem: 71, expedicao: 0 },
  '731': { caixasSeparacao: 884, cxSepEmUso: 5, recFaltas: 2, separacao: 882, conferencia: 879, postoEmbalagem: 873, expedicao: 767 },
  '732': { caixasSeparacao: 519, cxSepEmUso: 4, recFaltas: 1, separacao: 518, conferencia: 515, postoEmbalagem: 504, expedicao: 470 },
  '733': { caixasSeparacao: 408, cxSepEmUso: 4, recFaltas: 2, separacao: 406, conferencia: 404, postoEmbalagem: 403, expedicao: 360 },
  '734': { caixasSeparacao: 233, cxSepEmUso: 6, recFaltas: 1, separacao: 232, conferencia: 227, postoEmbalagem: 222, expedicao: 184 },
  '741': { caixasSeparacao: 544, cxSepEmUso: 178, recFaltas: 24, separacao: 520, conferencia: 368, postoEmbalagem: 270, expedicao: 0 },
  '742': { caixasSeparacao: 478, cxSepEmUso: 99, recFaltas: 16, separacao: 462, conferencia: 379, postoEmbalagem: 345, expedicao: 80 },
  '750': { caixasSeparacao: 89, cxSepEmUso: 13, recFaltas: 15, separacao: 76, conferencia: 76, postoEmbalagem: 70, expedicao: 0 },
  '754': { caixasSeparacao: 176, cxSepEmUso: 72, recFaltas: 55, separacao: 121, conferencia: 104, postoEmbalagem: 97, expedicao: 0 },
  '756': { caixasSeparacao: 56, cxSepEmUso: 13, recFaltas: 12, separacao: 45, conferencia: 43, postoEmbalagem: 39, expedicao: 0 },
  '761': { caixasSeparacao: 1629, cxSepEmUso: 44, recFaltas: 7, separacao: 1622, conferencia: 1585, postoEmbalagem: 1529, expedicao: 1158 },
  '764': { caixasSeparacao: 377, cxSepEmUso: 4, recFaltas: 1, separacao: 376, conferencia: 373, postoEmbalagem: 357, expedicao: 318 },
  '783': { caixasSeparacao: 948, cxSepEmUso: 354, recFaltas: 304, separacao: 645, conferencia: 594, postoEmbalagem: 570, expedicao: 124 },
};

export const SALES_RAW: Record<string, number> = {
  '105': 3465,
  '107': 60,
  '113': 6744,
  '700': 8637,
  '709': 624,
  '720': 3471,
  '721': 9703,
  '722': 5943,
  '723': 6465,
  '725': 19,
  '727': 12,
  '731': 13364,
  '732': 3284,
  '733': 5621,
  '734': 1630,
  '741': 6015,
  '742': 7875,
  '750': 7444,
  '754': 1990,
  '756': 6530,
  '761': 14458,
  '764': 3418,
  '783': 14814,
};

export const CUTS_RAW: Record<string, number> = {
  '113': 0,
  '700': 31,
  '720': 4,
  '721': 21,
  '722': 80,
  '723': 20,
  '731': 65,
  '732': 82,
  '733': 62,
  '734': 33,
  '741': 119,
  '742': 61,
  '750': 12,
  '754': 9,
  '756': 25,
  '761': 174,
  '764': 28,
  '783': 148,
};

// Compile standard list of all unique route keys across tables
export const ALL_ROUTES = Array.from(
  new Set([
    ...Object.keys(ZWM0255P_RAW),
    ...Object.keys(SALES_RAW),
    ...Object.keys(CUTS_RAW),
  ])
).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

export function getRouteData(rota: string|undefined): RouteCombinedData | null {
  if (!rota) return null;
  const zwmRaw = ZWM0255P_RAW[rota];
  const vendas = SALES_RAW[rota] || 0;
  const cortes = CUTS_RAW[rota] || 0;
  const percentCorte = vendas > 0 ? (cortes / vendas) * 100 : 0;

  const zwm: ZWM0255PData | undefined = zwmRaw ? {
    caixasSeparacao: zwmRaw.caixasSeparacao,
    cxSepEmUso: zwmRaw.cxSepEmUso,
    recFaltas: zwmRaw.recFaltas,
    separacao: zwmRaw.separacao,
    conferencia: zwmRaw.conferencia,
    postoEmbalagem: zwmRaw.postoEmbalagem,
    expedicao: zwmRaw.expedicao || 0
  } : undefined;

  return {
    rota,
    zwm,
    salesCuts: {
      vendas,
      cortes,
      percentCorte
    }
  };
}

// Global Aggregates
export const ZWM_TOTALS: ZWM0255PData = {
  caixasSeparacao: 8149,
  cxSepEmUso: 1518,
  recFaltas: 846,
  separacao: 7310,
  conferencia: 6633,
  postoEmbalagem: 6311,
  expedicao: 3461
};

export const SALES_TOTAL = 131586;
export const CUTS_TOTAL = 982;
export const PERCENT_CUTS_GLOBAL = (CUTS_TOTAL / SALES_TOTAL) * 100; // 0.746%
