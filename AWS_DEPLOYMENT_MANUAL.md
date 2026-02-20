# AWS Backend Deployment - Manual Steps

## Current Status

✅ **Completed:**
- ECR Repository created: `fortress-optimizer-backend`
- RDS PostgreSQL: `database-1.cmnnhksj3tmt.us-east-1.rds.amazonaws.com`
- ElastiCache Redis cluster created
- ECS Cluster: `fortress-optimizer-cluster`
- Application Load Balancer created
- Docker image built and pushed to ECR

⏳ **In Progress:**
- ECS Service (needs manual setup due to CLI timeouts)

## Quick Start - Use Local Backend

While the ECS service deploys, you can test with the local backend:

```bash
# 1. Start local backend
cd /Users/diawest/projects/fortress-optimizer-monorepo
python -m venv venv
source venv/bin/activate
cd backend
pip install -r requirements.txt
python main.py
```

This starts the backend on `http://localhost:8000`

## Run Tests Against Local Backend

```bash
export BACKEND_URL="http://localhost:8000"

# Run security tests
./tests/security-test.sh $BACKEND_URL

# Run integration tests
./tests/integration-test.sh $BACKEND_URL

# Run load tests
k6 run tests/load-test.js --environment BACKEND_URL=$BACKEND_URL
```

## AWS Console Manual Setup (If CLI Issues Persist)

### Step 1: Create ECS Task Definition
1. Go to: AWS Console → ECS → Task Definitions
2. Create new task definition:
   - **Family name:** `fortress-optimizer-task`
   - **Launch type compatibility:** FARGATE
   - **CPU:** 256
   - **Memory:** 512
   - **Container name:** `fortress-optimizer-backend`
   - **Image URI:** `673895432464.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend:latest`
   - **Port mappings:** 8000
   - **Environment variables:**
     - `DATABASE_URL`: `postgresql://fortress:fortress@database-1.cmnnhksj3tmt.us-east-1.rds.amazonaws.com:5432/fortress`
     - `REDIS_URL`: `redis://fortress-cache:6379`
     - `ENVIRONMENT`: `production`
   - **Log configuration:**
     - Log driver: awslogs
     - Log group: `/ecs/fortress-optimizer`
     - Region: us-east-1
     - Stream prefix: ecs

### Step 2: Create Target Group (if not exists)
1. Go to: AWS Console → EC2 → Target Groups
2. Create target group:
   - **Name:** `fortress-optimizer-tg`
   - **Protocol:** HTTP
   - **Port:** 8000
   - **VPC:** Default VPC
   - **Target type:** IP ← **IMPORTANT for Fargate**
   - **Health check:** /health
   - **Interval:** 30 seconds
   - **Healthy threshold:** 2
   - **Unhealthy threshold:** 3

### Step 3: Create ECS Service
1. Go to: AWS Console → ECS → Clusters → fortress-optimizer-cluster
2. Create service:
   - **Service name:** `fortress-optimizer-service`
   - **Task definition:** fortress-optimizer-task (latest)
   - **Service type:** REPLICA
   - **Desired count:** 2
   - **Launch type:** FARGATE
   - **Networking:**
     - VPC: Default
     - Subnet: Default subnet (any)
     - Security group: default
     - Assign public IP: ENABLED
   - **Load balancing:**
     - Load balancer type: Application Load Balancer
     - Load balancer: fortress-optimizer (the created ALB)
     - Container: fortress-optimizer-backend:8000
     - Target group: fortress-optimizer-tg
   - **Click Create Service**

### Step 4: Get ALB DNS Name
1. Go to: AWS Console → EC2 → Load Balancers
2. Find `fortress-optimizer` load balancer
3. Copy the **DNS name** (e.g., `fortress-optimizer-XXXX.us-east-1.elb.amazonaws.com`)
4. Save it

### Step 5: Wait for Tasks to Be Healthy
1. Go to: AWS Console → ECS → Clusters → fortress-optimizer-cluster → fortress-optimizer-service
2. Check **Tasks** tab
3. Wait until both tasks show **Last status: RUNNING** and **Health status: HEALTHY**
4. This usually takes 2-3 minutes

## Test the Backend

```bash
# Save ALB DNS from console
export BACKEND_URL="http://fortress-optimizer-XXXX.us-east-1.elb.amazonaws.com"

# Quick health check
curl $BACKEND_URL/health

# Run all tests
./tests/security-test.sh $BACKEND_URL
./tests/integration-test.sh $BACKEND_URL
k6 run tests/load-test.js --environment BACKEND_URL=$BACKEND_URL
```

## Alternative: Use CLI with Simpler Commands

If AWS CLI starts working again:

```bash
# List what was created
aws ecs list-services --cluster fortress-optimizer-cluster --region us-east-1

# Describe the service
aws ecs describe-services \
  --cluster fortress-optimizer-cluster \
  --services fortress-optimizer-service \
  --region us-east-1

# Get ALB DNS
aws elbv2 describe-load-balancers \
  --region us-east-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

## Architecture Deployed

```
Internet
   ↓
Application Load Balancer (us-east-1)
   ↓
ECS Service (2 Fargate tasks, auto-scaling 2-10)
   ├─ Task 1: fortress-optimizer-backend:latest
   ├─ Task 2: fortress-optimizer-backend:latest
   ↓
RDS PostgreSQL
Database: fortress
User: fortress
Password: fortress

ElastiCache Redis
Endpoint: fortress-cache
Port: 6379
```

## Monitoring

Check CloudWatch logs:
- Log group: `/ecs/fortress-optimizer`
- View logs from running tasks

## Cost Estimate

- ECS Fargate: ~$0.04 per task-hour × 2 tasks × 730 hours = ~$58/month
- RDS (db.t3.micro): ~$12/month  
- ElastiCache (cache.t3.micro): ~$12/month
- Load Balancer: ~$16/month
- **Total:** ~$98/month (eligible for free tier credits)

## Next Steps

1. ✅ Local testing (run tests against local backend)
2. ⏳ ECS service deployment
3. ⏳ Get ALB DNS name
4. ⏳ Run tests against AWS backend
5. ⏳ Update website with backend URL
6. ⏳ Final validation before Feb 17 launch

---

**Need help?** Check AWS CloudWatch logs or use AWS Console UI for manual setup.
