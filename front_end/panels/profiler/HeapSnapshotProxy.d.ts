import * as Common from '../../core/common/common.js';
import type * as PlatformApi from '../../core/platform/api/api.js';
import type * as HeapSnapshotModel from '../../models/heap_snapshot_model/heap_snapshot_model.js';
import type { ChildrenProvider } from './ChildrenProvider.js';
export declare class HeapSnapshotWorkerProxy extends Common.ObjectWrapper.ObjectWrapper<HeapSnapshotWorkerProxy.EventTypes> {
    readonly eventHandler: (arg0: string, arg1: any) => void;
    nextObjectId: number;
    nextCallId: number;
    callbacks: Map<number, (arg0: any) => void>;
    readonly previousCallbacks: Set<number>;
    readonly worker: PlatformApi.HostRuntime.Worker;
    interval?: number;
    constructor(eventHandler: (arg0: string, arg1: any) => void);
    createLoader(profileUid: number, snapshotReceivedCallback: (arg0: HeapSnapshotProxy) => void): HeapSnapshotLoaderProxy;
    dispose(): void;
    disposeObject(objectId: number): void;
    evaluateForTest(script: string, callback: (...arg0: any[]) => void): void;
    callFactoryMethod<T extends Object>(callback: null, objectId: string, methodName: string, proxyConstructor: new (...arg1: any[]) => T, transfer: PlatformApi.HostRuntime.WorkerTransferable[], ...methodArguments: any[]): T;
    callFactoryMethod<T extends Object>(callback: ((...arg0: any[]) => void), objectId: string, methodName: string, proxyConstructor: new (...arg1: any[]) => T, transfer: PlatformApi.HostRuntime.WorkerTransferable[], ...methodArguments: any[]): null;
    callMethod(callback: (...arg0: any[]) => void, objectId: string, methodName: string, ...methodArguments: any[]): void;
    startCheckingForLongRunningCalls(): void;
    checkLongRunningCalls(): void;
    setupForSecondaryInit(port: MessagePort): Promise<void>;
    messageReceived(event: PlatformApi.HostRuntime.WorkerMessageEvent): void;
    postMessage(message: unknown, transfer?: PlatformApi.HostRuntime.WorkerTransferable[]): void;
}
export declare namespace HeapSnapshotWorkerProxy {
    const enum Events {
        WAIT = "Wait"
    }
    interface EventTypes {
        [Events.WAIT]: boolean;
    }
}
export declare class HeapSnapshotProxyObject {
    readonly worker: HeapSnapshotWorkerProxy;
    readonly objectId: number;
    constructor(worker: HeapSnapshotWorkerProxy, objectId: number);
    dispose(): void;
    callFactoryMethod<T extends Object>(methodName: string, proxyConstructor: new (...arg1: any[]) => T, ...args: any[]): T;
    callFactoryMethodPromise<T extends Object>(methodName: string, proxyConstructor: new (...arg1: any[]) => T, transfer: PlatformApi.HostRuntime.WorkerTransferable[], ...args: any[]): Promise<T>;
    callMethodPromise<T>(methodName: string, ...args: any[]): Promise<T>;
}
export declare class HeapSnapshotLoaderProxy extends HeapSnapshotProxyObject implements Common.StringOutputStream.OutputStream {
    readonly profileUid: number;
    readonly snapshotReceivedCallback: (arg0: HeapSnapshotProxy) => void;
    constructor(worker: HeapSnapshotWorkerProxy, objectId: number, profileUid: number, snapshotReceivedCallback: (arg0: HeapSnapshotProxy) => void);
    write(chunk: string): Promise<void>;
    close(): Promise<void>;
}
export declare class HeapSnapshotProxy extends HeapSnapshotProxyObject {
    staticData: HeapSnapshotModel.HeapSnapshotModel.StaticData | null;
    profileUid?: string;
    constructor(worker: HeapSnapshotWorkerProxy, objectId: number);
    search(searchConfig: HeapSnapshotModel.HeapSnapshotModel.SearchConfig, filter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter): Promise<number[]>;
    interfaceDefinitions(): Promise<string>;
    aggregatesWithFilter(filter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter): Promise<Record<string, HeapSnapshotModel.HeapSnapshotModel.Aggregate>>;
    aggregatesForDiff(interfaceDefinitions: string): Promise<Record<string, HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff>>;
    calculateSnapshotDiff(baseSnapshotId: string, baseSnapshotAggregates: Record<string, HeapSnapshotModel.HeapSnapshotModel.AggregateForDiff>): Promise<Record<string, HeapSnapshotModel.HeapSnapshotModel.Diff>>;
    nodeClassKey(snapshotObjectId: number): Promise<string | null>;
    createEdgesProvider(nodeIndex: number): HeapSnapshotProviderProxy;
    createRetainingEdgesProvider(nodeIndex: number): HeapSnapshotProviderProxy;
    createAddedNodesProvider(baseSnapshotId: string, classKey: string): HeapSnapshotProviderProxy;
    createDeletedNodesProvider(nodeIndexes: number[]): HeapSnapshotProviderProxy;
    createNodesProvider(filter: (...args: any[]) => boolean): HeapSnapshotProviderProxy;
    createNodesProviderForClass(classKey: string, nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter): HeapSnapshotProviderProxy;
    allocationTracesTops(): Promise<HeapSnapshotModel.HeapSnapshotModel.SerializedAllocationNode[]>;
    allocationNodeCallers(nodeId: number): Promise<HeapSnapshotModel.HeapSnapshotModel.AllocationNodeCallers>;
    allocationStack(nodeIndex: number): Promise<HeapSnapshotModel.HeapSnapshotModel.AllocationStackFrame[] | null>;
    dispose(): void;
    get nodeCount(): number;
    get rootNodeIndex(): number;
    updateStaticData(): Promise<void>;
    getStatistics(): Promise<HeapSnapshotModel.HeapSnapshotModel.Statistics>;
    getLocation(nodeIndex: number): Promise<HeapSnapshotModel.HeapSnapshotModel.Location | null>;
    getSamples(): Promise<HeapSnapshotModel.HeapSnapshotModel.Samples | null>;
    ignoreNodeInRetainersView(nodeIndex: number): Promise<void>;
    unignoreNodeInRetainersView(nodeIndex: number): Promise<void>;
    unignoreAllNodesInRetainersView(): Promise<void>;
    areNodesIgnoredInRetainersView(): Promise<boolean>;
    get totalSize(): number;
    get uid(): string | undefined;
    setProfileUid(profileUid: string): void;
    maxJSObjectId(): number;
}
export declare class HeapSnapshotProviderProxy extends HeapSnapshotProxyObject implements ChildrenProvider {
    nodePosition(snapshotObjectId: number): Promise<number>;
    isEmpty(): Promise<boolean>;
    serializeItemsRange(startPosition: number, endPosition: number): Promise<HeapSnapshotModel.HeapSnapshotModel.ItemsRange>;
    sortAndRewind(comparator: HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig): Promise<void>;
}
