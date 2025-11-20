export type WSStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export interface AnalysisResponse {
  currentActivity: string;
  focusLevel: 'High' | 'Medium' | 'Low' | 'Distracted';
  riskScore: number;
  trustScore: number;
  trustScoreAdjustment: number;
  summary: string;
  isBotDetected: boolean;
  detectedApps: string[];
  features?: Record<string, number>;
}

type MessageHandler = (msg: AnalysisResponse) => void;
type StatusHandler = (status: WSStatus) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly onMessage: MessageHandler;
  private readonly onStatus: StatusHandler;
  private reconnectAttempts = 0;
  private shouldReconnect = true;
  private sendQueue: any[] = [];

  constructor(url: string, onMessage: MessageHandler, onStatus: StatusHandler) {
    this.url = url;
    this.onMessage = onMessage;
    this.onStatus = onStatus;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.onStatus('connecting');
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this.onStatus('open');
        this.reconnectAttempts = 0;
        this.flushQueue();
      };
      this.ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data && data.ok) {
            this.onMessage(data as AnalysisResponse);
          }
        } catch (e) {
          this.onStatus('error');
          console.error('WS parse error', e);
        }
      };
      this.ws.onerror = (evt) => {
        this.onStatus('error');
        console.error('WS error', evt);
      };
      this.ws.onclose = () => {
        this.onStatus('closed');
        if (this.shouldReconnect) this.scheduleReconnect();
      };
    } catch (e) {
      this.onStatus('error');
      console.error('WS connect error', e);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.onStatus('closed');
  }

  send(payload: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.sendQueue.push(payload);
      return;
    }
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (e) {
      console.error('WS send error', e);
      this.sendQueue.push(payload);
    }
  }

  private flushQueue() {
    const items = this.sendQueue.splice(0);
    for (const p of items) {
      try {
        this.ws?.send(JSON.stringify(p));
      } catch (e) {
        console.error('WS flush error', e);
        this.sendQueue.push(p);
        break;
      }
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts += 1;
    const base = 500;
    const max = 8000;
    const jitter = Math.random() * 250;
    const delay = Math.min(max, base * Math.pow(2, this.reconnectAttempts)) + jitter;
    setTimeout(() => {
      if (this.shouldReconnect) this.connect();
    }, delay);
  }
}

