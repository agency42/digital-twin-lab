# Digital Twin Lab - Prompt Documentation

This document provides a comprehensive overview of all prompts used in the Digital Twin Lab platform. As a prompt engineering playground, complete transparency about what is sent to the model is essential.

## Terminology and Concepts

In Digital Twin Lab, several key terms are used to describe different aspects of the system:

- **Digital Twin**: The overall AI representation of a person's identity, voice, and behavior
- **Character/Personality Card**: The attributes that define WHO the digital twin is (traits, voice, background)
- **Instructions**: The directives that define HOW the digital twin should respond (behavior rules, output format)
- **Prompt Template**: The complete structure containing both the character card and instructions

These concepts work together in a nested relationship:

```
Prompt Template
├── Character/Personality Card (identity, traits, voice, background)
├── Instructions (directives, platform-specific guidance)
└── Together form a Digital Twin
```

This structure allows for maximum flexibility - you can reuse the same character card with different instruction sets, or apply the same instructions to different character cards.

## Prompt Template Structure

The core of Digital Twin Lab is the prompt template structure, which serves as the system prompt for all generations. This structure can be organized in different ways:

### Option 1: Nested Structure
```json
{
  "character": {
    "name": "Example Name",
    "handle": "@handle",
    "background": {
      "identity": "Background information...",
      "origin_story": "Origin details...",
      "worldview": "Perspective on the world..."
    },
    "personality_traits": [
      "Trait 1",
      "Trait 2"
    ],
    "voice_characteristics": {
      "tone": "Description of tone",
      "pace": "Description of pace",
      "language_style": "Description of language style"
    }
  },
  
  "generation": {
    "directives": [
      "NEVER break character. You ARE [name], not an AI simulating [name].",
      "NEVER narrate actions (no '*clears throat*', etc.)",
      "NEVER provide meta-commentary or explain your response",
      "NEVER ask for feedback on your performance",
      "OUTPUT ONLY what [name] would actually say/post - nothing more"
    ],
    "platform_instructions": {
      "twitter": "Generate a tweet that reflects my authentic voice and style. Limit to 280 characters.",
      "linkedin": "Generate a professional LinkedIn post that maintains my authentic voice.",
      "blog": "Generate a blog post with a title that reflects my writing style. Include a compelling title."
    },
    "default_instruction": "Optional fallback instruction if no platform-specific instructions exist",
    "output_format": {
      "twitter": "Output only the tweet text. No introductions, no commentary.",
      "linkedin": "Output only the post content. No introduction, no commentary.",
      "blog": "Output the blog post with a title. No introduction, no commentary."
    }
  }
}
```

### Option 2: Flat Structure
```json
{
  "name": "Example Name",
  "handle": "@handle",
  "background": {...},
  "personality_traits": [...],
  "voice_characteristics": {...},
  "directives": [...],
  "platform_adaptations": {
    "twitter": {
      "content_focus": "Topics for this platform",
      "posting_style": "Style for this platform",
      "format": "Format guidelines",
      "generation_instructions": "Generate a tweet that reflects my authentic voice and style."
    },
    "linkedin": {...},
    "blog": {...}
  },
  "main_goal": "Optional fallback instruction if no platform-specific instructions exist"
}
```

Both structures work with our system - you can organize your prompt template in whichever way makes the most sense for your use case.

## Digital Twin Lab as a Prompt Engineering Playground

Digital Twin Lab is designed as a playground for prompt engineering, allowing you to:

1. **Experiment with prompt structures**: Test different JSON structures to see which produces the best results
2. **See exactly what prompts are used**: All instructions sent to the model are visible and customizable
3. **Compare results across platforms**: Generate content for different platforms using the same base character
4. **Iterate rapidly**: Make small changes to prompts and immediately see the effects
5. **Maintain complete control**: No hidden prompts or instructions are added by the system

## How Prompts Are Constructed

### Content Generation

When you generate content, the system:

1. Takes your complete prompt template JSON as the system prompt
2. Looks for generation instructions in this priority order:
   - `platform_adaptations.[medium].generation_instructions` or `generation.platform_instructions.[medium]`
   - `[medium]_instructions` (e.g., `twitter_instructions`)
   - `generation_instructions` or `generation.default_instruction`
   - `main_goal`
   - If none found, uses a simple "Generate content for [medium]"

3. Displays the exact instruction used in the UI after generation

No additional prompts or instructions are added by the backend beyond what's in your JSON.

### Character Card Generation

When generating a character card from content, the system uses:

1. Your content (text, images, etc.)
2. A template for the JSON structure
3. Instructions to Claude to analyze your content and generate a card in that structure

This process is fully transparent - the card shown is exactly what was generated.

## Example Prompts

### Twitter Generation

Input:
```json
{
  "character": {
    "name": "Ken"
  },
  "generation": {
    "platform_instructions": {
      "twitter": "Generate a tweet limited to 280 characters that sounds like me."
    }
  }
}
```

What's sent to the model:
- System prompt: Your entire prompt template JSON
- User message: "Generate a tweet limited to 280 characters that sounds like me."

### LinkedIn Generation

Input:
```json
{
  "name": "Ken",
  "main_goal": "Write professionally but authentically"
}
```

What's sent to the model:
- System prompt: Your entire prompt template JSON
- User message: "Write professionally but authentically"

## How to View and Edit Prompts

1. All prompts are visible in the UI
2. The instruction used for generation is shown below each generated content
3. You can modify your prompt template JSON directly in the system prompt editor
4. The prompt structure (including platform-specific instructions) is stored in the database

## Debugging Prompts

Based on the logs shown in the system, we can see that without clear directives, Claude tends to add metadiscourse like "*clears throat and cracks fingers*" and asks for feedback. 

To prevent this, make sure your JSON includes explicit directives like:

```json
"directives": [
  "NEVER narrate actions (no '*clears throat*', etc.)",
  "NEVER provide meta-commentary",
  "NEVER ask for feedback on your response",
  "OUTPUT ONLY what the character would actually say/post"
]
```

Remember that the system uses the exact instructions from your JSON with no additional processing, giving you complete control over the prompt engineering process. 