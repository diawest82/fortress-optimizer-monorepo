#!/bin/bash
# Setup HTTPS on the Fortress Optimizer ALB
# Prerequisites: AWS CLI configured, domain DNS pointing to ALB
#
# This script:
# 1. Requests an ACM certificate for fortress-optimizer.com
# 2. Adds HTTPS listener (443) to the ALB
# 3. Redirects HTTP (80) to HTTPS
#
# IMPORTANT: After running, you must validate the certificate via DNS (add CNAME record in Namecheap)

set -euo pipefail

REGION="us-east-1"
DOMAIN="fortress-optimizer.com"
ALB_ARN=$(aws elbv2 describe-load-balancers --region "$REGION" \
  --query "LoadBalancers[?DNSName=='myp-zwp-lb-598798440.us-east-1.elb.amazonaws.com'].LoadBalancerArn" \
  --output text)

if [ -z "$ALB_ARN" ]; then
  echo "ERROR: Could not find ALB. Check the DNS name."
  exit 1
fi

echo "Found ALB: $ALB_ARN"

# Get target group ARN (the one the HTTP listener forwards to)
TG_ARN=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --region "$REGION" \
  --query "Listeners[?Port==\`80\`].DefaultActions[0].TargetGroupArn" --output text)

echo "Target Group: $TG_ARN"

# Step 1: Request ACM certificate
echo ""
echo "=== Step 1: Requesting ACM Certificate ==="
CERT_ARN=$(aws acm request-certificate \
  --domain-name "$DOMAIN" \
  --subject-alternative-names "*.${DOMAIN}" \
  --validation-method DNS \
  --region "$REGION" \
  --query "CertificateArn" --output text)

echo "Certificate ARN: $CERT_ARN"
echo ""
echo ">>> ACTION REQUIRED <<<"
echo "Add the following DNS CNAME record in Namecheap to validate the certificate:"
echo ""

# Wait a moment for ACM to generate the validation record
sleep 5

aws acm describe-certificate --certificate-arn "$CERT_ARN" --region "$REGION" \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord" --output table

echo ""
echo "Once you add the CNAME record, validation takes 5-30 minutes."
echo "Check status: aws acm describe-certificate --certificate-arn $CERT_ARN --region $REGION --query Certificate.Status"
echo ""
read -p "Press Enter after certificate is validated (status: ISSUED)..."

# Step 2: Add HTTPS listener
echo ""
echo "=== Step 2: Adding HTTPS Listener (443) ==="
aws elbv2 create-listener \
  --load-balancer-arn "$ALB_ARN" \
  --protocol HTTPS \
  --port 443 \
  --certificates "CertificateArn=$CERT_ARN" \
  --default-actions "Type=forward,TargetGroupArn=$TG_ARN" \
  --ssl-policy "ELBSecurityPolicy-TLS13-1-2-2021-06" \
  --region "$REGION"

echo "HTTPS listener created on port 443"

# Step 3: Modify HTTP listener to redirect to HTTPS
echo ""
echo "=== Step 3: Redirecting HTTP → HTTPS ==="
HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --region "$REGION" \
  --query "Listeners[?Port==\`80\`].ListenerArn" --output text)

aws elbv2 modify-listener \
  --listener-arn "$HTTP_LISTENER_ARN" \
  --default-actions 'Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region "$REGION"

echo "HTTP → HTTPS redirect configured"
echo ""
echo "=== HTTPS Setup Complete ==="
echo "API is now available at: https://fortress-optimizer.com"
echo ""
echo "Next steps:"
echo "  1. Point fortress-optimizer.com DNS (A record or CNAME) to the ALB: myp-zwp-lb-598798440.us-east-1.elb.amazonaws.com"
echo "  2. Test: curl -I https://fortress-optimizer.com/health"
