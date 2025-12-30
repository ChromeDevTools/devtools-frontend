import '../../ui/components/tooltips/tooltips.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare enum AiCodeGenerationTeaserDisplayState {
    TRIGGER = "trigger",
    DISCOVERY = "discovery",
    LOADING = "loading"
}
export interface ViewInput {
    displayState: AiCodeGenerationTeaserDisplayState;
    disclaimerTooltipId?: string;
    noLogging: boolean;
    onManageInSettingsTooltipClick: (event: Event) => void;
    panel?: AiCodeCompletion.AiCodeCompletion.ContextFlavor;
}
export interface ViewOutput {
    hideTooltip?: () => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class AiCodeGenerationTeaser extends UI.Widget.Widget {
    #private;
    constructor(view?: View);
    performUpdate(): void;
    get displayState(): AiCodeGenerationTeaserDisplayState;
    set displayState(displayState: AiCodeGenerationTeaserDisplayState);
    set disclaimerTooltipId(disclaimerTooltipId: string);
    set panel(panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor);
}
