import * as UI from '../../../ui/legacy/legacy.js';
export declare const enum StateType {
    PROMPT = "prompt",
    CONVERSATION = "conversation"
}
export interface State {
    activeType: StateType;
    promptText: string;
    conversationText: string;
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
        promptText: string;
        markdownText: string;
    }, view?: View);
    performUpdate(): void;
    static show({ promptText, markdownText, }: {
        promptText: string;
        markdownText: string;
    }): void;
}
export {};
