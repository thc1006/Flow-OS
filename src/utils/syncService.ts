import { createClient } from '@supabase/supabase-js';
import { DataService, db } from './database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export class SyncService {
  private static syncEnabled = false;
  private static userId: string | null = null;
  private static syncInterval: ReturnType<typeof setInterval> | null = null;

  static async enableSync(email: string, password: string) {
    if (!supabase) {
      return { success: false, error: 'Supabase configuration missing' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.syncEnabled = true;
      this.userId = data.user?.id || null;
      
      // 開始定期同步
      this.startPeriodicSync();
      
      return { success: true };
    } catch (error: any) {
      console.error('Sync enable failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async syncToCloud() {
    if (!this.syncEnabled || !this.userId || !supabase) return;

    try {
      // 同步 sessions
      const sessions = await db.sessions.toArray();
      const sessionsWithUserId = sessions.map(s => ({ 
        ...s, 
        user_id: this.userId,
        start_time: s.startTime,
        end_time: s.endTime
      }));

      const { error: sessionsError } = await supabase
        .from('sessions')
        .upsert(sessionsWithUserId);

      if (sessionsError) throw sessionsError;

      // 同步 tasks
      const tasks = await db.tasks.toArray();
      const tasksWithUserId = tasks.map(t => ({ 
        ...t, 
        user_id: this.userId,
        created_at: t.createdAt,
        completed_at: t.completedAt
      }));

      const { error: tasksError } = await supabase
        .from('tasks')
        .upsert(tasksWithUserId);

      if (tasksError) throw tasksError;

      console.log('Data synced to cloud successfully');
    } catch (error) {
      console.error('Cloud sync failed:', error);
    }
  }

  static async syncFromCloud() {
    if (!this.syncEnabled || !this.userId || !supabase) return;

    try {
      // 從雲端取得 sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', this.userId);

      if (sessionsError) throw sessionsError;

      // 合併到本地資料庫
      if (sessions) {
        await db.transaction('rw', db.sessions, async () => {
          for (const session of sessions) {
            await db.sessions.put({
              ...session,
              startTime: new Date(session.start_time),
              endTime: new Date(session.end_time)
            });
          }
        });
      }

      // 從雲端取得 tasks  
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', this.userId);

      if (tasksError) throw tasksError;

      if (tasks) {
        await db.transaction('rw', db.tasks, async () => {
          for (const task of tasks) {
            await db.tasks.put({
              ...task,
              createdAt: new Date(task.created_at),
              completedAt: task.completed_at ? new Date(task.completed_at) : undefined
            });
          }
        });
      }

      console.log('Data synced from cloud successfully');
    } catch (error) {
      console.error('Cloud sync failed:', error);
    }
  }

  private static startPeriodicSync() {
    // 清除現有的同步間隔
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // 每 5 分鐘同步一次
    this.syncInterval = setInterval(() => {
      this.syncToCloud();
    }, 5 * 60 * 1000);

    // 頁面載入時同步
    this.syncFromCloud();
  }

  static disableSync() {
    this.syncEnabled = false;
    this.userId = null;
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (supabase) {
      supabase.auth.signOut();
    }
  }

  static isEnabled(): boolean {
    return this.syncEnabled;
  }

  static getUserId(): string | null {
    return this.userId;
  }
}
