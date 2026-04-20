# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-18

### Added

- Initial release with support for:
  - OpenAI instrumentation (GPT-4, GPT-4 Turbo, GPT-3.5)
  - Anthropic instrumentation (Claude Opus, Sonnet, Haiku)
  - Vertex AI instrumentation (Gemini Pro, Ultra)
  - AWS Bedrock instrumentation (Claude, Llama, Mistral)
- OTel GenAI semantic convention compliance
- Cost tracking per request
- Token counting with provider-specific implementations
- Streaming response support with time-to-first-token metrics
- Error handling and classification
- Circuit breaker for resilience
- Dashboard definitions for Phoenix, Langfuse, and Cloud Trace
- PII redaction
- Structured logging with Pino
- Docker support with multi-stage builds
- CI/CD with GitHub Actions

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- N/A

## [Unreleased]
