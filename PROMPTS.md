# Digital Twin Lab - Prompt Documentation

This document provides a comprehensive overview of all prompts used in the Digital Twin Lab platform. As a prompt engineering playground, complete transparency about what is sent to the model is essential.

## Terminology and Concepts

In Digital Twin Lab, the core components related to AI simulation are:

-   **Character Card**: A JSON object defining the core identity, traits, voice, and background of the digital twin. This is generated from user content and stored in the `character_cards` table.
-   **System Prompt**: The specific system message sent to the AI model for a given context (e.g., Chat or Post generation). This usually starts as the Character Card but can be customized per context. Stored in the `system_prompts` table.
-   **Instruction Template**: The specific user-level instructions or task details given to the AI for a context (e.g., "Generate a tweet under 280 characters"). Stored in the `instruction_templates` table.

These concepts work together:

1.  A base **Character Card** is generated.
2.  Default **System Prompts** (for Chat, Post, etc.) are created, initially matching the Character Card.
3.  Default **Instruction Templates** (for Chat, Post, etc.) are created.
4.  Users can customize the System Prompt and Instruction Template for each context (medium) independently via the UI.
5.  When interacting (chatting or generating content), the relevant *customized* (or default if not customized) System Prompt and Instruction Template for that context are retrieved from the database and used.

This allows for maintaining a core identity (Character Card) while tailoring the AI's system message and task instructions for different interaction types or platforms.

## Database Structure for Prompts

The backend now uses three main tables to manage these components:

1.  **`character_cards`**: Stores the generated JSON character cards. Includes an `is_current` flag to identify the active card for a user.
2.  **`system_prompts`**: Stores the system prompt text for different types (e.g., 'chat', 'post'). Includes an `is_custom` flag indicating if the user has modified it from the current character card.
3.  **`instruction_templates`**: Stores the instruction text for different types (e.g., 'chat', 'post').

## How Prompts Are Handled (Database-Driven Approach)

1.  **Character Card Generation:** Generated in the Content Library and saved to the `character_cards` table, marked as `is_current = 1`.
2.  **Default Creation:** When a new character card is saved, corresponding default entries are created/updated in `system_prompts` (matching the card data, `is_custom = 0`) and `instruction_templates` (with predefined default text) for each context ('chat', 'post').
3.  **Loading Data (Generations Tab):** When a user navigates to the Generations tab or switches the medium ('chat'/'post'), the frontend calls `/api/prompts/:userId/generations-data?type=...`.
    *   This endpoint retrieves the *current* `character_card`.
    *   It retrieves the specific `system_prompt` for the requested `type`.
    *   It retrieves the specific `instruction_template` for the requested `type`.
    *   This data is sent to the frontend.
4.  **Editing & Saving:**
    *   Users edit the System Prompt or Instructions in the respective text areas.
    *   Clicking "Save Prompt" calls `PUT /api/prompts/:userId/system-prompts/:type`.
        *   The backend saves the text and sets `is_custom = 1` if the text differs from the current character card.
    *   Clicking "Save Instructions" calls `PUT /api/prompts/:userId/instruction-templates/:type`.
        *   The backend saves the instruction text.
5.  **Resetting System Prompt:**
    *   Clicking the "Reset" button calls `POST /api/prompts/:userId/system-prompts/:type/reset`.
    *   The backend fetches the *current* character card data and updates the corresponding `system_prompts` record with that data, setting `is_custom = 0`.
6.  **Content Generation:**
    *   The frontend takes the *current text* from the System Prompt and Instruction editors.
    *   These are sent to the backend generation endpoint (e.g., `/api/chat/generate`).
    *   The backend uses these provided texts directly as the system message and user message/instruction for the AI model.

*This approach ensures that customizations are persisted in the database and correctly loaded based on the selected user and medium.* Transparency is maintained as the text used for generation is always what's visible in the editors.

### Character Card Generation

When generating a character card from content, the system uses:

1. Your content (text, images, etc.)
2. A template for the JSON structure (`data/character_card_template.json`)
3. Instructions to Claude to analyze your content and generate a card in that structure

This process is fully transparent - the card shown is exactly what was generated and saved in the `character_cards` table.

## Example Prompts (Conceptual)

### Twitter Generation Scenario

1.  User generates Character Card (saved in `character_cards`).
2.  Default System Prompt for 'post' created (matches card, `is_custom=0`).
3.  Default Instruction Template for 'post' created.
4.  User goes to Generations > Post tab.
    *   System Prompt editor loads the character card data.
    *   Instruction Editor loads the default post instruction.
5.  User modifies the Instruction text to: "Generate a tweet under 280 characters about prompt engineering."
6.  User clicks "Save Instructions". Backend updates `instruction_templates` for `user_id` and `type='post'`.
7.  User clicks "Generate Content".
    *   Frontend sends:
        *   `systemPrompt`: (Content of the System Prompt editor - the character card data)
        *   `userMessage`: "Generate a tweet under 280 characters about prompt engineering."
    *   Backend sends these to the AI model.

### Chat Interaction Scenario

1.  User generates Character Card.
2.  Defaults created for 'chat' type.
3.  User goes to Generations > Chat tab.
    *   System Prompt editor loads character card data.
    *   Instruction Editor loads default chat instruction.
4.  User modifies the System Prompt editor (e.g., adding a directive like "Always be slightly sarcastic").
5.  User clicks "Save Prompt". Backend updates `system_prompts` for `user_id` and `type='chat'`, setting `is_custom=1`.
6.  User starts a chat.
    *   The *modified* system prompt is fetched and used for the chat session.
    *   The default chat instruction may or may not be explicitly used depending on the `chatRoutes` logic.

## How to View and Edit Prompts

1.  The **Character Card** JSON is generated in the Content Library and viewed in the output area there.
2.  In the **Generations** tab:
    *   Select a medium ('chat' or 'post').
    *   The **System Prompt Editor** loads the specific system prompt for that user and medium from the database.
    *   The **Instruction Editor** loads the specific instruction template for that user and medium from the database.
    *   Edit either editor directly.
    *   Use the corresponding **Save** button to persist changes to the database for the current user/medium.
    *   Use the **Reset** button below the System Prompt Editor to revert *only* the System Prompt back to match the user's *current* Character Card (fetches card data, updates DB, sets `is_custom=0`).

## Debugging Prompts

Based on the logs shown in the system, we can see that without clear directives, Claude tends to add metadiscourse like "*clears throat and cracks fingers*" and asks for feedback.

To prevent this, make sure your JSON Character Card includes explicit directives like:

```json
"directives": [
  "NEVER narrate actions (no '*clears throat*', etc.)",
  "NEVER provide meta-commentary",
  "NEVER ask for feedback on your response",
  "OUTPUT ONLY what the character would actually say/post"
]
```

Remember that the system uses the exact instructions from the relevant database records (or editors if unsaved) with no hidden processing, giving you complete control over the prompt engineering process.

## XML Structured Prompt Format

Digital Twin Lab now uses a structured XML format for all prompts sent to Claude AI. This approach provides clear organization of prompt components and helps the AI model better understand the different parts of the prompt.

The structure is as follows:

```xml
<Prompt version="1.0">
  <Header>Digital Twin Prompt</Header>
  <CharacterCard>
    <Data><![CDATA[{...character card JSON data...}]]></Data>
  </CharacterCard>
  <Instructions>
    <Instruction>First instruction line</Instruction>
    <Instruction>Second instruction line</Instruction>
  </Instructions>
  <Examples>
    <Example id="1">First example text</Example>
    <Example id="2">Second example text</Example>
  </Examples>
  <MainGoal>The main user request or goal</MainGoal>
</Prompt>
```

### How XML Structured Prompts Work

1. The backend formats the prompt components (Character Card, Instructions, Examples) as XML in the `system` message.
2. The main goal/request is sent as the `user` message.
3. Claude processes both the structured system message and the user message to generate a response.

This structured approach:
- Clearly separates different prompt components
- Makes it easier for Claude to understand the role of each element
- Maintains all the transparency and control of the previous approach
- Improves consistency in how Claude interprets the prompt

All existing UI components and database structures remain the same - the XML formatting happens only at the final step before sending to the API. 