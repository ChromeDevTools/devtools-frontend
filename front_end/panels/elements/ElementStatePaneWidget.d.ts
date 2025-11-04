import * as UI from '../../ui/legacy/legacy.js';
interface ElementState {
    state: string;
    checked?: boolean;
    disabled?: boolean;
    hidden?: boolean;
    type: 'persistent' | 'specific';
}
interface ViewInput {
    states: ElementState[];
    onStateCheckboxClicked: (event: MouseEvent) => void;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ElementStatePaneWidget extends UI.Widget.Widget {
    #private;
    constructor(view?: View);
    private onStateCheckboxClicked;
    private updateModel;
    wasShown(): void;
    performUpdate(): Promise<void>;
}
export declare class ButtonProvider implements UI.Toolbar.Provider {
    private readonly button;
    private view;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): ButtonProvider;
    private clicked;
    item(): UI.Toolbar.ToolbarToggle;
}
export {};
