/**
 * @internal
 */
export interface DeferredOptions {
    message: string;
    timeout: number;
}
/**
 * Creates and returns a deferred object along with the resolve/reject functions.
 *
 * If the deferred has not been resolved/rejected within the `timeout` period,
 * the deferred gets resolves with a timeout error. `timeout` has to be greater than 0 or
 * it is ignored.
 *
 * @internal
 */
export declare class Deferred<T> {
    #private;
    constructor(opts?: DeferredOptions);
    resolve(value: T): void;
    reject(error: Error): void;
    resolved(): boolean;
    finished(): boolean;
    value(): T | Error | undefined;
    valueOrThrow(): Promise<T>;
    static create<R>(opts?: DeferredOptions): Deferred<R>;
    static race<R>(awaitables: Array<Promise<R> | Deferred<R>>): Promise<R>;
}
//# sourceMappingURL=Deferred.d.ts.map