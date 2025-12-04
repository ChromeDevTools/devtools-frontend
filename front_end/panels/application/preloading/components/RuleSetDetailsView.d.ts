import type * as Protocol from '../../../../generated/protocol.js';
import * as CodeMirror from '../../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../../../ui/legacy/legacy.js';
type RuleSet = Protocol.Preload.RuleSet;
export interface ViewInput {
    url: string;
    errorMessage?: string;
    editorState: CodeMirror.EditorState;
    sourceText: string;
}
export declare const DEFAULT_VIEW: (input: ViewInput | null, _output: object, target: HTMLElement) => void;
export declare class RuleSetDetailsView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: (input: ViewInput | null, _output: object, target: HTMLElement) => void);
    wasShown(): void;
    set ruleSet(ruleSet: RuleSet | null);
    set shouldPrettyPrint(shouldPrettyPrint: boolean);
    performUpdate(): Promise<void>;
}
export {};
