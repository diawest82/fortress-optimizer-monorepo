# AWS Backend Deployment Guide

## Pre-requisites

1. **AWS Account** with credentials configured
2. **AWS CLI** installed: `aws --version`
3. **Docker** installed: `docker --version`
4. **ECR, ECS, RDS, ElastiCache** permissions

---

## One-Command Deploy

```bash
cd /Users/diawest/projects/fortress-optimizer-monorepo
chmod +x aws-deploy.sh
./aws-deploy.sh
```

This will:
- ✅ Create ECR Repository (Docker container registry)
- ✅ Build & push Docker image
- ✅ Create RDS PostgreSQL database
- ✅ Create ElastiCache Redis cache
- ✅ Create ECS Cluster for deployment

---

## Manual Step-by-Step (if script fails)

### Step 1: Create ECR Repository
```bash
aws ecr create-repository \
  --repository-name fortress-optimizer-backend \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true
```

### Step 2: Build & Push Docker Image
```bash
cd backend

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t fortress-optimizer-backend:latest .

# Tag for ECR
docker tag fortress-optimizer-backend:latest \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend:latest

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend:latest
```

### Step 3: Create RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier fortress-optimizer-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --storage-type gp2 \
  --publicly-accessible false \
  --region us-east-1
```

Wait 5-10 minutes for DB to be ready, then get endpoint:
```bash
aws rds describe-db-instances \
  --db-instance-identifier fortress-optimizer-db \
  --query 'DBInstances[0].Endpoint.Address'
```

### Step 4: Create ElastiCache Redis
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id fortress-optimizer-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --region us-east-1
```

Wait 2-3 minutes, then get endpoint:
```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id fortress-optimizer-cache \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Address'
```

### Step 5: Create ECS Cluster
```bash
aws ecs create-cluster \
  --cluster-name fortress-optimizer-cluster \
  --region us-east-1
```

### Step 6: Create ECS Task Definition

Create file `ecs-task-definition.json`:
```json
{
  "family": "fortress-optimizer-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "fortress-optimizer",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "hostPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql://postgres:YourPassword@your-rds-endpoint:5432/fortress"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://your-cache-endpoint:6379"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fortress-optimizer",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register task definition:
```bash
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region us-east-1
```

### Step 7: Create ECS Service
```bash
aws ecs create-service \
  --cluster fortress-optimizer-cluster \
  --service-name fortress-optimizer-service \
  --task-definition fortress-optimizer-task:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/fortress-optimizer/xxxxx,containerName=fortress-optimizer,containerPort=8000" \
  --region us-east-1
```

---

## Get Backend URL

Once ECS service is running (5-10 minutes):

```bash
# Get Load Balancer DNS
aws elbv2 describe-load-balancers \
  --region us-east-1 \
  --query 'LoadBalancers[0].DNSName'
```

Your backend will be at: `http://your-load-balancer-dns`

---

## Verify Deployment

```bash
# Test health endpoint
curl http://your-load-balancer-dns/health

# Expected response:
# {"status":"healthy","version":"1.0.0"}
```

---

## Environment Variables

Set these in ECS Task Definition:
```
DATABASE_URL=postgresql://user:password@rds-endpoint:5432/fortress
REDIS_URL=redis://cache-endpoint:6379
API_KEY_LENGTH=32
JWT_SECRET=your-jwt-secret
ENVIRONMENT=production
```

---

## Monitoring

View logs:
```bash
aws logs tail /ecs/fortress-optimizer --follow
```

View service status:
```bash
aws ecs describe-services \
  --cluster fortress-optimizer-cluster \
  --services fortress-optimizer-service \
  --query 'services[0].[runningCount,desiredCount,status]'
```

Auto-scale to handle more traffic:
```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/fortress-optimizer-cluster/fortress-optimizer-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10
```

---

## Costs (Estimate)

- ECS Fargate: $0.0456/hour (~$33/month)
- RDS t3.micro: $0.017/hour (~$12/month)
- ElastiCache t3.micro: $0.017/hour (~$12/month)
- Load Balancer: $16/month
- Data transfer: ~$5-10/month

**Total: ~$70-80/month for production deployment**

---

## Next Steps After Deployment

1. **Get the backend URL** from load balancer
2. **Run load testing** (k6, artillery)
3. **Run security testing** (OWASP ZAP, API validation)
4. **Connect website** to backend API
5. **Integration test** all 11 products

---

## Troubleshooting

**Task fails to start:**
```bash
aws ecs describe-task-definition --task-definition fortress-optimizer-task:1
aws logs tail /ecs/fortress-optimizer --follow
```

**Can't connect to database:**
- Check RDS security group allows port 5432
- Verify DATABASE_URL env var is correct
- Check RDS is fully created: `aws rds describe-db-instances`

**Can't connect to Redis:**
- Check ElastiCache security group allows port 6379
- Verify REDIS_URL env var is correct

**High latency:**
- Check Task CPU/Memory allocation
- Consider scaling to more instances
- Monitor CloudWatch metrics
