import '../../ui/components/expandable_list/expandable_list.js';
import '../../ui/components/report_view/report_view.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface FrameDetailsReportViewData {
    frame: SDK.ResourceTreeModel.ResourceTreeFrame;
    target?: SDK.Target.Target;
    adScriptAncestry: Protocol.Page.AdScriptAncestry | null;
}
interface FrameDetailsViewInput {
    frame: SDK.ResourceTreeModel.ResourceTreeFrame;
    target: SDK.Target.Target | null;
    adScriptAncestry: Protocol.Page.AdScriptAncestry | null;
    linkTargetDOMNode?: Promise<SDK.DOMModel.DOMNode | null>;
    permissionsPolicies: Promise<Protocol.Page.PermissionsPolicyFeatureState[] | null> | null;
    protocolMonitorExperimentEnabled: boolean;
    trials: Protocol.Page.OriginTrial[] | null;
    securityIsolationInfo?: Promise<Protocol.Network.SecurityIsolationStatus | null>;
    onRevealInNetwork?: () => void;
    onRevealInSources: () => void;
}
type View = (input: FrameDetailsViewInput, output: undefined, target: HTMLElement) => void;
export declare class FrameDetailsReportView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set frame(frame: SDK.ResourceTreeModel.ResourceTreeFrame);
    get frame(): SDK.ResourceTreeModel.ResourceTreeFrame | undefined;
    performUpdate(): Promise<void>;
}
export {};
