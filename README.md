# digital twin lab
an interface for creating and and interacting with digital twins. upload your content, generate a personality profile, chat, and assess alignment.

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
   - Organize and select content for personality generation

3. **Personality Generation**
   - Create structured personality profiles (json) from user content
   - Save and manage multiple personality versions

4. **Digital Twin Interaction**
   - Chat with digital twins based on generated profiles
   - Edit system prompts to refine twin behavior
   - Save successful chat configurations
   - Test twin in different conversation scenarios

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

### Data Storage (`data/`)

The application uses local file-based storage:

- **JSON Files** - For structured metadata
- **File Assets** - For content and source materials
- **Personality Profiles** - For generated twins
- **Assessment Results** - For trait comparisons

## Key Workflows

### Creating a Digital Twin

1. Create or select a user profile
2. Upload or scrape source content
3. Select content for personality generation
4. Generate SoulScript personality profile
5. Edit and save the profile

### Testing Personality Alignment

1. Complete the TIPI assessment as the user
2. Select a generated personality profile
3. Run the AI assessment simulation
4. View and analyze the alignment results

### Interacting with Digital Twins

1. Select a personality profile
2. Edit system prompt parameters (optional)
3. Engage in conversation with the digital twin
4. Rate the authenticity of the interaction

## Project Status

See [CLAUDE.md](CLAUDE.md) for detailed technical notes and current development status.

## Research Background

This project builds on recent research in LLM-based personality simulation:

- **Stanford Digital Twin Study** - Demonstrated 85% match rate between human and AI responses
- **GPT-4 Personality Studies** - Showed high correlation between simulated and actual trait scores
- **Personality Prompting Research** - Developed methods to induce specific trait expressions in LLMs

## Acknowledgments

- Ther personality json data structure was inspired by SoulScript by [SoulGraph](https://soulgraph.gitbook.io/)
- TIPI assessment from Gosling et al. (2003)