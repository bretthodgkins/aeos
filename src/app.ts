#!/usr/bin/env node
require('dotenv').config()

import { Command } from 'commander';

import store from './store';
import logger from './logger';

import { 
  getAllCommandFormats,
  runCommands,
} from './commands';

const program = new Command();

program
  .version('1.0.0')
  .option('-d, --debug', 'enable debug console logs')
  .option('-l, --log', 'enable debug logging to file')

program
  .command('commands')
  .description('list all commands')
  .action(() => {
    console.log('\n\nListing all commands...\n');
    const allCommandFormats = getAllCommandFormats().sort().map((commandFormat) => {
      return ` - ${commandFormat}`
    }).join('\n');
    console.log(allCommandFormats);
  });

program
  .command('run <commands...>')
  .description('Run specific commands')
  .action(async (commands) => {
    if (program.opts().debug) {
      store.addKeyValueToStore('enableLogToConsole', 'true');
    }

    if (program.opts().log) {
      store.addKeyValueToStore('enableLogToFile', 'true');
    }

    logger.log(`Running commands: ${commands.join(', ')}`);

    const result = await runCommands(commands);
  
    if (result.success) {
      logger.log(`Commands resolved successfully`);
    } else {
      logger.log(`Commands failed. ${result.message}`);
    }
  });

program
  .command('plugins')
  .description('list all plugins')
  .action(() => {
    console.log('Listing all plugins...');
  });

program
  .command('install <plugin>')
  .description('install a specific plugin')
  .action((plugin) => {
    console.log(`Installing plugin: ${plugin}`);
  });

program
  .command('update <plugin>')
  .description('update a specific plugin')
  .action((plugin) => {
    console.log(`Updating plugin: ${plugin}`);
  });

program
  .command('remove <plugin>')
  .description('remove a specific plugin')
  .action((plugin) => {
    console.log(`Removing plugin: ${plugin}`);
  });

program.parse(process.argv);