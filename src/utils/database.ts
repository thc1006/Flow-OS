import Dexie, { Table } from 'dexie';

export interface Session {
  id?: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  type: 'focus' | 'break';
  completed: boolean;
}

export interface Settings {
  id?: number;
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
}

export const DEFAULT_SETTINGS: Omit<Settings, 'id'> = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
};

export class FlowOSDatabase extends Dexie {
  sessions!: Table<Session>;
  settings!: Table<Settings>;

  constructor() {
    super('FlowOSDatabase');
    this.version(2).stores({
      sessions: '++id, startTime, endTime, type, completed',
      settings: '++id',
    });
  }
}

export const db = new FlowOSDatabase();

export const DataService = {
  async addSession(session: Omit<Session, 'id'>) {
    return db.sessions.add(session);
  },
  async getSessionsInRange(startDate: Date, endDate: Date) {
    return db.sessions.where('startTime').between(startDate, endDate).toArray();
  },
  async getSettings(): Promise<Settings> {
    const row = await db.settings.toCollection().first();
    if (row) return row;
    const id = await db.settings.add({ ...DEFAULT_SETTINGS });
    return { id: id as number, ...DEFAULT_SETTINGS };
  },
  async saveSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
    const row = await db.settings.toCollection().first();
    if (row?.id !== undefined) {
      await db.settings.update(row.id, patch);
    } else {
      await db.settings.add({ ...DEFAULT_SETTINGS, ...patch });
    }
  },
};
