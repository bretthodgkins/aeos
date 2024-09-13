import OpenAI from 'openai';
import { findCommandGPT, createChatCompletion } from '../src/chatCompletion';
import { getAllCommandExamples, getAllSearchableCommandFormats } from '../src/commands';

jest.setTimeout(100000); // 100 seconds

describe('chat completions', () => {
  it('can get chat response', async () => {
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant',
      },
      {
        role: 'user',
        content: 'Who won the world series in 2020?',
      },
      {
        role: 'assistant',
        content: 'The Los Angeles Dodgers won the world series in 2020.',
      },
      {
        role: 'user',
        content: 'Where was it played?',
      },
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    const output = await createChatCompletion(messages);
    console.log(output);
  });
});

describe('find commands', () => {
  xit('can find valid commands - tricky with quotes', async () => {
    const commandInputString = `write a poem about a space cat and then print this out`;
    const output = await findCommandGPT(commandInputString, getAllSearchableCommandFormats(), getAllCommandExamples());
    console.log(output);
    expect(output[0]).toBe('generate text "write a poem about a space cat"');
    expect(output[1]).toBe('console log ${lastGeneratedText}');
  });
});
