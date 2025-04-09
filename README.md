# digital twin lab
an interface for creating and interacting with digital twins. upload your content, generate system prompts, chat, and assess alignment.

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

3. **Character Card Generation**
   - Generate structured JSON character cards that serve as system prompts
   - Character cards include personality traits, voice style, and platform adaptations
   - Edit the character card template to customize the structure
   - Use character cards as the foundation for digital twin interactions

4. **Interactions**
   - Chat with digital twins using generated prompts
   - Configure how your digital twin communicates across different mediums
   - Generate content for various platforms (blog posts, tweets, LinkedIn)
   - Edit system prompts to refine twin behavior
   - View the full structured prompt including examples
   - Generate sample content based on the current medium

5. **Alignment Evaluation**
   - Compare user and AI responses to assessment
   - Visualize trait alignment via radar charts

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

4. **Running the Application:**
   - **Development:** Start the server using `ts-node` with hot-reloading (via Nodemon):
     ```bash
     npm run dev 
     ```
     This will watch for changes in the `src/` directory and automatically restart the server.

   - **Production:** First, compile the TypeScript code to JavaScript:
     ```bash
     npm run build 
     ```
     Then, run the compiled application (located in the `dist/` directory):
     ```bash
     npm start
     ```

5. Open your browser and navigate to `http://localhost:3000` (or the configured PORT).

## Architecture

### Backend (`src/`)

The backend is built with **Node.js/Express** and is written in **TypeScript**. It's organized into:

- **Routes (`src/routes/`)**: API endpoints for different functional areas.
- **Services (`src/services/`)**: Core business logic modules.
- **API Wrappers (`src/api/`)**: Interfaces to external services (e.g., Claude API).
- **Utilities (`src/lib/`)**: Helper functions, database connection, shared types, etc.

### Frontend (`public/`)

The frontend is a modular single-page application with:

- **ES6 Modules** - Separate functionality areas
- **State Management** - Centralized state handling
- **Responsive UI** - Progressive user flow
- **Chart Visualization** - For alignment metrics

### Data Storage

The application uses SQLite for database storage:

- **User Data** - Profiles and preferences
- **Assets** - Metadata for content and source materials
- **Base Prompts** - Generated system prompts
- **Prompt Variations** - Context-specific prompt modifications
- **Assessment Results** - For trait comparisons

## Key Workflows

### Creating a Digital Twin

1. Create or select a user profile
2. Upload or scrape source content
3. Select content for character card generation
4. Generate a JSON character card that serves as the system prompt
5. Edit the character card template if needed

### Testing Personality Alignment

1. Complete the TIPI assessment as the user
2. Select a generated character card (or variation)
3. Run the AI assessment simulation
4. View and analyze the alignment results

### Interacting with Digital Twins

1. Select a character card
2. Chat with the digital twin using the selected character card as system prompt
3. Save successful variations for different contexts

## Project Status

See [CLAUDE.md](CLAUDE.md) for detailed technical notes and current development status.

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
   ├── scripts/         # Utility scripts
   ├── database/        # DB schema definition
   └── dist/            # Compiled backend code
   ```

2. **Development**: Run the project with auto-compiling TypeScript:
   ```bash
   npm run dev-frontend
   ```
   This will start both the backend server and the TypeScript compiler in watch mode.

3. **TypeScript Workflow**:
   - Edit source files in `src/client/ts/` directory
   - Compiled JS output goes to `public/js/` directory
   - Backend TypeScript is in `src/server/`
   - Compiled backend code goes to `dist/`

4. **Clean Compiled Files**: If you need to clean all compiled JS files:
   ```bash
   npm run clean-js
   ```

5. **Database Scripts**: Run database management scripts:
   ```bash
   npm run db:migrate  # Run database migrations
   npm run db:reset    # Reset the database
   ```

6. **Build for Production**: When building for production:
   ```bash
   npm run build
   ```
   This will compile all TypeScript code and copy necessary files to the dist directory.

## TypeScript Structure

The project uses a clean separation between source TypeScript files and compiled JavaScript:

- **Source files**: All TypeScript (.ts) files are in `src/client/ts/` directory
  - Core files: `app.ts`, `types.ts`, `utils.ts` 
  - Module files: Located in `src/client/ts/modules/`

- **Compiled output**: All JavaScript (.js, .js.map) files are in `public/js/` directory
  - Generated automatically by TypeScript compiler
  - Should never be edited manually

### Development Workflow

1. Edit TypeScript source files in `src/client/ts/`
2. Run `npm run build-client` to compile to JavaScript 
3. Use `npm run dev-frontend` during development to watch for changes
4. Clean compiled files with `npm run clean-js` when needed

Never edit the JavaScript files directly as they will be overwritten by the build process.