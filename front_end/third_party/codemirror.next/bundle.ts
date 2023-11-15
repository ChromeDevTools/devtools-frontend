// Base script used with Rollup to bundle the necessary CodeMirror
// components.
//
// Note that this file is also used as a TypeScript source to bundle
// the .d.ts files.

import {LRLanguage, LanguageSupport, StreamLanguage} from "@codemirror/language";
import {cssCompletionSource, cssLanguage as cssLanguageCM} from "@codemirror/lang-css";

export {
  acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap,
  closeCompletion, completeAnyWord, Completion, CompletionContext, CompletionResult,
  CompletionSource, completionStatus, currentCompletions, ifNotIn,
  moveCompletionSelection, selectedCompletion, selectedCompletionIndex, startCompletion
} from '@codemirror/autocomplete';
export {
  cursorMatchingBracket, cursorGroupLeft, cursorGroupRight, cursorSyntaxLeft, cursorSyntaxRight,
  history, historyKeymap,
  indentLess, indentMore, insertNewlineAndIndent, redo, redoSelection, selectMatchingBracket,
  selectGroupLeft, selectGroupRight, selectSyntaxLeft, selectSyntaxRight,
  standardKeymap, toggleComment, undo, undoSelection
} from '@codemirror/commands';
export * as html from '@codemirror/lang-html';
export * as javascript from '@codemirror/lang-javascript';
export { bracketMatching,
  codeFolding,
  ensureSyntaxTree, foldGutter, foldKeymap, HighlightStyle, indentOnInput, indentUnit,Language, LanguageSupport,
  StreamLanguage, StreamParser, StringStream
, syntaxHighlighting, syntaxTree, TagStyle} from '@codemirror/language';
export { highlightSelectionMatches,selectNextOccurrence} from '@codemirror/search';
export {
  Annotation, AnnotationType, ChangeDesc, ChangeSet, ChangeSpec, Compartment,
  EditorSelection, EditorState, EditorStateConfig, Extension, Facet,
  Line, MapMode, Prec, Range, RangeSet, RangeSetBuilder,
  SelectionRange, StateEffect, StateEffectType, StateField, Text, TextIterator
, Transaction,
  TransactionSpec} from '@codemirror/state';
export {
  Command, Decoration, DecorationSet, drawSelection, EditorView,
  gutter, GutterMarker, gutters,
  highlightSpecialChars, KeyBinding, keymap, lineNumberMarkers,lineNumbers, MatchDecorator, Panel, placeholder,
  repositionTooltips,
  scrollPastEnd, showPanel,showTooltip, Tooltip, tooltips, TooltipView
, ViewPlugin, ViewUpdate, WidgetType} from '@codemirror/view';
export {
  NodeProp, NodeSet, NodeType, Parser, SyntaxNode, Tree, TreeCursor
} from '@lezer/common';
export {highlightTree, Tag, tags} from '@lezer/highlight';
export {LRParser} from '@lezer/lr';
export {StyleModule} from 'style-mod';
export {indentationMarkers} from '@replit/codemirror-indentation-markers';

export function angular() {
  return import('@codemirror/lang-angular');
}
export async function clojure() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clojure')).clojure);
}
export async function coffeescript() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/coffeescript')).coffeeScript);
}
export function cpp() {
  return import('@codemirror/lang-cpp');
}
// We need to define our own "css" language here (which is basically a copy of lang-css/src/css.ts)
// because we want to match VS code behavior regarding treating dashes as word chars.
// See https://crbug.com/1471354 for background.
const cssLanguage = LRLanguage.define({
  name: cssLanguageCM.name,
  parser: cssLanguageCM.parser,
  languageData: {
    commentTokens: {block: {open: '/*', close: '*/'}},
    indentOnInput: /^\s*\}$/,
    wordChars: '',
  }
});
export const css = {
  cssCompletionSource,
  cssLanguage,
  css() {
    return new LanguageSupport(cssLanguage, cssLanguage.data.of({autocomplete: cssCompletionSource}));
  },
};
export async function dart() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clike')).dart);
}
export async function gss() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/css')).gss);
}
export async function go() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/go')).go);
}
export function java() {
  return import('@codemirror/lang-java');
}
export function json() {
  return import('@codemirror/lang-json');
}
export async function kotlin() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clike')).kotlin);
}
export function less() {
  return import('@codemirror/lang-less');
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
export function sass() {
  return import('@codemirror/lang-sass');
}
export async function scala() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/clike')).scala);
}
export async function shell() {
  return StreamLanguage.define((await import('@codemirror/legacy-modes/mode/shell')).shell);
}
export async function svelte() {
  return import('@replit/codemirror-lang-svelte');
}
export async function cssStreamParser() {
  return (await import('@codemirror/legacy-modes/mode/css') as any).css;
}
export function vue() {
  return import('@codemirror/lang-vue');
}
export function wast() {
  return import('@codemirror/lang-wast');
}
export function xml() {
  return import('@codemirror/lang-xml');
}
