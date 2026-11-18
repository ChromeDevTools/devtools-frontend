type TrackedAsyncOperation = 'Promise' | 'requestAnimationFrame' | 'setTimeout' | 'setInterval' | 'requestIdleCallback' | 'cancelIdleCallback' | 'cancelAnimationFrame' | 'clearTimeout' | 'clearInterval';
interface AsyncActivity {
    type: TrackedAsyncOperation;
    pending: boolean;
    cancelDelayed?: () => void;
    id?: string;
    runImmediate?: () => void;
    stack?: string;
    promise?: Promise<unknown>;
}
/**
 * Best-effort flush of pending async operations (such as animation frame renders
 * and scheduled timeouts). Never throws, is bounded by a maximum retry limit, and
 * returns any operations that remain pending.
 */
export declare function flushPendingActivity(retries?: number): Promise<AsyncActivity[]>;
export declare function checkForPendingActivity(testName?: string): Promise<void>;
export declare function stopTrackingAsyncActivity(): void;
export declare function startTrackingAsyncActivity(): void;
export {};
