import {
  generateText,
  consoleLog,
  waitInSeconds,
  waitInMilliseconds,
  pushNotification,
  writeToFile,
  appendToFile,
  storeKeyValue,
  downloadFromURL,
  readFromFile,
  fetchUrlContent,
  calculateExpression,
  listFilesInDirectory,

} from '../src/controls';

import store from '../src/store';
import logger from '../src/logger';
import notifications from '../src/notifications';
import { getChatCompletion } from '../src/chatCompletion';
import { CommandResult } from '../src/commandTypes';

import fs from 'fs';
import path from 'path';
import { evaluate } from 'mathjs';

jest.mock('../src/chatCompletion');
jest.mock('../src/logger');
jest.mock('../src/notifications');

jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    createWriteStream: jest.fn(),
    promises: {
      ...originalFs.promises,
      writeFile: jest.fn(),
    },
  };
});


jest.mock('request', () => jest.fn());
const request = require('request') as jest.MockedFunction<
  (url: string, callback: (error: any, response: any, body: any) => void) => void
>;

jest.mock('mathjs', () => ({
  evaluate: jest.fn(),
}));

jest.useFakeTimers();

describe('Controls Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store if necessary
    // store.clearStore(); // Assuming you have a clearStore method
  });

  describe('generateText', () => {
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

  describe('waitInMilliseconds', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return failure when no duration is provided', async () => {
      const args = {};
      const result = await waitInMilliseconds(args);
      expect(result).toEqual({
        success: false,
        message: 'No valid duration provided',
      });
    });

    it('should return failure when duration is not a valid number', async () => {
      const args = { duration: 'abc' };
      const result = await waitInMilliseconds(args);
      expect(result).toEqual({
        success: false,
        message: 'No valid duration provided',
      });
    });

    it('should wait for the specified duration and return success', async () => {
      const args = { duration: '5000' }; // 5000 milliseconds = 5 seconds
      const loggerSpy = jest.spyOn(logger, 'log').mockImplementation();

      const waitPromise = waitInMilliseconds(args);

      // Fast-forward time by 5000 milliseconds
      jest.advanceTimersByTime(5000);

      const result = await waitPromise;

      expect(loggerSpy).toHaveBeenCalledWith('Waiting for 5000 milliseconds...');
      expect(loggerSpy).toHaveBeenCalledWith('Finished waiting');
      expect(result).toEqual({ success: true });

      loggerSpy.mockRestore();
    });

    it('should handle fractional durations', async () => {
      const args = { duration: '2500.5' };
      const loggerSpy = jest.spyOn(logger, 'log').mockImplementation();

      const waitPromise = waitInMilliseconds(args);

      // Fast-forward time by 2500.5 milliseconds
      jest.advanceTimersByTime(2500.5);

      const result = await waitPromise;

      expect(loggerSpy).toHaveBeenCalledWith('Waiting for 2500.5 milliseconds...');
      expect(loggerSpy).toHaveBeenCalledWith('Finished waiting');
      expect(result).toEqual({ success: true });

      loggerSpy.mockRestore();
    });

    it('should handle zero duration', async () => {
      const args = { duration: '0' };
      const loggerSpy = jest.spyOn(logger, 'log').mockImplementation();

      const waitPromise = waitInMilliseconds(args);

      // Fast-forward time by 0 milliseconds
      jest.advanceTimersByTime(0);

      const result = await waitPromise;

      expect(loggerSpy).toHaveBeenCalledWith('Waiting for 0 milliseconds...');
      expect(loggerSpy).toHaveBeenCalledWith('Finished waiting');
      expect(result).toEqual({ success: true });

      loggerSpy.mockRestore();
    });
  });

  describe('pushNotification', () => {
    it('should return failure when no title or body is provided', async () => {
      const args = {};
      const result = await pushNotification(args);
      expect(result).toEqual({
        success: false,
        message: 'No title or body provided',
      });
    });

    it('should call notifications.push with title and body', async () => {
      const args = { title: 'Test Title', body: 'Test Body' };
      const notificationsSpy = jest.spyOn(notifications, 'push').mockImplementation();

      const result = await pushNotification(args);

      expect(notificationsSpy).toHaveBeenCalledWith(args.title, args.body);
      expect(result).toEqual({ success: true });

      notificationsSpy.mockRestore();
    });
  });

  describe('writeToFile', () => {
    it('should return failure when no filePath or variableName is provided', async () => {
      const args = {};
      const result = await writeToFile(args);
      expect(result).toEqual({
        success: false,
        message: 'No file path or variable name provided',
      });
    });

    it('should return failure when the variable is not in the store', async () => {
      const args = { filePath: '/path/to/file.txt', variableName: 'nonExistentVar' };
      const result = await writeToFile(args);
      expect(result).toEqual({
        success: false,
        message: `Variable not saved ${args.variableName}`,
      });
    });

    it('should write content to file and send a success notification', async () => {
      const args = { filePath: '/path/to/file.txt', variableName: 'testVar' };
      const content = 'Test content\\nNew line';
      store.addKeyValueToStore(args.variableName, content);
  
      const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      const pushNotificationSpy = jest.spyOn(notifications, 'push').mockImplementation();
  
      const result = await writeToFile(args);
  
      expect(writeFileSpy).toHaveBeenCalledWith(args.filePath, 'Test content\nNew line');
      expect(pushNotificationSpy).toHaveBeenCalledWith('Success', `File saved to ${args.filePath}`);
      expect(result).toEqual({ success: true });
  
      writeFileSpy.mockRestore();
      pushNotificationSpy.mockRestore();
    });

    it('should return failure when unable to write to file', async () => {
      const args = { filePath: '/path/to/file.txt', variableName: 'testVar' };
      const content = 'Test content';
      store.addKeyValueToStore(args.variableName, content);

      const error = new Error('File system error');
      const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockRejectedValue(error);

      const result = await writeToFile(args);

      expect(writeFileSpy).toHaveBeenCalledWith(args.filePath, 'Test content');
      expect(result).toEqual({
        success: false,
        message: `Unable to write to file ${args.filePath}`,
      });

      writeFileSpy.mockRestore();
    });
  });

  describe('appendToFile', () => {
    it('should return failure when no filePath or variableName is provided', async () => {
      const args = {};
      const result = await appendToFile(args);
      expect(result).toEqual({
        success: false,
        message: 'No file path or variable name provided',
      });
    });

    it('should return failure when the variable is not in the store', async () => {
      const args = { filePath: '/path/to/file.txt', variableName: 'nonExistentVar' };
      const result = await appendToFile(args);
      expect(result).toEqual({
        success: false,
        message: `Variable not saved ${args.variableName}`,
      });
    });

    it('should append content to file and send a success notification', async () => {
      const args = { filePath: '/path/to/file.txt', variableName: 'testVar' };
      const content = 'Appended content\\nAnother line';
      store.addKeyValueToStore(args.variableName, content);

      const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
      const pushNotificationSpy = jest.spyOn(notifications, 'push').mockImplementation();

      const result = await appendToFile(args);

      expect(writeFileSpy).toHaveBeenCalledWith(
        args.filePath,
        '\nAppended content\nAnother line',
        { flag: 'a' }
      );
      expect(pushNotificationSpy).toHaveBeenCalledWith('Success', `File saved to ${args.filePath}`);
      expect(result).toEqual({ success: true });

      writeFileSpy.mockRestore();
      pushNotificationSpy.mockRestore();
    });

    it('should handle errors when unable to write to file', async () => {
      const args = { filePath: '/path/to/file.txt', variableName: 'testVar' };
      const content = 'Appended content';
      store.addKeyValueToStore(args.variableName, content);

      const error = new Error('File system error');
      const writeFileSpy = jest.spyOn(fs.promises, 'writeFile').mockRejectedValue(error);
      const pushNotificationSpy = jest.spyOn(notifications, 'push').mockImplementation();

      const result = await appendToFile(args);

      expect(writeFileSpy).toHaveBeenCalledWith(
        args.filePath,
        '\nAppended content',
        { flag: 'a' }
      );
      expect(pushNotificationSpy).toHaveBeenCalledWith('Error', `Unable to write to file ${args.filePath}`);
      expect(result).toEqual({
        success: false,
        message: `Unable to write to file ${args.filePath}`,
      });

      writeFileSpy.mockRestore();
      pushNotificationSpy.mockRestore();
    });
  });

  describe('storeKeyValue', () => {
    it('should return failure when no key or value is provided', async () => {
      const args = {};
      const result = await storeKeyValue(args);
      expect(result).toEqual({
        success: false,
        message: 'No key or value provided',
      });
    });

    it('should store the key-value pair and return success', async () => {
      const args = { key: 'myKey', value: 'myValue' };
      const addKeyValueSpy = jest.spyOn(store, 'addKeyValueToStore');

      const result = await storeKeyValue(args);

      expect(addKeyValueSpy).toHaveBeenCalledWith(args.key, args.value);
      expect(store.getValue(args.key)).toBe(args.value);
      expect(result).toEqual({ success: true });

      addKeyValueSpy.mockRestore();
    });
  });

  describe('downloadFromURL', () => {
    it('should return failure when no url or filename is provided', async () => {
      const args = {};
      const result = await downloadFromURL(args);
      expect(result).toEqual({
        success: false,
        message: 'No url or filename provided',
      });
    });

    it('should download the file and save it to the specified path', async () => {
      const args = { url: 'http://example.com/file.txt', filename: 'file.txt' };
      const fileName = 'file.txt';
      const filePath = path.join(__dirname, '..', 'output', fileName);
  
      const pipeMock = { pipe: jest.fn().mockReturnThis(), on: jest.fn() };
  
      const mockedRequest = request as jest.MockedFunction<typeof request>;
      mockedRequest.mockReturnValue(pipeMock as any);
  
      const createWriteStreamSpy = jest
        .spyOn(fs, 'createWriteStream')
        .mockReturnValue({} as any);
  
      const loggerSpy = jest.spyOn(logger, 'log').mockImplementation();
  
      const result = await downloadFromURL(args);
  
      expect(mockedRequest).toHaveBeenCalledWith(args.url);
      expect(createWriteStreamSpy).toHaveBeenCalledWith(filePath);
      expect(result).toEqual({ success: true });
  
      // Simulate the 'close' event
      pipeMock.on.mock.calls[0][1](); // Assuming 'close' is the first event registered
  
      expect(loggerSpy).toHaveBeenCalledWith(`File saved to ${filePath}`);
  
      createWriteStreamSpy.mockRestore();
      loggerSpy.mockRestore();
    });

  });

  describe('readFromFile', () => {
    it('should return failure when no filePath or variableName is provided', async () => {
      const args = {};
      const result = await readFromFile(args);
      expect(result).toEqual({
        success: false,
        message: 'No file path or variable name provided',
      });
    });

    it('should read content from file and store it', async () => {
      const args = { filePath: '/path/to/file.txt', variableName: 'fileContent' };
      const fileContent = 'Line1\nLine2\nLine3';

      const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockResolvedValue(fileContent);
      const addKeyValueSpy = jest.spyOn(store, 'addKeyValueToStore');

      const result = await readFromFile(args);

      expect(readFileSpy).toHaveBeenCalledWith(args.filePath, 'utf-8');
      expect(addKeyValueSpy).toHaveBeenCalledWith(args.variableName, 'Line1\\nLine2\\nLine3');
      expect(result).toEqual({ success: true });

      readFileSpy.mockRestore();
      addKeyValueSpy.mockRestore();
    });

    it('should return failure when unable to read the file', async () => {
      const args = { filePath: '/path/to/file.txt', variableName: 'fileContent' };
      const error = new Error('File not found');

      const readFileSpy = jest.spyOn(fs.promises, 'readFile').mockRejectedValue(error);

      const result = await readFromFile(args);

      expect(readFileSpy).toHaveBeenCalledWith(args.filePath, 'utf-8');
      expect(result).toEqual({
        success: false,
        message: `Unable to read file ${args.filePath}: ${error.message}`,
      });

      readFileSpy.mockRestore();
    });
  });

  describe('fetchUrlContent', () => {
    it('should return failure when no URL or variableName is provided', async () => {
      const args = {};
      const result = await fetchUrlContent(args);
      expect(result).toEqual({
        success: false,
        message: 'No URL or variable name provided',
      });
    });

    it('should fetch content from URL and store it', async () => {
      const args = { url: 'http://example.com', variableName: 'urlContent' };
      const body = 'Example content from URL';
  
      request.mockImplementation((url, callback) => {
        callback(null, { statusCode: 200 }, body);
      });
  
      const addKeyValueSpy = jest.spyOn(store, 'addKeyValueToStore');
  
      const result = await fetchUrlContent(args);
  
      expect(request).toHaveBeenCalledWith(args.url, expect.any(Function));
      expect(addKeyValueSpy).toHaveBeenCalledWith(args.variableName, body.replace(/\n/g, '\\n'));
      expect(result).toEqual({ success: true });
  
      addKeyValueSpy.mockRestore();
    });
  
    it('should return failure when request errors out', async () => {
      const args = { url: 'http://example.com', variableName: 'urlContent' };
      const error = new Error('Network error');
  
      request.mockImplementation((url, callback) => {
        callback(error, null, null);
      });
  
      const result = await fetchUrlContent(args);
  
      expect(request).toHaveBeenCalledWith(args.url, expect.any(Function));
      expect(result).toEqual({
        success: false,
        message: `Failed to fetch URL ${args.url}: ${error.message}`,
      });
    });
  
    it('should return failure when status code is not 200', async () => {
      const args = { url: 'http://example.com', variableName: 'urlContent' };
  
      request.mockImplementation((url, callback) => {
        callback(null, { statusCode: 404 }, null);
      });
  
      const result = await fetchUrlContent(args);
  
      expect(request).toHaveBeenCalledWith(args.url, expect.any(Function));
      expect(result).toEqual({
        success: false,
        message: `Failed to fetch URL ${args.url}: Status code 404`,
      });
    });
  });

  describe('calculateExpression', () => {
    it('should return failure when no expression or variableName is provided', async () => {
      const args = {};
      const result = await calculateExpression(args);
      expect(result).toEqual({
        success: false,
        message: 'No expression or variable name provided',
      });
    });

    it('should calculate the expression and store the result', async () => {
      const args = { expression: '2 + 2 * 3', variableName: 'calcResult' };
      const resultValue = 8; // Expected result of the expression
  
      // Set the mock implementation of evaluate to return the expected result
      (evaluate as jest.MockedFunction<typeof evaluate>).mockReturnValue(resultValue as any);
  
      const addKeyValueSpy = jest.spyOn(store, 'addKeyValueToStore');
  
      const result = await calculateExpression(args);
  
      expect(evaluate).toHaveBeenCalledWith(args.expression);
      expect(addKeyValueSpy).toHaveBeenCalledWith(args.variableName, resultValue.toString());
      expect(result).toEqual({ success: true });
  
      addKeyValueSpy.mockRestore();
    });
  

    it('should return failure when evaluation fails', async () => {
      const args = { expression: '2 + ', variableName: 'calcResult' };
      const error = new Error('Syntax error');
  
      (evaluate as jest.MockedFunction<typeof evaluate>).mockImplementation(() => {
        throw error;
      });
  
      const result = await calculateExpression(args);
  
      expect(evaluate).toHaveBeenCalledWith(args.expression);
      expect(result).toEqual({
        success: false,
        message: `Failed to calculate expression ${args.expression}: ${error.message}`,
      });
    });
  
  });

  describe('listFilesInDirectory', () => {
    it('should return failure when no directoryPath or variableName is provided', async () => {
      const args = {};
      const result = await listFilesInDirectory(args);
      expect(result).toEqual({
        success: false,
        message: 'No directory path or variable name provided',
      });
    });

    it('should list files in directory and store the result', async () => {
      const args = { directoryPath: '/path/to/dir', variableName: 'fileList' };
      const files = ['file1.txt', 'file2.txt', 'image.png'];
  
      const readdirSpy = jest.spyOn(fs.promises, 'readdir').mockResolvedValue(files as any);
      const addKeyValueSpy = jest.spyOn(store, 'addKeyValueToStore');
  
      const result = await listFilesInDirectory(args);
  
      expect(readdirSpy).toHaveBeenCalledWith(args.directoryPath, {
        withFileTypes: false,
      });
      expect(addKeyValueSpy).toHaveBeenCalledWith(args.variableName, files.join(', '));
      expect(result).toEqual({ success: true });
  
      readdirSpy.mockRestore();
      addKeyValueSpy.mockRestore();
    });
  
  

    it('should return failure when unable to list files', async () => {
      const args = { directoryPath: '/path/to/dir', variableName: 'fileList' };
      const error = new Error('Directory not found');

      const readdirSpy = jest.spyOn(fs.promises, 'readdir').mockRejectedValue(error);

      const result = await listFilesInDirectory(args);

      expect(result).toEqual({
        success: false,
        message: `Unable to list files in directory ${args.directoryPath}: ${error.message}`,
      });

      readdirSpy.mockRestore();
    });
  });
});