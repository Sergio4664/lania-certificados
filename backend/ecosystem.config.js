module.exports = {
  apps: [
    {
      name: "api-lania",
      cwd: "/home/lania-siscol/lania-certificaciones/backend",
      script: "venv/bin/uvicorn",
      args: "app.main:app --host 0.0.0.0 --port 4201",
      interpreter: "none",
      env: {
        PYTHONPATH: "/home/lania-siscol/lania-certificaciones/backend"
      }
    },
    {
      name: "celery-worker",
      cwd: "/home/lania-siscol/lania-certificaciones/backend",
      script: "venv/bin/celery",
      args: "-A app.celery_app.celery_app worker -Q default --loglevel=info",
      interpreter: "none",
      env: {
        PYTHONPATH: "/home/lania-siscol/lania-certificaciones/backend"
      }
    }
  ]
}
