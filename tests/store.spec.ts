import Store from '../src/store';
import config from '../src/config';

// Mock the config module
jest.mock('../src/config', () => ({
  getConfiguration: jest.fn(() => ({ configKey: 'configValue' })),
  getUserVariables: jest.fn(() => ({ userVar: 'userValue' })),
}));

describe('Store', () => {
  beforeEach(() => {
    // Reset the Store instance before each test
    (Store as any).store = {
      ...config.getConfiguration(),
      ...config.getUserVariables(),
    };
  });

  test('constructor initializes store with config and user variables', () => {
    expect(Store['store']).toEqual({
      configKey: 'configValue',
      userVar: 'userValue',
    });
  });

  test('addMapToStore adds multiple key-value pairs to the store', () => {
    Store.addMapToStore({ newKey1: 'value1', newKey2: 'value2' });
    expect(Store['store']).toEqual({
      configKey: 'configValue',
      userVar: 'userValue',
      newKey1: 'value1',
      newKey2: 'value2',
    });
  });

  test('addKeyValueToStore adds a single key-value pair to the store', () => {
    Store.addKeyValueToStore('newKey', 'newValue');
    expect(Store['store']).toEqual({
      configKey: 'configValue',
      userVar: 'userValue',
      newKey: 'newValue',
    });
  });

  test('injectVariablesIntoString replaces variables with their values', () => {
    Store.addKeyValueToStore('testVar', 'injectedValue');
    const result = Store.injectVariablesIntoString('This is a ${testVar}');
    expect(result).toBe('This is a injectedValue');
  });

  test('injectVariablesIntoString throws error for undefined variables', () => {
    expect(() => {
      Store.injectVariablesIntoString('This is an ${undefinedVar}');
    }).toThrow('Unable to find value for ${undefinedVar} in store');
  });

  test('injectVariablesIntoCommandInput with string input', () => {
    Store.addKeyValueToStore('testVar', 'injectedValue');
    const result = Store.injectVariablesIntoCommandInput('This is a ${testVar}');
    expect(result).toBe('This is a injectedValue');
  });

  test('injectVariablesIntoCommandInput with FlowCommandInput', () => {
    Store.addKeyValueToStore('testVar', 'injectedValue');
    const input = {
      command: 'This is a ${testVar}',
      sequence: [],
    };
    const result = Store.injectVariablesIntoCommandInput(input);
    expect(result).toEqual({
      command: 'This is a injectedValue',
      sequence: [],
    });
  });

  test('getValue returns the correct value for a given key', () => {
    expect(Store.getValue('configKey')).toBe('configValue');
    expect(Store.getValue('userVar')).toBe('userValue');
  });
});