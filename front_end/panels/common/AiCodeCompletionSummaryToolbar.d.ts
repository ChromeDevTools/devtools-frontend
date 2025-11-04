import '../../ui/components/spinners/spinners.js';
import '../../ui/components/tooltips/tooltips.js';
import * as Host from '../../core/host/host.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface AiCodeCompletionSummaryToolbarProps {
    citationsTooltipId: string;
    disclaimerTooltipId?: string;
    spinnerTooltipId?: string;
    hasTopBorder?: boolean;
}
export interface ViewInput {
    disclaimerTooltipId?: string;
    spinnerTooltipId?: string;
    citations?: Set<string>;
    citationsTooltipId: string;
    loading: boolean;
    hasTopBorder: boolean;
    aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_SUMMARY_TOOLBAR_VIEW: View;
export declare class AiCodeCompletionSummaryToolbar extends UI.Widget.Widget {
    #private;
    constructor(props: AiCodeCompletionSummaryToolbarProps, view?: View);
    setLoading(loading: boolean): void;
    updateCitations(citations: string[]): void;
    clearCitations(): void;
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
}
