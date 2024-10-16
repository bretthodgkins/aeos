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
  planTask,
  reviewComplexTask,
  savePlanAsCommand,
} from './plans';

import { assert } from 'console';
import logger from './logger';
import { runCommands } from './commands';
import { CommandInput, CommandResult } from './commandTypes';

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

    await planTask(plan, currentTask);
    const finalResult = await executeTask(currentTask);

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

async function executeTask(task: Task): Promise<CommandResult> {
  if (task.category === TaskCategory.Complex) {
    throw new Error(`Task ${task.id} is complex and cannot be executed`);
  }
  if (!task.command) {
    throw new Error(`Task ${task.id} has no command to execute`);
  }

  const commandResults = await runCommands([task.command]);
  if (commandResults.length === 0) {
    throw new Error(`No command results returned`);
  }
  return commandResults[commandResults.length - 1];
}
