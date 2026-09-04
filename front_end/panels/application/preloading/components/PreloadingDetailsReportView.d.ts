import '../../../../ui/components/report_view/report_view.js';
import '../../../../ui/components/request_link_icon/request_link_icon.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as Logs from '../../../../models/logs/logs.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export type PreloadingDetailsReportViewData = PreloadingDetailsReportViewDataInternal | null;
interface PreloadingDetailsReportViewDataInternal {
    pipeline: SDK.PreloadingModel.PreloadPipeline;
    ruleSets: Protocol.Preload.RuleSet[];
    pageURL: Platform.DevToolsPath.UrlString;
    requestResolver?: Logs.RequestResolver.RequestResolver;
}
export interface ViewInput {
    data: PreloadingDetailsReportViewData;
}
export declare class PreloadingDetailsReportView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: (input: ViewInput, _output: undefined, target: HTMLElement) => void);
    set data(data: PreloadingDetailsReportViewData);
    wasShown(): void;
    performUpdate(): void;
}
export {};
