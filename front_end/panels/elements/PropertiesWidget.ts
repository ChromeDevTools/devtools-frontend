// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

const OBJECT_GROUP_NAME = 'properties-sidebar-pane';

let propertiesWidgetInstance: PropertiesWidget;

export class PropertiesWidget extends UI.ThrottledWidget.ThrottledWidget {
  _node: SDK.DOMModel.DOMNode|null;
  _treeOutline: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline;
  _expandController: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController;
  _lastRequestedNode?: SDK.DOMModel.DOMNode;
  constructor() {
    super(true /* isWebComponent */);
    this.registerRequiredCSS('panels/elements/propertiesWidget.css');

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrModified, this._onNodeChange, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.AttrRemoved, this._onNodeChange, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.CharacterDataModified, this._onNodeChange, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DOMModel.DOMModel, SDK.DOMModel.Events.ChildNodeCountUpdated, this._onNodeChange, this);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.DOMModel.DOMNode, this._setNode, this);
    this._node = UI.Context.Context.instance().flavor(SDK.DOMModel.DOMNode);

    this._treeOutline = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeOutline({readOnly: true});
    this._treeOutline.setShowSelectionOnKeyboardFocus(/* show */ true, /* preventTabOrder */ false);
    this._expandController =
        new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController(this._treeOutline);
    this.contentElement.appendChild(this._treeOutline.element);

    this._treeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, () => {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.DOMPropertiesExpanded);
    });

    this.update();
  }
  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): PropertiesWidget {
    const {forceNew} = opts;
    if (!propertiesWidgetInstance || forceNew) {
      propertiesWidgetInstance = new PropertiesWidget();
    }

    return propertiesWidgetInstance;
  }

  _setNode(event: Common.EventTarget.EventTargetEvent): void {
    this._node = (event.data as SDK.DOMModel.DOMNode | null);
    this.update();
  }

  async doUpdate(): Promise<void> {
    if (this._lastRequestedNode) {
      this._lastRequestedNode.domModel().runtimeModel().releaseObjectGroup(OBJECT_GROUP_NAME);
      delete this._lastRequestedNode;
    }

    if (!this._node) {
      this._treeOutline.removeChildren();
      return;
    }

    this._lastRequestedNode = this._node;
    const object = await this._node.resolveToObject(OBJECT_GROUP_NAME);
    if (!object) {
      return;
    }

    await ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement.populate(
        this._treeOutline.rootElement(), object, true, true, undefined, undefined,
        ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.All);
  }

  _onNodeChange(event: Common.EventTarget
                    .EventTargetEvent<{node: SDK.DOMModel.DOMNode, name: string}|SDK.DOMModel.DOMNode>): void {
    if (!this._node) {
      return;
    }
    const data = event.data;
    const node = (data instanceof SDK.DOMModel.DOMNode ? data : data.node as SDK.DOMModel.DOMNode);
    if (this._node !== node) {
      return;
    }
    this.update();
  }
}

