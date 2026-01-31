import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    text: string;
    showMore: boolean;
    onToggle: () => void;
    copy: CopyMenuItem | null;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
interface CopyMenuItem {
    menuItem: UI.ContextMenu.Item;
    handler: () => void;
}
export declare class ShowMoreDetailsWidget extends UI.Widget.Widget {
    #private;
    constructor(target?: HTMLElement, view?: View);
    get text(): string;
    set text(text: string);
    set copy(copy: CopyMenuItem);
    performUpdate(): void;
}
export {};
