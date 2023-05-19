import fs from 'fs';
import JSON5 from 'json5';

import { Command } from './command_types';

import config from './config';
import AeosPlugin from './pluginInterface';

const defaultConfigPath = './config-default.json5';

class PluginManager {
  private plugins: Map<string, AeosPlugin>;

  constructor() {
    this.plugins = new Map<string, AeosPlugin>();
  }

  async loadPlugins(): Promise<void> {
    const pluginsList = config.getPluginsList();
    for (const plugin of pluginsList) {
      await this.loadPlugin(plugin);
    }
  }

  async loadPlugin(path: string): Promise<boolean> {
    try {
      const pluginModule = await import(path);
      const plugin = pluginModule.default as AeosPlugin;
      this.plugins.set(path, plugin);
      return true;
    } catch(e) {
      console.log(`Error: Unable to load plugin ${path}\n`);
      return false;
    }
  }

  async installPlugin(path: string): Promise<void> {
    const success = await this.loadPlugin(path);
    if (!success) return;
    config.addPlugin(path);
    config.saveConfig();
  }

  async uninstallPlugin(path: string): Promise<void> {
    config.removePlugin(path);
    config.saveConfig();
    this.plugins.delete(path);
  }

  getCommands(): Command[] {
    let allCommands = [] as Command[];
    for (let plugin of this.plugins.values()) {
      allCommands = allCommands.concat(plugin.getCommands());
    }
    return allCommands;
  }

  getPlugins(): AeosPlugin[] {
    return Array.from(this.plugins.values());
  }
}
export default new PluginManager();