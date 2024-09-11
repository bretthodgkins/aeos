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
  loadAllPlans,
  createPlanAndTasks,
  continuePlanning,
  getTreeStructure,
  findPlan,
  savePlanAsCommand,
  planAndExecute,
  identifyRelevantCommands,
} from './tasks';

import AeosPlugin from './pluginInterface';

async function main() {
  await pluginManager.loadPlugins();
  loadAllCommands();
  loadAllPlans();

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
    .command('objective <description>')
    .description('plan and execute a new task to achieve an objective')
    .action(async (description) => {
      if (program.opts().debug) {
        store.addKeyValueToStore('enableLogToConsole', 'true');
      }

      if (program.opts().log) {
        store.addKeyValueToStore('enableLogToFile', 'true');
      }

      const result = await planAndExecute(description);
    
      if (result) {
        logger.log(`Task resolved successfully`);
      } else {
        logger.log(`Task failed.`);
      }
    });

  program
    .command('plan <description>')
    .description('describe a new task to start planning for')
    .action(async (description) => {
      if (program.opts().debug) {
        store.addKeyValueToStore('enableLogToConsole', 'true');
      }

      if (program.opts().log) {
        store.addKeyValueToStore('enableLogToFile', 'true');
      }

      const result = await createPlanAndTasks(description);
    
      if (result) {
        logger.log(`Task resolved successfully`);
      } else {
        logger.log(`Task failed.`);
      }
    });

  program
    .command('continue <planName>')
    .description('specify a plan to continue planning')
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
      const result = await continuePlanning(plan);
    
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