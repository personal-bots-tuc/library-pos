# Changelog

All notable changes to this project will be documented in this format.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial Docker + Railway deployment setup
- Runtime configuration via nginx + envsubst
- Healthcheck endpoint /health
- GitHub Actions CI/CD pipeline
- Documentation structure (docs/agent/)

### Changed
- Migrated from Vercel to Railway
- Unified package manager to npm
- Aligned TypeScript configs to project references

### Fixed
- SPA routing in production via nginx try_files
- CORS configuration for preview deployments

## [1.0.0] - 2026-10-05
### Added
- Initial release