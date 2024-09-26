import fs from 'fs';
import path from 'path';
import os from 'os';
import process from 'process';
import JSON5 from 'json5';

const defaultConfig = {
  configuration: {
    enableLogToConsole: true, // enables debug logs
    enableLogToFile: true, // writes debug logs to ./access.log
    modelProvider: 'anthropic', // anthropic, openai
  },
  userVariables: {
    // key value pairs that will be available on startup
  },
  plugins: [
    // accepts local paths or npm package names
  ],
};

type ConfigType = {
  configuration: Record<string, any>;
  userVariables: Record<string, any>;
  plugins: string[];
}

class Config {
  private config: ConfigType = {
    configuration: {},
    userVariables: {},
    plugins: [],
  };

  constructor() {
    this.loadConfig();
  }

  getConfigDirectory(): string {
    let configDir = '';

    // Check the operating system
    if (process.platform === 'win32') {
      // On Windows, use the AppData directory
      if (!process.env.APPDATA) {
        console.log('Error: APPDATA environment variable is not defined');
        process.exit(1);
      }

      configDir = path.join(process.env.APPDATA, 'aeos');
    } else {
      // On Linux/Mac, use a dotfile in the home directory
      configDir = path.join(os.homedir(), '.aeos');
    }

    // Ensure the directory exists
    fs.mkdirSync(configDir, { recursive: true });
    return configDir;
  }

  getConfigPath(): string {
    return path.join(this.getConfigDirectory(), 'config.json5');
  }

  getCommandsDirectory(): string {
    const commandsDir = path.join(this.getConfigDirectory(), 'commands');

    // Ensure the directory exists
    fs.mkdirSync(commandsDir, { recursive: true });

    return commandsDir;
  }

  getPlansDirectory(): string {
    const plansDir = path.join(this.getConfigDirectory(), 'plans');

    // Ensure the directory exists
    fs.mkdirSync(plansDir, { recursive: true });

    return plansDir;
  }

  getLogPath(): string {
    return path.join(this.getConfigDirectory(), 'access.log');
  }

  getPluginsDirectory(): string {
    const pluginDir = path.join(this.getConfigDirectory(), 'plugins');

    // Ensure the directory exists
    fs.mkdirSync(pluginDir, { recursive: true });

    return pluginDir;
  }

  loadConfig(): void {
    let inputRaw: any;
    try {
      inputRaw = fs.readFileSync(this.getConfigPath());
    } catch(e) {
      // Create config.json5 from defaultConfig if it doesn't exist
      try {
        fs.writeFileSync(this.getConfigPath(), JSON.stringify(defaultConfig, null, 2));
        inputRaw = fs.readFileSync(this.getConfigPath());
        console.log(`Created ${this.getConfigPath()} from default config.`);
      }
      catch(e) {
        console.log(`Error: Unable to write ${this.getConfigPath()}`);
        return;
      }
    }

    let inputJson: any;
    try {
      inputJson = JSON5.parse(inputRaw);
    } catch(e) {
      console.log(`Error: Unable to parse json in ${this.getConfigPath()}`);
      return;
    }

    this.config = {
      configuration: { ...defaultConfig.configuration, ...inputJson.configuration },
      userVariables: { ...defaultConfig.userVariables, ...inputJson.userVariables },
      plugins: inputJson.plugins || [],
    }
  }

  getConfiguration(): Record<string, string> {
    return this.config.configuration;
  }

  getConfigurationSetting(key: string): any {
    return this.config.configuration[key];
  }

  setConfigurationSetting(key: string, value: any): void {
    this.config.configuration[key] = value;
  }

  saveConfigurationSetting(key: string, value: any): void {
    this.config.configuration[key] = value;
    this.saveConfig();
  }

  getUserVariables(): Record<string, string> {
    return this.config.userVariables;
  }

  getPluginsList(): string[] {
    return this.config.plugins;
  }

  addPlugin(path: string): boolean {
    if (this.config.plugins.includes(path)) {
      console.log(`Plugin ${path} already installed`);
      return false;
    }

    this.config.plugins.push(path);
    this.saveConfig();
    return true;
  }

  removePlugin(path: string): boolean {
    if (!this.config.plugins.includes(path)) {
      console.log(`Plugin ${path} not installed`);
      return false;
    }

    this.config.plugins = this.config.plugins.filter(plugin => plugin !== path);
    this.saveConfig();
    return true;
  }

  saveConfig(): void {
    fs.writeFileSync(this.getConfigPath(), JSON5.stringify(this.config, null, 2));
  }
}

export default new Config();