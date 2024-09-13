import { Configuration, OpenAIApi } from "openai";
const JSON5 = require('json5')

import logger from "./logger";
import notifications from './notifications';

export type GPTResponse = {
  output: string;
}

const configuration = new Configuration({
    organization: process.env.OPENAI_ORG_ID,
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const commandPromptTemplate = `
Determine which command to run, and which arguments to provide, based on an input prompt and a list of available commands.

Do not suggest any commands that aren't listed below.

Available Commands:
$AVAILABLE_COMMANDS

Example:
Prompt: 'Can you please move my mouse to the top left corner of the screen'
Response: ['move mouse to coordinates 0 0']

Prompt: 'Can you please click on the spotify icon wait 1 second and then click on the play button'
Response: ['move mouse to image spotify-icon', 'click', 'wait 1 seconds', 'move mouse to image play-button', 'click']

Prompt: 'move the cursor to right by 100 pixels and push a notification that says successfully completed task'
Response: ['move mouse right 100', 'notification "Aeos" "Successfully completed task"']

Prompt: 'create a task to write story about a space cat'
Response: ['create task to write a story about a space cat']

Prompt: 'Unpeel my banana for me'
Response: []

Prompt: '$PROMPT'
Response:`;

const fixJSONPromptTemplate = `
Fix invalid JSON5 strings

Example:
Prompt: ["notification "Aeos" "Successfully completed task""]
Response: ['notification "Aeos" "Successfully completed task"']

Prompt: ['notification "Aeos" "Can't complete task"']
Response: ['notification "Aeos" "Can\'t complete task"']

Prompt: $PROMPT
Response:`;

const convertPromptTemplate = `
Example Input:
$EXAMPLE_INPUT

Example Output:
$EXAMPLE_OUTPUT

Input:
$INPUT

Output:`;

const questionAnswerPromptTemplate = `
Reference Material: $REFERENCE_MATERIAL

Q: $QUESTION
A:`;

export async function findCommandGPT(input: string, availableCommands: string[]): Promise<string[]> {
  logger.log(`Request: ${input}`);

  let prompt = commandPromptTemplate.replace('$PROMPT', input).replace('$AVAILABLE_COMMANDS', availableCommands.join('\n'));
  // logger.log(`Prompt: ${prompt}`);

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt,
    max_tokens: 400,
    temperature: 0,
    stop: ["\n"],
  }).catch((e) => {
    throw new Error(`Unable to connect to OpenAI: ${e.message}`);
  });
  if (!response) return [];
  // @ts-ignore
  let outputString = response.data.choices[0].text?.trim();
  logger.log(`Response: ${outputString}`);
  if (!outputString) return [];
  let commandStrings: string[];
  try {
    commandStrings = JSON5.parse(outputString) as string[];
  } catch(e) {
    logger.log(`Error parsing output: ${e}`);
    logger.log(`Attempting to fix invalid JSON...`);
    const fixedJSONString = await fixInvalidJSON(outputString);
    commandStrings = JSON5.parse(fixedJSONString) as string[];
    return commandStrings;
  }
  if (!commandStrings.length) {
    logger.log(`Could not identify suitable commands for input: ${input}`);
    return [];
  }

  return commandStrings;
}

export async function generateText(prompt: string, maxTokens: number, temperature: number): Promise<string> {
  logger.log(`Request: ${prompt} ${maxTokens} ${temperature}`);

  try {
    const response = await openai.createCompletion({
      model: "gpt-4o-mini",
      prompt: prompt,
      max_tokens: maxTokens,
      temperature: temperature,
    });
    logger.log(JSON.stringify(response.data, null, 2));

    const outputString = response.data.choices[0].text as string;
  logger.log(`Response: ${outputString}`);
    return outputString;
  } catch (e: any) {
    logger.log(`Unable to connect to OpenAI: ${e.message}`);
    return '';
  }
}

export async function generateQuestionAnswer(question: string, referenceMaterial: string, maxTokens: number, temperature: number): Promise<string> {
  logger.log(`Request: ${question} ${maxTokens} ${temperature}`);

  let prompt = questionAnswerPromptTemplate.replace('$REFERENCE_MATERIAL', referenceMaterial).replace('$QUESTION', question);

  try {
    logger.log(`Request: ${prompt} ${maxTokens} ${temperature}`);
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 100,
      temperature: 0.3,
    });
    logger.log(JSON.stringify(response.data, null, 2));

    const outputString = response.data.choices[0].text as string;
    logger.log(`Response: ${outputString}`);
    return outputString;
  } catch (e: any) {
    logger.log(`Unable to connect to OpenAI: ${e.message}`);
    logger.log(e);
    return '';
  }
}

export async function convertStrings(examples: Record<string,string>, strings: string[]): Promise<string[]> {
  const uniqueValues = [...new Set(strings)];

  // loop through uniqueValues in chunks to ensure we don't send too large prompts
  const chunkSize = 10;
  const chunks = [];
  for (let i = 0; i < uniqueValues.length; i += chunkSize) {
    chunks.push(uniqueValues.slice(i, i + chunkSize));
  }

  let conversionMap = {} as Record<string, string>;

  // iterate chunks with index
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkMap = await convertStringsChunk(examples, chunk);
    conversionMap = { ...conversionMap, ...chunkMap };
    if (i < chunks.length - 1) {
      const percentComplete = Math.floor((chunkSize * (i + 1)) / uniqueValues.length * 100);
      notifications.push('Converting Clipboard', `${percentComplete}% complete`);
    }
  }

  return strings.map((value) => conversionMap[value] || value);
}

export async function convertStringsChunk(examples: Record<string,string>, inputs: string[]): Promise<Record<string,string>> {
  const exampleInput = Object.keys(examples).join('\n');
  const exampleOutput = JSON.stringify(examples, null, 2);

  logger.log(`Converting ${inputs.length} lines of input...`);

  const prompt = convertPromptTemplate.replace('$EXAMPLE_INPUT', exampleInput)
    .replace('$EXAMPLE_OUTPUT', exampleOutput)
    .replace('$INPUT', inputs.join('\n'));

  logger.log(prompt);

  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 2000,
      temperature: 0,
      stop: ["\n\n"],
    });

    const outputString = response.data.choices[0].text as string;

    logger.log(outputString);

    const outputJSON = JSON.parse(outputString, (key, value) => {
      if (typeof value === 'string') {
        return value.trim();
      }
      return value;
    });
    return outputJSON;
  } catch (e: any) {
    logger.log(`Unable to connect to OpenAI: ${e.message}`);
    throw e;
  }
}

export async function fixInvalidJSON(invalidJSONString: string): Promise<string> {
  const prompt = fixJSONPromptTemplate.replace('$PROMPT', invalidJSONString);

  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: prompt,
    max_tokens: 400,
    temperature: 0,
    stop: ["\n\n"],
  }).catch((e) => {
    throw new Error('No response from OpenAI');
  });
  if (!response) throw new Error('No response from OpenAI');

  const outputString = response.data.choices[0].text?.trim();
  if (!outputString) throw new Error('No output from OpenAI');
  try {
    logger.log(`Attempted fix: ${outputString}`)
    let result = JSON5.parse(outputString) as string[];
    return outputString;
  } catch (e) {
    throw new Error('Unable to fix invalid JSON');
  }
}