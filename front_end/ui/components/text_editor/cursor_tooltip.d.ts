import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
export type ArgumentHintsTooltip = [CodeMirror.StateField<CodeMirror.Tooltip | null>, CodeMirror.ViewPlugin<object>];
export declare const closeTooltip: CodeMirror.StateEffectType<null>;
export declare function cursorTooltip(source: (state: CodeMirror.EditorState, pos: number) => Promise<(() => CodeMirror.TooltipView) | null>): ArgumentHintsTooltip;
