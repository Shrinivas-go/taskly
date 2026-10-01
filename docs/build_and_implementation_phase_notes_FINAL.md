# Build & Implementation Phase — Engineering Notes

---

### Document Metadata
- **Project**: Todoist-Style Task Management Application
- **Phase**: Phase 5 — Build & Implementation
- **Target Audience**: Bachelor of Computer Applications (BCA) Student / Junior Software Engineer
- **Document Nature**: Engineering Learning Notes & Architecture-to-Implementation Guide
- **Current Workspace State**: Slices 0–4 Implemented (Monorepo, Database, Auth, Task CRUD API, Frontend Core Shell & Auth Integration)
- **Review Type**: Final Verification Pass against Source Code and Runtime Configuration

---

## Document Purpose

This document captures the engineering knowledge, architectural mechanics, mental models, and decision-making processes required to turn the **Phase 4 System Design Package** into working, maintainable, and production-grade software.

It is **not** a copy of the source code, **not** a changelog, and **not** an administrative status report. Its purpose is to explain **how** and **why** software components are constructed, how they communicate across network boundaries, how security and data isolation are enforced at the code level, and how an engineering discipline (Scrum of One) governs AI-assisted development.

---

## 1. Phase Overview

### What the Build Phase Is
The **Build & Implementation Phase** is the stage in the software engineering lifecycle where abstract abstractions, schemas, interface contracts, and architectural diagrams are converted into executable code, automated database migrations, and operational services.

```text
┌──────────────────────┐
│ Phase 0 & 1: PRD/SRS │  Defines WHAT problem needs to be solved and the requirements.
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Phase 4: System Des. │  Defines HOW the system is architected (boundaries, schemas, protocols).
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Phase 5: BUILD       │  CONVERTS design into working code, database tables, and APIs.
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ Phase 6: TEST        │  VERIFIES that the implementation satisfies the requirements reliably.
└──────────────────────┘
```

### The Difference Between Designing and Implementing Software
- **Software Design** determines boundaries, data models, trade-offs, technology choices, protocols, and security rules on paper. It answers questions like: *"Will we use an adjacency list for nested subtasks?"* or *"How will JWT claims be verified?"*
- **Software Implementation (Build)** deals with concrete programming realities: runtime environments, type-safety, dependency injection lifecycles, connection pool timeouts, asynchronous execution (`async`/`await`), HTTP status codes, deserialization errors, and edge-case exceptions.

### The Project's AI-Assisted Engineering Workflow
When using AI tools (such as Antigravity, Gemini, or ChatGPT), code generation is trivial, but software engineering is not. To prevent architectural decay, code bloating, and security holes, this project enforces a strict 13-step development cycle:

```text
Requirement
  → Understand
    → Design
      → Learn Concepts
        → Ask Antigravity
          → Understand Output
            → Apply Code
              → Run
                → Test
                  → Debug
                    → Review
                      → Document
                        → Complete
```

#### Why This Workflow Matters in AI-Assisted Development
1. **Prevents "Blind Prompting"**: AI models will happily generate code that works in isolation but violates project conventions, security policies, or database constraints.
2. **Preserves Conceptual Ownership**: As a BCA student, you cannot defend or maintain code that you do not understand. Understanding the concepts *before* writing or applying code ensures that you remain the software architect while the AI acts as a fast typing assistant.
3. **Ensures Deterministic Verification**: Running tests, type checks, and linters after applying code guarantees that the AI did not introduce subtle regressions, hallucinate non-existent package methods, or delete critical edge-case guards.

---

## 2. Build Phase Goals

The goals of the Build Phase for this Todoist-style application are:

1. **Turn Architecture into Working Software**: Translate the Phase 4 System Design Package (ERDs, sequence diagrams, API specs) into executable TypeScript code and relational database schemas.
2. **Implement the Modular Backend**: Build a scalable NestJS modular monolith adhering to Clean Architecture principles (separation of controllers, services, and data access).
3. **Implement the Relational Database**: Stand up PostgreSQL 16 with automated migrations managed via Prisma ORM, enforcing foreign key constraints and cascade deletes.
4. **Implement Stateless Authentication & Strict Authorization**: Establish password hashing with bcrypt, stateless JWT issuance/verification, and strict tenant ownership data isolation (preventing Insecure Direct Object References — IDOR).
5. **Implement the Task Engine**: Provide full CRUD operations for tasks and hierarchical subtasks with automatic ownership validation.
6. **Implement the Modern Frontend Shell**: Build a responsive Next.js App Router frontend with light/dark theme persistence and client-side session management.
7. **Connect Frontend and Backend**: Establish a strongly typed REST client communicating over HTTP with proper CORS headers and error propagation.
8. **Test Continuously During Implementation**: Write automated unit and integration/E2E tests alongside feature code rather than deferring quality assurance to the end.
9. **Maintain Code Quality & Engineering Discipline**: Enforce strict TypeScript compilation (`noImplicitAny`), ESLint static analysis, and Prettier formatting across the entire codebase.

---

## 3. Repository and Project Structure

### Current Implementation vs. Planned Architecture

#### Current Repository Structure `[IMPLEMENTED]`
The project is currently structured as an **npm workspaces monorepo** with two active application packages (`backend/` and `frontend/`):

```text
todolist/
├── .env                              [IMPLEMENTED] Local environment variables (gitignored)
├── .env.example                      [IMPLEMENTED] Template of required environment variables
├── .git/                             [IMPLEMENTED] Local Git repository database
├── .gitignore                        [IMPLEMENTED] Ignores node_modules, dist, .next, .env, v0-reference
├── docker-compose.yml                [IMPLEMENTED] PostgreSQL 16 container definition
├── package.json                      [IMPLEMENTED] Root workspace configuration (workspaces: [backend, frontend])
├── package-lock.json                 [IMPLEMENTED] Deterministic dependency lockfile
├── readme.md                         [IMPLEMENTED] Engineering documentation and onboarding guide
│
├── backend/                          [IMPLEMENTED] NestJS 10 Modular Monolith API
│   ├── package.json                  [IMPLEMENTED] Backend dependencies and scripts
│   ├── tsconfig.json                 [IMPLEMENTED] TypeScript compiler options (strict mode)
│   ├── nest-cli.json                 [IMPLEMENTED] NestJS CLI compiler configuration
│   ├── prisma/                       [IMPLEMENTED] Database schema and migration engine
│   │   ├── schema.prisma             [IMPLEMENTED] Prisma schema definition
│   │   └── migrations/               [IMPLEMENTED] SQL migration history
│   │       └── 20260928000000_init/  [IMPLEMENTED] Initial schema migration script
│   ├── src/                          [IMPLEMENTED] Backend source code
│   │   ├── main.ts                   [IMPLEMENTED] App bootstrap, validation pipe, Swagger
│   │   ├── app.module.ts             [IMPLEMENTED] Root dependency injection container
│   │   ├── prisma/                   [IMPLEMENTED] Prisma client lifecycle service & tests
│   │   ├── health/                   [IMPLEMENTED] Liveness / readiness health check & tests
│   │   ├── common/                   [IMPLEMENTED] Cross-cutting decorators & guards
│   │   ├── auth/                     [IMPLEMENTED] Registration, login, JWT strategies & tests
│   │   └── tasks/                    [IMPLEMENTED] Task CRUD, subtask hierarchy & tests
│   └── test/                         [IMPLEMENTED] E2E integration test suites
│       ├── jest-e2e.json             [IMPLEMENTED] Jest E2E configuration
│       ├── auth.e2e-spec.ts          [IMPLEMENTED] End-to-end auth test suite
│       └── tasks.e2e-spec.ts         [IMPLEMENTED] End-to-end task test suite
│
├── frontend/                         [IMPLEMENTED] Next.js 14 App Router Web Client
│   ├── package.json                  [IMPLEMENTED] Frontend dependencies and scripts
│   ├── tsconfig.json                 [IMPLEMENTED] TypeScript compiler options
│   ├── next.config.js                [IMPLEMENTED] Next.js configuration
│   ├── tailwind.config.js            [IMPLEMENTED] Design tokens, colors, dark mode strategy
│   ├── postcss.config.js             [IMPLEMENTED] PostCSS processor configuration
│   ├── app/                          [IMPLEMENTED] App Router directory
│   │   ├── layout.tsx                [IMPLEMENTED] Root HTML shell with providers
│   │   ├── globals.css               [IMPLEMENTED] Tailwind directives and CSS variables
│   │   ├── (auth)/                   [IMPLEMENTED] Route group for unauthenticated flows
│   │   │   ├── login/page.tsx        [IMPLEMENTED] Login screen
│   │   │   └── register/page.tsx     [IMPLEMENTED] Registration screen
│   │   └── (dashboard)/              [IMPLEMENTED] Route group for authenticated workspace
│   │       ├── layout.tsx            [IMPLEMENTED] Sidebar shell with auth protection
│   │       └── page.tsx              [IMPLEMENTED] Inbox view header & session status card
│   ├── components/                   [IMPLEMENTED] Reusable UI components
│   │   └── theme-toggle.tsx          [IMPLEMENTED] Light/dark mode switcher
│   └── lib/                          [IMPLEMENTED] Client utilities and state
│       ├── api-client.ts             [IMPLEMENTED] Strongly typed fetch API client
│       ├── auth-context.tsx          [IMPLEMENTED] React Context for auth state
│       ├── theme-context.tsx         [IMPLEMENTED] Theme persistence and DOM management
│       └── utils.ts                  [IMPLEMENTED] Classname merger utilities
│
├── docs/                             [IMPLEMENTED] Architectural records and phase documentation
│   └── build_and_implementation_...  [IMPLEMENTED] Engineering phase notes
├── v0-reference/                     [IMPLEMENTED] Raw UI component prototype export from v0 (gitignored)
├── ai-service/                       [PLANNED] Empty directory for future Python microservice
├── infrasturcture/                   [PLANNED] Empty directory for future deployment manifests
├── scripts/                          [PLANNED] Empty directory for automation scripts
└── tests/                            [PLANNED] Empty directory for root-level test orchestration
```

#### Planned Architecture `[PLANNED ARCHITECTURE]`
The Phase 4 System Design proposed an enterprise Turborepo monorepo layout:
- `apps/web`: Next.js web application
- `apps/api`: NestJS backend API
- `apps/ai`: Python/FastAPI microservice
- `packages/shared-types`: Shared TypeScript interface package between frontend and backend
- `packages/ui`: Shared design system component library

*Architectural Transition Rationale*: For Build Slices 0 through 4, having `backend/` and `frontend/` powered directly by native `npm workspaces` eliminated multi-package build orchestration overhead while keeping boundaries perfectly separated. Migrating to `apps/*` and `packages/*` is planned for when shared packages become necessary.

---

## 4. Git and GitHub Workflow

### Version Control Core Concepts
As a software engineer, Git is your time machine and safety harness:

| Git Concept | Definition & Purpose | Status in Project |
| :--- | :--- | :--- |
| **Repository** | The entire project database containing all files, commits, and branch history. | `[IMPLEMENTED]` |
| **Branch** | An isolated line of development allowing changes without affecting stable code. | `[IMPLEMENTED]` |
| **Commit** | An immutable snapshot of changes with an explanatory message. | `[IMPLEMENTED]` |
| **Conventional Commits** | A structured commit naming standard (`feat:`, `fix:`, `test:`). | `[IMPLEMENTED]` |
| **Pull Request (PR)** | A formal proposal to merge changes from a feature branch into `main`. | `[PLANNED]` |
| **Protected `main`** | A repository setting preventing direct commits to `main`. | `[PLANNED]` |
| **CI Automated Checks** | GitHub Actions running lint, typecheck, and tests on PR. | `[PLANNED]` |
| **Issue / PR Templates** | Standardized markdown templates for reporting issues or filing PRs. | `[PLANNED]` |
| **CODEOWNERS** | File defining individuals or teams responsible for code areas. | `[PLANNED]` |

> [!NOTE]
> The local repository contains a working `.git/` database and `.gitignore`. However, GitHub-specific configurations (such as `.github/workflows/`, issue templates, PR templates, and `CODEOWNERS`) are not yet present in the workspace and are categorized as `[PLANNED]`.

### Conventional Commits Standard
All commits in this project adhere to the **Conventional Commits** specification:
`<type>(<scope>): <short description>`

- `feat`: A new feature (e.g., `feat(tasks): implement subtask nesting validation`)
- `fix`: A bug fix (e.g., `fix(auth): return 409 instead of 500 on duplicate email`)
- `test`: Adding or correcting tests (e.g., `test(tasks): add cascade deletion e2e test`)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `docs`: Documentation updates only
- `chore`: Tooling updates or dependency upgrades

### Daily Development Workflow (Scrum of One)

```text
GitHub Issue (User Story / Slice)
  ▼
Create Feature Branch (e.g., feat/slice-3-tasks)
  ▼
Write Code & Unit Tests Locally
  ▼
Verify Tooling (npm run lint && npm run typecheck && npm run test)
  ▼
Open Pull Request to main
  ▼
Self-Review against Definition of Done
  ▼
Merge PR into main
```

#### Why This Applies to a Solo Developer
1. **Self-Review Mechanism**: Reading your own PR diff in GitHub or VS Code reveals debugging logs, commented-out dead code, and unhandled edge cases.
2. **Audit Trail**: Months later, `git blame` explains *why* an architectural decision or database constraint was introduced.
3. **Rollback Safety**: If an experimental feature breaks the application, the branch can be abandoned without contaminating `main`.

---

## 5. Local Development Environment

### Verified Technology Stack & Dependency Versions

The exact technology stack verified directly from project configuration and lockfiles:

| Technology | Verified Version | Role in Project | Configuration File |
| :--- | :--- | :--- | :--- |
| **Node.js Runtime** | v20+ / v24 (Types `^20.16.11`) | JavaScript/TypeScript execution engine | Root / Backend / Frontend |
| **TypeScript** | `^5.6.3` | Compile-time static type checking | `tsconfig.json` |
| **NestJS** | `^10.4.4` (CLI `^10.4.5`) | Backend modular framework | `backend/package.json` |
| **Next.js** | `^14.2.14` | Frontend App Router React framework | `frontend/package.json` |
| **React / React-DOM** | `^18.3.1` | UI component library | `frontend/package.json` |
| **Prisma ORM** | `^5.20.0` | Object-Relational Mapping & Migrations | `backend/package.json` |
| **PostgreSQL** | `16-alpine` | Relational database container | `docker-compose.yml` |
| **bcrypt** | `^5.1.1` | One-way password hashing (12 rounds) | `backend/package.json` |
| **Passport & JWT** | `passport ^0.7.0`, `passport-jwt ^4.0.1`, `@nestjs/jwt ^10.2.0` | Stateless token authentication | `backend/package.json` |
| **Validation** | `class-validator ^0.14.1`, `class-transformer ^0.5.1` | Request DTO validation pipeline | `backend/package.json` |
| **Swagger** | `@nestjs/swagger ^7.4.2`, `swagger-ui-express ^5.0.1` | OpenAPI documentation generator | `backend/package.json` |
| **Tailwind CSS** | `^3.4.19` | Utility-first CSS styling | `frontend/package.json` |
| **Lucide React** | `^1.48.0` | UI icon set | `frontend/package.json` |
| **Jest / Supertest** | `jest ^29.7.0`, `supertest ^7.0.0` | Unit and integration testing | `backend/package.json` |

### Environment Variables & Secrets Management
- **The Golden Rule**: **NEVER commit `.env` to Git.** Doing so leaks database credentials and cryptographic JWT keys to public repositories.
- **The Template Contract**: `.env.example` is committed to Git. It documents every variable required for local execution:

```env
# Database Configuration (PostgreSQL)
POSTGRES_USER=dev
POSTGRES_PASSWORD=dev
POSTGRES_DB=todoist_dev
POSTGRES_PORT=5432
DATABASE_URL=postgresql://dev:dev@localhost:5432/todoist_dev?schema=public
DATABASE_URL_TEST=postgresql://dev:dev@localhost:5432/todoist_test?schema=public

# Backend API Configuration (NestJS)
BACKEND_PORT=4000
NODE_ENV=development
API_PREFIX=api/v1
JWT_SECRET=dev_jwt_secret_key_change_in_production_123456789
JWT_EXPIRES_IN=7d

# Frontend Configuration (Next.js)
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## 6. Backend Implementation

The backend is built with **NestJS 10** as a **Modular Monolith**. It follows Clean Architecture principles, ensuring that incoming network requests, business rules, and database operations are cleanly decoupled.

### Request-to-Database Flow

```text
HTTP Request (e.g. POST /api/v1/tasks)
  │
  ▼
[ValidationPipe] ──── Checks DTO decorators (@IsString, @IsUUID, @Min, @Max)
  │
  ▼
[JwtAuthGuard] ────── Verifies Bearer JWT signature against JWT_SECRET
  │
  ▼
[Controller] ──────── Handles routing, extracts @CurrentUser, parses HTTP params
  │
  ▼
[Service] ─────────── Executes business logic, enforces ownership rules
  │
  ▼
[PrismaService] ───── Translates data operations into parameterized SQL queries
  │
  ▼
[PostgreSQL 16] ───── Executes query, enforces constraints, returns data
```

### Key Backend Architectural Components

#### 1. Application Bootstrap (`backend/src/main.ts`)
- **Global API Prefix**: Sets `api/v1` for all routes.
- **Strict Validation Pipeline**: Enables `ValidationPipe` with:
  - `whitelist: true`: Strips away any input properties not declared in the DTO (prevents mass-assignment property injection).
  - `forbidNonWhitelisted: true`: Throws a `400 Bad Request` if unknown properties are submitted.
  - `transform: true`: Automatically converts primitive query/param strings into numbers, booleans, or DTO instances.
- **CORS Configuration**: Restricts browser origins to `http://localhost:3000` and `http://127.0.0.1:3000` with `credentials: true`.
- **Swagger / OpenAPI Documentation**: Configured with `DocumentBuilder` and mounted at `/api/docs`.

#### 2. The Controller Layer (`*.controller.ts`)
- **Responsibility**: Pure HTTP ingress/egress. It defines routes (`@Get`, `@Post`, `@Patch`, `@Delete`), status codes (`@HttpCode`), parameter parsing (`ParseUUIDPipe`), and Swagger annotations (`@ApiTags`, `@ApiOperation`, `@ApiResponse`).
- **Rule**: **Controllers must NEVER contain business logic or direct database queries.** They receive input, pass it to the service, and return the response.

#### 3. The Service Layer (`*.service.ts`)
- **Responsibility**: Implements core business logic, domain rules, and security checks.
- **Example in Project**: In `TasksService`, before creating or updating a subtask, the service queries the database to confirm the parent task actually exists **and** belongs to the requesting user:

```typescript
// backend/src/tasks/tasks.service.ts
if (dto.parentTaskId) {
  const parentTask = await this.prisma.task.findUnique({
    where: { id: dto.parentTaskId },
  });

  if (!parentTask || parentTask.userId !== userId) {
    throw new NotFoundException(
      `Parent task with identifier '${dto.parentTaskId}' not found`,
    );
  }
}
```

#### 4. Data Transfer Objects (DTOs)
- Strongly typed TypeScript classes that define the expected shape of request bodies.
- Decorated with `class-validator` annotations (`@IsNotEmpty()`, `@IsOptional()`, `@IsUUID()`, `@Min(1)`, `@Max(4)`).

#### 5. Error Handling
- Handled via standard NestJS HTTP exceptions:
  - `400 BadRequestException`: Malformed payload or invalid operations (e.g., a task setting itself as its own parent).
  - `401 UnauthorizedException`: Missing, expired, or invalid JWT token.
  - `404 NotFoundException`: Entity does not exist, or belongs to another user (prevents ID enumeration).
  - `409 ConflictException`: Unique constraint violation (e.g., registering with an email already in use).

---

## 7. Database Implementation

### Conceptual ERD to Working Relational Schema
The database implementation is powered by **PostgreSQL 16** via **Prisma ORM**. The initial migration `20260928000000_init` was executed to create tables, constraints, and indexes.

```mermaid
erDiagram
    users ||--o{ tasks : "owns (1:N)"
    tasks ||--o{ tasks : "parent-of (1:N Adjacency List)"

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar auth_provider
        timestamptz created_at
        timestamptz updated_at
    }

    tasks {
        uuid id PK
        uuid user_id FK
        uuid parent_task_id FK "nullable"
        varchar title
        text description "nullable"
        date due_date "nullable"
        varchar due_time "nullable"
        smallint priority "1-4"
        boolean is_completed
        timestamptz created_at
        timestamptz updated_at
    }
```

### Relational Mechanics in PostgreSQL

#### 1. Primary Keys (UUIDv4)
Both `users` and `tasks` use random 128-bit UUIDs (`@id @default(uuid()) @db.Uuid`).
- *Why this matters*: Unlike auto-incrementing integers (`1, 2, 3...`), UUIDs cannot be guessed by malicious users in URL parameters (preventing scraping attacks).

#### 2. Foreign Keys & Cascade Deletes
- `tasks.user_id` references `users.id` with `onDelete: Cascade`. If a user account is deleted, all their tasks are immediately purged by PostgreSQL.
- `tasks.parent_task_id` references `tasks.id` with `onDelete: Cascade`. If a parent task is deleted, all nested subtasks are automatically removed.

#### 3. The Adjacency List Pattern for Hierarchical Subtasks
- Subtasks are implemented by having a `parent_task_id` column point back to the `tasks` table.
- A task with `parent_task_id = null` is a root-level task.
- A task with a valid `parent_task_id` is a subtask.
- *Query Behavior*: The database supports arbitrary hierarchy depth. In the current API implementation (`TasksService.findOne`), the query includes immediate subtasks 1 level deep (`include: { subtasks: true }`). Full multi-level recursive tree serialization is a `[PLANNED]` enhancement.

#### 4. Database Indexes
- Indexes (`@@index([userId])`, `@@index([parentTaskId])`) create B-Tree lookup structures in PostgreSQL.
- *Why this matters*: Without an index on `user_id`, PostgreSQL must scan every row in the entire table (`Seq Scan`) to find a user's tasks. With an index, it performs an instant `Index Scan` in $O(\log N)$ time.

#### 5. Database Entity Status

| Entity | Model in Schema | Migration Applied | Status |
| :--- | :--- | :--- | :--- |
| **User** | `User` in `schema.prisma` | `20260928000000_init` | `[IMPLEMENTED]` |
| **Task** | `Task` in `schema.prisma` | `20260928000000_init` | `[IMPLEMENTED]` |
| **Subtask Hierarchy** | Adjacency self-relation | `20260928000000_init` | `[IMPLEMENTED]` |
| **Project** | Not yet in schema | Pending future migration | `[PLANNED]` |
| **Section** | Not yet in schema | Pending future migration | `[PLANNED]` |
| **Label / TaskLabel** | Not yet in schema | Pending future migration | `[PLANNED]` |

---

## 8. Authentication Implementation

### Authentication vs. Authorization

> [!IMPORTANT]
> **Authentication**: *"Who are you?"* (Verifying email and password to prove identity).
> **Authorization**: *"What are you allowed to do?"* (Verifying that User A cannot read, edit, or delete User B's tasks).

### Authentication Architecture & Request Flow

```text
1. User submits email + password from Next.js Login form
      │
      ▼
2. POST /api/v1/auth/login
      │
      ▼
3. AuthService fetches user by normalized email from PostgreSQL
      │
      ▼
4. bcrypt.compare(submittedPassword, user.passwordHash)
      │
      ├─► Password Mismatch: throw 401 UnauthorizedException
      │
      └─► Password Match:
            │
            ▼
5. JwtService signs payload: { sub: user.id, email: user.email }
      │
      ▼
6. Returns { accessToken: "eyJhbGciOi...", user: { id, email } }
      │
      ▼
7. Next.js Client stores accessToken in localStorage
   Subsequent requests attach header: "Authorization: Bearer <token>"
```

### Password Hashing Mechanics (bcrypt)
- Passwords are **never** stored in plain text.
- This project uses `bcrypt` with **12 salt rounds**.
- A random 128-bit salt is generated for every user, combined with their password, and hashed over $2^{12} = 4096$ hashing iterations.
- This computational cost protects against offline dictionary attacks and rainbow tables if the database is compromised.

### Token Verification Lifecycle (`JwtStrategy` & `JwtAuthGuard`)
1. For protected routes (e.g., `/api/v1/tasks`), the `@UseGuards(JwtAuthGuard)` decorator activates Passport's `jwt` strategy.
2. Passport extracts the token from the `Authorization: Bearer <token>` header (or optional `req.cookies.access_token`).
3. It cryptographically verifies the token signature against `JWT_SECRET`.
4. If valid, `JwtStrategy.validate()` queries the database to confirm the user account still exists:

```typescript
// backend/src/auth/strategies/jwt.strategy.ts
async validate(payload: JwtPayload) {
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, authProvider: true },
  });

  if (!user) {
    throw new UnauthorizedException('User account no longer exists');
  }

  return user;
}
```

5. The authenticated user object `{ id, email, authProvider }` is attached to Express `req.user`.
6. The custom parameter decorator `@CurrentUser()` injects this user directly into controller handler arguments.

### Verified Authentication Feature Status

| Feature | Technical Implementation | Status |
| :--- | :--- | :--- |
| **Registration** | `POST /api/v1/auth/register` (email uniqueness + bcrypt) | `[IMPLEMENTED]` |
| **Login** | `POST /api/v1/auth/login` (credential check + JWT issuance) | `[IMPLEMENTED]` |
| **Current User Profile** | `GET /api/v1/auth/me` (guarded profile retrieval) | `[IMPLEMENTED]` |
| **Logout Endpoint** | `POST /api/v1/auth/logout` (session termination confirmation) | `[IMPLEMENTED]` |
| **Token Transport** | `Authorization: Bearer <token>` stored in `localStorage` | `[IMPLEMENTED]` |
| **Dual Token Extractor** | `JwtStrategy` checks Bearer header + cookie extractor | `[IMPLEMENTED]` |
| **Tenant Isolation** | Database queries scoped strictly by authenticated `userId` | `[IMPLEMENTED]` |
| **Refresh Tokens** | Refresh token rotation & HTTP-only cookie transport | `[OPEN DECISION]` |
| **Google OAuth** | OAuth 2.0 social login flow | `[PLANNED]` |

---

## 9. Task CRUD Implementation

### Concept of CRUD
**CRUD** represents the four fundamental operations of persistent storage:
- **C**reate (`POST`)
- **R**ead (`GET`)
- **U**pdate (`PATCH` or `PUT`)
- **D**elete (`DELETE`)

### Endpoints in the Task API

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/tasks` | Create a new root task or nested subtask | `[IMPLEMENTED]` |
| `GET` | `/api/v1/tasks` | List all tasks owned by the authenticated user | `[IMPLEMENTED]` |
| `GET` | `/api/v1/tasks/:id` | Retrieve an individual task with nested subtasks | `[IMPLEMENTED]` |
| `PATCH`| `/api/v1/tasks/:id` | Partially update task fields (title, priority, date) | `[IMPLEMENTED]` |
| `PATCH`| `/api/v1/tasks/:id/complete` | Toggle the completion status of a task | `[IMPLEMENTED]` |
| `DELETE`| `/api/v1/tasks/:id` | Delete a task and cascade delete its subtasks | `[IMPLEMENTED]` |

### Task Attributes and Priority System
- `id`: UUIDv4
- `title`: String (1 to 500 characters, trimmed of whitespace)
- `description`: Optional text
- `dueDate`: Optional date string formatted as `YYYY-MM-DD`
- `dueTime`: Optional time string formatted as `HH:mm`
- `priority`: Small integer:
  - `1`: P1 (Urgent / Red)
  - `2`: P2 (High / Orange)
  - `3`: P3 (Medium / Blue)
  - `4`: P4 (Default / No priority / Grey)
- `isCompleted`: Boolean (defaults to `false`)
- `parentTaskId`: Optional UUID of the parent task

### Data Isolation & Anti-IDOR Protection
**Insecure Direct Object Reference (IDOR)** occurs when an application accepts a record ID from a client and updates or returns that record without verifying ownership.

In this project, every single database query enforces tenant isolation:

```typescript
// Even though the client provides the taskId, the query ALWAYS checks userId:
const task = await this.prisma.task.findUnique({
  where: { id: taskId },
});

// If task does not exist OR belongs to another user, return 404:
if (!task || task.userId !== userId) {
  throw new NotFoundException(`Task with identifier '${taskId}' not found`);
}
```

> [!TIP]
> **Why return 404 instead of 403 Forbidden?**
> Returning `403 Forbidden` confirms to an attacker that the task ID actually exists in the database. Returning `404 Not Found` prevents **ID enumeration attacks** by concealing whether the record exists.

---

## 10. Frontend Implementation

### Next.js App Router Architecture
The frontend is constructed using the **Next.js 14 App Router** (`frontend/app/`), which uses folder-based routing and layout nesting:

```text
app/
├── layout.tsx                Root Layout: <html>, <body>, ThemeProvider, AuthProvider
├── globals.css               Tailwind CSS imports and CSS variable palettes
├── (auth)/                   Route Group: Isolated clean pages (no sidebar)
│   ├── login/page.tsx        Login form with validation & Google notice
│   └── register/page.tsx     Registration form with email/password validation
└── (dashboard)/              Route Group: Authenticated application shell
    ├── layout.tsx            Sidebar, user avatar, dark mode toggle, auth guard
    └── page.tsx              Inbox task view header & verified session card
```

### Route Groups `(auth)` and `(dashboard)`
Folders enclosed in parentheses (e.g., `(auth)` and `(dashboard)`) are **Route Groups**. They allow you to organize routes and assign different layout hierarchies without adding an extra segment to the public URL path:
- `app/(auth)/login/page.tsx` maps to `/login`.
- `app/(dashboard)/page.tsx` maps to `/`.

### Client vs. Server Components
- **Server Components (Default in Next.js)**: Executed exclusively on the Node.js server. They produce static HTML and cannot use React hooks (`useState`, `useEffect`) or browser APIs.
- **Client Components (`'use client'`)**: Executed in the browser. Required when handling user interaction, state, browser storage (`localStorage`), or React context.
- In this implementation, interactive shells, theme toggles, and form pages declare `'use client'`.

### Client-Side Authentication State (`AuthProvider`)
The `frontend/lib/auth-context.tsx` module provides global authentication state across the entire React component tree:
- State attributes: `user: UserProfile | null`, `isAuthenticated: boolean`, `isLoading: boolean`, `error: string | null`.
- On initial page mount, `AuthProvider` checks `localStorage` for `taskly_token`. If present, it makes a background call to `/api/v1/auth/me` to validate the session.
- If the token is invalid or expired, `logout()` is called, clearing `localStorage` and redirecting the user to `/login`.

### Client-Side Route Protection
Inside `app/(dashboard)/layout.tsx`, an authentication guard hook protects the workspace:

```typescript
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/login');
  }
}, [isLoading, isAuthenticated, router]);
```

### Verified Frontend Feature Status

| Feature | Technical Implementation | Status |
| :--- | :--- | :--- |
| **App Router Shell** | Root layout, providers, Tailwind dark mode | `[IMPLEMENTED]` |
| **Login Form Page** | Client form validation, error banners, auth integration | `[IMPLEMENTED]` |
| **Register Form Page** | Client validation, password checks, auth integration | `[IMPLEMENTED]` |
| **Authenticated Shell** | Sidebar navigation, user badge, logout button | `[IMPLEMENTED]` |
| **Theme Toggle** | Light / dark mode switching via `ThemeContext` | `[IMPLEMENTED]` |
| **Client-Side Auth Guard** | Redirect to `/login` when unauthenticated | `[IMPLEMENTED]` |
| **Strongly Typed API Client** | `apiClient` with Bearer injection & error formatting | `[IMPLEMENTED]` |
| **Task Management UI** | Creating/editing tasks via UI, task list rendering | `[PLANNED]` |
| **Subtask Tree Visualization** | Interactive nested subtask rendering in UI | `[PLANNED]` |
| **Kanban Board View** | Drag-and-drop board column view | `[PLANNED]` |

---

## 11. v0 → Antigravity → Existing Application Workflow

A critical aspect of this project is the AI-assisted visual workflow. We use **v0** for rapid visual design, but we **never** let it overwrite our production application.

```mermaid
flowchart TD
    A[v0 Prompting & Prototyping] -->|Export UI Reference| B[v0-reference/ Directory]
    B -->|Inspect Components & Tailwind Styles| C[Antigravity / Gemini Agent]
    C -->|Adapt & Integrate cleanly| D[Existing Next.js App Router]
    D -->|Connect via Strongly Typed API Client| E[Existing NestJS API & Postgres]
    
    style A fill:#7c3aed,stroke:#4c1d95,color:#fff
    style B fill:#4b5563,stroke:#1f2937,color:#fff
    style C fill:#2563eb,stroke:#1e40af,color:#fff
    style D fill:#059669,stroke:#047857,color:#fff
    style E fill:#d97706,stroke:#b45309,color:#fff
```

### Clarifying the Roles

#### 1. v0 is for UI/UX Design & Prototyping Only
- v0 generates beautiful Tailwind CSS and React component layouts.
- However, v0 generates self-contained, monolithic code with mock state, missing real database integration, missing authentication headers, and arbitrary routing patterns.
- **v0 is NOT the production application.**

#### 2. The v0 Export is Kept as a Reference
- The exported code from v0 is stored in `v0-reference/` inside the repository as a visual and stylistic guide.
- It is gitignored, is **never** run directly as the production app, and must **never** overwrite the root repository configuration.

#### 3. Antigravity Adapts the Design into the Architecture
- Antigravity (powered by Gemini) acts as the bridge:
  1. Inspects the styling, colors, and layout patterns inside `v0-reference/`.
  2. Extracts the visual components (sidebar navigation, icons, cards).
  3. Adapts them to fit into our clean Next.js App Router architecture (`(dashboard)/layout.tsx`, `api-client.ts`, `auth-context.tsx`).
  4. Connects the buttons and forms to the **real** NestJS REST backend.

#### 4. The Backend Remains the Source of Truth
- The NestJS API and PostgreSQL schema define the true capabilities of the application. The frontend UI merely visualizes and interacts with this contract.

---

## 12. AI-Assisted Development Rules

### The Golden Rule
> **"AI-generated code is treated as a junior developer's draft."**

As the lead engineer and BCA student, you bear 100% of the responsibility for every line of code committed to the repository. The AI can generate code in seconds, but you must be able to:
1. **Read** the code line by line.
2. **Explain** every function, hook, decorator, and SQL query.
3. **Run** the code locally and observe its behavior.
4. **Test** the code against positive and negative edge cases.
5. **Debug** errors using logs, breakpoints, and stack traces.
6. **Review** the code against security, validation, and architectural standards.
7. **Document** the technical lessons in your engineering notes.

### Tooling Roles in This Project

| Tool | Dedicated Role in the Engineering Workflow |
| :--- | :--- |
| **ChatGPT** | **The Teacher & Reviewer**: Explains high-level concepts, reviews architecture, acts as a conceptual mentor and debugging sounding board. |
| **Antigravity + Gemini** | **The Implementation Agent**: Executes concrete code slices, navigates the file tree, applies diffs, and inspects workspace state. |
| **v0** | **The UI/UX Prototyper**: Generates visual design ideas, Tailwind palettes, and responsive layouts. |
| **VS Code** | **The Local Development Environment**: Where you read code, run terminal commands, view git diffs, and test endpoints. |
| **GitHub** | **The Version Control & Audit Trail**: Stores branches, issues, PRs, and commit history. |
| **Physical Notebook** | **The Active Learning Record**: Where you hand-draw request flows, ERDs, and take notes to reinforce mental models. |

---

## 13. Build Milestones

### Milestone 0: Slice 0 — Project Foundation
- **Objective**: Establish the root monorepo, Docker PostgreSQL container, and barebones frontend/backend applications.
- **Concepts Learned**: Monorepo workspaces (`npm workspaces`), containerization with Docker Compose, NestJS bootstrapping, environment variable separation.
- **Implementation**: Created root `package.json`, `docker-compose.yml`, initialized `backend/` with NestJS CLI and `frontend/` with Next.js. Added health check endpoint (`/api/v1/health`).
- **Verification**: `docker compose up` starts PostgreSQL; `GET http://localhost:4000/api/v1/health` returns `{ status: "ok" }`. Unit tests in `health.controller.spec.ts` pass.
- **Status**: `[IMPLEMENTED]`

### Milestone 1: Slice 1 — Database Foundation
- **Objective**: Implement the relational database schema, Prisma migration engine, and model definitions.
- **Concepts Learned**: Relational data modeling, Object-Relational Mapping (ORM), primary keys (UUIDv4), foreign keys, cascade deletes, database indexing, migration scripts.
- **Implementation**: Created `backend/prisma/schema.prisma` with `User` and `Task` models; executed migration `20260928000000_init`. Configured Prisma service lifecycle.
- **Verification**: Inspected `backend/prisma/migrations/20260928000000_init/migration.sql`; verified indexes on `tasks(user_id)` and `tasks(parent_task_id)`. Unit tests in `prisma.service.spec.ts` pass.
- **Status**: `[IMPLEMENTED]`

### Milestone 2: Slice 2 — Authentication Module
- **Objective**: Implement secure user registration, credential authentication, password hashing, and JWT issuance.
- **Concepts Learned**: Cryptographic hashing (bcrypt salt rounds), stateless token authentication (JWT claims and signatures), Passport strategies, NestJS guards, input validation with DTOs.
- **Implementation**: Built `AuthModule`, `AuthController`, `AuthService`, `JwtStrategy`, `JwtAuthGuard`, and `@CurrentUser` decorator. Created registration, login, profile, and logout endpoints.
- **Verification**: Unit tests in `auth.service.spec.ts` and `auth.controller.spec.ts` pass (verified during review). E2E test suite `test/auth.e2e-spec.ts` exists.
- **Status**: `[IMPLEMENTED]`

### Milestone 3: Slice 3 — Task CRUD API
- **Objective**: Implement comprehensive task management with hierarchical subtask support and strict data isolation.
- **Concepts Learned**: RESTful API design, HTTP methods, anti-IDOR authorization checks, adjacency list pattern for self-referencing tree structures, cascade deletion.
- **Implementation**: Built `TasksModule`, `TasksController`, `TasksService`, and DTOs (`CreateTaskDto`, `UpdateTaskDto`). Implemented creation, listing, single task lookup with subtasks, partial update, completion toggling, and deletion.
- **Verification**: Unit tests in `tasks.service.spec.ts` and `tasks.controller.spec.ts` pass (verified during review). E2E test suite `test/tasks.e2e-spec.ts` exists.
- **Status**: `[IMPLEMENTED]`

### Milestone 4: Slice 4 — Frontend Core Shell & Auth Integration
- **Objective**: Construct the Next.js frontend application shell adapted from v0, with global authentication and theme state.
- **Concepts Learned**: Next.js App Router, Route Groups, React Context API, client-side route guards, strongly typed HTTP clients, dark mode with Tailwind CSS and CSS variables.
- **Implementation**: Created `api-client.ts`, `auth-context.tsx`, `theme-context.tsx`, `theme-toggle.tsx`, `(auth)/login`, `(auth)/register`, and `(dashboard)/layout.tsx`.
- **Verification**: Typecheck passes (`npm run typecheck --workspace=frontend` verified during review). Tested registration, login, token persistence in `localStorage`, and redirection guards.
- **Status**: `[IMPLEMENTED]`

### Milestone 5: Slice 5 — Frontend Task Management UI
- **Objective**: Build the interactive task management interface: Inbox view, task creation modal/form, task completion checkbox, priority flags, and subtask tree visualization.
- **Concepts Learned**: Optimistic UI updates, complex form handling, nested component recursion for subtasks, date picker integration.
- **Implementation**: Integrate task fetching, creation, editing, and deletion in `app/(dashboard)/page.tsx` using `api-client.ts`.
- **Verification**: Create, view, update, complete, and delete tasks from the browser UI; confirm real-time updates and persistence in PostgreSQL.
- **Status**: `[PLANNED]`

### Milestone 6: Slice 6 — Projects, Sections, and Labels
- **Objective**: Implement multi-project organization, column-based sections, and color-coded labels.
- **Concepts Learned**: Multi-entity relational modeling, many-to-many relationships (`TaskLabel`), complex SQL queries with joins.
- **Implementation**: Extend Prisma schema with `Project`, `Section`, and `Label` models; implement corresponding NestJS modules and frontend views.
- **Verification**: End-to-end tests verifying project creation, section assignment, and label filtering.
- **Status**: `[PLANNED]`

### Milestone 7: Slice 7 — Views (Today, Upcoming, Board View)
- **Objective**: Implement filtered task views (Today, Upcoming) and a drag-and-drop Kanban Board view.
- **Concepts Learned**: Date manipulation and range queries in SQL, Kanban drag-and-drop mechanics, layout switching.
- **Implementation**: Create `/today` and `/upcoming` routes; implement Kanban board columns based on sections or status.
- **Verification**: Verify tasks appear in correct date buckets; verify drag-and-drop updates section ID or task order.
- **Status**: `[PLANNED]`

### Milestone 8: Slice 8 — AI Task Breakdown Service
- **Objective**: Build an AI service that decomposes large tasks into actionable subtasks.
- **Concepts Learned**: LLM integration, prompt engineering, structured JSON output parsing, microservice communication.
- **Implementation**: Python/FastAPI microservice in `ai-service/` communicating with Google Gemini API; backend proxy endpoint in NestJS.
- **Verification**: Submitting "Organize BCA final project presentation" automatically generates 5 nested subtasks.
- **Status**: `[FUTURE PHASE]`

---

## 14. Testing During Build

### Testing is Part of Implementation
A fundamental principle of modern software engineering: **A feature is not built until it is tested.** Deferring testing to the end of a project leads to hidden bugs compounding over time, making root-cause analysis nearly impossible.

```text
┌────────────────────────────────────────────────────────┐
│                   The Testing Pyramid                  │
│                                                        │
│                    /   E2E Tests   \                   │  Tests full system
│                   /  (Supertest /   \                  │  via HTTP against
│                  /    Playwright)    \                 │  real database.
│                 /─────────────────────\                │
│                /   Integration Tests   \               │  Tests modules, guards,
│               /  (Controllers+Services) \              │  and database queries.
│              /───────────────────────────\             │
│             /         Unit Tests          \            │  Tests isolated functions
│            /     (Mocked dependencies)     \           │  and edge cases in memory.
│           /─────────────────────────────────\          │
└────────────────────────────────────────────────────────┘
```

### Verified Testing Status

| Test Suite | Files | Test Count | Execution Result During Review |
| :--- | :--- | :--- | :--- |
| **Backend Unit Tests** | `src/**/*.spec.ts` (6 suites) | 33 tests | **PASSED** (6/6 suites, 33/33 tests passed in 26.71s) `[IMPLEMENTED]` |
| **Backend TypeScript Check** | `tsc --noEmit` | N/A | **PASSED** (Exit code 0) `[IMPLEMENTED]` |
| **Frontend TypeScript Check** | `tsc --noEmit` | N/A | **PASSED** (Exit code 0) `[IMPLEMENTED]` |
| **Backend E2E Tests** | `test/auth.e2e-spec.ts`, `test/tasks.e2e-spec.ts` | 2 suites | *Tests exist; execution status not verified during review because Docker/PostgreSQL daemon was offline.* `[IMPLEMENTED]` |
| **Frontend Component Tests** | None currently configured | 0 | `[PLANNED]` |
| **End-to-End User Journey Tests** | Playwright / Cypress | 0 | `[PLANNED]` |

### Unit Tests Mocking Mechanics (`backend/src/tasks/tasks.service.spec.ts`)
- The `PrismaService` is mocked using a Jest mock object with methods like `create`, `findUnique`, `findMany`, `update`, and `delete`.
- This enables testing business edge cases (e.g., throwing a `BadRequestException` when `parentTaskId === taskId`, or throwing `NotFoundException` when accessing another user's task) in milliseconds without connecting to a physical database.

---

## 15. Debugging Workflow

When an error occurs, novice developers often panic and paste the entire codebase into an AI prompt asking to "fix everything." Professional software engineers follow a systematic 10-step debugging protocol:

```text
1. Reproduce
   Confirm the exact steps, payload, or URL that triggers the failure.
   │
2. Read the Error
   Read the exact error message and the top frame of the stack trace.
   │
3. Identify the Layer
   Is it in the Browser (Network/React), NestJS Controller, Service, Prisma, or Postgres?
   │
4. Understand Expected Behavior
   What SHOULD have happened according to the specification?
   │
5. Inspect Code
   Examine the specific lines where the error originated.
   │
6. Smallest Reasonable Change
   Apply a minimal, targeted fix instead of rewriting whole files.
   │
7. Run Again
   Execute the application and re-test the failure scenario.
   │
8. Test Affected Behavior
   Verify that the bug is resolved.
   │
9. Check for Regressions
   Run the full test suite (npm run test) to confirm nothing else broke.
   │
10. Document the Lesson
    Record the root cause and solution in your engineering notes.
```

### The Layer Isolation Mental Model
When an error occurs, identify which boundary failed:
1. **Network Layer**: Did the request reach the server? Check HTTP status code (404, 500, CORS error).
2. **Validation Layer**: Did the payload violate DTO rules? Check 400 response body for `class-validator` messages.
3. **Auth Guard Layer**: Was the token rejected? Check for 401 Unauthorized or expired signature.
4. **Service / Business Layer**: Did a domain rule fail? Check for custom exceptions (`ConflictException`, `BadRequestException`).
5. **Database Layer**: Did a foreign key or unique constraint fail? Check PostgreSQL error codes (e.g., `23505` unique violation).

---

## 16. Code Review and Quality

Before marking any build slice as complete, conduct a self-review using the following criteria:

- [ ] **Correctness**: Does the code implement all requirements without crashing or infinite loops?
- [ ] **Readability**: Are variable and function names self-describing (e.g., `parentTaskId` vs `pId`)?
- [ ] **Maintainability**: Is code modular? Are complex blocks broken down into helper methods?
- [ ] **Security**: Are all inputs validated? Are passwords hashed? Are ownership checks enforced?
- [ ] **Validation**: Are DTOs properly decorated with `class-validator` rules?
- [ ] **Authorization**: Does the query verify `userId === currentUser.id`?
- [ ] **Error Handling**: Are expected failure states handled with appropriate HTTP status codes?
- [ ] **Duplication (DRY)**: Is there redundant logic that should be extracted into a shared utility or service?
- [ ] **Unnecessary Complexity (KISS)**: Is the solution as simple as possible without over-engineering?
- [ ] **TypeScript Strictness**: Are there any instances of `any`? (All types should be explicitly declared).
- [ ] **Test Coverage**: Are there unit tests covering success and failure branches?
- [ ] **Architectural Consistency**: Does the code adhere to the established Controller → Service → Prisma pattern?

---

## 17. Security During Build

Security is not an afterthought added at deployment; it is baked into the code during implementation:

```text
┌──────────────────────────────────────────────────────────────┐
│                    Defense in Depth Layers                   │
│                                                              │
│  1. Transport Layer      │  HTTPS (production), CORS policy  │
│  2. Network / Ingress    │  ValidationPipe (whitelist: true) │
│  3. Authentication       │  bcrypt (12 rounds), JWT signed   │
│  4. Authorization        │  Tenant isolation (Anti-IDOR)     │
│  5. Database / Query     │  Prisma parameterized SQL         │
│  6. Secrets Hygiene      │  .env gitignored, .env.example    │
└──────────────────────────────────────────────────────────────┘
```

1. **Password Security**: Passwords hashed using `bcrypt` with 12 rounds. Plaintext passwords are never logged or stored.
2. **Stateless JWT Signatures**: Access tokens are signed using `JWT_SECRET` and checked for expiration on every request.
3. **Data Isolation (Anti-IDOR)**: Users can never read, update, or delete records belonging to other tenants.
4. **Input Whitelisting**: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` strips away unauthorized fields, preventing mass assignment attacks.
5. **SQL Injection Prevention**: Prisma ORM uses **parameterized queries** for all database operations, making SQL injection impossible.
6. **Information Leakage Prevention**: Returning generic `404 Not Found` messages instead of `403 Forbidden` prevents attackers from discovering valid IDs.
7. **Secrets Protection**: Secret keys are loaded strictly through environment variables. The `.gitignore` file guarantees `.env` is never pushed to GitHub.

---

## 18. What I Should Understand Before Moving to Testing

As a BCA student learning software engineering, you should be able to answer each of these questions in your own words before moving to Phase 6 (Testing):

1. **Repository Structure**: *Why do we use an npm workspaces monorepo instead of two separate Git repositories?*
2. **Frontend/Backend Separation**: *Why do Next.js and NestJS run on separate ports, and what protocol connects them?*
3. **Request Flow**: *Can you trace the exact path an HTTP request takes from a button click in React to a row updated in PostgreSQL?*
4. **Three-Layer Architecture**: *What is the specific responsibility of a Controller versus a Service versus Prisma?*
5. **Relational Database Design**: *How does an adjacency list model hierarchical subtasks in a single table?*
6. **Authentication vs. Authorization**: *What is the difference between proving identity with a JWT and proving ownership of a task?*
7. **CRUD**: *Which HTTP methods map to Create, Read, Update, and Delete, and what status codes do they return?*
8. **API Communication**: *How does the frontend `ApiClient` automatically attach the JWT bearer token to outgoing requests?*
9. **Frontend State Management**: *How does `AuthContext` provide user data to components without prop-drilling?*
10. **Protected Routes**: *How does the dashboard layout prevent unauthenticated users from seeing the workspace?*
11. **Input Validation**: *What happens inside NestJS when a user submits an invalid email or a priority number of 99?*
12. **Ownership & IDOR**: *Why must every database query include `where: { userId }` even if the client sends a valid `taskId`?*
13. **Git Discipline**: *Why do we use feature branches and conventional commits instead of committing straight to `main`?*
14. **AI-Assisted Engineering**: *Why must AI-generated code be treated as a junior developer's draft rather than trusted blindly?*

---

## 19. Build Phase Completion Checklist

### Foundation & Infrastructure
- [x] Root monorepo workspace configured (`package.json`, `npm workspaces`) `[IMPLEMENTED]`
- [x] Docker Compose PostgreSQL 16 container definition (`docker-compose.yml`) `[IMPLEMENTED]`
- [x] Environment variable configuration template (`.env.example`) `[IMPLEMENTED]`
- [x] Prettier and ESLint configured across workspaces `[IMPLEMENTED]`
- [ ] GitHub Actions CI workflow for automated lint/typecheck/test `[PLANNED]`

### Database Layer
- [x] Prisma ORM installed and configured (`@prisma/client 5.20.0`) `[IMPLEMENTED]`
- [x] PostgreSQL relational schema defined (`users`, `tasks`) `[IMPLEMENTED]`
- [x] Initial SQL migration generated and applied (`20260928000000_init`) `[IMPLEMENTED]`
- [x] B-Tree indexes configured on foreign keys (`userId`, `parentTaskId`) `[IMPLEMENTED]`
- [ ] `Project`, `Section`, and `Label` relational models `[PLANNED]`

### Backend API (NestJS 10)
- [x] NestJS application bootstrap with global prefix `/api/v1` `[IMPLEMENTED]`
- [x] Global `ValidationPipe` with input whitelisting and auto-transformation `[IMPLEMENTED]`
- [x] Swagger / OpenAPI interactive documentation at `/api/docs` `[IMPLEMENTED]`
- [x] Health check module (`GET /api/v1/health`) `[IMPLEMENTED]`
- [x] Auth module: registration, login, profile, logout (`/api/v1/auth/*`) `[IMPLEMENTED]`
- [x] Stateless JWT strategy and custom `@CurrentUser` decorator `[IMPLEMENTED]`
- [x] Task CRUD module with subtask hierarchy (`/api/v1/tasks/*`) `[IMPLEMENTED]`
- [x] Anti-IDOR ownership protection on all task endpoints `[IMPLEMENTED]`
- [ ] Arbitrary-depth recursive subtask tree serialization `[PLANNED]`
- [ ] Projects, Sections, and Labels CRUD modules `[PLANNED]`

### Frontend Web Client (Next.js 14)
- [x] Next.js App Router workspace shell initialized `[IMPLEMENTED]`
- [x] Tailwind CSS styling tokens, typography, and dark mode `[IMPLEMENTED]`
- [x] Strongly typed `ApiClient` with Bearer injection & error formatting `[IMPLEMENTED]`
- [x] `AuthProvider` with token persistence in `localStorage` `[IMPLEMENTED]`
- [x] Protected dashboard layout with client-side redirect guard `[IMPLEMENTED]`
- [x] Interactive theme toggle (Light / Dark mode) `[IMPLEMENTED]`
- [x] Login and Registration form pages `[IMPLEMENTED]`
- [ ] Interactive Task Management UI (Inbox, task list, creation modal, subtask nesting) `[PLANNED]`
- [ ] Project views, Section columns, and Label badges `[PLANNED]`
- [ ] Kanban Board drag-and-drop view `[PLANNED]`

### Testing & Verification
- [x] Backend unit tests for Prisma, Health, Auth, and Task services (33 tests) `[IMPLEMENTED]`
- [x] TypeScript compilation check passing across backend and frontend `[IMPLEMENTED]`
- [x] Backend E2E integration test suites created (`auth.e2e-spec.ts`, `tasks.e2e-spec.ts`) `[IMPLEMENTED]`
- [ ] Automated execution of E2E suites against live container in CI `[PLANNED]`
- [ ] Frontend component and integration tests `[PLANNED]`
- [ ] Cross-browser end-to-end user journey tests (Playwright) `[PLANNED]`

---

## 20. Key Engineering Lessons

1. **Architecture Becomes Real Code During Build**: System design diagrams are hypotheses; the Build phase is where those hypotheses are proven. Real code exposes edge cases (such as self-referencing task loops or cascade deletion constraints) that do not appear in high-level diagrams.
2. **Frontend and Backend Have Distinct Responsibilities**: The frontend is responsible for **presentation, interaction, and user feedback**. The backend is responsible for **business logic, data integrity, and security**. Never rely on the frontend to enforce security rules.
3. **APIs Create Clear System Boundaries**: The REST API contract (/api/v1) decouples the frontend from the backend. The frontend does not know or care that the backend uses Prisma and PostgreSQL; it only cares that the API returns the agreed-upon JSON structure.
4. **Database Design Dictates Application Behavior**: How you structure foreign keys and indexes directly impacts feature simplicity and performance. Choosing an adjacency list with cascade deletes makes subtask cleanup automatic and reliable.
5. **Authentication and Authorization Must Never Be Confused**: Proving *who* a user is (Authentication) does not give them permission to touch any record they want (Authorization). Every private endpoint must explicitly verify tenant ownership.
6. **Testing is Part of Implementation, Not an Afterthought**: Writing tests while building features verifies code immediately, prevents regressions, and forces you to write modular, testable code.
7. **AI Accelerates Coding but Increases Engineering Responsibility**: AI tools make code generation fast, but they do not guarantee correctness, security, or architectural integrity. The human engineer must understand, review, and verify every single line.
8. **Understanding Code is Essential**: Copying or accepting code without understanding its mechanics creates a codebase you cannot debug, maintain, or defend in an interview or review.
9. **Build Follows Requirements and Design**: High-quality software is built systematically from specifications, not by randomly adding features on the fly. When implementation decisions diverge from design, document them explicitly.

---

## Documentation Verification Status

- **Documentation verified against repository**: **YES** (Inspected actual folders, `package.json` files, source files, schemas, migrations, and tests).
- **Implementation-specific claims verified**: **YES** (Verified exact dependency versions, endpoint paths, database constraints, auth token transport, and unit test execution).
- **Unresolved items / Open Decisions**:
  1. *Refresh Token Transport*: Whether to introduce refresh token rotation and HTTP-only cookies for enhanced token security vs. maintaining short-lived stateless JWTs in `localStorage`.
  2. *Turborepo Monorepo Migration*: When to transition from the active `backend/` and `frontend/` npm workspaces layout to the planned `apps/*` and `packages/*` structure.
- **Partially implemented items**:
  1. *Subtask Tree Hierarchy*: Adjacency list relation and database cascading are fully implemented; API `findOne` returns 1 level of subtasks, while arbitrary-depth recursive tree serialization is planned.
  2. *Google OAuth*: Login page UI contains OAuth button and feedback notice; backend OAuth 2.0 Passport strategy is planned.
- **Next engineering milestone**:
  - **Milestone 5 (Slice 5)**: Frontend Task Management UI (connecting the Inbox view to the Task CRUD API, adding task creation modal, completion toggles, and subtask tree visualization).
