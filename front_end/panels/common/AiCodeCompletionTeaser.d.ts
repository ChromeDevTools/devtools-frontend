import '../../ui/kit/kit.js';
import * as Host from '../../core/host/host.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    aidaAvailability?: Host.AidaClient.AidaAccessPreconditions;
    onAction: (event: Event) => void;
    onDismiss: (event: Event) => void;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
interface AiCodeCompletionTeaserConfig {
    onDetach: () => void;
    panel?: AiCodeCompletion.AiCodeCompletion.ContextFlavor;
}
export declare class AiCodeCompletionTeaser extends UI.Widget.Widget {
    #private;
    constructor(config: AiCodeCompletionTeaserConfig, view?: View);
    onAction: (event: Event) => Promise<void>;
    onDismiss: (event: Event) => void;
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
    onDetach(): void;
}
export {};
