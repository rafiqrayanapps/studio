type Listener = (...args: any[]) => void;

class EventEmitter {
  private events: { [key: string]: Listener[] } = {};

  on(eventName: string, listener: Listener): void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
  }

  off(eventName: string, listener: Listener): void {
    if (!this.events[eventName]) return;

    const index = this.events[eventName].indexOf(listener);
    if (index > -1) {
      this.events[eventName].splice(index, 1);
    }
  }

  emit(eventName: string, ...args: any[]): void {
    if (!this.events[eventName]) return;
    this.events[eventName].forEach(listener => listener(...args));
  }
}

export const errorEmitter = new EventEmitter();
