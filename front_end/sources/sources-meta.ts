// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';
import * as SDK from '../sdk/sdk.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Sources from './sources.js';

let loadedSourcesModule: (typeof Sources|undefined);

async function loadSourcesModule(): Promise<typeof Sources> {
  if (!loadedSourcesModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('sources');
    loadedSourcesModule = await import('./sources.js');
  }
  return loadedSourcesModule;
}

function maybeRetrieveContextTypes<T = unknown>(getClassCallBack: (sourcesModule: typeof Sources) => T[]): T[] {
  if (loadedSourcesModule === undefined) {
    return [];
  }
  return getClassCallBack(loadedSourcesModule);
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'sources',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Sources`,
  title: (): Platform.UIString.LocalizedString => ls`Sources`,
  order: 30,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-files',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Filesystem`,
  title: (): Platform.UIString.LocalizedString => ls`Filesystem`,
  order: 3,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.FilesNavigatorView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-snippets',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Snippets`,
  title: (): Platform.UIString.LocalizedString => ls`Snippets`,
  order: 6,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.SnippetsNavigatorView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'sources.search-sources-tab',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Search`,
  title: (): Platform.UIString.LocalizedString => ls`Search`,
  order: 7,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SearchSourcesView.SearchSourcesView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-recordings',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Recordings`,
  title: (): Platform.UIString.LocalizedString => ls`Recordings`,
  order: 8,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  experiment: 'recorder',
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.RecordingsNavigatorView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'sources.quick',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Quick source`,
  title: (): Platform.UIString.LocalizedString => ls`Quick source`,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 1000,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.WrapperView.instance();
  },
});

UI.ViewManager.registerViewExtension({
  id: 'sources.threads',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Threads`,
  title: (): Platform.UIString.LocalizedString => ls`Threads`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  condition: '!sources.hide_thread_sidebar',
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.ThreadsSidebarPane.ThreadsSidebarPane.instance();
  },
});

UI.ViewManager.registerViewExtension({
  id: 'sources.scopeChain',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Scope`,
  title: (): Platform.UIString.LocalizedString => ls`Scope`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.ScopeChainSidebarPane.ScopeChainSidebarPane.instance();
  },
});

UI.ViewManager.registerViewExtension({
  id: 'sources.watch',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Watch`,
  title: (): Platform.UIString.LocalizedString => ls`Watch`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
  },
  hasToolbar: true,
});

UI.ViewManager.registerViewExtension({
  id: 'sources.jsBreakpoints',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Breakpoints`,
  title: (): Platform.UIString.LocalizedString => ls`Breakpoints`,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.JavaScriptBreakpointsSidebarPane.JavaScriptBreakpointsSidebarPane.instance();
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'debugger.toggle-pause',
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_PAUSE,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_RESUME,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.RevealingActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(
        Sources =>
            [Sources.SourcesView.SourcesView,
             UI.ShortcutRegistry.ForwardedShortcut,
    ]);
  },
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Pause script execution`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Resume script execution`,
    },
  ],
  bindings: [
    {
      shortcut: 'F8',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+\\',
    },
    {
      shortcut: 'F5',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      shortcut: 'Shift+F5',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+\\',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'debugger.step-over',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.DebuggingActionDelegate.instance();
  },

  title: (): Platform.UIString.LocalizedString => ls`Step over next function call`,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_STEP_OVER,
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  bindings: [
    {
      shortcut: 'F10',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+\'',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+\'',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'debugger.step-into',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.DebuggingActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Step into next function call`,
  iconClass: UI.ActionRegistration.IconClass.LARGE_ICON_STEP_INTO,
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  bindings: [
    {
      shortcut: 'F11',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+;',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+;',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'debugger.step',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.DebuggingActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Step`,
  iconClass: UI.ActionRegistration.IconClass.LARGE_ICON_STEP,
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  bindings: [
    {
      shortcut: 'F9',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'debugger.step-out',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.DebuggingActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Step out of current function`,
  iconClass: UI.ActionRegistration.IconClass.LARGE_ICON_STEP_OUT,
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  bindings: [
    {
      shortcut: 'Shift+F11',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Shift+Ctrl+;',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Shift+Meta+;',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'debugger.run-snippet',
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.DebuggingActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Run snippet`,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_PLAY,
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Enter',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Enter',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'recorder.toggle-recording',
  experiment: Root.Runtime.ExperimentName.RECORDER,
  category: UI.ActionRegistration.ActionCategory.RECORDER,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.DebuggingActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Start Recording`,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_START_RECORDING,
  toggleable: true,
  toggledIconClass: UI.ActionRegistration.IconClass.LARGEICON_STOP_RECORDING,
  toggleWithRedColor: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Record`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Stop`,
    },
  ],
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+E',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+E',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'debugger.toggle-breakpoints-active',
  iconClass: UI.ActionRegistration.IconClass.LARGE_ICON_DEACTIVATE_BREAKPOINTS,
  toggleable: true,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.DebuggingActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Deactivate breakpoints`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Activate breakpoints`,
    },
  ],
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+F8',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+F8',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.add-to-watch',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
  },
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  title: (): Platform.UIString.LocalizedString => ls`Add selected text to watches`,
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.UISourceCodeFrame.UISourceCodeFrame]);
  },
  bindings: [
    {
      shortcut: 'Ctrl+Shift+A',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'debugger.evaluate-selection',
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.DebuggingActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Evaluate selected text in console`,
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.UISourceCodeFrame.UISourceCodeFrame]);
  },
  bindings: [
    {
      shortcut: 'Ctrl+Shift+E',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.switch-file',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Switch file`,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesView.SwitchFileActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: 'Alt+O',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.rename',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Rename`,
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'F2',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Enter',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  actionId: 'sources.close-all',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesView.ActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Close All`,
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.jump-to-previous-location',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Jump to previous editing location`,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesView.ActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: 'Alt+Minus',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.jump-to-next-location',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Jump to next editing location`,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesView.ActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: 'Alt+Plus',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.close-editor-tab',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Close the active tab`,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesView.ActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: 'Alt+w',
    },
    {
      shortcut: 'Ctrl+W',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Windows,
      shortcut: 'Ctrl+F4',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.go-to-line',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Go to line`,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesView.ActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: 'Ctrl+g',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.go-to-member',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Go to a function declaration/rule set`,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesView.ActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+o',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+o',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+T',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+T',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      shortcut: 'F12',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'debugger.toggle-breakpoint',
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  title: (): Platform.UIString.LocalizedString => ls`Toggle breakpoint`,
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+b',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+b',
    },
    {
      shortcut: 'F9',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'debugger.toggle-breakpoint-enabled',
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  title: (): Platform.UIString.LocalizedString => ls`Toggle breakpoint enabled`,
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+b',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+b',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'debugger.breakpoint-input-window',
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  title: (): Platform.UIString.LocalizedString => ls`Toggle breakpoint input window`,
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Alt+b',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Alt+b',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.save',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Save`,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesView.ActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+s',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+s',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.save-all',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Save all`,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesView.ActionDelegate.instance();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+s',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Alt+s',
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+K S',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Alt+S',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  actionId: 'sources.create-snippet',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.ActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Create new snippet`,
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  actionId: 'sources.add-folder-to-workspace',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesNavigator.ActionDelegate.instance();
  },
  iconClass: UI.ActionRegistration.IconClass.LARGE_ICON_ADD,
  title: (): Platform.UIString.LocalizedString => ls`Add folder to workspace`,
  condition: Root.Runtime.ConditionName.NOT_SOURCES_HIDE_ADD_FOLDER,
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'debugger.previous-call-frame',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.CallStackSidebarPane.ActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Previous call frame`,
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  bindings: [
    {
      shortcut: 'Ctrl+,',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'debugger.next-call-frame',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.CallStackSidebarPane.ActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Next call frame`,
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  bindings: [
    {
      shortcut: 'Ctrl+.',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.search',
  title: (): Platform.UIString.LocalizedString => ls`Search`,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.SearchSourcesView.ActionDelegate.instance();
  },
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Alt+F',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+F',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+J',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+F',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+J',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.increment-css',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Increment CSS unit by 1`,
  bindings: [
    {
      shortcut: 'Alt+Up',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.increment-css-by-ten',
  title: (): Platform.UIString.LocalizedString => ls`Increment CSS unit by 10`,
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  bindings: [
    {
      shortcut: 'Alt+PageUp',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.decrement-css',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Decrement CSS unit by 1`,
  bindings: [
    {
      shortcut: 'Alt+Down',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.decrement-css-by-ten',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Decrement CSS unit by 10`,
  bindings: [
    {
      shortcut: 'Alt+PageDown',
    },
  ],
});

Common.Settings.registerSettingExtension({
  settingName: 'navigatorGroupByFolder',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Search in anonymous and content scripts`,
  settingName: 'searchInAnonymousAndContentScripts',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Search in anonymous and content scripts`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not search in anonymous and content scripts`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Automatically reveal files in sidebar`,
  settingName: 'autoRevealInNavigator',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Automatically reveal files in sidebar`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not automatically reveal files in sidebar`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Enable JavaScript source maps`,
  settingName: 'jsSourceMapsEnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Enable JavaScript source maps`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Disable JavaScript source maps`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Enable tab moves focus`,
  settingName: 'textEditorTabMovesFocus',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Enable tab moves focus`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Disable tab moves focus`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Detect indentation`,
  settingName: 'textEditorAutoDetectIndent',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Detect indentation`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not detect indentation`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Autocompletion`,
  settingName: 'textEditorAutocompletion',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Enable autocompletion`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Disable autocompletion`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Bracket matching`,
  settingName: 'textEditorBracketMatching',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Enable bracket matching`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Disable bracket matching`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Code folding`,
  settingName: 'textEditorCodeFolding',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Enable code folding`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Disable code folding`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Show whitespace characters:`,
  settingName: 'showWhitespacesInEditor',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  defaultValue: 'original',
  options: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Do not show whitespace characters`,
      text: (): Platform.UIString.LocalizedString => ls`None`,
      value: 'none',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Show all whitespace characters`,
      text: (): Platform.UIString.LocalizedString => ls`All`,
      value: 'all',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Show trailing whitespace characters`,
      text: (): Platform.UIString.LocalizedString => ls`Trailing`,
      value: 'trailing',
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Display variable values inline while debugging`,
  settingName: 'inlineVariableValues',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Display variable values inline while debugging`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Do not display variable values inline while debugging`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Enable CSS source maps`,
  settingName: 'cssSourceMapsEnabled',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Enable CSS source maps`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Disable CSS source maps`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.SOURCES,
  title: (): Platform.UIString.LocalizedString => ls`Allow scrolling past end of file`,
  settingName: 'allowScrollPastEof',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Allow scrolling past end of file`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Disallow scrolling past end of file`,
    },
  ],
});
