const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const request = require('request');

import { CommandResult } from '../src/command_types';

import * as textCompletion from './textCompletion';
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

  const response = await textCompletion.generateText(args.prompt, 2000, 0.3);
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
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

  const waitPromise = async () => {
    await sleep((parseInt(args.duration) * 1000));
  }

  logger.log(`Waiting for ${args.duration} seconds...`);
  await waitPromise();
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
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

  const waitPromise = async () => {
    await sleep(parseInt(args.duration));
  }

  logger.log(`Waiting for ${args.duration} milliseconds...`);
  await waitPromise();
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