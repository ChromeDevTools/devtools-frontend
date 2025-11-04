import '../../ui/legacy/legacy.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    items: Array<{
        name: string;
        id: string;
    }>;
    selectedId?: string;
    onReset: () => void;
    onItemClick: (id: string) => void;
    onItemKeyDown: (id: string, key: string) => void;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class CSSOverviewSidebarPanel extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
    set items(items: Array<{
        name: string;
        id: string;
    }>);
    set selectedId(id: string);
    set onItemSelected(callback: (id: string, shouldFocus: boolean) => void);
    set onReset(callback: () => void);
}
export {};
