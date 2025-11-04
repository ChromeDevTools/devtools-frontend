// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';
import * as UI from '../../legacy/legacy.js';
import * as ThemeSupport from '../../legacy/theme_support/theme_support.js';
import * as CodeHighlighter from '../code_highlighter/code_highlighter.js';
import { baseConfiguration, dummyDarkTheme, dynamicSetting, DynamicSetting, themeSelection } from './config.js';
import { toLineColumn, toOffset } from './position.js';
export class TextEditor extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #activeEditor = undefined;
    #dynamicSettings = DynamicSetting.none;
    #activeSettingListeners = [];
    #pendingState;
    #lastScrollSnapshot;
    #resizeTimeout = -1;
    #resizeListener = () => {
        if (this.#resizeTimeout < 0) {
            this.#resizeTimeout = window.setTimeout(() => {
                this.#resizeTimeout = -1;
                if (this.#activeEditor) {
                    CodeMirror.repositionTooltips(this.#activeEditor);
                }
            }, 50);
        }
    };
    #devtoolsResizeObserver = new ResizeObserver(this.#resizeListener);
    constructor(pendingState) {
        super();
        this.#pendingState = pendingState;
        this.#shadow.createChild('style').textContent = CodeHighlighter.codeHighlighterStyles;
    }
    #createEditor() {
        this.#activeEditor = new CodeMirror.EditorView({
            state: this.state,
            parent: this.#shadow,
            root: this.#shadow,
            dispatch: (tr, view) => {
                view.update([tr]);
                this.#maybeDispatchInput(tr);
                if (tr.reconfigured) {
                    this.#ensureSettingListeners();
                }
            },
            scrollTo: this.#lastScrollSnapshot,
        });
        this.#activeEditor.scrollDOM.addEventListener('scroll', () => {
            if (!this.#activeEditor) {
                return;
            }
            this.#lastScrollSnapshot = this.#activeEditor.scrollSnapshot();
            this.scrollEventHandledToSaveScrollPositionForTest();
        });
        this.#ensureSettingListeners();
        this.#startObservingResize();
        ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
            const currentTheme = ThemeSupport.ThemeSupport.instance().themeName() === 'dark' ? dummyDarkTheme : [];
            this.editor.dispatch({
                effects: themeSelection.reconfigure(currentTheme),
            });
        });
        return this.#activeEditor;
    }
    get editor() {
        return this.#activeEditor || this.#createEditor();
    }
    dispatch(spec) {
        return this.editor.dispatch(spec);
    }
    get state() {
        if (this.#activeEditor) {
            return this.#activeEditor.state;
        }
        if (!this.#pendingState) {
            this.#pendingState = CodeMirror.EditorState.create({ extensions: baseConfiguration('') });
        }
        return this.#pendingState;
    }
    set state(state) {
        if (this.#pendingState === state) {
            return;
        }
        this.#pendingState = state;
        if (this.#activeEditor) {
            this.#activeEditor.setState(state);
            this.#ensureSettingListeners();
        }
    }
    scrollEventHandledToSaveScrollPositionForTest() {
    }
    connectedCallback() {
        if (!this.#activeEditor) {
            this.#createEditor();
        }
        else {
            this.#activeEditor.dispatch({ effects: this.#lastScrollSnapshot });
        }
    }
    disconnectedCallback() {
        if (this.#activeEditor) {
            this.#activeEditor.dispatch({ effects: clearHighlightedLine.of(null) });
            this.#pendingState = this.#activeEditor.state;
            this.#devtoolsResizeObserver.disconnect();
            window.removeEventListener('resize', this.#resizeListener);
            this.#activeEditor.destroy();
            this.#activeEditor = undefined;
            this.#ensureSettingListeners();
        }
    }
    focus() {
        if (this.#activeEditor) {
            this.#activeEditor.focus();
        }
    }
    #ensureSettingListeners() {
        const dynamicSettings = this.#activeEditor ?
            this.#activeEditor.state.facet(dynamicSetting) :
            DynamicSetting.none;
        if (dynamicSettings === this.#dynamicSettings) {
            return;
        }
        this.#dynamicSettings = dynamicSettings;
        for (const [setting, listener] of this.#activeSettingListeners) {
            setting.removeChangeListener(listener);
        }
        this.#activeSettingListeners = [];
        for (const dynamicSetting of dynamicSettings) {
            const handler = ({ data }) => {
                const change = dynamicSetting.sync(this.state, data);
                if (change && this.#activeEditor) {
                    this.#activeEditor.dispatch({ effects: change });
                }
            };
            const setting = Common.Settings.Settings.instance().moduleSetting(dynamicSetting.settingName);
            setting.addChangeListener(handler);
            this.#activeSettingListeners.push([setting, handler]);
        }
    }
    #startObservingResize() {
        const devtoolsElement = UI.UIUtils.getDevToolsBoundingElement();
        if (devtoolsElement) {
            this.#devtoolsResizeObserver.observe(devtoolsElement);
        }
        window.addEventListener('resize', this.#resizeListener);
    }
    #maybeDispatchInput(transaction) {
        const userEvent = transaction.annotation(CodeMirror.Transaction.userEvent);
        const inputType = userEvent ? CODE_MIRROR_USER_EVENT_TO_INPUT_EVENT_TYPE.get(userEvent) : null;
        if (inputType) {
            this.dispatchEvent(new InputEvent('input', { inputType }));
        }
    }
    revealPosition(selection, highlight = true) {
        const view = this.#activeEditor;
        if (!view) {
            return;
        }
        const line = view.state.doc.lineAt(selection.main.head);
        const effects = [];
        if (highlight) {
            // Lazily register the highlight line state.
            if (!view.state.field(highlightedLineState, false)) {
                view.dispatch({ effects: CodeMirror.StateEffect.appendConfig.of(highlightedLineState) });
            }
            else {
                // Always clear the previous highlight line first. This cannot be done
                // in combination with the other effects, as it wouldn't restart the CSS
                // highlight line animation.
                view.dispatch({ effects: clearHighlightedLine.of(null) });
            }
            // Here we finally start the actual highlight line effects.
            effects.push(setHighlightedLine.of(line.from));
        }
        const editorRect = view.scrollDOM.getBoundingClientRect();
        const targetPos = view.coordsAtPos(selection.main.head);
        if (!selection.main.empty) {
            // If the caller provided an actual range, we use the default 'nearest' on both axis.
            // Otherwise we 'center' on an axis to provide more context around the single point.
            effects.push(CodeMirror.EditorView.scrollIntoView(selection.main));
        }
        else if (!targetPos || targetPos.top < editorRect.top || targetPos.bottom > editorRect.bottom) {
            effects.push(CodeMirror.EditorView.scrollIntoView(selection.main, { y: 'center' }));
        }
        else if (targetPos.left < editorRect.left || targetPos.right > editorRect.right) {
            effects.push(CodeMirror.EditorView.scrollIntoView(selection.main, { x: 'center' }));
        }
        view.dispatch({
            selection,
            effects,
            userEvent: 'select.reveal',
        });
    }
    createSelection(head, anchor) {
        const { doc } = this.state;
        const headPos = toOffset(doc, head);
        return CodeMirror.EditorSelection.single(anchor ? toOffset(doc, anchor) : headPos, headPos);
    }
    toLineColumn(pos) {
        return toLineColumn(this.state.doc, pos);
    }
    toOffset(pos) {
        return toOffset(this.state.doc, pos);
    }
}
customElements.define('devtools-text-editor', TextEditor);
// Line highlighting
const clearHighlightedLine = CodeMirror.StateEffect.define();
const setHighlightedLine = CodeMirror.StateEffect.define();
const highlightedLineState = CodeMirror.StateField.define({
    create: () => CodeMirror.Decoration.none,
    update(value, tr) {
        if (!tr.changes.empty && value.size) {
            value = value.map(tr.changes);
        }
        for (const effect of tr.effects) {
            if (effect.is(clearHighlightedLine)) {
                value = CodeMirror.Decoration.none;
            }
            else if (effect.is(setHighlightedLine)) {
                value = CodeMirror.Decoration.set([
                    CodeMirror.Decoration.line({ attributes: { class: 'cm-highlightedLine' } }).range(effect.value),
                ]);
            }
        }
        return value;
    },
    provide: field => CodeMirror.EditorView.decorations.from(field, value => value),
});
const CODE_MIRROR_USER_EVENT_TO_INPUT_EVENT_TYPE = new Map([
    ['input.type', 'insertText'],
    ['input.type.compose', 'insertCompositionText'],
    ['input.paste', 'insertFromPaste'],
    ['input.drop', 'insertFromDrop'],
    ['input.complete', 'insertReplacementText'],
    ['delete.selection', 'deleteContent'],
    ['delete.forward', 'deleteContentForward'],
    ['delete.backward', 'deleteContentBackward'],
    ['delete.cut', 'deleteByCut'],
    ['move.drop', 'deleteByDrag'],
    ['undo', 'historyUndo'],
    ['redo', 'historyRedo'],
]);
//# sourceMappingURL=TextEditor.js.map