import '../../kit/kit.js';
import * as Common from '../../../core/common/common.js';
import type * as Host from '../../../core/host/host.js';
export type CanShowSurveyCallback = (result: Host.InspectorFrontendHostAPI.CanShowSurveyResult) => void;
export type ShowSurveyCallback = (result: Host.InspectorFrontendHostAPI.ShowSurveyResult) => void;
export interface SurveyLinkData {
    trigger: string;
    promptText: Common.UIString.LocalizedString;
    canShowSurvey: (trigger: string, callback: CanShowSurveyCallback) => void;
    showSurvey: (trigger: string, callback: ShowSurveyCallback) => void;
}
/**
 * A link to a survey. The link is rendered asynchronously because we need to first check if
 * canShowSurvey succeeds.
 **/
export declare class SurveyLink extends HTMLElement {
    #private;
    set data(data: SurveyLinkData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-survey-link': SurveyLink;
    }
}
