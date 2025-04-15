# Development Guide

This guide provides comprehensive instructions and patterns for developers working on the Digital Twin Lab project.

> **Note:** This document incorporates the development patterns previously found in `dev-patterns.md` and project structure information from `project-structure.md`.

## Project Overview

Digital Twin Lab is a Next.js application that creates digital twins based on user content. It analyzes content from platforms like Twitter and LinkedIn to generate character cards, which are then used for content generation and conversations.

## Development Patterns and Principles

### Core Principles

- **Modularity**: Code should be organized into clear, focused modules with well-defined responsibilities
- **Simplicity**: Prefer simple, straightforward solutions over complex ones
- **Documentation**: Code should be well-documented with appropriate comments and documentation files
- **TypeScript**: Backend code should be written in TypeScript for type safety and better developer experience
- **Minimal API Clients**: API clients like `claude.ts` should be minimal and focused solely on API communication

### Architecture Patterns

- **Database-First Approach**: All prompt-related data should be stored in the database, not hardcoded
- **Separation of Concerns**: Clear separation between frontend UI, backend services, and data storage
- **Service-Based Architecture**: Business logic organized into service classes with clear responsibilities

### API Design

- **RESTful Endpoints**: API endpoints should follow RESTful principles
- **Minimal Inputs**: API endpoints should require minimal inputs, retrieving context from the database
- **Consistent Error Handling**: Use consistent patterns for error handling and validation

### Frontend Development

- **TypeScript**: All frontend code should use TypeScript
- **Module Pattern**: UI functionality organized into modules (userModule, contentModule, etc.)
- **Progressive Enhancement**: Core functionality should work without JavaScript when possible

### Testing Principles

- **Unit Testing**: Critical services and utilities should have unit tests
- **Integration Testing**: API endpoints should have integration tests
- **Manual Testing**: UI features should be manually tested across different browsers

## Prerequisites

- Node.js 18+
- npm or yarn
- SQLite (for local development)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/digital-twin-lab.git
   cd digital-twin-lab
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration values.

4. Run the development server:
   ```bash
   npm run dev
   ```

The application will be available at http://localhost:3000.

## Project Structure

```
/
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   ├── lib/             # Utility functions
│   ├── server/          # Server-side code
│   │   ├── api/         # API handlers
│   │   ├── db/          # Database setup and models
│   │   ├── routes/      # API route handlers
│   │   └── services/    # Business logic services
│   └── types/           # TypeScript type definitions
├── tests/               # Test files
├── docs/                # Documentation
└── uploads/             # User uploaded content (not in repository)
```

## Key Components

### Database

We use SQLite during development and can be configured for other databases in production. Database schema and migrations are managed manually.

The main tables are:
- `users` - User information
- `assets` - Uploaded content from users
- `character_cards` - Generated character profiles
- `content_generations` - Content generated for users
- `conversations` - Chat conversations with digital twins

### API Routes

The main API routes include:
- `/api/users` - User management
- `/api/upload` - Asset uploads
- `/api/assets` - Asset management
- `/api/character-card` - Character card generation
- `/api/generate` - Content generation
- `/api/conversations` - Conversation management

### Services

Core business logic is contained in services:
- `assetProcessor.ts` - Handling file uploads and asset management
- `characterCardGenerator.ts` - Generating character cards from assets
- `contentGenerator.ts` - Generating content based on character cards
- `conversationManager.ts` - Managing conversations with digital twins

### AI Integration

We use Claude 3 Sonnet for:
- Analyzing user content to create character cards
- Generating content based on character cards
- Powering conversations with digital twins

## Development Workflow

1. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

3. Run tests to ensure everything works:
   ```bash
   npm test
   ```

4. Push your changes and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

## TypeScript Development

This project is written entirely in TypeScript with a clean separation between frontend and backend code:

1. **Development**: Run the project with auto-compiling TypeScript and backend reloading:
   ```bash
   npm run dev-frontend
   ```

2. **TypeScript Workflow**:
   - Edit source files in `src/client/ts/` and `src/server/`
   - Frontend TS compiles to `public/js/` automatically in dev mode
   - Backend TS is run via `ts-node-dev` in dev mode

3. **Clean Compiled Files**: If needed:
   ```bash
   npm run clean-js # Cleans public/js
   # `npm run clean` (part of build) cleans `dist/`
   ```

4. **Database Scripts**: Manage the database:
   ```bash
   node scripts/reset.js            # Wipe and recreate DB from schema
   node scripts/migrate_prompts.js  # Migrate existing user data to the new prompt system
   ```

5. **Build for Production**: Compiles all TypeScript and prepares the `dist` directory:
   ```bash
   npm run build
   ```

> **Important**: Never edit the JavaScript files in `public/js/` directly as they are overwritten during development or build.

## Testing

We use Jest for testing. Run tests with:
```bash
npm test
```

For manual testing, use the shell scripts in the `tests/` directory:
```bash
chmod +x tests/run_tests.sh
./tests/run_tests.sh
```

## Deployment

The application can be deployed to any environment that supports Node.js:

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Contributing

Please follow these guidelines when contributing:

1. Use descriptive commit messages
2. Write tests for new features
3. Follow the existing code style
4. Update documentation when necessary

## Troubleshooting

Common development issues:

- **SQLite database issues**: Check file permissions in the `db` directory
- **File upload failures**: Ensure the `uploads` directory exists and has write permissions
- **API errors**: Check the server logs for detailed error messages

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Claude API Documentation](https://docs.anthropic.com/claude/reference) 