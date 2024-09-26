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
    return await createMessageOpenAI(systemMessage, messages);
  } else {
    return await createMessageAnthropic(systemMessage, messages);
  }
}

export async function callFunction(systemMessage: string, messages: Message[], functionDefinitions: FunctionDefinition[], forceToolUse?: string): Promise<FunctionCall> {
  const modelProvider = config.getConfigurationSetting('modelProvider');
  if (modelProvider === 'openai') {
    return callFunctionOpenAI(systemMessage, messages, functionDefinitions, forceToolUse);
  } else {
    return callFunctionAnthropic(systemMessage, messages, functionDefinitions, forceToolUse);
  }
}