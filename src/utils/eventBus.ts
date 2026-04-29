type EventMap = {
  TIMER_START: { duration: number };
  TIMER_PAUSE: Record<string, never>;
  TIMER_COMPLETE: { sessionType: 'focus' | 'break' };
  TASK_COMPLETE: { taskId: string };
  ACHIEVEMENT_UNLOCKED: { achievementId: string; points: number };
  PLANT_GROWTH: { level: number };
};

type EventHandler<T> = (data: T) => void;

class EventBus {
  private listeners = new Map<keyof EventMap, Set<EventHandler<unknown>>>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as EventHandler<unknown>);
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    this.listeners.get(event)?.delete(handler as EventHandler<unknown>);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        (handler as EventHandler<EventMap[K]>)(data);
      } catch (error) {
        console.error(`[eventBus] handler error for ${String(event)}:`, error);
      }
    }
  }
}

export const eventBus = new EventBus();
