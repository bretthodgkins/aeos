import { runCommands } from '../src/commands';

jest.setTimeout(100000); // 100 seconds

describe('using gpt to predict commands', () => {
  it('gpt can predict correct command', async () => {
    const commandInputs = [
      'can you please log "Test1" to the console',
    ];
    let response = await runCommands(commandInputs);
    expect(response.success).toEqual(true);
  });

  it('gpt can predict correct sequence of commands', async () => {
    const commandInputs = [
      'can you please log "Test1" to the console and then can you log "Test2" to the console',
    ];
    let response = await runCommands(commandInputs);
    expect(response.success).toEqual(true);
  });

  it('gpt can inject variables', async () => {
    const commandInputs = [
      'please generate a response for hello how are you and then log this to the console',
    ];
    let response = await runCommands(commandInputs);
    expect(response.success).toEqual(true);
  });
});

describe('specific commands', () => {
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
