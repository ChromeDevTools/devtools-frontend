import * as SDK from '../../core/sdk/sdk.js';
import { NetworkLog } from './NetworkLog.js';
export declare class LogManager implements SDK.TargetManager.SDKModelObserver<SDK.LogModel.LogModel> {
    #private;
    constructor(targetManager: SDK.TargetManager.TargetManager, networkLog: NetworkLog);
    static instance({ forceNew }?: {
        forceNew: boolean;
    }): LogManager;
    static removeInstance(): void;
    modelAdded(logModel: SDK.LogModel.LogModel): void;
    modelRemoved(logModel: SDK.LogModel.LogModel): void;
    private logEntryAdded;
}
