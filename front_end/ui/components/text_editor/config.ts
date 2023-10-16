// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as WindowBoundsService from '../../../services/window_bounds/window_bounds.js';
import * as CM from '../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../legacy/legacy.js';
import * as CodeHighlighter from '../code_highlighter/code_highlighter.js';
import * as Icon from '../icon_button/icon_button.js';

import {editorTheme} from './theme.js';

const LINES_TO_SCAN_FOR_INDENTATION_GUESSING = 1000;

const UIStrings = {
  /**
   *@description Label text for the editor
   */
  codeEditor: 'Code editor',
  /**
   *@description Aria alert to read the suggestion for the suggestion box when typing in text editor
   *@example {name} PH1
   *@example {2} PH2
   *@example {5} PH3
   */
  sSuggestionSOfS: '{PH1}, suggestion {PH2} of {PH3}',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/text_editor/config.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const empty: CM.Extension = [];

export const dynamicSetting = CM.Facet.define<DynamicSetting<unknown>>();

// The code below is used to wire up dynamic settings to editors. When
// you include the result of calling `instance()` in an editor
// configuration, the TextEditor class will take care of listening to
// changes in the setting, and updating the configuration as
// appropriate.

export class DynamicSetting<T> {
  compartment = new CM.Compartment();

  constructor(
      readonly settingName: string,
      private readonly getExtension: (value: T) => CM.Extension,
  ) {
  }

  settingValue(): T {
    return Common.Settings.Settings.instance().moduleSetting(this.settingName).get() as T;
  }

  instance(): CM.Extension {
    return [
      this.compartment.of(this.getExtension(this.settingValue())),
      dynamicSetting.of(this as DynamicSetting<unknown>),
    ];
  }

  sync(state: CM.EditorState, value: T): CM.StateEffect<unknown>|null {
    const cur = this.compartment.get(state);
    const needed = this.getExtension(value);
    return cur === needed ? null : this.compartment.reconfigure(needed);
  }

  static bool(name: string, enabled: CM.Extension, disabled: CM.Extension = empty): DynamicSetting<boolean> {
    return new DynamicSetting<boolean>(name, val => val ? enabled : disabled);
  }

  static none: readonly DynamicSetting<unknown>[] = [];
}

export const tabMovesFocus = DynamicSetting.bool('textEditorTabMovesFocus', [], CM.keymap.of([{
  key: 'Tab',
  run: (view: CM.EditorView): boolean => view.state.doc.length ? CM.indentMore(view) : false,
  shift: (view: CM.EditorView): boolean => view.state.doc.length ? CM.indentLess(view) : false,
}]));

const disableConservativeCompletion = CM.StateEffect.define();

// When enabled, this suppresses the behavior of showCompletionHint
// and accepting of completions with Enter until the user selects a
// completion beyond the initially selected one. Used in the console.
export const conservativeCompletion = CM.StateField.define<boolean>({
  create() {
    return true;
  },
  update(value, tr) {
    if (CM.completionStatus(tr.state) !== 'active') {
      return true;
    }
    if ((CM.selectedCompletionIndex(tr.startState) ?? 0) !== (CM.selectedCompletionIndex(tr.state) ?? 0) ||
        tr.effects.some(e => e.is(disableConservativeCompletion))) {
      return false;
    }
    return value;
  },
});

function acceptCompletionIfNotConservative(view: CM.EditorView): boolean {
  return !view.state.field(conservativeCompletion, false) && CM.acceptCompletion(view);
}

function acceptCompletionIfAtEndOfLine(view: CM.EditorView): boolean {
  const cursorPosition = view.state.selection.main.head;
  const line = view.state.doc.lineAt(cursorPosition);
  const column = cursorPosition - line.from;
  const isCursorAtEndOfLine = column >= line.length;
  if (isCursorAtEndOfLine) {
    return CM.acceptCompletion(view);
  }

  // We didn't handle this key press
  // so it will be handled by default behavior.
  return false;
}

// This is a wrapper around CodeMirror's own moveCompletionSelection command, which
// selects the first selection if the state of the selection is conservative, and
// otherwise behaves as normal.
function moveCompletionSelectionIfNotConservative(
    forward: boolean, by: 'option'|'page' = 'option'): ((view: CM.EditorView) => boolean) {
  return view => {
    if (CM.completionStatus(view.state) !== 'active') {
      return false;
    }
    if (view.state.field(conservativeCompletion, false)) {
      view.dispatch({effects: disableConservativeCompletion.of(null)});
      announceSelectedCompletionInfo(view);
      return true;
    }
    const moveSelectionResult = CM.moveCompletionSelection(forward, by)(view);
    announceSelectedCompletionInfo(view);
    return moveSelectionResult;
  };
}

function moveCompletionSelectionBackwardWrapper(): ((view: CM.EditorView) => boolean) {
  return view => {
    if (CM.completionStatus(view.state) !== 'active') {
      return false;
    }
    CM.moveCompletionSelection(false)(view);
    announceSelectedCompletionInfo(view);
    return true;
  };
}

function announceSelectedCompletionInfo(view: CM.EditorView): void {
  const ariaMessage = i18nString(UIStrings.sSuggestionSOfS, {
    PH1: CM.selectedCompletion(view.state)?.label || '',
    PH2: (CM.selectedCompletionIndex(view.state) || 0) + 1,
    PH3: CM.currentCompletions(view.state).length,
  });

  UI.ARIAUtils.alert(ariaMessage);
}

export const autocompletion = new DynamicSetting<boolean>(
    'textEditorAutocompletion',
    (activateOnTyping: boolean): CM.Extension =>
        [CM.autocompletion({
          activateOnTyping,
          icons: false,
          optionClass: (option: CM.Completion): string => option.type === 'secondary' ? 'cm-secondaryCompletion' : '',
          tooltipClass: (state: CM.EditorState): string => {
            return state.field(conservativeCompletion, false) ? 'cm-conservativeCompletion' : '';
          },
          defaultKeymap: false,
          updateSyncTime: 100,
        }),
         CM.Prec.highest(CM.keymap.of([
           {key: 'End', run: acceptCompletionIfAtEndOfLine},
           {key: 'ArrowRight', run: acceptCompletionIfAtEndOfLine},
           {key: 'Ctrl-Space', run: CM.startCompletion},
           {key: 'Escape', run: CM.closeCompletion},
           {key: 'ArrowDown', run: moveCompletionSelectionIfNotConservative(true)},
           {key: 'ArrowUp', run: moveCompletionSelectionBackwardWrapper()},
           {mac: 'Ctrl-n', run: moveCompletionSelectionIfNotConservative(true)},
           {mac: 'Ctrl-p', run: moveCompletionSelectionBackwardWrapper()},
           {key: 'PageDown', run: CM.moveCompletionSelection(true, 'page')},
           {key: 'PageUp', run: CM.moveCompletionSelection(false, 'page')},
           {key: 'Enter', run: acceptCompletionIfNotConservative},
         ]))]);

export const bracketMatching = DynamicSetting.bool('textEditorBracketMatching', CM.bracketMatching());

export const codeFolding = DynamicSetting.bool('textEditorCodeFolding', [
  CM.foldGutter({
    markerDOM(open: boolean): HTMLElement {
      const iconName = open ? 'triangle-down' : 'triangle-right';
      const icon = new Icon.Icon.Icon();
      icon.setAttribute('class', open ? 'cm-foldGutterElement' : 'cm-foldGutterElement cm-foldGutterElement-folded');
      icon.data = {
        iconName,
        color: 'var(--icon-fold-marker)',
        width: '14px',
        height: '14px',
      };
      return icon;
    },
  }),
  CM.keymap.of(CM.foldKeymap),
]);

export function guessIndent(doc: CM.Text): string {
  const values: {[indent: string]: number} = Object.create(null);
  let scanned = 0;
  for (let cur = doc.iterLines(1, Math.min(doc.lines + 1, LINES_TO_SCAN_FOR_INDENTATION_GUESSING)); !cur.next().done;) {
    let space = (/^\s*/.exec(cur.value) as string[])[0];
    if (space.length === cur.value.length || !space.length || cur.value[space.length] === '*') {
      continue;
    }
    if (space[0] === '\t') {
      space = '\t';
    } else if (/[^ ]/.test(space)) {
      continue;
    }
    scanned++;
    values[space] = (values[space] || 0) + 1;
  }
  const minOccurrence = scanned * 0.05;
  const shortest = Object.entries(values).reduce((shortest, [string, count]): string|null => {
    return count < minOccurrence || shortest && shortest.length < string.length ? shortest : string;
  }, null as string | null);
  return shortest ?? Common.Settings.Settings.instance().moduleSetting('textEditorIndent').get();
}

const deriveIndentUnit = CM.Prec.highest(CM.indentUnit.compute([], (state: CM.EditorState) => guessIndent(state.doc)));

export const autoDetectIndent = DynamicSetting.bool('textEditorAutoDetectIndent', deriveIndentUnit);

function matcher(decorator: CM.MatchDecorator): CM.Extension {
  return CM.ViewPlugin.define(
      view => ({
        decorations: decorator.createDeco(view),
        update(u): void {
          this.decorations = decorator.updateDeco(u, this.decorations);
        },
      }),
      {
        decorations: v => v.decorations,
      });
}

const WhitespaceDeco = new Map<string, CM.Decoration>();

function getWhitespaceDeco(space: string): CM.Decoration {
  const cached = WhitespaceDeco.get(space);
  if (cached) {
    return cached;
  }
  const result = CM.Decoration.mark({
    attributes: space === '\t' ? {
      class: 'cm-highlightedTab',
    } :
                                 {class: 'cm-highlightedSpaces', 'data-display': '·'.repeat(space.length)},
  });
  WhitespaceDeco.set(space, result);
  return result;
}

const showAllWhitespace = matcher(new CM.MatchDecorator({
  regexp: /\t| +/g,
  decoration: (match: RegExpExecArray): CM.Decoration => getWhitespaceDeco(match[0]),
  boundary: /\S/,
}));

const showTrailingWhitespace = matcher(new CM.MatchDecorator({
  regexp: /\s+$/g,
  decoration: CM.Decoration.mark({class: 'cm-trailingWhitespace'}),
  boundary: /\S/,
}));

export const showWhitespace = new DynamicSetting<string>('showWhitespacesInEditor', value => {
  if (value === 'all') {
    return showAllWhitespace;
  }
  if (value === 'trailing') {
    return showTrailingWhitespace;
  }
  return empty;
});

export const allowScrollPastEof = DynamicSetting.bool('allowScrollPastEof', CM.scrollPastEnd());

const cachedIndentUnit: {[indent: string]: CM.Extension} = Object.create(null);

function getIndentUnit(indent: string): CM.Extension {
  let value = cachedIndentUnit[indent];
  if (!value) {
    value = cachedIndentUnit[indent] = CM.indentUnit.of(indent);
  }
  return value;
}

export const indentUnit = new DynamicSetting<string>('textEditorIndent', getIndentUnit);

export const domWordWrap = DynamicSetting.bool('domWordWrap', CM.EditorView.lineWrapping);

function detectLineSeparator(text: string): CM.Extension {
  if (/\r\n/.test(text) && !/(^|[^\r])\n/.test(text)) {
    return CM.EditorState.lineSeparator.of('\r\n');
  }
  return [];
}

const baseKeymap = CM.keymap.of([
  {key: 'Tab', run: CM.acceptCompletion},
  {key: 'Ctrl-m', run: CM.cursorMatchingBracket, shift: CM.selectMatchingBracket},
  {key: 'Mod-/', run: CM.toggleComment},
  {key: 'Mod-d', run: CM.selectNextOccurrence},
  {key: 'Alt-ArrowLeft', mac: 'Ctrl-ArrowLeft', run: CM.cursorSyntaxLeft, shift: CM.selectSyntaxLeft},
  {key: 'Alt-ArrowRight', mac: 'Ctrl-ArrowRight', run: CM.cursorSyntaxRight, shift: CM.selectSyntaxRight},
  {key: 'Ctrl-ArrowLeft', mac: 'Alt-ArrowLeft', run: CM.cursorGroupLeft, shift: CM.selectGroupLeft},
  {key: 'Ctrl-ArrowRight', mac: 'Alt-ArrowRight', run: CM.cursorGroupRight, shift: CM.selectGroupRight},
  ...CM.standardKeymap,
  ...CM.historyKeymap,
]);

function themeIsDark(): boolean {
  const setting = Common.Settings.Settings.instance().moduleSetting('uiTheme').get();
  return setting === 'systemPreferred' ? window.matchMedia('(prefers-color-scheme: dark)').matches : setting === 'dark';
}

export const dummyDarkTheme = CM.EditorView.theme({}, {dark: true});
export const themeSelection = new CM.Compartment();

export function theme(): CM.Extension {
  return [editorTheme, themeIsDark() ? themeSelection.of(dummyDarkTheme) : themeSelection.of([])];
}

let sideBarElement: HTMLElement|null = null;

function getTooltipSpace(): DOMRect {
  if (!sideBarElement) {
    sideBarElement =
        WindowBoundsService.WindowBoundsService.WindowBoundsServiceImpl.instance().getDevToolsBoundingElement();
  }
  return sideBarElement.getBoundingClientRect();
}

export function baseConfiguration(text: string|CM.Text): CM.Extension {
  return [
    theme(),
    CM.highlightSpecialChars(),
    CM.highlightSelectionMatches(),
    CM.history(),
    CM.drawSelection(),
    CM.EditorState.allowMultipleSelections.of(true),
    CM.indentOnInput(),
    CM.syntaxHighlighting(CodeHighlighter.CodeHighlighter.highlightStyle),
    baseKeymap,
    CM.EditorView.clickAddsSelectionRange.of(mouseEvent => mouseEvent.altKey || mouseEvent.ctrlKey),
    tabMovesFocus.instance(),
    bracketMatching.instance(),
    indentUnit.instance(),
    CM.Prec.lowest(CM.EditorView.contentAttributes.of({'aria-label': i18nString(UIStrings.codeEditor)})),
    text instanceof CM.Text ? [] : detectLineSeparator(text),
    CM.tooltips({
      parent: getTooltipHost() as unknown as HTMLElement,
      tooltipSpace: getTooltipSpace,
    }),
  ];
}

export const closeBrackets: CM.Extension = [
  CM.closeBrackets(),
  CM.keymap.of(CM.closeBracketsKeymap),
];

// Root editor tooltips at the top of the document, creating a special
// element with the editor styles mounted in it for them. This is
// annoying, but necessary because a scrollable parent node clips them
// otherwise, `position: fixed` doesn't work due to `contain` styles,
// and appending them directly to `document.body` doesn't work because
// the necessary style sheets aren't available there.
let tooltipHost: ShadowRoot|null = null;

function getTooltipHost(): ShadowRoot {
  if (!tooltipHost) {
    const styleModules = CM.EditorState
                             .create({
                               extensions: [
                                 editorTheme,
                                 themeIsDark() ? dummyDarkTheme : [],
                                 CM.syntaxHighlighting(CodeHighlighter.CodeHighlighter.highlightStyle),
                                 CM.showTooltip.of({
                                   pos: 0,
                                   create() {
                                     return {dom: document.createElement('div')};
                                   },
                                 }),
                               ],
                             })
                             .facet<readonly CM.StyleModule[]>(CM.EditorView.styleModule);
    const host = document.body.appendChild(document.createElement('div'));
    host.className = 'editor-tooltip-host';
    tooltipHost = host.attachShadow({mode: 'open'});
    CM.StyleModule.mount(tooltipHost, styleModules);
  }
  return tooltipHost;
}

class CompletionHint extends CM.WidgetType {
  constructor(readonly text: string) {
    super();
  }

  override eq(other: CompletionHint): boolean {
    return this.text === other.text;
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-completionHint';
    span.textContent = this.text;
    return span;
  }
}

export const showCompletionHint = CM.ViewPlugin.fromClass(class {
  decorations: CM.DecorationSet = CM.Decoration.none;
  currentHint: string|null = null;

  update(update: CM.ViewUpdate): void {
    const top = this.currentHint = this.topCompletion(update.state);
    if (!top || update.state.field(conservativeCompletion, false)) {
      this.decorations = CM.Decoration.none;
    } else {
      this.decorations = CM.Decoration.set(
          [CM.Decoration.widget({widget: new CompletionHint(top), side: 1}).range(update.state.selection.main.head)]);
    }
  }

  topCompletion(state: CM.EditorState): string|null {
    const completion = CM.selectedCompletion(state);
    if (!completion) {
      return null;
    }
    let {label, apply} = completion;
    if (typeof apply === 'string') {
      label = apply;
      apply = undefined;
    }
    if (apply || label.length > 100 || label.indexOf('\n') > -1 || completion.type === 'secondary') {
      return null;
    }
    const pos = state.selection.main.head;
    const lineBefore = state.doc.lineAt(pos);
    if (pos !== lineBefore.to) {
      return null;
    }
    const partBefore = (label[0] === '\''    ? /'(\\.|[^'\\])*$/ :
                            label[0] === '"' ? /"(\\.|[^"\\])*$/ :
                                               /#?[\w$]+$/)
                           .exec(lineBefore.text);
    if (partBefore && !label.startsWith(partBefore[0])) {
      return null;
    }
    return label.slice(partBefore ? partBefore[0].length : 0);
  }
}, {decorations: p => p.decorations});

export function contentIncludingHint(view: CM.EditorView): string {
  const plugin = view.plugin(showCompletionHint);
  let content = view.state.doc.toString();
  if (plugin && plugin.currentHint) {
    const {head} = view.state.selection.main;
    content = content.slice(0, head) + plugin.currentHint + content.slice(head);
  }
  return content;
}
