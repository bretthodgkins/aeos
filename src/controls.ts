import { evaluate } from 'mathjs';
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const request = require('request');

import { CommandResult } from './commandTypes';

import { getChatCompletion } from './chatCompletion';
import logger from "./logger";
import notifications from './notifications';
import store from './store';


export async function generateText(args: Record<string, string>): Promise<CommandResult> {
  if (!args.prompt) {
    return {
      success: false,
      message: 'No prompt provided',
    }
  }

  const temperature = args.temperature ? Number(args.temperature) : 0.3;
  const maxTokens = args.maxTokens ? Number(args.maxTokens) : 2000;

  const response = await getChatCompletion(args.prompt, maxTokens, temperature);
  const cleanResponse = response.trimStart().replace(/\n/g, '\\n').trim();
  store.addKeyValueToStore('lastGeneratedText', cleanResponse);

  return { success: true } as CommandResult;
}

export async function consoleLog(args: Record<string, string>): Promise<CommandResult> {
  if (!args.log) {
    return {
      success: false,
      message: 'No log provided',
    }
  }
  const ouput = args.log.replace(/\\n/g, '\n');
  console.log(ouput);
  return { success: true } as CommandResult;
}

export async function waitInSeconds(args: Record<string, string>): Promise<CommandResult> {
  if (!args.duration || isNaN(Number(args.duration))) {
    return {
      success: false,
      message: 'No valid duration provided',
    };
  }

  const sleep = (milliseconds: number) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  };
  
  await sleep(Number(args.duration) * 1000);

  logger.log(`Finished waiting`);
  return { success: true } as CommandResult;
}

export async function waitInMilliseconds(args: Record<string, string>): Promise<CommandResult> {
  if (!args.duration || isNaN(Number(args.duration))) {
    return {
      success: false,
      message: 'No valid duration provided',
    };
  }

  const sleep = (milliseconds: number) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  };
  
  logger.log(`Waiting for ${args.duration} milliseconds...`);
  await sleep(Number(args.duration));
  logger.log(`Finished waiting`);
  return { success: true } as CommandResult;
}

export async function pushNotification(args: Record<string, string>): Promise<CommandResult> {
  if (!args.title || !args.body) {
    return {
      success: false,
      message: 'No title or body provided',
    };
  }

  notifications.push(args.title, args.body);
  return { success: true } as CommandResult;
}

export async function writeToFile(args: Record<string, string>): Promise<CommandResult> {
  if (!args.filePath || !args.variableName) {
    return {
      success: false,
      message: 'No file path or variable name provided',
    };
  }

  const content = store.getValue(args.variableName);
  if (!content) {
    return {
      success: false,
      message: `Variable not saved ${args.variableName}`,
    };
  }

  try {
    await fs.promises.writeFile(args.filePath, content.replace(/\\n/g, '\n'));
    pushNotification({ title: 'Success', body: `File saved to ${args.filePath}` });
  } catch (err) {
    return {
      success: false,
      message: `Unable to write to file ${args.filePath}`,
    };
  }

  return { success: true } as CommandResult;
}

export async function appendToFile(args: Record<string, string>): Promise<CommandResult> {
  if (!args.filePath || !args.variableName) {
    return {
      success: false,
      message: 'No file path or variable name provided',
    };
  }

  const content = store.getValue(args.variableName);
  if (!content) {
    return {
      success: false,
      message: `Variable not saved ${args.variableName}`,
    }
  }

  // Add a newline to the beginning of the content, and replace any newline placeholders
  const contentToAppend = `\n${content.replace(/\\n/g, '\n')}`;

  try {
    await fs.promises.writeFile(args.filePath, contentToAppend, { flag: 'a' });
    pushNotification({ title: 'Success', body: `File saved to ${args.filePath}` });
  } catch (err) {
    pushNotification({ title: 'Error', body: `Unable to write to file ${args.filePath}` });
    return { 
      success: false,
      message: `Unable to write to file ${args.filePath}`,
    }
  }

  return { success: true } as CommandResult;
}

export async function storeKeyValue(args: Record<string, string>): Promise<CommandResult> {
  if (!args.key || !args.value) {
    return {
      success: false,
      message: 'No key or value provided',
    };
  }

  store.addKeyValueToStore(args.key, args.value);

  return { success: true } as CommandResult;
}

export async function downloadFromURL(args: Record<string, string>): Promise<CommandResult> {
  if (!args.url || !args.filename) {
    return {
      success: false,
      message: 'No url or filename provided',
    };
  }
  
  const fileName = args.filename.replace(/\s/g,'-').toLowerCase();
  const filePath = path.join(__dirname, '..', 'output', `${fileName}`);

  request(args.url)
    .pipe(fs.createWriteStream(filePath))
    .on('close', () => {
      logger.log(`File saved to ${filePath}`);
    });

  return { success: true } as CommandResult;
}

export async function readFromFile(args: Record<string, string>): Promise<CommandResult> {
  if (!args.filePath || !args.variableName) {
    return {
      success: false,
      message: 'No file path or variable name provided',
    };
  }

  try {
    const content = await fs.promises.readFile(args.filePath, 'utf-8');
    store.addKeyValueToStore(args.variableName, content.replace(/\n/g, '\\n'));
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: `Unable to read file ${args.filePath}: ${err.message}`,
    };
  }
}

export async function fetchUrlContent(args: Record<string, string>): Promise<CommandResult> {
  if (!args.url || !args.variableName) {
    return {
      success: false,
      message: 'No URL or variable name provided',
    };
  }

  return new Promise((resolve) => {
    request(args.url, (error: any, response: any, body: any) => {
      if (error) {
        resolve({
          success: false,
          message: `Failed to fetch URL ${args.url}: ${error.message}`,
        });
      } else if (response.statusCode !== 200) {
        resolve({
          success: false,
          message: `Failed to fetch URL ${args.url}: Status code ${response.statusCode}`,
        });
      } else {
        store.addKeyValueToStore(args.variableName, body.replace(/\n/g, '\\n'));
        resolve({ success: true });
      }
    });
  });
}

export async function calculateExpression(args: Record<string, string>): Promise<CommandResult> {
  if (!args.expression || !args.variableName) {
    return {
      success: false,
      message: 'No expression or variable name provided',
    };
  }

  try {
    const result = evaluate(args.expression);
    store.addKeyValueToStore(args.variableName, result.toString());
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to calculate expression ${args.expression}: ${err.message}`,
    };
  }
}

export async function listFilesInDirectory(args: Record<string, string>): Promise<CommandResult> {
  if (!args.directoryPath || !args.variableName) {
    return {
      success: false,
      message: 'No directory path or variable name provided',
    };
  }

  try {
    // const files = await fs.promises.readdir(args.directoryPath, {
    //   encoding: 'utf8',
    //   withFileTypes: false,
    // });
    const files: string[] = await fs.promises.readdir(args.directoryPath, { withFileTypes: false });
    store.addKeyValueToStore(args.variableName, files.join(', '));
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: `Unable to list files in directory ${args.directoryPath}: ${err.message}`,
    };
  }
}
