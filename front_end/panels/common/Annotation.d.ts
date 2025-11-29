import * as Annotations from '../../ui/components/annotations/annotations.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    inputText: string;
    isExpanded: boolean;
    clickHandler: () => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class Annotation extends UI.Widget.Widget {
    #private;
    constructor(label: string, type: Annotations.AnnotationType, element?: HTMLElement, view?: View);
    wasShown(): void;
    performUpdate(): void;
    hide(): void;
    getCoordinates(): {
        x: number;
        y: number;
    };
    setCoordinates(x: number, y: number): void;
}
export {};
