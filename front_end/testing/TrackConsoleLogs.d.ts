export interface ExpectedConsoleLogs {
    warn?: string[];
    log?: string[];
    error?: string[];
}
/** This needs to be invoked within a describe block, rather than within an it() block. **/
export declare function expectConsoleLogs(expectedLogs: ExpectedConsoleLogs): void;
export type ConsoleLike = Pick<Console, 'log' | 'warn' | 'error'>;
export interface ConsoleLogTracker {
    startTracking(): void;
    stopTracking(): void;
    checkForUnexpectedLogs(testName?: string): void;
}
export declare function createConsoleLogTracker(targetConsole?: ConsoleLike): ConsoleLogTracker;
export declare function startTrackingConsoleLogs(): void;
export declare function stopTrackingConsoleLogs(): void;
export declare function checkForUnexpectedConsoleLogs(testName?: string): void;
