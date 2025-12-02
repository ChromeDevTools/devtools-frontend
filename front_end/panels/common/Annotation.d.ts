import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    inputText: string;
    isExpanded: boolean;
    anchored: boolean;
    expandable: boolean;
    showCloseButton: boolean;
    clickHandler: () => void;
    closeHandler: () => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class Annotation extends UI.Widget.Widget {
    #private;
    constructor(id: number, label: string, showExpanded: boolean, anchored: boolean, expandable: boolean, showCloseButton: boolean, view?: View);
    wasShown(): void;
    performUpdate(): void;
    hide(): void;
    getCoordinates(): {
        x: number;
        y: number;
    };
    setCoordinates(x: number, y: number): void;
    hasShown(): boolean;
}
export {};
