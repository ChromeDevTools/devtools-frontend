import '../../ui/components/tooltips/tooltips.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { DisclaimerTextVariant } from './AiCodeCompletionDisclaimer.js';
export declare const PROMOTION_ID = "ai-code-generation";
export declare enum AiCodeGenerationTeaserDisplayState {
    TRIGGER = "trigger",
    DISCOVERY = "discovery",
    LOADING = "loading",
    GENERATED = "generated"
}
export interface ViewInput {
    displayState: AiCodeGenerationTeaserDisplayState;
    disclaimerTooltipId?: string;
    noLogging: boolean;
    onManageInSettingsTooltipClick: (event: Event) => void;
    showDataUsageTeaser: boolean;
    showDiscoveryTeaser: boolean;
    disclaimerTextVariant?: DisclaimerTextVariant;
}
export interface ViewOutput {
    hideTooltip?: () => void;
    showTooltip?: () => void;
    setTimerText?: (text: string) => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class AiCodeGenerationTeaser extends UI.Widget.Widget {
    #private;
    constructor(view?: View);
    performUpdate(): void;
    willHide(): void;
    get displayState(): AiCodeGenerationTeaserDisplayState;
    set displayState(displayState: AiCodeGenerationTeaserDisplayState);
    set disclaimerTooltipId(disclaimerTooltipId: string);
    set disclaimerTextVariant(disclaimerTextVariant: DisclaimerTextVariant);
    showTooltip(): void;
    static setDiscoveryTeaserShownInSessionForTest(value: boolean): void;
    static setShowDataUsageTeaserForTest(value: boolean): void;
}
