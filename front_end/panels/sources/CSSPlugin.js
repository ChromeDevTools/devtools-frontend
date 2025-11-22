// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import { assertNotNullOrUndefined } from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as ColorPicker from '../../ui/legacy/components/color_picker/color_picker.js';
import * as InlineEditor from '../../ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { AddDebugInfoURLDialog } from './AddSourceMapURLDialog.js';
import { Plugin } from './Plugin.js';
// Plugin to add CSS completion, shortcuts, and color/curve swatches
// to editors with CSS content.
const UIStrings = {
    /**
     * @description Swatch icon element title in CSSPlugin of the Sources panel
     */
    openColorPicker: 'Open color picker.',
    /**
     * @description Text to open the cubic bezier editor
     */
    openCubicBezierEditor: 'Open cubic bezier editor.',
    /**
     * @description Text for a context menu item for attaching a sourcemap to the currently open css file
     */
    addSourceMap: 'Add source map…',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/CSSPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const doNotCompleteIn = new Set(['ColorLiteral', 'NumberLiteral', 'StringLiteral', 'Comment', 'Important']);
function findPropertyAt(node, pos) {
    if (doNotCompleteIn.has(node.name)) {
        return null;
    }
    for (let cur = node; cur; cur = cur.parent) {
        if (cur.name === 'StyleSheet' || cur.name === 'Styles' || cur.name === 'CallExpression') {
            break;
        }
        else if (cur.name === 'Declaration') {
            const name = cur.getChild('PropertyName'), colon = cur.getChild(':');
            return name && colon && colon.to <= pos ? name : null;
        }
    }
    return null;
}
function getCurrentStyleSheet(url, cssModel) {
    const currentStyleSheet = cssModel.getStyleSheetIdsForURL(url);
    if (currentStyleSheet.length === 0) {
        throw new Error('Can\'t find style sheet ID for current URL');
    }
    return currentStyleSheet[0];
}
async function specificCssCompletion(cx, uiSourceCode, cssModel) {
    const node = CodeMirror.syntaxTree(cx.state).resolveInner(cx.pos, -1);
    if (node.name === 'ClassName') {
        // Should never happen, but let's code defensively here
        assertNotNullOrUndefined(cssModel);
        const currentStyleSheet = getCurrentStyleSheet(uiSourceCode.url(), cssModel);
        const existingClassNames = await cssModel.getClassNames(currentStyleSheet);
        return {
            from: node.from,
            options: existingClassNames.map(value => ({ type: 'constant', label: value })),
        };
    }
    const property = findPropertyAt(node, cx.pos);
    if (property) {
        const propertyValues = SDK.CSSMetadata.cssMetadata().getPropertyValues(cx.state.sliceDoc(property.from, property.to));
        return {
            from: node.name === 'ValueName' ? node.from : cx.pos,
            options: propertyValues.map(value => ({ type: 'constant', label: value })),
            validFor: /^[\w\P{ASCII}\-]+$/u,
        };
    }
    return null;
}
function findColorsAndCurves(state, from, to, onColor, onCurve) {
    let line = state.doc.lineAt(from);
    function getToken(from, to) {
        if (from >= line.to) {
            line = state.doc.lineAt(from);
        }
        return line.text.slice(from - line.from, to - line.from);
    }
    const tree = CodeMirror.ensureSyntaxTree(state, to, 100);
    if (!tree) {
        return;
    }
    tree.iterate({
        from,
        to,
        enter: node => {
            let content;
            if (node.name === 'ValueName' || node.name === 'ColorLiteral') {
                content = getToken(node.from, node.to);
            }
            else if (node.name === 'Callee' &&
                /^(?:(?:rgba?|hsla?|hwba?|lch|oklch|lab|oklab|color)|cubic-bezier)$/.test(getToken(node.from, node.to))) {
                content = state.sliceDoc(node.from, node.node.parent.to);
            }
            if (content) {
                const parsedColor = Common.Color.parse(content);
                if (parsedColor) {
                    onColor(node.from, parsedColor, content);
                }
                else {
                    const parsedCurve = Geometry.CubicBezier.parse(content);
                    if (parsedCurve) {
                        onCurve(node.from, parsedCurve, content);
                    }
                }
            }
        },
    });
}
class ColorSwatchWidget extends CodeMirror.WidgetType {
    #text;
    #color;
    #from;
    constructor(color, text, from) {
        super();
        this.#color = color;
        this.#text = text;
        this.#from = from;
    }
    eq(other) {
        return this.#color.equal(other.#color) && this.#text === other.#text && this.#from === other.#from;
    }
    toDOM(view) {
        const swatch = new InlineEditor.ColorSwatch.ColorSwatch(i18nString(UIStrings.openColorPicker));
        swatch.renderColor(this.#color);
        const value = swatch.createChild('span');
        value.textContent = this.#text;
        value.setAttribute('hidden', 'true');
        swatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, event => {
            const insert = event.data.color.getAuthoredText() ?? event.data.color.asString();
            view.dispatch({ changes: { from: this.#from, to: this.#from + this.#text.length, insert } });
            this.#text = insert;
            this.#color = swatch.getColor();
        });
        swatch.addEventListener(InlineEditor.ColorSwatch.ColorFormatChangedEvent.eventName, event => {
            const insert = event.data.color.getAuthoredText() ?? event.data.color.asString();
            view.dispatch({ changes: { from: this.#from, to: this.#from + this.#text.length, insert } });
            this.#text = insert;
            this.#color = swatch.getColor();
        });
        swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, event => {
            event.consume(true);
            view.dispatch({
                effects: setTooltip.of({
                    type: 0 /* TooltipType.COLOR */,
                    pos: view.posAtDOM(swatch),
                    text: this.#text,
                    swatch,
                    color: this.#color,
                }),
            });
        });
        return swatch;
    }
    ignoreEvent() {
        return true;
    }
}
class CurveSwatchWidget extends CodeMirror.WidgetType {
    curve;
    text;
    constructor(curve, text) {
        super();
        this.curve = curve;
        this.text = text;
    }
    eq(other) {
        return this.curve.asCSSText() === other.curve.asCSSText() && this.text === other.text;
    }
    toDOM(view) {
        const container = document.createElement('span');
        const bezierText = container.createChild('span');
        const icon = IconButton.Icon.create('bezier-curve-filled', 'bezier-swatch-icon');
        icon.setAttribute('jslog', `${VisualLogging.showStyleEditor('bezier')}`);
        bezierText.append(this.text);
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.openCubicBezierEditor));
        icon.addEventListener('click', (event) => {
            event.consume(true);
            view.dispatch({
                effects: setTooltip.of({
                    type: 1 /* TooltipType.CURVE */,
                    pos: view.posAtDOM(icon),
                    text: this.text,
                    swatch: icon,
                    curve: this.curve,
                }),
            });
        }, false);
        return icon;
    }
    ignoreEvent() {
        return true;
    }
}
function createCSSTooltip(active) {
    return {
        pos: active.pos,
        arrow: false,
        create(view) {
            let text = active.text;
            let widget, addListener;
            if (active.type === 0 /* TooltipType.COLOR */) {
                const spectrum = new ColorPicker.Spectrum.Spectrum();
                addListener = handler => {
                    spectrum.addEventListener("ColorChanged" /* ColorPicker.Spectrum.Events.COLOR_CHANGED */, handler);
                };
                spectrum.addEventListener("SizeChanged" /* ColorPicker.Spectrum.Events.SIZE_CHANGED */, () => view.requestMeasure());
                spectrum.setColor(active.color);
                widget = spectrum;
            }
            else {
                const spectrum = new InlineEditor.BezierEditor.BezierEditor(active.curve);
                widget = spectrum;
                addListener = handler => {
                    spectrum.addEventListener("BezierChanged" /* InlineEditor.BezierEditor.Events.BEZIER_CHANGED */, handler);
                };
            }
            const dom = document.createElement('div');
            dom.className = 'cm-tooltip-swatchEdit';
            widget.markAsRoot();
            widget.show(dom);
            widget.showWidget();
            widget.element.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    event.consume();
                    view.dispatch({
                        effects: setTooltip.of(null),
                        changes: text === active.text ? undefined :
                            { from: active.pos, to: active.pos + text.length, insert: active.text },
                    });
                    widget.hideWidget();
                    view.focus();
                }
            });
            widget.element.addEventListener('focusout', event => {
                if (event.relatedTarget && !widget.element.contains(event.relatedTarget)) {
                    view.dispatch({ effects: setTooltip.of(null) });
                    widget.hideWidget();
                }
            }, false);
            widget.element.addEventListener('mousedown', event => event.consume());
            return {
                dom,
                resize: false,
                offset: { x: -8, y: 0 },
                mount: () => {
                    widget.focus();
                    widget.wasShown();
                    addListener((event) => {
                        view.dispatch({
                            changes: { from: active.pos, to: active.pos + text.length, insert: event.data },
                            annotations: isSwatchEdit.of(true),
                        });
                        text = event.data;
                    });
                },
            };
        },
    };
}
const setTooltip = CodeMirror.StateEffect.define();
const isSwatchEdit = CodeMirror.Annotation.define();
const cssTooltipState = CodeMirror.StateField.define({
    create() {
        return null;
    },
    update(value, tr) {
        if ((tr.docChanged || tr.selection) && !tr.annotation(isSwatchEdit)) {
            value = null;
        }
        for (const effect of tr.effects) {
            if (effect.is(setTooltip)) {
                value = effect.value;
            }
        }
        return value;
    },
    provide: field => CodeMirror.showTooltip.from(field, active => active && createCSSTooltip(active)),
});
function computeSwatchDeco(state, from, to) {
    const builder = new CodeMirror.RangeSetBuilder();
    findColorsAndCurves(state, from, to, (pos, parsedColor, colorText) => {
        builder.add(pos, pos, CodeMirror.Decoration.widget({ widget: new ColorSwatchWidget(parsedColor, colorText, pos) }));
    }, (pos, curve, text) => {
        builder.add(pos, pos, CodeMirror.Decoration.widget({ widget: new CurveSwatchWidget(curve, text) }));
    });
    return builder.finish();
}
const cssSwatchPlugin = CodeMirror.ViewPlugin.fromClass(class {
    decorations;
    constructor(view) {
        this.decorations = computeSwatchDeco(view.state, view.viewport.from, view.viewport.to);
    }
    update(update) {
        if (update.viewportChanged || update.docChanged) {
            this.decorations = computeSwatchDeco(update.state, update.view.viewport.from, update.view.viewport.to);
        }
    }
}, {
    decorations: v => v.decorations,
});
function cssSwatches() {
    return [cssSwatchPlugin, cssTooltipState, theme];
}
function getNumberAt(node) {
    if (node.name === 'Unit') {
        node = node.parent;
    }
    if (node.name === 'NumberLiteral') {
        const lastChild = node.lastChild;
        return { from: node.from, to: lastChild?.name === 'Unit' ? lastChild.from : node.to };
    }
    return null;
}
function modifyUnit(view, by) {
    const { head } = view.state.selection.main;
    const context = CodeMirror.syntaxTree(view.state).resolveInner(head, -1);
    const numberRange = getNumberAt(context) || getNumberAt(context.resolve(head, 1));
    if (!numberRange) {
        return false;
    }
    const currentNumber = Number(view.state.sliceDoc(numberRange.from, numberRange.to));
    if (isNaN(currentNumber)) {
        return false;
    }
    view.dispatch({
        changes: { from: numberRange.from, to: numberRange.to, insert: String(currentNumber + by) },
        scrollIntoView: true,
        userEvent: 'insert.modifyUnit',
    });
    return true;
}
export function cssBindings() {
    // This is an awkward way to pass the argument given to the editor
    // event handler through the ShortcutRegistry calling convention.
    let currentView = null;
    const listener = UI.ShortcutRegistry.ShortcutRegistry.instance().getShortcutListener({
        'sources.increment-css': () => Promise.resolve(modifyUnit(currentView, 1)),
        'sources.increment-css-by-ten': () => Promise.resolve(modifyUnit(currentView, 10)),
        'sources.decrement-css': () => Promise.resolve(modifyUnit(currentView, -1)),
        'sources.decrement-css-by-ten': () => Promise.resolve(modifyUnit(currentView, -10)),
    });
    return CodeMirror.EditorView.domEventHandlers({
        keydown: (event, view) => {
            const prevView = currentView;
            currentView = view;
            listener(event);
            currentView = prevView;
            return event.defaultPrevented;
        },
    });
}
export class CSSPlugin extends Plugin {
    #cssModel;
    constructor(uiSourceCode, _transformer) {
        super(uiSourceCode, _transformer);
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.CSSModel.CSSModel, this);
    }
    static accepts(uiSourceCode) {
        return uiSourceCode.contentType().hasStyleSheets();
    }
    modelAdded(cssModel) {
        if (cssModel.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
            return;
        }
        this.#cssModel = cssModel;
    }
    modelRemoved(cssModel) {
        if (this.#cssModel === cssModel) {
            this.#cssModel = undefined;
        }
    }
    editorExtension() {
        return [cssBindings(), this.#cssCompletion(), cssSwatches()];
    }
    #cssCompletion() {
        const { cssCompletionSource } = CodeMirror.css;
        // CodeMirror binds the function below to the state object.
        // Therefore, we can't access `this` and retrieve the following properties.
        // Instead, retrieve them up front to bind them to the correct closure.
        const uiSourceCode = this.uiSourceCode;
        const cssModel = this.#cssModel;
        return CodeMirror.autocompletion({
            override: [async (cx) => {
                    return await ((await specificCssCompletion(cx, uiSourceCode, cssModel)) || cssCompletionSource(cx));
                }],
        });
    }
    populateTextAreaContextMenu(contextMenu) {
        function addSourceMapURL(cssModel, sourceUrl) {
            const dialog = AddDebugInfoURLDialog.createAddSourceMapURLDialog(sourceMapUrl => {
                Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().modelToInfo.get(cssModel)?.addSourceMap(sourceUrl, sourceMapUrl);
            });
            dialog.show();
        }
        const cssModel = this.#cssModel;
        const url = this.uiSourceCode.url();
        if (this.uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network && cssModel &&
            !Workspace.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(url)) {
            const addSourceMapURLLabel = i18nString(UIStrings.addSourceMap);
            contextMenu.debugSection().appendItem(addSourceMapURLLabel, () => addSourceMapURL(cssModel, url), { jslogContext: 'add-source-map' });
        }
    }
}
const theme = CodeMirror.EditorView.baseTheme({
    '.cm-tooltip.cm-tooltip-swatchEdit': {
        'box-shadow': 'var(--sys-elevation-level2)',
        'background-color': 'var(--sys-color-base-container-elevated)',
        'border-radius': 'var(--sys-shape-corner-extra-small)',
    },
});
//# sourceMappingURL=CSSPlugin.js.map