export function getMatchingFormatsFromInput(input: string, formats: string[]): string[] {
  // replace new lines with \n
  input = input.replace(/\n/g, '\\n');

  // Initially, find search for commands where arguments have no whitespace, unless double quoted
  // i.e. `press a b` will match `press ${keyOne} ${keyTwo}`, but `press a b c` will not match `press ${keyOne} ${keyTwo}`
  let resultsQuotationsOrNoWhiteSpace = formats.reduce((matchingFormats, format) => {
    if (input === format) {
      matchingFormats.push(format);
      return matchingFormats;
    }

    // create regex string from command format, replacing ${var} placeholders with wildcards
    let valRegexString = format.replace(/\$\{\w+\}/g, '(".+"|[\\S]+)'); // first match w/ no spaces
    let valRegex = new RegExp('^' + valRegexString + '$');

    let vals = input.match(valRegex);
    if (!vals) return matchingFormats;

    matchingFormats.push(format);
    return matchingFormats;
  }, [] as string[]);

  // if there's at least one match with no whitespace (of quotes), just return those
  if (resultsQuotationsOrNoWhiteSpace.length > 0) return resultsQuotationsOrNoWhiteSpace;

  // if not, find commands where arguments have whitespace and no quotes
  let resultsWhiteSpace = formats.reduce((matchingFormats, format) => {
    // create regex string from command format, replacing ${var} placeholders with wildcards (allowing unquoted spaces this time)
    let valRegexString = `^${format.replace(/\$\{\w+\}/g, '(.+)')}`;
    let valRegex = new RegExp('^' + valRegexString + '$');

    let vals = input.match(valRegex);
    if (!vals) return matchingFormats;

    matchingFormats.push(format);
    return matchingFormats;
  }, [] as string[]);

  return resultsWhiteSpace;
}

export function getArgsFromInputAndFormat(input: string, format: string): Record<string, string> {
  let valRegexString = format.replace(/\$\{\w+\}/g, '\\s*(".+"|[\\S]+)\\s*'); // first match w/ no spaces
  let valRegex = new RegExp('^' + valRegexString + '$');

  let argumentValues = input.match(valRegex);

  // if there's no match, try again with unquoted strings with whitespace
  if (!argumentValues) {
    valRegexString = `^${format.replace(/\$\{\w+\}/g, '\\s*(.+)\\s*')}`;
    valRegex = new RegExp('^' + valRegexString + '$');

    // ensure there's no two unquoted arguments next to each other
    // because it can't be determined where one argument ends and the other begins
    // NOTE: The code below prevents you from storing valid stringified JSON objects, to pass between commands. 
    // will need to update this, if only to allow `` top level quotes so it can handle things properly. 
    if (valRegexString.match(/\(\.\+\)\\s\* \\s\*\(\.\+\)/)) {
      throw (`Error: Could not parse input: ${input} with format: ${format} - arguments must be double-quoted if they contain whitespace and are next to another argument`);
    }

    argumentValues = input.match(valRegex);
    if (!argumentValues) {
      throw (`Error: Could not parse input: ${input} with format: ${format}`);
    }
  }

  // remove quotes from arguments
  for (let i = 0; i < argumentValues.length; i++) {
    if (argumentValues[i].startsWith('"') && argumentValues[i].endsWith('"')) {
      argumentValues[i] = argumentValues[i].slice(1, -1);
    }
  }

  var argsRegex = /\$\{(\w+)\}/g
  var argsMatch = format.match(argsRegex);
  if (!argsMatch) return {}; // no arguments

  if (argsMatch.length !== argumentValues.length - 1) {
    throw (`Error: Could not parse input: ${input} with format: ${format}`);
  }

  var args = argsMatch.map(arg => arg = arg.slice(2, -1)); // remove ${}
  return args.reduce((result, argumentName, i) => {
    result[argumentName] = argumentValues ? argumentValues[i + 1] : '';
    return result;
  }, {} as Record<string, string>);
}
