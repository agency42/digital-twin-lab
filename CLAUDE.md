# CLAUDE.md - Digital Twin Lab Notes

This file contains my observations, decisions, and ongoing work on the Digital Twin Lab project. I'll update this regularly as I work on the project.

## Current Status & Recent Changes

- ✅ **Fixed directory structure inconsistencies**
  - Implemented sanitizePersonId method to standardize folder naming
  - Added migration utility at `/api/migrate-assets` to handle existing assets
  - Removed redundant directories from server initialization
  - Fixed path resolution to better handle both new and legacy paths

- ✅ **Simplified data storage**
  - Renamed confusing "embeddings.json" to "assets.json"
  - Moved file to data root directory for simplicity
  - Updated all references and functions in the codebase
  - Eliminated unnecessary reference to vector embeddings

- ✅ **Fixed image preview issues**
  - Implemented multi-path fallback resolution in frontend and backend
  - Added detailed logging for path resolution debugging
  - Added special handling for extended-mind.png case

## Code Patterns to Follow

- **File Structure**: Store assets in `/data/assets/<sanitizedPersonId>/` directories
- **File Naming**: Use `<assetId>_<filename>` pattern for consistent identification
- **Service Pattern**: Business logic encapsulated in service classes
- **Error Handling**: Detailed logging with try/catch blocks
- **Path Resolution**: Multi-level fallback approach for finding assets

## Known Issues & Work in Progress

- Image previews sometimes require specific path handling due to inconsistent directory structure
- Legacy paths (website_*) still exist and require fallback mechanisms
- Migration utility should be run to ensure all assets use consistent structure

## Notes for Future Development

- Keep the codebase simple and focused on the core functionality
- Prioritize working features over architectural perfection
- Use JSON files for data storage as this is a prototype
- Remember to update this file with your observations and decisions

## Commands & Tools

- `npm run dev` - Start development server with auto-reload
- `/api/migrate-assets` - Endpoint to standardize legacy asset directory structure
- Browser console logs show detailed path resolution for debugging