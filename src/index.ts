require('dotenv').config()

import store from './store';
import logger from './logger';
import Plugin from './pluginInterface';
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
  Command,
  CommandExample,
  CommandExecutable,
  CommandInput,
  CommandResult,
  CommandType,
  Plugin,
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
