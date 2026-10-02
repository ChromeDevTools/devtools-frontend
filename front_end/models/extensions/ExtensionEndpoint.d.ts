import type * as Platform from '../../core/platform/platform.js';
interface EventMessage {
    event: string;
}
type ResultValidator<T> = (result: unknown) => result is T;
export declare class ExtensionEndpoint {
    private readonly port;
    private nextRequestId;
    private pendingRequests;
    constructor(port: Platform.HostRuntime.WorkerMessagePort);
    sendRequest(method: string, parameters: unknown): Promise<void>;
    sendRequest<ReturnType>(method: string, parameters: unknown, validate: ResultValidator<ReturnType>): Promise<ReturnType>;
    protected disconnect(): void;
    private onResponse;
    protected handleEvent(_event: EventMessage): void;
}
export {};
