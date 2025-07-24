type EventMap = {
  TIMER_START: { duration: number };
  TIMER_PAUSE: {};
  TIMER_COMPLETE: { sessionType: 'focus' | 'break' };
  TASK_COMPLETE: { taskId: string };
  ACHIEVEMENT_UNLOCKED: { achievementId: string; points: number };
  PLANT_GROWTH: { level: number };
};

type EventHandler<T = any> = (data: T) => void;

class EventBus {
  private listeners: Map<keyof EventMap, EventHandler[]> = new Map();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
}

export const eventBus = new EventBus();
