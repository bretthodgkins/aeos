require('dotenv').config()

import logger from './logger';
import notifications from './notifications';
import store from './store';

import AeosPlugin from './pluginInterface';

import * as chatCompletion from './chatCompletion';

import { 
  getAllCommandFormats,
  getCommandExecutablesFromCommandInput,
  getCommandFromFormat,
  getIsRunning,
  runCommands,
  setIsRunningFalse,
} from './commands';

import { 
  Command,
  CommandExample,
  CommandExecutable,
  CommandInput,
  CommandResult,
  CommandType,
  getCommandInputString,
} from './commandTypes';

// Disable debug logs by default as package
store.addKeyValueToStore('enableLogToConsole', 'false');
store.addKeyValueToStore('enableLogToFile', 'false');

// types
export { 
  AeosPlugin,
  Command,
  CommandExample,
  CommandExecutable,
  CommandInput,
  CommandResult,
  CommandType,
};

// functions
export {
  getAllCommandFormats,
  getCommandExecutablesFromCommandInput,
  getCommandFromFormat,
  getCommandInputString,
  getIsRunning,
  setIsRunningFalse,
  runCommands
};

// the rest
export { 
  chatCompletion,
  logger, 
  notifications,
  store,
};
