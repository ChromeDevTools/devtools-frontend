// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {createLayoutPane} from './LayoutPane_bridge.js';

/**
 * @unrestricted
 */
export class LayoutSidebarPane extends UI.ThrottledWidget.ThrottledWidget {
  constructor() {
    super(true /* isWebComponent */);
    this._layoutPane = createLayoutPane();
    this.contentElement.appendChild(this._layoutPane);
    this._settings = [
      'showGridBorder', 'showGridLines', 'showGridLineNumbers', 'showGridGaps', 'showGridAreas', 'showGridTrackSizes'
    ];
    this._layoutPane.addEventListener('setting-changed', event => {
      Common.Settings.Settings.instance().moduleSetting(event.data.setting).set(event.data.value);
    });
    this._settings.forEach(setting => {
      Common.Settings.Settings.instance().moduleSetting(setting).addChangeListener(this.update, this);
    });
  }

  /**
   * @override
   * @protected
   * @return {!Promise<void>}
   */
  async doUpdate() {
    this._layoutPane.data = {
      settings: this._settings
                    .map(settingName => {
                      const setting = Common.Settings.Settings.instance().moduleSetting(settingName);
                      const ext = setting.extension();
                      if (!ext) {
                        return null;
                      }
                      const descriptor = ext.descriptor();
                      return {
                        type: descriptor.settingType,
                        name: descriptor.settingName,
                        title: descriptor.title,
                        value: setting.get(),
                        options: descriptor.options.map(opt => ({
                                                          title: opt.text,
                                                          value: opt.value,
                                                        }))
                      };
                    })
                    .filter(descriptor => descriptor !== null)
    };
  }

  /**
   * @override
   */
  wasShown() {
    self.UI.context.addFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
    this.update();
  }

  /**
   * @override
   */
  willHide() {
    self.UI.context.removeFlavorChangeListener(SDK.DOMModel.DOMNode, this.update, this);
    this._settings.forEach(setting => {
      Common.Settings.Settings.instance().moduleSetting(setting).removeChangeListener(this.update.bind, this);
    });
  }
}
