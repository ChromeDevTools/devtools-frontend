import '../../ui/components/spinners/spinners.js';
import '../../ui/components/tooltips/tooltips.js';
import * as Host from '../../core/host/host.js';
import * as UI from '../../ui/legacy/legacy.js';
export type DisclaimerTextVariant = 'console' | 'sources' | 'styles';
export interface ViewInput {
    disclaimerTooltipId?: string;
    spinnerTooltipId?: string;
    noLogging: boolean;
    aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;
    onManageInSettingsTooltipClick: () => void;
    disclaimerTextVariant?: DisclaimerTextVariant;
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
    set disclaimerTextVariant(disclaimerTextVariant: DisclaimerTextVariant | undefined);
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
}
