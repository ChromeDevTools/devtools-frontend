// Copyright 2021 The Chromium Authors. All rights reserved.
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
import type * as Protocol from '../../generated/protocol.js';
import * as Formatter from '../../models/formatter/formatter.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
// eslint-disable-next-line rulesdir/es_modules_import
import objectValueStyles from '../../ui/legacy/components/object_ui/objectValue.css.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {UISourceCodeFrame} from './UISourceCodeFrame.js';
import watchExpressionsSidebarPaneStyles from './watchExpressionsSidebarPane.css.js';

const UIStrings = {
  /**
   *@description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel
   */
  addWatchExpression: 'Add watch expression',
  /**
   *@description Tooltip/screen reader label of a button in the Sources panel that refreshes all watch expressions.
   */
  refreshWatchExpressions: 'Refresh watch expressions',
  /**
   *@description Empty element text content in Watch Expressions Sidebar Pane of the Sources panel
   */
  noWatchExpressions: 'No watch expressions',
  /**
   *@description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel
   */
  deleteAllWatchExpressions: 'Delete all watch expressions',
  /**
   *@description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel
   */
  addPropertyPathToWatch: 'Add property path to watch',
  /**
   *@description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel
   */
  deleteWatchExpression: 'Delete watch expression',
  /**
   *@description Value element text content in Watch Expressions Sidebar Pane of the Sources panel
   */
  notAvailable: '<not available>',
  /**
   *@description A context menu item in the Watch Expressions Sidebar Pane of the Sources panel and Network pane request.
   */
  copyValue: 'Copy value',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/WatchExpressionsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let watchExpressionsSidebarPaneInstance: WatchExpressionsSidebarPane;

export class WatchExpressionsSidebarPane extends UI.ThrottledWidget.ThrottledWidget implements
    UI.ActionRegistration.ActionDelegate, UI.Toolbar.ItemsProvider,
    UI.ContextMenu.Provider<ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement|UISourceCodeFrame> {
  private watchExpressions: WatchExpression[];
  private emptyElement!: HTMLElement;
  private readonly watchExpressionsSetting: Common.Settings.Setting<string[]>;
  private readonly addButton: UI.Toolbar.ToolbarButton;
  private readonly refreshButton: UI.Toolbar.ToolbarButton;
  private readonly treeOutline: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline;
  private readonly expandController: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController;
  private readonly linkifier: Components.Linkifier.Linkifier;
  private constructor() {
    super(true);

    // TODO(szuend): Replace with a Set once the web test
    // panels/sources/debugger-ui/watch-expressions-preserve-expansion.js is either converted
    // to an e2e test or no longer accesses this variable directly.
    this.watchExpressions = [];
    this.watchExpressionsSetting =
        Common.Settings.Settings.instance().createLocalSetting<string[]>('watch-expressions', []);

    this.addButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.addWatchExpression), 'plus', undefined, 'add-watch-expression');
    this.addButton.setSize(Buttons.Button.Size.SMALL);
    this.addButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, _event => {
      void this.addButtonClicked();
    });
    this.refreshButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.refreshWatchExpressions), 'refresh', undefined, 'refresh-watch-expressions');
    this.refreshButton.setSize(Buttons.Button.Size.SMALL);
    this.refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.update, this);

    this.contentElement.classList.add('watch-expressions');
    this.contentElement.setAttribute('jslog', `${VisualLogging.section('sources.watch')}`);
    this.contentElement.addEventListener('contextmenu', this.contextMenu.bind(this), false);
    this.treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline();
    this.treeOutline.hideOverflow();

    this.treeOutline.setShowSelectionOnKeyboardFocus(/* show */ true);
    this.expandController =
        new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(this.treeOutline);

    UI.Context.Context.instance().addFlavorChangeListener(SDK.RuntimeModel.ExecutionContext, this.update, this);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DebuggerModel.CallFrame, this.update, this);
    this.linkifier = new Components.Linkifier.Linkifier();
    this.update();
  }

  static instance(): WatchExpressionsSidebarPane {
    if (!watchExpressionsSidebarPaneInstance) {
      watchExpressionsSidebarPaneInstance = new WatchExpressionsSidebarPane();
    }
    return watchExpressionsSidebarPaneInstance;
  }

  toolbarItems(): UI.Toolbar.ToolbarItem[] {
    return [this.addButton, this.refreshButton];
  }

  override focus(): void {
    if (this.hasFocus()) {
      return;
    }
    if (this.watchExpressions.length > 0) {
      this.treeOutline.forceSelect();
    }
  }

  hasExpressions(): boolean {
    return Boolean(this.watchExpressionsSetting.get().length);
  }

  private saveExpressions(): void {
    const toSave = [];
    for (let i = 0; i < this.watchExpressions.length; i++) {
      const expression = this.watchExpressions[i].expression();
      if (expression) {
        toSave.push(expression);
      }
    }

    this.watchExpressionsSetting.set(toSave);
  }

  private async addButtonClicked(): Promise<void> {
    await UI.ViewManager.ViewManager.instance().showView('sources.watch');
    this.emptyElement.classList.add('hidden');
    this.createWatchExpression(null).startEditing();
  }

  override async doUpdate(): Promise<void> {
    this.linkifier.reset();
    this.contentElement.removeChildren();
    this.treeOutline.removeChildren();
    this.watchExpressions = [];
    this.emptyElement = (this.contentElement.createChild('div', 'gray-info-message') as HTMLElement);
    this.emptyElement.textContent = i18nString(UIStrings.noWatchExpressions);
    this.emptyElement.tabIndex = -1;
    const watchExpressionStrings = this.watchExpressionsSetting.get();
    if (watchExpressionStrings.length) {
      this.emptyElement.classList.add('hidden');
    }
    for (let i = 0; i < watchExpressionStrings.length; ++i) {
      const expression = watchExpressionStrings[i];
      if (!expression) {
        continue;
      }

      this.createWatchExpression(expression);
    }
  }

  private createWatchExpression(expression: string|null): WatchExpression {
    this.contentElement.appendChild(this.treeOutline.element);
    const watchExpression = new WatchExpression(expression, this.expandController, this.linkifier);
    UI.ARIAUtils.setLabel(this.contentElement, i18nString(UIStrings.addWatchExpression));
    watchExpression.addEventListener(Events.EXPRESSION_UPDATED, this.watchExpressionUpdated, this);
    this.treeOutline.appendChild(watchExpression.treeElement());
    this.watchExpressions.push(watchExpression);
    return watchExpression;
  }

  private watchExpressionUpdated({data: watchExpression}: Common.EventTarget.EventTargetEvent<WatchExpression>): void {
    if (!watchExpression.expression()) {
      Platform.ArrayUtilities.removeElement(this.watchExpressions, watchExpression);
      this.treeOutline.removeChild(watchExpression.treeElement());
      this.emptyElement.classList.toggle('hidden', Boolean(this.watchExpressions.length));
      if (this.watchExpressions.length === 0) {
        this.treeOutline.element.remove();
      }
    }

    this.saveExpressions();
  }

  private contextMenu(event: MouseEvent): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    this.populateContextMenu(contextMenu, event);
    void contextMenu.show();
  }

  private populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu, event: MouseEvent): void {
    let isEditing = false;
    for (const watchExpression of this.watchExpressions) {
      isEditing = isEditing || watchExpression.isEditing();
    }

    if (!isEditing) {
      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.addWatchExpression), this.addButtonClicked.bind(this),
          {jslogContext: 'add-watch-expression'});
    }

    if (this.watchExpressions.length > 1) {
      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.deleteAllWatchExpressions), this.deleteAllButtonClicked.bind(this),
          {jslogContext: 'delete-all-watch-expressions'});
    }

    const treeElement = this.treeOutline.treeElementFromEvent(event);
    if (!treeElement) {
      return;
    }
    const currentWatchExpression =
        this.watchExpressions.find(watchExpression => treeElement.hasAncestorOrSelf(watchExpression.treeElement()));
    if (currentWatchExpression) {
      currentWatchExpression.populateContextMenu(contextMenu, event);
    }
  }

  private deleteAllButtonClicked(): void {
    this.watchExpressions = [];
    this.saveExpressions();
    this.update();
  }

  private async focusAndAddExpressionToWatch(expression: string): Promise<void> {
    await UI.ViewManager.ViewManager.instance().showView('sources.watch');
    this.createWatchExpression(expression);
    this.saveExpressions();
    this.update();
  }

  handleAction(_context: UI.Context.Context, _actionId: string): boolean {
    const frame = UI.Context.Context.instance().flavor(UISourceCodeFrame);
    if (!frame) {
      return false;
    }
    const {state} = frame.textEditor;
    const text = state.sliceDoc(state.selection.main.from, state.selection.main.to);
    void this.focusAndAddExpressionToWatch(text);
    return true;
  }

  appendApplicableItems(
      _event: Event, contextMenu: UI.ContextMenu.ContextMenu,
      target: ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement|UISourceCodeFrame): void {
    if (target instanceof ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement) {
      if (!target.property.synthetic) {
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.addPropertyPathToWatch), () => this.focusAndAddExpressionToWatch(target.path()),
            {jslogContext: 'add-property-path-to-watch'});
      }
      return;
    }

    if (target.textEditor.state.selection.main.empty) {
      return;
    }

    contextMenu.debugSection().appendAction('sources.add-to-watch');
  }

  override wasShown(): void {
    super.wasShown();
    this.treeOutline.registerCSSFiles([watchExpressionsSidebarPaneStyles]);
    this.registerCSSFiles([watchExpressionsSidebarPaneStyles, objectValueStyles]);
  }
}

export class WatchExpression extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  private treeElementInternal!: UI.TreeOutline.TreeElement;
  private nameElement!: Element;
  private valueElement!: Element;
  private expressionInternal: string|null;
  private readonly expandController: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController;
  private element: HTMLDivElement;
  private editing: boolean;
  private linkifier: Components.Linkifier.Linkifier;
  private textPrompt?: ObjectUI.ObjectPropertiesSection.ObjectPropertyPrompt;
  private result?: SDK.RemoteObject.RemoteObject|null;
  private preventClickTimeout?: number;
  constructor(
      expression: string|null,
      expandController: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController,
      linkifier: Components.Linkifier.Linkifier) {
    super();

    this.expressionInternal = expression;
    this.expandController = expandController;
    this.element = document.createElement('div');
    this.element.classList.add('watch-expression');
    this.element.classList.add('monospace');
    this.editing = false;
    this.linkifier = linkifier;

    this.createWatchExpression();
    this.update();
  }

  treeElement(): UI.TreeOutline.TreeElement {
    return this.treeElementInternal;
  }

  expression(): string|null {
    return this.expressionInternal;
  }

  async #evaluateExpression(executionContext: SDK.RuntimeModel.ExecutionContext, expression: string):
      Promise<SDK.RuntimeModel.EvaluationResult> {
    const callFrame = executionContext.debuggerModel.selectedCallFrame();
    if (callFrame && callFrame.script.isJavaScript()) {
      const nameMap = await SourceMapScopes.NamesResolver.allVariablesInCallFrame(callFrame);
      try {
        expression =
            await Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptSubstitute(expression, nameMap);
      } catch {
      }
    }

    return executionContext.evaluate(
        {
          expression,
          objectGroup: WatchExpression.watchObjectGroupId,
          includeCommandLineAPI: false,
          silent: true,
          returnByValue: false,
          generatePreview: false,
        },
        /* userGesture */ false,
        /* awaitPromise */ false);
  }

  update(): void {
    const currentExecutionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (currentExecutionContext && this.expressionInternal) {
      void this.#evaluateExpression(currentExecutionContext, this.expressionInternal).then(result => {
        if ('object' in result) {
          this.createWatchExpression(result.object, result.exceptionDetails);
        } else {
          this.createWatchExpression();
        }
      });
    } else {
      this.createWatchExpression();
    }
  }

  startEditing(): void {
    this.editing = true;
    this.treeElementInternal.setDisableSelectFocus(true);
    this.element.removeChildren();
    const newDiv = this.element.createChild('div');
    newDiv.textContent = this.nameElement.textContent;
    this.textPrompt = new ObjectUI.ObjectPropertiesSection.ObjectPropertyPrompt();
    this.textPrompt.renderAsBlock();
    const proxyElement = (this.textPrompt.attachAndStartEditing(newDiv, this.finishEditing.bind(this)) as HTMLElement);
    this.treeElementInternal.listItemElement.classList.add('watch-expression-editing');
    this.treeElementInternal.collapse();
    proxyElement.classList.add('watch-expression-text-prompt-proxy');
    proxyElement.addEventListener('keydown', this.promptKeyDown.bind(this), false);
    const selection = this.element.getComponentSelection();
    if (selection) {
      selection.selectAllChildren(newDiv);
    }
  }

  isEditing(): boolean {
    return Boolean(this.editing);
  }

  private finishEditing(event: Event, canceled?: boolean): void {
    if (event) {
      event.consume(canceled);
    }

    this.editing = false;
    this.treeElementInternal.setDisableSelectFocus(false);
    this.treeElementInternal.listItemElement.classList.remove('watch-expression-editing');
    if (this.textPrompt) {
      this.textPrompt.detach();
      const newExpression = canceled ? this.expressionInternal : this.textPrompt.text();
      this.textPrompt = undefined;
      this.element.removeChildren();
      this.updateExpression(newExpression);
    }
  }

  private dblClickOnWatchExpression(event: Event): void {
    event.consume();
    if (!this.isEditing()) {
      this.startEditing();
    }
  }

  private updateExpression(newExpression: string|null): void {
    if (this.expressionInternal) {
      this.expandController.stopWatchSectionsWithId(this.expressionInternal);
    }
    this.expressionInternal = newExpression;
    this.update();
    this.dispatchEventToListeners(Events.EXPRESSION_UPDATED, this);
  }

  private deleteWatchExpression(event: Event): void {
    event.consume(true);
    this.updateExpression(null);
  }

  private createWatchExpression(
      result?: SDK.RemoteObject.RemoteObject, exceptionDetails?: Protocol.Runtime.ExceptionDetails): void {
    this.result = result || null;

    this.element.removeChildren();
    const oldTreeElement = this.treeElementInternal;
    this.createWatchExpressionTreeElement(result, exceptionDetails);
    if (oldTreeElement && oldTreeElement.parent) {
      const root = oldTreeElement.parent;
      const index = root.indexOfChild(oldTreeElement);
      root.removeChild(oldTreeElement);
      root.insertChild(this.treeElementInternal, index);
    }
    this.treeElementInternal.select();
  }

  private createWatchExpressionHeader(
      expressionValue?: SDK.RemoteObject.RemoteObject, exceptionDetails?: Protocol.Runtime.ExceptionDetails): Element {
    const headerElement = this.element.createChild('div', 'watch-expression-header');
    const deleteButton = new Buttons.Button.Button();
    deleteButton.data = {
      variant: Buttons.Button.Variant.ICON,
      iconName: 'bin',
      size: Buttons.Button.Size.SMALL,
      jslogContext: 'delete-watch-expression',
    };
    deleteButton.className = 'watch-expression-delete-button';
    UI.Tooltip.Tooltip.install(deleteButton, i18nString(UIStrings.deleteWatchExpression));
    deleteButton.addEventListener('click', this.deleteWatchExpression.bind(this), false);
    deleteButton.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        this.deleteWatchExpression(event);
      }
    });

    const titleElement = headerElement.createChild('div', 'watch-expression-title tree-element-title');
    titleElement.appendChild(deleteButton);
    this.nameElement =
        ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createNameElement(this.expressionInternal);
    UI.Tooltip.Tooltip.install(this.nameElement as HTMLElement, this.expressionInternal);
    if (Boolean(exceptionDetails) || !expressionValue) {
      this.valueElement = document.createElement('span');
      this.valueElement.classList.add('watch-expression-error');
      this.valueElement.classList.add('value');
      titleElement.classList.add('dimmed');
      this.valueElement.textContent = i18nString(UIStrings.notAvailable);
      if (exceptionDetails !== undefined && exceptionDetails.exception !== undefined &&
          exceptionDetails.exception.description !== undefined) {
        UI.Tooltip.Tooltip.install(this.valueElement as HTMLElement, exceptionDetails.exception.description);
      }
    } else {
      const propertyValue =
          ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValueWithCustomSupport(
              expressionValue, Boolean(exceptionDetails), false /* showPreview */, titleElement, this.linkifier);
      this.valueElement = propertyValue.element;
    }
    const separatorElement = document.createElement('span');
    separatorElement.classList.add('watch-expressions-separator');
    separatorElement.textContent = ': ';
    titleElement.append(this.nameElement, separatorElement, this.valueElement);

    return headerElement;
  }

  private createWatchExpressionTreeElement(
      expressionValue?: SDK.RemoteObject.RemoteObject, exceptionDetails?: Protocol.Runtime.ExceptionDetails): void {
    const headerElement = this.createWatchExpressionHeader(expressionValue, exceptionDetails);

    if (!exceptionDetails && expressionValue && expressionValue.hasChildren && !expressionValue.customPreview()) {
      headerElement.classList.add('watch-expression-object-header');
      this.treeElementInternal = new ObjectUI.ObjectPropertiesSection.RootElement(expressionValue, this.linkifier);
      this.expandController.watchSection(
          (this.expressionInternal as string),
          (this.treeElementInternal as ObjectUI.ObjectPropertiesSection.RootElement));
      this.treeElementInternal.toggleOnClick = false;
      this.treeElementInternal.listItemElement.addEventListener('click', this.onSectionClick.bind(this), false);
      this.treeElementInternal.listItemElement.addEventListener('dblclick', this.dblClickOnWatchExpression.bind(this));
    } else {
      headerElement.addEventListener('dblclick', this.dblClickOnWatchExpression.bind(this));
      this.treeElementInternal = new UI.TreeOutline.TreeElement();
    }
    this.treeElementInternal.title = this.element;
    this.treeElementInternal.listItemElement.classList.add('watch-expression-tree-item');
    this.treeElementInternal.listItemElement.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !this.isEditing()) {
        this.startEditing();
        event.consume(true);
      } else if (event.key === 'Delete' && !this.isEditing()) {
        this.deleteWatchExpression(event);
      }
    });
  }

  private onSectionClick(event: Event): void {
    event.consume(true);
    const mouseEvent = (event as MouseEvent);
    if (mouseEvent.detail === 1) {
      this.preventClickTimeout = window.setTimeout(handleClick.bind(this), 333);
    } else if (this.preventClickTimeout !== undefined) {
      window.clearTimeout(this.preventClickTimeout);
      this.preventClickTimeout = undefined;
    }

    function handleClick(this: WatchExpression): void {
      if (!this.treeElementInternal) {
        return;
      }

      if (this.treeElementInternal.expanded) {
        this.treeElementInternal.collapse();
      } else if (!this.editing) {
        this.treeElementInternal.expand();
      }
    }
  }

  private promptKeyDown(event: KeyboardEvent): void {
    const isEscapeKey = Platform.KeyboardUtilities.isEscKey(event);
    if (event.key === 'Enter' || isEscapeKey) {
      this.finishEditing(event, isEscapeKey);
    }
  }

  populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu, event: Event): void {
    if (!this.isEditing()) {
      contextMenu.editSection().appendItem(
          i18nString(UIStrings.deleteWatchExpression), this.updateExpression.bind(this, null),
          {jslogContext: 'delete-watch-expression'});
    }

    if (!this.isEditing() && this.result && (this.result.type === 'number' || this.result.type === 'string')) {
      contextMenu.clipboardSection().appendItem(
          i18nString(UIStrings.copyValue), this.copyValueButtonClicked.bind(this),
          {jslogContext: 'copy-watch-expression-value'});
    }

    const target = UI.UIUtils.deepElementFromEvent(event);
    if (target && this.valueElement.isSelfOrAncestor(target) && this.result) {
      contextMenu.appendApplicableItems(this.result);
    }
  }

  private copyValueButtonClicked(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.valueElement.textContent);
  }

  private static readonly watchObjectGroupId = 'watch-group';
}

const enum Events {
  EXPRESSION_UPDATED = 'ExpressionUpdated',
}

type EventTypes = {
  [Events.EXPRESSION_UPDATED]: WatchExpression,
};
