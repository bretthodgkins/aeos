import { v4 as uuidv4 } from 'uuid';

import { 
  Plan, 
  PlanState,
  Task, 
  TaskCategory, 
  findPlan,
  findTask,
  loadAllPlans,
} from '../src/plans';

import { 
  loadAllCommands,
} from '../src/commands';

import {
  executePlan,
  getNextTask, 
} from '../src/planExecution';

jest.setTimeout(1000000); // 1000 seconds

describe('Plan Execution', () => {
  beforeAll(async () => { 
    loadAllCommands();
    loadAllPlans();
  });

  it('can execute plan', async () => {
    const planName = 'Count Lines in test.txt';
    const plan = findPlan(planName);
    expect(plan).toBeDefined();
    if (!plan) {
      return;
    }

    let response = await executePlan(plan);
    expect(response).toEqual(true);
  });
});

describe('getNextTask', () => {
  // Helper function to create a basic task
  const createTask = (objective: string, executionOrder: number, subtasks: Task[] = []): Task => ({
    id: uuidv4(),
    objective,
    category: TaskCategory.Discrete,
    impact: 1,
    impactRationale: '',
    feasibility: 1,
    feasibilityRationale: '',
    executionOrder,
    subtasks,
  });

  // Helper function to create a basic plan
  const createPlan = (currentTask: Task): Plan => ({
    name: 'Test Plan',
    task: currentTask,
    additionalInfoNeeded: '',
    currentState: { currentTaskId: currentTask.id, completedTasks: [] },
  });

  beforeEach(() => {
  });

  it('should return null when all tasks are complete', () => {
    const task = createTask('Root', 1);
    const plan = createPlan(task);
    plan.currentState.completedTasks = [task.id];

    const result = getNextTask(plan);
    expect(result).toBeNull();
  });

  it('should return the first incomplete subtask', () => {
    const subtask1 = createTask('Subtask 1', 1);
    const subtask2 = createTask('Subtask 2', 2);
    const task = createTask('Root', 1, [subtask1, subtask2]);
    subtask1.parent = task;
    subtask2.parent = task;
    const plan = createPlan(subtask1);

    plan.currentState.completedTasks = [subtask1.id];

    const nextTaskId = getNextTask(plan);
    expect(nextTaskId).toBe(subtask2.id);
  });

  it('should return null if all subtasks are complete', () => {
    const subtask = createTask('Subtask', 1);
    const task = createTask('Root', 1, [subtask]);
    subtask.parent = task;
    const plan = createPlan(subtask);
    plan.currentState.completedTasks = [subtask.id];

    const result = getNextTask(plan);
    expect(result).toBeNull();
  });

  it('should handle nested subtasks correctly', () => {
    const nestedSubtask1 = createTask('Nested Subtask 1', 1);
    const nestedSubtask2 = createTask('Nested Subtask 2', 2);
    const subtask1 = createTask('Subtask 1', 1, [nestedSubtask1, nestedSubtask2]);
    const subtask2 = createTask('Subtask 2', 2);
    const task = createTask('Root', 1, [subtask1, subtask2]);
    nestedSubtask1.parent = subtask1;
    nestedSubtask2.parent = subtask1;
    subtask1.parent = task;
    subtask2.parent = task;
    const plan = createPlan(task);

    plan.currentState.completedTasks = [];
    const nextTaskId1 = getNextTask(plan);
    expect(nextTaskId1).toBe(nestedSubtask1.id);
    if (!nextTaskId1) {
      throw new Error('Expected nextTaskId1 to be defined');
    }
    const result = findTask(plan, nextTaskId1);
    expect(result?.objective).toBe(nestedSubtask1?.objective);

    plan.currentState.completedTasks.push(nestedSubtask1.id);
    const nextTaskId2 = getNextTask(plan);
    expect(nextTaskId2).toBe(nestedSubtask2.id);
    if (!nextTaskId2) {
      throw new Error('Expected nextTaskId2 to be defined');
    }
    const result2 = findTask(plan, nextTaskId2);
    expect(result2?.objective).toBe(nestedSubtask2?.objective);

    plan.currentState.completedTasks.push(nestedSubtask2.id);
    const nextTaskId3 = getNextTask(plan);
    expect(nextTaskId3).toBe(subtask2.id);
    if (!nextTaskId3) {
      throw new Error('Expected nextTaskId3 to be defined');
    }
    const result3 = findTask(plan, nextTaskId3);
    expect(result3?.objective).toBe(subtask2?.objective);

    plan.currentState.completedTasks.push(subtask2.id);
    const nextTaskId4 = getNextTask(plan);
    expect(nextTaskId4).toBeNull();
  });

  it('should return tasks in the correct execution order', () => {
    const subtask1 = createTask('Subtask 1', 2);
    const subtask2 = createTask('Subtask 2', 1);
    const task = createTask('Root', 1, [subtask1, subtask2]);
    subtask1.parent = task;
    subtask2.parent = task;
    let plan = createPlan(task);
    plan.currentState.completedTasks = [];

    const nextTaskId = getNextTask(plan);
    expect(nextTaskId).toBe(subtask2.id);
    if (!nextTaskId) {
      throw new Error('Expected nextTaskId to be defined');
    }
    const result = findTask(plan, nextTaskId);
    expect(result).toBeDefined();
    expect(result?.objective).toBe('Subtask 2');
  });

  it('should handle a complex nested structure', () => {
    const nestedSubtask1 = createTask('Nested Subtask 1', 1);
    const nestedSubtask2 = createTask('Nested Subtask 2', 2);
    const subtask1 = createTask('Subtask 1', 1, [nestedSubtask1, nestedSubtask2]);
    const subtask2 = createTask('Subtask 2', 2);
    const task = createTask('Root', 1, [subtask1, subtask2]);
    
    nestedSubtask1.parent = subtask1;
    nestedSubtask2.parent = subtask1;
    subtask1.parent = task;
    subtask2.parent = task;
    
    const plan = createPlan(nestedSubtask1);
    plan.currentState.completedTasks = [nestedSubtask1.id];

    const result = getNextTask(plan);
    expect(result).toBe(nestedSubtask2.id);
  });

  it('should return null when reaching the end of the task tree', () => {
    const subtask = createTask('Subtask', 1);
    const task = createTask('Root', 1, [subtask]);
    subtask.parent = task;
    const plan = createPlan(subtask);
    plan.currentState.completedTasks = [subtask.id];

    const result = getNextTask(plan);
    expect(result).toBeNull();
  });

  it('should handle a plan with only the root task', () => {
    const task = createTask('Root', 1);
    const plan = createPlan(task);
    plan.currentState.completedTasks = [];

    const result = getNextTask(plan);
    expect(result).toBe(task.id);
  });
});
