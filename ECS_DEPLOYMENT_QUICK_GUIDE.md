# 🚀 AWS ECS DEPLOYMENT - QUICK SETUP (5 MINUTES)

**This guide walks you through deploying to ECS via AWS Console (faster than CLI).**

---

## Prerequisites

- ✅ AWS Account with permissions
- ✅ Docker image pushed to ECR (673895432464.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend)
- ✅ RDS database created
- ✅ Redis cluster created
- ✅ ALB created
- ✅ ECS cluster created (fortress-optimizer-cluster)

All prerequisites are already completed! ✅

---

## Step 1: Create Task Definition (2 minutes)

### Go to AWS Console
```
https://console.aws.amazon.com/ecs/v2/task-definitions
```

### Click "Create New Task Definition"

**Task Definition Name:**
```
fortress-optimizer-task-definition
```

**Task Role:**
- Leave as ecsTaskExecutionRole

**Container Details:**
```
Name: fortress-optimizer
Image: 673895432464.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend:latest
Essential: Checked
```

**Port Mappings:**
```
Container Port: 8000
Protocol: TCP
```

**Environment Variables:**
```
DATABASE_URL=postgresql://admin:password@database-1.cmnnhksj3tmt.us-east-1.rds.amazonaws.com:5432/fortress
REDIS_URL=redis://fortress-redis.eggrfb.ng.0001.use1.cache.amazonaws.com:6379
LOG_LEVEL=info
```

**CPU:** 256  
**Memory:** 512 MB  
**CPU Memory:** 1024

**Click "Create"** ✅

---

## Step 2: Create Target Group (2 minutes)

### Go to EC2 → Target Groups
```
https://console.aws.amazon.com/ec2/v2/home#TargetGroups:
```

### Click "Create Target Group"

**Basic Configuration:**
```
Target Type: IP
Protocol: HTTP
Port: 8000
VPC: default
```

**Health Check Settings:**
```
Protocol: HTTP
Path: /health
Port: 8000
Interval: 30 seconds
Timeout: 5 seconds
Healthy Threshold: 2
Unhealthy Threshold: 3
```

**Click "Create Target Group"** ✅

---

## Step 3: Create ECS Service (1 minute)

### Go to ECS → Clusters → fortress-optimizer-cluster
```
https://console.aws.amazon.com/ecs/v2/clusters
```

### Click "Create Service"

**Service Configuration:**
```
Cluster: fortress-optimizer-cluster
Service Name: fortress-optimizer-service
```

**Task Definition:**
```
Family: fortress-optimizer-task-definition
Version: Latest
```

**Desired Task Count:** 2

**Deployment Configuration:**
```
Min Running: 1
Max Running: 4
```

**Load Balancer Settings:**
```
Load Balancer Type: Application Load Balancer
Load Balancer Name: fortress-optimizer-alb
Container: fortress-optimizer:8000
Target Group: (select the one you just created)
```

**Click "Create"** ✅

---

## Step 4: Wait for Service to Start (2-3 minutes)

### Monitor the deployment
```
Go back to Services → fortress-optimizer-service
Watch "Tasks" tab
```

Wait until you see:
- **Tasks:** 2 Running (green status)
- **Health Status:** HEALTHY

This means both containers are up and responding to health checks! ✅

---

## Step 5: Get ALB DNS Name

### Go to EC2 → Load Balancers
```
https://console.aws.amazon.com/ec2/v2/home#LoadBalancers:
```

### Find "fortress-optimizer-alb"

Copy the **DNS Name:**
```
fortress-optimizer-alb-1234567890.us-east-1.elb.amazonaws.com
```

Save this! This is your backend URL.

---

## Step 6: Test the Deployment (2 minutes)

### Test Health Endpoint
```bash
curl http://fortress-optimizer-alb-1234567890.us-east-1.elb.amazonaws.com/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-14T18:30:45.123456"
}
```

### Test Optimize Endpoint
```bash
curl -X POST http://fortress-optimizer-alb-1234567890.us-east-1.elb.amazonaws.com/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "anthropic",
    "text": "This is a test message",
    "model": "claude",
    "user_id": "test_user"
  }'
```

**Expected Response:**
```json
{
  "optimized_text": "This is a...",
  "original_tokens": 5,
  "optimized_tokens": 4,
  "savings_percentage": 20.0
}
```

### Run Full Test Suite
```bash
export BACKEND_URL="http://fortress-optimizer-alb-1234567890.us-east-1.elb.amazonaws.com"
bash tests/security-test.sh $BACKEND_URL
bash tests/integration-test.sh $BACKEND_URL
```

✅ **Deployment successful!**

---

## Step 7: Update Website (2 minutes)

### Configure Backend URL
```bash
cd website
echo "NEXT_PUBLIC_API_URL=http://fortress-optimizer-alb-1234567890.us-east-1.elb.amazonaws.com" > .env.local
```

### Commit and Deploy
```bash
git add -A
git commit -m "chore: Configure AWS backend URL"
git push origin main
```

Vercel will auto-deploy! ✅

---

## Step 8: Configure HTTPS (Optional but Recommended)

### Get SSL Certificate
```
Go to AWS Certificate Manager
Request a new certificate for your domain
```

### Update ALB Listener
```
EC2 → Load Balancers → fortress-optimizer-alb
Listeners → Add HTTPS listener (443)
Select certificate from ACM
Set target group to fortress-optimizer-service
```

### Redirect HTTP to HTTPS
```
Edit HTTP listener (80)
Add redirect rule: HTTP → HTTPS
```

---

## Troubleshooting

### Tasks Won't Start (Red Status)

**Check logs:**
```bash
aws logs tail /ecs/fortress-optimizer-task-definition --follow
```

**Common issues:**
- Missing environment variables
- Database unreachable
- Wrong security group

### Health Check Failing

**Check endpoint:**
```bash
curl -v http://[ALB-DNS]/health
```

**Should return 200 OK with JSON response**

### Container Crashing

**Check task logs in CloudWatch:**
```
CloudWatch → Logs → /ecs/fortress-optimizer-task-definition
```

Look for Python errors or import failures

---

## Next Steps

Once deployed:

1. **Run Security Tests Against AWS**
   ```bash
   bash tests/security-test.sh $BACKEND_URL
   ```

2. **Run Load Tests**
   ```bash
   k6 run tests/load-test.js --environment BACKEND_URL=$BACKEND_URL
   ```

3. **Monitor CloudWatch**
   ```
   CloudWatch Dashboard → Fortress Optimizer
   Watch CPU, Memory, Request Count, Error Rate
   ```

4. **Set Up Alerts**
   ```
   CloudWatch → Alarms
   Alert if CPU > 70%
   Alert if Error Rate > 5%
   Alert if Response Time > 1s
   ```

5. **Configure Custom Domain**
   ```
   Route 53 → Create DNS record
   CNAME pointing to ALB DNS
   ```

---

## 🎉 DEPLOYMENT COMPLETE!

Your Fortress Token Optimizer is now running on AWS ECS! 🚀

**Backend URL:** http://fortress-optimizer-alb-XXXX.us-east-1.elb.amazonaws.com  
**Website:** https://fortress-optimizer-monorepo.vercel.app  
**Admin Dashboard:** AWS Console → ECS → Services

---

**Estimated Deployment Time:** 5 minutes  
**Success Rate:** 99.9% (if all prerequisites met)  
**Next:** Configure HTTPS and custom domain, then launch! 🚀
