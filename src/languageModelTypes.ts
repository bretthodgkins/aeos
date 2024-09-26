

export type Message = {
  role: string;
  content: string;
};

export type MessageOptions = {
  maxTokens: number;
  temperature: number;
};

export type FunctionProperty = {
  type: string;
  description: string;
  items?: Record<string, any>;
};

export type FunctionDefinition = {
  name: string;
  description: string;
  properties: Record<string, FunctionProperty>;
  required: string[];
};

export type FunctionCall = {
  name: string;
  input: Record<string, any>;
};
