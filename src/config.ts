import fs from 'fs';
import path from 'path';
import os from 'os';
import process from 'process';
import JSON5 from 'json5';

const defaultConfig = {
  configuration: {
    enableLogToConsole: false, // enables debug logs
    enableLogToFile: false, // writes debug logs to ./access.log
  },
  userVariables: {
    // key value pairs that will be available on startup
  },
  plugins: [
    // accepts local paths or npm package names
  ],
};

type ConfigType = {
  configuration: Record<string, string>;
  userVariables: Record<string, string>;
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
    let dir = '';

    // Check the operating system
    if (process.platform === 'win32') {
      // On Windows, use the AppData directory
      if (!process.env.APPDATA) {
        console.log('Error: APPDATA environment variable is not defined');
        process.exit(1);
      }

      dir = path.join(process.env.APPDATA, 'aeos');
    } else {
      // On Linux/Mac, use a dotfile in the home directory
      dir = path.join(os.homedir(), '.aeos');
    }

    // Ensure the directory exists
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  getConfigPath(): string {
    return path.join(this.getConfigDirectory(), 'config.json5');
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

    this.config = inputJson;
  }

  getConfiguration(): Record<string, string> {
    return this.config.configuration;
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