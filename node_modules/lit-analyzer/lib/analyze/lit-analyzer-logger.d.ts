export interface LitAnalyzerLogger {
    level: LitAnalyzerLoggerLevel;
    debug(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    verbose(...args: any[]): void;
}
export declare enum LitAnalyzerLoggerLevel {
    OFF = 0,
    ERROR = 1,
    WARN = 2,
    DEBUG = 3,
    VERBOSE = 4
}
export declare class DefaultLitAnalyzerLogger implements LitAnalyzerLogger {
    level: LitAnalyzerLoggerLevel;
    /**
     * Logs if this.level >= DEBUG
     * @param args
     */
    debug(...args: any[]): void;
    /**
     * Logs if this.level >= ERROR
     * @param args
     */
    error(...args: any[]): void;
    /**
     * Logs if level >= WARN
     * @param args
     */
    warn(...args: any[]): void;
    /**
     * Logs if level >= VERBOSE
     * @param args
     */
    verbose(...args: any[]): void;
    private log;
    protected severityPrefix(level: LitAnalyzerLoggerLevel): string;
}
//# sourceMappingURL=lit-analyzer-logger.d.ts.map