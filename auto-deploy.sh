#!/bin/bash
# ==============================================================================
# PCR Automated Deployment Script (Google Cloud Build & Cloud Run)
#
# Usage Modes:
#   1. Single Run (Deploy once and exit immediately):
#      ./auto-deploy.sh --once
#
#   2. Background Watcher Daemon (Runs silently in background, won't block terminal):
#      ./auto-deploy.sh --daemon
#
#   3. Stop Daemon:
#      ./auto-deploy.sh --stop
#
#   4. Status of Daemon:
#      ./auto-deploy.sh --status
# ==============================================================================

PROJECT_ID="gen-lang-client-0816619868"
REGION="asia-south1"
REGISTRY_URL="$REGION-docker.pkg.dev/$PROJECT_ID/pcr-repo"
BACKEND_URL="https://pcr-backend-u36rneughq-el.a.run.app"
FRONTEND_URL="https://pcr-frontend-u36rneughq-el.a.run.app"
PID_FILE="$HOME/.pcr_deploy_daemon.pid"
LOG_FILE="$HOME/pcr-deploy.log"

deploy_backend() {
    echo "--> [1/2] Building and Deploying Backend via Cloud Build..."
    cd backend || return 1
    gcloud builds submit --tag "$REGISTRY_URL/backend:latest" . || { echo "❌ Backend build failed"; cd ..; return 1; }
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
}

deploy_frontend() {
    echo "--> [2/2] Building and Deploying Frontend via Cloud Build..."
    cd frontend || return 1
    gcloud builds submit --tag "$REGISTRY_URL/frontend:latest" . || { echo "❌ Frontend build failed"; cd ..; return 1; }
    cd ..

    gcloud run deploy pcr-frontend \
        --image "$REGISTRY_URL/frontend:latest" \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --set-env-vars "BACKEND_UPSTREAM_URL=$BACKEND_URL"
}

deploy_all() {
    echo "=========================================================="
    echo "🚀 PCR Deployment Started: $(date)"
    echo "=========================================================="

    deploy_backend
    deploy_frontend

    echo "=========================================================="
    echo "✅ [SUCCESS] Both Frontend & Backend deployed successfully!"
    echo "Frontend URL: $FRONTEND_URL"
    echo "Backend URL:  $BACKEND_URL"
    echo "Timestamp:    $(date)"
    echo "=========================================================="
}

# ------------------------------------------------------------------------------
# Command Option Handling
# ------------------------------------------------------------------------------

case "$1" in
    --once|--now)
        echo "⚡ Running one-time full deployment..."
        deploy_all
        echo "🏁 Finished. Terminal prompt restored."
        exit 0
        ;;

    --stop)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" >/dev/null 2>&1; then
                kill "$PID"
                rm -f "$PID_FILE"
                echo "🛑 Stopped background PCR watcher (PID $PID)."
            else
                rm -f "$PID_FILE"
                echo "ℹ️ Daemon was not running (stale PID removed)."
            fi
        else
            echo "ℹ️ No running PCR daemon found."
        fi
        exit 0
        ;;

    --status)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" >/dev/null 2>&1; then
                echo "🟢 PCR watcher is active in background (PID: $PID)."
                echo "Recent logs ($LOG_FILE):"
                tail -n 15 "$LOG_FILE" 2>/dev/null || true
            else
                echo "🔴 PCR watcher PID $PID not found running."
            fi
        else
            echo "⚪ No PCR watcher running."
        fi
        exit 0
        ;;

    --daemon)
        echo "🚀 Starting PCR watcher in the background (daemon mode)..."
        echo "Terminal is free for you! Check logs anytime: tail -f $LOG_FILE"
        nohup "$0" --watch-loop >> "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
        echo "✅ Watcher running in background with PID $(cat "$PID_FILE")."
        exit 0
        ;;

    --watch-loop)
        # Internal loop for background watcher
        echo "👀 [$(date)] PCR Watcher Loop Started in background."
        while true; do
            git fetch origin main >/dev/null 2>&1
            LOCAL=$(git rev-parse HEAD 2>/dev/null)
            REMOTE=$(git rev-parse origin/main 2>/dev/null)

            if [ -n "$LOCAL" ] && [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
                echo "🔔 [$(date)] New commit detected on GitHub. Pulling and deploying..."
                git pull origin main
                deploy_all
            fi
            sleep 20
        done
        ;;

    *)
        echo "Usage: ./auto-deploy.sh [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --once      Run a single deployment of Backend & Frontend, then EXIT immediately."
        echo "  --daemon    Run automatic git watcher in BACKGROUND (doesn't block your terminal)."
        echo "  --status    Check if background watcher is running and show recent logs."
        echo "  --stop      Stop the background watcher."
        echo ""
        echo "Defaulting to --once:"
        deploy_all
        exit 0
        ;;
esac
