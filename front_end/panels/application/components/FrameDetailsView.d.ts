import '../../../ui/components/expandable_list/expandable_list.js';
import '../../../ui/components/report_view/report_view.js';
import './StackTrace.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
export interface FrameDetailsReportViewData {
    frame: SDK.ResourceTreeModel.ResourceTreeFrame;
    target?: SDK.Target.Target;
    adScriptAncestry: Protocol.Page.AdScriptAncestry | null;
}
export declare class FrameDetailsReportView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #private;
    constructor(frame: SDK.ResourceTreeModel.ResourceTreeFrame);
    connectedCallback(): void;
    render(): Promise<void>;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-resources-frame-details-view': FrameDetailsReportView;
    }
}
