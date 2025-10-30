import type * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import type * as ProtocolClient from '../protocol_client/protocol_client.js';
import { SDKModel } from './SDKModel.js';
import { Target, Type as TargetType } from './Target.js';
type ModelClass<T = SDKModel> = new (arg1: Target) => T;
export declare class TargetManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private constructor();
    static instance({ forceNew }?: {
        forceNew: boolean;
    }): TargetManager;
    static removeInstance(): void;
    onInspectedURLChange(target: Target): void;
    onNameChange(target: Target): void;
    suspendAllTargets(reason?: string): Promise<void>;
    resumeAllTargets(): Promise<void>;
    allTargetsSuspended(): boolean;
    models<T extends SDKModel>(modelClass: ModelClass<T>, opts?: {
        scoped: boolean;
    }): T[];
    inspectedURL(): string;
    observeModels<T extends SDKModel>(modelClass: ModelClass<T>, observer: SDKModelObserver<T>, opts?: {
        scoped: boolean;
    }): void;
    unobserveModels<T extends SDKModel>(modelClass: ModelClass<T>, observer: SDKModelObserver<T>): void;
    modelAdded(modelClass: ModelClass, model: SDKModel, inScope: boolean): void;
    private modelRemoved;
    addModelListener<Events, T extends keyof Events>(modelClass: ModelClass<SDKModel<Events>>, eventType: T, listener: Common.EventTarget.EventListener<Events, T>, thisObject?: Object, opts?: {
        scoped: boolean;
    }): void;
    removeModelListener<Events, T extends keyof Events>(modelClass: ModelClass<SDKModel<Events>>, eventType: T, listener: Common.EventTarget.EventListener<Events, T>, thisObject?: Object): void;
    observeTargets(targetObserver: Observer, opts?: {
        scoped: boolean;
    }): void;
    unobserveTargets(targetObserver: Observer): void;
    createTarget(id: Protocol.Target.TargetID | 'main', name: string, type: TargetType, parentTarget: Target | null, sessionId?: string, waitForDebuggerInPage?: boolean, connection?: ProtocolClient.ConnectionTransport.ConnectionTransport, targetInfo?: Protocol.Target.TargetInfo): Target;
    removeTarget(target: Target): void;
    targets(): Target[];
    targetById(id: string): Target | null;
    rootTarget(): Target | null;
    primaryPageTarget(): Target | null;
    browserTarget(): Target | null;
    maybeAttachInitialTarget(): Promise<boolean>;
    clearAllTargetsForTest(): void;
    isInScope(arg: SDKModel | Target | Common.EventTarget.EventTargetEvent<any, any> | null): boolean;
    setScopeTarget(scopeTarget: Target | null): void;
    addScopeChangeListener(listener: () => void): void;
    scopeTarget(): Target | null;
}
export declare const enum Events {
    AVAILABLE_TARGETS_CHANGED = "AvailableTargetsChanged",
    INSPECTED_URL_CHANGED = "InspectedURLChanged",
    NAME_CHANGED = "NameChanged",
    SUSPEND_STATE_CHANGED = "SuspendStateChanged"
}
export interface EventTypes {
    [Events.AVAILABLE_TARGETS_CHANGED]: Protocol.Target.TargetInfo[];
    [Events.INSPECTED_URL_CHANGED]: Target;
    [Events.NAME_CHANGED]: Target;
    [Events.SUSPEND_STATE_CHANGED]: void;
}
export declare class Observer {
    targetAdded(_target: Target): void;
    targetRemoved(_target: Target): void;
}
export declare class SDKModelObserver<T> {
    modelAdded(_model: T): void;
    modelRemoved(_model: T): void;
}
export {};
