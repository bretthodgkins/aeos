import OpenAI from "openai";
import assert from 'node:assert';

import { 
  FunctionDefinition,
  FunctionCall,
  Message,
} from './languageModelTypes';

const openai = new OpenAI({
    organization: process.env.OPENAI_ORG_ID,
    apiKey: process.env.OPENAI_API_KEY,
});

function createMessages(messages: Message[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[]
{
  return messages.map((message) => {
    return {
      role: message.role,
      content: message.content,
    } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
  });
}

function createTools(functionDefinitions: FunctionDefinition[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return functionDefinitions.map((functionDefinition) => {
    return {
        "type": "function",
        "function": {
          "name": functionDefinition.name,
          "description": functionDefinition.description,
          "parameters": {
            "type": "object",
            "properties": functionDefinition.properties,
            "required": functionDefinition.required,
          },
        },
    } as OpenAI.Chat.Completions.ChatCompletionTool;
  });
}

export async function createMessageOpenAI(systemMessage: string, messages: Message[]): Promise<string> {
  const systemMessageParam = {
    role: 'system',
    content: systemMessage,
  } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
  const openAIMessages = createMessages(messages);
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [systemMessageParam, ...openAIMessages],
    max_tokens: 1024,
  });

  return chatCompletion.choices[0].message.content as string;
}

export async function callFunctionOpenAI(systemMessage: string, messages: Message[], functionDefinitions: FunctionDefinition[], forceToolUse?: string): Promise<FunctionCall> {
  const systemMessageParam = {
    role: 'system',
    content: systemMessage,
  } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
  const openAIMessages = createMessages(messages);
  const tools = createTools(functionDefinitions); 

  const message = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [systemMessageParam, ...openAIMessages],
    tools: tools,
    tool_choice: forceToolUse ? tools[0] : 'auto',
  });

  console.log(message);
  assert(message.choices[0].finish_reason === 'function_call' || message.choices[0].finish_reason === 'stop');

  const toolCalls = message.choices[0].message.tool_calls;
  if (!toolCalls) {
    throw new Error('No tool calls found');
  }
  const toolCall = toolCalls[0];
  const args = JSON.parse(toolCall.function.arguments);
  return {
    name: toolCall.function.name,
    input: args
  };
}
