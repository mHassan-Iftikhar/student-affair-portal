/**
 * Audit Logger Utility
 * Provides easy-to-use functions for logging user actions to Firebase
 */

import { addAuditLog, AuditLogEntry } from './firestore';
import { Base64Data, fileToBase64 } from './base64Utils';

type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT';

interface LogActionParams {
  user: { uid: string; email: string };
  action: ActionType;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  screenshot?: File;
}

/**
 * Log a user action to Firebase audit_logs collection
 */
export const logAction = async (params: LogActionParams): Promise<string | null> => {
  try {
    let screenshotData: Base64Data | undefined;

    if (params.screenshot) {
      screenshotData = await fileToBase64(params.screenshot);
    }

    const logEntry: AuditLogEntry = {
      adminId: params.user.uid,
      adminEmail: params.user.email,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      screenshotData,
    };

    const logId = await addAuditLog(logEntry);
    console.log(`[Audit] ${params.action} on ${params.resource} logged: ${logId}`);
    return logId;
  } catch (error) {
    console.error('[Audit] Failed to log action:', error);
    return null;
  }
};

/**
 * Log a CREATE action
 */
export const logCreate = async (
  user: { uid: string; email: string },
  resource: string,
  resourceId?: string,
  details?: Record<string, any>
): Promise<string | null> => {
  return logAction({ user, action: 'CREATE', resource, resourceId, details });
};

/**
 * Log an UPDATE action
 */
export const logUpdate = async (
  user: { uid: string; email: string },
  resource: string,
  resourceId: string,
  details?: Record<string, any>
): Promise<string | null> => {
  return logAction({ user, action: 'UPDATE', resource, resourceId, details });
};

/**
 * Log a DELETE action
 */
export const logDelete = async (
  user: { uid: string; email: string },
  resource: string,
  resourceId: string,
  details?: Record<string, any>
): Promise<string | null> => {
  return logAction({ user, action: 'DELETE', resource, resourceId, details });
};

/**
 * Log a LOGIN action
 */
export const logLogin = async (
  user: { uid: string; email: string },
  details?: Record<string, any>
): Promise<string | null> => {
  return logAction({ user, action: 'LOGIN', resource: 'AUTH', details });
};

/**
 * Log a LOGOUT action
 */
export const logLogout = async (
  user: { uid: string; email: string },
  details?: Record<string, any>
): Promise<string | null> => {
  return logAction({ user, action: 'LOGOUT', resource: 'AUTH', details });
};

/**
 * Log a VIEW action (for sensitive data access)
 */
export const logView = async (
  user: { uid: string; email: string },
  resource: string,
  resourceId?: string,
  details?: Record<string, any>
): Promise<string | null> => {
  return logAction({ user, action: 'VIEW', resource, resourceId, details });
};

/**
 * Log an EXPORT action (for data exports)
 */
export const logExport = async (
  user: { uid: string; email: string },
  resource: string,
  details?: Record<string, any>
): Promise<string | null> => {
  return logAction({ user, action: 'EXPORT', resource, details });
};

/**
 * Create an audit-wrapped function that automatically logs the action
 */
export const withAuditLog = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  getLogParams: (args: Parameters<T>, result: Awaited<ReturnType<T>>) => LogActionParams
): ((...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>) => {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const result = await fn(...args);
    
    try {
      const logParams = getLogParams(args, result);
      await logAction(logParams);
    } catch (error) {
      console.error('[Audit] Failed to log wrapped action:', error);
    }

    return result;
  };
};

/**
 * Capture screenshot of the current page (requires html2canvas or similar)
 * This is a placeholder - implement with your preferred screenshot library
 */
export const captureScreenshot = async (): Promise<File | null> => {
  try {
    // If html2canvas is available, use it
    if (typeof window !== 'undefined' && (window as any).html2canvas) {
      const canvas = await (window as any).html2canvas(document.body);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      return new File([blob], 'screenshot.png', { type: 'image/png' });
    }
    return null;
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    return null;
  }
};

const auditLoggerExports = {
  logAction,
  logCreate,
  logUpdate,
  logDelete,
  logLogin,
  logLogout,
  logView,
  logExport,
  withAuditLog,
  captureScreenshot,
};

export default auditLoggerExports;
