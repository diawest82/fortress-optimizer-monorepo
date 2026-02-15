#!/bin/bash

# Fast ECS Service Deployment - Skip Redis/RDS wait, use env defaults

set -e

PROJECT_NAME="fortress-optimizer"
REGION="us-east-1"
CLUSTER_NAME="fortress-optimizer-cluster"

echo "🚀 Deploying ECS Service..."

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}-backend"

# Step 1: Get RDS (this one usually works quickly)
echo "🗄️  Getting RDS endpoint..."
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --region $REGION \
  --db-instance-identifier "fortress-db" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text 2>/dev/null || echo "database-1.cmnnhksj3tmt.us-east-1.rds.amazonaws.com")

echo "RDS: $RDS_ENDPOINT"

# Step 2: Create CloudWatch log group
echo "📝 Setting up logging..."
aws logs create-log-group --log-group-name "/ecs/$PROJECT_NAME" --region $REGION 2>/dev/null || true

# Step 3: Register task definition with explicit environment
echo "⚙️  Creating task definition..."

cat > /tmp/task-def.json <<'EOFDEF'
{
  "family": "fortress-optimizer-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "fortress-optimizer-backend",
      "image": "673895432464.dkr.ecr.us-east-1.amazonaws.com/fortress-optimizer-backend:latest",
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
          "value": "postgresql://fortress:fortress@database-1.cmnnhksj3tmt.us-east-1.rds.amazonaws.com:5432/fortress"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://localhost:6379"
        },
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fortress-optimizer",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "essential": true
    }
  ],
  "executionRoleArn": "arn:aws:iam::673895432464:role/ecsTaskExecutionRole"
}
EOFDEF

TASK_DEF=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-def.json \
  --region $REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "Task: $TASK_DEF"

# Step 4: Get default VPC info
echo "🌐 Getting VPC info..."
VPC_ID=$(aws ec2 describe-vpcs --region $REGION --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)
SUBNET_ID=$(aws ec2 describe-subnets --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0].SubnetId' --output text)
SG_ID=$(aws ec2 describe-security-groups --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text)

echo "VPC: $VPC_ID | Subnet: $SUBNET_ID | SG: $SG_ID"

# Step 5: Create target group if it doesn't exist
echo "🎯 Setting up load balancer target group..."
TG_CHECK=$(aws elbv2 describe-target-groups --region $REGION --names "fortress-optimizer-tg" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "")

if [ -z "$TG_CHECK" ] || [ "$TG_CHECK" == "None" ]; then
  echo "  Creating target group..."
  TG_ARN=$(aws elbv2 create-target-group \
    --name fortress-optimizer-tg \
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
else
  TG_ARN=$TG_CHECK
fi

echo "Target Group: $TG_ARN"

# Step 6: Create or update service
echo "⚙️  Creating/updating ECS service..."

SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services "fortress-optimizer-service" \
  --region $REGION \
  --query 'services[0].serviceName' \
  --output text 2>/dev/null || echo "")

if [ "$SERVICE_EXISTS" == "fortress-optimizer-service" ]; then
  echo "  Updating service..."
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service fortress-optimizer-service \
    --task-definition $TASK_DEF \
    --force-new-deployment \
    --region $REGION >/dev/null
else
  echo "  Creating service..."
  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name fortress-optimizer-service \
    --task-definition $TASK_DEF \
    --desired-count 2 \
    --launch-type FARGATE \
    --load-balancers targetGroupArn=$TG_ARN,containerName=fortress-optimizer-backend,containerPort=8000 \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
    --region $REGION >/dev/null
fi

# Step 7: Get ALB DNS
echo "🔗 Getting load balancer DNS..."
ALB_DNS=$(aws elbv2 describe-load-balancers --region $REGION --query 'LoadBalancers[0].DNSName' --output text)

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ ECS Service Deployed!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "🎯 BACKEND URL:"
echo "   http://$ALB_DNS"
echo ""
echo "📊 Service Details:"
echo "   Cluster: $CLUSTER_NAME"
echo "   Service: fortress-optimizer-service"
echo "   Desired: 2 tasks"
echo "   Status: Launching..."
echo ""
echo "⏳ Wait 2-3 minutes for tasks to be healthy, then:"
echo ""
echo "   curl http://$ALB_DNS/health"
echo ""
echo "Then run tests:"
echo "   export BACKEND_URL=\"http://$ALB_DNS\""
echo "   ./tests/security-test.sh \$BACKEND_URL"
echo "   ./tests/integration-test.sh \$BACKEND_URL"
echo "   k6 run tests/load-test.js --environment BACKEND_URL=\$BACKEND_URL"
echo ""
echo "════════════════════════════════════════════════════════"

# Save for easy reference
cat > .env.backend <<EOF
BACKEND_URL=http://$ALB_DNS
EOF

echo ""
echo "Saved to: .env.backend"
echo "Run: source .env.backend"
