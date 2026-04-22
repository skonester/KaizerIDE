# Contributing to KaizerIDE

Thanks for your interest in contributing to KaizerIDE! 🎉

## How to Contribute

### Reporting Bugs
- Check if the bug is already reported in [Issues](https://github.com/randheimer/KaizerIDE/issues)
- If not, create a new issue with:
  - Clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - Screenshots if applicable
  - Your OS and KaizerIDE version

### Suggesting Features
- Open an issue with the `enhancement` label
- Describe the feature and why it would be useful
- Include mockups or examples if possible

### Pull Requests

1. **Fork the repo** and create your branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Test your changes thoroughly

5. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   Use conventional commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

6. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a PR on GitHub with a clear description

### Good First Issues
Look for issues labeled `good first issue` - these are great starting points for new contributors!

## Development Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- Git

### Project Structure
```
KaizerIDE/
├── electron/          # Electron main process
├── src/              # React frontend
│   ├── components/   # UI components
│   ├── lib/          # Utilities and API
│   └── hooks/        # React hooks
├── images/           # Assets
└── .github/          # CI/CD workflows
```

### Tech Stack
- **Frontend**: React, Vite, Monaco Editor
- **Backend**: Electron
- **AI**: OpenAI-compatible API
- **Styling**: CSS modules

### Building
```bash
npm run build          # Build Vite app
npm run electron:build # Build installer
```

## Code of Conduct
- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow

## Questions?
Open a discussion or reach out in issues. We're here to help!

---

Happy coding! 🚀
