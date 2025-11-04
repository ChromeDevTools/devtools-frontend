import type * as Lantern from '../types/types.js';
import { BaseNode } from './BaseNode.js';
declare class CPUNode<T = Lantern.AnyNetworkObject> extends BaseNode<T> {
    _event: Lantern.TraceEvent;
    _childEvents: Lantern.TraceEvent[];
    correctedEndTs: number | undefined;
    constructor(parentEvent: Lantern.TraceEvent, childEvents?: Lantern.TraceEvent[], correctedEndTs?: number);
    get type(): 'cpu';
    get startTime(): number;
    get endTime(): number;
    get duration(): number;
    get event(): Lantern.TraceEvent;
    get childEvents(): Lantern.TraceEvent[];
    /**
     * Returns true if this node contains a Layout task.
     */
    didPerformLayout(): boolean;
    /**
     * Returns the script URLs that had their EvaluateScript events occur in this task.
     */
    getEvaluateScriptURLs(): Set<string>;
    cloneWithoutRelationships(): CPUNode;
}
export { CPUNode };
