// controls.spec.ts
import { generateText } from '../src/controls';
import store from '../src/store';
import { getChatCompletion } from '../src/chatCompletion';

jest.mock('../src/chatCompletion');

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
