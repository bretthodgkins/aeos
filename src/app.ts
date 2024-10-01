#!/usr/bin/env node
require('dotenv').config()

import { Command } from 'commander';

import store from './store';
import logger from './logger';
import pluginManager from './pluginManager';

import { 
  getAllCommandFormats,
  loadAllCommands,
  runCommands,
} from './commands';

import { 
  loadAllPlans,
  getTreeStructure,
  findPlan,
  savePlanAsCommand,
  startPlanning,
  identifyRelevantCommands,
} from './plans';

import {
  executePlan,
} from './planExecution';

import AeosPlugin from './pluginInterface';

async function main() {
  await pluginManager.loadPlugins();
  loadAllCommands();
  loadAllPlans();

  const program = new Command();

  program
    .version(`Aeos CLI v1.2.0`)
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

      const results = await runCommands(commands);
      if (results.length === 0) {
        logger.log(`No commands to run`);
        return;
      }
      const finalResult = results[results.length - 1];
    
      if (finalResult.success) {
        if (finalResult.message) {
          logger.log(`Commands resolved successfully - ${finalResult.message}`);
        } else {
          logger.log(`Commands resolved successfully`);
        }
      } else {
        logger.log(`Commands failed. ${finalResult.message}`);
      }
    });

  program
    .command('related <objective>')
    .description('find commands relevant to an objective')
    .action(async (description) => {
      if (program.opts().debug) {
        store.addKeyValueToStore('enableLogToConsole', 'true');
      }

      if (program.opts().log) {
        store.addKeyValueToStore('enableLogToFile', 'true');
      }

      const commands = await identifyRelevantCommands(description);
      console.log(commands);
    });


  program
    .command('plan <description>')
    .description('create a new plan')
    .action(async (description) => {
      if (program.opts().debug) {
        store.addKeyValueToStore('enableLogToConsole', 'true');
      }

      if (program.opts().log) {
        store.addKeyValueToStore('enableLogToFile', 'true');
      }

      const result = await startPlanning(description);
    
      if (result) {
        logger.log(`Task resolved successfully`);
      } else {
        logger.log(`Task failed.`);
      }
    });

  program
    .command('tree <planName>')
    .description('log the tree structure of a plan')
    .action(async (planName) => {
      if (program.opts().debug) {
        store.addKeyValueToStore('enableLogToConsole', 'true');
      }

      if (program.opts().log) {
        store.addKeyValueToStore('enableLogToFile', 'true');
      }

      const plan = findPlan(planName);
      if (!plan) {
        logger.log(`Plan ${planName} not found`);
        return;
      }
      const tree = getTreeStructure(plan);
      console.log(tree);
    });

  program
    .command('save <planName>')
    .description('save plan as a task to be executed')
    .action(async (planName) => {
      if (program.opts().debug) {
        store.addKeyValueToStore('enableLogToConsole', 'true');
      }

      if (program.opts().log) {
        store.addKeyValueToStore('enableLogToFile', 'true');
      }

      const plan = findPlan(planName);
      if (!plan) {
        logger.log(`Plan ${planName} not found`);
        return;
      }
      const result = await savePlanAsCommand(plan);

      if (result) {
        logger.log(`Task resolved successfully`);
      } else {
        logger.log(`Task failed.`);
      }
    });

  program
    .command('execute <planName>')
    .description('execute an existing plan')
    .action(async (planName) => {
      if (program.opts().debug) {
        store.addKeyValueToStore('enableLogToConsole', 'true');
      }

      if (program.opts().log) {
        store.addKeyValueToStore('enableLogToFile', 'true');
      }

      const plan = findPlan(planName);
      if (!plan) {
        logger.log(`Plan ${planName} not found`);
        return;
      }
      const success = await executePlan(plan);
      if (success) {
        logger.log(`Plan executed successfully`);
      } else {
        logger.log(`Plan failed.`);
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
    .action(async (plugin) => {
      const success = await pluginManager.installPlugin(plugin);
      if (success) {
        logger.log(`Plugin "${plugin}" installed successfully`);
      } else {
        logger.log(`Plugin "${plugin}" failed to install`);
      }
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