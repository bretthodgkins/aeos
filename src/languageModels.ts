import config from "./config";

import { 
  FunctionDefinition,
  FunctionCall,
  Message,
} from './languageModelTypes';


import { callFunctionAnthropic, createMessageAnthropic } from "./anthropic";
import { callFunctionOpenAI, createMessageOpenAI } from "./openai";

export async function createMessage(systemMessage: string, messages: Message[]): Promise<string> {
  const modelProvider = config.getConfigurationSetting('modelProvider');
  if (modelProvider === 'openai') {
    console.log('Using OpenAI');
    return await createMessageOpenAI(systemMessage, messages);
  } else {
    console.log('Using Anthropic');
    return await createMessageAnthropic(systemMessage, messages);
  }
}

export async function callFunction(systemMessage: string, messages: Message[], functionDefinitions: FunctionDefinition[], forceToolUse?: string): Promise<FunctionCall> {
  const modelProvider = config.getConfigurationSetting('modelProvider');
  if (modelProvider === 'openai') {
    console.log('Using OpenAI');
    return callFunctionOpenAI(systemMessage, messages, functionDefinitions, forceToolUse);
  } else {
    console.log('Using Anthropic');
    return callFunctionAnthropic(systemMessage, messages, functionDefinitions, forceToolUse);
  }
}