# Claude Integration

This document details how the Anthropic Claude API is integrated into the Digital Twin Lab system.

## Overview

The Digital Twin Lab leverages Claude's capabilities for:

1. **Content Analysis**: Analyzing user-provided content to extract style, tone, and topic preferences
2. **Character Card Generation**: Creating digital twin personas based on user content and preferences
3. **Content Generation**: Producing new content that matches the user's style and persona
4. **Interactive Conversations**: Enabling chat interactions with the digital twin

## Implementation Details

### API Integration

Claude is integrated via the Anthropic API with implementations in:
- `src/server/api/claude.ts`: Primary API interaction methods
- `src/server/services/claudeService.ts`: Service layer abstracting Claude-specific logic

### Prompt Engineering

The system uses structured prompts to guide Claude's responses:

1. **Character Card Prompts**: Templates that instruct Claude on how to analyze content and create a digital twin persona
2. **Content Generation Prompts**: Templates for generating content in specific formats (tweets, LinkedIn posts, etc.)
3. **Conversation Prompts**: Templates for maintaining consistent persona during interactive conversations

### Prompt Structure

Prompts are constructed with:

- Character card information (persona details)
- Specific instructions for the current task
- Examples of desired outputs
- Context from user inputs or previous interactions
- The main task or question

### Example Prompt Construction

```javascript
function formatPrompt(characterCard, instructions, examples, mainGoal) {
  // Construct prompt components with appropriate formatting
  return `${characterCard}

${instructions}

${examples}

${mainGoal}`;
}
```

## Token Management

The system manages Claude's token usage by:

1. Calculating approximate token counts for inputs
2. Truncating content when necessary to stay within limits
3. Prioritizing more recent/relevant content when limits are approached
4. Providing appropriate context windows for conversational interactions

## Error Handling

Claude API interactions include robust error handling for:

- API connection issues
- Rate limiting and quota management
- Malformed responses
- Content policy violations
- Timeout management

## Future Improvements

Planned enhancements to the Claude integration include:

1. Implementing more sophisticated prompt templates
2. Adding support for more content types
3. Improving token efficiency through better content summarization
4. Implementing feedback loops to improve generation quality over time
5. Exploring Claude's tool use capabilities for more complex workflows

## Configuration

Claude API settings are managed through environment variables:

- `ANTHROPIC_API_KEY`: API authentication key
- `CLAUDE_MODEL`: Model version to use (default: claude-3-opus-20240229)
- `MAX_TOKENS`: Maximum tokens to generate in responses
- `TEMPERATURE`: Creativity setting (0.0-1.0)

For more information on the Anthropic Claude API, refer to the [official documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api). 