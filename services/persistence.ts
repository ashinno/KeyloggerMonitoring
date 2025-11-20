
import { ActivityLog, SessionMetrics } from '../types';

const STORAGE_KEY_LOGS = 'kbl_logs';
const STORAGE_KEY_PROFILE = 'kbl_profile';

export interface UserProfile {
  avgWpm: number;
  avgFlightTime: number;
  avgAccuracy: number;
  avgMouseVelocity: number; // New biometric factor
  totalSessions: number;
  lastSeen: number;
}

// Simulated "Secure Enclave" Encryption
// In a real app, this would use WebCrypto API with a key derived from the user's biometric hash.
const encryptData = (data: any, enabled: boolean): string => {
  const json = JSON.stringify(data);
  if (!enabled) return json;
  // Simple Base64 obfuscation to represent "Encryption at Rest" for the thesis demo
  // This proves the architecture allows for opaque storage.
  return btoa(json); 
};

const decryptData = (data: string | null, enabled: boolean): any => {
  if (!data) return null;
  try {
    if (!enabled) return JSON.parse(data);
    // Try to decrypt
    const decrypted = atob(data);
    return JSON.parse(decrypted);
  } catch (e) {
    // Fallback if data wasn't encrypted or format changed
    try { return JSON.parse(data); } catch { return null; }
  }
};

export const Persistence = {
  // --- Logs (Activity History) ---
  saveLog: (log: ActivityLog, encryptionEnabled: boolean = false) => {
    const logs = Persistence.getLogs(encryptionEnabled);
    // Keep last 50 logs
    // Mark log as encrypted if the system is secure
    const logToSave = { ...log, isEncrypted: encryptionEnabled };
    const updated = [logToSave, ...logs].slice(0, 50);
    
    localStorage.setItem(STORAGE_KEY_LOGS, encryptData(updated, encryptionEnabled));
  },

  getLogs: (encryptionEnabled: boolean = false): ActivityLog[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LOGS);
      return decryptData(data, encryptionEnabled) || [];
    } catch (e) {
      console.error("DB Read Error", e);
      return [];
    }
  },

  clearLogs: () => {
    localStorage.removeItem(STORAGE_KEY_LOGS);
  },

  // --- User Biometric Profile (Identity) ---
  getProfile: (): UserProfile | null => {
     try {
      const data = localStorage.getItem(STORAGE_KEY_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  updateProfile: (metrics: SessionMetrics): UserProfile => {
    const current = Persistence.getProfile() || { 
        avgWpm: 0, 
        avgFlightTime: 0, 
        avgAccuracy: 100,
        avgMouseVelocity: 0,
        totalSessions: 0,
        lastSeen: Date.now()
    };
    
    const weight = current.totalSessions === 0 ? 0 : 1; 
    const newTotal = current.totalSessions + 1;

    const newWpm = ((current.avgWpm * current.totalSessions) + metrics.wpm) / newTotal;
    
    const newFlight = metrics.avgFlightTime > 0 
        ? ((current.avgFlightTime * current.totalSessions) + metrics.avgFlightTime) / newTotal
        : current.avgFlightTime;
        
    const newAccuracy = ((current.avgAccuracy * current.totalSessions) + metrics.accuracy) / newTotal;
    
    const newMouseVel = ((current.avgMouseVelocity * current.totalSessions) + metrics.mouseMetrics.avgVelocity) / newTotal;

    const updated: UserProfile = {
        avgWpm: parseFloat(newWpm.toFixed(2)),
        avgFlightTime: parseFloat(newFlight.toFixed(2)),
        avgAccuracy: parseFloat(newAccuracy.toFixed(2)),
        avgMouseVelocity: parseFloat(newMouseVel.toFixed(4)),
        totalSessions: newTotal,
        lastSeen: Date.now()
    };
    
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updated));
    return updated;
  }
};
