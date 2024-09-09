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


type Task = {
  name: string;
  objective: string;
  subtasks: Subtask[];
};

type Subtask = {
  description: string;
  impact: number;
  impactRationale: string;
  feasibility: number;
  feasibilityRationale: string;
  subtasks: Subtask[];
  parent?: Task | Subtask;
};

const taskSystemMessage = `
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

const subtaskSystemMessage = `
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

1. A clear description of the task.
2. An impact score: A number between 0-100 representing an estimate percentage toward completing the overall objective. The combined sum of all subtask scores should not exceed 100, but could be less if there could be additional work required.
3. An impact rationale: A brief explanation justifying the assigned impact score.
4. A feasibility score: A number between 0-100 representing the likelihood that this AI agent could complete the task independently, considering its current capabilities and the potential to write new ones. 
   - 100: Task can be completed entirely by executing available commands.
   - 51-99: Additional commands need to be written, but could technically be achieved by executing code without human intervention.
   - 0-50: There are unknowns, further research is required, or human intervention is necessary.
5. A feasibility rationale: A brief explanation justifying the assigned feasibility score.

Remember:
- This task is solely for creating subtasks with estimated scores and rationales. Do not attempt to prioritize tasks, execute them, or engage in conversation about them.
- When estimating feasibility, consider both the current capabilities of the AI agent and its ability to write new capabilities as needed. Any task requiring human input or containing significant unknowns should score 50 or below.
- Subtasks can encompass multiple actions and will be broken down further in subsequent steps.
- Provide clear and concise rationales for both impact and feasibility scores to explain your reasoning.
- Ensure that the total of all impact scores is less than 100, typically around 80-90, to account for unforeseen aspects of the project.

Your output will be processed by a separate tool, so focus on providing accurate and relevant information for each subtask as described above.
`;

let allTasks = [] as Task[];

export function loadAllTasks() {
  const userTasks = getUserTasks();
  allTasks = [
    ...userTasks,
  ];
  setAllParentReferences();
  logger.log(`Loaded ${allTasks.length} user-defined task${allTasks.length === 1 ? '' : 's'}`);
}

function getUserTasks(): Task[] {
  let taskList: Task[] = [];

  let files: any;
  const tasksDir = config.getTasksDirectory();
  try {
    files = fs.readdirSync(tasksDir);
  } catch(e: any) {
    logger.log(`Warning: Tasks directory not found at ${tasksDir}`);
    return [];
  }

  // Loop through the list of files
  for (const file of files) {
    // Check if the file is a JSON file
    if (file.endsWith('.json') || file.endsWith('.json5')) {
      const filePath = path.join(tasksDir, file);
      taskList = taskList.concat(getUserTasksFromFile(filePath));
    }
  }

  return taskList;
}

function getUserTasksFromFile(path: string): Task[] {
  logger.log(`Importing file: ${path}`);
  let inputRaw = fs.readFileSync(path);
  let inputJson: any;
  try {
    inputJson = JSON5.parse(inputRaw);
  } catch(e: any) {
    logger.log(`Error: Invalid task file: ${path}`);
    logger.log(e.toString());
    return [];
  }
  if (!inputJson.tasks || inputJson.tasks.length === 0) {
    logger.log(`Error: No tasks found in ${path}`);
    return [];
  }

  const namespace = inputJson.namespace ? `${inputJson.namespace}:` : '';
  // const namespaceRequiresApplication = inputJson.requires?.application;

  let taskList: Task[] = [];
  for (let inputTask of inputJson.tasks) {
    if (!inputTask.name || !inputTask.objective || inputTask.subtasks.length === 0) {
      notifications.push("Error", `Invalid task found in ${path}`);
      return [];
    }

    // const taskRequiresApplication = inputTask.requires?.application;
    // const requiresApplication = taskRequiresApplication || namespaceRequiresApplication;
    // const requiresExactMatch = inputTask.requires?.exactMatch || false;
    
    // TODO validate subtasks as imported
    const name = `${namespace}${inputTask.name}`;
    //logger.log(`Importing command: ${format}, requires application: ${requiresApplication}`);
    taskList.push({
      name,
      objective: inputTask.objective,
      subtasks: inputTask.subtasks,
      // requiresApplication: requiresApplication,
      // requiresExactMatch: requiresExactMatch,
    });
  }

  logger.log(`Imported ${taskList.length} tasks from ${path}`);
  return taskList;
}

function setAllParentReferences(): void {
  function traverseSubtasks(parent: Task | Subtask, subtasks: Subtask[]): void {
    for (const subtask of subtasks) {
      subtask.parent = parent;
      traverseSubtasks(subtask, subtask.subtasks);
    }
  }

  for (const task of allTasks) {
    traverseSubtasks(task, task.subtasks);
  }
}

function removeAllParentReferences(): Task[] {
  function removeParentFromSubtasks(subtasks: Subtask[]): Subtask[] {
    return subtasks.map(subtask => {
      // Create a new object without the parent property
      const { parent, ...subtaskWithoutParent } = subtask;
      
      // Recursively remove parent references from nested subtasks
      return {
        ...subtaskWithoutParent,
        subtasks: removeParentFromSubtasks(subtask.subtasks)
      };
    });
  }

  // Create a new task list with subtasks that have no parent references
  return allTasks.map(task => {
    // Recursively remove parent references from nested subtasks
    return {
      ...task,
      subtasks: removeParentFromSubtasks(task.subtasks)
    };
  });
}

function saveAllTasksToFile() {
  const tasksDirectory = config.getTasksDirectory();

  // Ensure the directory exists
  fs.mkdirSync(tasksDirectory, { recursive: true });

  // Remove parent references before saving to file
  const tasksWithoutParents = removeAllParentReferences();
  
  // Write the tasks to the file
  fs.writeFileSync(path.join(tasksDirectory, 'default.json5'), JSON5.stringify({ tasks: tasksWithoutParents }, null, 2));
}

async function createTask(description: string): Promise<Task> {
  const functionDefinition: FunctionDefinition = {
    name: 'createTask',
    description: "The createTask tool transforms a user-provided task description into a well-defined, actionable objective statement and a concise task name. This tool is designed to standardize task definitions, making them clear and executable for both human users and automated systems. It analyzes the user's input, extracts the core purpose, and formulates a structured output that can be easily integrated into task management systems or automation platforms.",
    properties: {
      objective: {
        type: 'string',
        description: "A clear, actionable statement that defines the task's goal. This statement is formulated to be specific, measurable, achievable, relevant, and time-bound (if applicable). It provides a comprehensive understanding of what needs to be accomplished, serving as a guide for task execution.",
      },
      name: {
        type: 'string',
        description: "A short, descriptive identifier for the task. This concise name captures the essence of the task in a few words, making it easily recognizable and referenceable. It's designed to be memorable and suitable for use in task lists, project management tools, or when invoking the task in automated systems.",
      },
    },
  };
  const userMessage: Message = {
    role: 'user',
    content: description,
  };
  const functionCall = await callFunction(taskSystemMessage, [userMessage], [functionDefinition]);
  return {
    name: functionCall.input.name,
    objective: functionCall.input.objective,
    subtasks: [],
  };
}

async function createSubtasks(task: Task): Promise<Subtask[]> {
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
            description: {
              type: 'string',
              description: 'A clear and concise explanation of the specific subtask to be accomplished.',
            },
            impact: {
              type: 'number',
              description: 'A numerical score between 0-100 representing the estimated percentage this subtask contributes towards completing the overall objective.',
            },
            impactRationale: {
              type: 'string',
              description: 'A brief explanation justifying the assigned impact score, providing insight into why this subtask is important for the overall objective.',
            },
            feasibility: {
              type: 'number',
              description: 'A numerical score between 0-100 representing the likelihood that the AI agent can complete this subtask independently, considering current capabilities and potential for writing new ones.',
            },
            feasibilityRationale: {
              type: 'string',
              description: "A brief explanation justifying the assigned feasibility score, detailing why the task is considered more or less feasible based on the AI's current and potential capabilities.",
            },
          },
          required: ['description', 'impact', 'impactRationale', 'feasibility', 'feasibilityRationale'],
        },
      },
    },
  };
  const userMessage: Message = {
    role: 'user',
    content: task.objective,
  };
  const functionCall = await callFunction(subtaskSystemMessage, [userMessage], [functionDefinition]);
  return functionCall.input.subtasks.map((subtask: any) => { 
    return {
      description: subtask.description,
      impact: subtask.impact,
      impactRationale: subtask.impactRationale,
      feasibility: subtask.feasibility,
      feasibilityRationale: subtask.feasibilityRationale,
      subtasks: [],
      parent: task,
    };
  });
}

function findTask(taskName: string): Task | undefined {
  return allTasks.find(task => task.name === taskName);
}

function findLeastFeasibleSubtask(task: Task): Subtask | undefined {
  let leastFeasibleSubtask: Subtask | undefined;
  let leastFeasibleScore = 100;

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

export async function createTaskAndSubtasks(description: string): Promise<boolean> {
  const task = await createTask(description);
  const subtasks = await createSubtasks(task);
  task.subtasks = subtasks;
  allTasks.push(task);
  saveAllTasksToFile();
  return true;
}

export async function continuePlanning(taskName: string): Promise<boolean> {
  const task = findTask(taskName);
  if (!task) {
    logger.log(`Error: Task not found: "${taskName}"`);
    return false;
  }

  const leastFeasibleSubtask = findLeastFeasibleSubtask(task);
  console.log(`Next subtask: ${leastFeasibleSubtask?.description}`);
  console.log(`Feasibility: ${leastFeasibleSubtask?.feasibility}`);
  console.log(`Rationale: ${leastFeasibleSubtask?.feasibilityRationale}`);

  const parentTask = leastFeasibleSubtask?.parent;
  if (parentTask && 'objective' in parentTask) {
    console.log(`Primary objective: ${parentTask.objective}`);
  } else {
    console.log(`Primary objective: ${parentTask?.description}`);
  }

  return true;
}
