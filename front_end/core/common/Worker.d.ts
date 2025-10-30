export declare class WorkerWrapper {
    #private;
    private constructor();
    static fromURL(url: URL): WorkerWrapper;
    postMessage(message: unknown, transfer?: Transferable[]): void;
    dispose(): void;
    terminate(immediately?: boolean): void;
    set onmessage(listener: (event: MessageEvent) => void);
    set onerror(listener: (event: Event) => void);
}
