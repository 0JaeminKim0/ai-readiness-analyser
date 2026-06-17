module.exports = {
  apps: [
    {
      name: "ai-readiness",
      script: "server/index.js",
      cwd: "/home/user/webapp",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        DB_PATH: "./data/data.db",
        ADMIN_PASSWORD: "pwc-admin",
        CLAUDE_MAX_TOKENS: "8000",
        // ANTHROPIC_API_KEY 미설정 → 폴백 리포트로 동작 (로컬 검증용)
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
