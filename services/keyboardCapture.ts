export type KeyMessage = {
  key: string;
  code: string;
  timestamp: number;
  type: 'down' | 'up';
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  shift?: boolean;
};

type Handler = (msg: KeyMessage) => void;

export class KeyboardCapture {
  private onEvent: Handler;
  private active = false;
  private pressed = new Set<string>();
  private downHandler: any;
  private upHandler: any;

  constructor(onEvent: Handler) {
    this.onEvent = onEvent;
    this.downHandler = (e: KeyboardEvent) => {
      if (!this.active) return;
      const ts = Date.now();
      const msg: KeyMessage = {
        key: e.key,
        code: e.code,
        timestamp: ts,
        type: 'down',
        ctrl: e.ctrlKey,
        alt: e.altKey,
        meta: e.metaKey,
        shift: e.shiftKey,
      };
      this.pressed.add(e.code || e.key);
      this.onEvent(msg);
    };
    this.upHandler = (e: KeyboardEvent) => {
      if (!this.active) return;
      const ts = Date.now();
      const msg: KeyMessage = {
        key: e.key,
        code: e.code,
        timestamp: ts,
        type: 'up',
        ctrl: e.ctrlKey,
        alt: e.altKey,
        meta: e.metaKey,
        shift: e.shiftKey,
      };
      this.pressed.delete(e.code || e.key);
      this.onEvent(msg);
    };
  }

  start() {
    if (this.active) return;
    this.active = true;
    const opts: AddEventListenerOptions = { capture: true } as any;
    window.addEventListener('keydown', this.downHandler, opts);
    window.addEventListener('keyup', this.upHandler, opts);
    document.addEventListener('keydown', this.downHandler, opts);
    document.addEventListener('keyup', this.upHandler, opts);
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('keydown', this.downHandler);
    window.removeEventListener('keyup', this.upHandler);
    document.removeEventListener('keydown', this.downHandler);
    document.removeEventListener('keyup', this.upHandler);
    this.pressed.clear();
  }
}

