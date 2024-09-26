import config from "./config";

import { 
  FunctionDefinition,
  FunctionCall,
  Message,
  MessageOptions,
} from './languageModelTypes';


import { callFunctionAnthropic, createMessageAnthropic } from "./anthropic";
import { callFunctionOpenAI, createMessageOpenAI } from "./openai";

export async function createMessage(systemMessage: string, messages: Message[], options: MessageOptions = { maxTokens: 1024, temperature: 0.7 }): Promise<string> {
  const modelProvider = config.getConfigurationSetting('modelProvider');
  if (modelProvider === 'openai') {
    return await createMessageOpenAI(systemMessage, messages, options);
  } else {
    return await createMessageAnthropic(systemMessage, messages, options);
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