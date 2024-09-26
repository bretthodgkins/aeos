import { v4 as uuidv4 } from 'uuid';

import { 
  FunctionDefinition,
  Message,
} from '../src/languageModelTypes';
import { createMessage, callFunction } from "../src/languageModels";
import { promptCreatePlan } from "../src/taskPrompts";
import config from '../src/config';

import { 
  loadAllPlans,
  identifyRelevantCommands,
  identifySequenceOfCommands,
  removeParentsFromPlans,
  removeParentsFromTasks,
  removeParentFromTask,
  Plan,
  setAllPlans,
  addPlan,
  Task,
  TaskCategory,
} from '../src/plans';

import { 
  loadAllCommands,
} from '../src/commands';

// Define model providers and their test status
// Set to true/false to skip these tests
const modelProviders = [
  { name: 'anthropic', isActive: false },
  { name: 'openai', isActive: false },
];


jest.setTimeout(100000); // 100 seconds

describe('removeParentsFromPlans', () => {
   beforeEach(() => {
    setAllPlans([]);
  });

  it('should remove parent references from all plans', () => {
    const mockTask: Task = {
      id: uuidv4(),
      objective: 'Test task',
      category: TaskCategory.Discrete,
      impact: 5,
      impactRationale: 'Test impact',
      feasibility: 8,
      feasibilityRationale: 'Test feasibility',
      executionOrder: 1,
      subtasks: [],
    };

    const mockPlan: Plan = {
      name: 'Test Plan',
      task: {
        ...mockTask,
        subtasks: [
          {
            ...mockTask,
            parent: mockTask,
            subtasks: [
              {
                ...mockTask,
                parent: mockTask,
              },
            ],
          },
        ],
      },
      additionalInfoNeeded: 'None',
      currentState: {
        currentTaskId: mockTask.id,
        completedTasks: [],
      }
    };

    addPlan(mockPlan);

    const result = removeParentsFromPlans();

    expect(result).toHaveLength(1);
    expect(result[0].task.subtasks[0].parent).toBeUndefined();
    expect(result[0].task.subtasks[0].subtasks[0].parent).toBeUndefined();
  });

  it('should handle empty allPlans array', () => {
    setAllPlans([]);
    const result = removeParentsFromPlans();
    expect(result).toEqual([]);
  });

  it('should handle plans with no subtasks', () => {
    const mockTask = {
      id: uuidv4(),
      objective: 'Test task',
      category: TaskCategory.Discrete,
      impact: 5,
      impactRationale: 'Test impact',
      feasibility: 8,
      feasibilityRationale: 'Test feasibility',
      executionOrder: 1,
      subtasks: [],
    };
    const mockPlan: Plan = {
      name: 'Test Plan',
      task: mockTask,
      additionalInfoNeeded: 'None',
      currentState: {
        currentTaskId: mockTask.id,
        completedTasks: [],
      }
    };

    addPlan(mockPlan);

    const result = removeParentsFromPlans();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockPlan);
  });
});


describe('Plan Evals', () => {
  // Iterate over each model provider
  modelProviders.forEach(({ name, isActive }) => {
    // Conditionally skip tests if the provider is inactive
    const describeFn = isActive ? describe : describe.skip;

    describeFn(`${name}`, () => {
      beforeEach(() => {
        config.setConfigurationSetting('modelProvider', name);
      });

      describe('identifyRelevantCommands', () => {
        beforeAll(async () => {
          loadAllCommands();
          loadAllPlans();
        });

        xit('can identify relevant commands', async () => {
          const result = await identifyRelevantCommands('Get the latest news headlines, and summarise these in a Google document');
          console.log(JSON.stringify(result, null, 2));
          expect(result).toBeDefined();
        });
      });

      describe('identifySequenceOfCommands', () => {
        beforeAll(async () => {
          loadAllCommands();
          loadAllPlans();
        });

        it('can identify sequence of commands', async () => {
          const objective = `Create a file named "test.txt" with the content "Hello, World!", then read the file and verify its content.`;
          const result = await identifySequenceOfCommands(objective);
          console.log(JSON.stringify(result, null, 2));
          expect(result).toBeDefined();
        });
      });

    });
  });
});

