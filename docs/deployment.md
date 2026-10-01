# Todoist-Style Application — Deployment & Infrastructure Guide

> [!IMPORTANT]
> **STUDENT EXPERIMENTAL PROJECT — HARD CONSTRAINT: ₹0 RUN & DEPLOYMENT COST**
> 
> This project is designed and verified to run and deploy at **₹0 cost**.
> 
> - **Primary Public ₹0 Deployment**: Next.js on Vercel + NestJS on Render + Serverless PostgreSQL on Neon/Supabase + Mock/Offline AI Fallback.
> - **Primary Local ₹0 Deployment**: Local Multi-Service Docker Compose (`docker-compose.yml`) & Local Kubernetes (`infra/kubernetes/overlays/dev`).
> - **Zero-Cost AI Architecture**: Default provider is `AI_PROVIDER=mock`, running 100% offline without external API costs.
> - **AWS Cloud Infrastructure**: The Terraform configurations (`infra/terraform/`) and AWS Load Balancer Ingress manifests are preserved strictly as **Educational / Reference Material** for understanding enterprise cloud design patterns, and must **NOT** be applied to live AWS accounts where they would incur recurring hourly charges (~$175–$330+/month).

---

## PART I: ACTUAL STUDENT PUBLIC DEPLOYMENT (₹0 COST PATHWAY)

### 1. Public ₹0 Architecture Overview

The public student deployment enables recruiters, peers, and evaluators to access the live application without spending money or entering credit cards.

```
Recruiter / Reviewer Browser
             │
             ▼
[ Next.js 14 Frontend on Vercel ]  (Free Hobby Tier, Global CDN, SSL)
             │
             │ HTTPS REST + JWT
             ▼
[ NestJS Backend on Render ]       (Free Web Service, Node 20, SSL)
             │
      ┌──────┴──────────────────────────────────┐
      ▼                                         ▼
[ PostgreSQL on Neon / Supabase ]    [ AI Task Breakdown Engine ]
(Free Serverless Postgres, SSL)      (Deterministic Heuristic Fallback / Fast Internal Mock)
```

### 2. Free Hosting Provider Matrix

| Component | Selected Provider | Plan / Tier | Credit Card Required? | Cost Risk | Free Plan Limitations & Mitigations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | Hobby | **No** | **₹0 (Zero)** | 100 GB bandwidth/month, fast edge rendering. No overage charges without explicit upgrade. |
| **Backend** | **Render** | Free Web Service | **No** | **₹0 (Zero)** | 512 MB RAM, 0.1 CPU. Sleeps after 15 min inactivity; wakes on incoming HTTP request (~50s cold start). 750 free instance hours/month. |
| **Database** | **Neon** or **Supabase** | Free Serverless | **No** | **₹0 (Zero)** | 0.5 GB storage, built-in connection pooling (`sslmode=require`). Neon suspends compute on idle and resumes in 500ms. Supabase pauses after 7 days inactivity. |
| **AI Service** | **Internal Mock / Groq** | Free / Mock | **No** | **₹0 (Zero)** | Default `MockProvider` generates structured subtasks offline with zero API calls. Free Groq API tier optional (`llama-3.1-8b-instant`). |
| **Domain & HTTPS** | **Vercel / Render** | Subdomain (`.vercel.app`, `.onrender.com`) | **No** | **₹0 (Zero)** | Automatic free Let's Encrypt SSL/TLS certificates. |
| **CI/CD** | **GitHub Actions / Git Push** | Free Public / Standard | **No** | **₹0 (Zero)** | Automated test & lint checks on push; automatic deploy on push to `main`. |

### 3. Step-by-Step Public Deployment Guide

#### Step 1: Create Free PostgreSQL Database (Neon or Supabase)
1. Sign up at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com) using your GitHub account (no credit card required).
2. Create a new project (e.g. `taskly-db`).
3. Copy the pooled connection string:
   `postgresql://[user]:[password]@[host]:5432/[database]?sslmode=require`

#### Step 2: Deploy Backend to Render
1. Sign up at [render.com](https://render.com) using your GitHub account.
2. Select **New +** -> **Web Service** and connect your GitHub repository (or use the Blueprint in `render.yaml`).
3. Configure settings:
   - **Name**: `taskly-backend`
   - **Region**: `Oregon` or `Ohio` (closest to your database)
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm run start:prod`
   - **Instance Type**: `Free`
4. Add Environment Variables in Render Dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: `[paste your Neon/Supabase pooled connection string]`
   - `JWT_SECRET`: `[generate a secure 32+ character random string]`
   - `CORS_ORIGINS`: `https://[your-app-name].vercel.app`
5. Click **Create Web Service**.
   Render will build the project, run database migrations (`npx prisma migrate deploy`), and start the NestJS server.
   Note down the public URL: `https://taskly-backend.onrender.com`.

#### Step 3: Deploy Frontend to Vercel
1. Sign up at [vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New Project** and import your repository.
3. Configure project settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click "Edit" and choose `frontend`.
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://taskly-backend.onrender.com/api/v1`
5. Click **Deploy**.
   Vercel compiles the Next.js bundle and publishes your public app at `https://[your-app-name].vercel.app`.

#### Step 4: Complete CORS Handshake
Update `CORS_ORIGINS` in your Render backend settings with the exact Vercel URL (e.g. `https://taskly.vercel.app`) if not already set.

---

## PART II: FUTURE AWS ENTERPRISE ARCHITECTURE (EDUCATIONAL REFERENCE ONLY)

### 1. Enterprise Reference Architecture Overview

The target production deployment architecture illustrates enterprise AWS container and managed service best practices (Reference Architecture):


```
                            [ Route 53 (DNS) ]
                                    │
                                    ▼
                         [ CloudFront (CDN/Edge) ]
                                    │
                                    ▼
                     [ Application Load Balancer (ALB) ]
                         (Public Subnets across AZs)
                                    │
            ┌───────────────────────┴───────────────────────┐
            │                                               │
            ▼                                               ▼
 [ Next.js Frontend Pods ]                     [ NestJS Backend API Pods ]
  (EKS Private App Subnet)                      (EKS Private App Subnet)
            │                                               │
            │                                     ┌─────────┴─────────┐
            │                                     │                   │
            │                                     ▼                   ▼
            │                         [ FastAPI AI Service Pods ]  [ Amazon RDS PostgreSQL ]
            │                          (Private Workload Subnet)    (Isolated DB Subnet)
            │                                     │
            │                                     ▼
            └───────────────────────► [ NAT Gateway Egress ] ──► [ LLM Provider (Groq/OpenAI) ]
```

---

## 2. Environment Model

| Environment | Purpose | Infrastructure Strategy | Database Strategy | State Locking |
| :--- | :--- | :--- | :--- | :--- |
| **Local** | Local dev & testing | Docker Compose (`postgres`, `backend`, `ai`, `frontend`) | Local Postgres container (`todoist_dev`, `todoist_test`) | N/A |
| **Dev** | Feature integration in cloud | Single NAT, shared EKS dev namespace | AWS RDS single-AZ PostgreSQL | S3 + DynamoDB |
| **Staging** | Pre-release validation | Multi-AZ ready, staging EKS namespace | AWS RDS single-AZ PostgreSQL | S3 + DynamoDB |
| **Prod** | Production live traffic | Multi-AZ NAT across 2 AZs, EKS prod node groups | Multi-AZ AWS RDS PostgreSQL with automated snapshots | S3 + DynamoDB |

---

## 3. Terraform Directory Structure

The infrastructure foundation is organized into reusable modules and environment-specific roots:

```
infra/terraform/
├── modules/
│   ├── vpc/                 # VPC, public/private/database subnets, IGW, NAT Gateways, Route Tables
│   ├── security_groups/     # Least-privilege SGs for ALB, Frontend, Backend, AI, Database
│   ├── ecr/                 # ECR registries for frontend, backend, ai-service with immutable tags
│   └── iam/                 # CI/CD deployer role, EKS cluster role, node roles, and pod IRSA
└── environments/
    ├── dev/                 # Dev environment instantiation (VPC 10.0.0.0/16, single NAT)
    ├── staging/             # Staging environment instantiation (VPC 10.1.0.0/16)
    └── prod/                # Production environment instantiation (VPC 10.2.0.0/16, multi-AZ NAT)
```

---

## 4. ECR Workflow & Immutable Releases

1. Each service (`frontend`, `backend`, `ai-service`) has an authoritative ECR repository under `todoist-${env}/${service}`.
2. `image_tag_mutability = "IMMUTABLE"` prevents overwriting releases and guarantees reproducible deployments.
3. Every release image is tagged with the Git commit short SHA (`${GIT_COMMIT.take(8)}`).
4. Automated scanning (`scan_on_push = true`) detects CVEs upon upload.
5. Lifecycle policies automatically prune untagged layers older than 7 days and retain up to 30 historical tagged releases.

---

## 5. Network Topology

- **VPC CIDRs**:
  - `dev`: `10.0.0.0/16`
  - `staging`: `10.1.0.0/16`
  - `prod`: `10.2.0.0/16`
- **Subnet Tiers**:
  - **Public Subnets** (`/24`): Holds public ALBs and NAT Gateways. Direct route to Internet Gateway (`0.0.0.0/0 -> igw`).
  - **Private Application Subnets** (`/24`): Holds EKS nodes and workload pods. Route table routes outbound internet traffic through NAT Gateway (`0.0.0.0/0 -> nat`).
  - **Isolated Database Subnets** (`/24`): Holds RDS PostgreSQL instances. Route table has **no** internet routes (`0.0.0.0/0` not routed).

---

## 6. Security Groups & Least Privilege Matrix

| Security Group | Ingress Rules | Egress Rules | Purpose |
| :--- | :--- | :--- | :--- |
| `alb-sg` | `80/tcp`, `443/tcp` from `0.0.0.0/0` | Outbound to VPC workloads | Public entry point |
| `frontend-sg` | `3000/tcp` from `alb-sg` only | Outbound for APIs and packages | Next.js SSR & static serving |
| `backend-sg` | `4000/tcp` from `alb-sg` and `frontend-sg` | Outbound to DB, AI, and AWS APIs | NestJS API core |
| `ai-sg` | `8000/tcp` from `backend-sg` only | `443/tcp` outbound via NAT | Internal-only FastAPI LLM gateway |
| `db-sg` | `5432/tcp` from `backend-sg` only | Outbound blocked (`127.0.0.1/32`) | Isolated relational database tier |

---

## 7. IAM & Secrets Architecture

1. **Role Separation**:
   - `cicd-deployer-role`: Minimal permissions for Jenkins to authenticate with ECR and push image artifacts.
   - `eks-cluster-role`: Scoped to `AmazonEKSClusterPolicy` and `AmazonEKSVPCResourceController`.
   - `eks-nodes-role`: Worker node permissions (`AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy`, `AmazonEC2ContainerRegistryReadOnly`).
   - `backend-pod-role` (IRSA): IAM Role for Service Accounts allowing only the NestJS backend pod to read `/todoist/${environment}/*` in AWS Secrets Manager.
2. **Secrets Storage**:
   - Secrets are managed in AWS Secrets Manager at `todoist/${var.environment}/app-secrets`.
   - Application reads secrets as environment variables mapped via Kubernetes external-secrets or AWS Secrets Store CSI driver.

---

## 8. Jenkins CI/CD Pipeline Stages

The authoritative declarative pipeline is defined in `Jenkinsfile`:

1. **Checkout**: Pulls specific Git branch and computes commit short SHA.
2. **Install Dependencies**: Parallel deterministic installation (`npm ci` for Node, virtualenv for Python).
3. **Lint & Type-Check**: Parallel ESLint and TypeScript validation for backend and frontend.
4. **Automated Tests**: Parallel execution of Jest unit tests and Pytest AI evaluation tests.
5. **Security Scan**: `npm audit` scanning for critical dependency CVEs.
6. **Docker Build**: Parallel container image compilation for `frontend`, `backend`, and `ai-service`.
7. **ECR Push**: Authenticates with AWS ECR and pushes immutable images tagged with commit SHA.
8. **Staging Deployment**: Automates deployment to staging cluster upon merge to `develop`.
9. **Production Approval Gate**: 24-hour manual approval gate for `main` branch deployments.
10. **Production Deployment**: Promotes the verified SHA tag to production cluster.

---

## 9. Kubernetes Architecture & Concepts

The deployment layer transitions from single-host container management (Docker Compose) to container orchestration with Kubernetes on Amazon EKS.

### 9.1 Docker vs. Kubernetes
- **Docker / Docker Compose**: Runs containerized services on a single host. Suitable for local development and integration testing. Lacks automated multi-node scheduling, native horizontal pod autoscaling, zero-downtime rolling updates across compute instances, self-healing pod restarts across failure domains, and declarative cluster state reconciliation.
- **Kubernetes (K8s)**: An orchestrator that manages declarative state across an elastic cluster of worker nodes. It automates container placement, health-driven traffic routing, rolling deployments, horizontal autoscaling, service discovery, and configuration management.

### 9.2 Core Kubernetes Primitives
- **Pod**: The smallest deployable unit in Kubernetes, containing one or more tightly-coupled containers sharing network namespace, IPC, and storage volumes.
- **Deployment**: Declarative controller that manages Pod replicas and executes rolling updates (`maxSurge: 1`, `maxUnavailable: 0`), ensuring zero-downtime deployments.
- **Service**: Stable internal networking abstraction providing DNS names and Layer-4 load balancing across transient Pod IP addresses.
  - `web-service`: ClusterIP on port 3000 (routes to Next.js).
  - `backend-service`: ClusterIP on port 4000 (routes to NestJS).
  - `ai-service`: **Internal-only** ClusterIP on port 8000 (strictly internal to NestJS; never exposed on Ingress).
- **Ingress**: Layer-7 entry point routing external traffic via AWS Load Balancer Controller to internal ClusterIP Services (`/api` -> `backend-service:4000`, `/` -> `web-service:3000`).
- **Namespace**: Virtual cluster partitioning providing isolated resource scoping for `todoist-dev`, `todoist-staging`, and `todoist-prod`.
- **ConfigMap**: Key-value store for non-sensitive runtime parameters (`NODE_ENV`, ports, service URLs, CORS origins).
- **Secret**: Encrypted/opaque storage for sensitive credentials (`DATABASE_URL`, `JWT_SECRET`, `AI_API_KEY`).
- **Readiness vs. Liveness Probes**:
  - **Readiness Probe**: Determines whether the Pod should receive ingress traffic. If it fails, the Pod is temporarily removed from service endpoints without restarting the container.
  - **Liveness Probe**: Determines whether the container process is alive and healthy. If it fails repeatedly (`failureThreshold: 3`), Kubernetes terminates and restarts the container.
  - *Resilience Rule*: Liveness probes do not depend on external systems (e.g., Groq API or PostgreSQL) to prevent cascading restart storms across the cluster during external outages.
- **Horizontal Pod Autoscaler (HPA)**: Dynamically adjusts replica counts based on CPU and memory utilization thresholds.
- **Migration Job**: A finite, declarative `batch/v1` Job that runs database migrations before rolling out updated application pods.

---

## 10. Kubernetes Directory Structure (Kustomize Base & Overlays)

```
infra/kubernetes/
├── base/
│   ├── config/
│   │   ├── configmap.yaml       # Non-sensitive base configuration
│   │   └── secret.yaml.example  # Example secret structure
│   ├── web/
│   │   ├── deployment.yaml      # Next.js frontend Deployment
│   │   ├── service.yaml         # ClusterIP service (port 3000)
│   │   └── hpa.yaml             # Web autoscaler (min: 2, max: 10)
│   ├── api/
│   │   ├── deployment.yaml      # NestJS backend Deployment
│   │   ├── service.yaml         # ClusterIP service (port 4000)
│   │   └── hpa.yaml             # API autoscaler (min: 2, max: 10)
│   ├── ai/
│   │   ├── deployment.yaml      # FastAPI AI Deployment
│   │   ├── service.yaml         # Internal ClusterIP service (port 8000)
│   │   └── hpa.yaml             # AI autoscaler (min: 2, max: 5)
│   ├── migrations/
│   │   └── job.yaml             # Prisma migration Job (batch/v1)
│   ├── ingress/
│   │   └── ingress.yaml         # AWS ALB Ingress (rules for /api and /)
│   ├── namespace.yaml           # Standalone base namespace
│   └── kustomization.yaml       # Base resource aggregator
└── overlays/
    ├── dev/                     # Namespace: todoist-dev (1 replica, dev domain, mock AI)
    │   ├── namespace.yaml
    │   ├── secret.yaml.example
    │   ├── kustomization.yaml
    │   └── patches/
    ├── staging/                 # Namespace: todoist-staging (2 replicas, staging domain)
    │   ├── namespace.yaml
    │   ├── secret.yaml.example
    │   ├── kustomization.yaml
    │   └── patches/
    └── prod/                    # Namespace: todoist-prod (3 replicas, production domain)
        ├── namespace.yaml
        ├── secret.yaml.example
        ├── kustomization.yaml
        └── patches/
```

---

## 11. Database Migration Safety & Expand-Migrate-Contract Pattern

In Kubernetes, database schema changes must be deployed using the **Expand-Migrate-Contract** pattern to prevent breaking old pods during rolling updates:

1. **Expand**: Deploy a backward-compatible migration where new columns or tables are added as nullable or with default values. Old pods continue running smoothly against the expanded schema.
2. **Migrate**: Run the Kubernetes migration Job (`infra/kubernetes/base/migrations/job.yaml`) executing `npx prisma migrate deploy`. If the migration fails, the deployment pipeline halts before updating application pods.
3. **Rollout**: Deploy new API pods that utilize the expanded database schema.
4. **Contract**: In a subsequent release, remove legacy, unused columns once all running pods are on the new version.

---

## 12. Local vs. AWS Kubernetes Workflows

### Local Kustomize Validation Workflow
```bash
# 1. Validate Base Manifests
kubectl kustomize infra/kubernetes/base

# 2. Validate Dev Overlay Manifests
kubectl kustomize infra/kubernetes/overlays/dev

# 3. Validate Staging Overlay Manifests
kubectl kustomize infra/kubernetes/overlays/staging

# 4. Validate Production Overlay Manifests
kubectl kustomize infra/kubernetes/overlays/prod
```

### AWS EKS Deployment Workflow
```bash
# 1. Update Kubeconfig for EKS Cluster
aws eks update-kubeconfig --region us-east-1 --name todoist-staging-cluster

# 2. Apply or update Secrets in Target Namespace
kubectl apply -f <securely-injected-staging-secrets.yaml> -n todoist-staging

# 3. Execute Migration Pre-Rollout Job
kubectl apply -f infra/kubernetes/overlays/staging/job.yaml
kubectl wait --for=condition=complete job/prisma-migrate-job -n todoist-staging --timeout=120s

# 4. Apply Application Overlays (Rolling Update)
kubectl apply -k infra/kubernetes/overlays/staging

# 5. Monitor Rolling Update Status
kubectl rollout status deployment/web-deployment -n todoist-staging
kubectl rollout status deployment/backend-deployment -n todoist-staging
kubectl rollout status deployment/ai-deployment -n todoist-staging
```

### Rollback Procedure
If a regression or fault is discovered after deployment:
```bash
# 1. Roll back the deployment to the previous revision
kubectl rollout undo deployment/backend-deployment -n todoist-staging
kubectl rollout undo deployment/web-deployment -n todoist-staging

# 2. Verify rollback rollout status
kubectl rollout status deployment/backend-deployment -n todoist-staging

# 3. Check deployment revision history
kubectl rollout history deployment/backend-deployment -n todoist-staging
```

---

## 13. Implemented vs. Deferred Milestone Scope

---

## 14. Amazon RDS PostgreSQL & AWS Data Layer Architecture

The database layer provides persistent relational data storage for the Todoist-style application using Amazon RDS PostgreSQL 16.

### 14.1 Database Architecture & Placement
```
Internet
    │
    ▼
[ ALB / Ingress ]
    │
    ▼
[ EKS Worker Nodes / Pods ]  (Private Application Subnets: 10.x.10.0/24, 10.x.20.0/24)
├── Next.js Web
├── NestJS API (NestJS + Prisma Client)
└── FastAPI AI (Strictly Internal - No DB Access)
    │
    │  TCP Port 5432 (TLS/SSL Enforced)
    │  Allowed ONLY from Backend Workload Security Group
    ▼
[ Amazon RDS PostgreSQL ]    (Isolated Database Subnets: 10.x.30.0/24, 10.x.40.0/24)
├── Primary DB Instance (Multi-AZ in Prod, Single-AZ in Dev/Staging)
└── AWS Secrets Manager (Credentials & Encrypted DATABASE_URL)
```

### 14.2 Database Networking & Security
- **No Public IP**: RDS is configured with `publicly_accessible = false` and assigned only private IP addresses inside `aws_db_subnet_group.main`.
- **Isolated Subnets**: The database resides in dedicated database subnets with no route to the Internet Gateway (`0.0.0.0/0` is unrouted).
- **Security Group Isolation**:
  - `todoist-<env>-db-sg` ingress permits port 5432 exclusively from `todoist-<env>-backend-sg`.
  - Ingress from `0.0.0.0/0` is strictly rejected.
  - Egress from the database tier is blocked (`127.0.0.1/32`).
- **Encryption**:
  - **In Transit**: Enforced via custom parameter group setting `rds.force_ssl = 1`.
  - **At Rest**: Enforced using AWS KMS AES-256 storage encryption (`storage_encrypted = true`).

### 14.3 Environment Separation Matrix

| Configuration | Development (`dev`) | Staging (`staging`) | Production (`prod`) |
| :--- | :--- | :--- | :--- |
| **Database Name** | `todoist_dev` | `todoist_staging` | `todoist_prod` |
| **Instance Class** | `db.t4g.micro` (2 vCPU, 1GB RAM) | `db.t4g.small` (2 vCPU, 2GB RAM) | `db.t4g.medium` (2 vCPU, 4GB RAM) |
| **Initial Storage** | 20 GB gp3 | 20 GB gp3 | 50 GB gp3 |
| **Autoscaling Limit** | 50 GB | 100 GB | 200 GB |
| **Multi-AZ Replication** | `false` (Cost control) | `false` (Cost-conscious) | `true` (Synchronous Standby) |
| **Backup Retention** | 1 day | 7 days | 30 days (PITR enabled) |
| **Deletion Protection** | `false` (Teardown flexibility) | `false` | `true` (Accidental deletion guard) |
| **Final Snapshot** | `skip_final_snapshot = true` | `skip_final_snapshot = true` | `skip_final_snapshot = false` |
| **Secrets Manager Window** | 0 days (Immediate delete) | 7 days recovery | 30 days recovery |

### 14.4 Secrets Flow
No database passwords, tokens, or credentials are hardcoded or committed to git. The secrets propagation workflow operates as follows:

```
[ AWS Secrets Manager ]
  Container: todoist/<env>/rds-credentials
  (Stores: host, port, username, password, database, DATABASE_URL)
        │
        ▼  (IRSA: backend-pod-role via Secrets Store CSI / External Secrets Operator)
[ Kubernetes Namespace ]
  Secret: todoist-secrets
  (Key: DATABASE_URL)
        │
        ▼  (secretKeyRef in Deployment and Migration Job)
[ Pod Runtime Environment ]
  ENV: DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
        │
        ▼  (Prisma Client / Prisma CLI)
[ Amazon RDS PostgreSQL ]
  Encrypted TLS Connection Established
```

### 14.5 Prisma Migration Workflow & Safety
Database schema evolution maintains a strict separation between development and deployment:

1. **Development Workflow**:
   - Developer modifies `backend/prisma/schema.prisma`.
   - Runs `npm run prisma:migrate` (`prisma migrate dev`).
   - Prisma generates SQL migration scripts in `backend/prisma/migrations/<timestamp>_<name>/migration.sql`.
   - Migration files are reviewed and committed to version control.
2. **Deployment Workflow**:
   - CI/CD pipeline triggers the pre-rollout migration Job (`infra/kubernetes/base/migrations/job.yaml`).
   - Runs `npm run prisma:deploy` (`prisma migrate deploy`).
   - Applies pending migrations transactionally without prompting or resetting existing data.
   - If migration fails, the Job terminates with error and stops pod rollout.
3. **The Expand-Migrate-Contract Rule**:
   - **Expand**: Add new columns/tables as nullable or with defaults. Old application pods continue running normally.
   - **Migrate**: Run `prisma migrate deploy` to update the database schema.
   - **Rollout**: Deploy new API pods reading/writing the new schema fields.
   - **Contract**: In a subsequent release, deprecate and safely drop old, unused columns.

### 14.6 Health & Readiness Architecture
The backend distinguishes process liveness from database readiness:
- **Liveness Probe** (`GET /api/v1/health` or `/api/v1/health/live`):
  - Returns `{ status: 'ok', uptime }`.
  - Verifies the Node.js event loop without executing database queries.
  - *Prevents Cascading Failures*: Database maintenance or short failovers do not cause Kubernetes to restart healthy backend pods.
- **Readiness Probe** (`GET /api/v1/health/ready`):
  - Executes `SELECT 1` via `PrismaService.$queryRaw`.
  - Returns `200 OK` when the database connection pool is healthy.
  - Returns `503 Service Unavailable` if PostgreSQL is unreachable.
  - *Traffic Protection*: Kubernetes temporarily removes unready pods from the Ingress target group until the database responds.

### 14.7 Automated Backups, Snapshots & Disaster Recovery
- **Continuous Backups**: Amazon RDS automatically captures transaction logs and volume snapshots during the daily backup window (`03:00-04:00 UTC`).
- **Point-in-Time Recovery (PITR)**: Enables rolling back the database to any specific second within the retention window (up to 30 days in production).
- **Manual Snapshots**: Pre-deployment snapshots should be triggered before major schema migrations.
- **Production Restore Procedure**:
  1. Restore snapshot or point-in-time to a *new* DB instance (`todoist-prod-db-restored`).
  2. Verify data integrity against the restored instance.
  3. Update `DATABASE_URL` in AWS Secrets Manager to point to the restored instance.
  4. Trigger a rolling restart of backend pods (`kubectl rollout restart deployment/backend-deployment -n todoist-prod`).

---

## 15. Implemented vs. Deferred Milestone Scope

### Implemented in Milestone 3:
- Reusable RDS PostgreSQL module (`infra/terraform/modules/rds`) with gp3 storage, KMS encryption, parameter groups (`rds.force_ssl = 1`), and storage autoscaling.
- Environment instantiations across `dev`, `staging`, `prod` with cost-conscious settings (dev: `db.t4g.micro`, single-AZ; prod: `db.t4g.medium`, Multi-AZ, 30-day backups, deletion protection).
- AWS Secrets Manager integration for database credentials with zero password leakage in Terraform outputs.
- Backend database health separation: `/api/v1/health` (process liveness) and `/api/v1/health/ready` (database readiness with `SELECT 1`).
- Kubernetes API Deployment readiness probe updated to `/api/v1/health/ready`.
- Unit tests for health liveness and readiness passing (`health.controller.spec.ts`).
- Full backend test suite passing (77/77 tests across 11 test suites).
- Terraform formatting and validation passing across all modules and environments (`terraform validate` exit code 0).
- Local Prisma migration deployment verified (`prisma migrate deploy` exit code 0).

### Intentionally Deferred to Later Milestone:
- Live `terraform apply` creating billable AWS cloud resources (EKS clusters, RDS instances, NAT Gateways).
- Live ALB DNS registration and ACM SSL certificates.

---

## 16. Manual Bootstrap Prerequisites for Cloud Apply

Before running `terraform apply` against AWS:
1. **AWS CLI Credentials**: Configure `aws configure` with an authorized IAM administrative user.
2. **Remote State S3 Bucket**: Create an encrypted S3 bucket (`todoist-terraform-state-<env>`) with versioning enabled.
3. **DynamoDB State Lock Table**: Create DynamoDB table (`todoist-terraform-locks-<env>`) with partition key `LockID` (String).
4. **Enable Backend**: Rename `backend.tf.example` to `backend.tf` in the target environment directory.

---

## 17. Cost-Sensitive Resources Warning

The following AWS resources incur recurring hourly charges:
- **RDS PostgreSQL**: Hourly instance fee (`db.t4g.micro` ~$0.016/hr in dev vs `db.t4g.medium` ~$0.064/hr in prod) + storage allocation.
- **EKS Control Plane**: ~$72/month per cluster.
- **NAT Gateways**: ~$32/month per gateway + data transfer. In `dev` and `staging`, `single_nat_gateway = true` is enforced to reduce cost by 50%.
- **ALB**: Hourly load balancer fee + LCU usage.

---

## 18. Local Validation Commands

```bash
# 1. Format all Terraform code
cd infra/terraform
terraform fmt -recursive

# 2. Validate Dev environment
cd environments/dev
terraform init -backend=false
terraform validate

# 3. Validate Staging environment
cd ../staging
terraform init -backend=false
terraform validate

# 4. Validate Production environment
cd ../prod
terraform init -backend=false
terraform validate

# 5. Validate Kubernetes Base and Overlays
cd ../../../
kubectl kustomize infra/kubernetes/base
kubectl kustomize infra/kubernetes/overlays/dev
kubectl kustomize infra/kubernetes/overlays/staging
kubectl kustomize infra/kubernetes/overlays/prod

# 6. Verify Backend Unit and Health Tests
cd backend
npm test

# 7. Verify Prisma Migration Status
npm run prisma:status
npm run prisma:deploy

# 8. Validate Docker Compose configuration
cd ..
docker compose config
```

