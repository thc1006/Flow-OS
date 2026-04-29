import Dexie, { Table } from 'dexie';

export interface Session {
  id?: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  type: 'focus' | 'break';
  completed: boolean;
  taskId?: string;
}

export interface Task {
  id?: number;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  priority: 'low' | 'medium' | 'high';
  estimatedSessions: number;
  actualSessions: number;
}

export interface Achievement {
  id?: number;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  points: number;
}

export interface Settings {
  id?: number;
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  focusMode: boolean;
}

export class FlowOSDatabase extends Dexie {
  sessions!: Table<Session>;
  tasks!: Table<Task>;
  achievements!: Table<Achievement>;
  settings!: Table<Settings>;

  constructor() {
    super('FlowOSDatabase');
    
    this.version(1).stores({
      sessions: '++id, startTime, endTime, type, completed, taskId',
      tasks: '++id, title, completed, createdAt, priority',
      achievements: '++id, name, unlockedAt',
      settings: '++id'
    });

    this.on('populate', () => this.populate());
  }

  async populate() {
    await this.settings.add({
      focusDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      soundEnabled: true,
      notificationsEnabled: true,
      focusMode: false,
    });
  }
}

export const db = new FlowOSDatabase();

export class DataService {
  static async addSession(session: Omit<Session, 'id'>) {
    return await db.sessions.add(session);
  }

  static async getSessionsInRange(startDate: Date, endDate: Date) {
    return await db.sessions
      .where('startTime')
      .between(startDate, endDate)
      .toArray();
  }

  static async getTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await db.sessions
      .where('startTime')
      .between(today, tomorrow)
      .and(session => session.completed)
      .toArray();

    const focusSessions = sessions.filter(s => s.type === 'focus');
    const totalFocusTime = focusSessions.reduce((sum, s) => sum + s.duration, 0);

    return {
      focusSessions: focusSessions.length,
      totalFocusTime: Math.round(totalFocusTime / 60),
      completedTasks: await db.tasks
        .where('completedAt')
        .between(today, tomorrow)
        .count()
    };
  }

  static async addTask(task: Omit<Task, 'id'>) {
    return await db.tasks.add(task);
  }

  static async completeTask(taskId: number) {
    return await db.tasks.update(taskId, {
      completed: true,
      completedAt: new Date()
    });
  }

  static async getSettings() {
    const settings = await db.settings.toCollection().first();
    return settings;
  }

  static async updateSettings(updates: Partial<Settings>) {
    const settings = await db.settings.toCollection().first();
    if (settings?.id) {
      return await db.settings.update(settings.id, updates);
    }
  }
}
