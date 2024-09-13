import OpenAI from "openai";
const JSON5 = require('json5')

import { CommandExample } from './commandTypes';
import logger from "./logger";


const openai = new OpenAI({
    organization: process.env.OPENAI_ORG_ID,
    apiKey: process.env.OPENAI_API_KEY,
});

const commandPromptTemplate = `
Determine which command to run, and which arguments to provide, based on an input prompt and a list of available commands.

Do not suggest any commands that aren't listed below. Response must be in a valid JSON5 format on a single line of text.

Available Commands:
$AVAILABLE_COMMANDS`;

export function convertExamplesToChatCompletionMessages(examples: CommandExample[]): OpenAI.Chat.CreateChatCompletionRequestMessage[] {
  return examples.reduce((acc: OpenAI.Chat.CreateChatCompletionRequestMessage[], example: CommandExample) => {
    const messages = [
      {
        role: 'user',
        content: example.prompt,
      },
      {
        role: 'assistant',
        content: JSON5.stringify(example.output, undefined, undefined, { quote: "'", quoteKeys: false }),
      },
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    return acc.concat(messages);
  }, []);
}

export async function findCommandGPT(input: string, availableCommands: string[], examples: CommandExample[]): Promise<string[]> {
  const systemMessage = commandPromptTemplate.replace('$AVAILABLE_COMMANDS', availableCommands.join('\n'));
  const messages = [
    {
      role: 'system',
      content: systemMessage,
    },
    ...convertExamplesToChatCompletionMessages(examples),
    {
      role: 'user',
      content: 'This is an invalid command that doesnt exist',
    },
    {
      role: 'assistant',
      content: `[]`,
    },
    {
      role: 'user',
      content: input,
    },
  ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

  const output = await createChatCompletion(messages, 400, 0);
  if (output === '') return [];
  let commandStrings: string[];
  try {
    commandStrings = JSON5.parse(output) as string[];
  } catch(e) {
    logger.log(`Error parsing output: ${e}`);
    return [];
    // logger.log(`Attempting to fix invalid JSON...`);
    // const fixedJSONString = await textCompletion.fixInvalidJSON(output);
    // commandStrings = JSON5.parse(fixedJSONString) as string[];
    // return commandStrings;
  }
  if (!commandStrings.length) {
    logger.log(`Could not identify suitable commands for input: ${input}`);
    return [];
  }

  return commandStrings;
}

export async function createChatCompletion(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], maxTokens?: number, temperature?: number): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: maxTokens ? maxTokens : 400,
        temperature: temperature ? temperature : 0,
      });
  
      if (!response) {
        logger.log(`Unable to connect to OpenAI`);
        return '';
      }

      const message = response.choices[0].message?.content;

      if (!message) {
        logger.log(`Unable to connect to OpenAI`);
        return '';
      }

      return message.trim();
    } catch (e: any) {
      logger.log(`Unable to connect to OpenAI: ${e.message}`);
      return '';
    }
  }

export async function getChatCompletion(prompt: string, maxTokens: number, temperature: number): Promise<string> {
  logger.log(`Request: ${prompt} ${maxTokens} ${temperature}`);

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{"role": "user", "content": prompt}],
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const outputString =  chatCompletion.choices[0].message.content as string;
    logger.log(`Response: ${outputString}`);
    return outputString;
  } catch (e: any) {
    logger.log(`Unable to connect to OpenAI: ${e.message}`);
    return '';
  }
}
