# AWS Terraform Reference Architecture (Educational / Reference Only)

> [!CAUTION]
> **STUDENT EXPERIMENTAL PROJECT — HARD CONSTRAINT: ₹0 COST**
> 
> Do **NOT** run `terraform apply` against an active AWS account for this student project.
> Running `terraform apply` on these configurations will provision billable AWS cloud infrastructure and incur real recurring charges.

---

## 1. Purpose of This Directory

This directory contains enterprise-grade Infrastructure-as-Code (Terraform) configurations for educational and reference purposes. It demonstrates how a production-ready cloud infrastructure would be organized for a Todoist-style application on Amazon Web Services (AWS), using:

- **AWS VPC**: Multi-tier subnets (public, private application, isolated database).
- **AWS EKS**: Elastic Kubernetes Service with managed worker node groups.
- **Amazon RDS**: PostgreSQL 16 relational database with KMS encryption and automated backups.
- **AWS ECR**: Private container registries with immutable release tags and vulnerability scanning.
- **AWS IAM**: Least-privilege roles, service-linked policies, and Pod-level IAM Roles for Service Accounts (IRSA).
- **AWS Security Groups**: Strict Layer-4 firewall isolation between tiers.

---

## 2. Estimated AWS Cloud Costs If Applied (Why This Is Kept As Reference)

The architecture described in these Terraform files incurs recurring monthly hourly charges:

| AWS Resource | Monthly Estimated Cost | Reason for Charge |
| :--- | :--- | :--- |
| **Amazon EKS Control Plane** | ~$73.00 / month | AWS charges $0.10/hour per active cluster control plane. |
| **EC2 Worker Nodes** | ~$30.00 – $120.00 / month | 2–3 `t3.medium` or `t3.large` instances running 24/7. |
| **AWS NAT Gateways** | ~$32.85 – $65.70 / month | $0.045/hour per gateway + outbound data transfer (2 in Prod). |
| **Amazon RDS PostgreSQL** | ~$15.00 – $60.00 / month | Instance hourly fee (`db.t4g.micro` to `db.t4g.medium`) + gp3 storage. |
| **Application Load Balancer** | ~$16.20 / month | Hourly fee + Load Balancer Capacity Units (LCU). |
| **Elastic IP Addresses** | ~$7.30 / month | IPv4 address allocation fee ($0.005/hour each). |
| **Total Cloud Run Cost** | **~$175.00 – $330.00+ / month (₹14,500 – ₹27,000+ / month)** | |

**Conclusion**: For a student project, provisioning this infrastructure directly violates the ₹0 constraint. Therefore, these Terraform modules are maintained strictly as reference learning material and verified syntactically via `terraform validate` without live deployment.

---

## 3. Active ₹0 Deployment Pathways

To run and deploy the Todoist-style application at **₹0 cost**, use either of the verified local/free pathways:

### Pathway A: Local Multi-Service Docker Compose (Recommended)
```bash
# Start all 4 services locally at ₹0 cost:
# - PostgreSQL 16 (local container)
# - FastAPI AI Service (offline mock provider)
# - NestJS Backend API (port 4000)
# - Next.js Frontend (port 3000)
docker compose up -d
```

### Pathway B: Local Kubernetes (kind / minikube / k3s / Docker Desktop)
```bash
# 1. Build local container images
docker build -f backend/Dockerfile -t todoist/backend:latest .
docker build -f frontend/Dockerfile -t todoist/frontend:latest .
docker build -f ai-service/Dockerfile -t todoist/ai-service:latest ./ai-service

# 2. Deploy complete self-contained dev overlay (including local PostgreSQL) at ₹0:
kubectl apply -k infra/kubernetes/overlays/dev

# 3. Access the application via port-forwarding:
kubectl port-forward svc/web-service 3000:3000 -n todoist-dev
kubectl port-forward svc/backend-service 4000:4000 -n todoist-dev
```

---

## 4. Terraform Validation Without Applying

To validate Terraform syntax and module structure locally without incurring costs:

```bash
# 1. Format code
cd infra/terraform
terraform fmt -recursive

# 2. Validate environments locally without remote backend or credentials
cd environments/dev
terraform init -backend=false
terraform validate
```
