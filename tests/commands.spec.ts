import { 
  loadAllCommands, 
  runCommands, 
  createCommandFromJSON,
} from '../src/commands';

import {
  CommandType,
} from '../src/commandTypes';

jest.setTimeout(100000); // 100 seconds

describe('createCommandFromJSON', () => {
  // Test valid input
  it('should create a valid command object with minimal input', () => {
    const input = {
      format: 'test command',
      sequence: ['step1', 'step2']
    };
    const result = createCommandFromJSON(input);
    expect(result).toEqual({
      format: 'test command',
      type: CommandType.Sequence,
      sequence: ['step1', 'step2'],
      requiresExactMatch: false
    });
  });

  // Test with namespace
  it('should prepend namespace to format', () => {
    const input = {
      format: 'test command',
      sequence: ['step1']
    };
    const result = createCommandFromJSON(input, 'namespace:');
    expect(result.format).toBe('namespace:test command');
  });

  // Test with requiresApplication
  it('should set requiresApplication from input', () => {
    const input = {
      format: 'test',
      sequence: ['step1'],
      requires: { application: 'TestApp' }
    };
    const result = createCommandFromJSON(input);
    expect(result.requiresApplication).toBe('TestApp');
  });

  // Test with namespaceRequiresApplication
  it('should set requiresApplication from namespace if not in input', () => {
    const input = {
      format: 'test',
      sequence: ['step1']
    };
    const result = createCommandFromJSON(input, '', 'NamespaceApp');
    expect(result.requiresApplication).toBe('NamespaceApp');
  });

  // Test requiresExactMatch
  it('should set requiresExactMatch correctly', () => {
    const input = {
      format: 'test',
      sequence: ['step1'],
      requires: { exactMatch: true }
    };
    const result = createCommandFromJSON(input);
    expect(result.requiresExactMatch).toBe(true);
  });

  // Test alternativeSequence
  it('should include alternativeSequence if provided', () => {
    const input = {
      format: 'test',
      sequence: ['step1'],
      alternativeSequence: ['alt1', 'alt2']
    };
    const result = createCommandFromJSON(input);
    expect(result.alternativeSequence).toEqual(['alt1', 'alt2']);
  });

  // Test examples
  it('should include examples if provided', () => {
    const examples = [{ prompt: 'test prompt', output: ['test output'] }];
    const input = {
      format: 'test',
      sequence: ['step1'],
      examples
    };
    const result = createCommandFromJSON(input);
    expect(result.examples).toEqual(examples);
  });

  // Test error handling
  it('should throw an error if format is missing', () => {
    const input = {
      sequence: ['step1']
    };
    expect(() => createCommandFromJSON(input)).toThrow('Invalid command');
  });

  it('should throw an error if sequence is missing', () => {
    const input = {
      format: 'test'
    };
    expect(() => createCommandFromJSON(input)).toThrow('Invalid command');
  });

  it('should throw an error if sequence is empty', () => {
    const input = {
      format: 'test',
      sequence: []
    };
    expect(() => createCommandFromJSON(input)).toThrow('Invalid command');
  });
});


describe('using gpt to predict commands', () => {
  beforeAll(async () => {
    await loadAllCommands();
  });

  xit('gpt can predict correct command', async () => {
    const commandInputs = [
      'can you please log "Test1" to the console',
    ];
    let response = await runCommands(commandInputs);
    expect(response.success).toEqual(true);
  });

  xit('gpt can predict correct sequence of commands', async () => {
    const commandInputs = [
      'can you please log "Test1" to the console and then can you log "Test2" to the console',
    ];
    let response = await runCommands(commandInputs);
    expect(response.success).toEqual(true);
  });

  xit('gpt can inject variables', async () => {
    const commandInputs = [
      'please generate a response for hello how are you and then log this to the console',
    ];
    let response = await runCommands(commandInputs);
    expect(response.success).toEqual(true);
  });
});

describe('specific commands', () => {
  beforeAll(async () => {
    await loadAllCommands();
  });

  describe('try catch', () => {
    it('try catch supports invalid commands', async () => {
      const commandInputs = [
        'console log Starting Test...',
        {
          command: 'try',
          sequence: [
            'this is a jibberish command', // this returns no matching commands
            'console log This should not be logged',
          ],
          alternativeSequence: [
            'console log alternative sequence activated!',
            'console log alternative sequence going strong!',
          ],
        },
        'console log Finished Test!',
      ];
      let response = await runCommands(commandInputs);
      expect(response.success).toEqual(true);
    });

    it('try catch supports commands that errors', async () => {
      const commandInputs = [
        'console log Starting Test...',
        {
          command: 'try',
          sequence: [
            'this is a jibberish command', // this returns no matching commands
            'console log This should not be logged',
          ],
          alternativeSequence: [
            'console log alternative sequence activated!',
            'console log alternative sequence going strong!',
          ],
        },
        'console log Finished Test!',
      ];
      let response = await runCommands(commandInputs);
      expect(response.success).toEqual(true);
    });

    it('try catch supports no alternative sequence', async () => {
      const commandInputs = [
        'console log Starting Test...',
        {
          command: 'try',
          sequence: [
            'this is a jibberish command', // this returns no matching commands
            'console log This should not be logged',
          ],
        },
        'console log Finished Test!',
      ];
      let response = await runCommands(commandInputs);
      expect(response.success).toEqual(true);
    });
  });
});
