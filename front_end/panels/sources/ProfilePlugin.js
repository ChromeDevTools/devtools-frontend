// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import { Plugin } from './Plugin.js';
// Defines plugins that show profiling information in the editor
// gutter when available.
const UIStrings = {
    /**
     * @description The milisecond unit
     */
    ms: 'ms',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/ProfilePlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
class PerformanceMarker extends CodeMirror.GutterMarker {
    value;
    constructor(value) {
        super();
        this.value = value;
    }
    eq(other) {
        return this.value === other.value;
    }
    toDOM() {
        const element = document.createElement('div');
        element.className = 'cm-profileMarker';
        const intensity = Platform.NumberUtilities.clamp(Math.log10(1 + 10 * this.value) / 5, 0.02, 1);
        element.textContent = this.value.toFixed(1);
        element.style.backgroundColor = `hsla(44, 100%, 50%, ${intensity.toFixed(3)})`;
        const span = document.createElement('span');
        span.className = 'cm-units';
        span.textContent = i18nString(UIStrings.ms);
        element.appendChild(span);
        return element;
    }
}
function markersFromProfileData(map, state) {
    const markers = [];
    const aggregatedByLine = new Map();
    for (const [line, value] of map) {
        if (line <= state.doc.lines) {
            for (const [, data] of value) {
                aggregatedByLine.set(line, (aggregatedByLine.get(line) || 0) + data);
            }
        }
    }
    for (const [line, value] of aggregatedByLine) {
        const { from } = state.doc.line(line);
        markers.push(new PerformanceMarker(value).range(from));
    }
    return CodeMirror.RangeSet.of(markers, true);
}
export class PerformanceProfilePlugin extends Plugin {
    updateEffect = CodeMirror.StateEffect.define();
    field;
    gutter;
    compartment = new CodeMirror.Compartment();
    #transformer;
    constructor(uiSourceCode, transformer) {
        super(uiSourceCode);
        this.field = CodeMirror.StateField.define({
            create() {
                return CodeMirror.RangeSet.empty;
            },
            update: (markers, tr) => {
                return tr.effects.reduce((markers, effect) => {
                    return effect.is(this.updateEffect) ? markersFromProfileData(effect.value, tr.state) : markers;
                }, markers.map(tr.changes));
            },
        });
        this.gutter = CodeMirror.gutter({
            markers: view => view.state.field(this.field),
            class: `cm-${"performance" /* Workspace.UISourceCode.DecoratorType.PERFORMANCE */}Gutter`,
        });
        this.#transformer = transformer;
    }
    static accepts(uiSourceCode) {
        return uiSourceCode.contentType().hasScripts();
    }
    getLineMap() {
        const uiSourceCodeProfileMap = this.uiSourceCode.getDecorationData("performance" /* Workspace.UISourceCode.DecoratorType.PERFORMANCE */);
        if (!uiSourceCodeProfileMap) {
            return undefined;
        }
        return Workspace.UISourceCode.createMappedProfileData(uiSourceCodeProfileMap, (line, column) => {
            const editorLocation = this.#transformer.uiLocationToEditorLocation(line, column);
            return [editorLocation.lineNumber, editorLocation.columnNumber];
        });
    }
    editorExtension() {
        const map = this.getLineMap();
        return this.compartment.of(!map ? [] : [this.field.init(state => markersFromProfileData(map, state)), this.gutter, theme]);
    }
    decorationChanged(type, editor) {
        const installed = Boolean(editor.state.field(this.field, false));
        const map = this.getLineMap();
        if (!map) {
            if (installed) {
                editor.dispatch({ effects: this.compartment.reconfigure([]) });
            }
        }
        else if (!installed) {
            editor.dispatch({
                effects: this.compartment.reconfigure([this.field.init(state => markersFromProfileData(map, state)), this.gutter, theme]),
            });
        }
        else {
            editor.dispatch({ effects: this.updateEffect.of(map) });
        }
    }
}
const theme = CodeMirror.EditorView.baseTheme({
    '.cm-line::selection': {
        backgroundColor: 'transparent',
        color: 'currentColor',
    },
    '.cm-performanceGutter': {
        width: '60px',
        backgroundColor: 'var(--sys-color-cdt-base-container)',
        marginLeft: '3px',
    },
    '.cm-profileMarker': {
        textAlign: 'right',
        paddingRight: '3px',
    },
    '.cm-profileMarker .cm-units': {
        color: 'var(--sys-color-token-subtle)',
        fontSize: '75%',
        marginLeft: '3px',
    },
});
//# sourceMappingURL=ProfilePlugin.js.map