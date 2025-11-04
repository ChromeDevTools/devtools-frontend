/**
 * @returns True, iff a metric event with the provided name and code was recorded. False otherwise.
 */
export declare function recordedMetricsContain(actionName: string, actionCode: number): boolean;
export declare function resetRecordedMetrics(): void;
