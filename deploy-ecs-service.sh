#!/bin/bash

# Complete ECS Service Deployment for Fortress Backend

set -e

PROJECT_NAME="fortress-optimizer"
REGION="us-east-1"
CLUSTER_NAME="fortress-optimizer-cluster"

echo "🚀 Completing ECS Service Deployment..."
echo "Region: $REGION"
echo "Cluster: $CLUSTER_NAME"

# Retrieve AWS credentials from environment
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account: $AWS_ACCOUNT_ID"

# Get ECR repository URI
echo ""
echo "📋 Getting ECR Repository..."
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}-backend"
echo "ECR URI: $ECR_URI"

# Step 1: Build and push Docker image to ECR
echo ""
echo "🐳 Building and pushing Docker image..."
docker build -t ${PROJECT_NAME}-backend:latest backend/
docker tag ${PROJECT_NAME}-backend:latest ${ECR_URI}:latest
docker push ${ECR_URI}:latest
echo "✅ Docker image pushed to ECR"

# Step 2: Create ECS Task Definition
echo ""
echo "📝 Creating ECS Task Definition..."

# Get RDS endpoint with retries
RETRY_COUNT=0
MAX_RETRIES=10
RDS_ENDPOINT=""

while [ -z "$RDS_ENDPOINT" ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "  Attempting to get RDS endpoint... (try $((RETRY_COUNT+1))/$MAX_RETRIES)"
  RDS_ENDPOINT=$(aws rds describe-db-instances \
    --region $REGION \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text 2>/dev/null | grep -v "None")
  
  if [ -z "$RDS_ENDPOINT" ] || [ "$RDS_ENDPOINT" == "None" ]; then
    RDS_ENDPOINT=""
    sleep 5
    ((RETRY_COUNT++))
  fi
done

if [ -z "$RDS_ENDPOINT" ]; then
  echo "⚠️  Could not get RDS endpoint. Using default..."
  RDS_ENDPOINT="fortress-db.XXXXX.us-east-1.rds.amazonaws.com"
fi

echo "RDS Endpoint: $RDS_ENDPOINT"

# Get Redis endpoint with retries
RETRY_COUNT=0
REDIS_ENDPOINT=""

while [ -z "$REDIS_ENDPOINT" ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "  Attempting to get Redis endpoint... (try $((RETRY_COUNT+1))/$MAX_RETRIES)"
  REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
    --region $REGION \
    --query 'CacheClusters[0].CacheNodes[0].Address' \
    --output text 2>/dev/null | grep -v "None")
  
  if [ -z "$REDIS_ENDPOINT" ] || [ "$REDIS_ENDPOINT" == "None" ]; then
    REDIS_ENDPOINT=""
    sleep 5
    ((RETRY_COUNT++))
  fi
done

if [ -z "$REDIS_ENDPOINT" ]; then
  echo "⚠️  Could not get Redis endpoint. Using default..."
  REDIS_ENDPOINT="fortress-cache.XXXXX.ng.0001.use1.cache.amazonaws.com"
fi

echo "Redis Endpoint: $REDIS_ENDPOINT"

# Create task definition JSON
cat > /tmp/task-definition.json <<EOFDEF
{
  "family": "${PROJECT_NAME}-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "${PROJECT_NAME}-backend",
      "image": "${ECR_URI}:latest",
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
          "value": "postgresql://fortress:fortress@${RDS_ENDPOINT}:5432/fortress"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://${REDIS_ENDPOINT}:6379"
        },
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/${PROJECT_NAME}",
          "awslogs-region": "${REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "essential": true
    }
  ],
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole"
}
EOFDEF

# Create CloudWatch log group
echo "  Creating CloudWatch log group..."
aws logs create-log-group \
  --log-group-name "/ecs/${PROJECT_NAME}" \
  --region $REGION 2>/dev/null || echo "  Log group already exists"

# Register task definition
echo "  Registering task definition..."
TASK_DEF=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-definition.json \
  --region $REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "Task Definition: $TASK_DEF"

# Step 3: Get VPC and subnet information
echo ""
echo "🌐 Getting VPC information..."
VPC_ID=$(aws ec2 describe-vpcs \
  --region $REGION \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text)

SUBNET_IDS=$(aws ec2 describe-subnets \
  --region $REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[*].SubnetId' \
  --output text | head -c 100)

SECURITY_GROUP=$(aws ec2 describe-security-groups \
  --region $REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

echo "VPC: $VPC_ID"
echo "Subnets: $SUBNET_IDS"
echo "Security Group: $SECURITY_GROUP"

# Step 4: Get Load Balancer Target Group
echo ""
echo "🎯 Getting Load Balancer Target Group..."
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --region $REGION \
  --names "${PROJECT_NAME}-tg" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null)

if [ "$TARGET_GROUP_ARN" == "None" ] || [ -z "$TARGET_GROUP_ARN" ]; then
  echo "  Creating target group..."
  TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name "${PROJECT_NAME}-tg" \
    --protocol HTTP \
    --port 8000 \
    --vpc-id $VPC_ID \
    --health-check-enabled \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
fi

echo "Target Group: $TARGET_GROUP_ARN"

# Step 5: Create or update ECS Service
echo ""
echo "⚙️  Creating/updating ECS Service..."

# Check if service exists
SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services "${PROJECT_NAME}-service" \
  --region $REGION \
  --query 'services[0].serviceName' \
  --output text 2>/dev/null || echo "")

if [ "$SERVICE_EXISTS" == "${PROJECT_NAME}-service" ]; then
  echo "  Updating existing service..."
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service "${PROJECT_NAME}-service" \
    --task-definition $TASK_DEF \
    --force-new-deployment \
    --region $REGION \
    --query 'service.serviceArn' \
    --output text
else
  echo "  Creating new service..."
  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name "${PROJECT_NAME}-service" \
    --task-definition $TASK_DEF \
    --desired-count 2 \
    --launch-type FARGATE \
    --load-balancers targetGroupArn=$TARGET_GROUP_ARN,containerName=${PROJECT_NAME}-backend,containerPort=8000 \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
    --region $REGION \
    --query 'service.serviceArn' \
    --output text
fi

echo "✅ ECS Service created/updated"

# Step 6: Get Load Balancer DNS
echo ""
echo "🔗 Getting Load Balancer DNS..."
LOAD_BALANCER_DNS=$(aws elbv2 describe-load-balancers \
  --region $REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ ECS Service Deployment Complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Deployment Details:"
echo "  Cluster: $CLUSTER_NAME"
echo "  Service: ${PROJECT_NAME}-service"
echo "  Task Definition: $TASK_DEF"
echo "  Desired Count: 2"
echo "  Launch Type: FARGATE"
echo ""
echo "🗄️  Database:"
echo "  RDS Endpoint: $RDS_ENDPOINT"
echo "  Redis Endpoint: $REDIS_ENDPOINT"
echo ""
echo "🎯 Load Balancer:"
echo "  DNS Name: $LOAD_BALANCER_DNS"
echo "  Health Check: /health"
echo ""
echo "📝 Next Steps:"
echo "  1. Wait for tasks to be healthy (usually 2-3 minutes)"
echo "  2. Test backend: curl http://$LOAD_BALANCER_DNS/health"
echo "  3. Run security tests: ./tests/security-test.sh http://$LOAD_BALANCER_DNS"
echo "  4. Run integration tests: ./tests/integration-test.sh http://$LOAD_BALANCER_DNS"
echo "  5. Run load tests: k6 run tests/load-test.js --environment BACKEND_URL=http://$LOAD_BALANCER_DNS"
echo ""
echo "💾 Save for later:"
echo "  export BACKEND_URL=\"http://$LOAD_BALANCER_DNS\""
echo ""
echo "════════════════════════════════════════════════════════"

# Save endpoints to file
cat > .env.production <<EOFENV
BACKEND_URL=http://$LOAD_BALANCER_DNS
DATABASE_URL=postgresql://fortress:fortress@${RDS_ENDPOINT}:5432/fortress
REDIS_URL=redis://${REDIS_ENDPOINT}:6379
AWS_REGION=$REGION
ECS_CLUSTER=$CLUSTER_NAME
ECS_SERVICE=${PROJECT_NAME}-service
EOFENV

echo "Environment saved to: .env.production"
