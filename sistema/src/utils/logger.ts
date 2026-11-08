
/**
 * World-Class Telemetry and Logging Utility.
 * In a real-world scenario, this would send data to Sentry, LogRocket, or Datadog.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  message: string;
  level: LogLevel;
  context?: Record<string, any>;
  timestamp: string;
  url: string;
}

class Logger {
  private static instance: Logger;
  
  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private format(level: LogLevel, message: string, context?: Record<string, any>): LogPayload {
    return {
      message,
      level,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };
  }

  private send(payload: LogPayload) {
    // Console output for development
    const styles = {
      info: "color: #0ea5e9; font-weight: bold",
      warn: "color: #f59e0b; font-weight: bold",
      error: "color: #ef4444; font-weight: bold",
      debug: "color: #64748b; font-style: italic",
    };

    console.log(
      `%c[${payload.level.toUpperCase()}] %c${payload.message}`,
      styles[payload.level],
      "color: inherit",
      payload.context || ""
    );

    // Placeholder for external telemetry (e.g. Sentry.captureMessage)
    // if (process.env.NODE_ENV === 'production') { ... }
  }

  public info(message: string, context?: Record<string, any>) {
    this.send(this.format("info", message, context));
  }

  public warn(message: string, context?: Record<string, any>) {
    this.send(this.format("warn", message, context));
  }

  public error(message: string, error?: any, context?: Record<string, any>) {
    this.send(this.format("error", message, { ...context, error: error?.message || error }));
  }

  public debug(message: string, context?: Record<string, any>) {
    this.send(this.format("debug", message, context));
  }
}

export const logger = Logger.getInstance();
