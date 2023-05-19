import fs from 'fs';
import JSON5 from 'json5';

const configPath = './config.json5';
const defaultConfigPath = './config-default.json5';

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

  loadConfig(): void {
    let inputRaw: any;
    try {
      inputRaw = fs.readFileSync(configPath);
    } catch(e) {
      // Create config.json5 from config-default.json5 if it doesn't exist
      try {
        inputRaw = fs.readFileSync(defaultConfigPath);
        fs.writeFileSync(configPath, inputRaw);
      }
      catch(e) {
        console.log(`Error: Unable to read ${defaultConfigPath}`);
        return;
      }
    }

    let inputJson: any;
    try {
      inputJson = JSON5.parse(inputRaw);
    } catch(e) {
      console.log(`Error: Unable to parse json in ${configPath}`);
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

  addPlugin(path: string): void {
    if (this.config.plugins.includes(path)) {
      console.log(`Error: Plugin ${path} already installed`);
      return;
    }

    this.config.plugins.push(path);
    this.saveConfig();
  }

  removePlugin(path: string): void {
    if (!this.config.plugins.includes(path)) {
      console.log(`Error: Plugin ${path} not installed`);
      return;
    }

    this.config.plugins = this.config.plugins.filter(plugin => plugin !== path);
    this.saveConfig();
  }

  saveConfig(): void {
    fs.writeFileSync(configPath, JSON5.stringify(this.config, null, 2));
  }
}

export default new Config();