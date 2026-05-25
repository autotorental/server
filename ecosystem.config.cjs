module.exports = {
  apps: [{
    name: "autorental-api",
    cwd: "/opt/autorental/packages/api",
    script: "/root/.bun/bin/bunx",
    args: "medusa start",
    env: {
      NODE_ENV: "production",
      PORT: "9000",
      PATH: "/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    },
    max_memory_restart: "2G",
    autorestart: true,
    watch: false
  }]
}
