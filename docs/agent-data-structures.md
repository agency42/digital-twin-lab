# Agent Data Structures

This document outlines the data structures used for configuring agents, instructions, and related components in the Digital Twin Lab project.

## Agent Instruction Interface

The Agent Instruction Interface is designed to specify and structure tasks for autonomous agents. This interface is JSON-compatible and supports automation systems, AI-driven applications, and other intelligent workflows.

### Core Structure

```json
{
  "instruction": "string", // The task to be performed
  "mainCharacter": "string", // The entity executing the task
  "mainGoal": "string", // The objective of the task
  "parameters": {
    "description": "string", // Description of the task
    "inputs": {
      "key1": "value1", // Input parameters
      "key2": "value2"
    },
    "outputs": {
      "expectedType": "string", // Expected output format
      "destination": "string" // Storage location of the output
    },
    "execution": {
      "priority": "integer", // Task priority level
      "dependencies": ["string"], // List of dependencies
      "retries": "integer", // Number of retries on failure
      "timeout": "integer" // Time before timeout
    },
    "agent": {
      "capabilities": ["string"], // Required agent skills
      "stateTracking": {
        "required": "boolean", // Whether state tracking is needed
        "variables": ["string"] // Tracked variables
      },
      "learning": {
        "enabled": "boolean", // Whether learning is enabled
        "feedbackEndpoint": "string" // Endpoint for feedback
      }
    }
  },
  "metadata": {
    "id": "string", // Unique task ID
    "createdBy": "string", // Creator of the instruction
    "timestamp": "string" // Timestamp of creation
  }
}
```

## Type Definitions

### Character

```tsx
type Character = {
  id: string; // Unique identifier
  agent_id: string; // Public unique identifier
  botName: string; // Agent name
  sytem_prompt: string || Prompt_config;
  // --- OPTIONALS --- //
  version?: number; // Version number of the Agent
  api_key?: string; // key that can be used for the character
  memory_system_prompt?: string || []Prompt_config; // Memory prompt configuration
  summary_system_prompt?: string || []Prompt_config; // Summary configuration
  primary_model?: string; // Primary model in use
  logic_model_url?: string; // URL for logic model
  image_model_url?: string; // URL for image processing model
  lora_url?: string; // URL for LoRA tuning
  boredom?: number; // Boredom factor influencing agent behavior
  tools?: Tool[];
};
```

### Prompt_config

```tsx
type Prompt_config = {
  id: string; // Unique identifier
  content: string;
  image: string;
  role: string; // user | system
};
```

### Inference_Parameters

```tsx
type Inference_Parameters = {
  prompt_config: Prompt_config;
  tools: Tool[];
};
```

### Tool

```tsx
type Tool = {
  id: string; // Tool ID
  type: string;
  function: Function_config;
};
```

### Datasets

```tsx
type Dataset = {
  id: string; // Dataset ID
  title: string; // Dataset title
  body: string; // Dataset body/content
  data: unknown | unknown[]; // The dataset itself
  enabled: boolean; // Whether the dataset is active
  live: boolean; // Whether the dataset is live
  ownershipType?: string; // Type of ownership (optional)
  orgId: string; // Organization ID
  source: string; // Source of the dataset
  type: string; // Dataset type
};
```

## Content Medium Instructions

The application supports different content mediums, each with its own instruction set:

1. **Chat** - Instructions for conversational interactions
2. **Blog/Article** - Instructions for long-form content creation
3. **Tweet** - Instructions for short-form social media content
4. **LinkedIn** - Instructions for professional networking content

Each medium can have specific instruction configurations and examples that adhere to the Agent Instruction Interface structure above. 