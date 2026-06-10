import * as Host from '../../core/host/host.js';
import type { AICallTree } from './performance/AICallTree.js';
export interface PerformanceAnnotationsOptions {
    aidaClient: Host.AidaClient.AidaClient;
    serverSideLoggingEnabled?: boolean;
}
export declare class PerformanceAnnotations {
    #private;
    constructor(options: PerformanceAnnotationsOptions);
    generateAIEntryLabel(callTree: AICallTree): Promise<string>;
}
