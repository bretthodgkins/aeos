import { evaluate } from 'mathjs';
import * as fs from 'fs';

import { Command, CommandType, CommandResult } from './commandTypes';
import store from './store';
import logger from "./logger";

// this maps command formats to functions that execute flow control statements
const flowControlMap = {
  'repeat ${x} times': repeatXTimes,
  'repeat ${x} times with index ${index}': repeatXTimesWithIndex,
  'for each line of file ${filename}': forEachLineOfFile,
  'for each line of string ${string}': forEachLineOfString,
  'try': tryCatch,
  'if ${condition}': ifCondition,
  'while ${condition}': whileCondition,
  'for each ${itemVariable} in ${listVariable}': forEachItemInList,
} as Record<
  string,
  (
    args: Record<string, string>,
    runSequence: () => Promise<CommandResult[]>,
    runAlternativeSequence: () => Promise<CommandResult[]>
  ) => Promise<CommandResult[]>
>;

export function getAllFlowControlFormats(): string[] {
  return Object.keys(flowControlMap);
}

export function getFlowControlFromFormat(format: string): Command {
  if (flowControlMap[format]) {
    return {
      format,
      type: CommandType.Flow,
      flowControl: flowControlMap[format],
    };
  }

  return {
    format,
    type: CommandType.Function,
  };
}

export function expandVariables(str: string): string {
  return str.replace(/\$\{(\w+)\}/g, (match, variableName) => {
    const value = store.getValue(variableName);
    return value !== undefined ? String(value) : match;
  });
}


export async function ifCondition(
  args: Record<string, string>,
  runSequence: () => Promise<CommandResult[]>,
  runAlternativeSequence: () => Promise<CommandResult[]>
): Promise<CommandResult[]> {
  if (!args.condition) {
    return [
      {
        success: false,
        message: 'No condition provided',
      },
    ];
  }

  const conditionStr = expandVariables(args.condition);

  let conditionResult;
  try {
    conditionResult = evaluate(conditionStr);
  } catch (e: any) {
    return [
      {
        success: false,
        message: `Failed to evaluate condition: ${conditionStr} with error ${e.message}`,
      },
    ];
  }

  if (conditionResult) {
    return [
      {
        success: true,
        message: `Condition "${conditionStr}" is true`
      },
      ...await runSequence()
    ];
  } else if (runAlternativeSequence) {
    return [
      {
        success: true,
        message: `Condition "${conditionStr}" is false`
      },
      ...await runAlternativeSequence()
    ];
  }
  return [ 
    { 
      success: true,
      message: `Condition "${conditionStr}" is false`
    },
   ] as CommandResult[];
}

export async function whileCondition(
  args: Record<string, string>,
  runSequence: () => Promise<CommandResult[]>,
  _: () => Promise<CommandResult[]>
): Promise<CommandResult[]> {
  if (!args.condition) {
    return [
      {
        success: false,
        message: 'No condition provided',
      },
    ];
  }

  const conditionTemplate = args.condition;

  let results: CommandResult[] = [];
  while (true) {
    const conditionStr = expandVariables(conditionTemplate);

    let conditionResult;
    try {
      conditionResult = evaluate(conditionStr);
    } catch (e: any) {
      return [
        {
          success: false,
          message: `Failed to evaluate condition: ${conditionStr} with error ${e.message}`,
        },
      ];
    }

    // Ensure conditionResult is a boolean
    if (typeof conditionResult !== 'boolean') {
      // For comparison operations, mathjs should return a boolean.
      // If it doesn't, we can convert numbers to booleans (0 => false, non-zero => true)
      conditionResult = Boolean(conditionResult);
    }

    if (!conditionResult) {
      return [
        {
          success: true,
          message: `Condition "${conditionStr}" is false`
        },
      ];
    }

    results = await runSequence();
    if (results.length && !results[results.length-1].success) return results;
  }
}

export async function forEachItemInList(
  args: Record<string, string>,
  runSequence: () => Promise<CommandResult[]>,
  runAlternativeSequence: () => Promise<CommandResult[]>
): Promise<CommandResult[]> {
  if (!args.listVariable || !args.itemVariable) {
    return [
      {
        success: false,
        message: 'No list variable or item variable provided',
      },
    ];
  }

  const listStr = store.getValue(args.listVariable);
  if (!listStr) {
    return [
      {
        success: false,
        message: `Variable ${args.listVariable} not found`,
      },
    ];
  }

  const items = listStr.split(',').map((item: string) => item.trim());

  let results: CommandResult[] = [];
  for (const item of items) {
    store.addKeyValueToStore(args.itemVariable, item);
    results = await runSequence();
    if (results.length && !results[results.length-1].success) return results;
  }

  return results; // returns the last result
}

export async function repeatXTimes(args: Record<string, string>, runSequence: () => Promise<CommandResult[]>, runAlternativeSequence: () => Promise<CommandResult[]>): Promise<CommandResult[]> {
  if (!args.x || isNaN(Number(args.x))) {
    return [
      {
        success: false,
        message: `Invalid number of times to repeat, x=${args.x}`,
      },
    ];
  }

  const x = Number(args.x);

  let results: CommandResult[] = [];
  for (let i = 0; i < x; i++) {
    results = await runSequence();
    if (results.length && !results[results.length-1].success) return results;
  }

  return results; // returns the last result
}

export async function repeatXTimesWithIndex(args: Record<string, string>, runSequence: () => Promise<CommandResult[]>, runAlternativeSequence: () => Promise<CommandResult[]>): Promise<CommandResult[]> {
  if (!args.x || isNaN(Number(args.x))) {
    return [
      {
        success: false,
        message: `Invalid number of times to repeat, x=${args.x}`,
      },
    ];
  }

  if (!args.index) {
    return [
      {
        success: false,
        message: `No index variable name provided`,
      },
    ];
  }

  const x = Number(args.x);

  let results: CommandResult[] = [];
  for (let i = 0; i < x; i++) {
    store.addKeyValueToStore(args.index, i.toString());
    results = await runSequence();
    if (results.length && !results[results.length-1].success) return results;
  }

  return results; // returns the last result
}

export async function tryCatch(args: Record<string, string>, runSequence: () => Promise<CommandResult[]>, runAlternativeSequence: () => Promise<CommandResult[]>): Promise<CommandResult[]> {
  let results: CommandResult[] = [];
  try {
    results = await runSequence();
    if (results.length && !results[results.length-1].success) throw (results[results.length-1].message);
    return results;
  } catch (e: any) {
    logger.log('Caught failed sequence, running alternative sequence');
    return [
      {
        success: true,
        message: `Caught failed sequence: ${e.message}`
      },
      ...await runAlternativeSequence(),
    ]
  }
}

export async function forEachLineOfFile(args: Record<string, string>, runSequence: () => Promise<CommandResult[]>, runAlternativeSequence: () => Promise<CommandResult[]>): Promise<CommandResult[]> {
  if (!args.filename) {
    return [
      {
        success: false,
        message: `No filename specified`,
      },
    ];
  }

  const filename = args.filename;

  if (!fs.existsSync(filename)) {
    return [
      {
        success: false,
        message: `File not found, filename=${filename}`
      },
    ];
  }

  const fileData = fs.readFileSync(filename, 'utf8');
  const lines = fileData.split('\n');
  let results: CommandResult[] = [];
  for (let lineOfFile of lines) {
    if (!/\S/.test(lineOfFile)) continue
    store.addKeyValueToStore('lineOfFile', lineOfFile);
    results = await runSequence();
    if (results.length && !results[results.length-1].success) return results;
  }

  return results; // returns the last result
}

export async function forEachLineOfString(args: Record<string, string>, runSequence: () => Promise<CommandResult[]>, runAlternativeSequence: () => Promise<CommandResult[]>): Promise<CommandResult[]> {
  if (!args.string) {
    return [
      {
        success: false,
        message: `No string specified`,
      },
    ];
  }

  const lines = args.string.split('\n');
  let results: CommandResult[] = [];
  for (let lineOfFile of lines) {
    store.addKeyValueToStore('lineOfFile', lineOfFile);
    results = await runSequence();
    if (results.length && !results[results.length-1].success) return results;
  }

  return results; // returns the last result
}