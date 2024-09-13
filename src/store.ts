import { 
  CommandInput, 
  getCommandInputString, 
  setCommandInputString,
} from './commandTypes';

import config from './config';

class Store {
  private store: Record<string, any>;

  constructor() {
    this.store = {
      ...config.getConfiguration(),
      ...config.getUserVariables(),
    };
  }

  addMapToStore(map: Record<string, any>) {
    this.store = { ...this.store, ...map };
  }

  addKeyValueToStore(key: string, value: any) {
    this.store[key] = value;
  }

  injectVariablesIntoString(input: string): string {
    var argsRegex = /\$\{(\w+)\}/g
    var args = input.match(argsRegex);
    if (!args) return input;
    return args.reduce((result, arg) => {
      const value = this.store[arg.slice(2, -1)];
      if (!value) throw new Error(`Unable to find value for ${arg} in store`);
      result = result.replace(arg, value.toString());
      return result;
    }, input);
  }

  injectVariablesIntoCommandInput(commandInput: CommandInput): CommandInput {
    const commandInputString = getCommandInputString(commandInput);
    const newCommandString = this.injectVariablesIntoString(commandInputString);
    return setCommandInputString(commandInput, newCommandString);
  }

  getValue(key: string): any {
    return this.store[key];
  }
}

export default new Store();