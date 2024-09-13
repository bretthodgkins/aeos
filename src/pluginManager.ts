import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import { Command } from './commandTypes';

import config from './config';
import AeosPlugin from './pluginInterface';

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

  async loadPlugin(input: string): Promise<boolean> {
      try {
        let pluginModule;
        if (fs.existsSync(input)) {
          pluginModule = await import(input);
        } else {
          pluginModule = await import(path.join(config.getPluginsDirectory(), 'node_modules', input));
        }
        const plugin = pluginModule.default as AeosPlugin;
        this.plugins.set(input, plugin);
        return true;
      } catch(e) {
        console.log(`Error: Unable to load plugin ${input}\n`);
        return false;
      }
  }

  async installPlugin(input: string): Promise<void> {
    // check if plugin is already installed
    if (this.plugins.has(input)) {
      console.log(`Plugin "${input}" is already installed`);
      return;
    }

    const fullPath = path.resolve(input);

    // Check if input is a local path
    if (fs.existsSync(fullPath)) {
      const success = await this.loadPlugin(fullPath);
      if (!success) {
        console.log(`Error: Unable to load plugin ${fullPath}`);
        return;
      }
      config.addPlugin(fullPath);
    } else {
      // Assume input is an npm package
      try {
        // Check if this package is already installed
        require.resolve(path.join(config.getPluginsDirectory(), 'node_modules', input));
        // continue to add plugin to config
      } catch {
        // If not, try to install it
        try {
          execSync(`npm install --prefix ${config.getPluginsDirectory()} ${input}`, { stdio: 'inherit' });
        } catch (error) {
          console.error(`\nFailed to install plugin ${input}`);
          return;
        }
      }
      const success = await this.loadPlugin(input);
      if (!success) {
        console.log(`Error: Unable to load plugin ${input}`);
        return;
      }
      config.addPlugin(input);
    }

    config.saveConfig();
  }

  async uninstallPlugin(input: string): Promise<void> {
    // Perform npm uninstall if input is an npm package
    const fullPath = path.resolve(input);
    if (fs.existsSync(fullPath)) {
      config.removePlugin(fullPath);
    } else {
      const installedPath = path.join(config.getPluginsDirectory(), 'node_modules', input);
      if (fs.existsSync(installedPath)) {
        try {
          execSync(`npm uninstall --prefix ${config.getPluginsDirectory()} ${input}`, { stdio: 'inherit' });
        } catch (error) {
          console.error(`\nEncountered error while uninstalling plugin ${input}`);
        }
      }
      config.removePlugin(input);
    }

    config.saveConfig();
    this.plugins.delete(input);
  }

  async updatePlugin(input: string): Promise<void> {
    // check if plugin is installed
    if (!this.plugins.has(input)) {
      console.log(`Plugin "${input}" not installed`);
      return;
    }

    // Perform npm update if input is an npm package
    if (fs.existsSync(input)) { // not installed locally
      console.log(`Plugin "${input}" is a local plugin. Please update manually.`);
      return;
    } else {
      const installedPath = path.join(config.getPluginsDirectory(), 'node_modules', input);
      if (fs.existsSync(installedPath)) {
        try {
          execSync(`npm update --prefix ${config.getPluginsDirectory()} ${input}`, { stdio: 'inherit' });
        } catch (error) {
          console.error(`\nEncountered error while updating plugin ${input}`);
        }
      }
    }
  }

  getCommands(): Command[] {
    let allCommands = [] as Command[];
    for (let plugin of this.plugins.values()) {
      allCommands = allCommands.concat(plugin.getCommands());
    }
    return allCommands;
  }

  getPlugins(): Map<string, AeosPlugin> {
    return this.plugins;
  }
}
export default new PluginManager();