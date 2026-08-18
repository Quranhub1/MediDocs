# AGENTS.md

## Commands

### Lint
```bash
npm run lint
```
Note: This project uses react-scripts, which includes ESLint via `react-scripts test` or `react-scripts build`. For linting with eslint directly:
```bash
npx eslint src/
```

### Typecheck / Build
```bash
npm run build
```
This runs `react-scripts build` which performs full typechecking and compilation.

### Tests
```bash
npm test
```

### Development
```bash
npm run dev
```
Runs both the React dev server and the Express backend concurrently.

## Project Structure
- `src/` - React frontend source
- `src/services/FirestoreService.js` - Firestore data access layer
- `src/components/` - React components
- `src/context/` - React context providers
- `src/utils/` - Utility functions
- `server.js` - Express backend server
