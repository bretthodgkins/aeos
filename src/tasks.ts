const fs = require('fs');
const path = require('path');
const JSON5 = require('json5')
import { createMessage, callFunction } from "./languageModels";


import {
  FunctionCall,
  FunctionDefinition,
  Message,
} from "./languageModelTypes";
import config from './config';
import logger from "./logger";
import notifications from './notifications';
import { promptCreatePlan, promptCreateSubtasks, promptFindCommandsRelevantToObjective } from "./taskPrompts";
import { getAllCommandFormats, saveCommandToFile } from "./commands";
import { Command, CommandInput, CommandType } from "./commandTypes";


type Plan = {
  name: string;
  task: Task;
  additionalInfoNeeded: string;
};

enum TaskCategory {
  Discrete = 'discrete',
  Sequence = 'sequence',
  Manual = 'manual',
  Complex = 'complex',
  // Continuous = 'Continuous'
}

type Task = {
  objective: string;
  category: TaskCategory;
  command?: string;
  impact: number;
  impactRationale: string;
  feasibility: number;
  feasibilityRationale: string;
  executionOrder?: number;
  subtasks: Task[];
  parent?: Task;
};


let allPlans = [] as Plan[];

export function loadAllPlans() {
  const userPlans = getUserPlans();
  allPlans = [
    ...userPlans,
  ];
  setAllParentReferences();
  logger.log(`Loaded ${allPlans.length} user-defined plan${allPlans.length === 1 ? '' : 's'}`);
}

function getUserPlans(): Plan[] {
  let planList: Plan[] = [];

  let files: any;
  const plansDir = config.getPlansDirectory();
  try {
    files = fs.readdirSync(plansDir);
  } catch(e: any) {
    logger.log(`Warning: Plans directory not found at ${plansDir}`);
    return [];
  }

  // Loop through the list of files
  for (const file of files) {
    // Check if the file is a JSON file
    if (file.endsWith('.json') || file.endsWith('.json5')) {
      const filePath = path.join(plansDir, file);
      planList = planList.concat(getUserPlansFromFile(filePath));
    }
  }

  return planList;
}

function getUserPlansFromFile(path: string): Plan[] {
  logger.log(`Importing file: ${path}`);
  let inputRaw = fs.readFileSync(path);
  let inputJson: any;
  try {
    inputJson = JSON5.parse(inputRaw);
  } catch(e: any) {
    logger.log(`Error: Invalid plan file: ${path}`);
    logger.log(e.toString());
    return [];
  }
  if (!inputJson.plans || inputJson.plans.length === 0) {
    logger.log(`Error: No plans found in ${path}`);
    return [];
  }

  const namespace = inputJson.namespace ? `${inputJson.namespace}:` : '';
  // const namespaceRequiresApplication = inputJson.requires?.application;

  let planList: Plan[] = [];
  for (let inputPlan of inputJson.plans) {
    if (!inputPlan.name || !inputPlan.task || inputPlan.task.subtasks.length === 0) {
      notifications.push("Error", `Invalid plans found in ${path}`);
      return [];
    }

    // const planRequiresApplication = inputPlan.requires?.application;
    // const requiresApplication = planRequiresApplication || namespaceRequiresApplication;
    // const requiresExactMatch = inputPlan.requires?.exactMatch || false;
    
    // TODO validate subtasks as imported
    const name = `${namespace}${inputPlan.name}`;
    //logger.log(`Importing command: ${format}, requires application: ${requiresApplication}`);
    planList.push({
      name,
      task: inputPlan.task,
      additionalInfoNeeded: inputPlan.additionalInfoNeeded || '',
      // requiresApplication: requiresApplication,
      // requiresExactMatch: requiresExactMatch,
    });
  }

  logger.log(`Imported ${planList.length} plan${planList.length === 1 ? '' : 's'} from ${path}`);
  return planList;
}

function setAllParentReferences(): void {
  function traverseTasks(parent: Task, subtasks: Task[]): void {
    for (const subtask of subtasks) {
      subtask.parent = parent;
      traverseTasks(subtask, subtask.subtasks);
    }
  }

  for (const plan of allPlans) {
    traverseTasks(plan.task, plan.task.subtasks);
  }
}

function removeAllParentReferences(): Plan[] {
  function removeParentFromTasks(tasks: Task[]): Task[] {
    return tasks.map(task => {
      // Create a new object without the parent property
      const { parent, ...taskWithoutParent } = task;
      
      // Recursively remove parent references from nested subtasks
      return {
        ...taskWithoutParent,
        subtasks: removeParentFromTasks(task.subtasks)
      };
    });
  }

  // Create a new task list with subtasks that have no parent references
  return allPlans.map(plan => {
    // Recursively remove parent references from nested subtasks
    return {
      ...plan,
      task: {
        ...plan.task,
        subtasks: removeParentFromTasks(plan.task.subtasks)
      }
    };
  });
}

function saveAllPlansToFile() {
  const plansDirectory = config.getPlansDirectory();

  // Ensure the directory exists
  fs.mkdirSync(plansDirectory, { recursive: true });

  // Remove parent references before saving to file
  const plansWithoutParents = removeAllParentReferences();
  
  // Write the plans to the file
  fs.writeFileSync(path.join(plansDirectory, 'default.json5'), JSON5.stringify({ plans: plansWithoutParents }, null, 2));
}

export async function identifyRelevantCommands(objective: string): Promise<string[]> {
  const allCommandFormats = getAllCommandFormats().sort();
  const userMessage: Message = {
    role: 'user',
    content: promptFindCommandsRelevantToObjective(allCommandFormats, objective),
  };
  const message = await createMessage('', [userMessage]);
  const commands = message.split('<relevant_commands>')[1].split('</relevant_commands>')[0].trim().split('\n');
  return commands;
}

async function createPlan(description: string, allRelevantCommands: string[]): Promise<Plan> {
  const functionDefinition: FunctionDefinition = {
    name: 'createPlan',
    description: "The createPlan tool transforms a user-provided task description into a well-defined, actionable objective statement and a concise task plan name. This tool is designed to standardize task definitions, making them clear and executable for both human users and automated systems. It analyzes the user's input, extracts the core purpose, and formulates a structured output that can be easily integrated into task management systems or automation platforms.",
    properties: {
      objective: {
        type: 'string',
        description: "A clear, actionable statement that defines the plan's goal. This statement is formulated to be specific, measurable, achievable, relevant, and time-bound (if applicable). It provides a comprehensive understanding of what needs to be accomplished, serving as a guide for plan execution.",
      },
      name: {
        type: 'string',
        description: "A short, descriptive identifier for the plan. This concise name captures the essence of the plan in a few words, making it easily recognizable and referenceable. It's designed to be memorable and suitable for use in plan lists, project management tools, or when invoking the plan in automated systems.",
      },
      additionalInfoNeeded: {
        type: 'string',
        description: "Provide a summary of any additional information required to refine the objective statement, otherwise, leave this field empty.",
      },
    },
  };
  const userMessage: Message = {
    role: 'user',
    content: promptCreatePlan(description, allRelevantCommands),
  };
  const functionCall = await callFunction('', [userMessage], [functionDefinition], functionDefinition.name);
  return {
    name: functionCall.input.name,
    additionalInfoNeeded: functionCall.input.additionalInfoNeeded,
    task: {
      category: TaskCategory.Complex,
      impact: 1,
      impactRationale: '',
      feasibility: 1,
      feasibilityRationale: '',
      executionOrder: 1,
      objective: functionCall.input.objective,
      subtasks: [],
    }
  };
}

async function createSubtasks(objective: string, parent: Task, tree: string, allRelevantCommands: string[]): Promise<Task[]> {
  const functionDefinition: FunctionDefinition = {
    name: 'createSubtasks',
    description: 'A tool used to generate a list of subtasks for a given high-level objective. It breaks down the main objective into smaller, manageable tasks and provides impact and feasibility assessments for each.',
    properties: {
      subtasks: {
        type: 'array',
        description: 'An array of subtask objects, each representing a smaller component of the main objective.',
        items: {
          type: 'object',
          properties: {
            objective: {
              type: 'string',
              description: 'A clear and concise objective statement for the specific subtask to be accomplished.',
            },
            category: {
              type: 'string',
              enum: ['discrete', 'sequence', 'manual', 'complex'],
              description: `The classification of the task based on its nature and complexity. Choose from:
- Discrete: A task achievable by executing a single, specific function or action.
- Sequence: A task that could be achieved by executing a series of discrete functions with flow control.
- Manual: A discrete task that would require a human or physical intervention and cannot be fully automated.
- Complex: A multi-faceted task that can be broken down into subtasks of various categories.
Select the most appropriate category that best describes the task's characteristics and requirements. If the task could not be achieved with a discrete action, or a simple script that combines discrete actions, consider it a complex task.`,
            },
            availableCommand: {
              type: 'string',
              description: 'An available command format that would achieve the subtask in its entirety. If the subtask would require any additional actions, leave this field empty.',
            },
            impact: {
              type: 'number',
              description: 'A numerical score between 0-1 representing the estimated percentage this subtask contributes towards completing the overall objective.',
            },
            impactRationale: {
              type: 'string',
              description: 'A brief explanation justifying the assigned impact score, providing insight into why this subtask is important for the overall objective.',
            },
            feasibility: {
              type: 'number',
              description: 'A numerical score between 0-1 representing the likelihood that the AI agent can complete this subtask independently, considering current capabilities and potential for writing new ones.',
            },
            feasibilityRationale: {
              type: 'string',
              description: "A brief explanation justifying the assigned feasibility score, detailing why the task is considered more or less feasible based on the AI's current and potential capabilities.",
            },
            executionOrder: {
              type: 'number',
              description: "The order in which the subtask should be executed, relative to the other subtasks on the same level. The first subtask should have an execution order of 1. If the subtask can be executed independently of other subtasks, order by impact.",
            },
          },
          required: ['objective', 'category', 'availableCommand', 'impact', 'impactRationale', 'feasibility', 'feasibilityRationale', 'executionOrder'],
        },
      },
    },
  };
  const userMessage: Message = {
    role: 'user',
    content: promptCreateSubtasks(objective, tree, allRelevantCommands),
  };
  const functionCall = await callFunction('', [userMessage], [functionDefinition], functionDefinition.name);
  return functionCall.input.subtasks.map((subtask: any) => { 
    const command = subtask.availableCommand && subtask.availableCommand.trim() !== '' ? subtask.availableCommand : undefined;
    const category = command ? TaskCategory.Discrete : subtask.category;
    return {
      objective: subtask.objective,
      category: category,
      command: command,
      impact: subtask.impact,
      impactRationale: subtask.impactRationale,
      feasibility: subtask.feasibility,
      feasibilityRationale: subtask.feasibilityRationale,
      executionOrder: subtask.executionOrder,
      subtasks: [],
      parent,
    };
  });
}

export function findPlan(name: string): Plan | undefined {
  return allPlans.find(plan => plan.name === name);
}

export function getTreeStructure(plan: Plan): string {
  const lines = [] as string[];
  function logSubtasks(subtasks: Task[], prefix: string, depth: number): void {
    subtasks.forEach((subtask, index) => {
      const currentPrefix = depth > 1 ? `${prefix}.${index + 1}` : `${index + 1}`;
      // lines.push(`${' '.repeat(depth)}${currentPrefix}. ${subtask.objective}`);
      lines.push(`${' '.repeat(depth)}${currentPrefix}. ${subtask.objective} (${subtask.command ? subtask.command : subtask.category})`);
      if (subtask.subtasks.length > 0) {
        logSubtasks(subtask.subtasks, currentPrefix, depth + 1);
      }
    });
  }

  lines.push(`Plan: ${plan.name}`);
  lines.push(`${plan.task.objective}`);
  logSubtasks(plan.task.subtasks, '', 1);
  return lines.join('\n');
}

function isTaskComplete(task: Task): boolean {
  if (task.subtasks.length === 0) {
    return task.command !== undefined;
  }
  return task.subtasks.every(subtask => isTaskComplete(subtask) || isTaskBelowImpactThreshold(subtask));
}

function isTaskBelowImpactThreshold(task: Task): boolean {
  const threshold = 0.1;

  let impact = task.impact;
  let parent = task.parent;
  while (parent) {
    impact *= parent.impact;
    parent = parent.parent;
  }
  return impact < threshold;
}

function findLeastFeasibleIncompleteSubtask(task: Task): Task | undefined {
  if (isTaskComplete(task)) return undefined;

  let leastFeasibleSubtask = task;
  let leastFeasibleScore = 1;

  let subtasks = task.subtasks;

  while (subtasks.length > 0) {
    for (let subtask of subtasks) {
      leastFeasibleScore = 1;
      if (isTaskComplete(subtask)) continue;
      if (subtask.feasibility < leastFeasibleScore) {
        leastFeasibleScore = subtask.feasibility;
        leastFeasibleSubtask = subtask;
      }
    }

    subtasks = leastFeasibleSubtask.subtasks || [];
  }
  return leastFeasibleSubtask;
}

function calculateFeasibility(tasks: Task[]): number {
  if (tasks.length === 0) {
    return 1; // Return 1 (fully feasible) if there are no subtasks
  }

  let weightedProduct = 1;
  let totalImpact = 0;

  for (const task of tasks) {
    const impact = Math.max(task.impact, 0.0001); // Avoid zero impact
    const feasibility = Math.max(task.feasibility, 0.0001); // Avoid zero feasibility

    weightedProduct *= Math.pow(feasibility, impact);
    totalImpact += impact;
  }

  return Math.pow(weightedProduct, 1 / totalImpact);
}

export async function planAndExecute(description: string): Promise<boolean> {
  let plan = findPlan(description);
  if (!plan) {
    plan = await createPlanAndTasks(description);
  }

  while (!isTaskComplete(plan.task)) {
    const result = await continuePlanning(plan);
    if (!result) {
      return false;
    }
  }

  return true;
}

export async function createPlanAndTasks(description: string): Promise<Plan> {
  const relevantCommands = await identifyRelevantCommands(description);
  // console.log(`Relevant commands:\n${relevantCommands.join('\n')}`);

  const plan = await createPlan(description, relevantCommands);
  const tree = getTreeStructure(plan);
  const subtasks = await createSubtasks(plan.task.objective, plan.task, tree, relevantCommands);
  plan.task.subtasks = subtasks;
  allPlans.push(plan);
  saveAllPlansToFile();

  const updatedTree = getTreeStructure(plan);
  console.log(`\n\n${updatedTree}`);

  return plan;
}

export async function continuePlanning(plan: Plan): Promise<boolean> {
  // Check for any incomplete manual tasks on the least feasible path

  const nextTask = findLeastFeasibleIncompleteSubtask(plan.task);
  if (!nextTask) {
    logger.log(`Error: Can't find next task on incomplete plan: "${plan.name}"`);
    return false;
  }
  console.log(`Next Task: ${nextTask?.objective}`);
  console.log(`Feasibility: ${nextTask?.feasibility}`);
  console.log(`Rationale: ${nextTask?.feasibilityRationale}`);
  console.log(`Category: ${nextTask?.category}`);

  if (nextTask.category === TaskCategory.Manual) {
    nextTask.command = `notification "Human Intervention Required" "Please help me complete the following task: ${nextTask.objective} ${nextTask.feasibilityRationale}"`;
  } else if (nextTask.category !== TaskCategory.Complex) {
    nextTask.command = `create command "${nextTask.objective}"`;
  } else {
    const parentTask = nextTask?.parent;
    if (!parentTask) {
      logger.log(`Error: No parent task found for subtask: "${nextTask.objective}"`);
      return false;
    }
    const relevantCommands = await identifyRelevantCommands(nextTask.objective);

    const tree = getTreeStructure(plan);
    const subtasks = await createSubtasks(nextTask.objective, nextTask, tree, relevantCommands);
    nextTask.subtasks = subtasks;

    // TODO traverse the tree and update feasibility scores
    const revisedFeasibility = calculateFeasibility(nextTask.subtasks);
    console.log(`Revised feasibility: ${revisedFeasibility}`);

    nextTask.feasibility = revisedFeasibility;
  }

  saveAllPlansToFile();

  const updatedTree = getTreeStructure(plan);
  console.log(`\n\n${updatedTree}`);

  return true;
}

export async function savePlanAsCommand(plan: Plan): Promise<boolean> {
  // validate all leaf nodes have commands
  const leafNodes = [] as Task[];
  function findLeafNodes(task: Task): void {
    if (task.subtasks.length === 0) {
      leafNodes.push(task);
    } else {
      task.subtasks.forEach(subtask => findLeafNodes(subtask));
    }
  }
  findLeafNodes(plan.task);

  for (const leafNode of leafNodes) {
    if (!leafNode.command) {
      logger.log(`Error: No command found for subtask: "${leafNode.objective}"`);
      return false;
    }
  }

  // save plan as command
  const newCommand = {
    format: plan.name,
    description: plan.task.objective,
    type: CommandType.Sequence,
    sequence: leafNodes.map(leafNode => leafNode.command) as CommandInput[],
  } as Command;

  const filename = plan.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/ /g, '-').replace(/\s/g, '').toLowerCase() + '.json5';
  saveCommandToFile(newCommand, filename);

  return true;
}
