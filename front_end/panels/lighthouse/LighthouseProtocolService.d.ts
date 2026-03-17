import type * as Platform from '../../core/platform/platform.js';
import type * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import type * as LighthouseModel from '../../models/lighthouse/lighthouse.js';
export interface LighthouseRun {
    inspectedURL: Platform.DevToolsPath.UrlString;
    categoryIDs: string[];
    flags: {
        formFactor: (string | undefined);
        mode: string;
    };
}
/**
 * ProtocolService manages a connection between the frontend (Lighthouse panel) and the Lighthouse worker.
 */
export declare class ProtocolService implements ProtocolClient.CDPConnection.CDPConnectionObserver {
    private mainSessionId?;
    private rootTargetId?;
    private rootTarget?;
    private lighthouseWorkerPromise?;
    private lighthouseMessageUpdateCallback?;
    private removeDialogHandler?;
    private configForTesting?;
    private connection?;
    attach(): Promise<void>;
    getLocales(): readonly string[];
    startTimespan(currentLighthouseRun: LighthouseRun): Promise<void>;
    collectLighthouseResults(currentLighthouseRun: LighthouseRun): Promise<LighthouseModel.ReporterTypes.RunnerResult>;
    detach(): Promise<void>;
    registerStatusCallback(callback: (arg0: string) => void): void;
    onEvent<T extends ProtocolClient.CDPConnection.Event>(event: ProtocolClient.CDPConnection.CDPEvent<T>): void;
    private dispatchProtocolMessage;
    onDisconnect(): void;
    private initWorker;
    private ensureWorkerExists;
    private onWorkerMessage;
    private sendProtocolMessage;
    private send;
    /** sendWithResponse currently only handles the original startLighthouse request and LHR-filled response. */
    private sendWithResponse;
}
