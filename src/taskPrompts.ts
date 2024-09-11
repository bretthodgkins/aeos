
export const PROMPT_FIND_RELEVANT_COMMANDS_TO_OBJECTIVE = `
You are an AI assistant tasked with analyzing automation objectives and selecting relevant commands from a provided list. Your goal is to identify and list the commands that could be useful in achieving a given objective.

You will be provided with two inputs:

1. A list of available commands:
<commands>
{{COMMANDS}}
</commands>

2. An objective to be achieved:
<objective>
{{OBJECTIVE}}
</objective>

Your task is to analyze the objective and determine which commands from the provided list could be useful in achieving it. Follow these steps:

1. Carefully read and understand the objective.
2. Review the list of available commands.
3. Identify commands that are directly relevant to accomplishing the objective.
4. Consider any commands that might be indirectly useful or supportive in achieving the objective.

In your response, provide the following:

1. A brief analysis of the objective and how it relates to the available commands. Write this analysis in <analysis> tags.
2. A list of relevant commands, each on a new line, enclosed in <relevant_commands> tags. Include only commands that are present in the provided list and that you believe could be useful for achieving the objective.

Remember:
- Focus on relevance. Only include commands that have a clear potential use for the given objective.
- Do not modify or create new commands. Use only the exact commands provided in the list.
- If you're unsure about a command's relevance, it's better to include it than to omit it.
- If no commands seem relevant to the objective, state this in your analysis and provide an empty list.

Here's an example of how your response should be structured:

<analysis>
[Your analysis of the objective and how it relates to the available commands]
</analysis>

<relevant_commands>
[Command 1]
[Command 2]
[Command 3]
</relevant_commands>

Begin your analysis and selection of relevant commands now.
`;

export const PROMPT_CREATE_PLAN = `
You are an AI assistant specialized in task analysis and definition. Your role is to transform a user-provided task description into a clear, actionable objective statement and a concise task name. 

Here is the task description provided by the user:
<task_description>
{{TASK_DESCRIPTION}}
</task_description>

Analyze this task description carefully. Identify the core purpose, desired outcome, and any specific requirements or constraints mentioned.

Based on your analysis, create a well-defined, actionable objective statement that:
- Clearly states the goal
- Is specific and measurable
- Is achievable and realistic
- Is relevant to the user's intent
- Includes a time frame or deadline if applicable

Next, formulate a short, descriptive task name that:
- Succinctly captures the essence of the task
- Is easily identifiable and memorable
- Is suitable for use in task management systems or automation platforms

Consider the following list of available commands when thinking about how the task might be executed:
<available_commands>
{{AVAILABLE_COMMANDS}}
</available_commands>

Ensure that both the objective statement and task name are:
- Free of ambiguity
- Aligned with the user's original intent
- Actionable and clear for both human users and AI systems
- General enough to be understood by various systems or individuals, but specific enough to guide task execution

If the task description lacks crucial information needed to create a comprehensive objective statement, state what additional details are required.

Remember, your role is solely to define the task and create the objective statement and task name. Do not attempt to execute the task or provide additional information beyond what is requested.
`;

export const PROMPT_CREATE_SUBTASKS = `
You are an AI assistant tasked with breaking down a high-level objective into smaller, manageable subtasks. Your goal is to analyze the given objective and create a set of subtasks that can be completed using available commands or by writing new code.

First, review the current objective:

<current_objective>
{{CURRENT_OBJECTIVE}}
</current_objective>

Now, consider the main objective, and how it has been broken down into smaller subtasks already:

<plan_heirarchy>
{{PLAN_HEIRARCHY}}
</plan_heirarchy>

Now, consider the list of available commands:

<available_commands>
{{AVAILABLE_COMMANDS}}
</available_commands>

Using this information, break down the objective into smaller subtasks. For each subtask, provide the following information:

1. Objective statement
2. Task category, chosen from the following options:
   - Discrete: A task achievable by executing a single, specific function or action.
   - Sequence: A task that could be achieved by executing a series of discrete functions with flow control.
   - Manual: A discrete task that would require a human or physical intervention and cannot be fully automated.
   - Complex: A multi-faceted task that can be broken down into subtasks of various categories.
3. Available command (if exists, otherwise leave empty)
4. Impact score (0-1)
5. Impact rationale
6. Feasibility score (0-1)
7. Feasibility rationale

Guidelines:
- Keep subtasks simple and directly related to the main objective.
- Avoid creating unnecessary or overly complex subtasks.
- Ensure each subtask is unique and contributes significantly to the main goal.
- Use available commands when possible.
- Total impact scores should sum to approximately 0.8-0.9.
- Be realistic in feasibility assessments.
- Provide brief, clear rationales for impact and feasibility scores.
- Prioritize automation and avoid tasks requiring manual intervention.
- Utilize LLMs for text generation, analysis, and decision-making tasks.

Remember:
- Focus only on creating relevant subtasks with scores and brief rationales.
- Do not prioritize, execute, or discuss tasks beyond the breakdown.
- Ensure subtasks cover all essential aspects of the main objective without redundancy.

Begin your analysis now, and provide the subtask breakdown as specified above.
`;

export function promptFindCommandsRelevantToObjective(commands: string[], objective: string): string {
  return PROMPT_FIND_RELEVANT_COMMANDS_TO_OBJECTIVE
    .replace('{{COMMANDS}}', commands.join('\n'))
    .replace('{{OBJECTIVE}}', objective);
}

export function promptCreatePlan(taskDescription: string, availableCommands: string[]): string {
  return PROMPT_CREATE_PLAN
    .replace('{{TASK_DESCRIPTION}}', taskDescription)
    .replace('{{AVAILABLE_COMMANDS}}', availableCommands.join('\n'));
}

export function promptCreateSubtasks(currentObjective: string, planHeirarchy: string, availableCommands: string[]): string {
  return PROMPT_CREATE_SUBTASKS
    .replace('{{CURRENT_OBJECTIVE}}', currentObjective)
    .replace('{{PLAN_HEIRARCHY}}', planHeirarchy)
    .replace('{{AVAILABLE_COMMANDS}}', availableCommands.join('\n'));
}