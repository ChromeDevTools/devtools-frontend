import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
/**
 * The CodeMirror effect used to change the highlighted execution position.
 *
 * Usage:
 * ```js
 * view.dispatch({effects: setHighlightedPosition.of(position)});
 * ```
 */
export declare const setHighlightedPosition: CodeMirror.StateEffectType<number>;
/**
 * The CodeMirror effect used to clear the highlighted execution position.
 *
 * Usage:
 * ```js
 * view.dispatch({effects: clearHighlightedPosition.of()});
 * ```
 */
export declare const clearHighlightedPosition: CodeMirror.StateEffectType<void>;
/**
 * Constructs a CodeMirror extension that can be used to decorate the current execution
 * line (and token), for example when the debugger is paused, with specific CSS classes.
 *
 * @param executionLineClassName The CSS class name to use for decorating the execution line (e.g. `'cm-executionLine'`).
 * @param executionTokenClassName The CSS class name to use for decorating the execution token (e.g. `'cm-executionToken'`).
 * @returns a CodeMirror extension that highlights the current execution line and token when set.
 */
export declare function positionHighlighter(executionLineClassName: string, executionTokenClassName: string): CodeMirror.Extension;
