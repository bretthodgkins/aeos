import * as utils from '../src/utils';

jest.setTimeout(100000); // 100 seconds
describe('getMatchingFormatsFromInput', () => {
  it('exact match', async () => {
    const input = 'click';
    const formats = [
      'click',
    ];
    const matchingFormats = utils.getMatchingFormatsFromInput(input, formats);
    console.log(JSON.stringify(matchingFormats, null, 2));
    expect(matchingFormats.length).toBe(1);
  });

  it('argument no quotes', async () => {
    const input = 'click here';
    const formats = [
      'click ${where}',
    ];
    const matchingFormats = utils.getMatchingFormatsFromInput(input, formats);
    console.log(JSON.stringify(matchingFormats, null, 2));
    expect(matchingFormats.length).toBe(1);
  });

  it('arguments no quotes', async () => {
    const input = 'click here there everywhere';
    const formats = [
      'click ${where1} ${where2} ${where3}',
    ];
    const matchingFormats = utils.getMatchingFormatsFromInput(input, formats);
    console.log(JSON.stringify(matchingFormats, null, 2));
    expect(matchingFormats.length).toBe(1);
  });

  it('argument with quotes', async () => {
    const input = 'click "here"';
    const formats = [
      'click ${where}',
    ];
    const matchingFormats = utils.getMatchingFormatsFromInput(input, formats);
    console.log(JSON.stringify(matchingFormats, null, 2));
    expect(matchingFormats.length).toBe(1);
  });

  it('arguments with quotes', async () => {
    const input = 'click "here" "there" "everywhere"';
    const formats = [
      'click ${where1} ${where2} ${where3}',
    ];
    const matchingFormats = utils.getMatchingFormatsFromInput(input, formats);
    console.log(JSON.stringify(matchingFormats, null, 2));
    expect(matchingFormats.length).toBe(1);
  });

  it('arguments with quotes and new lines', async () => {
    const input = 'click "here\n" "\nthere" "every\nwhere"';
    const formats = [
      'click ${where1} ${where2} ${where3}',
    ];
    const matchingFormats = utils.getMatchingFormatsFromInput(input, formats);
    console.log(JSON.stringify(matchingFormats, null, 2));
    expect(matchingFormats.length).toBe(1);
  });

  it('draft email', async () => {
    const input = `create task with "Draft email to X" "This task involves sending the following generated email." "type Subject: Urgent Attention Required: Curtain Wall Defects at Queens Wharf\n\nDear [Recipient's Name],\n\nI hope this email finds you well. I am writing to bring to your attention a critical issue that has recently been discovered at Queens Wharf. During our routine inspection, we have identified several Curtain Wall defects across multiple towers and floors. This issue requires prompt action to ensure the safety and integrity of the building.\n\nThe defects have been found in the following locations:\n\nTower 1, Level 05:\n- ID: U05-16\n- ID: U05-17\n- ID: U05-18\n- ID: U05-56\n- ID: U05-58\n\nTower 2, Level 10:\n- ID: 2U10-D03\n- ID: 2U10-D13\n- ID: 2U10-D105\n\nTower 2, Level 11:\n- ID: 2U11-D10\n\nTower 2, Level 12:\n- ID: 2U12-D17\n\nTower 2, Level 13:\n- ID: 2U13-D83\n- ID: 2U13-D15\n\nTower 3, Level 18:\n- ID: 3U18-D105\n\nWe kindly request your immediate attention to this matter, as it is crucial to rectify these defects as soon as possible to prevent any potential hazards or further damage to the building. We understand the importance of maintaining the highest level of safety and quality at Queens Wharf, and we are committed to working closely with you to resolve this issue promptly.\n\nPlease review the above details and provide us with a plan of action to address these defects. We would appreciate it if you could respond within the next 48 hours to schedule a meeting to discuss the necessary steps and possible solutions.\n\nThank you for your prompt attention to this matter. We look forward to your response and working together to ensure the safety and quality of Queens Wharf.\n\nBest regards,\n\n[Your Name]\n[Your Title]\n[Your Company]\n[Your Email Address]\n[Your Phone Number]" "✉️"`;
    const formats = [
      'create task with ${title} ${description} ${task} ${icon}',
    ];
    const matchingFormats = utils.getMatchingFormatsFromInput(input, formats);
    console.log(JSON.stringify(matchingFormats, null, 2));
    expect(matchingFormats.length).toBe(1);
  });
});

describe('getArgsFromInputAndFormat', () => {
  it('should return an object with the correct argument values', () => {
    const input = 'run command Test1 "Test Two"';
    const format = 'run command ${arg1} ${arg2}';
    const expectedOutput = { arg1: 'Test1', arg2: 'Test Two' };
    expect(utils.getArgsFromInputAndFormat(input, format)).toEqual(expectedOutput);
  });

  it('should return an empty object if there are no arguments in the format string', () => {
    const input = 'run command';
    const format = 'run command';
    const expectedOutput = {};
    expect(utils.getArgsFromInputAndFormat(input, format)).toEqual(expectedOutput);
  });

  it('should throw an error if the input string does not match the format string', () => {
    const input = 'run command Test1 Test Two';
    const format = 'run command ${arg1} ${arg2}';
    expect(() => utils.getArgsFromInputAndFormat(input, format)).toThrow();
  });

  it('should correctly parse input strings with multiple spaces between arguments', () => {
    const input = 'run command   Test1   "Test   Two"';
    const format = 'run command ${arg1} ${arg2}';
    const expectedOutput = { arg1: 'Test1', arg2: 'Test   Two' };
    expect(utils.getArgsFromInputAndFormat(input, format)).toEqual(expectedOutput);
  });

  it('should correctly parse input strings with new line characters', () => {
    const input = 'run command "Test1\n" "\nTest2" "Test\n3"'.replace(/\n/g, '\\n');
    const format = 'run command ${arg1} ${arg2} ${arg3}';
    const expectedOutput = { arg1: 'Test1\\n', arg2: '\\nTest2', arg3: 'Test\\n3' };
    expect(utils.getArgsFromInputAndFormat(input, format)).toEqual(expectedOutput);
  });
});