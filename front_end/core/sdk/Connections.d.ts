import type * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
export declare class MainConnection implements ProtocolClient.ConnectionTransport.ConnectionTransport {
    #private;
    onMessage: ((arg0: Object | string) => void) | null;
    constructor();
    setOnMessage(onMessage: (arg0: Object | string) => void): void;
    setOnDisconnect(onDisconnect: (arg0: string) => void): void;
    sendRawMessage(message: string): void;
    private dispatchMessage;
    private dispatchMessageChunk;
    disconnect(): Promise<void>;
}
export declare class WebSocketConnection implements ProtocolClient.ConnectionTransport.ConnectionTransport {
    #private;
    onMessage: ((arg0: Object | string) => void) | null;
    constructor(url: Platform.DevToolsPath.UrlString, onWebSocketDisconnect: (message: Platform.UIString.LocalizedString) => void);
    setOnMessage(onMessage: (arg0: Object | string) => void): void;
    setOnDisconnect(onDisconnect: (arg0: string) => void): void;
    private onError;
    private onOpen;
    private onClose;
    private close;
    sendRawMessage(message: string): void;
    disconnect(): Promise<void>;
}
export declare class StubConnection implements ProtocolClient.ConnectionTransport.ConnectionTransport {
    #private;
    onMessage: ((arg0: Object | string) => void) | null;
    setOnMessage(onMessage: (arg0: Object | string) => void): void;
    setOnDisconnect(onDisconnect: (arg0: string) => void): void;
    sendRawMessage(message: string): void;
    private respondWithError;
    disconnect(): Promise<void>;
}
export interface ParallelConnectionInterface extends ProtocolClient.ConnectionTransport.ConnectionTransport {
    getSessionId: () => string;
    getOnDisconnect: () => ((arg0: string) => void) | null;
}
export declare class ParallelConnection implements ParallelConnectionInterface {
    #private;
    onMessage: ((arg0: Object) => void) | null;
    constructor(connection: ProtocolClient.ConnectionTransport.ConnectionTransport, sessionId: string);
    setOnMessage(onMessage: (arg0: Object) => void): void;
    setOnDisconnect(onDisconnect: (arg0: string) => void): void;
    getOnDisconnect(): ((arg0: string) => void) | null;
    sendRawMessage(message: string): void;
    getSessionId(): string;
    disconnect(): Promise<void>;
}
export declare function initMainConnection(createRootTarget: () => Promise<void>, onConnectionLost: (message: Platform.UIString.LocalizedString) => void): Promise<void>;
