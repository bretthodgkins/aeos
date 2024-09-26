import Anthropic from '@anthropic-ai/sdk';
import assert from 'node:assert';

import { 
  FunctionDefinition,
  FunctionCall,
  Message,
  MessageOptions,
} from './languageModelTypes';

const client = new Anthropic(); // gets API Key from environment variable ANTHROPIC_API_KEY

async function createMessages(messages: Message[]) {
  return messages.map((message) => {
    return {
      role: message.role,
      content: message.content,
    } as Anthropic.MessageParam;
  });
}

async function createTools(functionDefinitions: FunctionDefinition[]) {
  return functionDefinitions.map((functionDefinition) => {
    return {
      name: functionDefinition.name,
      description: functionDefinition.description,
      input_schema: {
        type: 'object',
        properties: functionDefinition.properties,
      },
    } as Anthropic.Tool;
  });
}

export async function createMessageAnthropic(systemMessage: string, messages: Message[], options: MessageOptions): Promise<string> {
  const anthropicMessages = await createMessages(messages);
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    system: systemMessage,
    messages: anthropicMessages,
  }) as any;

  return message.content[0].text;
}

export async function callFunctionAnthropic(systemMessage: string, messages: Message[], functionDefinitions: FunctionDefinition[], forceToolUse?: string): Promise<FunctionCall> {
  const anthropicMessages = await createMessages(messages);
  const anthropicTools = await createTools(functionDefinitions);
  let toolChoice = { type: 'auto' } as any;
  if (forceToolUse) {
    toolChoice = { type: 'tool', name: forceToolUse};
  }
  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20240620',
    max_tokens: 1024,
    system: systemMessage,
    messages: anthropicMessages,
    tools: anthropicTools,
    tool_choice: toolChoice,
  });

  assert(message.stop_reason === 'tool_use');

  const tool = message.content.find(
    (content): content is Anthropic.ToolUseBlock => content.type === 'tool_use',
  );
  assert(tool);

  return {
    name: tool.name,
    input: tool.input,
  } as FunctionCall;
}
