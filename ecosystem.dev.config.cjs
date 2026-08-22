/**
 * PM2 development config — hot reload for API + Next.
 * Do not run this together with ecosystem.config.cjs on the same ports.
 *
 * Usage:
 *   pm2 start ecosystem.dev.config.cjs
 *   pm2 logs
 *   pm2 stop prosperax-backend-dev prosperax-frontend-dev
 */
module.exports = {
  apps: [
    {
      name: "prosperax-backend-dev",
      cwd: "/var/www/povety-site/apps/backend",
      script: ".venv/bin/uvicorn",
      args: "app.main:app --host 127.0.0.1 --port 8000 --reload",
      interpreter: "none",
      watch: false,
      env: {
        ENVIRONMENT: "development",
      },
    },
    {
      name: "prosperax-frontend-dev",
      cwd: "/var/www/povety-site/apps/frontend",
      script: "node_modules/next/dist/bin/next",
      args: "dev -p 3000 -H 127.0.0.1",
      interpreter: "none",
      watch: false,
      env: {
        NODE_ENV: "development",
        BACKEND_URL: "http://127.0.0.1:8000",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
      },
    },
  ],
};
