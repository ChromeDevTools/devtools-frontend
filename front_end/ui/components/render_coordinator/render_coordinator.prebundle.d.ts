export interface CoordinatorCallback<T> {
    (): T | PromiseLike<T>;
}
export interface LoggingRecord {
    time: number;
    value: string;
}
export declare class RenderCoordinatorQueueEmptyEvent extends Event {
    static readonly eventName = "renderqueueempty";
    constructor();
}
export declare class RenderCoordinatorNewFrameEvent extends Event {
    static readonly eventName = "newframe";
    constructor();
}
export interface LoggingOptions {
    onlyNamed?: boolean;
    storageLimit?: number;
}
export declare function setLoggingEnabled(enabled: false): void;
export declare function setLoggingEnabled(enabled: true, options?: LoggingOptions): void;
export declare function hasPendingWork(): boolean;
export declare function done(options?: {
    waitForWork: boolean;
}): Promise<void>;
/**
 * Schedules a 'read' job which is being executed within an animation frame
 * before all 'write' jobs. If multiple jobs are scheduled with the same
 * non-empty label, only the latest callback would be executed. Such
 * invocations would return the same promise that will resolve to the value of
 * the latest callback.
 */
export declare function read<T>(callback: CoordinatorCallback<T>): Promise<T>;
export declare function read<T>(label: string, callback: CoordinatorCallback<T>): Promise<T>;
/**
 * Schedules a 'write' job which is being executed within an animation frame
 * after all 'read' and 'scroll' jobs. If multiple jobs are scheduled with
 * the same non-empty label, only the latest callback would be executed. Such
 * invocations would return the same promise that will resolve when the latest callback is run.
 */
export declare function write<T>(callback: CoordinatorCallback<T>): Promise<T>;
export declare function write<T>(label: string, callback: CoordinatorCallback<T>): Promise<T>;
export declare function takeLoggingRecords(): LoggingRecord[];
/**
 * We offer a convenience function for scroll-based activity, but often triggering a scroll
 * requires a layout pass, thus it is better handled as a read activity, i.e. we wait until
 * the layout-triggering work has been completed then it should be possible to scroll without
 * first forcing layout.  If multiple jobs are scheduled with the same non-empty label, only
 * the latest callback would be executed. Such invocations would return the same promise that
 * will resolve when the latest callback is run.
 */
export declare function scroll<T>(callback: CoordinatorCallback<T>): Promise<T>;
export declare function scroll<T>(label: string, callback: CoordinatorCallback<T>): Promise<T>;
export declare function cancelPending(): void;
