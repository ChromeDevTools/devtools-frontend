// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html } from '../../ui/lit/lit.js';
import * as Coverage from '../coverage/coverage.js';
import { Plugin } from './Plugin.js';
// Plugin that shows a gutter with coverage information when available.
const UIStrings = {
    /**
     * @description Text for coverage status bar item in Sources panel.
     */
    clickToShowCoveragePanel: 'Click to show Coverage panel',
    /**
     * @description Text for coverage status bar item in Sources panel.
     */
    showDetails: 'Show details',
    /**
     * @description Text to show in the status bar if coverage data is available.
     * @example {12.3} PH1
     */
    coverageS: 'Coverage: {PH1}',
    /**
     * @description Text to be shown in the status bar if no coverage data is available.
     */
    coverageNa: 'Coverage: N/A',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/CoveragePlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class CoveragePlugin extends Plugin {
    originalSourceCode;
    model;
    coverage;
    #lastToolbarLabel;
    #transformer;
    constructor(uiSourceCode, transformer) {
        super(uiSourceCode);
        this.originalSourceCode = this.uiSourceCode;
        this.#transformer = transformer;
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (mainTarget) {
            this.model = mainTarget.model(Coverage.CoverageModel.CoverageModel);
            if (this.model) {
                this.model.addEventListener(Coverage.CoverageModel.Events.CoverageReset, this.handleReset, this);
                this.coverage = this.model.getCoverageForUrl(this.originalSourceCode.url());
                if (this.coverage) {
                    this.coverage.addEventListener(Coverage.CoverageModel.URLCoverageInfo.Events.SizesChanged, this.handleCoverageSizesChanged, this);
                }
            }
        }
        this.#lastToolbarLabel = this.#toolbarLabel();
    }
    dispose() {
        if (this.coverage) {
            this.coverage.removeEventListener(Coverage.CoverageModel.URLCoverageInfo.Events.SizesChanged, this.handleCoverageSizesChanged, this);
        }
        if (this.model) {
            this.model.removeEventListener(Coverage.CoverageModel.Events.CoverageReset, this.handleReset, this);
        }
    }
    static accepts(uiSourceCode) {
        return uiSourceCode.contentType().isDocumentOrScriptOrStyleSheet();
    }
    handleReset() {
        this.coverage = null;
        this.updateStats();
    }
    handleCoverageSizesChanged() {
        this.updateStats();
    }
    updateStats() {
        const label = this.#toolbarLabel();
        if (label === this.#lastToolbarLabel) {
            return;
        }
        this.#lastToolbarLabel = label;
        this.dispatchEventToListeners("ToolbarItemsChanged" /* Events.TOOLBAR_ITEMS_CHANGED */);
    }
    #toolbarLabel() {
        if (!this.coverage) {
            return i18nString(UIStrings.coverageNa);
        }
        const formatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
            style: 'percent',
            maximumFractionDigits: 1,
        });
        return i18nString(UIStrings.coverageS, { PH1: formatter.format(this.coverage.usedPercentage()) });
    }
    rightToolbarItems() {
        const title = this.coverage ? i18nString(UIStrings.showDetails) : i18nString(UIStrings.clickToShowCoveragePanel);
        // clang-format off
        return [html `<devtools-button
        class="toolbar-button toolbar-button-secondary"
        title=${title}
        aria-label=${title}
        .variant=${"text" /* Buttons.Button.Variant.TEXT */}
        .reducedFocusRing=${true}
        .jslogContext=${'debugger.show-coverage'}
        @click=${() => void UI.ViewManager.ViewManager.instance().showView('coverage')}
      >${this.#toolbarLabel()}</devtools-button>`];
        // clang-format on
    }
    editorExtension() {
        return coverageCompartment.of([]);
    }
    getCoverageManager() {
        return this.uiSourceCode.getDecorationData("coverage" /* Workspace.UISourceCode.DecoratorType.COVERAGE */);
    }
    editorInitialized(editor) {
        if (this.getCoverageManager()) {
            this.startDecoUpdate(editor);
        }
    }
    decorationChanged(type, editor) {
        if (type === "coverage" /* Workspace.UISourceCode.DecoratorType.COVERAGE */) {
            this.startDecoUpdate(editor);
        }
    }
    startDecoUpdate(editor) {
        const manager = this.getCoverageManager();
        void (manager ? manager.usageByLine(this.uiSourceCode, this.#editorLines(editor)) : Promise.resolve([]))
            .then(usageByLine => {
            const enabled = Boolean(editor.state.field(coverageState, false));
            if (!usageByLine.length) {
                if (enabled) {
                    editor.dispatch({ effects: coverageCompartment.reconfigure([]) });
                }
            }
            else if (!enabled) {
                editor.dispatch({
                    effects: coverageCompartment.reconfigure([
                        coverageState.init(state => markersFromCoverageData(usageByLine, state)),
                        coverageGutter(this.uiSourceCode.url()),
                        theme,
                    ]),
                });
            }
            else {
                editor.dispatch({ effects: setCoverageState.of(usageByLine) });
            }
        });
    }
    /**
     * @returns The current lines of the CodeMirror editor expressed in terms of UISourceCode.
     */
    #editorLines(editor) {
        const result = [];
        for (let n = 1; n <= editor.state.doc.lines; ++n) {
            const line = editor.state.doc.line(n);
            // CodeMirror lines are 1-based where-as the transformer expects 0-based.
            const { lineNumber: startLine, columnNumber: startColumn } = this.#transformer.editorLocationToUILocation(n - 1, 0);
            const { lineNumber: endLine, columnNumber: endColumn } = this.#transformer.editorLocationToUILocation(n - 1, line.length);
            result.push(new TextUtils.TextRange.TextRange(startLine, startColumn, endLine, endColumn));
        }
        return result;
    }
}
const coveredMarker = new (class extends CodeMirror.GutterMarker {
    elementClass = 'cm-coverageUsed';
})();
const notCoveredMarker = new (class extends CodeMirror.GutterMarker {
    elementClass = 'cm-coverageUnused';
})();
function markersFromCoverageData(usageByLine, state) {
    const builder = new CodeMirror.RangeSetBuilder();
    for (let line = 0; line < usageByLine.length; line++) {
        const usage = usageByLine[line];
        if (usage !== undefined && line < state.doc.lines) {
            const lineStart = state.doc.line(line + 1).from;
            builder.add(lineStart, lineStart, usage ? coveredMarker : notCoveredMarker);
        }
    }
    return builder.finish();
}
const setCoverageState = CodeMirror.StateEffect.define();
const coverageState = CodeMirror.StateField.define({
    create() {
        return CodeMirror.RangeSet.empty;
    },
    update(markers, tr) {
        return tr.effects.reduce((markers, effect) => {
            return effect.is(setCoverageState) ? markersFromCoverageData(effect.value, tr.state) : markers;
        }, markers.map(tr.changes));
    },
});
function coverageGutter(url) {
    return CodeMirror.gutter({
        markers: view => view.state.field(coverageState),
        domEventHandlers: {
            click() {
                void UI.ViewManager.ViewManager.instance()
                    .showView('coverage')
                    .then(() => {
                    const view = UI.ViewManager.ViewManager.instance().view('coverage');
                    return view?.widget();
                })
                    .then(widget => {
                    const matchFormattedSuffix = url.match(/(.*):formatted$/);
                    const urlWithoutFormattedSuffix = (matchFormattedSuffix?.[1]) || url;
                    widget.selectCoverageItemByUrl(urlWithoutFormattedSuffix);
                });
                return true;
            },
        },
        class: 'cm-coverageGutter',
    });
}
const coverageCompartment = new CodeMirror.Compartment();
const theme = CodeMirror.EditorView.baseTheme({
    '.cm-line::selection': {
        backgroundColor: 'transparent',
        color: 'currentColor',
    },
    '.cm-coverageGutter': {
        width: '5px',
        marginLeft: '3px',
    },
    '.cm-coverageUnused': {
        backgroundColor: 'var(--app-color-coverage-unused)',
    },
    '.cm-coverageUsed': {
        backgroundColor: 'var(--app-color-coverage-used)',
    },
});
//# sourceMappingURL=CoveragePlugin.js.map