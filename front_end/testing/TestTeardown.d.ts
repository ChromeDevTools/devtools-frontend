type TeardownFn = () => void | Promise<void>;
type SetupFn = () => void | Promise<void>;
export declare function setRootTeardownRunnerRegistered(): void;
export declare function isRootTeardownRunnerRegistered(): boolean;
export declare function hasPendingTestTeardowns(): boolean;
/**
 * Registers a teardown callback for the currently running test.
 *
 * Must only be called while a test is running (from a `beforeEach` hook or
 * the test body). `beforeEachWithTeardown()` satisfies this automatically.
 */
export declare function registerTestTeardown(fn: TeardownFn): void;
export declare function beforeEachWithTeardown(setupFn: SetupFn, teardownFn: TeardownFn): void;
export declare function runTestTeardowns(): Promise<void>;
export {};
