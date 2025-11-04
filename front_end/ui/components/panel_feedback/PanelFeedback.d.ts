import '../../legacy/legacy.js';
import * as Platform from '../../../core/platform/platform.js';
export interface PanelFeedbackData {
    feedbackUrl: Platform.DevToolsPath.UrlString;
    quickStartUrl: Platform.DevToolsPath.UrlString;
    quickStartLinkText: string;
}
export declare class PanelFeedback extends HTMLElement {
    #private;
    set data(data: PanelFeedbackData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-panel-feedback': PanelFeedback;
    }
}
