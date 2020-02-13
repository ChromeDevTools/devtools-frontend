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

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {resolveScopeInObject, resolveThisObject} from './SourceMapNamesResolver.js';

/**
 * @implements {UI.ContextFlavorListener.ContextFlavorListener}
 * @unrestricted
 */
export class ScopeChainSidebarPaneBase extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('sources/scopeChainSidebarPane.css');
    this._treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline();
    this._treeOutline.registerRequiredCSS('sources/scopeChainSidebarPane.css');
    this._treeOutline.setShowSelectionOnKeyboardFocus(/* show */ true);
    this._expandController =
        new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(this._treeOutline);
    this._linkifier = new Components.Linkifier.Linkifier();
    this._infoElement = createElement('div');
    this._infoElement.className = 'gray-info-message';
    this._infoElement.textContent = ls`Not paused`;
    this._infoElement.tabIndex = -1;
    this._update();
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

    if (self.UI.context.flavor(SDK.DebuggerModel.DebuggerPausedDetails)) {
      this._treeOutline.forceSelect();
    }
  }

  _getScopeChain(callFrame) {
    return [];
  }

  _update() {
    const callFrame = self.UI.context.flavor(SDK.DebuggerModel.CallFrame);
    const details = self.UI.context.flavor(SDK.DebuggerModel.DebuggerPausedDetails);
    this._linkifier.reset();
    resolveThisObject(callFrame).then(this._innerUpdate.bind(this, details, callFrame));
  }

  /**
   * @param {?SDK.DebuggerModel.DebuggerPausedDetails} details
   * @param {?SDK.DebuggerModel.CallFrame} callFrame
   * @param {?SDK.RemoteObject.RemoteObject} thisObject
   */
  _innerUpdate(details, callFrame, thisObject) {
    this._treeOutline.removeChildren();
    this.contentElement.removeChildren();

    if (!details || !callFrame) {
      this.contentElement.appendChild(this._infoElement);
      return;
    }

    this.contentElement.appendChild(this._treeOutline.element);
    let foundLocalScope = false;
    const scopeChain = this._getScopeChain(callFrame);
    if (scopeChain) {
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
    }
    this._sidebarPaneUpdatedForTest();
  }

  /**
   * @param {!SDK.DebuggerModel.Scope} scope
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
    let subtitle = scope.description();
    if (!title || title === subtitle) {
      subtitle = undefined;
    }

    const titleElement = createElementWithClass('div', 'scope-chain-sidebar-pane-section-header tree-element-title');
    titleElement.createChild('div', 'scope-chain-sidebar-pane-section-subtitle').textContent = subtitle;
    titleElement.createChild('div', 'scope-chain-sidebar-pane-section-title').textContent = title;

    const section = new ObjectUI.ObjectPropertiesSection.RootElement(
        resolveScopeInObject(scope), this._linkifier, emptyPlaceholder,
        /* ignoreHasOwnProperty */ true, extraProperties);
    section.title = titleElement;
    section.listItemElement.classList.add('scope-chain-sidebar-pane-section');
    this._expandController.watchSection(title + (subtitle ? ':' + subtitle : ''), section);

    return section;
  }

  /**
   * @param {!SDK.DebuggerModel.Scope} scope
   * @param {?SDK.DebuggerModel.DebuggerPausedDetails} details
   * @param {?SDK.DebuggerModel.CallFrame} callFrame
   * @param {?SDK.RemoteObject.RemoteObject} thisObject
   * @param {boolean} isFirstScope
   * @return {!Array.<!SDK.RemoteObject.RemoteObjectProperty>}
   */
  _extraPropertiesForScope(scope, details, callFrame, thisObject, isFirstScope) {
    if (scope.type() !== Protocol.Debugger.ScopeType.Local) {
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
 * @unrestricted
 */
export class SourceScopeChainSidebarPane extends ScopeChainSidebarPaneBase {
  constructor() {
    super();
  }
  /**
   * @override
   */
  _getScopeChain(callFrame) {
    return callFrame.sourceScopeChain;
  }
}

/**
 * @unrestricted
 */
export class ScopeChainSidebarPane extends ScopeChainSidebarPaneBase {
  /**
   * @override
   */
  _getScopeChain(callFrame) {
    return callFrame.scopeChain();
  }
}


export const pathSymbol = Symbol('path');
