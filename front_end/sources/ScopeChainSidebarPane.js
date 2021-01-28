/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as LinearMemoryInspector from '../linear_memory_inspector/linear_memory_inspector.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import {ls} from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {resolveScopeChain, resolveScopeInObject, resolveThisObject} from './SourceMapNamesResolver.js';

/** @type {!ScopeChainSidebarPane} */
let scopeChainSidebarPaneInstance;

/**
 * @implements {UI.ContextFlavorListener.ContextFlavorListener}
 */
export class ScopeChainSidebarPane extends UI.Widget.VBox {
  /**
   * @private
   */
  constructor() {
    super(true);
    this.registerRequiredCSS('sources/scopeChainSidebarPane.css', {enableLegacyPatching: false});
    this._treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline();
    this._treeOutline.registerRequiredCSS('sources/scopeChainSidebarPane.css', {enableLegacyPatching: false});
    this._treeOutline.setShowSelectionOnKeyboardFocus(/* show */ true);
    this._expandController =
        new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(this._treeOutline);
    this._linkifier = new Components.Linkifier.Linkifier();
    this._infoElement = document.createElement('div');
    this._infoElement.className = 'gray-info-message';
    this._infoElement.tabIndex = -1;
    this._update();
  }

  static instance() {
    if (!scopeChainSidebarPaneInstance) {
      scopeChainSidebarPaneInstance = new ScopeChainSidebarPane();
    }
    return scopeChainSidebarPaneInstance;
  }

  /**
   * @override
   * @param {?Object} object
   */
  flavorChanged(object) {
    this._update();
  }

  /**
   * @override
   */
  focus() {
    if (this.hasFocus()) {
      return;
    }

    if (UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails)) {
      this._treeOutline.forceSelect();
    }
  }

  async _update() {
    // The `resolveThisObject(callFrame)` and `resolveScopeChain(callFrame)` calls
    // below may take a while to complete, so indicate to the user that something
    // is happening (see https://crbug.com/1162416).
    this._infoElement.textContent = ls`Loading...`;
    this.contentElement.removeChildren();
    this.contentElement.appendChild(this._infoElement);

    this._linkifier.reset();

    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    const [thisObject, scopeChain] = await Promise.all([resolveThisObject(callFrame), resolveScopeChain(callFrame)]);
    // By now the developer might have moved on, and we don't want to show stale
    // scope information, so check again that we're still on the same CallFrame.
    if (callFrame === UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame)) {
      const details = UI.Context.Context.instance().flavor(SDK.DebuggerModel.DebuggerPausedDetails);
      this._treeOutline.removeChildren();

      if (!details || !callFrame || !scopeChain) {
        this._infoElement.textContent = ls`Not paused`;
        return;
      }

      this.contentElement.removeChildren();
      this.contentElement.appendChild(this._treeOutline.element);
      let foundLocalScope = false;
      for (let i = 0; i < scopeChain.length; ++i) {
        const scope = scopeChain[i];
        const extraProperties = this._extraPropertiesForScope(scope, details, callFrame, thisObject, i === 0);

        if (scope.type() === Protocol.Debugger.ScopeType.Local) {
          foundLocalScope = true;
        }

        const section = this._createScopeSectionTreeElement(scope, extraProperties);
        if (scope.type() === Protocol.Debugger.ScopeType.Global) {
          section.collapse();
        } else if (!foundLocalScope || scope.type() === Protocol.Debugger.ScopeType.Local) {
          section.expand();
        }

        this._treeOutline.appendChild(section);
        if (i === 0) {
          section.select(/* omitFocus */ true);
        }
      }
      this._sidebarPaneUpdatedForTest();
    }
  }

  /**
   * @param {!SDK.DebuggerModel.ScopeChainEntry} scope
   * @param {!Array.<!SDK.RemoteObject.RemoteObjectProperty>} extraProperties
   * @return {!ObjectUI.ObjectPropertiesSection.RootElement}
   */
  _createScopeSectionTreeElement(scope, extraProperties) {
    let emptyPlaceholder = null;
    if (scope.type() === Protocol.Debugger.ScopeType.Local || Protocol.Debugger.ScopeType.Closure) {
      emptyPlaceholder = ls`No variables`;
    }

    let title = scope.typeName();
    if (scope.type() === Protocol.Debugger.ScopeType.Closure) {
      const scopeName = scope.name();
      if (scopeName) {
        title = ls`Closure (${UI.UIUtils.beautifyFunctionName(scopeName)})`;
      } else {
        title = ls`Closure`;
      }
    }
    /** @type {?string} */
    let subtitle = scope.description();
    if (!title || title === subtitle) {
      subtitle = null;
    }
    const icon = scope.icon();

    const titleElement = document.createElement('div');
    titleElement.classList.add('scope-chain-sidebar-pane-section-header');
    titleElement.classList.add('tree-element-title');
    if (icon) {
      const iconElement = document.createElement('img');
      iconElement.classList.add('scope-chain-sidebar-pane-section-icon');
      iconElement.src = icon;
      titleElement.appendChild(iconElement);
    }
    titleElement.createChild('div', 'scope-chain-sidebar-pane-section-subtitle').textContent = subtitle;
    titleElement.createChild('div', 'scope-chain-sidebar-pane-section-title').textContent = title;

    const section = new ObjectUI.ObjectPropertiesSection.RootElement(
        resolveScopeInObject(scope), this._linkifier, emptyPlaceholder,
        /* ignoreHasOwnProperty */ true, extraProperties);
    section.title = titleElement;
    section.listItemElement.classList.add('scope-chain-sidebar-pane-section');
    section.listItemElement.setAttribute('aria-label', title);
    this._expandController.watchSection(title + (subtitle ? ':' + subtitle : ''), section);

    return section;
  }

  /**
   * @param {!SDK.DebuggerModel.ScopeChainEntry} scope
   * @param {!SDK.DebuggerModel.DebuggerPausedDetails} details
   * @param {!SDK.DebuggerModel.CallFrame} callFrame
   * @param {?SDK.RemoteObject.RemoteObject} thisObject
   * @param {boolean} isFirstScope
   * @return {!Array.<!SDK.RemoteObject.RemoteObjectProperty>}
   */
  _extraPropertiesForScope(scope, details, callFrame, thisObject, isFirstScope) {
    if (scope.type() !== Protocol.Debugger.ScopeType.Local || callFrame.script.isWasm()) {
      return [];
    }

    const extraProperties = [];
    if (thisObject) {
      extraProperties.push(new SDK.RemoteObject.RemoteObjectProperty('this', thisObject));
    }
    if (isFirstScope) {
      const exception = details.exception();
      if (exception) {
        extraProperties.push(new SDK.RemoteObject.RemoteObjectProperty(
            Common.UIString.UIString('Exception'), exception, undefined, undefined, undefined, undefined, undefined,
            /* synthetic */ true));
      }
      const returnValue = callFrame.returnValue();
      if (returnValue) {
        extraProperties.push(new SDK.RemoteObject.RemoteObjectProperty(
            Common.UIString.UIString('Return value'), returnValue, undefined, undefined, undefined, undefined,
            undefined,
            /* synthetic */ true, callFrame.setReturnValue.bind(callFrame)));
      }
    }

    return extraProperties;
  }

  _sidebarPaneUpdatedForTest() {
  }
}

/**
 * @implements {UI.ContextMenu.Provider}
 */
export class OpenLinearMemoryInspector extends UI.Widget.VBox {
  /**
   * @param {!SDK.RemoteObject.RemoteObject} obj
   */
  _isMemoryObjectProperty(obj) {
    const isWasmMemory = obj.type === 'object' && obj.subtype &&
        LinearMemoryInspector.LinearMemoryInspectorController.ACCEPTED_MEMORY_TYPES.includes(obj.subtype);
    if (isWasmMemory) {
      return true;
    }

    if (obj instanceof Bindings.DebuggerLanguagePlugins.ValueNode) {
      const valueNode = /** @type {!Bindings.DebuggerLanguagePlugins.ValueNode} */ obj;
      return valueNode.inspectableAddress !== undefined;
    }

    return false;
  }

  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    if (target instanceof ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement) {
      if (target.property && target.property.value && this._isMemoryObjectProperty(target.property.value)) {
        contextMenu.debugSection().appendItem(
            ls`Reveal in Memory Inspector panel`, this._openMemoryInspector.bind(this, target.property.value));
      }
    }
  }

  /**
   * @param {!SDK.RemoteObject.RemoteObject} obj
   */
  async _openMemoryInspector(obj) {
    const controller = LinearMemoryInspector.LinearMemoryInspectorController.LinearMemoryInspectorController.instance();
    let address = 0;
    let memoryObj = obj;

    if (obj instanceof Bindings.DebuggerLanguagePlugins.ValueNode) {
      const valueNode = /** @type {!Bindings.DebuggerLanguagePlugins.ValueNode} */ obj;
      address = valueNode.inspectableAddress || 0;
      const callFrame = valueNode.callFrame;
      const response = await obj.debuggerModel()._agent.invoke_evaluateOnCallFrame({
        callFrameId: callFrame.id,
        expression: 'memories[0]',
      });
      const error = response.getError();
      if (error) {
        console.error(error);
        Common.Console.Console.instance().error(ls`Could not open linear memory inspector: failed locating buffer.`);
      }
      const runtimeModel = obj.debuggerModel().runtimeModel();
      memoryObj = runtimeModel.createRemoteObject(response.result);
    }
    controller.openInspectorView(memoryObj, address);
  }
}
