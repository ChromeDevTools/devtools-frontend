import '../../ui/components/spinners/spinners.js';
import '../../ui/components/tooltips/tooltips.js';
import * as Host from '../../core/host/host.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    disclaimerTooltipId?: string;
    spinnerTooltipId?: string;
    noLogging: boolean;
    aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;
    onManageInSettingsTooltipClick: () => void;
    panel?: AiCodeCompletion.AiCodeCompletion.ContextFlavor;
}
export interface ViewOutput {
    hideTooltip?: () => void;
    setLoading?: (isLoading: boolean) => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_SUMMARY_TOOLBAR_VIEW: View;
export declare class AiCodeCompletionDisclaimer extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set disclaimerTooltipId(disclaimerTooltipId: string);
    set spinnerTooltipId(spinnerTooltipId: string);
    set loading(loading: boolean);
    set panel(panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor);
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
}
