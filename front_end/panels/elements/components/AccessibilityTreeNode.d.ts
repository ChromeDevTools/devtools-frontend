import type * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
export interface ViewInput {
    ignored: boolean;
    name: string;
    role: string;
    properties: Protocol.Accessibility.AXProperty[];
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class AccessibilityTreeNode extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set ignored(ignored: boolean);
    set name(name: string);
    set role(role: string);
    set properties(properties: Protocol.Accessibility.AXProperty[]);
    performUpdate(): void;
}
