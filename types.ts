
export interface KeyEvent {
  key: string;
  code: string;
  timestamp: number;
  type: 'down' | 'up';
  isSynthetic?: boolean; // For bot attacks
}

export interface MouseEventData {
  x: number;
  y: number;
  timestamp: number;
}

export interface MouseMetrics {
  avgVelocity: number; // pixels/ms
  maxVelocity: number;
  angularVelocity: number; // radians/ms
  clicks: number;
  tremorCount: number; // micro-movements indicating human vs bot
}

export interface KeyMetrics {
  key: string; // Raw char or Hash depending on privacy mode
  count: number;
  avgDwellTime: number; // ms
  errors: number;
}

export interface SessionMetrics {
  startTime: number;
  endTime: number;
  totalKeys: number;
  wpm: number;
  cpm: number; // characters per minute
  accuracy: number;
  avgDwellTime: number;
  avgFlightTime: number;
  backspaces: number;
  rhythmVariance: number; // Standard deviation of flight times
  topKeys: KeyMetrics[];
  mouseMetrics: MouseMetrics;
  privacyModeEnabled: boolean;
}

export interface ActivityLog {
  timestamp: number;
  activity: string;
  focusLevel: string;
  riskScore: number; // 0-100
  trustScore: number; // 0-100 (Zero Trust metric)
  description: string;
  isEncrypted?: boolean;
}

export interface AnalysisResponse {
  currentActivity: string;
  focusLevel: 'High' | 'Medium' | 'Low' | 'Distracted';
  riskScore: number;
  trustScore: number; // NOTE: Changed from trustScoreAdjustment to absolute for easier handling in some contexts, or keep adjustment
  trustScoreAdjustment: number;
  summary: string;
  isBotDetected: boolean;
  detectedApps: string[];
}

export interface Snapshot {
  id: string;
  timestamp: number;
  imageData: string; // Base64
  riskScore: number;
  activity: string;
}

export interface SystemResources {
  cpuUsage: number;
  ramUsage: number;
  networkLatency: number;
}

export interface UsbEvent {
  id: string;
  deviceName: string;
  timestamp: number;
  status: 'connected' | 'disconnected';
  isSuspicious: boolean;
}
