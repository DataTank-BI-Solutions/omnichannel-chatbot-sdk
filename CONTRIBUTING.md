# Contributing

Thank you for your interest in contributing to the Omnichannel Chatbot SDK!

## Development Setup

1. Clone the repository
```bash
git clone https://github.com/code-alchemist-dev/omnichannel-chatbot-sdk.git
cd omnichannel-chatbot-sdk
```

2. Install dependencies
```bash
npm install
```

3. Set up environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Run tests
```bash
npm test
```

## Project Structure

```
src/
├── Chatbot.ts           # Main entry point
├── core/                # Core functionality
├── platforms/           # Platform adapters
├── plugins/             # Built-in plugins
├── database/            # Database adapters
└── admin/               # Admin panel
```

## Coding Standards

- Use TypeScript for all new code
- Follow existing code style
- Write tests for new features
- Document public APIs with JSDoc

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Write/update tests
5. Update documentation
6. Submit a pull request

## Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

Example: `feat: add Discord platform adapter`

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps
- Include environment details
- Include error messages/logs

## Questions?

Open a discussion on GitHub or contact the maintainers.
