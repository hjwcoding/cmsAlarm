const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'cms-metrics',
      script: 'Metrics.js',
      interpreter: 'node',
      cwd: root,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: path.join(root, 'logs', 'metrics-out.log'),
      error_file: path.join(root, 'logs', 'metrics-error.log'),
      merge_logs: true,
    },
    {
      name: 'cms-scheduler',
      script: 'scheduler.ts',
      interpreter: 'node',
      node_args: '--require tsx/cjs',
      cwd: root,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: path.join(root, 'logs', 'scheduler-out.log'),
      error_file: path.join(root, 'logs', 'scheduler-error.log'),
      merge_logs: true,
    },
  ],
};
