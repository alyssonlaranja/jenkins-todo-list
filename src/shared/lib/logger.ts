/**
 * Logger utility for safe logging across the application.
 * In production, debug logs are suppressed.
 */
class Logger {
  private static isProduction = process.env.NODE_ENV === 'production'

  /**
   * Log debug messages. These are suppressed in production.
   */
  static debug(message: string, ...args: unknown[]) {
    if (!this.isProduction) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  }

  /**
   * Log info messages.
   */
  static info(message: string, ...args: unknown[]) {
    console.info(`[INFO] ${message}`, ...args)
  }

  /**
   * Log warning messages.
   */
  static warn(message: string, ...args: unknown[]) {
    console.warn(`[WARN] ${message}`, ...args)
  }

  /**
   * Log error messages.
   */
  static error(message: string, ...args: unknown[]) {
    console.error(`[ERROR] ${message}`, ...args)
  }
}

export default Logger
