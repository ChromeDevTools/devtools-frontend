interface Poller<T> {
    start(): Promise<T>;
    stop(): Promise<void>;
    result(): Promise<T>;
}
export declare class MutationPoller<T> implements Poller<T> {
    #private;
    constructor(fn: () => Promise<T>, root: Node);
    start(): Promise<T>;
    stop(): Promise<void>;
    result(): Promise<T>;
}
export declare class RAFPoller<T> implements Poller<T> {
    #private;
    constructor(fn: () => Promise<T>);
    start(): Promise<T>;
    stop(): Promise<void>;
    result(): Promise<T>;
}
export declare class IntervalPoller<T> implements Poller<T> {
    #private;
    constructor(fn: () => Promise<T>, ms: number);
    start(): Promise<T>;
    stop(): Promise<void>;
    result(): Promise<T>;
}
export {};
//# sourceMappingURL=Poller.d.ts.map