import type * as SDK from '../../core/sdk/sdk.js';
import type * as Trace from '../../models/trace/trace.js';
import type { InsightKeys } from '../trace/insights/types.js';
export interface InsightArtifact {
    type: 'insight';
    insightType: InsightKeys;
}
export interface NetworkRequestArtifact {
    type: 'network-request';
    request: SDK.NetworkRequest.NetworkRequest | Trace.Types.Events.SyntheticNetworkRequest;
}
export interface FlameChartArtifact {
    type: 'flamechart';
    start: Trace.Types.Timing.Micro;
    end: Trace.Types.Timing.Micro;
}
export type Artifact = InsightArtifact | NetworkRequestArtifact | FlameChartArtifact;
export declare class ArtifactAddedEvent extends Event {
    artifact: Artifact;
    static readonly eventName = "artifactadded";
    constructor(artifact: Artifact);
}
export declare class ArtifactsManager extends EventTarget {
    #private;
    static instance(): ArtifactsManager;
    static removeInstance(): void;
    private constructor();
    get artifacts(): Artifact[];
    addArtifact(artifact: Artifact): void;
    clear(): void;
}
