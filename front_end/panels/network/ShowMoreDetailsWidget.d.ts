import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    text: string;
    showMore: boolean;
    onToggle: () => void;
    copy: (() => void) | null;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ShowMoreDetailsWidget extends UI.Widget.Widget {
    #private;
    constructor(target?: HTMLElement, view?: View);
    get text(): string;
    set text(text: string);
    get copy(): (() => void) | null;
    set copy(copy: () => void);
    performUpdate(): void;
}
export {};
