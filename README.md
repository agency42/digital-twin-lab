# Digital Twin Lab

A lightweight prototype designed for experimenting with AI-powered digital twins generated from personal content. This tool allows you to collect text and images, build configurable personality profiles, interact with the resulting digital twins via chat, and assess the alignment between the twin and a human baseline.

## Core Functionality

1.  **Collect Content**: Upload files or scrape websites to gather text and images associated with a specific Profile ID.
2.  **Manage & Select Assets**: View collected assets grouped by Profile ID. Select specific text and image assets to use for personality generation.
3.  **Generate Personality**: Create a detailed personality profile (JSON format) based on selected content. The prompt used for generation is viewable and editable.
4.  **Chat with Twin**: Interact with the generated personality. The chat uses a system prompt constructed from the generated profile JSON, plus optional user-provided Lore and Simulation Parameters (editable).

## Getting Started

### Requirements

- Node.js (v18+ recommended)
- npm
- Anthropic API key (set in `.env` file)

### Setup & Running

1.  Clone the repository: `git clone <repository_url>`
2.  Navigate to the project directory: `cd digital-twin-lab`
3.  Install dependencies: `npm install`
4.  Create a `.env` file in the project root:
    ```dotenv
    ANTHROPIC_API_KEY=your_claude_api_key_here
    PORT=3000 # Optional, defaults to 3000
    ```
5.  Start the development server:
    ```bash
    npm run dev 
    # This uses nodemon to automatically restart on file changes
    ```
6.  Open http://localhost:3000 (or your specified port) in your browser.

## How to Use

1.  **Collect Content**: Use the scrape or upload features in Module 1, assigning a `Profile ID`.
2.  **Manage Assets**: In Module 2, review the assets grouped by `Profile ID`. Use checkboxes to select assets for personality generation. Use selection buttons (Select All Text/Image, Deselect All, Delete Selected) as needed. Use the "Clear Content Library" button (with caution!) to reset all data.
3.  **Generate Personality**: In Module 3, review/edit the `Personality Generation Prompt`. Click "Generate Personality Profile" (requires assets selected). View the resulting JSON.
4.  **Chat**: In Module 4, optionally edit the `Lore` and `Simulation Parameters` textareas (use valid JSON or plain text). The `Final Chat System Prompt` will update automatically. Type messages and chat with the twin, whose responses are based on the combined context (Personality JSON + Lore + Params).

## Project Structure

- **Backend (`src/`)**: Node.js/Express server.
  - `server.js`: Main server setup, middleware, mounts routes.
  - `routes/`: Express routers for different API functionalities (assets, personality, etc.).
  - `services/`: Core logic modules (AssetProcessor, AbstractionApproach, WebsiteScraper).
  - `api/`: Wrapper for the Claude API.
- **Frontend (`public/`)**: Single-page application.
  - `index.html`: Main HTML structure.
  - `js/app.js`: Frontend logic, UI manipulation, API calls.
- **Data (`data/`)**: Local file-based storage (ignored by git).
  - `assets.json`: Registry of all collected assets (metadata).
  - `assets/`: Directory containing the actual asset files, organized into subdirectories by sanitized `Profile ID`.
  - `personas/personas.json`: Stores the generated personality JSON profiles.
  - `prompt.json`: Stores the user-customized personality generation prompt (if saved).
  - `scrape_status.json`: Stores the status of the last/current scraping job.

## Current Status

- Core workflow (Collect -> Select -> Generate -> Chat) is functional.
- Frontend UI implements the described workflow modules.
- Backend routes partially refactored for better organization.
- Asset storage uses a consistent directory structure based on sanitized Profile ID.
- Basic error handling and status reporting implemented.

## Next Steps

### Psych Assessment Module (Current Focus)

The next major feature is to add a psychometric assessment module to compare the user's personality baseline with the generated digital twin.

**Planned Implementation:**

1.  **Select Assessment:** Choose a standard, concise Big Five / OCEAN personality questionnaire (e.g., a validated 10-item scale).
2.  **User Survey UI:** Create a new UI module where the user answers the selected Big Five questions using a Likert scale (e.g., Strongly Disagree to Strongly Agree).
3.  **AI Simulation:**
    *   When triggered by the user (after they complete their survey), iterate through each Big Five question.
    *   For each question, make multiple (e.g., 5) *stateless* calls to the `/api/chat` endpoint.
    *   Each call will use the current full system prompt (Personality + Lore + Params) and the specific Big Five question as the user message.
    *   Use a configurable temperature (e.g., default 0.8) for these calls to encourage varied responses.
4.  **Response Parsing & Scoring:**
    *   Develop logic to analyze the AI's multiple text responses for each question.
    *   Map the AI's likely stance (based on its responses) onto the same Likert scale used by the human.
    *   Average the scores for the multiple runs per question.
5.  **Calculate Alignment:**
    *   Compare the user's Likert score with the AI's averaged Likert score for each question.
    *   Calculate alignment scores for each of the five dimensions (O, C, E, A, N).
    *   Calculate an overall alignment score.
6.  **Visualize Results:**
    *   Integrate a charting library (like Chart.js).
    *   Display the per-dimension alignment scores using a radar chart.
    *   Show numerical percentage scores for overall and per-dimension alignment.

### Other Potential Improvements

- Finish refactoring backend routes (`scrape`, `utility` routes).
- Implement saving/loading for the personality generation prompt via API.
- Enhance error handling (e.g., API rate limits, file system errors).
- Improve asset path resolution robustness and potentially move logic into `AssetProcessor`.
- Add input validation to API endpoints.

## Technical Notes

- Assets are stored in consistent directories by person ID
- Path resolution uses multiple fallbacks for compatibility
- Each asset has a unique UUID and standardized metadata
- File system and simple JSON are used for storage (appropriate for prototype)

For more detailed technical notes and ongoing work, see [CLAUDE.md](CLAUDE.md).

## Social Media Integration

The application now supports connecting social media accounts to gather additional profile data for personality generation. Currently implemented:

- **LinkedIn**: Connect your LinkedIn account to import your profile information.

### How to Set Up LinkedIn Integration

1. Create a LinkedIn Developer application at the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Configure your application settings:
   - Set the **Redirect URL** to: `http://localhost:3000/api/oauth/linkedin/callback` (or your custom domain if deployed)
   - Request the required OAuth permissions:
     - `openid`
     - `profile`
     - `email`
3. Update your `.env` file with the required credentials:
   ```
   LINKEDIN_CLIENT_ID=your_client_id
   LINKEDIN_CLIENT_SECRET=your_client_secret
   LINKEDIN_REDIRECT_URI=http://localhost:3000/api/oauth/linkedin/callback
   ```
4. Restart the application and use the "Connect LinkedIn" button in the UI to authenticate.

The OAuth integration uses OpenID Connect, a secure authentication protocol built on top of OAuth 2.0, to retrieve the user's profile information with their consent. The profile is then stored as an asset associated with the user's Digital Twin Lab profile.

## SoulScript Personality Profiles

The Digital Twin Lab now uses the SoulScript format for defining agent personalities. SoulScript is a structured JSON format that provides a comprehensive way to define personality traits, communication style, and relationship patterns.

### Personality Structure

The SoulScript format includes:

- **Entity**: Basic identity details (form, occupation, gender, age)
- **Personality**: Core traits (with strength values) and values
- **Voice**: Communication style, tone, patterns
- **Relationship**: Interaction style and boundaries
- **Big Five Traits**: Explicitly mapped personality dimensions
- **Background & Expertise**: Additional context for the digital twin

This structured approach creates more nuanced and consistent digital twins that better reflect the source content.

### Example SoulScript Profile

```json
{
  "entity": {
    "form": "human",
    "occupation": "software engineer",
    "gender": "female",
    "age": "32"
  },
  "personality": {
    "name": "Alex",
    "core_traits": [
      {
        "trait": "analytical",
        "strength": 0.8
      },
      {
        "trait": "curious",
        "strength": 0.9
      }
    ],
    "values": [
      {
        "name": "continuous learning",
        "expression": "regularly explores new technologies and approaches"
      }
    ]
  },
  "voice": {
    "style": "clear and concise",
    "tone": "friendly but professional",
    "qualities": [
      "thoughtful",
      "precise",
      "occasionally witty"
    ],
    "patterns": [
      "uses technical analogies",
      "breaks down complex topics step by step"
    ]
  },
  "relationship": {
    "style": "helpful and collaborative",
    "boundaries": "maintains professionalism while being approachable"
  },
  "big_five_traits": {
    "openness": "high",
    "conscientiousness": "high",
    "extraversion": "medium",
    "agreeableness": "medium",
    "neuroticism": "low"
  },
  "background": [
    "Graduated with CS degree before moving into web development",
    "Worked at several startups before current position",
    "Mentor to junior developers"
  ],
  "expertise": [
    "JavaScript/TypeScript",
    "React ecosystem",
    "System architecture",
    "Developer tooling"
  ]
}
```

### Benefits of SoulScript Format

- **Structured Personality Definition**: Clearly defined traits, values, and communication style
- **Consistent Interaction**: Digital twins maintain consistent personality traits across interactions
- **Improved Assessment**: Better alignment between human and AI personality traits
- **Enhanced Chat Experience**: More authentic communication style based on voice patterns

The Digital Twin Lab automatically generates SoulScript profiles from your content (uploaded files, scraped websites, LinkedIn profile), then uses this structured format to create a more authentic digital twin.

Learn more about SoulScript at [soulgraph.gitbook.io](https://soulgraph.gitbook.io/soulgraph-docs/key-concepts/soulscript).