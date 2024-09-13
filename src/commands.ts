import * as controls from './controls';
import * as chatCompletion from './chatCompletion';
import * as flowControls from './flowControls';
import * as utils from './utils';
import config from './config';
import logger from "./logger";
import notifications from './notifications';
import pluginManager from './pluginManager';
import store from './store';

import { 
  Command,
  CommandExample,
  CommandExecutable,
  CommandInput,
  CommandResult,
  CommandType,
  getCommandInputString,
} from './commandTypes';

const fs = require('fs');
const path = require('path');
const JSON5 = require('json5')

let isInterrupted = false;
let isRunning = false;

const controlCommands: Command[] = [
  {
    "format": "console log ${log}",
    "description": "Logs a message to the console.",
    "type": CommandType.Function,
    "function": controls.consoleLog,
    "requiresExactMatch": false,
    "examples": [
      {
        prompt: "log hello world",
        output: [ "console log hello world" ],
      },
      {
        prompt: "print hello world",
        output: [ "console log hello world" ],
      },
      {
        prompt: "output hello world",
        output: [ "console log hello world" ],
      },
      {
        prompt: "output a poem about a cat",
        output: [ `generate text "write a poem about a cat"`, "console log ${lastGeneratedText}" ],
      },
    ],
  },
  {
    "format": "wait ${duration} seconds",
    "description": "Waits for the given number of seconds.",
    "type": CommandType.Function,
    "function": controls.waitInSeconds,
    "requiresExactMatch": false,
  },
  {
    "format": "wait ${duration} milliseconds",
    "description": "Waits for the given number of milliseconds.",
    "type": CommandType.Function,
    "function": controls.waitInMilliseconds,
    "requiresExactMatch": false,
  },
  {
    "format": "notification ${title} ${body}",
    "description": "Pushes a notification with the given title and body to registered handlers.",
    "type": CommandType.Function,
    "function": controls.pushNotification,
    "requiresExactMatch": false,
  },
  {
    "format": 'generate text ${prompt}',
    "description": "Utilises OpenAIs Text Completion API to provide a text completion from the given prompt. This is can be referenced using ${lastGeneratedText}.",
    "type": CommandType.Function,
    "function": controls.generateText,
    "requiresExactMatch": false,
  },
  {
    "format": 'write ${variableName} to file ${filePath}',
    "description": "Creates a file at the given path, and writes the specified variable to it.",
    "type": CommandType.Function,
    "function": controls.writeToFile,
    "requiresExactMatch": false,
  },
  {
    "format": 'append ${variableName} to file ${filePath}',
    "description": "Appends the specified variable to the given file.",
    "type": CommandType.Function,
    "function": controls.appendToFile,
    "requiresExactMatch": false,
  },
  {
    "format": 'store ${key} ${value}',
    "description": "Stores the given value as the given key. This can be referenced in other commands using the syntax ${key}.",
    "type": CommandType.Function,
    "function": controls.storeKeyValue,
    "requiresExactMatch": false,
  },
  {
    "format": 'download ${url} ${filename}',
    "description": "Downloads the file at the given URL and saves it to the given filename.",
    "type": CommandType.Function,
    "function": controls.downloadFromURL,
    "requiresExactMatch": false,
  },
  {
    "format": 'uninterrupt',
    "description": "Resets the interupt flag. If you've interupted a command, this will allow you to continue.",
    "type": CommandType.Function,
    "function": uninterruptCommand,
    "requiresExactMatch": true,
  },
  {
    "format": "read file ${filePath} into ${variableName}",
    "description": "Reads the contents of the file at the given path and stores it in the specified variable.",
    "type": CommandType.Function,
    "function": controls.readFromFile,
    "requiresExactMatch": false,
  },
  {
    "format": "fetch url ${url} into ${variableName}",
    "description": "Fetches the content from the given URL and stores it in the specified variable.",
    "type": CommandType.Function,
    "function": controls.fetchUrlContent,
    "requiresExactMatch": false,
  },
  {
    "format": "calculate ${expression} into ${variableName}",
    "description": "Calculates the given mathematical expression and stores the result in the specified variable.",
    "type": CommandType.Function,
    "function": controls.calculateExpression,
    "requiresExactMatch": false,
  },
  {
    "format": "list files in ${directoryPath} into ${variableName}",
    "description": "Lists files in the specified directory and stores the list in the specified variable.",
    "type": CommandType.Function,
    "function": controls.listFilesInDirectory,
    "requiresExactMatch": false,
  },
];

function getUserCommandsFromFile(path: string): Command[] {
  // logger.log(`Importing file: ${path}`);
  let inputRaw = fs.readFileSync(path);
  let inputJson: any;
  try {
    inputJson = JSON5.parse(inputRaw);
  } catch(e: any) {
    logger.log(`Error: Invalid command file: ${path}`);
    logger.log(e.toString());
    return [];
  }
  if (!inputJson.commands || inputJson.commands.length === 0) {
    logger.log(`Error: No commands found in ${path}`);
    return [];
  }

  const namespace = inputJson.namespace ? `${inputJson.namespace}:` : '';
  const namespaceRequiresApplication = inputJson.requires?.application;

  let commandList: Command[] = [];
  for (let inputCommand of inputJson.commands) {
    if (!inputCommand.format || !inputCommand.sequence || inputCommand.sequence.length === 0) {
      notifications.push("Error", `Invalid command found in ${path}`);
      return [];
    }

    const commandRequiresApplication = inputCommand.requires?.application;
    const requiresApplication = commandRequiresApplication || namespaceRequiresApplication;
    const requiresExactMatch = inputCommand.requires?.exactMatch || false;
    
    // TODO validate sequence as imported
    const format = `${namespace}${inputCommand.format}`;
    //logger.log(`Importing command: ${format}, requires application: ${requiresApplication}`);
    commandList.push({
      format,
      type: CommandType.Sequence,
      sequence: inputCommand.sequence,
      alternativeSequence: inputCommand.alternativeSequence,
      requiresApplication: requiresApplication,
      requiresExactMatch: requiresExactMatch,
      examples: inputCommand.examples,
    });
  }

  logger.log(`Imported ${commandList.length} commands from ${path}`);
  return commandList;
}

export function saveCommandToFile(command: Command, filename: string) {
  let commandJson = {
    format: command.format,
    type: command.type,
    sequence: command.sequence,
    requiresApplication: command.requiresApplication,
    requiresExactMatch: command.requiresExactMatch,
    examples: command.examples,
  };
  const commandsDir = config.getCommandsDirectory();
  const filePath = path.join(commandsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify({ commands: [ commandJson ] }, null, 2));
}

function getUserCommands(): Command[] {
  let commandList: Command[] = [];

  let files: any;
  const commandsDir = config.getCommandsDirectory();
  try {
    files = fs.readdirSync(commandsDir);
  } catch(e: any) {
    logger.log(`Warning: Commands directory not found at ${commandsDir}`);
    return [];
  }

  // Loop through the list of files
  for (const file of files) {
    // Check if the file is a JSON file
    if (file.endsWith('.json') || file.endsWith('.json5')) {
      const filePath = path.join(commandsDir, file);
      commandList = commandList.concat(getUserCommandsFromFile(filePath));
    }
  }

  return commandList;
}


let allCommands = [] as Command[];

export function loadAllCommands() {
  const userCommands = getUserCommands();
  const pluginCommands = pluginManager.getCommands();
  allCommands = [
    ...controlCommands,
    ...userCommands,
    ...pluginCommands,
  ];
  logger.log(`Loaded ${controlCommands.length} native command${controlCommands.length === 1 ? '' : 's'}`);
  logger.log(`Loaded ${pluginCommands.length} command${pluginCommands.length === 1 ? '' : 's'} from plugins`);
  logger.log(`Loaded ${userCommands.length} user-defined command${userCommands.length === 1 ? '' : 's'}`);
}


export function getAllCommandFormats(): string[] {
  return allCommands.map(command => command.format);
}

// This function is used to search for commands if there's no exact match
export function getAllSearchableCommandFormats(): string[] {
  return allCommands.filter(command => command.requiresExactMatch !== true).map(command => command.format);
}

export function getAllCommandExamples(): CommandExample[] {
  return allCommands.reduce((examples, command) => {
    if (command.examples) {
      examples = examples.concat(command.examples);
    }
    return examples;
  }, [] as CommandExample[]);
}

// format must match exactly the format of the command
export function getCommandFromFormat(format: string): Command | undefined {
  return allCommands.find(command => command.format === format);
}

export async function getCommandExecutablesFromCommandInput(commandInput: CommandInput, useNLP: boolean): Promise<CommandExecutable[]> {
  let commandInputString = getCommandInputString(commandInput);
  // get command from available commands
  // TODO only search commands where requirements are met
  let matchingFormats = utils.getMatchingFormatsFromInput(commandInputString, getAllCommandFormats());

  if (matchingFormats.length === 1) {
      const command = getCommandFromFormat(matchingFormats[0]);
      if (!command) throw ('Unexpected error: command not found after matched');
      const args = utils.getArgsFromInputAndFormat(commandInputString, matchingFormats[0]);
      return [{
        command,
        args,
        commandInput,
      }];
  } else if (matchingFormats.length > 1) {
    notifications.push('Error', `Multiple commands found matching "${commandInputString}"`);
    throw ('Multiple commands found matching input');
  } 

  let matchingFlowControlFormats = utils.getMatchingFormatsFromInput(commandInputString, flowControls.getAllFlowControlFormats());

  if (matchingFlowControlFormats.length === 1) {
      const command = flowControls.getFlowControlFromFormat(matchingFlowControlFormats[0]);
      if (!command) throw ('Unexpected error: flow control not found after matched');
      const args = utils.getArgsFromInputAndFormat(commandInputString, matchingFlowControlFormats[0]);
      if (typeof commandInput === 'object') {
        command.sequence = commandInput.sequence;
        command.alternativeSequence = commandInput.alternativeSequence;
      }
      return [{
        command,
        args,
        commandInput,
      }];
  } else if (matchingFormats.length > 1) {
    throw ('Unexpected error: Multiple flow controls found matching input');
  } 

  if (!useNLP) {
    notifications.push('Error', `Command not found: ${commandInputString}`);
    throw (`Unable to find command: ${commandInputString}`);
  }

  logger.log('No exact matches, trying GPT');
  let gptCommandStrings = await chatCompletion.findCommandGPT(commandInputString, getAllSearchableCommandFormats(), getAllCommandExamples());

  if (!gptCommandStrings.length) {
    throw (`Unable to predict command for: ${commandInputString}`);
  }

  let commandExecutableList = [] as CommandExecutable[];
  for (let commandString of gptCommandStrings) {
    const match = await getCommandExecutablesFromCommandInput(commandString, false);
    commandExecutableList.push(match[0]);
  }

  if (!commandExecutableList.length) {
    notifications.push('Error', `Predicted invalid command: ${commandInputString}`);
    throw ('Command not found');
  }

  return commandExecutableList;
}

export function interupt() {
  logger.log('Received interupt command...');
  isInterrupted = true;
}

export function uninterrupt() {
  isInterrupted = false;
}

export async function uninterruptCommand(args: Record<string, string>): Promise<CommandResult> {
  uninterrupt();
  return { success: true } as CommandResult;
}

export function getIsRunning(): boolean {
  return isRunning;
}

export function setIsRunningFalse() {
  isRunning = false;
}

// runCommands is a recursive function that converts the first commandInput into a command and runs it
export async function runCommands(commandInputs: CommandInput[]): Promise<CommandResult> {
  if (!commandInputs || !commandInputs.length) {
    return {
      success: false,
      message: 'No commands to run',
    }
  }

  isRunning = true;

  // take the first commandInput off the stack, and inject variables
  let commandInput = commandInputs[0];
  try {
    commandInput = store.injectVariablesIntoCommandInput(commandInput);
  } catch (e: any) {
    return {
      success: false,
      message: e.toString(),
    }
  }

  // convert the first commandInput into a commandExecutable that can be run
  let commandExecutables: CommandExecutable[];
  try {
    commandExecutables = await getCommandExecutablesFromCommandInput(commandInput, true);
  } catch (e: any) {
    return {
      success: false,
      message: e.toString(),
    }
  }

  for (let commandExecutable of commandExecutables) {
    if (isInterrupted) {
      return {
        success: false,
        message: 'This command was interupted during execution',
      }
    }

    let command = commandExecutable.command;
    let args = commandExecutable.args;
    for (let key in args) {
      args[key] = store.injectVariablesIntoString(args[key]); // commands generated by GPT may have variables in them
    }


    // all arguments are stored, and accessible in future commands
    store.addMapToStore(args);

    let commandResult = {
      success: true,
    } as CommandResult;
    switch (command.type) {
      case CommandType.Function:
        logger.log(`Running command: "${command.format}" with args: ${JSON.stringify(args)}`);
        if (!command.function) {
          return {
            success: false,
            message: `Internal error running the following command: "${command.format}"`,
          }
        }
        commandResult = await command.function(args) as CommandResult;
        break;
      case CommandType.Sequence:
        if (!command.sequence || !command.sequence.length) {
          return {
            success: false,
            message: `Sequence command missing sequence: "${command.format}"`
          }
        }
        commandResult = await runCommands([...command.sequence]);
        break;
      case CommandType.Flow:
        if (!command.flowControl) {
          return {
            success: false,
            message: `Flow control command missing flow control: "${command.format}"`
          }
        }
        if (!command.sequence || !command.sequence.length) {
          return {
            success: false,
            message: `Flow control command missing sequence: "${command.format}"`
          }
        }

        const sequence = command.sequence as CommandInput[];
        const alternativeSequence = command.alternativeSequence as CommandInput[];

        const runSequence = async () => {
          return await runCommands([...sequence]);
        };
        const runAlternativeSequence = async () => {
          logger.log(`Setting alternative sequence w/ length: ${alternativeSequence?.length}`);
          if (!alternativeSequence || !alternativeSequence.length) return { success: true } as CommandResult; // no alternative sequence needed, so return true
          return await runCommands([...alternativeSequence]);
        };
        commandResult = await command.flowControl(args, runSequence, runAlternativeSequence);
        break;
    }

    if (commandResult.success) {
      commandInputs.shift();
      if (commandInputs.length) {
        const commandResult2 = await runCommands(commandInputs);
        if (!commandResult2.success) {
          return commandResult2;
        }
      }
    } else {
      logger.log(`Failed command: "${command.format}" with args: ${JSON.stringify(args)}`);
      return commandResult;
    }
  }
  return { success: true } as CommandResult;
}