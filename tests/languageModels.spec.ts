// tests/languageModels.test.ts

import { exec } from 'child_process';
import { 
  FunctionDefinition,
  Message,
} from '../src/languageModelTypes';
import { createMessage, callFunction } from "../src/languageModels";
import { promptCreatePlan } from "../src/taskPrompts";
import config from '../src/config';

jest.setTimeout(100000); // 100 seconds

// Define model providers and their test status
// Set to true/false to skip these tests
const modelProviders = [
  { name: 'anthropic', isActive: false },
  { name: 'openai', isActive: false },
];

// Common constants
const SYSTEM_MESSAGE = 'You are a pirate.';
const USER_QUESTION = 'What is the best way to build a website?';
const DESCRIPTION = 'I need to create a plan to build a website for my business.';
const ALL_RELEVANT_COMMANDS = [
  'browser:goto ${url}',
  'browser:scrape ${javascript}',
  'browser:parse dom',
  'google ${question}',
  'create a spreadsheet called ${name} that contains ${prompt}',
  'generate text ${prompt}',
  'fetch url ${url} into ${variableName}',
  'store ${key} ${value}',
  'write ${variableName} to file ${filePath}',
  'read file ${filePath} into ${variableName}',
  'generate and type ${prompt}'
];

// Define the function definition outside the tests to avoid duplication
const FUNCTION_DEFINITION: FunctionDefinition = {
  name: 'createPlan',
  description: "The createPlan tool transforms a user-provided task description into a well-defined, actionable objective statement and a concise task plan name. This tool is designed to standardize task definitions, making them clear and executable for both human users and automated systems. It analyzes the user's input, extracts the core purpose, and formulates a structured output that can be easily integrated into task management systems or automation platforms.",
  properties: {
    objective: {
      type: 'string',
      description: "A clear, actionable statement that defines the plan's goal. This statement is formulated to be specific, measurable, achievable, relevant, and time-bound (if applicable). It provides a comprehensive understanding of what needs to be accomplished, serving as a guide for plan execution.",
    },
    name: {
      type: 'string',
      description: "A short, descriptive identifier for the plan. This concise name captures the essence of the plan in a few words, making it easily recognizable and referenceable. It's designed to be memorable and suitable for use in plan lists, project management tools, or when invoking the plan in automated systems.",
    },
    additionalInfoNeeded: {
      type: 'string',
      description: "Provide a summary of any additional information required to refine the objective statement, otherwise, leave this field empty.",
    },
  },
  required: ['objective', 'name'],
};

// Helper function to create a user message
const createUserMessage = (description: string, commands: string[]): Message => ({
  role: 'user',
  content: promptCreatePlan(description, commands),
});

describe('Language Models', () => {
  // Iterate over each model provider
  modelProviders.forEach(({ name, isActive }) => {
    // Conditionally skip tests if the provider is inactive
    const describeFn = isActive ? describe : describe.skip;

    describeFn(`${name}`, () => {
      beforeEach(() => {
        config.setConfigurationSetting('modelProvider', name);
      });

      describe('createMessage', () => {
        it('should create a message successfully', async () => {
          const messages: Message[] = [
            {
              role: 'user',
              content: USER_QUESTION,
            },
          ];
          const result = await createMessage(SYSTEM_MESSAGE, messages);
          console.log(result);
          expect(result).toBeDefined();
        });
      });

      describe('callFunction', () => {
        it('should call the function successfully', async () => {
          const userMessage = createUserMessage(DESCRIPTION, ALL_RELEVANT_COMMANDS);
          const functionCall = await callFunction('', [userMessage], [FUNCTION_DEFINITION], FUNCTION_DEFINITION.name);

          expect(functionCall).toBeDefined();
          expect(functionCall.name).toBe('createPlan');
          expect(functionCall.input.objective).toBeDefined();
          expect(functionCall.input.name).toBeDefined();
          console.log(JSON.stringify(functionCall, null, 2));
        });
      });
    });
  });
});
