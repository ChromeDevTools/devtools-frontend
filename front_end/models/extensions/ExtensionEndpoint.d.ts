import type * as Platform from '../../core/platform/platform.js';
interface EventMessage {
    event: string;
}
export declare class ExtensionEndpoint {
    private readonly port;
    private nextRequestId;
    private pendingRequests;
    constructor(port: Platform.HostRuntime.WorkerMessagePort);
    sendRequest<ReturnType>(method: string, parameters: unknown): Promise<ReturnType>;
    protected disconnect(): void;
    private onResponse;
    protected handleEvent(_event: EventMessage): void;
}
export {};
