import { VBox } from './Widget.js';
type View = (input: object, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class TargetCrashedScreen extends VBox {
    private readonly hideCallback;
    constructor(hideCallback: () => void, view?: View);
    willHide(): void;
}
export {};
