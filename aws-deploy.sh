#!/bin/bash
# AWS Fortress Token Optimizer Backend Deployment
# Deploys FastAPI to ECS Fargate with RDS PostgreSQL and ElastiCache Redis

set -e

echo "🚀 Deploying Fortress Backend to AWS..."
echo ""

# Configuration
PROJECT_NAME="fortress-optimizer"
AWS_REGION="us-east-1"
ECR_REPO="$PROJECT_NAME-backend"
CLUSTER_NAME="$PROJECT_NAME-cluster"
SERVICE_NAME="$PROJECT_NAME-service"
TASK_FAMILY="$PROJECT_NAME-task"

echo "📋 Configuration:"
echo "  Project: $PROJECT_NAME"
echo "  Region: $AWS_REGION"
echo "  Cluster: $CLUSTER_NAME"
echo ""

# Step 1: Create ECR Repository
echo "1️⃣  Creating ECR Repository..."
aws ecr create-repository \
  --repository-name "$ECR_REPO" \
  --region "$AWS_REGION" \
  --image-scanning-configuration scanOnPush=true \
  2>/dev/null || echo "   (Repository may already exist)"

# Step 2: Get ECR Login Token
echo "2️⃣  Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com

# Step 3: Build Docker Image
echo "3️⃣  Building Docker image..."
docker build -t "$ECR_REPO:latest" ./backend

# Step 4: Tag and Push to ECR
echo "4️⃣  Pushing image to ECR..."
ECR_URI=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:latest
docker tag "$ECR_REPO:latest" "$ECR_URI"
docker push "$ECR_URI"

# Step 5: Create RDS PostgreSQL (if not exists)
echo "5️⃣  Setting up RDS PostgreSQL..."
aws rds create-db-instance \
  --db-instance-identifier "$PROJECT_NAME-db" \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password "$(openssl rand -base64 32)" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxx \
  --publicly-accessible false \
  --region "$AWS_REGION" \
  2>/dev/null || echo "   (Database may already exist)"

# Step 6: Create ElastiCache Redis
echo "6️⃣  Setting up ElastiCache Redis..."
aws elasticache create-cache-cluster \
  --cache-cluster-id "$PROJECT_NAME-cache" \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version "7.0" \
  --num-cache-nodes 1 \
  --region "$AWS_REGION" \
  2>/dev/null || echo "   (Cache may already exist)"

# Step 7: Create ECS Cluster
echo "7️⃣  Creating ECS Cluster..."
aws ecs create-cluster \
  --cluster-name "$CLUSTER_NAME" \
  --region "$AWS_REGION" \
  2>/dev/null || echo "   (Cluster may already exist)"

echo ""
echo "✅ AWS Infrastructure Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Get your RDS endpoint:"
echo "   aws rds describe-db-instances --region $AWS_REGION --query 'DBInstances[0].Endpoint.Address'"
echo ""
echo "2. Get your Redis endpoint:"
echo "   aws elasticache describe-cache-clusters --region $AWS_REGION --query 'CacheClusters[0].CacheNodes[0].Address'"
echo ""
echo "3. Create ECS Task Definition with environment variables:"
echo "   DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/fortress"
echo "   REDIS_URL=redis://cache-endpoint:6379"
echo ""
echo "4. Create ECS Service and deploy container"
echo ""
echo "Backend URL will be available once ECS service is running."
