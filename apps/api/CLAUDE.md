# Sardius - DDD Architecture Guide (MUST READ AND FOLLOW EVERYTHING WRITTEN HERE)

## Overview

This project follows **Domain-Driven Design (DDD)** with clear separation between layers.
NestJS is used **only** as the HTTP layer - the application core lives in the domain.

- **domain/** CANNOT import from **http/** or **infra/**
- **http/** can import from **domain/** and **infra/**
- **infra/** implements interfaces defined in **domain/**

### SKILLS you must use to fulfill your objective correctly:

- `request_understander`: Used to get the correct information from the user, in order to implement/generate the correct feature for the user. - [MUST CALL FIRST]
- `structure_understander`: Used to get and understand the folder and file structure and hierarchy in the project. - [MUST CALL SECOND]
- `code_understander`: Used to understand the respective artifact file patterns. - [MUST CALL THIRD]
- `generate`: Used to generate an artifact in the application. It could be a service, an use-case, an entity, a repository, etc. - [MUST CALL FOURTH]

## Stack

- **Runtime:** Node.js
- **HTTP Framework:** NestJS (HTTP layer only)
- **Validation:** Zod
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Tests:** Jest

## Commands

```bash
npm run start:dev    # Development
npm run build        # Build
npm run test:unit    # Unit tests
npm run test:e2e     # E2E tests
```
