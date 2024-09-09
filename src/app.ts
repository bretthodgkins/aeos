#!/usr/bin/env node
require('dotenv').config()

import { Command } from 'commander';
import * as packageJson from '../package.json';

import store from './store';
import logger from './logger';
import pluginManager from './pluginManager';

import { 
  getAllCommandFormats,
  loadAllCommands,
  runCommands,
} from './commands';

import { 
  loadAllTasks,
  createTaskAndSubtasks,
  continuePlanning,
} from './tasks';

import AeosPlugin from './pluginInterface';

async function main() {
  await pluginManager.loadPlugins();
  loadAllCommands();
  loadAllTasks();

  const program = new Command();

  program
    .version(packageJson.version)
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
    .description('run sequence of commands')
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
    .command('create-task <description>')
    .description('describe a new task to start planning for')
    .action(async (description) => {
      if (program.opts().debug) {
        store.addKeyValueToStore('enableLogToConsole', 'true');
      }

      if (program.opts().log) {
        store.addKeyValueToStore('enableLogToFile', 'true');
      }

      const result = await createTaskAndSubtasks(description);
    
      if (result) {
        logger.log(`Task resolved successfully`);
      } else {
        logger.log(`Task failed.`);
      }
    });

  program
    .command('continue-planning <name>')
    .description('specify a task to continue planning')
    .action(async (name) => {
      if (program.opts().debug) {
        store.addKeyValueToStore('enableLogToConsole', 'true');
      }

      if (program.opts().log) {
        store.addKeyValueToStore('enableLogToFile', 'true');
      }

      const result = await continuePlanning(name);
    
      if (result) {
        logger.log(`Task resolved successfully`);
      } else {
        logger.log(`Task failed.`);
      }
    });

  program
    .command('plugins')
    .description('list all plugins')
    .action(() => {
      const plugins = pluginManager.getPlugins() as Map<string, AeosPlugin>;
      if (plugins.size === 0) {
        console.log('No plugins installed');
        return;
      }

      let pluginList = [] as string[];
      plugins.forEach((plugin, path) => {
        if (plugin.description === undefined) {
          pluginList.push(`  ${plugin.name}@${plugin.version} (${path})`);
        } else {
          pluginList.push(`  ${plugin.name}@${plugin.version} - ${plugin.description} (${path})`);
        }
      });
      console.log(pluginList.sort().join('\n'));
    });

  program
    .command('install <plugin>')
    .description('provide a npm package name or local path')
    .action((plugin) => {
      pluginManager.installPlugin(plugin);
    });

  program
    .command('update <plugin>')
    .description('update a specific plugin')
    .action((plugin) => {
      pluginManager.updatePlugin(plugin);
    });

  program
    .command('uninstall <plugin>')
    .description('uninstall a specific plugin')
    .action((plugin) => {
      pluginManager.uninstallPlugin(plugin);
    });

  program.parse(process.argv);
}

main();