const fs = require('fs');
const path = require('path');
const JSON5 = require('json5')
import { callFunction } from "./anthropic";

import {
  FunctionCall,
  FunctionDefinition,
  Message,
} from "./functionCalling";
import config from './config';
import logger from "./logger";
import notifications from './notifications';


type Plan = {
  name: string;
  task: Task;
};

type Task = {
  objective: string;
  impact: number;
  impactRationale: string;
  feasibility: number;
  feasibilityRationale: string;
  subtasks: Task[];
  parent?: Task;
};

const planSystemMessage = `
You are an AI assistant specialized in task analysis and definition. Your role is to take a user-provided description of a task and transform it into a clear, actionable objective statement along with a concise task name.

Your responsibilities include:

1. Analyzing the user's task description to understand the core purpose and desired outcome.

2. Formulating a well-defined, actionable objective statement that:
   - Clearly states the goal
   - Is specific and measurable
   - Is achievable and realistic
   - Is relevant to the user's intent
   - Includes a time frame or deadline if applicable

3. Creating a short, descriptive task name that:
   - Succinctly captures the essence of the task
   - Is easily identifiable and memorable
   - Is suitable for use in task management systems or automation platforms

4. Ensuring that both the objective statement and task name are:
   - Free of ambiguity
   - Aligned with the user's original intent
   - Actionable and clear for both human users and AI systems

Remember:
- Focus solely on defining the task and creating the objective statement and task name. Do not attempt to execute the task or provide additional information beyond what is requested.
- If the user's description lacks crucial information, state what additional details are needed to create a comprehensive objective statement.
- Ensure that the objective statement and task name are general enough to be understood by various systems or individuals, but specific enough to guide task execution.

Your output will be used to initiate task execution in various systems, so clarity and accuracy are paramount."
`;

const taskSystemMessage = `
You are an LLM inside an open-source AI automation platform that harnesses the power of Large Language Models (LLMs) to build and run complex automations.

The platform is highly extendible, allowing users to create their own automations and provide examples of them being called using natural language. It supports a robust plugin system which adds capabilities such as:

- Computer vision
- OCR
- Image recognition
- Browser automation
- GUI automation
- Integrations with popular applications (e.g., Google Sheets, Google Drive, Notion, Slack, Hubspot, AWS, and many more)

The AI agents on the platform can create their own plans to achieve objectives. These plans can involve writing and deploying code to expand available capabilities, as well as collaborating with human users if assistance is needed.

Your specific task is to analyze a user-provided high-level objective and break it down into smaller, more manageable subtasks. Each subtask should be clearly defined and have a specific purpose.

For each subtask, you must provide:

1. A clear objective statement for the task.
2. An impact score: A number between 0 and 1 representing an estimate percentage toward completing the overall objective. The combined sum of all subtask scores should not exceed 1, but could be less if there could be additional work required.
3. An impact rationale: A brief explanation justifying the assigned impact score.
4. A feasibility score: A number between 0 and 1 representing the likelihood that this AI agent could complete the task independently, considering its current capabilities and the potential to write new ones. 
   - 1: Task can be completed entirely by executing available commands.
   - 0.7-0.9: Additional commands need to be written, but could technically be achieved by executing code without human intervention.
   - 0.4-0.6: There are some unknowns or further research is required, but the task could potentially be completed without human intervention.
   - 0.1-0.3: Significant unknowns exist or limited human intervention is likely necessary.
   - 0: Any human input is required or there are significant unknowns.
5. A feasibility rationale: A brief explanation justifying the assigned feasibility score.

Remember:
- This task is solely for creating subtasks with estimated scores and rationales. Do not attempt to prioritize tasks, execute them, or engage in conversation about them.
- When estimating feasibility, be highly conservative. Any task requiring human input or containing significant unknowns should score 0. If a subtask appears to be at least 3 steps away from an executable command, it should score very low (0.1-0.3).
- The product of the subtask feasibility scores should roughly equal the feasibility score of the parent task. After assigning feasibility scores to subtasks, adjust the parent task's feasibility score to reflect this relationship.
- Subtasks can encompass multiple actions and will be broken down further in subsequent steps.
- Provide clear and concise rationales for both impact and feasibility scores to explain your reasoning.
- Ensure that the total of all impact scores is less than 1, typically around 0.8-0.9 to account for unforeseen aspects of the project.

Your output will be processed by a separate tool, so focus on providing accurate and relevant information for each subtask as described above.


Additional guidelines to reduce repetition and overlap:

1. Ensure each subtask is unique and does not overlap with others. Avoid repeating objectives or creating subtasks that are too similar to one another.
2. Use a hierarchical structure for subtasks, with more specific tasks nested under broader ones. This helps to organize related tasks without repetition.
3. Consolidate similar or related tasks into a single, more comprehensive subtask when possible. This helps to reduce redundancy and create more meaningful task divisions.
4. Each subtask should have a minimum impact score of 0.1. Tasks with lower impact should be combined with other related tasks or omitted if truly trivial.
5. Before finalizing the task breakdown, review the entire structure to identify and eliminate any remaining repetitions or overlaps.

Remember, the goal is to create a clear, concise, and non-repetitive task breakdown that effectively captures all necessary steps to achieve the main objective.
`;

const taskUserMessage = `
Objective:  $OBJECTIVE

Tree structure context:
$TREE
`; 

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

async function createPlan(description: string): Promise<Plan> {
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
    },
  };
  const userMessage: Message = {
    role: 'user',
    content: description,
  };
  const functionCall = await callFunction(planSystemMessage, [userMessage], [functionDefinition], functionDefinition.name);
  return {
    name: functionCall.input.name,
    task: {
      impact: 1,
      impactRationale: '',
      feasibility: 1,
      feasibilityRationale: '',
      objective: functionCall.input.objective,
      subtasks: [],
    }
  };
}

async function createSubtasks(objective: string, maxImpact: number, parent: Task, tree: string): Promise<Task[]> {
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
          },
          required: ['objective', 'impact', 'impactRationale', 'feasibility', 'feasibilityRationale'],
        },
      },
    },
  };
  const userMessageContent = taskUserMessage.replace('$OBJECTIVE', objective).replace('$TREE', tree);
  const userMessage: Message = {
    role: 'user',
    content: userMessageContent,
  };
  const functionCall = await callFunction(taskSystemMessage, [userMessage], [functionDefinition], functionDefinition.name);
  return functionCall.input.subtasks.map((subtask: any) => { 
    return {
      objective: subtask.objective,
      impact: subtask.impact * maxImpact,
      impactRationale: subtask.impactRationale,
      feasibility: subtask.feasibility,
      feasibilityRationale: subtask.feasibilityRationale,
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
      lines.push(`${' '.repeat(depth)}${currentPrefix}. ${subtask.objective}`);
      if (subtask.subtasks.length > 0) {
        logSubtasks(subtask.subtasks, currentPrefix, depth + 1);
      }
    });
  }

  lines.push(`${plan.task.objective}`);
  logSubtasks(plan.task.subtasks, '', 1);
  return lines.join('\n');
}

function findLeastFeasibleSubtask(task: Task): Task {
  let leastFeasibleSubtask = task;
  let leastFeasibleScore = 1;

  let subtasks = task.subtasks;

  while (subtasks.length > 0) {
    for (let subtask of subtasks) {
      if (subtask.feasibility < leastFeasibleScore) {
        leastFeasibleScore = subtask.feasibility;
        leastFeasibleSubtask = subtask;
      }
    }
    subtasks = leastFeasibleSubtask?.subtasks || [];
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

export async function createPlanAndTasks(description: string): Promise<boolean> {
  const plan = await createPlan(description);
  const tree = getTreeStructure(plan);
  const subtasks = await createSubtasks(plan.task.objective, 1, plan.task, tree);
  plan.task.subtasks = subtasks;
  allPlans.push(plan);
  saveAllPlansToFile();
  return true;
}

export async function continuePlanning(plan: Plan): Promise<boolean> {
  const leastFeasibleSubtask = findLeastFeasibleSubtask(plan.task);
  if (!leastFeasibleSubtask) {
    logger.log(`Error: No subtasks found for plan: "${plan.name}"`);
    return false;
  }

  const parentTask = leastFeasibleSubtask?.parent;
  if (!parentTask) {
    logger.log(`Error: No parent task found for subtask: "${leastFeasibleSubtask.objective}"`);
    return false;
  }
  console.log(`\n\nPrimary objective: ${plan.task?.objective}`);
  console.log(`Next subtask: ${leastFeasibleSubtask?.objective}`);
  console.log(`Feasibility: ${leastFeasibleSubtask?.feasibility}`);
  console.log(`Rationale: ${leastFeasibleSubtask?.feasibilityRationale}`);

  const tree = getTreeStructure(plan);
  const subtasks = await createSubtasks(leastFeasibleSubtask.objective, leastFeasibleSubtask.impact, leastFeasibleSubtask, tree);
  leastFeasibleSubtask.subtasks = subtasks;

  const revisedFeasibility = calculateFeasibility(leastFeasibleSubtask.subtasks);
  console.log(`Revised feasibility: ${revisedFeasibility}`);

  leastFeasibleSubtask.feasibility = revisedFeasibility;
  saveAllPlansToFile();

  const updatedTree = getTreeStructure(plan);
  console.log(`\n\n${updatedTree}`);

  return true;
}
