module.exports = {
  apps: [
    {
      name: "yourtab-api",
      cwd: "/opt/yourtab",
      script: "apps/api/dist/main.js",
      interpreter: "node",
      env_file: "/opt/yourtab/infrastructure/production/.env",
      env: { NODE_ENV: "production", PORT: 4000 },
      autorestart: true,
      max_memory_restart: "700M",
      time: true
    },
    {
      name: "yourtab-worker",
      cwd: "/opt/yourtab",
      script: "apps/worker/dist/main.js",
      interpreter: "node",
      env_file: "/opt/yourtab/infrastructure/production/.env",
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_memory_restart: "700M",
      time: true
    }
  ]
};
