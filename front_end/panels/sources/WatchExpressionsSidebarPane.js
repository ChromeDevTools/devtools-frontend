// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) IBM Corp. 2009  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of IBM Corp. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Formatter from '../../models/formatter/formatter.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
// eslint-disable-next-line @devtools/es-modules-import
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
import watchExpressionsSidebarPaneStyles from './watchExpressionsSidebarPane.css.js';
const UIStrings = {
    /**
     * @description A context menu item in the watch expressions sidebar of the Sources panel.
     */
    addWatchExpression: 'Add watch expression',
    /**
     * @description Tooltip/screen reader label of a button in the Sources panel that refreshes all watch expressions.
     */
    refreshWatchExpressions: 'Refresh watch expressions',
    /**
     * @description Empty element text content in watch expressions sidebar of the Sources panel.
     */
    noWatchExpressions: 'No watch expressions',
    /**
     * @description A context menu item in the watch expressions sidebar of the Sources panel.
     */
    deleteAllWatchExpressions: 'Delete all watch expressions',
    /**
     * @description A context menu item in the watch expressions sidebar of the Sources panel.
     */
    addPropertyPathToWatch: 'Add property path to watch',
    /**
     * @description A context menu item in the watch expressions sidebar of the Sources panel.
     */
    deleteWatchExpression: 'Delete watch expression',
    /**
     * @description Value element text content in watch expressions sidebar of the Sources panel.
     */
    notAvailable: '<not available>',
    /**
     * @description A context menu item in the watch expressions sidebar of the Sources panel and Network panel request.
     */
    copyValue: 'Copy value',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/WatchExpressionsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let watchExpressionsSidebarPaneInstance;
const { classMap, ifDefined } = Directives;
const { widget } = UI.Widget;
export const DEFAULT_PROMPT_VIEW = (input, _output, target) => {
    const e = input.expression;
    if (!e) {
        render(nothing, target);
        return;
    }
    const stopPropagationIfEditing = (event) => {
        if (e.editing) {
            event.stopPropagation();
        }
    };
    const renderNameElement = () => ObjectUI.ObjectPropertiesSection.renderPropertyName(e.expression, /* isPrivate= */ false, e.expression ?? undefined);
    // clang-format off
    render(html `
        <devtools-prompt
            class=${classMap({
        monospace: true,
        'watch-expression': true,
        'watch-expression-text-prompt-proxy': Boolean(e.editing),
    })}
            value=${e.expression ?? ''}
            ?editing=${Boolean(e.editing)}
            completions=${input.completionsId}
            @commit=${(event) => input.onCommit(event.detail)}
            @cancel=${() => input.onCancel()}
            @beforeautocomplete=${input.onBeforeAutoComplete}
            @mousedown=${stopPropagationIfEditing}
            @click=${stopPropagationIfEditing}
            @dblclick=${stopPropagationIfEditing}>
          <div class=${classMap({
        'watch-expression-header': true,
        'watch-expression-object-header': !e.exceptionDetails && e.result !== undefined &&
            e.result.hasChildren && !e.result.object.customPreview(),
    })}
               @contextmenu=${input.onContextMenu}
               @dblclick=${input.onStartEditing}>
            <div class=${classMap({ 'watch-expression-title': true,
        'tree-element-title': true,
        dimmed: Boolean(e.exceptionDetails) && !e.result })}>
              <devtools-button
                .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        iconName: 'bin',
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        jslogContext: 'delete-watch-expression',
    }}
                class=watch-expression-delete-button
                title=${i18nString(UIStrings.deleteWatchExpression)}
                @click=${input.onDelete}></devtools-button>
              ${renderNameElement()}
              <span class=watch-expressions-separator>: </span>
              ${e.exceptionDetails || !e.result
        ? html `<span
                    class="watch-expression-error value"
                    title=${ifDefined(e.exceptionDetails?.exception?.description)}
                    >${i18nString(UIStrings.notAvailable)}</span>`
        : ObjectUI.ObjectPropertiesSection.renderPropertyValue(e.result.object, Boolean(e.exceptionDetails), false /* showPreview */, input.linkifier, false /* isSyntheticProperty */, undefined /* variableName */, undefined /* includeNullOrUndefined */, /* useCustomPreview */ true)}
            </div>
          </div>
          ${e.editing ? html `
            <datalist id=${input.completionsId}>
              ${input.completions.map(c => html `<option>${c}</option>`)}
            </datalist>
          ` : nothing}
        </devtools-prompt>
      `, target);
    // clang-format on
};
export class WatchExpressionPromptWidget extends UI.Widget.Widget {
    #expression;
    #linkifier;
    #completions = [];
    #completionsId = '';
    #view;
    onCommit;
    onCancel;
    onStartEditing;
    onDelete;
    onContextMenu;
    set expression(expression) {
        if (this.#expression !== expression) {
            this.#completions = [];
            this.#expression = expression;
        }
        this.requestUpdate();
    }
    get expression() {
        return this.#expression;
    }
    set linkifier(linkifier) {
        if (this.#linkifier === linkifier) {
            return;
        }
        this.#linkifier = linkifier;
        this.requestUpdate();
    }
    get linkifier() {
        return this.#linkifier;
    }
    set completionsId(completionsId) {
        if (this.#completionsId === completionsId) {
            return;
        }
        this.#completionsId = completionsId;
        this.requestUpdate();
    }
    get completionsId() {
        return this.#completionsId;
    }
    constructor(element, view = DEFAULT_PROMPT_VIEW) {
        super(element);
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    wasHidden() {
        super.wasHidden();
        this.#completions = [];
    }
    #handleBeforeAutoComplete = async (event) => {
        const suggestions = await TextEditor.JavaScript.completeInContext(event.detail.expression, event.detail.filter, event.detail.force);
        this.#completions = suggestions.map(v => v.text);
        this.requestUpdate();
    };
    performUpdate() {
        if (!this.#expression?.editing) {
            this.#completions = [];
        }
        const viewInput = {
            expression: this.#expression,
            linkifier: this.#linkifier,
            completionsId: this.#completionsId,
            completions: this.#completions,
            onCommit: (detail) => {
                this.#completions = [];
                this.requestUpdate();
                this.onCommit?.(detail);
            },
            onCancel: () => {
                this.#completions = [];
                this.requestUpdate();
                this.onCancel?.();
            },
            onBeforeAutoComplete: (event) => {
                void this.#handleBeforeAutoComplete(event);
            },
            onStartEditing: () => this.onStartEditing?.(),
            onDelete: () => this.onDelete?.(),
            onContextMenu: (event) => this.onContextMenu?.(event),
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
export const DEFAULT_VIEW = (input, output, target) => {
    const onContextMenu = (watchExpression, event) => {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const isEditing = input.watchExpressions.some(e => e.editing);
        if (!isEditing) {
            contextMenu.debugSection().appendItem(i18nString(UIStrings.addWatchExpression), input.onAddExpression, { jslogContext: 'add-watch-expression' });
        }
        if (input.watchExpressions.length > 1) {
            contextMenu.debugSection().appendItem(i18nString(UIStrings.deleteAllWatchExpressions), input.onDeleteAll, { jslogContext: 'delete-all-watch-expressions' });
        }
        if (watchExpression) {
            if (!watchExpression.editing) {
                contextMenu.editSection().appendItem(i18nString(UIStrings.deleteWatchExpression), () => input.onDelete(watchExpression), { jslogContext: 'delete-watch-expression' });
            }
            if (!watchExpression.editing && watchExpression.result &&
                (watchExpression.result.object.type === 'number' || watchExpression.result.object.type === 'string')) {
                contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyValue), () => input.onCopyWatchExpression(watchExpression), { jslogContext: 'copy-watch-expression-value' });
            }
            contextMenu.appendApplicableItems(watchExpression.result);
        }
        void contextMenu.show();
        event.consume();
    };
    const onExpressionKeydown = (expression, event) => {
        if (event.key === 'Enter' && !expression.editing) {
            event.consume(true);
            input.onStartEditing(expression);
        }
        else if (event.key === 'Delete' && !expression.editing) {
            event.consume(true);
            input.onDelete(expression);
        }
    };
    const renderTreeElement = (e) => {
        const completionsId = `watch-expression-completions-${input.watchExpressions.indexOf(e)}`;
        // clang-format off
        return html `<li
          class=${classMap({ 'watch-expression-tree-item': true, 'watch-expression-editing': e.editing })}
          @keydown=${onExpressionKeydown.bind(undefined, e)}
          @expand=${(event) => input.onExpand(e, event.detail.expanded)}
          role=treeitem>
            <devtools-widget ${widget(WatchExpressionPromptWidget, {
            expression: e,
            linkifier: input.linkifier,
            completionsId,
            onCommit: (detail) => input.onFinishEditing(e, detail),
            onCancel: () => input.onFinishEditing(e, null),
            onStartEditing: () => input.onStartEditing(e),
            onDelete: () => input.onDelete(e),
            onContextMenu: (event) => onContextMenu(e, event),
        })}></devtools-widget>
        ${e.editing || !e.result || e.exceptionDetails ||
            !e.result.hasChildren || e.result.object.customPreview() ? nothing : html `
          <ul role=group>
            ${ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.createPropertyNodes(e.result.children ?? {}, false /* skipProto */, false /* skipGettersAndSetters */, input.linkifier).map(node => html `<devtools-tree-wrapper .treeElement=${node}></devtools-tree-wrapper>`)}
          </ul>`}
      </li>`;
        // clang-format on
    };
    render(
    // clang-format off
    html `
      ${input.watchExpressions.length === 0
        ? html `<div class=gray-info-message tabindex=-1 >
        ${i18nString(UIStrings.noWatchExpressions)}
        </div>`
        : html `<devtools-tree autofocus hide-overflow show-selection-on-keyboard-focus toggle-on-click .template=${html `
        <ul role=tree class="source-code object-properties-section">
          <style>${ObjectUI.ObjectPropertiesSection.objectValueStyles}</style>
          <style>${ObjectUI.ObjectPropertiesSection.objectPropertiesSectionStyles}</style>
          <style>${watchExpressionsSidebarPaneStyles}</style>
          ${input.watchExpressions.map(renderTreeElement)}
        </ul>`}>
      </devtools-tree>`}`, 
    // clang-format on
    target, {
        container: {
            classes: ['watch-expressions'],
            attributes: {
                jslog: `${VisualLogging.section('sources.watch')}`,
                'aria-label': i18nString(UIStrings.addWatchExpression),
            },
            listeners: { contextmenu: onContextMenu.bind(undefined, undefined) },
        },
    });
};
export class WatchExpressionsSidebarPane extends UI.Widget.VBox {
    #watchExpressions;
    #watchExpressionsSetting;
    linkifier;
    #view;
    #expansionTrackers = new Map();
    constructor() {
        super({ useShadowDom: true });
        this.registerRequiredCSS(watchExpressionsSidebarPaneStyles, objectValueStyles);
        this.#watchExpressions = [];
        this.#watchExpressionsSetting =
            Common.Settings.Settings.instance().createLocalSetting('watch-expressions', []);
        UI.Context.Context.instance().addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.#refreshExpressions, this);
        UI.Context.Context.instance().addFlavorChangeListener(StackTrace.StackTrace.DebuggableFrameFlavor, this.#refreshExpressions, this);
        this.linkifier = new Components.Linkifier.Linkifier();
        this.#view = DEFAULT_VIEW;
        void this.#refreshExpressions();
    }
    static instance() {
        if (!watchExpressionsSidebarPaneInstance) {
            watchExpressionsSidebarPaneInstance = new WatchExpressionsSidebarPane();
        }
        return watchExpressionsSidebarPaneInstance;
    }
    get watchExpressions() {
        return this.#watchExpressions;
    }
    toolbarItems() {
        // clang-format off
        return html `
      <devtools-button .data=${{
            variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
            iconName: 'plus',
            size: "SMALL" /* Buttons.Button.Size.SMALL */,
            title: i18nString(UIStrings.addWatchExpression),
            jslogContext: 'add-watch-expression',
        }}
        @click=${(e) => this.addButtonClicked(e)}></devtools-button>
      <devtools-button .data=${{
            variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
            iconName: 'refresh',
            size: "SMALL" /* Buttons.Button.Size.SMALL */,
            title: i18nString(UIStrings.refreshWatchExpressions),
            jslogContext: 'refresh-watch-expressions',
        }}
        @click=${(e) => this.refreshButtonClicked(e)}></devtools-button>
    `;
        // clang-format on
    }
    saveExpressions() {
        const toSave = [];
        for (let i = 0; i < this.#watchExpressions.length; i++) {
            const expression = this.#watchExpressions[i].expression;
            if (expression) {
                toSave.push(expression);
            }
        }
        this.#watchExpressionsSetting.set(toSave);
    }
    async addButtonClicked(event) {
        event?.consume(true);
        await UI.ViewManager.ViewManager.instance().showView('sources.watch');
        const watchExpression = new WatchExpression();
        this.#watchExpressions.push(watchExpression);
        watchExpression.editing = true;
        this.requestUpdate();
    }
    refreshButtonClicked(event) {
        event.consume(true);
        void this.#refreshExpressions();
    }
    async #refreshExpressions() {
        this.linkifier.reset();
        this.#watchExpressions = [];
        const watchExpressionStrings = this.#watchExpressionsSetting.get();
        const oldExpansionTrackers = this.#expansionTrackers;
        this.#expansionTrackers = new Map();
        const promises = [];
        for (let i = 0; i < watchExpressionStrings.length; ++i) {
            const expression = watchExpressionStrings[i];
            if (!expression) {
                continue;
            }
            const tracker = oldExpansionTrackers.get(expression);
            if (tracker) {
                this.#expansionTrackers.set(expression, tracker);
            }
            const watchExpression = new WatchExpression();
            this.#watchExpressions.push(watchExpression);
            promises.push(watchExpression.setExpression(expression, this.#getExpansionTracker(expression)));
        }
        await Promise.all(promises);
        this.requestUpdate();
    }
    async performUpdate() {
        this.#view({
            watchExpressions: this.watchExpressions,
            linkifier: this.linkifier,
            onDeleteAll: this.#onDeleteAll.bind(this),
            onAddExpression: this.addButtonClicked.bind(this),
            onCopyWatchExpression: watchExpression => {
                if (watchExpression.result?.object.description) {
                    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(watchExpression.result.object.description);
                }
            },
            onFinishEditing: async (watchExpression, expression) => {
                if (!watchExpression.editing) {
                    return;
                }
                watchExpression.editing = false;
                this.requestUpdate();
                if (expression === '' || (expression === null && !watchExpression.expression)) {
                    Platform.ArrayUtilities.removeElement(this.#watchExpressions, watchExpression);
                }
                else if (expression) {
                    if (watchExpression.expression && watchExpression.expression !== expression) {
                        this.#getExpansionTracker(watchExpression.expression).clear();
                        this.#getExpansionTracker(expression).clear();
                    }
                    await watchExpression.setExpression(expression, this.#getExpansionTracker(expression));
                }
                this.saveExpressions();
                this.requestUpdate();
            },
            onStartEditing: (watchExpression) => {
                watchExpression.editing = true;
                this.requestUpdate();
            },
            onDelete: (watchExpression) => {
                Platform.ArrayUtilities.removeElement(this.#watchExpressions, watchExpression);
                this.saveExpressions();
                this.requestUpdate();
            },
            onExpand: async (e, expanded) => {
                if (expanded) {
                    await e.result?.populateChildrenIfNeeded();
                    this.requestUpdate();
                }
            },
        }, {}, this.contentElement);
    }
    #getExpansionTracker(expression) {
        if (expression === null) {
            return new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
        }
        let expansionTracker = this.#expansionTrackers.get(expression);
        if (!expansionTracker) {
            expansionTracker = new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
            this.#expansionTrackers.set(expression, expansionTracker);
        }
        return expansionTracker;
    }
    #onDeleteAll() {
        this.#watchExpressions = [];
        this.saveExpressions();
        void this.#refreshExpressions();
    }
    async #focusAndAddExpressionToWatch(expression) {
        await UI.ViewManager.ViewManager.instance().showView('sources.watch');
        const watchExpression = new WatchExpression();
        await watchExpression.setExpression(expression, this.#getExpansionTracker(expression));
        this.watchExpressions.push(watchExpression);
        this.saveExpressions();
        await this.#refreshExpressions();
    }
    handleAction(_context, _actionId) {
        const frame = UI.Context.Context.instance().flavor(UISourceCodeFrame);
        if (!frame) {
            return false;
        }
        const { state } = frame.textEditor;
        const text = state.sliceDoc(state.selection.main.from, state.selection.main.to);
        void this.#focusAndAddExpressionToWatch(text);
        return true;
    }
    appendApplicableItems(_event, contextMenu, target) {
        if (target instanceof ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement) {
            if (!target.property.property.synthetic) {
                contextMenu.debugSection().appendItem(i18nString(UIStrings.addPropertyPathToWatch), () => this.#focusAndAddExpressionToWatch(target.path()), { jslogContext: 'add-property-path-to-watch' });
            }
            return;
        }
        if (target.textEditor.state.selection.main.empty) {
            return;
        }
        contextMenu.debugSection().appendAction('sources.add-to-watch');
    }
}
export class WatchExpression {
    editing = false;
    #exceptionDetails = undefined;
    #result = undefined;
    #expression = null;
    get exceptionDetails() {
        return this.#exceptionDetails;
    }
    get result() {
        return this.#result;
    }
    get expression() {
        return this.#expression;
    }
    async setExpression(expression, expandController) {
        this.#exceptionDetails = this.#result = undefined;
        this.#expression = expression;
        const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
        if (!expression || !executionContext) {
            return;
        }
        const callFrame = executionContext.debuggerModel.selectedCallFrame();
        if (callFrame?.script.isJavaScript()) {
            const nameMap = await SourceMapScopes.NamesResolver.allVariablesInCallFrame(callFrame, Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance());
            try {
                expression =
                    await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(expression, nameMap);
            }
            catch {
            }
        }
        try {
            const result = await executionContext.evaluate({
                expression,
                objectGroup: WatchExpression.watchObjectGroupId,
                includeCommandLineAPI: false,
                silent: true,
                returnByValue: false,
                generatePreview: false,
            }, 
            /* userGesture */ false, 
            /* awaitPromise */ false);
            if ('object' in result) {
                const objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(result.object, {
                    readOnly: true,
                    propertiesMode: 1 /* ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */,
                    expansionTracker: expandController,
                });
                await expandController.apply(objectTree);
                this.#result = objectTree;
                this.#exceptionDetails = result.exceptionDetails;
            }
        }
        catch {
        }
    }
    static watchObjectGroupId = 'watch-group';
}
//# sourceMappingURL=WatchExpressionsSidebarPane.js.map