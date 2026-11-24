// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {getAxeViolations} from '../../testing/AxeHelpers.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, registerActions} from '../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('TimelinePanel landing page', () => {
  let timelinePanel: Timeline.TimelinePanel.TimelinePanel|undefined;

  afterEach(() => {
    timelinePanel?.detach();
    timelinePanel = undefined;
    Timeline.TimelinePanel.TimelinePanel.removeInstance();
    SDK.PageResourceLoader.PageResourceLoader.removeInstance();
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.removeInstance();
    Workspace.IgnoreListManager.IgnoreListManager.removeInstance();
  });

  describe('accessibility', () => {
    it('has no aXe violations', async () => {
      const toolbarCheckboxSettings = [
        [SettingsUI.TimelineSettings.timelineShowScreenshotsSettingDescriptor, 'Screenshots'],
        [SettingsUI.TimelineSettings.timelineShowMemorySettingDescriptor, 'Memory'],
        [SettingsUI.TimelineSettings.timelineDimThirdPartiesSettingDescriptor, 'Dim 3rd parties'],
      ] as const;
      for (const [descriptor, title] of toolbarCheckboxSettings) {
        SettingsUI.SettingUIRegistration.register(descriptor, {
          title: () => i18n.i18n.lockedString(title),
        });
      }
      for (const descriptor of [SettingsUI.TimelineSettings.timelineCaptureSelectorStatsSettingDescriptor,
                                SettingsUI.TimelineSettings.timelineCaptureLayersAndPicturesSettingDescriptor,
                                SettingsUI.TimelineSettings.timelineDisableJsSamplingSettingDescriptor,
                                SettingsUI.TimelineSettings.timelineScreenshotCaptureModeSettingDescriptor,
                                SettingsUI.TimelineSettings.timelineShowExtensionDataSettingDescriptor,
      ]) {
        SettingsUI.SettingUIRegistration.register(descriptor, {});
      }

      registerActions([
        {
          actionId: 'timeline.toggle-recording',
          category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
          iconClass: UI.ActionRegistration.IconClass.START_RECORDING,
          toggleable: true,
          toggledIconClass: UI.ActionRegistration.IconClass.STOP_RECORDING,
          toggleWithRedColor: true,
          loadActionDelegate: async () => new Timeline.TimelinePanel.ActionDelegate(),
          options: [
            {
              value: true,
              title: () => i18n.i18n.lockedString('Record'),
            },
            {
              value: false,
              title: () => i18n.i18n.lockedString('Stop'),
            },
          ],
          bindings: [
            {
              platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
              shortcut: 'Ctrl+E',
            },
            {
              platform: UI.ActionRegistration.Platforms.MAC,
              shortcut: 'Meta+E',
            },
          ],
        },
        {
          actionId: 'timeline.record-reload',
          category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
          iconClass: UI.ActionRegistration.IconClass.REFRESH,
          title: () => i18n.i18n.lockedString('Record and reload'),
          loadActionDelegate: async () => new Timeline.TimelinePanel.ActionDelegate(),
          bindings: [
            {
              platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
              shortcut: 'Ctrl+Shift+E',
            },
            {
              platform: UI.ActionRegistration.Platforms.MAC,
              shortcut: 'Meta+Shift+E',
            },
          ],
        },
        {
          actionId: 'timeline.show-history',
          category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
          title: () => i18n.i18n.lockedString('Show recent timeline sessions'),
          loadActionDelegate: async () => new Timeline.TimelinePanel.ActionDelegate(),
          bindings: [
            {
              platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
              shortcut: 'Ctrl+H',
            },
            {
              platform: UI.ActionRegistration.Platforms.MAC,
              shortcut: 'Meta+Y',
            },
          ],
        },
        {
          actionId: 'components.collect-garbage',
          category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
          iconClass: UI.ActionRegistration.IconClass.MOP,
          title: () => i18n.i18n.lockedString('Collect garbage'),
        },
      ]);

      const targetManager = SDK.TargetManager.TargetManager.instance();
      const isolateManager = SDK.IsolateManager.IsolateManager.instance();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        workspace,
        ignoreListManager,
      });
      Timeline.ModificationsManager.ModificationsManager.reset();
      const resourceLoader = SDK.PageResourceLoader.PageResourceLoader.instance(
          {forceNew: true, loadOverride: null, maxConcurrentLoads: 500});

      timelinePanel = Timeline.TimelinePanel.TimelinePanel.instance({
        forceNew: true,
        resourceLoader,
        targetManager,
        isolateManager,
        commentManager: new CommentManager.CommentManager.CommentManager(),
      });
      renderElementIntoDOM(timelinePanel, {includeCommonStyles: true, width: 800, height: 600});
      await RenderCoordinator.done();
      await UI.Widget.Widget.allUpdatesComplete;

      const panelRect = timelinePanel.element.getBoundingClientRect();
      assert.isAbove(panelRect.width, 0);
      assert.isAbove(panelRect.height, 0);
      assert.exists(timelinePanel.element.querySelector('.timeline-toolbar-container'));

      const landingPage = timelinePanel.element.querySelector('.timeline-landing-page');
      assert.exists(landingPage);

      assert.isEmpty(await getAxeViolations(timelinePanel.element));
    });
  });
});
