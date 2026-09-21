module.exports = {
  apps: [
    {
      name: 'relationship-copilot',
      cwd: __dirname,
      script: 'node_modules/.bin/tsx',
      args: 'server/src/index.ts',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 8788,
      },
    },
  ],
}