import * as fc from '../src/flowControls';
import store from '../src/store';
import * as fs from 'fs';

jest.mock('../src/store');
jest.mock('../src/logger');
jest.mock('fs');

describe('Flow Controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllFlowControlFormats', () => {
    it('should return all flow control formats', () => {
      const formats = fc.getAllFlowControlFormats();
      expect(formats).toContain('repeat ${x} times');
      expect(formats).toContain('if ${condition}');
      expect(formats).toContain('while ${condition}');
      // Add more assertions for other formats
    });
  });

  describe('getFlowControlFromFormat', () => {
    it('should return a flow control command for a valid format', () => {
      const command = fc.getFlowControlFromFormat('repeat ${x} times');
      expect(command.type).toBe('flow');
      expect(command.flowControl).toBeDefined();
    });

    it('should return a function command for an invalid format', () => {
      const command = fc.getFlowControlFromFormat('invalid format');
      expect(command.type).toBe('function');
      expect(command.flowControl).toBeUndefined();
    });
  });

  describe('ifCondition', () => {
    it('should execute the sequence if condition is true', async () => {
      const mockRunSequence = jest.fn().mockResolvedValue([{ success: true }]);
      const mockRunAlternativeSequence = jest.fn();
      (store.getValue as jest.Mock).mockReturnValue('5');

      const results = await fc.ifCondition({ condition: '${value} > 3' }, mockRunSequence, mockRunAlternativeSequence);

      expect(results.length).toBe(2);
      expect(results[1].success).toBe(true);
      expect(mockRunSequence).toHaveBeenCalled();
      expect(mockRunAlternativeSequence).not.toHaveBeenCalled();
    });

    it('should execute the alternative sequence if condition is false', async () => {
      const mockRunSequence = jest.fn();
      const mockRunAlternativeSequence = jest.fn().mockResolvedValue([{ success: true }]);
      (store.getValue as jest.Mock).mockReturnValue('2');

      const results = await fc.ifCondition({ condition: '${value} > 3' }, mockRunSequence, mockRunAlternativeSequence);

      expect(results.length).toBe(2); 
      expect(results[1].success).toBe(true);
      expect(mockRunSequence).not.toHaveBeenCalled();
      expect(mockRunAlternativeSequence).toHaveBeenCalled();
    });
  });

  describe('whileCondition', () => {
    it('should execute the sequence while condition is true', async () => {
      const mockRunSequence = jest.fn().mockResolvedValue([{ success: true }]);
      (store.getValue as jest.Mock).mockReturnValueOnce('3').mockReturnValueOnce('2').mockReturnValueOnce('1');

      const results = await fc.whileCondition({ condition: '${value} > 1' }, mockRunSequence, jest.fn());

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].message).toBe('Condition "1 > 1" is false');
      expect(mockRunSequence).toHaveBeenCalledTimes(2);
    });
  });

  describe('repeatXTimes', () => {
    it('should repeat the sequence x times', async () => {
      const mockRunSequence = jest.fn().mockResolvedValue([{ success: true }]);

      const results = await fc.repeatXTimes({ x: '3' }, mockRunSequence, jest.fn());

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(mockRunSequence).toHaveBeenCalledTimes(3);
    });
  });

  describe('repeatXTimesWithIndex', () => {
    it('should repeat the sequence x times and set the index variable', async () => {
      const mockRunSequence = jest.fn().mockResolvedValue([{ success: true }]);
      const mockAddKeyValueToStore = store.addKeyValueToStore as jest.Mock;

      const results = await fc.repeatXTimesWithIndex({ x: '3', index: 'i' }, mockRunSequence, jest.fn());

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(mockRunSequence).toHaveBeenCalledTimes(3);
      expect(mockAddKeyValueToStore).toHaveBeenCalledTimes(3);
      expect(mockAddKeyValueToStore).toHaveBeenCalledWith('i', '0');
      expect(mockAddKeyValueToStore).toHaveBeenCalledWith('i', '1');
      expect(mockAddKeyValueToStore).toHaveBeenCalledWith('i', '2');
    });
  });

  describe('tryCatch', () => {
    it('should execute the sequence and return success if no error occurs', async () => {
      const mockRunSequence = jest.fn().mockResolvedValue([{ success: true }]);
      const mockRunAlternativeSequence = jest.fn();

      const results = await fc.tryCatch({}, mockRunSequence, mockRunAlternativeSequence);

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(mockRunSequence).toHaveBeenCalled();
      expect(mockRunAlternativeSequence).not.toHaveBeenCalled();
    });

    it('should execute the alternative sequence if an error occurs', async () => {
      const mockRunSequence = jest.fn().mockResolvedValue([{ success: false, message: 'Error' }]);
      const mockRunAlternativeSequence = jest.fn().mockResolvedValue([{ success: true }]);

      const results = await fc.tryCatch({}, mockRunSequence, mockRunAlternativeSequence);

      expect(results.length).toBe(2);
      expect(results[1].success).toBe(true);
      expect(mockRunSequence).toHaveBeenCalled();
      expect(mockRunAlternativeSequence).toHaveBeenCalled();
    });
  });

  describe('forEachLineOfFile', () => {
    it('should execute the sequence for each non-empty line in the file', async () => {
      const mockRunSequence = jest.fn().mockResolvedValue([{ success: true }]);
      const mockAddKeyValueToStore = store.addKeyValueToStore as jest.Mock;
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('line1\n\nline2\nline3');

      const results = await fc.forEachLineOfFile({ filename: 'test.txt' }, mockRunSequence, jest.fn());

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(mockRunSequence).toHaveBeenCalledTimes(3);
      expect(mockAddKeyValueToStore).toHaveBeenCalledTimes(3);
      expect(mockAddKeyValueToStore).toHaveBeenCalledWith('lineOfFile', 'line1');
      expect(mockAddKeyValueToStore).toHaveBeenCalledWith('lineOfFile', 'line2');
      expect(mockAddKeyValueToStore).toHaveBeenCalledWith('lineOfFile', 'line3');
    });

    it('should return an error if the file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const results = await fc.forEachLineOfFile({ filename: 'nonexistent.txt' }, jest.fn(), jest.fn());

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].message).toContain('File not found');
    });
  });

  describe('forEachItemInList', () => {
    it('should execute the sequence for each item in the list', async () => {
      const mockRunSequence = jest.fn().mockResolvedValue([{ success: true }]);
      const mockAddKeyValueToStore = store.addKeyValueToStore as jest.Mock;
      (store.getValue as jest.Mock).mockReturnValue('item1, item2, item3');

      const results = await fc.forEachItemInList({ listVariable: 'myList', itemVariable: 'currentItem' }, mockRunSequence, jest.fn());

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(mockRunSequence).toHaveBeenCalledTimes(3);
      expect(mockAddKeyValueToStore).toHaveBeenCalledTimes(3);
      expect(mockAddKeyValueToStore).toHaveBeenCalledWith('currentItem', 'item1');
      expect(mockAddKeyValueToStore).toHaveBeenCalledWith('currentItem', 'item2');
      expect(mockAddKeyValueToStore).toHaveBeenCalledWith('currentItem', 'item3');
    });

    it('should return an error if the list variable is not found', async () => {
      (store.getValue as jest.Mock).mockReturnValue(undefined);

      const results = await fc.forEachItemInList({ listVariable: 'nonexistentList', itemVariable: 'currentItem' }, jest.fn(), jest.fn());

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].message).toContain('Variable nonexistentList not found');
    });
  });

  describe('expandVariables', () => {
    it('should replace variables in the string with their values from the store', () => {
      (store.getValue as jest.Mock).mockImplementation((key: string) => {
        const values: { [key: string]: string } = { x: '5', y: '10' };
        return values[key];
      });
  
      const result = fc.expandVariables('${x} + ${y} = ${z}');
  
      expect(result).toBe('5 + 10 = ${z}');
    });
  });

  describe('Error handling', () => {
    it('should return an error for invalid repeat count', async () => {
      const results = await fc.repeatXTimes({ x: 'invalid' }, jest.fn(), jest.fn());

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].message).toContain('Invalid number of times to repeat');
    });

    it('should return an error for missing condition in if statement', async () => {
      const results = await fc.ifCondition({}, jest.fn(), jest.fn());

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].message).toContain('No condition provided');
    });

    it('should return an error for invalid condition in while loop', async () => {
      (store.getValue as jest.Mock).mockReturnValue('invalid');

      const results = await fc.whileCondition({ condition: '${value} > 3' }, jest.fn(), jest.fn());

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].message).toContain('Failed to evaluate condition');
    });
  });
});