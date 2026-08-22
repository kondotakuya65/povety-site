module.exports = {
  apps: [
    {
      name: "prosperax-backend",
      cwd: "/var/www/povety-site/apps/backend",
      script: ".venv/bin/uvicorn",
      args: "app.main:app --host 127.0.0.1 --port 8000",
      interpreter: "none",
      env: {
        ENVIRONMENT: "production",
      },
    },
    {
      name: "prosperax-frontend",
      cwd: "/var/www/povety-site/apps/frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        BACKEND_URL: "http://127.0.0.1:8000",
        NEXT_PUBLIC_SITE_URL: "https://prosperax.online",
      },
    },
  ],
};
