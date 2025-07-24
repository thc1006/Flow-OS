import { Plugin } from './pluginSystem';
import { DataService } from '../utils/database';

const notionSyncPlugin: Plugin = {
  id: 'notion-sync',
  name: 'Notion 同步',
  version: '1.0.0',
  description: '將完成的番茄鐘和任務同步到 Notion',
  author: 'Flow-OS Team',
  hooks: {
    onTimerComplete: async (sessionType) => {
      if (sessionType === 'focus') {
        await syncFocusSessionToNotion();
      }
    },
    onTaskComplete: async (taskId) => {
      await syncTaskToNotion(taskId);
    }
  }
};

async function syncFocusSessionToNotion() {
  const notionToken = localStorage.getItem('notion-token');
  const databaseId = localStorage.getItem('notion-database-id');
  
  if (!notionToken || !databaseId) {
    console.warn('Notion token or database ID not configured');
    return;
  }

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: `專注時間 - ${new Date().toLocaleString()}`
                }
              }
            ]
          },
          Type: {
            select: {
              name: 'Focus Session'
            }
          },
          Duration: {
            number: 25
          },
          Date: {
            date: {
              start: new Date().toISOString()
            }
          },
          Status: {
            select: {
              name: 'Completed'
            }
          }
        }
      })
    });

    if (response.ok) {
      console.log('Focus session synced to Notion successfully');
    } else {
      const errorData = await response.json();
      console.error('Failed to sync to Notion:', errorData);
    }
  } catch (error) {
    console.error('Failed to sync to Notion:', error);
  }
}

async function syncTaskToNotion(taskId: string) {
  const notionToken = localStorage.getItem('notion-token');
  const taskDatabaseId = localStorage.getItem('notion-task-database-id');
  
  if (!notionToken || !taskDatabaseId) {
    console.warn('Notion token or task database ID not configured');
    return;
  }

  try {
    // 從本地資料庫獲取任務詳情
    const task = await DataService.getTaskById(parseInt(taskId));
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: taskDatabaseId },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: task.title
                }
              }
            ]
          },
          Description: {
            rich_text: [
              {
                text: {
                  content: task.description || ''
                }
              }
            ]
          },
          Priority: {
            select: {
              name: task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
            }
          },
          Status: {
            select: {
              name: 'Completed'
            }
          },
          'Completed At': {
            date: {
              start: new Date().toISOString()
            }
          },
          'Estimated Sessions': {
            number: task.estimatedSessions
          },
          'Actual Sessions': {
            number: task.actualSessions
          }
        }
      })
    });

    if (response.ok) {
      console.log(`Task ${taskId} synced to Notion successfully`);
    } else {
      const errorData = await response.json();
      console.error('Failed to sync task to Notion:', errorData);
    }
  } catch (error) {
    console.error('Failed to sync task to Notion:', error);
  }
}

// 自動註冊外掛
if (typeof window !== 'undefined' && window.FlowOS) {
  window.FlowOS.registerPlugin(notionSyncPlugin);
}

export default notionSyncPlugin;
