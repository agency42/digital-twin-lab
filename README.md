# Digital Twin Lab
A prompt engineering playground for creating and interacting with digital twins. Upload your content, generate structured character cards, customize system prompts and instructions for different contexts, and see exactly what is sent to the AI models.

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- [Documentation Index](./docs/README.md) - Documentation overview
- [API Reference](./docs/api-reference.md) - API endpoints and usage
- [System Architecture](./docs/system-architecture.md) - System design and components
- [Development Guide](./docs/development-guide.md) - Development setup and processes
- [User Guide](./docs/user-guide.md) - How to use the application

See also [CLAUDE.md](CLAUDE.md) for Claude-specific implementation details and [task-list.md](task-list.md) for current development tasks.

## Core Features

1. **User Profile Management**
   - Create and select user profiles
   - Complete personality assessment
   - Connect social accounts for additional profile data
   - Save and manage biographical information

2. **Content Collection**
   - Upload text and image files as personality samples
   - Scrape websites to gather profile information
   - Import social media content via OAuth
   - Organize and select content for prompt generation

3. **Digital Twin Creation & Management**
   - Generate structured JSON **Character Cards** from selected content to define the twin's core identity (traits, voice, background)
   - View and manage the current Character Card
   - Default **System Prompts** and **Instruction Templates** are created automatically for different contexts (Chat, Post generation) based on the Character Card

4. **Interactions & Content Generation**
   - Use the **Generations** tab to customize interactions:
     - Switch between contexts (Chat, Post)
     - View/Edit the **System Prompt** specific to the current context (persisted in the database)
     - View/Edit the **Instruction Template** specific to the current context (persisted in the database)
     - Reset the context-specific System Prompt back to match the current Character Card
     - Chat with your digital twin using the context-specific System Prompt
     - Generate sample content (e.g., Tweets, LinkedIn posts) using the context-specific System Prompt and Instructions
   - Full transparency: the text used for generation is always visible in the editors

5. **Alignment Evaluation**
   - Compare user and AI responses to assessment questions
   - Visualize trait alignment via radar charts

## Prompt Engineering Playground

Digital Twin Lab is designed as a complete prompt engineering environment:

1. **Full Prompt Visibility**: See exactly what System Prompt and Instructions are sent to the model in every interaction
2. **Structured Experimentation**: Test different Character Cards, System Prompts, and Instructions across platforms/contexts
3. **Rapid Iteration**: Make small changes to prompts/instructions and immediately see the effects
4. **Complete Control**: No hidden instructions or default prompts are added by the system beyond the initial defaults based on the Character Card
5. **Instruction Transparency**: All instructions used for generation are displayed in the UI
6. **Separation of Concerns**: Clear separation between the core Character Card (identity) and the context-specific System Prompts and Instructions (behavior/task)

All prompts are fully customizable, visible, and documented. For detailed information on how prompts are structured and used in the system, see [CLAUDE.md](CLAUDE.md).

## Getting Started

### Requirements

- Node.js (v18+ recommended)
- npm
- TypeScript (`npm install -g typescript` optional, but used for compilation)
- Anthropic API key (Claude API access)
- LinkedIn Developer App credentials (optional)

### Setup & Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/digital-twin-lab.git
   cd digital-twin-lab
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:
   ```
   ANTHROPIC_API_KEY=your_claude_api_key_here
   PORT=3000
   
   # Optional, for LinkedIn integration
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   LINKEDIN_CALLBACK_URL=http://localhost:3000/api/oauth/linkedin/callback
   ```

4. **Database Setup:**
   - The application uses SQLite. The database file (`database/digital_twin_lab.db`) and schema (`database/schema.sql`) are included
   - Run the reset and migration scripts to initialize the database:
     ```bash
     node scripts/reset.js
     node scripts/migrate_prompts.js
     ```

5. **Running the Application:**
   - **Development:** Start the server with auto-reloading for backend changes and automatic TypeScript compilation for frontend changes:
     ```bash
     npm run dev-frontend 
     ```
   - **Production:** First, compile the TypeScript code:
     ```bash
     npm run build 
     ```
     Then, run the compiled application:
     ```bash
     npm start
     ```

6. Open your browser and navigate to `http://localhost:3000` (or the configured PORT).

## API Endpoints

The API is organized around user-centric endpoints. For a complete reference, see [API Reference](./docs/api-reference.md).

Key endpoints include:
- User management: `GET/POST /api/users`
- Asset management: `GET /api/assets/{userId}`, `POST /api/upload`
- Character card management: `POST /api/prompts/{userId}/generate-character-card`
- Content generation: `POST /api/chat/{userId}/generate-content`
- Conversation: `POST /api/chat/{userId}/response`

## Architecture

### Backend (`src/`)

The backend is built with **Node.js/Express** and is written in **TypeScript**. It's organized into:

- **Routes (`src/server/routes/`)**: API endpoints for different functional areas
- **Services (`src/server/services/`)**: Core business logic modules
- **API Wrappers (`src/server/api/`)**: Interfaces to external services (e.g., Claude API)
- **Utilities (`src/server/lib/`)**: Helper functions, database connection, etc

### Frontend (`src/client/ts/` and `public/`)

The frontend is a modular single-page application built with TypeScript:

- **Source Code (`src/client/ts/`)**: Contains all frontend TypeScript modules
- **Compiled Output (`public/js/`)**: JavaScript files generated by the TypeScript compiler
- **Static Assets (`public/`)**: Includes `index.html`, CSS, images
- **ES6 Modules** - Separate functionality areas (`src/client/ts/modules/`)
- **State Management** - Centralized state handling (`src/client/ts/utils.ts`)

### Data Storage (SQLite)

The application uses SQLite (`database/digital_twin_lab.db`) with the following key tables for prompt management:

- **`character_cards`**: Stores the generated JSON Character Cards for each user. Has an `is_current` flag
- **`system_prompts`**: Stores the system prompt text for different contexts (`type`: 'chat' or 'post') per user. Has an `is_custom` flag
- **`instruction_templates`**: Stores the instruction text for different contexts (`type`: 'chat' or 'post') per user
- **Other tables**: `users`, `assets`, `assessment_results`, etc

For a complete database schema, see [Database Schema](./docs/database-schema.md).

## Project Status

The project has completed several major milestones:
- ✅ Core database-driven prompt system implementation
- ✅ Unified Interactions UI with Examples and Main Goal fields
- ✅ Basic security implementation and OAuth integration
- ✅ Migration from hardcoded to database-stored prompts
- ✅ API architecture refactoring with separation of concerns
- ✅ Comprehensive API testing and documentation

Current development is focused on:
- 🔲 Unit testing for PromptConstructionService
- 🔲 Integration tests for refactored endpoints
- 🔲 Frontend updates to use refactored API endpoints

See [task-list.md](task-list.md) for current development tasks.

## Research Background

This project builds on recent research in LLM-based personality simulation:

- **Stanford Digital Twin Study** - Demonstrated 85% match rate between human and AI responses
- **GPT-4 Personality Studies** - Showed high correlation between simulated and actual trait scores
- **Personality Prompting Research** - Developed methods to induce specific trait expressions in LLMs

## Acknowledgments

- TIPI assessment from Gosling et al. (2003)

## TypeScript Development

This project is written entirely in TypeScript with a clean separation between frontend and backend code:

1. **Project Structure**:
   ```
   /
   ├── src/
   │   ├── server/      # Backend TypeScript 
   │   └── client/      # Frontend TypeScript source
   │       └── ts/      # TypeScript source files
   ├── public/          # Static assets and compiled JS
   │   ├── js/          # Compiled JavaScript (output only)
   │   ├── css/
   │   └── img/
   ├── scripts/         # Utility scripts (reset.js, migrate_prompts.js)
   ├── database/        # DB file (digital_twin_lab.db) & schema (schema.sql)
   ├── data/            # Temporary data (scrape results, assets)
   └── dist/            # Compiled backend code for production
   ```

2. **Development**: Run the project with auto-compiling TypeScript and backend reloading:
   ```bash
   npm run dev-frontend
   ```

3. **TypeScript Workflow**:
   - Edit source files in `src/client/ts/` and `src/server/`
   - Frontend TS compiles to `public/js/` automatically in dev mode
   - Backend TS is run via `ts-node-dev` in dev mode

4. **Clean Compiled Files**: If needed:
   ```bash
   npm run clean-js # Cleans public/js
   # `npm run clean` (part of build) cleans `dist/`
   ```

5. **Database Scripts**: Manage the database:
   ```bash
   node scripts/reset.js            # Wipe and recreate DB from schema
   node scripts/migrate_prompts.js  # Migrate existing user data to the new prompt system
   ```

6. **Build for Production**: Compiles all TypeScript and prepares the `dist` directory:
   ```bash
   npm run build
   ```

Never edit the JavaScript files in `public/js/` directly as they are overwritten during development or build