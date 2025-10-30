import type * as Platform from '../platform/platform.js';
import type * as ProtocolClient from '../protocol_client/protocol_client.js';
import type { ProtocolMessage, RehydratingExecutionContext, RehydratingResource, RehydratingScript, RehydratingTarget, ServerMessage } from './RehydratingObject.js';
import { TraceObject } from './TraceObject.js';
export interface RehydratingConnectionInterface {
    postToFrontend: (arg: ServerMessage) => void;
}
export declare const enum RehydratingConnectionState {
    UNINITIALIZED = 1,
    INITIALIZED = 2,
    REHYDRATED = 3
}
export declare class RehydratingConnection implements ProtocolClient.ConnectionTransport.ConnectionTransport {
    #private;
    rehydratingConnectionState: RehydratingConnectionState;
    onDisconnect: ((arg0: string) => void) | null;
    onMessage: ((arg0: Object) => void) | null;
    trace: TraceObject | null;
    sessions: Map<number, RehydratingSessionBase>;
    constructor(onConnectionLost: (message: Platform.UIString.LocalizedString) => void);
    /**
     * This is a callback for rehydrated session to receive payload from host window. Payload includes but not limited to
     * the trace event and all necessary data to power a rehydrated session.
     */
    onReceiveHostWindowPayload(event: MessageEvent): void;
    startHydration(trace: TraceObject): Promise<boolean>;
    setOnMessage(onMessage: (arg0: Object | string) => void): void;
    setOnDisconnect(onDisconnect: (arg0: string) => void): void;
    sendRawMessage(message: string | object): void;
    postToFrontend(arg: ServerMessage): void;
    disconnect(): Promise<void>;
}
/** Default rehydrating session with default responses. **/
declare class RehydratingSessionBase {
    connection: RehydratingConnectionInterface | null;
    constructor(connection: RehydratingConnectionInterface);
    sendMessageToFrontend(payload: ServerMessage): void;
    handleFrontendMessageAsFakeCDPAgent(data: ProtocolMessage): void;
}
export declare class RehydratingSession extends RehydratingSessionBase {
    sessionId: number;
    target: RehydratingTarget;
    executionContexts: RehydratingExecutionContext[];
    scripts: RehydratingScript[];
    resources: RehydratingResource[];
    constructor(sessionId: number, target: RehydratingTarget, executionContexts: RehydratingExecutionContext[], scripts: RehydratingScript[], resources: RehydratingResource[], connection: RehydratingConnectionInterface);
    sendMessageToFrontend(payload: ServerMessage, attachSessionId?: boolean): void;
    handleFrontendMessageAsFakeCDPAgent(data: ProtocolMessage): void;
    declareSessionAttachedToTarget(): void;
    private handleRuntimeEnabled;
    private handleDebuggerGetScriptSource;
    private handleDebuggerEnable;
    private handleGetResourceTree;
    private handleGetResourceContent;
    private handleGetStyleSheetText;
}
export {};
