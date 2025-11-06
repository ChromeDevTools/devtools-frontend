import type * as Protocol from '../../generated/protocol.js';
import * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import { SDKModel } from './SDKModel.js';
import type { TargetManager } from './TargetManager.js';
export declare class Target extends ProtocolClient.InspectorBackend.TargetBase {
    #private;
    constructor(targetManager: TargetManager, id: Protocol.Target.TargetID | 'main', name: string, type: Type, parentTarget: Target | null, sessionId: string, suspended: boolean, connection: ProtocolClient.CDPConnection.CDPConnection | null, targetInfo?: Protocol.Target.TargetInfo);
    createModels(required: Set<new (arg1: Target) => SDKModel>): void;
    id(): Protocol.Target.TargetID | 'main';
    name(): string;
    setName(name: string): void;
    type(): Type;
    markAsNodeJSForTest(): void;
    targetManager(): TargetManager;
    hasAllCapabilities(capabilitiesMask: number): boolean;
    decorateLabel(label: string): string;
    parentTarget(): Target | null;
    outermostTarget(): Target | null;
    dispose(reason: string): void;
    model<T extends SDKModel>(modelClass: new (arg1: Target) => T): T | null;
    models(): Map<new (arg1: Target) => SDKModel, SDKModel>;
    inspectedURL(): Platform.DevToolsPath.UrlString;
    setInspectedURL(inspectedURL: Platform.DevToolsPath.UrlString): void;
    hasCrashed(): boolean;
    setHasCrashed(isCrashed: boolean): void;
    suspend(reason?: string): Promise<void>;
    resume(): Promise<void>;
    suspended(): boolean;
    updateTargetInfo(targetInfo: Protocol.Target.TargetInfo): void;
    targetInfo(): Protocol.Target.TargetInfo | undefined;
}
export declare enum Type {
    FRAME = "frame",
    ServiceWorker = "service-worker",
    Worker = "worker",
    SHARED_WORKER = "shared-worker",
    SHARED_STORAGE_WORKLET = "shared-storage-worklet",
    NODE = "node",
    BROWSER = "browser",
    AUCTION_WORKLET = "auction-worklet",
    WORKLET = "worklet",
    TAB = "tab",
    NODE_WORKER = "node-worker"
}
export declare const enum Capability {
    BROWSER = 1,
    DOM = 2,
    JS = 4,
    LOG = 8,
    NETWORK = 16,
    TARGET = 32,
    SCREEN_CAPTURE = 64,
    TRACING = 128,
    EMULATION = 256,
    SECURITY = 512,
    INPUT = 1024,
    INSPECTOR = 2048,
    DEVICE_EMULATION = 4096,
    STORAGE = 8192,
    SERVICE_WORKER = 16384,
    AUDITS = 32768,
    WEB_AUTHN = 65536,
    IO = 131072,
    MEDIA = 262144,
    EVENT_BREAKPOINTS = 524288,
    NONE = 0
}
