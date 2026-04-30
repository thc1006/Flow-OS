import Dexie, { Table } from 'dexie';

export interface Session {
  id?: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  type: 'focus' | 'break';
  completed: boolean;
}

export class FlowOSDatabase extends Dexie {
  sessions!: Table<Session>;

  constructor() {
    super('FlowOSDatabase');
    this.version(1).stores({
      sessions: '++id, startTime, endTime, type, completed',
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
};
