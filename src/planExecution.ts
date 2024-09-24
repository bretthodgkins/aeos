import exp from 'constants';
import { 
  loadAllPlans,
  getTreeStructure,
  findPlan,
  savePlanAsCommand,
  identifyRelevantCommands,
  reviewComplexTask,
  Plan,
  Task,
  identifySequenceOfCommands,
  TaskCategory,
  isTaskComplete,
} from './plans';
import { assert } from 'console';
import logger from './logger';
import { runCommands } from './commands';
import { CommandInput } from './commandTypes';

export async function executePlan(plan: Plan): Promise<boolean> {
  // set current task
  const nextTask = await getNextTask(plan);
  if (!nextTask) return true
  plan.currentState.currentTask = nextTask;

  const totalAttempts = 3;
  for (let i = 0; i < totalAttempts; i++) {
    console.log(`Attempt ${i + 1}`);
    if (isPlanComplete(plan)) return true;
    const currentTask = plan.currentState.currentTask;

    // if its been decided that the best next task is manual
    // then escalate to a human
    if (currentTask.category === TaskCategory.Manual) {
      console.log('Escalating to human');
      return false;
    }

    if (currentTask.category === TaskCategory.Complex) {
      assert(currentTask.subtasks.length === 0, 'Current task is complex and has already been expanded');
      await reviewComplexTask(plan, currentTask);
      const nextTask = await getNextTask(plan);
      if (!nextTask) return true
      plan.currentState.currentTask = nextTask;
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
        const nextTask = await getNextTask(plan);
        if (!nextTask) return true
        plan.currentState.currentTask = nextTask;
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
    const commandResult = await runCommands([currentCommand]);
    if (commandResult.success) {
      plan.currentState.completedTasks.push(currentTask);
    }

    const nextTask = await getNextTask(plan);
    if (!nextTask) return true
    plan.currentState.currentTask = nextTask;
    continue;
  }

  return false;
}

// next task must not be completed
// next task must not be complex and already expanded
export function getNextTask(plan: Plan): Task | null {
  // choose next subtask based on executionOrder, filter out completed
  // if no subtasks remaining, return parent task

  // begin up one level if possible
  let currentTask = plan.currentState.currentTask.parent ? plan.currentState.currentTask.parent : plan.currentState.currentTask;

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

  return currentTask;
}

function isPlanComplete(plan: Plan): boolean {
  // TODO currently no validation
  // it just returns true if all discrete tasks have been completed
  return isTaskComplete(plan, plan.task);
}
