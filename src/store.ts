import fs from 'fs';
import JSON5 from 'json5';
import { CommandInput, getCommandInputString, setCommandInputString } from './command_types';

class Store {
  private store: Record<string, string>;

  constructor() {
    this.store = {
      'enableLogToConsole': 'false',
      'enableLogToFile': 'false',
      ...this.getConfigFromFile(),
    };
  }

  addMapToStore(map: Record<string, string>) {
    this.store = { ...this.store, ...map };
  }

  addKeyValueToStore(key: string, value: string) {
    this.store[key] = value;
  }

  injectVariablesIntoString(input: string): string {
    var argsRegex = /\$\{(\w+)\}/g
    var args = input.match(argsRegex);
    if (!args) return input;
    return args.reduce((result, arg) => {
      const value = this.store[arg.slice(2, -1)];
      if (!value) throw new Error(`Unable to find value for ${arg} in store`);
      result = result.replace(arg, value);
      return result;
    }, input);
  }

  injectVariablesIntoCommandInput(commandInput: CommandInput): CommandInput {
    const commandInputString = getCommandInputString(commandInput);
    const newCommandString = this.injectVariablesIntoString(commandInputString);
    return setCommandInputString(commandInput, newCommandString);
  }

  getValue(key: string): string | undefined {
    return this.store[key];
  }

  private getConfigFromFile(): Record<string, string> {
    const configPath = './config.json5';

    let inputRaw: any;
    try {
      inputRaw = fs.readFileSync(configPath);
    } catch(e) {
      console.log(`Warning: No config file found at ${configPath}`);
      return {}; // no config file 
    }

    let inputJson: any;
    try {
      inputJson = JSON5.parse(inputRaw);
      return {...inputJson.configuration, ...inputJson.userVariables};

    } catch(e) {
      console.log(`Error: Unable to parse json in ${configPath}`);
      return {};
    }
  }
}

export default new Store();