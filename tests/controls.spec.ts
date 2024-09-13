import { 
  consoleLog,
  generateText,
  waitInSeconds,
} from '../src/controls';

import store from '../src/store';
import logger from '../src/logger';
import { getChatCompletion } from '../src/chatCompletion';

jest.mock('../src/chatCompletion');
jest.useFakeTimers();

describe('generateText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // store.clearStore(); // Assuming you have a method to clear the store
  });

  it('should return failure when no prompt is provided', async () => {
    const args = {};
    const result = await generateText(args);
    expect(result).toEqual({
      success: false,
      message: 'No prompt provided',
    });
  });

  it('should generate text and store the result when prompt is provided', async () => {
    const args = { prompt: 'Hello, world!' };
    const mockResponse = 'Generated response\nwith new lines';

    (getChatCompletion as jest.Mock).mockResolvedValue(mockResponse);

    const result = await generateText(args);

    expect(getChatCompletion).toHaveBeenCalledWith(args.prompt, 2000, 0.3);
    expect(result).toEqual({ success: true });
    const storedValue = store.getValue('lastGeneratedText');
    expect(storedValue).toBe('Generated response\\nwith new lines');
  });

  it('should use default temperature and maxTokens when not provided', async () => {
    const args = { prompt: 'Test prompt' };
    (getChatCompletion as jest.Mock).mockResolvedValue('Response');

    await generateText(args);

    expect(getChatCompletion).toHaveBeenCalledWith(args.prompt, 2000, 0.3);
  });

  it('should use provided temperature and maxTokens', async () => {
    const args = {
      prompt: 'Test prompt',
      temperature: '0.7',
      maxTokens: '1500',
    };
    (getChatCompletion as jest.Mock).mockResolvedValue('Response');

    await generateText(args);

    // Note: Based on your current implementation, temperature and maxTokens are not used.
    // Assuming you update the function to use these variables:
    expect(getChatCompletion).toHaveBeenCalledWith(
      args.prompt,
      Number(args.maxTokens),
      Number(args.temperature)
    );
  });
});

describe('consoleLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return failure when no log is provided', async () => {
    const args = {};
    const result = await consoleLog(args);
    expect(result).toEqual({
      success: false,
      message: 'No log provided',
    });
  });

  it('should log the message and return success when log is provided', async () => {
    const args = { log: 'Hello, world!' };
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await consoleLog(args);

    expect(consoleSpy).toHaveBeenCalledWith('Hello, world!');
    expect(result).toEqual({ success: true });

    consoleSpy.mockRestore();
  });

  it('should replace \\n with actual newlines in the log message', async () => {
    const args = { log: 'Line1\\nLine2\\nLine3' };
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const result = await consoleLog(args);

    expect(consoleSpy).toHaveBeenCalledWith('Line1\nLine2\nLine3');
    expect(result).toEqual({ success: true });

    consoleSpy.mockRestore();
  });
});

describe('waitInSeconds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return failure when no duration is provided', async () => {
    const args = {};
    const result = await waitInSeconds(args);
    expect(result).toEqual({
      success: false,
      message: 'No valid duration provided',
    });
  });

  it('should return failure when duration is not a valid number', async () => {
    const args = { duration: 'abc' };
    const result = await waitInSeconds(args);
    expect(result).toEqual({
      success: false,
      message: 'No valid duration provided',
    });
  });

  it('should wait for the specified duration and return success', async () => {
    const args = { duration: '5' };
    const loggerSpy = jest.spyOn(logger, 'log').mockImplementation();

    const waitPromise = waitInSeconds(args);

    // Fast-forward time by 5 seconds
    jest.advanceTimersByTime(5000);

    const result = await waitPromise;

    expect(loggerSpy).toHaveBeenCalledWith('Finished waiting');
    expect(result).toEqual({ success: true });

    loggerSpy.mockRestore();
  });

  it('should handle fractional durations', async () => {
    const args = { duration: '2.5' };
    const loggerSpy = jest.spyOn(logger, 'log').mockImplementation();

    const waitPromise = waitInSeconds(args);

    // Fast-forward time by 2.5 seconds
    jest.advanceTimersByTime(2500);

    const result = await waitPromise;

    expect(loggerSpy).toHaveBeenCalledWith('Finished waiting');
    expect(result).toEqual({ success: true });

    loggerSpy.mockRestore();
  });
});
