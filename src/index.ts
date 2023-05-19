require('dotenv').config()

import store from './store';
import logger from './logger';
import AeosPlugin from './pluginInterface';
import * as chatCompletion from './chatCompletion';

import { 
  getAllCommandFormats,
  runCommands,
} from './commands';

import { 
  Command,
  CommandExample,
  CommandExecutable,
  CommandInput,
  CommandResult,
  CommandType,
} from './command_types';

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
  runCommands
};

// the rest
export { 
  chatCompletion,
  logger, 
  store 
};
