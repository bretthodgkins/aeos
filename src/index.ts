require('dotenv').config()

import logger from './logger';
import notifications from './notifications';
import store from './store';
import config from './config';

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

import {
  Message,
} from './languageModelTypes';

import {
  createMessage,
} from './languageModels';

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
  Message,
};

// functions
export {
  createMessage,
  getAllCommandFormats,
  getCommandExecutablesFromCommandInput,
  getCommandFromFormat,
  getCommandInputString,
  getIsRunning,
  runCommands,
  setIsRunningFalse,
};

// the rest
export { 
  chatCompletion,
  config,
  logger, 
  notifications,
  store,
};
