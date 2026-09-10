#!/bin/bash
# ==============================================================================
# Full Automatic Continuous Deployment Script using Google Cloud Build
# Monitors GitHub main branch and builds directly on GCP Build Cluster
# ==============================================================================

PROJECT_ID="gen-lang-client-0816619868"
REGION="asia-south1"
REGISTRY_URL="$REGION-docker.pkg.dev/$PROJECT_ID/pcr-repo"
BACKEND_URL="https://pcr-backend-u36rneughq-el.a.run.app"
FRONTEND_URL="https://pcr-frontend-u36rneughq-el.a.run.app"

deploy_all() {
    echo "=========================================================="
    echo "🚀 Triggering Automated Cloud Build & Deployment"
    echo "Timestamp: $(date)"
    echo "=========================================================="

    # 1. Build and Deploy Backend via Cloud Build (No local Docker issues)
    echo "--> [1/2] Building and Deploying Backend via Cloud Build..."
    cd backend
    gcloud builds submit --tag "$REGISTRY_URL/backend:latest" .
    cd ..

    gcloud run deploy pcr-backend \
        --image "$REGISTRY_URL/backend:latest" \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --port 8080 \
        --timeout 300s \
        --memory 1Gi \
        --cpu 1 \
        --update-env-vars "SPRING_PROFILES_ACTIVE=prod,GITHUB_OAUTH_CLIENT_ID=Ov23liz7VeylLeQwQIjk,GITHUB_OAUTH_CLIENT_SECRET=7cb961f73166a9fd4a72f137bbfcaa3ecd1fd1ec,GITHUB_OAUTH_REDIRECT_URI=$FRONTEND_URL/repositories,APP_CORS_ALLOWED_ORIGINS=*"

    # 2. Build and Deploy Frontend via Cloud Build
    echo "--> [2/2] Building and Deploying Frontend via Cloud Build..."
    cd frontend
    gcloud builds submit --tag "$REGISTRY_URL/frontend:latest" .
    cd ..

    gcloud run deploy pcr-frontend \
        --image "$REGISTRY_URL/frontend:latest" \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --set-env-vars "BACKEND_UPSTREAM_URL=$BACKEND_URL"

    echo "✅ [DONE] Both Frontend & Backend deployed successfully at $(date)!"
}

echo "👀 PCR Automated Deployment Daemon Started..."
echo "Press Ctrl+C to stop."

# If called with --now, run deploy immediately
if [ "$1" == "--now" ]; then
    deploy_all
fi

# Continuous watch loop
while true; do
    git fetch origin main >/dev/null 2>&1
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)

    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "🔔 [NEW CODE DETECTED] Pulling latest changes from GitHub..."
        git pull origin main
        deploy_all
    fi
    sleep 15
done
