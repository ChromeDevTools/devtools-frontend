// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as TextUtils from '../../../models/text_utils/text_utils.js';
import * as CM from '../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../legacy/legacy.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import * as CodeHighlighter from '../code_highlighter/code_highlighter.js';
import * as Icon from '../icon_button/icon_button.js';
import { editorTheme } from './theme.js';
const LINES_TO_SCAN_FOR_INDENTATION_GUESSING = 1000;
const RECOMPUTE_INDENT_MAX_SIZE = 200;
const UIStrings = {
    /**
     * @description Label text for the editor
     */
    codeEditor: 'Code editor',
    /**
     * @description Aria alert to read the suggestion for the suggestion box when typing in text editor
     * @example {name} PH1
     * @example {2} PH2
     * @example {5} PH3
     */
    sSuggestionSOfS: '{PH1}, suggestion {PH2} of {PH3}',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/text_editor/config.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const empty = [];
export const dynamicSetting = CM.Facet.define();
// The code below is used to wire up dynamic settings to editors. When
// you include the result of calling `instance()` in an editor
// configuration, the TextEditor class will take care of listening to
// changes in the setting, and updating the configuration as
// appropriate.
export class DynamicSetting {
    settingName;
    getExtension;
    compartment = new CM.Compartment();
    constructor(settingName, getExtension) {
        this.settingName = settingName;
        this.getExtension = getExtension;
    }
    settingValue() {
        return Common.Settings.Settings.instance().moduleSetting(this.settingName).get();
    }
    instance() {
        return [
            this.compartment.of(this.getExtension(this.settingValue())),
            dynamicSetting.of(this),
        ];
    }
    sync(state, value) {
        const cur = this.compartment.get(state);
        const needed = this.getExtension(value);
        return cur === needed ? null : this.compartment.reconfigure(needed);
    }
    static bool(name, enabled, disabled = empty) {
        return new DynamicSetting(name, val => val ? enabled : disabled);
    }
    static none = [];
}
export const tabMovesFocus = DynamicSetting.bool('text-editor-tab-moves-focus', [], CM.keymap.of([{
        key: 'Tab',
        run: (view) => view.state.doc.length ? CM.indentMore(view) : false,
        shift: (view) => view.state.doc.length ? CM.indentLess(view) : false,
    }]));
const disableConservativeCompletion = CM.StateEffect.define();
/**
 * When enabled, this suppresses the behavior of showCompletionHint
 * and accepting of completions with Enter until the user selects a
 * completion beyond the initially selected one. Used in the console.
 **/
export const conservativeCompletion = CM.StateField.define({
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
function acceptCompletionIfNotConservative(view) {
    return !view.state.field(conservativeCompletion, false) && CM.acceptCompletion(view);
}
function acceptCompletionIfAtEndOfLine(view) {
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
/**
 * This is a wrapper around CodeMirror's own moveCompletionSelection command, which
 * selects the first selection if the state of the selection is conservative, and
 * otherwise behaves as normal.
 **/
function moveCompletionSelectionIfNotConservative(forward, by = 'option') {
    return view => {
        if (CM.completionStatus(view.state) !== 'active') {
            return false;
        }
        if (view.state.field(conservativeCompletion, false)) {
            view.dispatch({ effects: disableConservativeCompletion.of(null) });
            announceSelectedCompletionInfo(view);
            return true;
        }
        const moveSelectionResult = CM.moveCompletionSelection(forward, by)(view);
        announceSelectedCompletionInfo(view);
        return moveSelectionResult;
    };
}
function moveCompletionSelectionBackwardWrapper() {
    return view => {
        if (CM.completionStatus(view.state) !== 'active') {
            return false;
        }
        CM.moveCompletionSelection(false)(view);
        announceSelectedCompletionInfo(view);
        return true;
    };
}
function announceSelectedCompletionInfo(view) {
    const ariaMessage = i18nString(UIStrings.sSuggestionSOfS, {
        PH1: CM.selectedCompletion(view.state)?.label || '',
        PH2: (CM.selectedCompletionIndex(view.state) || 0) + 1,
        PH3: CM.currentCompletions(view.state).length,
    });
    UI.ARIAUtils.LiveAnnouncer.alert(ariaMessage);
}
export const autocompletion = new DynamicSetting('text-editor-autocompletion', (activateOnTyping) => [CM.autocompletion({
        activateOnTyping,
        icons: false,
        optionClass: (option) => option.type === 'secondary' ? 'cm-secondaryCompletion' : '',
        tooltipClass: (state) => {
            return state.field(conservativeCompletion, false) ? 'cm-conservativeCompletion' : '';
        },
        defaultKeymap: false,
        updateSyncTime: 100,
    }),
    CM.Prec.highest(CM.keymap.of([
        { key: 'End', run: acceptCompletionIfAtEndOfLine },
        { key: 'ArrowRight', run: acceptCompletionIfAtEndOfLine },
        { key: 'Ctrl-Space', run: CM.startCompletion },
        { key: 'Escape', run: CM.closeCompletion },
        { key: 'ArrowDown', run: moveCompletionSelectionIfNotConservative(true) },
        { key: 'ArrowUp', run: moveCompletionSelectionBackwardWrapper() },
        { mac: 'Ctrl-n', run: moveCompletionSelectionIfNotConservative(true) },
        { mac: 'Ctrl-p', run: moveCompletionSelectionBackwardWrapper() },
        { key: 'PageDown', run: CM.moveCompletionSelection(true, 'page') },
        { key: 'PageUp', run: CM.moveCompletionSelection(false, 'page') },
        { key: 'Enter', run: acceptCompletionIfNotConservative },
    ]))]);
export const bracketMatching = DynamicSetting.bool('text-editor-bracket-matching', CM.bracketMatching());
export const codeFolding = DynamicSetting.bool('text-editor-code-folding', [
    CM.foldGutter({
        markerDOM(open) {
            const iconName = open ? 'triangle-down' : 'triangle-right';
            const icon = new Icon.Icon.Icon();
            icon.setAttribute('class', open ? 'cm-foldGutterElement' : 'cm-foldGutterElement cm-foldGutterElement-folded');
            icon.setAttribute('jslog', `${VisualLogging.expand().track({ click: true })}`);
            icon.name = iconName;
            icon.classList.add('small');
            return icon;
        },
    }),
    CM.keymap.of(CM.foldKeymap),
]);
const AutoDetectIndent = CM.StateField.define({
    create: state => detectIndentation(state.doc),
    update: (indent, tr) => {
        return tr.docChanged && preservedLength(tr.changes) <= RECOMPUTE_INDENT_MAX_SIZE ? detectIndentation(tr.state.doc) :
            indent;
    },
    provide: f => CM.Prec.highest(CM.indentUnit.from(f)),
});
function preservedLength(ch) {
    let len = 0;
    ch.iterGaps((_from, _to, l) => {
        len += l;
    });
    return len;
}
function detectIndentation(doc) {
    const lines = doc.iterLines(1, Math.min(doc.lines + 1, LINES_TO_SCAN_FOR_INDENTATION_GUESSING));
    const indentUnit = TextUtils.TextUtils.detectIndentation(lines);
    return indentUnit ?? Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
}
export const autoDetectIndent = DynamicSetting.bool('text-editor-auto-detect-indent', AutoDetectIndent);
function matcher(decorator) {
    return CM.ViewPlugin.define(view => ({
        decorations: decorator.createDeco(view),
        update(u) {
            this.decorations = decorator.updateDeco(u, this.decorations);
        },
    }), {
        decorations: v => v.decorations,
    });
}
const WhitespaceDeco = new Map();
function getWhitespaceDeco(space) {
    const cached = WhitespaceDeco.get(space);
    if (cached) {
        return cached;
    }
    const result = CM.Decoration.mark({
        attributes: space === '\t' ? {
            class: 'cm-highlightedTab',
        } :
            { class: 'cm-highlightedSpaces', 'data-display': '·'.repeat(space.length) },
    });
    WhitespaceDeco.set(space, result);
    return result;
}
const showAllWhitespace = matcher(new CM.MatchDecorator({
    regexp: /\t| +/g,
    decoration: (match) => getWhitespaceDeco(match[0]),
    boundary: /\S/,
}));
const showTrailingWhitespace = matcher(new CM.MatchDecorator({
    regexp: /\s+$/g,
    decoration: CM.Decoration.mark({ class: 'cm-trailingWhitespace' }),
    boundary: /\S/,
}));
export const showWhitespace = new DynamicSetting('show-whitespaces-in-editor', value => {
    if (value === 'all') {
        return showAllWhitespace;
    }
    if (value === 'trailing') {
        return showTrailingWhitespace;
    }
    return empty;
});
export const allowScrollPastEof = DynamicSetting.bool('allow-scroll-past-eof', CM.scrollPastEnd());
const cachedIndentUnit = Object.create(null);
function getIndentUnit(indent) {
    let value = cachedIndentUnit[indent];
    if (!value) {
        value = cachedIndentUnit[indent] = CM.indentUnit.of(indent);
    }
    return value;
}
export const indentUnit = new DynamicSetting('text-editor-indent', getIndentUnit);
export const domWordWrap = DynamicSetting.bool('dom-word-wrap', CM.EditorView.lineWrapping);
export const sourcesWordWrap = DynamicSetting.bool('sources.word-wrap', CM.EditorView.lineWrapping);
function detectLineSeparator(text) {
    if (/\r\n/.test(text) && !/(^|[^\r])\n/.test(text)) {
        return CM.EditorState.lineSeparator.of('\r\n');
    }
    return [];
}
const baseKeymap = CM.keymap.of([
    { key: 'Tab', run: CM.acceptCompletion },
    { key: 'Ctrl-m', run: CM.cursorMatchingBracket, shift: CM.selectMatchingBracket },
    { key: 'Mod-/', run: CM.toggleComment },
    { key: 'Mod-d', run: CM.selectNextOccurrence },
    { key: 'Alt-ArrowLeft', mac: 'Ctrl-ArrowLeft', run: CM.cursorSyntaxLeft, shift: CM.selectSyntaxLeft },
    { key: 'Alt-ArrowRight', mac: 'Ctrl-ArrowRight', run: CM.cursorSyntaxRight, shift: CM.selectSyntaxRight },
    { key: 'Ctrl-ArrowLeft', mac: 'Alt-ArrowLeft', run: CM.cursorGroupLeft, shift: CM.selectGroupLeft },
    { key: 'Ctrl-ArrowRight', mac: 'Alt-ArrowRight', run: CM.cursorGroupRight, shift: CM.selectGroupRight },
    ...CM.standardKeymap,
    ...CM.historyKeymap,
]);
function themeIsDark() {
    const setting = Common.Settings.Settings.instance().moduleSetting('ui-theme').get();
    return setting === 'systemPreferred' ? window.matchMedia('(prefers-color-scheme: dark)').matches : setting === 'dark';
}
export const dummyDarkTheme = CM.EditorView.theme({}, { dark: true });
export const themeSelection = new CM.Compartment();
export function theme() {
    return [editorTheme, themeIsDark() ? themeSelection.of(dummyDarkTheme) : themeSelection.of([])];
}
let sideBarElement = null;
function getTooltipSpace() {
    if (!sideBarElement) {
        sideBarElement = UI.UIUtils.getDevToolsBoundingElement();
    }
    return sideBarElement.getBoundingClientRect();
}
export function baseConfiguration(text) {
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
        CM.Prec.lowest(CM.EditorView.contentAttributes.of({ 'aria-label': i18nString(UIStrings.codeEditor) })),
        text instanceof CM.Text ? [] : detectLineSeparator(text),
        CM.tooltips({
            parent: getTooltipHost(),
            tooltipSpace: getTooltipSpace,
        }),
        CM.bidiIsolates(),
    ];
}
export const closeBrackets = DynamicSetting.bool('text-editor-bracket-closing', [
    CM.html.autoCloseTags,
    CM.closeBrackets(),
    CM.keymap.of(CM.closeBracketsKeymap),
]);
// Root editor tooltips at the top of the document, creating a special
// element with the editor styles mounted in it for them. This is
// annoying, but necessary because a scrollable parent node clips them
// otherwise, `position: fixed` doesn't work due to `contain` styles,
// and appending them directly to `document.body` doesn't work because
// the necessary style sheets aren't available there.
let tooltipHost = null;
function getTooltipHost() {
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
                        return { dom: document.createElement('div') };
                    },
                }),
            ],
        })
            .facet(CM.EditorView.styleModule);
        const host = document.body.appendChild(document.createElement('div'));
        host.className = 'editor-tooltip-host';
        tooltipHost = host.attachShadow({ mode: 'open' });
        CM.StyleModule.mount(tooltipHost, styleModules);
    }
    return tooltipHost;
}
class CompletionHint extends CM.WidgetType {
    text;
    constructor(text) {
        super();
        this.text = text;
    }
    eq(other) {
        return this.text === other.text;
    }
    toDOM() {
        const span = document.createElement('span');
        span.className = 'cm-completionHint';
        span.textContent = this.text;
        return span;
    }
}
export const showCompletionHint = CM.ViewPlugin.fromClass(class {
    decorations = CM.Decoration.none;
    currentHint = null;
    update(update) {
        const top = this.currentHint = this.topCompletion(update.state);
        if (!top || update.state.field(conservativeCompletion, false)) {
            this.decorations = CM.Decoration.none;
        }
        else {
            this.decorations = CM.Decoration.set([CM.Decoration.widget({ widget: new CompletionHint(top), side: 1 }).range(update.state.selection.main.head)]);
        }
    }
    topCompletion(state) {
        const completion = CM.selectedCompletion(state);
        if (!completion) {
            return null;
        }
        let { label, apply } = completion;
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
        const partBefore = (label[0] === '\'' ? /'(\\.|[^'\\])*$/ :
            label[0] === '"' ? /"(\\.|[^"\\])*$/ :
                /#?[\w$]+$/)
            .exec(lineBefore.text);
        if (partBefore && !label.startsWith(partBefore[0])) {
            return null;
        }
        return label.slice(partBefore ? partBefore[0].length : 0);
    }
}, { decorations: p => p.decorations });
export function contentIncludingHint(view) {
    const plugin = view.plugin(showCompletionHint);
    let content = view.state.doc.toString();
    if (plugin?.currentHint) {
        const { head } = view.state.selection.main;
        content = content.slice(0, head) + plugin.currentHint + content.slice(head);
    }
    return content;
}
export const setAiAutoCompleteSuggestion = CM.StateEffect.define();
export const aiAutoCompleteSuggestionState = CM.StateField.define({
    create: () => null,
    update(value, tr) {
        for (const effect of tr.effects) {
            if (effect.is(setAiAutoCompleteSuggestion)) {
                if (effect.value) {
                    return effect.value;
                }
                value?.clearCachedRequest();
                return null;
            }
        }
        if (!value) {
            return value;
        }
        // A suggestion from an effect can be stale if the document was changed
        // between when the request was sent and the response was received.
        // We check if the position is still valid before trying to map it.
        if (value.from > tr.state.doc.length) {
            value.clearCachedRequest();
            return null;
        }
        // If deletion occurs, set to null. Otherwise, the mapping might fail if
        // the position is inside the deleted range.
        if (tr.docChanged && tr.state.doc.length < tr.startState.doc.length) {
            value.clearCachedRequest();
            return null;
        }
        const from = tr.changes.mapPos(value.from);
        const { head } = tr.state.selection.main;
        // If a change happened before the position from which suggestion was generated, set to null.
        if (tr.docChanged && head < from) {
            value.clearCachedRequest();
            return null;
        }
        // Check if what's typed after the AI suggestion is a prefix of the AI suggestion.
        const typedText = tr.state.doc.sliceString(from, head);
        return value.text.startsWith(typedText) ? value : null;
    },
});
export function hasActiveAiSuggestion(state) {
    return state.field(aiAutoCompleteSuggestionState) !== null;
}
export function acceptAiAutoCompleteSuggestion(view) {
    const selectedCompletion = CM.selectedCompletion(view.state);
    if (selectedCompletion) {
        return { accepted: false };
    }
    const suggestion = view.state.field(aiAutoCompleteSuggestionState);
    if (!suggestion) {
        return { accepted: false };
    }
    const { text, from } = suggestion;
    const { head } = view.state.selection.main;
    const typedText = view.state.doc.sliceString(from, head);
    if (!text.startsWith(typedText)) {
        return { accepted: false };
    }
    const remainingText = text.slice(typedText.length);
    view.dispatch({
        changes: { from: head, insert: remainingText },
        selection: { anchor: head + remainingText.length },
        effects: setAiAutoCompleteSuggestion.of(null),
        userEvent: 'input.complete',
    });
    suggestion.clearCachedRequest();
    return { accepted: true, suggestion };
}
export const aiAutoCompleteSuggestion = [
    aiAutoCompleteSuggestionState,
    CM.ViewPlugin.fromClass(class {
        decorations = CM.Decoration.none;
        #lastLoggedSuggestion = null;
        update(update) {
            // If there is no text on the document, we don't want to show the AI suggestion.
            if (update.state.doc.length === 0) {
                this.decorations = CM.Decoration.none;
                return;
            }
            // Hide decorations if there is no active AI suggestion.
            const activeSuggestion = update.state.field(aiAutoCompleteSuggestionState);
            if (!activeSuggestion) {
                this.decorations = CM.Decoration.none;
                return;
            }
            // Hide AI suggestion while the user is interacting with the traditional
            // autocomplete menu to avoid conflicting suggestions.
            if (CM.completionStatus(update.view.state) === 'pending') {
                this.decorations = CM.Decoration.none;
                return;
            }
            // Hide AI suggestion if the user has selected an item from the
            // traditional autocomplete menu that is not the first one.
            const selectedCompletionIndex = CM.selectedCompletionIndex(update.state);
            if (selectedCompletionIndex && selectedCompletionIndex > 0) {
                this.decorations = CM.Decoration.none;
                return;
            }
            const { head } = update.state.selection.main;
            // Hide AI suggestion if the user moves the cursor to a location
            // before the position from which suggestion was generated.
            if (head < activeSuggestion.from) {
                this.decorations = CM.Decoration.none;
                return;
            }
            const selectedCompletion = CM.selectedCompletion(update.state);
            const additionallyTypedText = update.state.doc.sliceString(activeSuggestion.from, head);
            // The user might have typed text after the suggestion is triggered.
            // If the suggestion no longer starts with the typed text, hide it.
            if (!activeSuggestion.text.startsWith(additionallyTypedText)) {
                this.decorations = CM.Decoration.none;
                return;
            }
            let ghostText = activeSuggestion.text.slice(additionallyTypedText.length);
            if (selectedCompletion) {
                // Do not show AI generated suggestion if top traditional suggestion is of type
                // 'keyword' - `do`, `while` etc.
                if (selectedCompletion.type?.includes('keyword')) {
                    this.decorations = CM.Decoration.none;
                    return;
                }
                // If a traditional autocomplete menu is shown, the AI suggestion is only
                // shown if it builds upon the currently selected item. If there is no
                // overlap, we hide the AI suggestion. For example, for the text `console`
                // if the traditional autocomplete suggests `log` and the AI
                // suggests `warn`, there is no overlap and the AI suggestion is hidden.
                const overlappingText = TextUtils.TextUtils.getOverlap(selectedCompletion.label, ghostText) ?? '';
                const lineAtAiSuggestion = update.state.doc.lineAt(activeSuggestion.from).text;
                const overlapsWithSelectedCompletion = (lineAtAiSuggestion + overlappingText).endsWith(selectedCompletion.label);
                if (!overlapsWithSelectedCompletion) {
                    this.decorations = CM.Decoration.none;
                    return;
                }
            }
            // When `conservativeCompletion` is disabled in Console, the editor shows a ghost
            // text for the first item in the traditional autocomplete menu and this ghost text
            // is reflected in `currentHint`. In this case, we need to remove
            // the overlapping part from our AI suggestion's ghost text to avoid
            // showing a double suggestion.
            const currentMenuHint = update.view.plugin(showCompletionHint)?.currentHint;
            const conservativeCompletionEnabled = update.state.field(conservativeCompletion, false);
            if (!conservativeCompletionEnabled && currentMenuHint) {
                ghostText = ghostText.slice(currentMenuHint.length);
            }
            this.decorations =
                CM.Decoration.set([CM.Decoration.widget({ widget: new CompletionHint(ghostText), side: 1 }).range(head)]);
            this.#registerImpressionIfNeeded(activeSuggestion);
        }
        #registerImpressionIfNeeded(activeSuggestion) {
            if (!activeSuggestion.rpcGlobalId) {
                return;
            }
            if (this.#lastLoggedSuggestion?.rpcGlobalId === activeSuggestion?.rpcGlobalId &&
                this.#lastLoggedSuggestion?.sampleId === activeSuggestion?.sampleId) {
                return;
            }
            const latency = performance.now() - activeSuggestion.startTime;
            // only register impression for the first time AI generated suggestion is shown to the user.
            activeSuggestion.onImpression(activeSuggestion.rpcGlobalId, latency, activeSuggestion.sampleId);
            this.#lastLoggedSuggestion = activeSuggestion;
        }
    }, { decorations: p => p.decorations }),
];
//# sourceMappingURL=config.js.map