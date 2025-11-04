import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import type { AutocompleteHistory } from './AutocompleteHistory.js';
import type { TextEditor } from './TextEditor.js';
export declare const enum Direction {
    FORWARD = 1,
    BACKWARD = -1
}
/**
 * Small helper class that connects a `TextEditor` and an `AutocompleteHistory`
 * instance.
 */
export declare class TextEditorHistory {
    #private;
    constructor(editor: TextEditor, history: AutocompleteHistory);
    /**
     * Replaces the text editor content with entries from the history. Does nothing
     * if the cursor is not positioned correctly (unless `force` is `true`).
     */
    moveHistory(dir: Direction, force?: boolean): boolean;
    historyCompletions(context: CodeMirror.CompletionContext): CodeMirror.CompletionResult | null;
}
