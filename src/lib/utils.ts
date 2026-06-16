import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function parseValue(val: any): number {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null) return 0;
  
  let str = val.toString().trim();
  if (str === '—' || str === '') return 0;
  
  // Strip percentage signs
  str = str.replace(/%/g, '');

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Thousands separator is dot, decimal separator is comma (e.g. "1.234,56")
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      // Thousands separator is comma, decimal separator is dot (e.g. "1,234.56")
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
  }

  if (hasComma) {
    // Only comma exists (e.g. "1234,56" or "1,234")
    const parts = str.split(',');
    const lastPart = parts[parts.length - 1];
    if (parts.length === 2 && lastPart.length !== 3) {
      // Decimal comma (e.g. "1234,5" or "1234,56")
      return parseFloat(str.replace(',', '.')) || 0;
    } else if (parts.length > 2 || (parts.length === 2 && lastPart.length === 3)) {
      // Thousands comma (e.g. "1,234" or "1,234,567")
      return parseFloat(str.replace(/,/g, '')) || 0;
    } else {
      return parseFloat(str.replace(',', '.')) || 0;
    }
  }

  if (hasDot) {
    // Only dot exists (e.g. "1.234" or "12.345" or "12.34")
    const parts = str.split('.');
    const lastPart = parts[parts.length - 1];
    if (parts.length > 2 || (parts.length === 2 && lastPart.length === 3)) {
      // Thousands dots (e.g. "1.234" or "1.234.567" or "12.000")
      return parseFloat(str.replace(/\./g, '')) || 0;
    } else {
      // Decimal dot (e.g. "12.34" or "12.3")
      return parseFloat(str) || 0;
    }
  }

  return parseFloat(str) || 0;
}
