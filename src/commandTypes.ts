export enum CommandType {
  Flow = 'flow', // a control flow statement (if, while, etc.)
  Function = 'function', // a single function call (mouse, keyboard, etc.)
  Sequence = 'sequence', // a sequence of commands to execute (typically imported from file)
}

// A CommandInput is an input received from the user that can be either a string or a FlowCommandInput
export type CommandInput = string | FlowCommandInput;

// A FlowCommandInput is a command that contains a sequence of commands to execute via a specified flow control
export type FlowCommandInput = {
  command: string;
  sequence: CommandInput[];
  alternativeSequence?: CommandInput[];
} 

// A command definition
export type Command = {
  format: string;
  description?: string;
  type: CommandType;
  function?: (...args: any[]) => any;
  flowControl?: (args: Record<string, string>, runSequence: () => Promise<CommandResult[]>, runAlternativeSequence: () => Promise<CommandResult[]>) => Promise<CommandResult[]>;
  sequence?: CommandInput[];
  alternativeSequence?: CommandInput[]; // used in if-else and try-catch blocks
  requiresApplication?: string; // Application name of active window, or "browser" for Chromium
  requiresExactMatch?: boolean; // Whether the command requires an exact match to the format string
  examples?: CommandExample[];
}

export type CommandExample = {
  prompt: string;
  output: string[];
}

// A command with arguments that is ready to be executed
export type CommandExecutable = {
  command: Command;
  args: Record<string, string>;
  commandInput: CommandInput;
}

export type CommandResult = {
  success: boolean;
  message?: string;
}

export function getCommandInputString(commandInput: CommandInput): string {
  if (typeof commandInput === 'string') {
    return commandInput;
  }
  return commandInput.command;
}

export function setCommandInputString(commandInput: CommandInput, newValue: string): CommandInput {
  if (typeof commandInput === 'string') {
    return newValue;
  }
  return {
    command: newValue,
    sequence: commandInput.sequence,
    alternativeSequence: commandInput.alternativeSequence,
  }
}
