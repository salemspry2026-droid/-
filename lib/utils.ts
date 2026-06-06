import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { auth } from "./firebase"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
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
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  if ((error as any)?.code === 'permission-denied') {
     console.warn('Firestore Permission Denied (harmless if during logout or initial load):', path);
     return;
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In snapshot listeners, throwing will cause unhandled rejections or uncaught errors. 
  // We strictly log instead of throw here so we don't bring down the app.
}

export function hasPermission(profile: any, moduleName: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean {
  if (!profile) return false;
  if (profile.role === 'owner') return true; // Owner always has full access
  if (profile.role === 'client') return false; // Clients have different logic
  
  if (profile.permissions && profile.permissions[moduleName]) {
    return !!profile.permissions[moduleName][action];
  }

  // Default permissions if not set explicitly
  if (profile.role === 'admin') {
    return true; // Admins default to all
  }

  if (profile.role === 'sales') {
    if (moduleName === 'customers' || moduleName === 'orders') {
      return action !== 'delete'; // Sales can view, create, edit
    }
    if (moduleName === 'products') {
      return action === 'view'; // Sales can only view products
    }
  }

  return false;
}
