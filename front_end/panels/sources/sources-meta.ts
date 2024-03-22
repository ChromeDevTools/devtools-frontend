// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as SourcesComponents from './components/components.js';
import type * as Sources from './sources.js';

const UIStrings = {
  /**
   *@description Command for showing the 'Sources' tool
   */
  showSources: 'Show Sources',
  /**
   *@description Name of the Sources panel
   */
  sources: 'Sources',
  /**
   *@description Command for showing the 'Workspace' tool
   */
  showWorkspace: 'Show Workspace',
  /**
   *@description Title of the 'Filesystem' tool in the Files Navigator View, which is part of the Sources tool
   */
  workspace: 'Workspace',
  /**
   *@description Command for showing the 'Snippets' tool
   */
  showSnippets: 'Show Snippets',
  /**
   *@description Title of the 'Snippets' tool in the Snippets Navigator View, which is part of the Sources tool
   */
  snippets: 'Snippets',
  /**
   *@description Command for showing the 'Search' tool
   */
  showSearch: 'Show Search',
  /**
   *@description Title of a search bar or tool
   */
  search: 'Search',
  /**
   *@description Command for showing the 'Quick source' tool
   */
  showQuickSource: 'Show Quick source',
  /**
   *@description Title of the 'Quick source' tool in the bottom drawer
   */
  quickSource: 'Quick source',
  /**
   *@description Command for showing the 'Threads' tool
   */
  showThreads: 'Show Threads',
  /**
   *@description Title of the sources threads
   */
  threads: 'Threads',
  /**
   *@description Command for showing the 'Scope' tool
   */
  showScope: 'Show Scope',
  /**
   *@description Title of the sources scopeChain
   */
  scope: 'Scope',
  /**
   *@description Command for showing the 'Watch' tool
   */
  showWatch: 'Show Watch',
  /**
   *@description Title of the sources watch
   */
  watch: 'Watch',
  /**
   *@description Command for showing the 'Breakpoints' tool
   */
  showBreakpoints: 'Show Breakpoints',
  /**
   *@description Title of the sources jsBreakpoints
   */
  breakpoints: 'Breakpoints',
  /**
   *@description Title of an action under the Debugger category that can be invoked through the Command Menu
   */
  pauseScriptExecution: 'Pause script execution',
  /**
   *@description Title of an action under the Debugger category that can be invoked through the Command Menu
   */
  resumeScriptExecution: 'Resume script execution',
  /**
   *@description Title of an action in the debugger tool to step over
   */
  stepOverNextFunctionCall: 'Step over next function call',
  /**
   *@description Title of an action in the debugger tool to step into
   */
  stepIntoNextFunctionCall: 'Step into next function call',
  /**
   *@description Title of an action in the debugger tool to step
   */
  step: 'Step',
  /**
   *@description Title of an action in the debugger tool to step out
   */
  stepOutOfCurrentFunction: 'Step out of current function',
  /**
   *@description Text to run a code snippet
   */
  runSnippet: 'Run snippet',
  /**
   *@description Text in Java Script Breakpoints Sidebar Pane of the Sources panel
   */
  deactivateBreakpoints: 'Deactivate breakpoints',
  /**
   *@description Text in Java Script Breakpoints Sidebar Pane of the Sources panel
   */
  activateBreakpoints: 'Activate breakpoints',
  /**
   *@description Title of an action in the sources tool to add to watch
   */
  addSelectedTextToWatches: 'Add selected text to watches',
  /**
   *@description Title of an action in the debugger tool to evaluate selection
   */
  evaluateSelectedTextInConsole: 'Evaluate selected text in console',
  /**
   *@description Title of an action that switches files in the Sources panel
   */
  switchFile: 'Switch file',
  /**
   *@description Title of a sources panel action that renames a file
   */
  rename: 'Rename',
  /**
   *@description Title of an action in the sources tool to close all
   */
  closeAll: 'Close All',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (jump to previous editing location in text editor)
   */
  jumpToPreviousEditingLocation: 'Jump to previous editing location',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (jump to next editing location in text editor)
   */
  jumpToNextEditingLocation: 'Jump to next editing location',
  /**
   *@description Title of an action that closes the active editor tab in the Sources panel
   */
  closeTheActiveTab: 'Close the active tab',
  /**
   *@description Text to go to a given line
   */
  goToLine: 'Go to line',
  /**
   *@description Title of an action that opens the go to member menu
   */
  goToAFunctionDeclarationruleSet: 'Go to a function declaration/rule set',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (toggle breakpoint in debugger)
   */
  toggleBreakpoint: 'Toggle breakpoint',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (enable toggle breakpoint shortcut in debugger)
   */
  toggleBreakpointEnabled: 'Toggle breakpoint enabled',
  /**
   *@description Title of a sources panel action that opens the breakpoint input window
   */
  toggleBreakpointInputWindow: 'Toggle breakpoint input window',
  /**
   *@description Text to save something
   */
  save: 'Save',
  /**
   *@description Title of an action to save all files in the Sources panel
   */
  saveAll: 'Save all',
  /**
   *@description Title of an action in the sources tool to create snippet
   */
  createNewSnippet: 'Create new snippet',
  /**
   *@description Title of an action in the sources tool to add folder to workspace
   */
  addFolderToWorkspace: 'Add folder to workspace',
  /**
   *@description Title of an action in the sources tool to add folder to workspace
   */
  addFolder: 'Add folder',
  /**
   *@description Title of an action in the debugger tool to previous call frame
   */
  previousCallFrame: 'Previous call frame',
  /**
   *@description Title of an action in the debugger tool to next call frame
   */
  nextCallFrame: 'Next call frame',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (increment CSS unit by the amount passed in the placeholder in Styles pane)
   *@example {10} PH1
   */
  incrementCssUnitBy: 'Increment CSS unit by {PH1}',
  /**
   *@description Text in the Shortcuts page to explain a keyboard shortcut (decrement CSS unit by the amount passed in the placeholder in Styles pane)
   *@example {10} PH1
   */
  decrementCssUnitBy: 'Decrement CSS unit by {PH1}',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  searchInAnonymousAndContent: 'Search in anonymous and content scripts',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  doNotSearchInAnonymousAndContent: 'Do not search in anonymous and content scripts',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  automaticallyRevealFilesIn: 'Automatically reveal files in sidebar',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  doNotAutomaticallyRevealFilesIn: 'Do not automatically reveal files in sidebar',
  /**
   *@description Setting under the Sources category to toggle usage of JavaScript source maps.
   */
  javaScriptSourceMaps: 'JavaScript source maps',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableJavaScriptSourceMaps: 'Enable JavaScript source maps',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableJavaScriptSourceMaps: 'Disable JavaScript source maps',
  /**
   *@description Title of a setting under the Sources category.
   *'tab moves focus' is the name of the setting, which means that when the user
   *hits the tab key, the focus in the UI will be moved to the next part of the
   *text editor, as opposed to inserting a tab character into the text in the
   *text editor.
   */
  tabMovesFocus: 'Tab moves focus',
  /**
   *@description Title of a setting that can be invoked through the Command Menu.
   *'tab moves focus' is the name of the setting, which means that when the user
   *hits the tab key, the focus in the UI will be moved to the next part of the
   *text editor, as opposed to inserting a tab character into the text in the
   *text editor.
   */
  enableTabMovesFocus: 'Enable tab moves focus',
  /**
   *@description Title of a setting that can be invoked through the Command Menu.
   *'tab moves focus' is the name of the setting, which means that when the user
   *hits the tab key, the focus in the UI will be moved to the next part of the
   *text editor, as opposed to inserting a tab character into the text in the
   *text editor.
   */
  disableTabMovesFocus: 'Disable tab moves focus',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  detectIndentation: 'Detect indentation',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  doNotDetectIndentation: 'Do not detect indentation',
  /**
   *@description Title of a setting under Sources category that can be invoked through the Command Menu.
   *This setting turns on the automatic formatting of source files in the Sources panel that are detected
   *to be minified.
   */
  automaticallyPrettyPrintMinifiedSources: 'Automatically pretty print minified sources',
  /**
   *@description Title of a setting under Sources category that can be invoked through the Command Menu.
   *This setting turns off the automatic formatting of source files in the Sources panel that are detected
   *to be minified.
   */
  doNotAutomaticallyPrettyPrintMinifiedSources: 'Do not automatically pretty print minified sources',
  /**
   *@description Text for autocompletion
   */
  autocompletion: 'Autocompletion',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableAutocompletion: 'Enable autocompletion',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableAutocompletion: 'Disable autocompletion',
  /**
   *@description Title of a setting under the Sources category in Settings
   */
  bracketMatching: 'Bracket matching',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableBracketMatching: 'Enable bracket matching',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableBracketMatching: 'Disable bracket matching',
  /**
   *@description Title of a setting under the Sources category in Settings
   */
  codeFolding: 'Code folding',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableCodeFolding: 'Enable code folding',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableCodeFolding: 'Disable code folding',
  /**
   *@description Title of a setting under the Sources category in Settings
   */
  showWhitespaceCharacters: 'Show whitespace characters:',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  doNotShowWhitespaceCharacters: 'Do not show whitespace characters',
  /**
   * @description One value of an option that can be set to 'none', 'all', or 'trailing'. The setting
   * controls how whitespace characters are shown in a text editor.
   */
  none: 'None',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  showAllWhitespaceCharacters: 'Show all whitespace characters',
  /**
   *@description Text for everything
   */
  all: 'All',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  showTrailingWhitespaceCharacters: 'Show trailing whitespace characters',
  /**
   *@description A drop-down menu option to show trailing whitespace characters
   */
  trailing: 'Trailing',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  displayVariableValuesInlineWhile: 'Display variable values inline while debugging',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  doNotDisplayVariableValuesInline: 'Do not display variable values inline while debugging',
  /**
   *@description Title of a setting under the Sources category
   */
  cssSourceMaps: 'CSS source maps',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableCssSourceMaps: 'Enable CSS source maps',
  /**
   *@description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableCssSourceMaps: 'Disable CSS source maps',
  /**
   *@description Title of a setting under the Sources category in Settings
   */
  allowScrollingPastEndOfFile: 'Allow scrolling past end of file',
  /**
   *@description Title of a setting under the Sources category in Settings
   */
  disallowScrollingPastEndOfFile: 'Disallow scrolling past end of file',
  /**
   *@description Title of a setting under the Sources category in Settings
   */
  wasmAutoStepping: 'When debugging wasm with debug information, do not pause on wasm bytecode if possible',
  /**
   *@description Title of a setting under the Sources category in Settings
   */
  enableWasmAutoStepping: 'Enable wasm auto-stepping',
  /**
   *@description Title of a setting under the Sources category in Settings
   */
  disableWasmAutoStepping: 'Disable wasm auto-stepping',

  /**
   *@description Text for command prefix of go to a given line or symbol
   */
  goTo: 'Go to',
  /**
   *@description Text for command suggestion of go to a given line
   */
  line: 'Line',
  /**
   *@description Text for command suggestion of go to a given symbol
   */
  symbol: 'Symbol',
  /**
   *@description Text for command prefix of open a file
   */
  open: 'Open',
  /**
   *@description Text for command suggestion of open a file
   */
  file: 'File',
  /**
   * @description  Title of a setting under the Sources category in Settings. If this option is off,
   * the sources panel will not be automatically be focsed whenever the application hits a breakpoint
   * and comes to a halt.
   */
  disableAutoFocusOnDebuggerPaused: 'Do not focus Sources panel when triggering a breakpoint',
  /**
   * @description  Title of a setting under the Sources category in Settings. If this option is on,
   * the sources panel will be automatically shown whenever the application hits a breakpoint and
   * comes to a halt.
   */
  enableAutoFocusOnDebuggerPaused: 'Focus Sources panel when triggering a breakpoint',
  /**
   *@description Title of an action to reveal the active file in the navigator sidebar of the Sources panel
   */
  revealActiveFileInSidebar: 'Reveal active file in navigator sidebar',
  /**
   * @description Text for command of toggling navigator sidebar in Sources panel
   */
  toggleNavigatorSidebar: 'Toggle navigator sidebar',
  /**
   * @description Text for command of toggling debugger sidebar in Sources panel
   */
  toggleDebuggerSidebar: 'Toggle debugger sidebar',
  /**
   * @description Title of an action that navigates to the next editor in the Sources panel.
   */
  nextEditorTab: 'Next editor',
  /**
   * @description Title of an action that navigates to the next editor in the Sources panel.
   */
  previousEditorTab: 'Previous editor',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/sources-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedSourcesModule: (typeof Sources|undefined);
let loadedSourcesComponentsModule: (typeof SourcesComponents|undefined);

async function loadSourcesModule(): Promise<typeof Sources> {
  if (!loadedSourcesModule) {
    loadedSourcesModule = await import('./sources.js');
  }
  return loadedSourcesModule;
}

async function loadSourcesComponentsModule(): Promise<typeof SourcesComponents> {
  if (!loadedSourcesComponentsModule) {
    loadedSourcesComponentsModule = await import('./components/components.js');
  }
  return loadedSourcesComponentsModule;
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
  commandPrompt: i18nLazyString(UIStrings.showSources),
  title: i18nLazyString(UIStrings.sources),
  order: 30,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-files',
  commandPrompt: i18nLazyString(UIStrings.showWorkspace),
  title: i18nLazyString(UIStrings.workspace),
  order: 3,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesNavigator.FilesNavigatorView();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  id: 'navigator-snippets',
  commandPrompt: i18nLazyString(UIStrings.showSnippets),
  title: i18nLazyString(UIStrings.snippets),
  order: 6,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesNavigator.SnippetsNavigatorView();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'sources.search-sources-tab',
  commandPrompt: i18nLazyString(UIStrings.showSearch),
  title: i18nLazyString(UIStrings.search),
  order: 7,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const Sources = await loadSourcesModule();
    return new Sources.SearchSourcesView.SearchSourcesView();
  },
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'sources.quick',
  commandPrompt: i18nLazyString(UIStrings.showQuickSource),
  title: i18nLazyString(UIStrings.quickSource),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 1000,
  async loadView() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.QuickSourceView();
  },
});

UI.ViewManager.registerViewExtension({
  id: 'sources.threads',
  commandPrompt: i18nLazyString(UIStrings.showThreads),
  title: i18nLazyString(UIStrings.threads),
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return new Sources.ThreadsSidebarPane.ThreadsSidebarPane();
  },
});

UI.ViewManager.registerViewExtension({
  id: 'sources.scope-chain',
  commandPrompt: i18nLazyString(UIStrings.showScope),
  title: i18nLazyString(UIStrings.scope),
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.ScopeChainSidebarPane.ScopeChainSidebarPane.instance();
  },
});

UI.ViewManager.registerViewExtension({
  id: 'sources.watch',
  commandPrompt: i18nLazyString(UIStrings.showWatch),
  title: i18nLazyString(UIStrings.watch),
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
  },
  hasToolbar: true,
});

UI.ViewManager.registerViewExtension({
  id: 'sources.js-breakpoints',
  commandPrompt: i18nLazyString(UIStrings.showBreakpoints),
  title: i18nLazyString(UIStrings.breakpoints),
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const SourcesComponents = await loadSourcesComponentsModule();
    return SourcesComponents.BreakpointsView.BreakpointsView.instance().wrapper as UI.Widget.Widget;
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
    return new Sources.SourcesPanel.RevealingActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(
        Sources => [Sources.SourcesView.SourcesView, UI.ShortcutRegistry.ForwardedShortcut]);
  },
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.pauseScriptExecution),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.resumeScriptExecution),
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
    return new Sources.SourcesPanel.ActionDelegate();
  },

  title: i18nLazyString(UIStrings.stepOverNextFunctionCall),
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
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.stepIntoNextFunctionCall),
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
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.step),
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
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.stepOutOfCurrentFunction),
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
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.runSnippet),
  iconClass: UI.ActionRegistration.IconClass.PLAY,
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
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'debugger.toggle-breakpoints-active',
  iconClass: UI.ActionRegistration.IconClass.BREAKPOINT_CROSSED,
  toggledIconClass: UI.ActionRegistration.IconClass.BREAKPOINT_CROSSED_FILLED,
  toggleable: true,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.deactivateBreakpoints),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.activateBreakpoints),
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
  title: i18nLazyString(UIStrings.addSelectedTextToWatches),
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.UISourceCodeFrame.UISourceCodeFrame]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+A',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+A',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'debugger.evaluate-selection',
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.evaluateSelectedTextInConsole),
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.UISourceCodeFrame.UISourceCodeFrame]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+E',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+E',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.switch-file',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: i18nLazyString(UIStrings.switchFile),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.SwitchFileActionDelegate();
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
  title: i18nLazyString(UIStrings.rename),
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
    return new Sources.SourcesView.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.closeAll),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.jump-to-previous-location',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: i18nLazyString(UIStrings.jumpToPreviousEditingLocation),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
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
  title: i18nLazyString(UIStrings.jumpToNextEditingLocation),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
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
  title: i18nLazyString(UIStrings.closeTheActiveTab),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
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
  actionId: 'sources.next-editor-tab',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: i18nLazyString(UIStrings.nextEditorTab),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+PageDown',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+PageDown',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.previous-editor-tab',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: i18nLazyString(UIStrings.previousEditorTab),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+PageUp',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+PageUp',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.go-to-line',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: i18nLazyString(UIStrings.goToLine),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
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
  title: i18nLazyString(UIStrings.goToAFunctionDeclarationruleSet),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
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
  title: i18nLazyString(UIStrings.toggleBreakpoint),
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+b',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+b',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
      ],
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
  title: i18nLazyString(UIStrings.toggleBreakpointEnabled),
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
  title: i18nLazyString(UIStrings.toggleBreakpointInputWindow),
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
  title: i18nLazyString(UIStrings.save),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
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
  title: i18nLazyString(UIStrings.saveAll),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
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
    return new Sources.SourcesNavigator.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.createNewSnippet),
});

if (!Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
  UI.ActionRegistration.registerActionExtension({
    category: UI.ActionRegistration.ActionCategory.SOURCES,
    actionId: 'sources.add-folder-to-workspace',
    async loadActionDelegate() {
      const Sources = await loadSourcesModule();
      return new Sources.SourcesNavigator.ActionDelegate();
    },
    iconClass: UI.ActionRegistration.IconClass.PLUS,
    title: i18nLazyString(UIStrings.addFolderToWorkspace),
  });
}

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.DEBUGGER,
  actionId: 'debugger.previous-call-frame',
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.CallStackSidebarPane.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.previousCallFrame),
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
    return new Sources.CallStackSidebarPane.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.nextCallFrame),
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
  title: i18nLazyString(UIStrings.search),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SearchSourcesView.ActionDelegate();
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
  title: i18nLazyString(UIStrings.incrementCssUnitBy, {PH1: 1}),
  bindings: [
    {
      shortcut: 'Alt+Up',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.increment-css-by-ten',
  title: i18nLazyString(UIStrings.incrementCssUnitBy, {PH1: 10}),
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
  title: i18nLazyString(UIStrings.decrementCssUnitBy, {PH1: 1}),
  bindings: [
    {
      shortcut: 'Alt+Down',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.decrement-css-by-ten',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: i18nLazyString(UIStrings.decrementCssUnitBy, {PH1: 10}),
  bindings: [
    {
      shortcut: 'Alt+PageDown',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.reveal-in-navigator-sidebar',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: i18nLazyString(UIStrings.revealActiveFileInSidebar),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.toggle-navigator-sidebar',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: i18nLazyString(UIStrings.toggleNavigatorSidebar),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+y',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+y',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+b',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Meta+b',
      keybindSets: [
        UI.ActionRegistration.KeybindSet.VS_CODE,
      ],
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'sources.toggle-debugger-sidebar',
  category: UI.ActionRegistration.ActionCategory.SOURCES,
  title: i18nLazyString(UIStrings.toggleDebuggerSidebar),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Ctrl+Shift+h',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Meta+Shift+h',
    },
  ],
});

Common.Settings.registerSettingExtension({
  settingName: 'navigator-group-by-folder',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  settingName: 'navigator-group-by-authored',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.searchInAnonymousAndContent),
  settingName: 'search-in-anonymous-and-content-scripts',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.searchInAnonymousAndContent),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotSearchInAnonymousAndContent),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.automaticallyRevealFilesIn),
  settingName: 'auto-reveal-in-navigator',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.automaticallyRevealFilesIn),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotAutomaticallyRevealFilesIn),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.javaScriptSourceMaps),
  settingName: 'js-source-maps-enabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableJavaScriptSourceMaps),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableJavaScriptSourceMaps),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.tabMovesFocus),
  settingName: 'text-editor-tab-moves-focus',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableTabMovesFocus),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableTabMovesFocus),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.detectIndentation),
  settingName: 'text-editor-auto-detect-indent',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.detectIndentation),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotDetectIndentation),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.autocompletion),
  settingName: 'text-editor-autocompletion',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableAutocompletion),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableAutocompletion),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  title: i18nLazyString(UIStrings.bracketMatching),
  settingName: 'text-editor-bracket-matching',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableBracketMatching),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableBracketMatching),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.codeFolding),
  settingName: 'text-editor-code-folding',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableCodeFolding),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableCodeFolding),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.showWhitespaceCharacters),
  settingName: 'show-whitespaces-in-editor',
  settingType: Common.Settings.SettingType.ENUM,
  defaultValue: 'original',
  options: [
    {
      title: i18nLazyString(UIStrings.doNotShowWhitespaceCharacters),
      text: i18nLazyString(UIStrings.none),
      value: 'none',
    },
    {
      title: i18nLazyString(UIStrings.showAllWhitespaceCharacters),
      text: i18nLazyString(UIStrings.all),
      value: 'all',
    },
    {
      title: i18nLazyString(UIStrings.showTrailingWhitespaceCharacters),
      text: i18nLazyString(UIStrings.trailing),
      value: 'trailing',
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.displayVariableValuesInlineWhile),
  settingName: 'inline-variable-values',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.displayVariableValuesInlineWhile),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotDisplayVariableValuesInline),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.enableAutoFocusOnDebuggerPaused),
  settingName: 'auto-focus-on-debugger-paused-enabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableAutoFocusOnDebuggerPaused),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableAutoFocusOnDebuggerPaused),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.automaticallyPrettyPrintMinifiedSources),
  settingName: 'auto-pretty-print-minified',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.automaticallyPrettyPrintMinifiedSources),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotAutomaticallyPrettyPrintMinifiedSources),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.cssSourceMaps),
  settingName: 'css-source-maps-enabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableCssSourceMaps),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableCssSourceMaps),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.allowScrollingPastEndOfFile),
  settingName: 'allow-scroll-past-eof',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.allowScrollingPastEndOfFile),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disallowScrollingPastEndOfFile),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Local,
  title: i18nLazyString(UIStrings.wasmAutoStepping),
  settingName: 'wasm-auto-stepping',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableWasmAutoStepping),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableWasmAutoStepping),
    },
  ],
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.NAVIGATOR_VIEW,
  category: UI.ViewManager.ViewLocationCategory.SOURCES,
  async loadResolver() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  },
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_TOP,
  category: UI.ViewManager.ViewLocationCategory.SOURCES,
  async loadResolver() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  },
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_BOTTOM,
  category: UI.ViewManager.ViewLocationCategory.SOURCES,
  async loadResolver() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  },
});

UI.ViewManager.registerLocationResolver({
  name: UI.ViewManager.ViewLocationValues.SOURCES_SIDEBAR_TABS,
  category: UI.ViewManager.ViewLocationCategory.SOURCES,
  async loadResolver() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  },
});

UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Workspace.UISourceCode.UISourceCode,
      Workspace.UISourceCode.UILocation,
      SDK.RemoteObject.RemoteObject,
      SDK.NetworkRequest.NetworkRequest,
      ...maybeRetrieveContextTypes(Sources => [Sources.UISourceCodeFrame.UISourceCodeFrame]),
    ];
  },
  async loadProvider() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  },
  experiment: undefined,
});

UI.ContextMenu.registerProvider({
  async loadProvider() {
    const Sources = await loadSourcesModule();
    return Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
  },
  contextTypes() {
    return [
      ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement,
      ...maybeRetrieveContextTypes(Sources => [Sources.UISourceCodeFrame.UISourceCodeFrame]),
    ];
  },
  experiment: undefined,
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Workspace.UISourceCode.UILocation,
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.UILocationRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Workspace.UISourceCode.UILocationRange,
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.UILocationRangeRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      SDK.DebuggerModel.Location,
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.DebuggerLocationRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Workspace.UISourceCode.UISourceCode,
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.UISourceCodeRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      SDK.DebuggerModel.DebuggerPausedDetails,
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.DebuggerPausedDetailsRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Breakpoints.BreakpointManager.BreakpointLocation,
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.DebuggerPlugin.BreakpointLocationRevealer();
  },
});

Common.Revealer.registerRevealer({
  contextTypes() {
    return maybeRetrieveContextTypes(Sources => [Sources.SearchSourcesView.SearchSources]);
  },
  destination: undefined,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SearchSourcesView.Revealer();
  },
});

UI.Toolbar.registerToolbarItem({
  actionId: 'sources.add-folder-to-workspace',
  location: UI.Toolbar.ToolbarItemLocation.FILES_NAVIGATION_TOOLBAR,
  label: i18nLazyString(UIStrings.addFolder),
  showLabel: true,
  loadItem: undefined,
  order: undefined,
  separator: undefined,
});

UI.Context.registerListener({
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  async loadListener() {
    const SourcesComponents = await loadSourcesComponentsModule();
    return SourcesComponents.BreakpointsView.BreakpointsSidebarController.instance();
  },
});

UI.Context.registerListener({
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  async loadListener() {
    const Sources = await loadSourcesModule();
    return Sources.CallStackSidebarPane.CallStackSidebarPane.instance();
  },
});

UI.Context.registerListener({
  contextTypes() {
    return [SDK.DebuggerModel.CallFrame];
  },
  async loadListener() {
    const Sources = await loadSourcesModule();
    return Sources.ScopeChainSidebarPane.ScopeChainSidebarPane.instance();
  },
});

UI.ContextMenu.registerItem({
  location: UI.ContextMenu.ItemLocation.NAVIGATOR_MENU_DEFAULT,
  actionId: 'quick-open.show',
  order: undefined,
});

UI.ContextMenu.registerItem({
  location: UI.ContextMenu.ItemLocation.MAIN_MENU_DEFAULT,
  actionId: 'sources.search',
  order: undefined,
});

QuickOpen.FilteredListWidget.registerProvider({
  prefix: '@',
  iconName: 'symbol',
  iconWidth: '20px',
  async provider() {
    const Sources = await loadSourcesModule();
    return new Sources.OutlineQuickOpen.OutlineQuickOpen();
  },
  titlePrefix: i18nLazyString(UIStrings.goTo),
  titleSuggestion: i18nLazyString(UIStrings.symbol),
});

QuickOpen.FilteredListWidget.registerProvider({
  prefix: ':',
  iconName: 'colon',
  iconWidth: '20px',
  async provider() {
    const Sources = await loadSourcesModule();
    return new Sources.GoToLineQuickOpen.GoToLineQuickOpen();
  },
  titlePrefix: i18nLazyString(UIStrings.goTo),
  titleSuggestion: i18nLazyString(UIStrings.line),
});

QuickOpen.FilteredListWidget.registerProvider({
  prefix: '',
  iconName: 'document',
  iconWidth: '20px',
  async provider() {
    const Sources = await loadSourcesModule();
    return new Sources.OpenFileQuickOpen.OpenFileQuickOpen();
  },
  titlePrefix: i18nLazyString(UIStrings.open),
  titleSuggestion: i18nLazyString(UIStrings.file),
});
