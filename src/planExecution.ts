import exp from 'constants';
import { 
  Plan,
  Task,
  TaskCategory,
  TaskId,
  findPlan,
  findTask,
  getTreeStructure,
  identifyRelevantCommands,
  identifySequenceOfCommands,
  isTaskComplete,
  loadAllPlans,
  reviewComplexTask,
  savePlanAsCommand,
} from './plans';

import { assert } from 'console';
import logger from './logger';
import { runCommands } from './commands';
import { CommandInput } from './commandTypes';

export async function executePlan(plan: Plan): Promise<boolean> {
  // set current task
  const nextTaskId = await getNextTask(plan);
  if (!nextTaskId) return true
  plan.currentState.currentTaskId = nextTaskId;
  let currentTask = findTask(plan, nextTaskId);
  if (!currentTask) {
    throw new Error(`Task with ID ${nextTaskId} not found`);
  }

  const totalAttempts = 10;
  for (let i = 0; i < totalAttempts; i++) {
    console.log(`Attempt ${i + 1}`);
    if (isPlanComplete(plan)) return true;

    // if its been decided that the best next task is manual
    // then escalate to a human
    if (currentTask.category === TaskCategory.Manual) {
      console.log('Escalating to human');
      return false;
    }

    if (currentTask.category === TaskCategory.Complex) {
      assert(currentTask.subtasks.length === 0, 'Current task is complex and has already been expanded');
      await reviewComplexTask(plan, currentTask);
      const nextTaskId = await getNextTask(plan);
      if (!nextTaskId) return true
      plan.currentState.currentTaskId = nextTaskId;
      continue;
    } 

    let currentCommand: CommandInput | null = null;
    if (currentTask.category === TaskCategory.Sequence) {
      try {
        currentCommand = await identifySequenceOfCommands(currentTask.objective);
      } catch (e) {
        logger.log(`Failed to identify sequence of commands for objective: "${currentTask.objective}"`);
        logger.log(`Recategorising as complex task...`);

        currentTask.category = TaskCategory.Complex;
        await reviewComplexTask(plan, currentTask);
        const nextTaskId = await getNextTask(plan);
        if (!nextTaskId) return true
        plan.currentState.currentTaskId = nextTaskId;
        continue;
      }
    } else { // Discrete
      if (!currentTask.command) {
        // check if there's a single existing command that will achieve objective
        // if not, create one
        throw new Error('Not implemented - creating command for discrete task');
      }
      currentCommand = currentTask.command;
    }
    if (!currentCommand) {
      throw new Error(`No command identified for task: ${currentTask.objective}`);
      return false;
    }
    const commandResults = await runCommands([currentCommand]);
    if (commandResults.length === 0) {
      logger.log(`No commands to run`);
      return false;
    }
    const finalResult = commandResults[commandResults.length - 1];
    if (finalResult.success) {
      // TODO store command results
      plan.currentState.completedTasks.push(currentTask.id);
    } else {
      logger.log(`Command failed: ${finalResult.message}`);
      return false;
    }

    const nextTaskId = await getNextTask(plan);
    if (!nextTaskId) return true
    plan.currentState.currentTaskId = nextTaskId;
    currentTask = findTask(plan, nextTaskId);
    if (!currentTask) {
      throw new Error(`Task with ID ${nextTaskId} not found`);
    }
    continue;
  }

  return false;
}

// next task must not be completed
// next task must not be complex and already expanded
export function getNextTask(plan: Plan): TaskId | null {
  // choose next subtask based on executionOrder, filter out completed
  // if no subtasks remaining, return parent task

  // begin up one level if possible
  let currentTask = findTask(plan, plan.currentState.currentTaskId);
  if (!currentTask) {
    throw new Error(`Task with ID ${plan.currentState.currentTaskId} not found`);
  }
  currentTask = currentTask?.parent ? currentTask.parent : currentTask;

  // traverse up until task incomplete
  while (isTaskComplete(plan, currentTask)) {
    if (!currentTask.parent) return null;
    currentTask = currentTask.parent;
  }

  // traverse back down to get first incomplete child
  let nextChildren = currentTask?.subtasks.filter(task => !isTaskComplete(plan, task)).sort((a, b) => a.executionOrder - b.executionOrder);
  while (nextChildren.length) {
    currentTask = nextChildren[0];
    nextChildren = currentTask?.subtasks.filter(task => !isTaskComplete(plan, task)).sort((a, b) => a.executionOrder - b.executionOrder);
  }

  return currentTask.id;
}

function isPlanComplete(plan: Plan): boolean {
  // TODO currently no validation
  // it just returns true if all discrete tasks have been completed
  return isTaskComplete(plan, plan.task);
}
