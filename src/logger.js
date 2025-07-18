const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

class Logger {
  constructor(level = 'info') {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.info;
  }

  log(level, message, ...args) {
    if (LOG_LEVELS[level] <= this.level) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}]`, message, ...args);
    }
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }
}

export const logger = new Logger(process.env.LOG_LEVEL || 'info'); 