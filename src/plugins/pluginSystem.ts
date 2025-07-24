export interface PluginHooks {
  onTimerStart?: (duration: number) => void;
  onTimerComplete?: (sessionType: 'focus' | 'break') => void;
  onTaskComplete?: (taskId: string) => void;
  onPlantGrowth?: (level: number) => void;
  renderSidebar?: () => React.ReactNode;
  renderSettings?: () => React.ReactNode;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  hooks: PluginHooks;
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private hooks: {
    onTimerStart: ((duration: number) => void)[];
    onTimerComplete: ((sessionType: 'focus' | 'break') => void)[];
    onTaskComplete: ((taskId: string) => void)[];
    onPlantGrowth: ((level: number) => void)[];
  } = {
    onTimerStart: [],
    onTimerComplete: [],
    onTaskComplete: [],
    onPlantGrowth: []
  };

  register(plugin: Plugin): boolean {
    try {
      // 驗證外掛
      if (!plugin.id || !plugin.name || !plugin.hooks) {
        throw new Error('Invalid plugin structure');
      }

      // 檢查是否已存在
      if (this.plugins.has(plugin.id)) {
        throw new Error(`Plugin ${plugin.id} already exists`);
      }

      // 註冊外掛
      this.plugins.set(plugin.id, plugin);

      // 註冊 hooks
      Object.entries(plugin.hooks).forEach(([hookName, hookFunction]) => {
        if (hookName in this.hooks && typeof hookFunction === 'function') {
          (this.hooks as any)[hookName].push(hookFunction);
        }
      });

      console.log(`Plugin ${plugin.name} registered successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.id}:`, error);
      return false;
    }
  }

  unregister(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    // 移除 hooks
    Object.entries(plugin.hooks).forEach(([hookName, hookFunction]) => {
      if (hookName in this.hooks) {
        const hookArray = (this.hooks as any)[hookName];
        const index = hookArray.indexOf(hookFunction);
        if (index > -1) {
          hookArray.splice(index, 1);
        }
      }
    });

    this.plugins.delete(pluginId);
    console.log(`Plugin ${plugin.name} unregistered`);
    return true;
  }

  // Hook 觸發方法
  triggerTimerStart(duration: number) {
    this.hooks.onTimerStart.forEach(hook => {
      try {
        hook(duration);
      } catch (error) {
        console.error('Plugin hook error:', error);
      }
    });
  }

  triggerTimerComplete(sessionType: 'focus' | 'break') {
    this.hooks.onTimerComplete.forEach(hook => {
      try {
        hook(sessionType);
      } catch (error) {
        console.error('Plugin hook error:', error);
      }
    });
  }

  triggerTaskComplete(taskId: string) {
    this.hooks.onTaskComplete.forEach(hook => {
      try {
        hook(taskId);
      } catch (error) {
        console.error('Plugin hook error:', error);
      }
    });
  }

  triggerPlantGrowth(level: number) {
    this.hooks.onPlantGrowth.forEach(hook => {
      try {
        hook(level);
      } catch (error) {
        console.error('Plugin hook error:', error);
      }
    });
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}

export const pluginManager = new PluginManager();

// 全域 API
declare global {
  interface Window {
    FlowOS: {
      registerPlugin: (plugin: Plugin) => boolean;
      unregisterPlugin: (pluginId: string) => boolean;
      getPlugin: (pluginId: string) => Plugin | undefined;
      getAllPlugins: () => Plugin[];
    };
  }
}

window.FlowOS = {
  registerPlugin: pluginManager.register.bind(pluginManager),
  unregisterPlugin: pluginManager.unregister.bind(pluginManager),
  getPlugin: pluginManager.getPlugin.bind(pluginManager),
  getAllPlugins: pluginManager.getAllPlugins.bind(pluginManager)
};
