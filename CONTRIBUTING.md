# Contributing to otel-genai-semconv

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 22 LTS (see `.nvmrc`)
- npm or pnpm
- Docker (for local testing)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/reaatech/otel-genai-semconv.git
cd otel-genai-semconv

# Install dependencies
npm install

# Start local development services
docker-compose up -d otel-collector jaeger

# Run tests
npm test

# Build
npm run build
```

## Development Workflow

### Pre-commit Hooks

The project uses Husky for pre-commit hooks that run:
- ESLint
- TypeScript type checking
- Prettier formatting
- Tests

### Adding a New Provider

1. Create provider directory: `src/providers/<provider>/`
2. Implement instrumentation: `<provider>-instrumentation.ts`
3. Implement attribute mapper: `attribute-mapper.ts`
4. Implement token counter: `token-counter.ts`
5. Add tests in `tests/unit/providers/<provider>/`
6. Export from `src/providers/index.ts`

### Adding New Attributes

1. Update `src/semconv/constants.ts` with new attribute names
2. Update `src/types/domain.ts` with TypeScript types
3. Update `src/types/schemas.ts` with Zod validation
4. Update documentation

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/cost-calculator.test.ts

# Run integration tests
npm run test:integration
```

## Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (single quotes, trailing commas)
- **Linting**: ESLint with typescript-eslint
- **Imports**: ESM only, `.js` extensions

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass and coverage is maintained
4. Update documentation as needed
5. Request review from maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
