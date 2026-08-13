import * as Common from '../../core/common/common.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class OpenedWindowDetailsView extends UI.Widget.VBox {
    #private;
    private targetInfo;
    private isWindowClosed;
    private readonly reportView;
    private readonly documentSection;
    private readonly securitySection;
    private readonly openerElementField;
    private hasDOMAccessValue;
    constructor(targetInfo: Protocol.Target.TargetInfo, isWindowClosed: boolean);
    performUpdate(): Promise<void>;
    maybeDisplayOpenerFrame(): Promise<void>;
    buildTitle(): string;
    setIsWindowClosed(isWindowClosed: boolean): void;
    setTargetInfo(targetInfo: Protocol.Target.TargetInfo): void;
}
export declare class WorkerDetailsView extends UI.Widget.VBox {
    private readonly targetInfo;
    private readonly reportView;
    private readonly documentSection;
    private readonly isolationSection;
    private readonly coepPolicy;
    constructor(targetInfo: Protocol.Target.TargetInfo);
    workerTypeToString(type: string): Common.UIString.LocalizedString;
    private updateCoopCoepStatus;
    private fillCrossOriginPolicy;
    performUpdate(): Promise<void>;
}
