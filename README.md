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