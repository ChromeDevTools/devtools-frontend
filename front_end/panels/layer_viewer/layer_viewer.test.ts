// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, setupActionRegistry} from '../../testing/EnvironmentHelpers.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import * as LayerViewer from './layer_viewer.js';

describeWithEnvironment('LayerViewer', () => {
  setupActionRegistry();

  it('module can be imported', async () => {
    await import('./layer_viewer.js');
  });

  it('Layers3DView only listens to settings while shown', () => {
    const layerViewHost = new LayerViewer.LayerViewHost.LayerViewHost();
    const settings = Common.Settings.Settings.instance();
    const showPaintsSetting = settings.resolve(SettingsUI.LayerViewerSettings.showPaintsSettingDescriptor);
    const showSlowScrollRectsSetting =
        settings.resolve(SettingsUI.LayerViewerSettings.showSlowScrollRectsSettingDescriptor);
    const chromeWindowSetting = settings.resolve(SettingsUI.LayerViewerSettings.chromeWindowSettingDescriptor);
    const showInternalLayersSetting = layerViewHost.showInternalLayersSetting();
    showPaintsSetting.set(false);

    const canvas = document.createElement('canvas');
    const view = new LayerViewer.Layers3DView.Layers3DView(layerViewHost, (_input, output) => {
      output.canvasElement = canvas;
    });
    const updateData = sinon.spy(view, 'updateData');
    const resetTextures = sinon.spy(LayerViewer.Layers3DView.LayerTextureManager.prototype, 'reset');
    const setLayerTree = sinon.spy(LayerViewer.Layers3DView.LayerTextureManager.prototype, 'setLayerTree');

    showPaintsSetting.set(true);
    showSlowScrollRectsSetting.set(!showSlowScrollRectsSetting.get());
    chromeWindowSetting.set(!chromeWindowSetting.get());
    showInternalLayersSetting.set(!showInternalLayersSetting.get());
    sinon.assert.notCalled(updateData);
    sinon.assert.notCalled(resetTextures);
    sinon.assert.notCalled(setLayerTree);

    renderElementIntoDOM(view);
    sinon.assert.calledOnce(setLayerTree);
    sinon.assert.notCalled(resetTextures);
    sinon.assert.called(updateData);
    updateData.resetHistory();
    resetTextures.resetHistory();
    setLayerTree.resetHistory();

    showPaintsSetting.set(false);
    sinon.assert.calledOnce(resetTextures);
    sinon.assert.calledOnce(updateData);

    updateData.resetHistory();
    showSlowScrollRectsSetting.set(!showSlowScrollRectsSetting.get());
    sinon.assert.calledOnce(updateData);

    updateData.resetHistory();
    chromeWindowSetting.set(!chromeWindowSetting.get());
    sinon.assert.calledOnce(updateData);

    updateData.resetHistory();
    showInternalLayersSetting.set(!showInternalLayersSetting.get());
    sinon.assert.calledOnce(updateData);

    view.detach();
    updateData.resetHistory();
    resetTextures.resetHistory();

    showPaintsSetting.set(true);
    showPaintsSetting.set(false);
    showSlowScrollRectsSetting.set(!showSlowScrollRectsSetting.get());
    chromeWindowSetting.set(!chromeWindowSetting.get());
    showInternalLayersSetting.set(!showInternalLayersSetting.get());
    sinon.assert.notCalled(updateData);
    sinon.assert.notCalled(resetTextures);
  });
});
