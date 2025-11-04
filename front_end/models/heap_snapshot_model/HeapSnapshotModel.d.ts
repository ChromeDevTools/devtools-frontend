export declare const HeapSnapshotProgressEvent: {
    Update: string;
    BrokenSnapshot: string;
};
export declare const baseSystemDistance = 100000000;
export declare const baseUnreachableDistance: number;
export declare class AllocationNodeCallers {
    nodesWithSingleCaller: SerializedAllocationNode[];
    branchingCallers: SerializedAllocationNode[];
    constructor(nodesWithSingleCaller: SerializedAllocationNode[], branchingCallers: SerializedAllocationNode[]);
}
export declare class SerializedAllocationNode {
    id: number;
    name: string;
    scriptName: string;
    scriptId: number;
    line: number;
    column: number;
    count: number;
    size: number;
    liveCount: number;
    liveSize: number;
    hasChildren: boolean;
    constructor(nodeId: number, functionName: string, scriptName: string, scriptId: number, line: number, column: number, count: number, size: number, liveCount: number, liveSize: number, hasChildren: boolean);
}
export declare class AllocationStackFrame {
    functionName: string;
    scriptName: string;
    scriptId: number;
    line: number;
    column: number;
    constructor(functionName: string, scriptName: string, scriptId: number, line: number, column: number);
}
export declare class Node {
    id: number;
    name: string;
    distance: number;
    nodeIndex: number;
    retainedSize: number;
    selfSize: number;
    type: string;
    canBeQueried: boolean;
    detachedDOMTreeNode: boolean;
    isAddedNotRemoved: boolean | null;
    ignored: boolean;
    constructor(id: number, name: string, distance: number, nodeIndex: number, retainedSize: number, selfSize: number, type: string);
}
export declare class Edge {
    name: string;
    node: Node;
    type: string;
    edgeIndex: number;
    isAddedNotRemoved: boolean | null;
    constructor(name: string, node: Node, type: string, edgeIndex: number);
}
export declare class Aggregate {
    count: number;
    distance: number;
    self: number;
    maxRet: number;
    name: string;
    idxs: number[];
}
export declare class AggregateForDiff {
    name: string;
    indexes: number[];
    ids: number[];
    selfSizes: number[];
    constructor();
}
export declare class Diff {
    name: string;
    addedCount: number;
    removedCount: number;
    addedSize: number;
    removedSize: number;
    deletedIndexes: number[];
    addedIndexes: number[];
    countDelta: number;
    sizeDelta: number;
    constructor(name: string);
}
export declare class DiffForClass {
    name: string;
    addedCount: number;
    removedCount: number;
    addedSize: number;
    removedSize: number;
    deletedIndexes: number[];
    addedIndexes: number[];
    countDelta: number;
    sizeDelta: number;
}
export declare class ComparatorConfig {
    fieldName1: string;
    ascending1: boolean;
    fieldName2: string;
    ascending2: boolean;
    constructor(fieldName1: string, ascending1: boolean, fieldName2: string, ascending2: boolean);
}
export declare class WorkerCommand {
    callId: number;
    disposition: string;
    objectId: number;
    newObjectId: number;
    methodName: string;
    methodArguments: any[];
    source: string;
}
export declare class ItemsRange {
    startPosition: number;
    endPosition: number;
    totalLength: number;
    items: Array<Node | Edge>;
    constructor(startPosition: number, endPosition: number, totalLength: number, items: Array<Node | Edge>);
}
export declare class StaticData {
    nodeCount: number;
    rootNodeIndex: number;
    totalSize: number;
    maxJSObjectId: number;
    constructor(nodeCount: number, rootNodeIndex: number, totalSize: number, maxJSObjectId: number);
}
export interface Statistics {
    total: number;
    native: {
        total: number;
        typedArrays: number;
    };
    v8heap: {
        total: number;
        code: number;
        jsArrays: number;
        strings: number;
        system: number;
    };
}
export declare class NodeFilter {
    minNodeId: number | undefined;
    maxNodeId: number | undefined;
    allocationNodeId: number | undefined;
    filterName: string | undefined;
    constructor(minNodeId?: number, maxNodeId?: number);
    equals(o: NodeFilter): boolean;
}
export declare class SearchConfig {
    query: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    isRegex: boolean;
    shouldJump: boolean;
    jumpBackward: boolean;
    constructor(query: string, caseSensitive: boolean, wholeWord: boolean, isRegex: boolean, shouldJump: boolean, jumpBackward: boolean);
    toSearchRegex(_global?: boolean): {
        regex: RegExp;
        fromQuery: boolean;
    };
}
export declare class Samples {
    timestamps: number[];
    lastAssignedIds: number[];
    sizes: number[];
    constructor(timestamps: number[], lastAssignedIds: number[], sizes: number[]);
}
export declare class Location {
    scriptId: number;
    lineNumber: number;
    columnNumber: number;
    constructor(scriptId: number, lineNumber: number, columnNumber: number);
}
