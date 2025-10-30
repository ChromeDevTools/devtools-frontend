import { VBox } from './Widget.js';
interface ViewInput {
    reason: string;
    onReconnect: () => void;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RemoteDebuggingTerminatedScreen extends VBox {
    constructor(reason: string, view?: View);
    static show(reason: string): void;
}
export {};
