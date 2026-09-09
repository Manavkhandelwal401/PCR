#!/bin/bash
# ==============================================================================
# Google Cloud Run Automated Deployment Script
# Project: Phantom Code Reviewer (PCR)
# Project ID: gen-lang-client-0816619868
# ==============================================================================

set -e

PROJECT_ID="gen-lang-client-0816619868"
REGION="asia-south1" # Mumbai (closest to India) or us-central1
BACKEND_SERVICE_NAME="pcr-backend"
FRONTEND_SERVICE_NAME="pcr-frontend"

echo "=========================================================="
echo "🚀 Starting Deployment to Google Cloud Run"
echo "Project ID: $PROJECT_ID"
echo "Region:     $REGION"
echo "=========================================================="

# 1. Set active GCP Project
gcloud config set project $PROJECT_ID

# 2. Enable Required APIs (Cloud Run, Artifact Registry, Cloud Build)
echo "--> [1/4] Enabling required Google Cloud APIs..."
gcloud services enable run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com

# 3. Create Artifact Registry repository if not present
echo "--> [2/4] Setting up Artifact Registry..."
gcloud artifacts repositories create pcr-repo \
    --repository-format=docker \
    --location=$REGION \
    --description="Phantom Code Reviewer Docker Repo" \
    --quiet || true

REGISTRY_URL="$REGION-docker.pkg.dev/$PROJECT_ID/pcr-repo"

# 4. Build and Deploy Backend
echo "--> [3/4] Building and Deploying Backend to Cloud Run..."
cd backend
gcloud builds submit --tag "$REGISTRY_URL/backend:latest" .
cd ..

# Deploy Backend with unauthenticated access for API calls
gcloud run deploy $BACKEND_SERVICE_NAME \
    --image "$REGISTRY_URL/backend:latest" \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 5

BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "✅ Backend Live URL: $BACKEND_URL"

# 5. Build and Deploy Frontend
echo "--> [4/4] Building and Deploying Frontend to Cloud Run..."
cd frontend
gcloud builds submit \
    --tag "$REGISTRY_URL/frontend:latest" \
    --build-arg "VITE_API_URL=$BACKEND_URL/api/v1" .
cd ..

gcloud run deploy $FRONTEND_SERVICE_NAME \
    --image "$REGISTRY_URL/frontend:latest" \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 3 \
    --set-env-vars "BACKEND_UPSTREAM_URL=$BACKEND_URL"

FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')
echo "✅ Frontend Live URL: $FRONTEND_URL"

# 6. Update Backend CORS to allow Frontend URL
echo "--> Updating Backend CORS to whitelist Frontend URL ($FRONTEND_URL)..."
gcloud run services update $BACKEND_SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --update-env-vars "APP_CORS_ALLOWED_ORIGINS=$FRONTEND_URL"

echo ""
echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "----------------------------------------------------------"
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. In your GitHub OAuth App settings:"
echo "   Update 'Authorization callback URL' to:"
echo "   $FRONTEND_URL/repositories"
echo "2. In your Google Cloud Console OAuth 2.0 Client:"
echo "   Add '$FRONTEND_URL' to Authorized JavaScript origins."
echo "=========================================================="
