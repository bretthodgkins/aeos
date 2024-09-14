import { exec } from 'child_process';
import { 
  FunctionDefinition,
  Message,
} from '../src/languageModelTypes';

import { createMessage, callFunction } from "../src/languageModels";

import { promptCreatePlan, promptCreateSubtasks, promptFindCommandsRelevantToObjective } from "../src/taskPrompts";
import config from '../src/config';

jest.setTimeout(100000); // 100 seconds


describe('Language Models', () => {
  describe('Anthropic', () => {
    beforeEach(() => {
      config.setConfigurationSetting('modelProvider', 'anthropic');
    });

    it('createMessage', async () => {
      const systemMessage = 'You are a pirate.';
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What is the best way to build a website?',
        },
      ];
      const result = await createMessage(systemMessage, messages);
      console.log(result);
      expect(result).toBeDefined();
    });

    it('callFunction', async () => {
      const description = 'I need to create a plan to build a website for my business.';
      const allRelevantCommands = [
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
      const functionDefinition: FunctionDefinition = {
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
      const userMessage: Message = {
        role: 'user',
        content: promptCreatePlan(description, allRelevantCommands),
      };
      const functionCall = await callFunction('', [userMessage], [functionDefinition], functionDefinition.name);

      expect(functionCall).toBeDefined();

      expect(functionCall.name).toBe('createPlan');
      expect(functionCall.input.objective).toBeDefined();
      expect(functionCall.input.name).toBeDefined();
      // expect(functionCall.input.additionalInfoNeeded).toBeDefined();
      console.log(JSON.stringify(functionCall, null, 2));
    });
  });

  describe('OpenAI', () => {
    beforeEach(() => {
      config.setConfigurationSetting('modelProvider', 'openai');
    });

    xit('createMessage', async () => {
      const systemMessage = 'You are a pirate.';
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What is the best way to build a website?',
        },
      ];
      const result = await createMessage(systemMessage, messages);
      console.log(result);
      expect(result).toBeDefined();
    });

    xit('callFunction', async () => {
      const description = 'I need to create a plan to build a website for my business.';
      const allRelevantCommands = [
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
      const functionDefinition: FunctionDefinition = {
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
      const userMessage: Message = {
        role: 'user',
        content: promptCreatePlan(description, allRelevantCommands),
      };
      const functionCall = await callFunction('', [userMessage], [functionDefinition], functionDefinition.name);

      expect(functionCall).toBeDefined();

      expect(functionCall.name).toBe('createPlan');
      expect(functionCall.input.objective).toBeDefined();
      expect(functionCall.input.name).toBeDefined();
      // expect(functionCall.input.additionalInfoNeeded).toBeDefined();
      console.log(JSON.stringify(functionCall, null, 2));
    });
  });
});