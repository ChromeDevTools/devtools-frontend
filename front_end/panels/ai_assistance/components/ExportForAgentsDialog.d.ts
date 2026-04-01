import '../../../ui/components/spinners/spinners.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const enum StateType {
    PROMPT = "prompt",
    CONVERSATION = "conversation"
}
export interface State {
    activeType: StateType;
    promptText: string;
    conversationText: string;
    isPromptLoading: boolean;
}
interface ViewInput {
    onButtonClick: (event: Event) => void;
    state: State;
    onStateChange: (stateType: StateType) => void;
    jslogContext: string;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ExportForAgentsDialog extends UI.Widget.VBox {
    #private;
    constructor(options: {
        dialog: UI.Dialog.Dialog;
        promptText: string | Promise<string>;
        markdownText: string;
        onConversationSaveAs: () => void;
    }, view?: View);
    performUpdate(): void;
    static show({ promptText, markdownText, onConversationSaveAs, }: {
        promptText: string | Promise<string>;
        markdownText: string;
        onConversationSaveAs: () => void;
    }): void;
}
export {};
