// Base script used with Rollup to bundle the necessary CodeMirror
// components.
//
// Note that this file is also used as a TypeScript source to bundle
// the .d.ts files.

import {StreamLanguage} from '@codemirror/stream-parser';

export {
  acceptCompletion, autocompletion, closeCompletion, completeAnyWord,
  Completion, CompletionContext, CompletionResult, CompletionSource, currentCompletions,
  ifNotIn, selectedCompletion, startCompletion,
} from '@codemirror/autocomplete';
export {closeBrackets, closeBracketsKeymap} from '@codemirror/closebrackets';
export {
  cursorMatchingBracket, cursorSubwordBackward, cursorSubwordForward,
  indentLess, indentMore, insertNewlineAndIndent, selectMatchingBracket,
  selectSubwordBackward, selectSubwordForward,
  standardKeymap
} from '@codemirror/commands';
export {toggleComment} from '@codemirror/comment';
export {codeFolding, foldGutter, foldKeymap} from '@codemirror/fold';
export {gutter, GutterMarker, gutters, lineNumberMarkers,lineNumbers} from '@codemirror/gutter';
export {HighlightStyle, highlightTree, Tag, tags, TagStyle} from '@codemirror/highlight';
export {history, historyKeymap, redo, redoSelection, undo, undoSelection} from '@codemirror/history';
export * as css from '@codemirror/lang-css';
export * as html from '@codemirror/lang-html';
export * as javascript from '@codemirror/lang-javascript';
export {ensureSyntaxTree, indentOnInput, indentUnit,Language, LanguageSupport, syntaxTree} from '@codemirror/language';
export {bracketMatching} from '@codemirror/matchbrackets';
export {Panel, showPanel} from '@codemirror/panel';
export {Range, RangeSet, RangeSetBuilder} from '@codemirror/rangeset';
export {selectNextOccurrence} from '@codemirror/search';
export {
  Annotation, AnnotationType, ChangeDesc, ChangeSet, ChangeSpec, Compartment,
  EditorSelection, EditorState, EditorStateConfig, Extension, Facet, Prec,
  SelectionRange, StateEffect, StateEffectType, StateField, Transaction,
  TransactionSpec
} from '@codemirror/state';
export {StreamLanguage, StreamParser, StringStream} from '@codemirror/stream-parser';
export {Line, Text, TextIterator} from '@codemirror/text';
export { repositionTooltips,showTooltip, Tooltip, tooltips, TooltipView} from '@codemirror/tooltip';
export {
  Command, Decoration, DecorationSet, drawSelection, EditorView,
  highlightSpecialChars, KeyBinding, keymap, MatchDecorator, placeholder,
  scrollPastEnd, ViewPlugin, ViewUpdate, WidgetType,
} from '@codemirror/view';
export {
  NodeProp, NodeSet, NodeType, Parser, SyntaxNode, Tree, TreeCursor
} from '@lezer/common';
export {LRParser} from '@lezer/lr';
export {StyleModule} from 'style-mod';

export async function clojure() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clojure')).clojure);
}
export async function coffeescript() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/coffeescript')).coffeeScript);
}
export function cpp() {
  return import('@codemirror/lang-cpp');
}
export function java() {
  return import('@codemirror/lang-java');
}
export function json() {
  return import('@codemirror/lang-json');
}
export function markdown() {
  return import('@codemirror/lang-markdown');
}
export function php() {
  return import('@codemirror/lang-php');
}
export function python() {
  return import('@codemirror/lang-python');
}
export async function shell() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/shell')).shell);
}
export function wast() {
  return import('@codemirror/lang-wast');
}
export function xml() {
  return import('@codemirror/lang-xml');
}
