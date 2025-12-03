// gen/front_end/entrypoints/shell/shell.prebundle.js
import "./../../Images/Images.js";
import "./../../core/dom_extension/dom_extension.js";

// gen/front_end/panels/sources/sources-meta.js
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Breakpoints from "./../../models/breakpoints/breakpoints.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as ObjectUI from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as QuickOpen from "./../../ui/legacy/components/quick_open/quick_open.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Command for showing the 'Sources' tool
   */
  showSources: "Show Sources",
  /**
   * @description Name of the Sources panel
   */
  sources: "Sources",
  /**
   * @description Command for showing the 'Workspace' tool
   */
  showWorkspace: "Show Workspace",
  /**
   * @description Title of the 'Filesystem' tool in the Files Navigator View, which is part of the Sources tool
   */
  workspace: "Workspace",
  /**
   * @description Command for showing the 'Snippets' tool
   */
  showSnippets: "Show Snippets",
  /**
   * @description Title of the 'Snippets' tool in the Snippets Navigator View, which is part of the Sources tool
   */
  snippets: "Snippets",
  /**
   * @description Command for showing the 'Search' tool
   */
  showSearch: "Show Search",
  /**
   * @description Title of a search bar or tool
   */
  search: "Search",
  /**
   * @description Command for showing the 'Quick source' tool
   */
  showQuickSource: "Show Quick source",
  /**
   * @description Title of the 'Quick source' tool in the bottom drawer
   */
  quickSource: "Quick source",
  /**
   * @description Command for showing the 'Threads' tool
   */
  showThreads: "Show Threads",
  /**
   * @description Title of the sources threads
   */
  threads: "Threads",
  /**
   * @description Command for showing the 'Scope' tool
   */
  showScope: "Show Scope",
  /**
   * @description Title of the sources scopeChain
   */
  scope: "Scope",
  /**
   * @description Command for showing the 'Watch' tool
   */
  showWatch: "Show Watch",
  /**
   * @description Title of the sources watch
   */
  watch: "Watch",
  /**
   * @description Command for showing the 'Breakpoints' tool
   */
  showBreakpoints: "Show Breakpoints",
  /**
   * @description Title of the sources jsBreakpoints
   */
  breakpoints: "Breakpoints",
  /**
   * @description Title of an action under the Debugger category that can be invoked through the Command Menu
   */
  pauseScriptExecution: "Pause script execution",
  /**
   * @description Title of an action under the Debugger category that can be invoked through the Command Menu
   */
  resumeScriptExecution: "Resume script execution",
  /**
   * @description Title of an action in the debugger tool to step over
   */
  stepOverNextFunctionCall: "Step over next function call",
  /**
   * @description Title of an action in the debugger tool to step into
   */
  stepIntoNextFunctionCall: "Step into next function call",
  /**
   * @description Title of an action in the debugger tool to step
   */
  step: "Step",
  /**
   * @description Title of an action in the debugger tool to step out
   */
  stepOutOfCurrentFunction: "Step out of current function",
  /**
   * @description Text to run a code snippet
   */
  runSnippet: "Run snippet",
  /**
   * @description Text in Java Script Breakpoints Sidebar Pane of the Sources panel
   */
  deactivateBreakpoints: "Deactivate breakpoints",
  /**
   * @description Text in Java Script Breakpoints Sidebar Pane of the Sources panel
   */
  activateBreakpoints: "Activate breakpoints",
  /**
   * @description Title of an action in the sources tool to add to watch
   */
  addSelectedTextToWatches: "Add selected text to watches",
  /**
   * @description Title of an action in the debugger tool to evaluate selection
   */
  evaluateSelectedTextInConsole: "Evaluate selected text in console",
  /**
   * @description Title of an action that switches files in the Sources panel
   */
  switchFile: "Switch file",
  /**
   * @description Title of a sources panel action that renames a file
   */
  rename: "Rename",
  /**
   * @description Title of an action in the sources tool to close all
   */
  closeAll: "Close all",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (jump to previous editing location in text editor)
   */
  jumpToPreviousEditingLocation: "Jump to previous editing location",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (jump to next editing location in text editor)
   */
  jumpToNextEditingLocation: "Jump to next editing location",
  /**
   * @description Title of an action that closes the active editor tab in the Sources panel
   */
  closeTheActiveTab: "Close the active tab",
  /**
   * @description Text to go to a given line
   */
  goToLine: "Go to line",
  /**
   * @description Title of an action that opens the go to member menu
   */
  goToAFunctionDeclarationruleSet: "Go to a function declaration/rule set",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (toggle breakpoint in debugger)
   */
  toggleBreakpoint: "Toggle breakpoint",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (enable toggle breakpoint shortcut in debugger)
   */
  toggleBreakpointEnabled: "Toggle breakpoint enabled",
  /**
   * @description Title of a sources panel action that opens the breakpoint input window
   */
  toggleBreakpointInputWindow: "Toggle breakpoint input window",
  /**
   * @description Text to save something
   */
  save: "Save",
  /**
   * @description Title of an action to save all files in the Sources panel
   */
  saveAll: "Save all",
  /**
   * @description Title of an action in the sources tool to create snippet
   */
  createNewSnippet: "Create new snippet",
  /**
   * @description Button in the Workspace tab of the Sources panel, used to
   *              (manually) add a folder to the workspace.
   */
  addFolderManually: "Add folder manually",
  /**
   * @description Title of an action in the Sources panel command menu to (manually)
   *              add a folder to the workspace.
   */
  addFolderToWorkspace: "Add folder to workspace",
  /**
   * @description Title of an action in the debugger tool to previous call frame
   */
  previousCallFrame: "Previous call frame",
  /**
   * @description Title of an action in the debugger tool to next call frame
   */
  nextCallFrame: "Next call frame",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (increment CSS unit by the amount passed in the placeholder in Styles pane)
   * @example {10} PH1
   */
  incrementCssUnitBy: "Increment CSS unit by {PH1}",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (decrement CSS unit by the amount passed in the placeholder in Styles pane)
   * @example {10} PH1
   */
  decrementCssUnitBy: "Decrement CSS unit by {PH1}",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  searchInAnonymousAndContent: "Search in anonymous and content scripts",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  doNotSearchInAnonymousAndContent: "Do not search in anonymous and content scripts",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  automaticallyRevealFilesIn: "Automatically reveal files in sidebar",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  doNotAutomaticallyRevealFilesIn: "Do not automatically reveal files in sidebar",
  /**
   * @description Title of a setting under the Sources category.
   *'tab moves focus' is the name of the setting, which means that when the user
   *hits the tab key, the focus in the UI will be moved to the next part of the
   *text editor, as opposed to inserting a tab character into the text in the
   *text editor.
   */
  tabMovesFocus: "Tab moves focus",
  /**
   * @description Title of a setting that can be invoked through the Command Menu.
   *'tab moves focus' is the name of the setting, which means that when the user
   *hits the tab key, the focus in the UI will be moved to the next part of the
   *text editor, as opposed to inserting a tab character into the text in the
   *text editor.
   */
  enableTabMovesFocus: "Enable tab moves focus",
  /**
   * @description Title of a setting that can be invoked through the Command Menu.
   *'tab moves focus' is the name of the setting, which means that when the user
   *hits the tab key, the focus in the UI will be moved to the next part of the
   *text editor, as opposed to inserting a tab character into the text in the
   *text editor.
   */
  disableTabMovesFocus: "Disable tab moves focus",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  detectIndentation: "Detect indentation",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  doNotDetectIndentation: "Do not detect indentation",
  /**
   * @description Title of a setting under Sources category that can be invoked through the Command Menu.
   *This setting turns on the automatic formatting of source files in the Sources panel that are detected
   *to be minified.
   */
  automaticallyPrettyPrintMinifiedSources: "Automatically pretty print minified sources",
  /**
   * @description Title of a setting under Sources category that can be invoked through the Command Menu.
   *This setting turns off the automatic formatting of source files in the Sources panel that are detected
   *to be minified.
   */
  doNotAutomaticallyPrettyPrintMinifiedSources: "Do not automatically pretty print minified sources",
  /**
   * @description Text for autocompletion
   */
  autocompletion: "Autocompletion",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableAutocompletion: "Enable autocompletion",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableAutocompletion: "Disable autocompletion",
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  bracketClosing: "Auto closing brackets",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableBracketClosing: "Enable auto closing brackets",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableBracketClosing: "Disable auto closing brackets",
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  bracketMatching: "Bracket matching",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableBracketMatching: "Enable bracket matching",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableBracketMatching: "Disable bracket matching",
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  codeFolding: "Code folding",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableCodeFolding: "Enable code folding",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableCodeFolding: "Disable code folding",
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  showWhitespaceCharacters: "Show whitespace characters:",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  doNotShowWhitespaceCharacters: "Do not show whitespace characters",
  /**
   * @description One value of an option that can be set to 'none', 'all', or 'trailing'. The setting
   * controls how whitespace characters are shown in a text editor.
   */
  none: "None",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  showAllWhitespaceCharacters: "Show all whitespace characters",
  /**
   * @description Text for everything
   */
  all: "All",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  showTrailingWhitespaceCharacters: "Show trailing whitespace characters",
  /**
   * @description A drop-down menu option to show trailing whitespace characters
   */
  trailing: "Trailing",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  displayVariableValuesInlineWhile: "Display variable values inline while debugging",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  doNotDisplayVariableValuesInline: "Do not display variable values inline while debugging",
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  allowScrollingPastEndOfFile: "Allow scrolling past end of file",
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  disallowScrollingPastEndOfFile: "Disallow scrolling past end of file",
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  wasmAutoStepping: "Wasm auto-stepping bytecode",
  /**
   * @description Tooltip text for a setting that controls Wasm will try to skip wasm bytecode
   */
  wasmAutoSteppingInfo: "When debugging Wasm with debug information, try to skip wasm bytecode",
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  enableWasmAutoStepping: "Enable Wasm auto-stepping",
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  disableWasmAutoStepping: "Disable Wasm auto-stepping",
  /**
   * @description Text for command prefix of go to a given line or symbol
   */
  goTo: "Go to",
  /**
   * @description Text for command suggestion of go to a given line
   */
  line: "Line",
  /**
   * @description Text for command suggestion of go to a given symbol
   */
  symbol: "Symbol",
  /**
   * @description Text for help title of go to symbol menu
   */
  goToSymbol: "Go to symbol",
  /**
   * @description Text for command prefix of open a file
   */
  open: "Open",
  /**
   * @description Text for command suggestion of open a file
   */
  file: "File",
  /**
   * @description Text for help title of open file menu
   */
  openFile: "Open file",
  /**
   * @description  Title of a setting under the Sources category in Settings. If this option is off,
   * the sources panel will not be automatically be focused whenever the application hits a breakpoint
   * and comes to a halt.
   */
  disableAutoFocusOnDebuggerPaused: "Do not focus Sources panel when triggering a breakpoint",
  /**
   * @description  Title of a setting under the Sources category in Settings. If this option is on,
   * the sources panel will be automatically shown whenever the application hits a breakpoint and
   * comes to a halt.
   */
  enableAutoFocusOnDebuggerPaused: "Focus Sources panel when triggering a breakpoint",
  /**
   * @description Title of an action to reveal the active file in the navigator sidebar of the Sources panel
   */
  revealActiveFileInSidebar: "Reveal active file in navigator sidebar",
  /**
   * @description Text for command of toggling navigator sidebar in Sources panel
   */
  toggleNavigatorSidebar: "Toggle navigator sidebar",
  /**
   * @description Text for command of toggling debugger sidebar in Sources panel
   */
  toggleDebuggerSidebar: "Toggle debugger sidebar",
  /**
   * @description Title of an action that navigates to the next editor in the Sources panel.
   */
  nextEditorTab: "Next editor",
  /**
   * @description Title of an action that navigates to the next editor in the Sources panel.
   */
  previousEditorTab: "Previous editor",
  /**
   * @description Title of a setting under the Sources category in Settings. If
   *              this option is on, the Sources panel will automatically wrap
   *              long lines and try to avoid showing a horizontal scrollbar if
   *              possible.
   */
  wordWrap: "Word wrap",
  /**
   * @description Title of an action in the Sources panel that toggles the 'Word
   *              wrap' setting.
   */
  toggleWordWrap: "Toggle word wrap"
};
var str_ = i18n.i18n.registerUIStrings("panels/sources/sources-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedSourcesModule;
async function loadSourcesModule() {
  if (!loadedSourcesModule) {
    loadedSourcesModule = await import("./../../panels/sources/sources.js");
  }
  return loadedSourcesModule;
}
function maybeRetrieveContextTypes(getClassCallBack) {
  if (loadedSourcesModule === void 0) {
    return [];
  }
  return getClassCallBack(loadedSourcesModule);
}
UI.ViewManager.registerViewExtension({
  location: "panel",
  id: "sources",
  commandPrompt: i18nLazyString(UIStrings.showSources),
  title: i18nLazyString(UIStrings.sources),
  order: 30,
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  }
});
UI.ViewManager.registerViewExtension({
  location: "navigator-view",
  id: "navigator-files",
  commandPrompt: i18nLazyString(UIStrings.showWorkspace),
  title: i18nLazyString(UIStrings.workspace),
  order: 3,
  persistence: "permanent",
  condition: () => !Root.Runtime.Runtime.isTraceApp(),
  async loadView() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesNavigator.FilesNavigatorView();
  }
});
UI.ViewManager.registerViewExtension({
  location: "navigator-view",
  id: "navigator-snippets",
  commandPrompt: i18nLazyString(UIStrings.showSnippets),
  title: i18nLazyString(UIStrings.snippets),
  order: 6,
  persistence: "permanent",
  condition: () => !Root.Runtime.Runtime.isTraceApp(),
  async loadView() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesNavigator.SnippetsNavigatorView();
  }
});
UI.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "sources.search-sources-tab",
  commandPrompt: i18nLazyString(UIStrings.showSearch),
  title: i18nLazyString(UIStrings.search),
  order: 7,
  persistence: "closeable",
  async loadView() {
    const Sources = await loadSourcesModule();
    return new Sources.SearchSourcesView.SearchSourcesView();
  }
});
UI.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "sources.quick",
  commandPrompt: i18nLazyString(UIStrings.showQuickSource),
  title: i18nLazyString(UIStrings.quickSource),
  persistence: "closeable",
  order: 1e3,
  async loadView() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.QuickSourceView();
  }
});
UI.ViewManager.registerViewExtension({
  id: "sources.threads",
  commandPrompt: i18nLazyString(UIStrings.showThreads),
  title: i18nLazyString(UIStrings.threads),
  persistence: "permanent",
  async loadView() {
    const Sources = await loadSourcesModule();
    return new Sources.ThreadsSidebarPane.ThreadsSidebarPane();
  }
});
UI.ViewManager.registerViewExtension({
  id: "sources.scope-chain",
  commandPrompt: i18nLazyString(UIStrings.showScope),
  title: i18nLazyString(UIStrings.scope),
  persistence: "permanent",
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.ScopeChainSidebarPane.ScopeChainSidebarPane.instance();
  }
});
UI.ViewManager.registerViewExtension({
  id: "sources.watch",
  commandPrompt: i18nLazyString(UIStrings.showWatch),
  title: i18nLazyString(UIStrings.watch),
  persistence: "permanent",
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
  },
  hasToolbar: true
});
UI.ViewManager.registerViewExtension({
  id: "sources.js-breakpoints",
  commandPrompt: i18nLazyString(UIStrings.showBreakpoints),
  title: i18nLazyString(UIStrings.breakpoints),
  persistence: "permanent",
  async loadView() {
    const Sources = await loadSourcesModule();
    return Sources.BreakpointsView.BreakpointsView.instance();
  }
});
UI.ActionRegistration.registerActionExtension({
  category: "DEBUGGER",
  actionId: "debugger.toggle-pause",
  iconClass: "pause",
  toggleable: true,
  toggledIconClass: "resume",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.RevealingActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView, UI.ShortcutRegistry.ForwardedShortcut]);
  },
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.pauseScriptExecution)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.resumeScriptExecution)
    }
  ],
  bindings: [
    {
      shortcut: "F8",
      keybindSets: [
        "devToolsDefault"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+\\"
    },
    {
      shortcut: "F5",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      shortcut: "Shift+F5",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+\\"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "DEBUGGER",
  actionId: "debugger.step-over",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.stepOverNextFunctionCall),
  iconClass: "step-over",
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  bindings: [
    {
      shortcut: "F10",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+'"
    },
    {
      platform: "mac",
      shortcut: "Meta+'"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "DEBUGGER",
  actionId: "debugger.step-into",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.stepIntoNextFunctionCall),
  iconClass: "step-into",
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  bindings: [
    {
      shortcut: "F11",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+;"
    },
    {
      platform: "mac",
      shortcut: "Meta+;"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "DEBUGGER",
  actionId: "debugger.step",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.step),
  iconClass: "step",
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  bindings: [
    {
      shortcut: "F9",
      keybindSets: [
        "devToolsDefault"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "DEBUGGER",
  actionId: "debugger.step-out",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.stepOutOfCurrentFunction),
  iconClass: "step-out",
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  bindings: [
    {
      shortcut: "Shift+F11",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Shift+Ctrl+;"
    },
    {
      platform: "mac",
      shortcut: "Shift+Meta+;"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "debugger.run-snippet",
  category: "DEBUGGER",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.runSnippet),
  iconClass: "play",
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Enter"
    },
    {
      platform: "mac",
      shortcut: "Meta+Enter"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "DEBUGGER",
  actionId: "debugger.toggle-breakpoints-active",
  iconClass: "breakpoint-crossed",
  toggledIconClass: "breakpoint-crossed-filled",
  toggleable: true,
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.deactivateBreakpoints)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.activateBreakpoints)
    }
  ],
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+F8"
    },
    {
      platform: "mac",
      shortcut: "Meta+F8"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.add-to-watch",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
  },
  category: "DEBUGGER",
  title: i18nLazyString(UIStrings.addSelectedTextToWatches),
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.UISourceCodeFrame.UISourceCodeFrame]);
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+A"
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+A"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "debugger.evaluate-selection",
  category: "DEBUGGER",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.evaluateSelectedTextInConsole),
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.UISourceCodeFrame.UISourceCodeFrame]);
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+E"
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+E"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.switch-file",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.switchFile),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.SwitchFileActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: "Alt+O"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.rename",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.rename),
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "F2"
    },
    {
      platform: "mac",
      shortcut: "Enter"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "SOURCES",
  actionId: "sources.close-all",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.closeAll),
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+K W",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+K W",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.jump-to-previous-location",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.jumpToPreviousEditingLocation),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: "Alt+Minus"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.jump-to-next-location",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.jumpToNextEditingLocation),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: "Alt+Plus"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.close-editor-tab",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.closeTheActiveTab),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: "Alt+w"
    },
    {
      shortcut: "Ctrl+W",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "windows",
      shortcut: "Ctrl+F4",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.next-editor-tab",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.nextEditorTab),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+PageDown",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+PageDown",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.previous-editor-tab",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.previousEditorTab),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+PageUp",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+PageUp",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.go-to-line",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.goToLine),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: "Ctrl+g",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.go-to-member",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.goToAFunctionDeclarationruleSet),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+o",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+o",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+T",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+T",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      shortcut: "F12",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "debugger.toggle-breakpoint",
  category: "DEBUGGER",
  title: i18nLazyString(UIStrings.toggleBreakpoint),
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+b",
      keybindSets: [
        "devToolsDefault"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+b",
      keybindSets: [
        "devToolsDefault"
      ]
    },
    {
      shortcut: "F9",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "debugger.toggle-breakpoint-enabled",
  category: "DEBUGGER",
  title: i18nLazyString(UIStrings.toggleBreakpointEnabled),
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+b"
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+b"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "debugger.breakpoint-input-window",
  category: "DEBUGGER",
  title: i18nLazyString(UIStrings.toggleBreakpointInputWindow),
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Alt+b"
    },
    {
      platform: "mac",
      shortcut: "Meta+Alt+b"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.save",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.save),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+s",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+s",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.save-all",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.saveAll),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+s"
    },
    {
      platform: "mac",
      shortcut: "Meta+Alt+s"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+K S",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Alt+S",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "SOURCES",
  actionId: "sources.create-snippet",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesNavigator.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.createNewSnippet)
});
UI.ActionRegistration.registerActionExtension({
  category: "SOURCES",
  actionId: "sources.add-folder-to-workspace",
  condition: () => !Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode(),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesNavigator.ActionDelegate();
  },
  iconClass: "plus",
  title: i18nLazyString(UIStrings.addFolderToWorkspace)
});
UI.ActionRegistration.registerActionExtension({
  category: "DEBUGGER",
  actionId: "debugger.previous-call-frame",
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
      shortcut: "Ctrl+,"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  category: "DEBUGGER",
  actionId: "debugger.next-call-frame",
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
      shortcut: "Ctrl+."
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.search",
  title: i18nLazyString(UIStrings.search),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SearchSourcesView.ActionDelegate();
  },
  category: "SOURCES",
  bindings: [
    {
      platform: "mac",
      shortcut: "Meta+Alt+F",
      keybindSets: [
        "devToolsDefault"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+F",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+J",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+F",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+J",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.increment-css",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.incrementCssUnitBy, { PH1: 1 }),
  bindings: [
    {
      shortcut: "Alt+Up"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.increment-css-by-ten",
  title: i18nLazyString(UIStrings.incrementCssUnitBy, { PH1: 10 }),
  category: "SOURCES",
  bindings: [
    {
      shortcut: "Alt+PageUp"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.decrement-css",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.decrementCssUnitBy, { PH1: 1 }),
  bindings: [
    {
      shortcut: "Alt+Down"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.decrement-css-by-ten",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.decrementCssUnitBy, { PH1: 10 }),
  bindings: [
    {
      shortcut: "Alt+PageDown"
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.reveal-in-navigator-sidebar",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.revealActiveFileInSidebar),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  }
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.toggle-navigator-sidebar",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.toggleNavigatorSidebar),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+y",
      keybindSets: [
        "devToolsDefault"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+y",
      keybindSets: [
        "devToolsDefault"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+b",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Meta+b",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "sources.toggle-debugger-sidebar",
  category: "SOURCES",
  title: i18nLazyString(UIStrings.toggleDebuggerSidebar),
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+h"
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+h"
    }
  ]
});
Common.Settings.registerSettingExtension({
  settingName: "navigator-group-by-folder",
  settingType: "boolean",
  defaultValue: true
});
Common.Settings.registerSettingExtension({
  settingName: "navigator-group-by-authored",
  settingType: "boolean",
  defaultValue: false
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.searchInAnonymousAndContent),
  settingName: "search-in-anonymous-and-content-scripts",
  settingType: "boolean",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.searchInAnonymousAndContent)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotSearchInAnonymousAndContent)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.automaticallyRevealFilesIn),
  settingName: "auto-reveal-in-navigator",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.automaticallyRevealFilesIn)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotAutomaticallyRevealFilesIn)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.tabMovesFocus),
  settingName: "text-editor-tab-moves-focus",
  settingType: "boolean",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableTabMovesFocus)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableTabMovesFocus)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.detectIndentation),
  settingName: "text-editor-auto-detect-indent",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.detectIndentation)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotDetectIndentation)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.autocompletion),
  settingName: "text-editor-autocompletion",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableAutocompletion)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableAutocompletion)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.bracketClosing),
  settingName: "text-editor-bracket-closing",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableBracketClosing)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableBracketClosing)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  title: i18nLazyString(UIStrings.bracketMatching),
  settingName: "text-editor-bracket-matching",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableBracketMatching)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableBracketMatching)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.codeFolding),
  settingName: "text-editor-code-folding",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableCodeFolding)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableCodeFolding)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.showWhitespaceCharacters),
  settingName: "show-whitespaces-in-editor",
  settingType: "enum",
  defaultValue: "original",
  options: [
    {
      title: i18nLazyString(UIStrings.doNotShowWhitespaceCharacters),
      text: i18nLazyString(UIStrings.none),
      value: "none"
    },
    {
      title: i18nLazyString(UIStrings.showAllWhitespaceCharacters),
      text: i18nLazyString(UIStrings.all),
      value: "all"
    },
    {
      title: i18nLazyString(UIStrings.showTrailingWhitespaceCharacters),
      text: i18nLazyString(UIStrings.trailing),
      value: "trailing"
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.wordWrap),
  settingName: "sources.word-wrap",
  settingType: "boolean",
  defaultValue: false
});
UI.ActionRegistration.registerActionExtension({
  category: "SOURCES",
  actionId: "sources.toggle-word-wrap",
  async loadActionDelegate() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.ActionDelegate();
  },
  title: i18nLazyString(UIStrings.toggleWordWrap),
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SourcesView.SourcesView]);
  },
  bindings: [
    {
      shortcut: "Alt+Z",
      keybindSets: [
        "vsCode"
        /* UI.ActionRegistration.KeybindSet.VS_CODE */
      ]
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.displayVariableValuesInlineWhile),
  settingName: "inline-variable-values",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.displayVariableValuesInlineWhile)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotDisplayVariableValuesInline)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.enableAutoFocusOnDebuggerPaused),
  settingName: "auto-focus-on-debugger-paused-enabled",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableAutoFocusOnDebuggerPaused)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableAutoFocusOnDebuggerPaused)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.automaticallyPrettyPrintMinifiedSources),
  settingName: "auto-pretty-print-minified",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.automaticallyPrettyPrintMinifiedSources)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotAutomaticallyPrettyPrintMinifiedSources)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.allowScrollingPastEndOfFile),
  settingName: "allow-scroll-past-eof",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.allowScrollingPastEndOfFile)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disallowScrollingPastEndOfFile)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Local",
  title: i18nLazyString(UIStrings.wasmAutoStepping),
  settingName: "wasm-auto-stepping",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableWasmAutoStepping)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableWasmAutoStepping)
    }
  ],
  learnMore: {
    tooltip: i18nLazyString(UIStrings.wasmAutoSteppingInfo)
  }
});
UI.ViewManager.registerLocationResolver({
  name: "navigator-view",
  category: "SOURCES",
  async loadResolver() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  }
});
UI.ViewManager.registerLocationResolver({
  name: "sources.sidebar-top",
  category: "SOURCES",
  async loadResolver() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  }
});
UI.ViewManager.registerLocationResolver({
  name: "sources.sidebar-bottom",
  category: "SOURCES",
  async loadResolver() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  }
});
UI.ViewManager.registerLocationResolver({
  name: "sources.sidebar-tabs",
  category: "SOURCES",
  async loadResolver() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  }
});
UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Workspace.UISourceCode.UISourceCode,
      Workspace.UISourceCode.UILocation,
      SDK.RemoteObject.RemoteObject,
      SDK.NetworkRequest.NetworkRequest,
      ...maybeRetrieveContextTypes((Sources) => [Sources.UISourceCodeFrame.UISourceCodeFrame])
    ];
  },
  async loadProvider() {
    const Sources = await loadSourcesModule();
    return Sources.SourcesPanel.SourcesPanel.instance();
  },
  experiment: void 0
});
UI.ContextMenu.registerProvider({
  async loadProvider() {
    const Sources = await loadSourcesModule();
    return Sources.WatchExpressionsSidebarPane.WatchExpressionsSidebarPane.instance();
  },
  contextTypes() {
    return [
      ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement,
      ...maybeRetrieveContextTypes((Sources) => [Sources.UISourceCodeFrame.UISourceCodeFrame])
    ];
  },
  experiment: void 0
});
Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Workspace.UISourceCode.UILocation
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.UILocationRevealer();
  }
});
Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Workspace.UISourceCode.UILocationRange
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.UILocationRangeRevealer();
  }
});
Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      SDK.DebuggerModel.Location
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.DebuggerLocationRevealer();
  }
});
Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Workspace.UISourceCode.UISourceCode
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.UISourceCodeRevealer();
  }
});
Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      SDK.DebuggerModel.DebuggerPausedDetails
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SourcesPanel.DebuggerPausedDetailsRevealer();
  }
});
Common.Revealer.registerRevealer({
  contextTypes() {
    return [
      Breakpoints.BreakpointManager.BreakpointLocation
    ];
  },
  destination: Common.Revealer.RevealerDestination.SOURCES_PANEL,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.DebuggerPlugin.BreakpointLocationRevealer();
  }
});
Common.Revealer.registerRevealer({
  contextTypes() {
    return maybeRetrieveContextTypes((Sources) => [Sources.SearchSourcesView.SearchSources]);
  },
  destination: void 0,
  async loadRevealer() {
    const Sources = await loadSourcesModule();
    return new Sources.SearchSourcesView.Revealer();
  }
});
UI.Toolbar.registerToolbarItem({
  actionId: "sources.add-folder-to-workspace",
  location: "files-navigator-toolbar",
  label: i18nLazyString(UIStrings.addFolderManually),
  loadItem: void 0,
  order: void 0,
  separator: void 0
});
UI.Context.registerListener({
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  async loadListener() {
    const Sources = await loadSourcesModule();
    return Sources.BreakpointsView.BreakpointsSidebarController.instance();
  }
});
UI.Context.registerListener({
  contextTypes() {
    return [SDK.DebuggerModel.DebuggerPausedDetails];
  },
  async loadListener() {
    const Sources = await loadSourcesModule();
    return Sources.CallStackSidebarPane.CallStackSidebarPane.instance();
  }
});
UI.Context.registerListener({
  contextTypes() {
    return [SDK.DebuggerModel.CallFrame];
  },
  async loadListener() {
    const Sources = await loadSourcesModule();
    return Sources.ScopeChainSidebarPane.ScopeChainSidebarPane.instance();
  }
});
UI.ContextMenu.registerItem({
  location: "navigatorMenu/default",
  actionId: "quick-open.show",
  order: void 0
});
UI.ContextMenu.registerItem({
  location: "mainMenu/default",
  actionId: "sources.search",
  order: void 0
});
QuickOpen.FilteredListWidget.registerProvider({
  prefix: "@",
  iconName: "symbol",
  async provider() {
    const Sources = await loadSourcesModule();
    return new Sources.OutlineQuickOpen.OutlineQuickOpen();
  },
  helpTitle: i18nLazyString(UIStrings.goToSymbol),
  titlePrefix: i18nLazyString(UIStrings.goTo),
  titleSuggestion: i18nLazyString(UIStrings.symbol)
});
QuickOpen.FilteredListWidget.registerProvider({
  prefix: ":",
  iconName: "colon",
  async provider() {
    const Sources = await loadSourcesModule();
    return new Sources.GoToLineQuickOpen.GoToLineQuickOpen();
  },
  helpTitle: i18nLazyString(UIStrings.goToLine),
  titlePrefix: i18nLazyString(UIStrings.goTo),
  titleSuggestion: i18nLazyString(UIStrings.line)
});
QuickOpen.FilteredListWidget.registerProvider({
  prefix: "",
  iconName: "document",
  async provider() {
    const Sources = await loadSourcesModule();
    return new Sources.OpenFileQuickOpen.OpenFileQuickOpen();
  },
  helpTitle: i18nLazyString(UIStrings.openFile),
  titlePrefix: i18nLazyString(UIStrings.open),
  titleSuggestion: i18nLazyString(UIStrings.file)
});
UI.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Workspace.UISourceCode.UISourceCode,
      SDK.Resource.Resource,
      SDK.NetworkRequest.NetworkRequest
    ];
  },
  async loadProvider() {
    const Sources = await loadSourcesModule();
    return new Sources.PersistenceActions.ContextMenuProvider();
  },
  experiment: void 0
});

// gen/front_end/panels/profiler/profiler-meta.js
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
var loadedProfilerModule;
var UIStrings2 = {
  /**
   * @description Title for the profiler tab
   */
  memory: "Memory",
  /**
   * @description Title of the 'Live Heap Profile' tool in the bottom drawer
   */
  liveHeapProfile: "Live Heap Profile",
  /**
   * @description Title of an action under the Performance category that can be invoked through the Command Menu
   */
  startRecordingHeapAllocations: "Start recording heap allocations",
  /**
   * @description Title of an action under the Performance category that can be invoked through the Command Menu
   */
  stopRecordingHeapAllocations: "Stop recording heap allocations",
  /**
   * @description Title of an action in the live heap profile tool to start with reload
   */
  startRecordingHeapAllocationsAndReload: "Start recording heap allocations and reload the page",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (start/stop recording performance)
   */
  startStopRecording: "Start/stop recording",
  /**
   * @description Command for showing the profiler tab
   */
  showMemory: "Show Memory",
  /**
   * @description Command for showing the 'Live Heap Profile' tool in the bottom drawer
   */
  showLiveHeapProfile: "Show Live Heap Profile",
  /**
   * @description Tooltip text that appears when hovering over the largeicon clear button in the Profiles Panel of a profiler tool
   */
  clearAllProfiles: "Clear all profiles",
  /**
   * @description Tooltip text that appears when hovering over the largeicon download button
   */
  saveProfile: "Save profile\u2026",
  /**
   * @description Tooltip text that appears when hovering over the largeicon load button
   */
  loadProfile: "Load profile\u2026",
  /**
   * @description Command for deleting a profile in the Profiler panel
   */
  deleteProfile: "Delete profile"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/profiler/profiler-meta.ts", UIStrings2);
var i18nLazyString2 = i18n3.i18n.getLazilyComputedLocalizedString.bind(void 0, str_2);
async function loadProfilerModule() {
  if (!loadedProfilerModule) {
    loadedProfilerModule = await import("./../../panels/profiler/profiler.js");
  }
  return loadedProfilerModule;
}
function maybeRetrieveContextTypes2(getClassCallBack) {
  if (loadedProfilerModule === void 0) {
    return [];
  }
  return getClassCallBack(loadedProfilerModule);
}
UI2.ViewManager.registerViewExtension({
  location: "panel",
  id: "heap-profiler",
  commandPrompt: i18nLazyString2(UIStrings2.showMemory),
  title: i18nLazyString2(UIStrings2.memory),
  order: 60,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();
  }
});
UI2.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "live-heap-profile",
  commandPrompt: i18nLazyString2(UIStrings2.showLiveHeapProfile),
  title: i18nLazyString2(UIStrings2.liveHeapProfile),
  persistence: "closeable",
  order: 100,
  async loadView() {
    const Profiler = await loadProfilerModule();
    return Profiler.LiveHeapProfileView.LiveHeapProfileView.instance();
  },
  experiment: "live-heap-profile"
});
UI2.ActionRegistration.registerActionExtension({
  actionId: "live-heap-profile.toggle-recording",
  iconClass: "record-start",
  toggleable: true,
  toggledIconClass: "record-stop",
  toggleWithRedColor: true,
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.LiveHeapProfileView.ActionDelegate();
  },
  category: "MEMORY",
  experiment: "live-heap-profile",
  options: [
    {
      value: true,
      title: i18nLazyString2(UIStrings2.startRecordingHeapAllocations)
    },
    {
      value: false,
      title: i18nLazyString2(UIStrings2.stopRecordingHeapAllocations)
    }
  ]
});
UI2.ActionRegistration.registerActionExtension({
  actionId: "live-heap-profile.start-with-reload",
  iconClass: "refresh",
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.LiveHeapProfileView.ActionDelegate();
  },
  category: "MEMORY",
  experiment: "live-heap-profile",
  title: i18nLazyString2(UIStrings2.startRecordingHeapAllocationsAndReload)
});
UI2.ActionRegistration.registerActionExtension({
  actionId: "profiler.heap-toggle-recording",
  category: "MEMORY",
  iconClass: "record-start",
  title: i18nLazyString2(UIStrings2.startStopRecording),
  toggleable: true,
  toggledIconClass: "record-stop",
  toggleWithRedColor: true,
  contextTypes() {
    return maybeRetrieveContextTypes2((Profiler) => [Profiler.HeapProfilerPanel.HeapProfilerPanel]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+E"
    },
    {
      platform: "mac",
      shortcut: "Meta+E"
    }
  ]
});
UI2.ActionRegistration.registerActionExtension({
  actionId: "profiler.clear-all",
  category: "MEMORY",
  iconClass: "clear",
  contextTypes() {
    return maybeRetrieveContextTypes2((Profiler) => [Profiler.ProfilesPanel.ProfilesPanel]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.ProfilesPanel.ActionDelegate();
  },
  title: i18nLazyString2(UIStrings2.clearAllProfiles)
});
UI2.ActionRegistration.registerActionExtension({
  actionId: "profiler.load-from-file",
  category: "MEMORY",
  iconClass: "import",
  contextTypes() {
    return maybeRetrieveContextTypes2((Profiler) => [Profiler.ProfilesPanel.ProfilesPanel]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.ProfilesPanel.ActionDelegate();
  },
  title: i18nLazyString2(UIStrings2.loadProfile),
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+O"
    },
    {
      platform: "mac",
      shortcut: "Meta+O"
    }
  ]
});
UI2.ActionRegistration.registerActionExtension({
  actionId: "profiler.save-to-file",
  category: "MEMORY",
  iconClass: "download",
  contextTypes() {
    return maybeRetrieveContextTypes2((Profiler) => [Profiler.ProfileHeader.ProfileHeader]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.ProfilesPanel.ActionDelegate();
  },
  title: i18nLazyString2(UIStrings2.saveProfile),
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+S"
    },
    {
      platform: "mac",
      shortcut: "Meta+S"
    }
  ]
});
UI2.ActionRegistration.registerActionExtension({
  actionId: "profiler.delete-profile",
  category: "MEMORY",
  iconClass: "download",
  contextTypes() {
    return maybeRetrieveContextTypes2((Profiler) => [Profiler.ProfileHeader.ProfileHeader]);
  },
  async loadActionDelegate() {
    const Profiler = await loadProfilerModule();
    return new Profiler.ProfilesPanel.ActionDelegate();
  },
  title: i18nLazyString2(UIStrings2.deleteProfile)
});
UI2.ContextMenu.registerProvider({
  contextTypes() {
    return [
      SDK2.RemoteObject.RemoteObject
    ];
  },
  async loadProvider() {
    const Profiler = await loadProfilerModule();
    return Profiler.HeapProfilerPanel.HeapProfilerPanel.instance();
  },
  experiment: void 0
});
UI2.ContextMenu.registerItem({
  location: "profilerMenu/default",
  actionId: "profiler.save-to-file",
  order: 10
});
UI2.ContextMenu.registerItem({
  location: "profilerMenu/default",
  actionId: "profiler.delete-profile",
  order: 11
});

// gen/front_end/panels/console/console-meta.js
import * as Common2 from "./../../core/common/common.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
var UIStrings3 = {
  /**
   * @description Title of the Console tool
   */
  console: "Console",
  /**
   * @description Title of an action that shows the console.
   */
  showConsole: "Show Console",
  /**
   * @description Title of an action that toggles the console.
   */
  toggleConsole: "Toggle Console",
  /**
   * @description Text to clear the console
   */
  clearConsole: "Clear console",
  /**
   * @description Title of an action in the console tool to clear
   */
  clearConsoleHistory: "Clear console history",
  /**
   * @description Title of an action in the console tool to create pin. A live expression is code that the user can enter into the console and it will be pinned in the UI. Live expressions are constantly evaluated as the user interacts with the console (hence 'live').
   */
  createLiveExpression: "Create live expression",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  hideNetworkMessages: "Hide network messages",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  showNetworkMessages: "Show network messages",
  /**
   * @description Alternative title text of a setting in Console View of the Console panel
   */
  selectedContextOnly: "Selected context only",
  /**
   * @description Tooltip text that appears on the setting when hovering over it in Console View of the Console panel
   */
  onlyShowMessagesFromTheCurrent: "Only show messages from the current context (`top`, `iframe`, `worker`, extension)",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  showMessagesFromAllContexts: "Show messages from all contexts",
  /**
   * @description Title of a setting under the Console category
   */
  timestamps: "Timestamps",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  showTimestamps: "Show timestamps",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  hideTimestamps: "Hide timestamps",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  autocompleteFromHistory: "Autocomplete from history",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  doNotAutocompleteFromHistory: "Do not autocomplete from history",
  /**
   * @description Title of a setting under the Console category that controls whether to accept autocompletion with Enter.
   */
  autocompleteOnEnter: "Accept autocomplete suggestion on Enter",
  /**
   * @description Title of a setting under the Console category that controls whether to accept autocompletion with Enter.
   */
  doNotAutocompleteOnEnter: "Do not accept autocomplete suggestion on Enter",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  groupSimilarMessagesInConsole: "Group similar messages in console",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  doNotGroupSimilarMessagesIn: "Do not group similar messages in console",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  showCorsErrorsInConsole: "Show `CORS` errors in console",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  doNotShowCorsErrorsIn: "Do not show `CORS` errors in console",
  /**
   * @description Title of a setting under the Console category in Settings
   */
  eagerEvaluation: "Eager evaluation",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  eagerlyEvaluateConsolePromptText: "Eagerly evaluate console prompt text",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  doNotEagerlyEvaluateConsole: "Do not eagerly evaluate console prompt text",
  /**
   * @description Allows code that is executed in the console to do things that usually are only allowed if triggered by a user action
   */
  evaluateTriggersUserActivation: "Treat code evaluation as user action",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  treatEvaluationAsUserActivation: "Treat evaluation as user activation",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  doNotTreatEvaluationAsUser: "Do not treat evaluation as user activation",
  /**
   * @description Title of a setting under the Console category in Settings that controls whether `console.trace()` messages appear expanded by default.
   */
  expandConsoleTraceMessagesByDefault: "Automatically expand `console.trace()` messages",
  /**
   * @description Title of a setting under the Console category in Settings that controls whether `console.trace()` messages appear collapsed by default.
   */
  collapseConsoleTraceMessagesByDefault: "Do not automatically expand `console.trace()` messages",
  /**
   * @description Title of a setting under the Console category in Settings that controls whether AI summaries should
   * be shown for console warnings/errors.
   */
  showConsoleInsightTeasers: "Show AI summaries for console messages"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/console/console-meta.ts", UIStrings3);
var i18nLazyString3 = i18n5.i18n.getLazilyComputedLocalizedString.bind(void 0, str_3);
var loadedConsoleModule;
async function loadConsoleModule() {
  if (!loadedConsoleModule) {
    loadedConsoleModule = await import("./../../panels/console/console.js");
  }
  return loadedConsoleModule;
}
function maybeRetrieveContextTypes3(getClassCallBack) {
  if (loadedConsoleModule === void 0) {
    return [];
  }
  return getClassCallBack(loadedConsoleModule);
}
UI3.ViewManager.registerViewExtension({
  location: "panel",
  id: "console",
  title: i18nLazyString3(UIStrings3.console),
  commandPrompt: i18nLazyString3(UIStrings3.showConsole),
  order: 20,
  async loadView() {
    const Console22 = await loadConsoleModule();
    return Console22.ConsolePanel.ConsolePanel.instance();
  }
});
UI3.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "console-view",
  title: i18nLazyString3(UIStrings3.console),
  commandPrompt: i18nLazyString3(UIStrings3.showConsole),
  persistence: "permanent",
  order: 0,
  async loadView() {
    const Console22 = await loadConsoleModule();
    return Console22.ConsolePanel.WrapperView.instance();
  }
});
UI3.ActionRegistration.registerActionExtension({
  actionId: "console.toggle",
  category: "CONSOLE",
  title: i18nLazyString3(UIStrings3.toggleConsole),
  async loadActionDelegate() {
    const Console22 = await loadConsoleModule();
    return new Console22.ConsoleView.ActionDelegate();
  },
  bindings: [
    {
      shortcut: "Ctrl+`",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
UI3.ActionRegistration.registerActionExtension({
  actionId: "console.clear",
  category: "CONSOLE",
  title: i18nLazyString3(UIStrings3.clearConsole),
  iconClass: "clear",
  async loadActionDelegate() {
    const Console22 = await loadConsoleModule();
    return new Console22.ConsoleView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes3((Console22) => [Console22.ConsoleView.ConsoleView]);
  },
  bindings: [
    {
      shortcut: "Ctrl+L"
    },
    {
      shortcut: "Meta+K",
      platform: "mac"
    }
  ]
});
UI3.ActionRegistration.registerActionExtension({
  actionId: "console.clear.history",
  category: "CONSOLE",
  title: i18nLazyString3(UIStrings3.clearConsoleHistory),
  async loadActionDelegate() {
    const Console22 = await loadConsoleModule();
    return new Console22.ConsoleView.ActionDelegate();
  }
});
UI3.ActionRegistration.registerActionExtension({
  actionId: "console.create-pin",
  category: "CONSOLE",
  title: i18nLazyString3(UIStrings3.createLiveExpression),
  iconClass: "eye",
  async loadActionDelegate() {
    const Console22 = await loadConsoleModule();
    return new Console22.ConsoleView.ActionDelegate();
  }
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString3(UIStrings3.hideNetworkMessages),
  settingName: "hide-network-messages",
  settingType: "boolean",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString3(UIStrings3.hideNetworkMessages)
    },
    {
      value: false,
      title: i18nLazyString3(UIStrings3.showNetworkMessages)
    }
  ]
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString3(UIStrings3.selectedContextOnly),
  settingName: "selected-context-filter-enabled",
  settingType: "boolean",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString3(UIStrings3.onlyShowMessagesFromTheCurrent)
    },
    {
      value: false,
      title: i18nLazyString3(UIStrings3.showMessagesFromAllContexts)
    }
  ]
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString3(UIStrings3.timestamps),
  settingName: "console-timestamps-enabled",
  settingType: "boolean",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString3(UIStrings3.showTimestamps)
    },
    {
      value: false,
      title: i18nLazyString3(UIStrings3.hideTimestamps)
    }
  ]
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  title: i18nLazyString3(UIStrings3.autocompleteFromHistory),
  settingName: "console-history-autocomplete",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString3(UIStrings3.autocompleteFromHistory)
    },
    {
      value: false,
      title: i18nLazyString3(UIStrings3.doNotAutocompleteFromHistory)
    }
  ]
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString3(UIStrings3.autocompleteOnEnter),
  settingName: "console-autocomplete-on-enter",
  settingType: "boolean",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString3(UIStrings3.autocompleteOnEnter)
    },
    {
      value: false,
      title: i18nLazyString3(UIStrings3.doNotAutocompleteOnEnter)
    }
  ]
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString3(UIStrings3.groupSimilarMessagesInConsole),
  settingName: "console-group-similar",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString3(UIStrings3.groupSimilarMessagesInConsole)
    },
    {
      value: false,
      title: i18nLazyString3(UIStrings3.doNotGroupSimilarMessagesIn)
    }
  ]
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  title: i18nLazyString3(UIStrings3.showCorsErrorsInConsole),
  settingName: "console-shows-cors-errors",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString3(UIStrings3.showCorsErrorsInConsole)
    },
    {
      value: false,
      title: i18nLazyString3(UIStrings3.doNotShowCorsErrorsIn)
    }
  ]
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString3(UIStrings3.eagerEvaluation),
  settingName: "console-eager-eval",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString3(UIStrings3.eagerlyEvaluateConsolePromptText)
    },
    {
      value: false,
      title: i18nLazyString3(UIStrings3.doNotEagerlyEvaluateConsole)
    }
  ]
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString3(UIStrings3.evaluateTriggersUserActivation),
  settingName: "console-user-activation-eval",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString3(UIStrings3.treatEvaluationAsUserActivation)
    },
    {
      value: false,
      title: i18nLazyString3(UIStrings3.doNotTreatEvaluationAsUser)
    }
  ]
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString3(UIStrings3.expandConsoleTraceMessagesByDefault),
  settingName: "console-trace-expand",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString3(UIStrings3.expandConsoleTraceMessagesByDefault)
    },
    {
      value: false,
      title: i18nLazyString3(UIStrings3.collapseConsoleTraceMessagesByDefault)
    }
  ]
});
Common2.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString3(UIStrings3.showConsoleInsightTeasers),
  settingName: "console-insight-teasers-enabled",
  settingType: "boolean",
  defaultValue: true
});
Common2.Revealer.registerRevealer({
  contextTypes() {
    return [
      Common2.Console.Console
    ];
  },
  destination: void 0,
  async loadRevealer() {
    const Console22 = await loadConsoleModule();
    return new Console22.ConsolePanel.ConsoleRevealer();
  }
});

// gen/front_end/panels/coverage/coverage-meta.js
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
var UIStrings4 = {
  /**
   * @description Title of the 'Coverage' tool in the bottom drawer
   */
  coverage: "Coverage",
  /**
   * @description Command for showing the 'Coverage' tool in the bottom drawer
   */
  showCoverage: "Show Coverage",
  /**
   * @description Title of an action under the Performance category that can be invoked through the Command Menu
   */
  instrumentCoverage: "Instrument coverage",
  /**
   * @description Title of an action under the Performance category that can be invoked through the Command Menu
   */
  stopInstrumentingCoverageAndShow: "Stop instrumenting coverage and show results",
  /**
   * @description Title of an action in the coverage tool to start with reload
   */
  startInstrumentingCoverageAnd: "Start instrumenting coverage and reload page",
  /**
   * @description Title of an action in the Coverage tool to clear all data.
   */
  clearCoverage: "Clear coverage",
  /**
   * @description Title of an action in the Coverage tool to export the data.
   */
  exportCoverage: "Export coverage"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/coverage/coverage-meta.ts", UIStrings4);
var i18nLazyString4 = i18n7.i18n.getLazilyComputedLocalizedString.bind(void 0, str_4);
var loadedCoverageModule;
async function loadCoverageModule() {
  if (!loadedCoverageModule) {
    loadedCoverageModule = await import("./../../panels/coverage/coverage.js");
  }
  return loadedCoverageModule;
}
function maybeRetrieveContextTypes4(getClassCallBack) {
  if (loadedCoverageModule === void 0) {
    return [];
  }
  return getClassCallBack(loadedCoverageModule);
}
UI4.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "coverage",
  title: i18nLazyString4(UIStrings4.coverage),
  commandPrompt: i18nLazyString4(UIStrings4.showCoverage),
  persistence: "closeable",
  order: 100,
  async loadView() {
    const Coverage = await loadCoverageModule();
    return Coverage.CoverageView.CoverageView.instance();
  }
});
UI4.ActionRegistration.registerActionExtension({
  actionId: "coverage.toggle-recording",
  iconClass: "record-start",
  toggleable: true,
  toggledIconClass: "record-stop",
  toggleWithRedColor: true,
  async loadActionDelegate() {
    const Coverage = await loadCoverageModule();
    return new Coverage.CoverageView.ActionDelegate();
  },
  category: "PERFORMANCE",
  options: [
    {
      value: true,
      title: i18nLazyString4(UIStrings4.instrumentCoverage)
    },
    {
      value: false,
      title: i18nLazyString4(UIStrings4.stopInstrumentingCoverageAndShow)
    }
  ]
});
UI4.ActionRegistration.registerActionExtension({
  actionId: "coverage.start-with-reload",
  iconClass: "refresh",
  async loadActionDelegate() {
    const Coverage = await loadCoverageModule();
    return new Coverage.CoverageView.ActionDelegate();
  },
  category: "PERFORMANCE",
  title: i18nLazyString4(UIStrings4.startInstrumentingCoverageAnd)
});
UI4.ActionRegistration.registerActionExtension({
  actionId: "coverage.clear",
  iconClass: "clear",
  category: "PERFORMANCE",
  title: i18nLazyString4(UIStrings4.clearCoverage),
  async loadActionDelegate() {
    const Coverage = await loadCoverageModule();
    return new Coverage.CoverageView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes4((Coverage) => [Coverage.CoverageView.CoverageView]);
  }
});
UI4.ActionRegistration.registerActionExtension({
  actionId: "coverage.export",
  iconClass: "download",
  category: "PERFORMANCE",
  title: i18nLazyString4(UIStrings4.exportCoverage),
  async loadActionDelegate() {
    const Coverage = await loadCoverageModule();
    return new Coverage.CoverageView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes4((Coverage) => [Coverage.CoverageView.CoverageView]);
  }
});

// gen/front_end/panels/changes/changes-meta.js
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
var loadedChangesModule;
var UIStrings5 = {
  /**
   * @description Title of the 'Changes' tool in the bottom drawer
   */
  changes: "Changes",
  /**
   * @description Command for showing the 'Changes' tool in the bottom drawer
   */
  showChanges: "Show Changes"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/changes/changes-meta.ts", UIStrings5);
var i18nLazyString5 = i18n9.i18n.getLazilyComputedLocalizedString.bind(void 0, str_5);
async function loadChangesModule() {
  if (!loadedChangesModule) {
    loadedChangesModule = await import("./../../panels/changes/changes.js");
  }
  return loadedChangesModule;
}
UI5.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "changes.changes",
  title: i18nLazyString5(UIStrings5.changes),
  commandPrompt: i18nLazyString5(UIStrings5.showChanges),
  persistence: "closeable",
  async loadView() {
    const Changes = await loadChangesModule();
    return new Changes.ChangesView.ChangesView();
  }
});

// gen/front_end/panels/linear_memory_inspector/linear_memory_inspector-meta.js
import * as Common3 from "./../../core/common/common.js";
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as ObjectUI2 from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
var UIStrings6 = {
  /**
   * @description Title of the Linear Memory inspector tool
   */
  memoryInspector: "Memory inspector",
  /**
   * @description Command for showing the 'Memory inspector' tool
   */
  showMemoryInspector: "Show Memory inspector"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/linear_memory_inspector/linear_memory_inspector-meta.ts", UIStrings6);
var i18nLazyString6 = i18n11.i18n.getLazilyComputedLocalizedString.bind(void 0, str_6);
var loadedLinearMemoryInspectorModule;
async function loadLinearMemoryInspectorModule() {
  if (!loadedLinearMemoryInspectorModule) {
    loadedLinearMemoryInspectorModule = await import("./../../panels/linear_memory_inspector/linear_memory_inspector.js");
  }
  return loadedLinearMemoryInspectorModule;
}
UI6.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "linear-memory-inspector",
  title: i18nLazyString6(UIStrings6.memoryInspector),
  commandPrompt: i18nLazyString6(UIStrings6.showMemoryInspector),
  order: 100,
  persistence: "closeable",
  async loadView() {
    const LinearMemoryInspector = await loadLinearMemoryInspectorModule();
    return LinearMemoryInspector.LinearMemoryInspectorPane.LinearMemoryInspectorPane.instance();
  }
});
UI6.ContextMenu.registerProvider({
  async loadProvider() {
    const LinearMemoryInspector = await loadLinearMemoryInspectorModule();
    return LinearMemoryInspector.LinearMemoryInspectorController.LinearMemoryInspectorController.instance();
  },
  experiment: void 0,
  contextTypes() {
    return [
      ObjectUI2.ObjectPropertiesSection.ObjectPropertyTreeElement
    ];
  }
});
Common3.Revealer.registerRevealer({
  contextTypes() {
    return [SDK3.RemoteObject.LinearMemoryInspectable];
  },
  destination: Common3.Revealer.RevealerDestination.MEMORY_INSPECTOR_PANEL,
  async loadRevealer() {
    const LinearMemoryInspector = await loadLinearMemoryInspectorModule();
    return LinearMemoryInspector.LinearMemoryInspectorController.LinearMemoryInspectorController.instance();
  }
});

// gen/front_end/panels/settings/settings-meta.js
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as UI7 from "./../../ui/legacy/legacy.js";
import * as Common4 from "./../../core/common/common.js";
import * as i18n32 from "./../../core/i18n/i18n.js";
import * as Root3 from "./../../core/root/root.js";
import * as UI22 from "./../../ui/legacy/legacy.js";
var UIStrings7 = {
  /**
   * @description Title of the Devices tab/tool. Devices refers to e.g. phones/tablets.
   */
  devices: "Devices",
  /**
   * @description Command that opens the device emulation view.
   */
  showDevices: "Show Devices"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/settings/emulation/emulation-meta.ts", UIStrings7);
var i18nLazyString7 = i18n13.i18n.getLazilyComputedLocalizedString.bind(void 0, str_7);
var loadedEmulationModule;
async function loadEmulationModule() {
  if (!loadedEmulationModule) {
    loadedEmulationModule = await import("./../../panels/settings/emulation/emulation.js");
  }
  return loadedEmulationModule;
}
UI7.ViewManager.registerViewExtension({
  location: "settings-view",
  commandPrompt: i18nLazyString7(UIStrings7.showDevices),
  title: i18nLazyString7(UIStrings7.devices),
  order: 30,
  async loadView() {
    const Emulation = await loadEmulationModule();
    return new Emulation.DevicesSettingsTab.DevicesSettingsTab();
  },
  id: "devices",
  settings: [
    "standard-emulated-device-list",
    "custom-emulated-device-list"
  ],
  iconName: "devices"
});
var UIStrings22 = {
  /**
   * @description Text for keyboard shortcuts
   */
  shortcuts: "Shortcuts",
  /**
   * @description Text in Settings Screen of the Settings
   */
  preferences: "Preferences",
  /**
   * @description Text in Settings Screen of the Settings
   */
  experiments: "Experiments",
  /**
   * @description Title of Ignore list settings
   */
  ignoreList: "Ignore list",
  /**
   * @description Command for showing the keyboard shortcuts in Settings
   */
  showShortcuts: "Show Shortcuts",
  /**
   * @description Command for showing the preference tab in the Settings Screen
   */
  showPreferences: "Show Preferences",
  /**
   * @description Command for showing the experiments tab in the Settings Screen
   */
  showExperiments: "Show Experiments",
  /**
   * @description Command for showing the Ignore list settings
   */
  showIgnoreList: "Show Ignore list",
  /**
   * @description Name of the Settings view
   */
  settings: "Settings",
  /**
   * @description Text for the documentation of something
   */
  documentation: "Documentation",
  /**
   * @description Text for AI innovation settings
   */
  aiInnovations: "AI innovations",
  /**
   * @description Command for showing the AI innovation settings
   */
  showAiInnovations: "Show AI innovations",
  /**
   * @description Text of a DOM element in Workspace Settings Tab of the Workspace settings in Settings
   */
  workspace: "Workspace",
  /**
   * @description Command for showing the Workspace tool in Settings
   */
  showWorkspace: "Show Workspace settings"
};
var str_22 = i18n32.i18n.registerUIStrings("panels/settings/settings-meta.ts", UIStrings22);
var i18nLazyString22 = i18n32.i18n.getLazilyComputedLocalizedString.bind(void 0, str_22);
var loadedSettingsModule;
async function loadSettingsModule() {
  if (!loadedSettingsModule) {
    loadedSettingsModule = await import("./../../panels/settings/settings.js");
  }
  return loadedSettingsModule;
}
UI22.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "preferences",
  title: i18nLazyString22(UIStrings22.preferences),
  commandPrompt: i18nLazyString22(UIStrings22.showPreferences),
  order: 0,
  async loadView() {
    const Settings22 = await loadSettingsModule();
    return new Settings22.SettingsScreen.GenericSettingsTab();
  },
  iconName: "gear"
});
UI22.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "workspace",
  title: i18nLazyString22(UIStrings22.workspace),
  commandPrompt: i18nLazyString22(UIStrings22.showWorkspace),
  order: 1,
  async loadView() {
    const Settings22 = await loadSettingsModule();
    return new Settings22.WorkspaceSettingsTab.WorkspaceSettingsTab();
  },
  iconName: "folder"
});
UI22.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "chrome-ai",
  title: i18nLazyString22(UIStrings22.aiInnovations),
  commandPrompt: i18nLazyString22(UIStrings22.showAiInnovations),
  order: 2,
  async loadView() {
    const Settings22 = await loadSettingsModule();
    return new Settings22.AISettingsTab.AISettingsTab();
  },
  iconName: "button-magic",
  settings: ["console-insights-enabled"],
  condition: (config) => {
    return (config?.aidaAvailability?.enabled && (config?.devToolsConsoleInsights?.enabled || config?.devToolsFreestyler?.enabled)) ?? false;
  }
});
UI22.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "experiments",
  title: i18nLazyString22(UIStrings22.experiments),
  commandPrompt: i18nLazyString22(UIStrings22.showExperiments),
  order: 3,
  experiment: "*",
  async loadView() {
    const Settings22 = await loadSettingsModule();
    return new Settings22.SettingsScreen.ExperimentsSettingsTab();
  },
  iconName: "experiment"
});
UI22.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "blackbox",
  title: i18nLazyString22(UIStrings22.ignoreList),
  commandPrompt: i18nLazyString22(UIStrings22.showIgnoreList),
  order: 4,
  async loadView() {
    const Settings22 = await loadSettingsModule();
    return new Settings22.FrameworkIgnoreListSettingsTab.FrameworkIgnoreListSettingsTab();
  },
  iconName: "clear-list"
});
UI22.ViewManager.registerViewExtension({
  location: "settings-view",
  id: "keybinds",
  title: i18nLazyString22(UIStrings22.shortcuts),
  commandPrompt: i18nLazyString22(UIStrings22.showShortcuts),
  order: 100,
  async loadView() {
    const Settings22 = await loadSettingsModule();
    return new Settings22.KeybindsSettingsTab.KeybindsSettingsTab();
  },
  iconName: "keyboard"
});
UI22.ActionRegistration.registerActionExtension({
  category: "SETTINGS",
  actionId: "settings.show",
  title: i18nLazyString22(UIStrings22.settings),
  async loadActionDelegate() {
    const Settings22 = await loadSettingsModule();
    return new Settings22.SettingsScreen.ActionDelegate();
  },
  iconClass: "gear",
  bindings: [
    {
      shortcut: "F1",
      keybindSets: [
        "devToolsDefault"
      ]
    },
    {
      shortcut: "Shift+?"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+,",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+,",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI22.ActionRegistration.registerActionExtension({
  category: "SETTINGS",
  actionId: "settings.documentation",
  title: i18nLazyString22(UIStrings22.documentation),
  async loadActionDelegate() {
    const Settings22 = await loadSettingsModule();
    return new Settings22.SettingsScreen.ActionDelegate();
  }
});
UI22.ActionRegistration.registerActionExtension({
  category: "SETTINGS",
  actionId: "settings.shortcuts",
  title: i18nLazyString22(UIStrings22.showShortcuts),
  async loadActionDelegate() {
    const Settings22 = await loadSettingsModule();
    return new Settings22.SettingsScreen.ActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+K Ctrl+S",
      keybindSets: [
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+K Meta+S",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI22.ViewManager.registerLocationResolver({
  name: "settings-view",
  category: "SETTINGS",
  async loadResolver() {
    const Settings22 = await loadSettingsModule();
    return Settings22.SettingsScreen.SettingsScreen.instance();
  }
});
Common4.Revealer.registerRevealer({
  contextTypes() {
    return [
      Common4.Settings.Setting,
      Root3.Runtime.Experiment
    ];
  },
  destination: void 0,
  async loadRevealer() {
    const Settings22 = await loadSettingsModule();
    return new Settings22.SettingsScreen.Revealer();
  }
});
UI22.ContextMenu.registerItem({
  location: "mainMenu/footer",
  actionId: "settings.shortcuts",
  order: void 0
});
UI22.ContextMenu.registerItem({
  location: "mainMenuHelp/default",
  actionId: "settings.documentation",
  order: void 0
});

// gen/front_end/panels/protocol_monitor/protocol_monitor-meta.js
import * as i18n16 from "./../../core/i18n/i18n.js";
import * as Root4 from "./../../core/root/root.js";
import * as UI8 from "./../../ui/legacy/legacy.js";
var UIStrings8 = {
  /**
   * @description Title of the 'Protocol monitor' tool in the bottom drawer. This is a tool for
   * viewing and inspecting 'protocol' messages which are sent/received by DevTools. 'protocol' here
   * could be left untranslated as this refers to the Chrome DevTools Protocol (CDP) which is a
   * specific API name.
   */
  protocolMonitor: "Protocol monitor",
  /**
   * @description Command for showing the 'Protocol monitor' tool in the bottom drawer
   */
  showProtocolMonitor: "Show Protocol monitor"
};
var str_8 = i18n16.i18n.registerUIStrings("panels/protocol_monitor/protocol_monitor-meta.ts", UIStrings8);
var i18nLazyString8 = i18n16.i18n.getLazilyComputedLocalizedString.bind(void 0, str_8);
var loadedProtocolMonitorModule;
async function loadProtocolMonitorModule() {
  if (!loadedProtocolMonitorModule) {
    loadedProtocolMonitorModule = await import("./../../panels/protocol_monitor/protocol_monitor.js");
  }
  return loadedProtocolMonitorModule;
}
UI8.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "protocol-monitor",
  title: i18nLazyString8(UIStrings8.protocolMonitor),
  commandPrompt: i18nLazyString8(UIStrings8.showProtocolMonitor),
  order: 100,
  persistence: "closeable",
  async loadView() {
    const ProtocolMonitor = await loadProtocolMonitorModule();
    return new ProtocolMonitor.ProtocolMonitor.ProtocolMonitorImpl();
  },
  experiment: "protocol-monitor"
});

// gen/front_end/models/persistence/persistence-meta.js
import * as Common5 from "./../../core/common/common.js";
import * as i18n18 from "./../../core/i18n/i18n.js";
var UIStrings9 = {
  /**
   * @description Title of a setting under the Persistence category in Settings
   */
  enableLocalOverrides: "Enable Local Overrides",
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu
   */
  interception: "interception",
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu
   */
  override: "override",
  /**
   * @description A tag of Group Network by frame setting that can be searched in the command menu
   */
  network: "network",
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu
   */
  rewrite: "rewrite",
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu.
   *Noun for network request.
   */
  request: "request",
  /**
   * @description Title of a setting under the Persistence category that can be invoked through the Command Menu
   */
  enableOverrideNetworkRequests: "Enable override network requests",
  /**
   * @description Title of a setting under the Persistence category that can be invoked through the Command Menu
   */
  disableOverrideNetworkRequests: "Disable override network requests"
};
var str_9 = i18n18.i18n.registerUIStrings("models/persistence/persistence-meta.ts", UIStrings9);
var i18nLazyString9 = i18n18.i18n.getLazilyComputedLocalizedString.bind(void 0, str_9);
Common5.Settings.registerSettingExtension({
  category: "PERSISTENCE",
  title: i18nLazyString9(UIStrings9.enableLocalOverrides),
  settingName: "persistence-network-overrides-enabled",
  settingType: "boolean",
  defaultValue: false,
  tags: [
    i18nLazyString9(UIStrings9.interception),
    i18nLazyString9(UIStrings9.override),
    i18nLazyString9(UIStrings9.network),
    i18nLazyString9(UIStrings9.rewrite),
    i18nLazyString9(UIStrings9.request)
  ],
  options: [
    {
      value: true,
      title: i18nLazyString9(UIStrings9.enableOverrideNetworkRequests)
    },
    {
      value: false,
      title: i18nLazyString9(UIStrings9.disableOverrideNetworkRequests)
    }
  ]
});

// gen/front_end/models/logs/logs-meta.js
import * as Common6 from "./../../core/common/common.js";
import * as i18n20 from "./../../core/i18n/i18n.js";
var UIStrings10 = {
  /**
   * @description Text to preserve the log after refreshing
   */
  preserveLog: "Preserve log",
  /**
   * @description A term that can be used to search in the command menu, and will find the search
   * result 'Preserve log on page reload / navigation'. This is an additional search term to help
   * user find the setting even when they don't know the exact name of it.
   */
  preserve: "preserve",
  /**
   * @description A term that can be used to search in the command menu, and will find the search
   * result 'Preserve log on page reload / navigation'. This is an additional search term to help
   * user find the setting even when they don't know the exact name of it.
   */
  clear: "clear",
  /**
   * @description A term that can be used to search in the command menu, and will find the search
   * result 'Preserve log on page reload / navigation'. This is an additional search term to help
   * user find the setting even when they don't know the exact name of it.
   */
  reset: "reset",
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  preserveLogOnPageReload: "Preserve log on page reload / navigation",
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  doNotPreserveLogOnPageReload: "Do not preserve log on page reload / navigation",
  /**
   * @description Title of an action in the network tool to toggle recording
   */
  recordNetworkLog: "Record network log"
};
var str_10 = i18n20.i18n.registerUIStrings("models/logs/logs-meta.ts", UIStrings10);
var i18nLazyString10 = i18n20.i18n.getLazilyComputedLocalizedString.bind(void 0, str_10);
Common6.Settings.registerSettingExtension({
  category: "NETWORK",
  title: i18nLazyString10(UIStrings10.preserveLog),
  settingName: "network-log.preserve-log",
  settingType: "boolean",
  defaultValue: false,
  tags: [
    i18nLazyString10(UIStrings10.preserve),
    i18nLazyString10(UIStrings10.clear),
    i18nLazyString10(UIStrings10.reset)
  ],
  options: [
    {
      value: true,
      title: i18nLazyString10(UIStrings10.preserveLogOnPageReload)
    },
    {
      value: false,
      title: i18nLazyString10(UIStrings10.doNotPreserveLogOnPageReload)
    }
  ]
});
Common6.Settings.registerSettingExtension({
  category: "NETWORK",
  title: i18nLazyString10(UIStrings10.recordNetworkLog),
  settingName: "network-log.record-log",
  settingType: "boolean",
  defaultValue: true,
  storageType: "Session"
});

// gen/front_end/entrypoints/main/main-meta.js
import * as Common7 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n22 from "./../../core/i18n/i18n.js";
import * as Root5 from "./../../core/root/root.js";
import * as SDK4 from "./../../core/sdk/sdk.js";
import * as Workspace2 from "./../../models/workspace/workspace.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI9 from "./../../ui/legacy/legacy.js";
var UIStrings11 = {
  /**
   * @description Text in Main
   */
  focusDebuggee: "Focus page",
  /**
   * @description Text in the Shortcuts page in settings to explain a keyboard shortcut
   */
  toggleDrawer: "Toggle drawer",
  /**
   * @description Title of an action that navigates to the next panel
   */
  nextPanel: "Next panel",
  /**
   * @description Title of an action that navigates to the previous panel
   */
  previousPanel: "Previous panel",
  /**
   * @description Title of an action that reloads the DevTools
   */
  reloadDevtools: "Reload DevTools",
  /**
   * @description Title of an action in the main tool to toggle dock
   */
  restoreLastDockPosition: "Restore last dock position",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (zoom in)
   */
  zoomIn: "Zoom in",
  /**
   * @description Text in the Shortcuts page to explain a keyboard shortcut (zoom out)
   */
  zoomOut: "Zoom out",
  /**
   * @description Title of an action that reset the zoom level to its default
   */
  resetZoomLevel: "Reset zoom level",
  /**
   * @description Title of an action to search in panel
   */
  searchInPanel: "Search in panel",
  /**
   * @description Title of an action that cancels the current search
   */
  cancelSearch: "Cancel search",
  /**
   * @description Title of an action that finds the next search result
   */
  findNextResult: "Find next result",
  /**
   * @description Title of an action to find the previous search result
   */
  findPreviousResult: "Find previous result",
  /**
   * @description Title of a setting under the Appearance category in Settings
   */
  theme: "Theme:",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  switchToBrowserPreferredTheme: "Switch to browser's preferred theme",
  /**
   * @description A drop-down menu option to switch to the same (light or dark) theme as the browser
   */
  autoTheme: "Auto",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  switchToLightTheme: "Switch to light theme",
  /**
   * @description A drop-down menu option to switch to light theme
   */
  lightCapital: "Light",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  switchToDarkTheme: "Switch to dark theme",
  /**
   * @description A drop-down menu option to switch to dark theme
   */
  darkCapital: "Dark",
  /**
   * @description A tag of theme preference settings that can be searched in the command menu
   */
  darkLower: "dark",
  /**
   * @description A tag of theme preference settings that can be searched in the command menu
   */
  lightLower: "light",
  /**
   * @description Title of a setting under the Appearance category in Settings
   */
  panelLayout: "Panel layout:",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  useHorizontalPanelLayout: "Use horizontal panel layout",
  /**
   * @description A drop-down menu option to use horizontal panel layout
   */
  horizontal: "horizontal",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  useVerticalPanelLayout: "Use vertical panel layout",
  /**
   * @description A drop-down menu option to use vertical panel layout
   */
  vertical: "vertical",
  /**
   * @description Title of a setting under the Appearance category that can be invoked through the Command Menu
   */
  useAutomaticPanelLayout: "Use automatic panel layout",
  /**
   * @description Text short for automatic
   */
  auto: "auto",
  /**
   * @description Title of a setting under the Appearance category in Settings
   */
  enableCtrlShortcutToSwitchPanels: "Enable Ctrl + 1-9 shortcut to switch panels",
  /**
   * @description (Mac only) Title of a setting under the Appearance category in Settings
   */
  enableShortcutToSwitchPanels: "Enable \u2318 + 1-9 shortcut to switch panels",
  /**
   * @description A drop-down menu option to dock to right
   */
  right: "Right",
  /**
   * @description Text to dock the DevTools to the right of the browser tab
   */
  dockToRight: "Dock to right",
  /**
   * @description A drop-down menu option to dock to bottom
   */
  bottom: "Bottom",
  /**
   * @description Text to dock the DevTools to the bottom of the browser tab
   */
  dockToBottom: "Dock to bottom",
  /**
   * @description A drop-down menu option to dock to left
   */
  left: "Left",
  /**
   * @description Text to dock the DevTools to the left of the browser tab
   */
  dockToLeft: "Dock to left",
  /**
   * @description A drop-down menu option to undock into separate window
   */
  undocked: "Undocked",
  /**
   * @description Text to undock the DevTools
   */
  undockIntoSeparateWindow: "Undock into separate window",
  /**
   * @description Name of the default set of DevTools keyboard shortcuts
   */
  devtoolsDefault: "DevTools (Default)",
  /**
   * @description Title of the language setting that allows users to switch the locale
   * in which DevTools is presented.
   */
  language: "Language:",
  /**
   * @description Users can choose this option when picking the language in which
   * DevTools is presented. Choosing this option means that the DevTools language matches
   * Chrome's UI language.
   */
  browserLanguage: "Browser UI language",
  /**
   * @description Label for a checkbox in the settings UI. Allows developers to opt-in/opt-out
   * of saving settings to their Google account.
   */
  saveSettings: "Save `DevTools` settings to your `Google` account",
  /**
   * @description Label for a checkbox in the settings UI. Allows developers to opt-in/opt-out
   * of receiving Google Developer Program (GDP) badges based on their activity in Chrome DevTools.
   */
  earnBadges: "Earn badges",
  /**
   * @description A command available in the command menu to perform searches, for example in the
   * elements panel, as user types, rather than only when they press Enter.
   */
  searchAsYouTypeSetting: "Search as you type",
  /**
   * @description A command available in the command menu to perform searches, for example in the
   * elements panel, as user types, rather than only when they press Enter.
   */
  searchAsYouTypeCommand: "Enable search as you type",
  /**
   * @description A command available in the command menu to perform searches, for example in the
   * elements panel, only when the user presses Enter.
   */
  searchOnEnterCommand: "Disable search as you type (press Enter to search)",
  /**
   * @description Label of a checkbox under the Appearance category in Settings. Allows developers
   * to opt-in / opt-out of syncing DevTools' color theme with Chrome's color theme.
   */
  matchChromeColorScheme: "Match Chrome color scheme",
  /**
   * @description Tooltip for the learn more link of the Match Chrome color scheme Setting.
   */
  matchChromeColorSchemeDocumentation: "Match DevTools colors to your customized Chrome theme (when enabled)",
  /**
   * @description Command to turn the browser color scheme matching on through the command menu.
   */
  matchChromeColorSchemeCommand: "Match Chrome color scheme",
  /**
   * @description Command to turn the browser color scheme matching off through the command menu.
   */
  dontMatchChromeColorSchemeCommand: "Don't match Chrome color scheme",
  /**
   * @description Command to toggle the drawer orientation.
   */
  toggleDrawerOrientation: "Toggle drawer orientation"
};
var str_11 = i18n22.i18n.registerUIStrings("entrypoints/main/main-meta.ts", UIStrings11);
var i18nLazyString11 = i18n22.i18n.getLazilyComputedLocalizedString.bind(void 0, str_11);
var loadedMainModule;
var loadedInspectorMainModule;
async function loadMainModule() {
  if (!loadedMainModule) {
    loadedMainModule = await import("./../main/main.js");
  }
  return loadedMainModule;
}
async function loadInspectorMainModule() {
  if (!loadedInspectorMainModule) {
    loadedInspectorMainModule = await import("./../inspector_main/inspector_main.js");
  }
  return loadedInspectorMainModule;
}
UI9.ActionRegistration.registerActionExtension({
  category: "DRAWER",
  actionId: "inspector-main.focus-debuggee",
  async loadActionDelegate() {
    const InspectorMain = await loadInspectorMainModule();
    return new InspectorMain.InspectorMain.FocusDebuggeeActionDelegate();
  },
  order: 100,
  title: i18nLazyString11(UIStrings11.focusDebuggee)
});
UI9.ActionRegistration.registerActionExtension({
  category: "DRAWER",
  actionId: "main.toggle-drawer",
  async loadActionDelegate() {
    return new UI9.InspectorView.ActionDelegate();
  },
  order: 101,
  title: i18nLazyString11(UIStrings11.toggleDrawer),
  bindings: [
    {
      shortcut: "Esc"
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  category: "DRAWER",
  actionId: "main.toggle-drawer-orientation",
  async loadActionDelegate() {
    return new UI9.InspectorView.ActionDelegate();
  },
  title: i18nLazyString11(UIStrings11.toggleDrawerOrientation),
  bindings: [
    {
      shortcut: "Shift+Esc"
    }
  ],
  condition: (config) => Boolean(config?.devToolsFlexibleLayout?.verticalDrawerEnabled)
});
UI9.ActionRegistration.registerActionExtension({
  actionId: "main.next-tab",
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.nextPanel),
  async loadActionDelegate() {
    return new UI9.InspectorView.ActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+]"
    },
    {
      platform: "mac",
      shortcut: "Meta+]"
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  actionId: "main.previous-tab",
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.previousPanel),
  async loadActionDelegate() {
    return new UI9.InspectorView.ActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+["
    },
    {
      platform: "mac",
      shortcut: "Meta+["
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  actionId: "main.debug-reload",
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.reloadDevtools),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ReloadActionDelegate();
  },
  bindings: [
    {
      shortcut: "Alt+R"
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.restoreLastDockPosition),
  actionId: "main.toggle-dock",
  async loadActionDelegate() {
    return new UI9.DockController.ToggleDockActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+D"
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+D"
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  actionId: "main.zoom-in",
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.zoomIn),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ZoomActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Plus",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+Plus"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+NumpadPlus"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+NumpadPlus"
    },
    {
      platform: "mac",
      shortcut: "Meta+Plus",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+Plus"
    },
    {
      platform: "mac",
      shortcut: "Meta+NumpadPlus"
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+NumpadPlus"
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  actionId: "main.zoom-out",
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.zoomOut),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ZoomActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Minus",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+Minus"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+NumpadMinus"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+NumpadMinus"
    },
    {
      platform: "mac",
      shortcut: "Meta+Minus",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+Minus"
    },
    {
      platform: "mac",
      shortcut: "Meta+NumpadMinus"
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+NumpadMinus"
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  actionId: "main.zoom-reset",
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.resetZoomLevel),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.ZoomActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+0"
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Numpad0"
    },
    {
      platform: "mac",
      shortcut: "Meta+Numpad0"
    },
    {
      platform: "mac",
      shortcut: "Meta+0"
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  actionId: "main.search-in-panel.find",
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.searchInPanel),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+F",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+F",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "F3"
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  actionId: "main.search-in-panel.cancel",
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.cancelSearch),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  order: 10,
  bindings: [
    {
      shortcut: "Esc"
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  actionId: "main.search-in-panel.find-next",
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.findNextResult),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  bindings: [
    {
      platform: "mac",
      shortcut: "Meta+G",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+G"
    },
    {
      platform: "windows,linux",
      shortcut: "F3",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
UI9.ActionRegistration.registerActionExtension({
  actionId: "main.search-in-panel.find-previous",
  category: "GLOBAL",
  title: i18nLazyString11(UIStrings11.findPreviousResult),
  async loadActionDelegate() {
    const Main = await loadMainModule();
    return new Main.MainImpl.SearchActionDelegate();
  },
  bindings: [
    {
      platform: "mac",
      shortcut: "Meta+Shift+G",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+G"
    },
    {
      platform: "windows,linux",
      shortcut: "Shift+F3",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
Common7.Settings.registerSettingExtension({
  category: "APPEARANCE",
  storageType: "Synced",
  title: i18nLazyString11(UIStrings11.theme),
  settingName: "ui-theme",
  settingType: "enum",
  defaultValue: "systemPreferred",
  reloadRequired: false,
  options: [
    {
      title: i18nLazyString11(UIStrings11.switchToBrowserPreferredTheme),
      text: i18nLazyString11(UIStrings11.autoTheme),
      value: "systemPreferred"
    },
    {
      title: i18nLazyString11(UIStrings11.switchToLightTheme),
      text: i18nLazyString11(UIStrings11.lightCapital),
      value: "default"
    },
    {
      title: i18nLazyString11(UIStrings11.switchToDarkTheme),
      text: i18nLazyString11(UIStrings11.darkCapital),
      value: "dark"
    }
  ],
  tags: [
    i18nLazyString11(UIStrings11.darkLower),
    i18nLazyString11(UIStrings11.lightLower)
  ]
});
Common7.Settings.registerSettingExtension({
  category: "APPEARANCE",
  storageType: "Synced",
  title: i18nLazyString11(UIStrings11.matchChromeColorScheme),
  settingName: "chrome-theme-colors",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString11(UIStrings11.matchChromeColorSchemeCommand)
    },
    {
      value: false,
      title: i18nLazyString11(UIStrings11.dontMatchChromeColorSchemeCommand)
    }
  ],
  reloadRequired: true,
  learnMore: {
    url: "https://goo.gle/devtools-customize-theme",
    tooltip: i18nLazyString11(UIStrings11.matchChromeColorSchemeDocumentation)
  }
});
Common7.Settings.registerSettingExtension({
  category: "APPEARANCE",
  storageType: "Synced",
  title: i18nLazyString11(UIStrings11.panelLayout),
  settingName: "sidebar-position",
  settingType: "enum",
  defaultValue: "auto",
  options: [
    {
      title: i18nLazyString11(UIStrings11.useHorizontalPanelLayout),
      text: i18nLazyString11(UIStrings11.horizontal),
      value: "bottom"
    },
    {
      title: i18nLazyString11(UIStrings11.useVerticalPanelLayout),
      text: i18nLazyString11(UIStrings11.vertical),
      value: "right"
    },
    {
      title: i18nLazyString11(UIStrings11.useAutomaticPanelLayout),
      text: i18nLazyString11(UIStrings11.auto),
      value: "auto"
    }
  ]
});
Common7.Settings.registerSettingExtension({
  category: "APPEARANCE",
  storageType: "Synced",
  settingName: "language",
  settingType: "enum",
  title: i18nLazyString11(UIStrings11.language),
  defaultValue: "en-US",
  options: [
    {
      value: "browserLanguage",
      title: i18nLazyString11(UIStrings11.browserLanguage),
      text: i18nLazyString11(UIStrings11.browserLanguage)
    },
    ...i18n22.i18n.getAllSupportedDevToolsLocales().sort().map((locale) => createOptionForLocale(locale))
  ],
  reloadRequired: true
});
Common7.Settings.registerSettingExtension({
  category: "APPEARANCE",
  storageType: "Synced",
  title: Host2.Platform.platform() === "mac" ? i18nLazyString11(UIStrings11.enableShortcutToSwitchPanels) : i18nLazyString11(UIStrings11.enableCtrlShortcutToSwitchPanels),
  settingName: "shortcut-panel-switch",
  settingType: "boolean",
  defaultValue: false
});
Common7.Settings.registerSettingExtension({
  category: "GLOBAL",
  settingName: "currentDockState",
  settingType: "enum",
  defaultValue: "right",
  options: [
    {
      value: "right",
      text: i18nLazyString11(UIStrings11.right),
      title: i18nLazyString11(UIStrings11.dockToRight)
    },
    {
      value: "bottom",
      text: i18nLazyString11(UIStrings11.bottom),
      title: i18nLazyString11(UIStrings11.dockToBottom)
    },
    {
      value: "left",
      text: i18nLazyString11(UIStrings11.left),
      title: i18nLazyString11(UIStrings11.dockToLeft)
    },
    {
      value: "undocked",
      text: i18nLazyString11(UIStrings11.undocked),
      title: i18nLazyString11(UIStrings11.undockIntoSeparateWindow)
    }
  ]
});
Common7.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "active-keybind-set",
  settingType: "enum",
  defaultValue: "devToolsDefault",
  options: [
    {
      value: "devToolsDefault",
      title: i18nLazyString11(UIStrings11.devtoolsDefault),
      text: i18nLazyString11(UIStrings11.devtoolsDefault)
    },
    {
      value: "vsCode",
      title: i18n22.i18n.lockedLazyString("Visual Studio Code"),
      text: i18n22.i18n.lockedLazyString("Visual Studio Code")
    }
  ]
});
function createLazyLocalizedLocaleSettingText(localeString) {
  return () => i18n22.i18n.getLocalizedLanguageRegion(localeString, i18n22.DevToolsLocale.DevToolsLocale.instance());
}
function createOptionForLocale(localeString) {
  return {
    value: localeString,
    title: createLazyLocalizedLocaleSettingText(localeString),
    text: createLazyLocalizedLocaleSettingText(localeString)
  };
}
Common7.Settings.registerSettingExtension({
  category: "ACCOUNT",
  // This name must be kept in sync with DevToolsSettings::kSyncDevToolsPreferencesFrontendName.
  settingName: "sync-preferences",
  settingType: "boolean",
  title: i18nLazyString11(UIStrings11.saveSettings),
  defaultValue: false,
  reloadRequired: true
});
Common7.Settings.registerSettingExtension({
  category: "ACCOUNT",
  settingName: "receive-gdp-badges",
  settingType: "boolean",
  storageType: "Synced",
  title: i18nLazyString11(UIStrings11.earnBadges),
  defaultValue: false,
  reloadRequired: true
});
Common7.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "user-shortcuts",
  settingType: "array",
  defaultValue: []
});
Common7.Settings.registerSettingExtension({
  category: "GLOBAL",
  storageType: "Local",
  title: i18nLazyString11(UIStrings11.searchAsYouTypeSetting),
  settingName: "search-as-you-type",
  settingType: "boolean",
  order: 3,
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString11(UIStrings11.searchAsYouTypeCommand)
    },
    {
      value: false,
      title: i18nLazyString11(UIStrings11.searchOnEnterCommand)
    }
  ]
});
UI9.ViewManager.registerLocationResolver({
  name: "drawer-view",
  category: "DRAWER",
  async loadResolver() {
    return UI9.InspectorView.InspectorView.instance();
  }
});
UI9.ViewManager.registerLocationResolver({
  name: "drawer-sidebar",
  category: "DRAWER_SIDEBAR",
  async loadResolver() {
    return UI9.InspectorView.InspectorView.instance();
  }
});
UI9.ViewManager.registerLocationResolver({
  name: "panel",
  category: "PANEL",
  async loadResolver() {
    return UI9.InspectorView.InspectorView.instance();
  }
});
UI9.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Workspace2.UISourceCode.UISourceCode,
      SDK4.Resource.Resource,
      SDK4.NetworkRequest.NetworkRequest
    ];
  },
  async loadProvider() {
    return new Components.Linkifier.ContentProviderContextMenuProvider();
  },
  experiment: void 0
});
UI9.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Node
    ];
  },
  async loadProvider() {
    return new UI9.XLink.ContextMenuProvider();
  },
  experiment: void 0
});
UI9.ContextMenu.registerProvider({
  contextTypes() {
    return [
      Node
    ];
  },
  async loadProvider() {
    return new Components.Linkifier.LinkContextMenuProvider();
  },
  experiment: void 0
});
UI9.Toolbar.registerToolbarItem({
  separator: true,
  location: "main-toolbar-left",
  order: 100
});
UI9.Toolbar.registerToolbarItem({
  separator: true,
  order: 96,
  location: "main-toolbar-right"
});
UI9.Toolbar.registerToolbarItem({
  condition(config) {
    const isFlagEnabled = config?.devToolsGlobalAiButton?.enabled;
    const isGeoRestricted3 = config?.aidaAvailability?.blockedByGeo === true;
    const isPolicyRestricted3 = config?.aidaAvailability?.blockedByEnterprisePolicy === true;
    return Boolean(isFlagEnabled && !isGeoRestricted3 && !isPolicyRestricted3);
  },
  async loadItem() {
    const Main = await loadMainModule();
    return Main.GlobalAiButton.GlobalAiButtonToolbarProvider.instance();
  },
  order: 98,
  location: "main-toolbar-right"
});
UI9.Toolbar.registerToolbarItem({
  async loadItem() {
    const Main = await loadMainModule();
    return Main.MainImpl.SettingsButtonProvider.instance();
  },
  order: 99,
  location: "main-toolbar-right"
});
UI9.Toolbar.registerToolbarItem({
  condition: () => !Root5.Runtime.Runtime.isTraceApp(),
  async loadItem() {
    const Main = await loadMainModule();
    return Main.MainImpl.MainMenuItem.instance();
  },
  order: 100,
  location: "main-toolbar-right"
});
UI9.Toolbar.registerToolbarItem({
  async loadItem() {
    return UI9.DockController.CloseButtonProvider.instance();
  },
  order: 101,
  location: "main-toolbar-right"
});
Common7.AppProvider.registerAppProvider({
  async loadAppProvider() {
    const Main = await loadMainModule();
    return Main.SimpleApp.SimpleAppProvider.instance();
  },
  order: 10
});

// gen/front_end/ui/legacy/components/perf_ui/perf_ui-meta.js
import * as Common8 from "./../../core/common/common.js";
import * as i18n24 from "./../../core/i18n/i18n.js";
import * as Root6 from "./../../core/root/root.js";
import * as UI10 from "./../../ui/legacy/legacy.js";
var UIStrings12 = {
  /**
   * @description Title of a setting under the Performance category in Settings.
   * Selected navigation allows switching between 2 different sets of shortcuts
   * and actions (like zoom on scroll or crtl/cmd + scroll) for navigating the performance panel.
   */
  flamechartSelectedNavigation: "Flamechart navigation:",
  /**
   * @description Modern navigation option in the Performance Panel.
   */
  modern: "Modern",
  /**
   * @description Classic navigation option in the Performance Panel.
   */
  classic: "Classic",
  /**
   * @description Title of a setting under the Memory category in Settings. Live memory is memory
   * that is still in-use by the program (not dead). Allocation of live memory is when the program
   * creates new memory. This is a setting that turns on extra annotations in the UI to mark these
   * allocations.
   */
  liveMemoryAllocationAnnotations: "Live memory allocation annotations",
  /**
   * @description Title of a setting under the Memory category that can be invoked through the Command Menu
   */
  showLiveMemoryAllocation: "Show live memory allocation annotations",
  /**
   * @description Title of a setting under the Memory category that can be invoked through the Command Menu
   */
  hideLiveMemoryAllocation: "Hide live memory allocation annotations",
  /**
   * @description Title of an action in the components tool to collect garbage
   */
  collectGarbage: "Collect garbage"
};
var str_12 = i18n24.i18n.registerUIStrings("ui/legacy/components/perf_ui/perf_ui-meta.ts", UIStrings12);
var i18nLazyString12 = i18n24.i18n.getLazilyComputedLocalizedString.bind(void 0, str_12);
var loadedPerfUIModule;
async function loadPerfUIModule() {
  if (!loadedPerfUIModule) {
    loadedPerfUIModule = await import("./../../ui/legacy/components/perf_ui/perf_ui.js");
  }
  return loadedPerfUIModule;
}
UI10.ActionRegistration.registerActionExtension({
  actionId: "components.collect-garbage",
  category: "PERFORMANCE",
  title: i18nLazyString12(UIStrings12.collectGarbage),
  iconClass: "mop",
  async loadActionDelegate() {
    const PerfUI = await loadPerfUIModule();
    return new PerfUI.GCActionDelegate.GCActionDelegate();
  }
});
Common8.Settings.registerSettingExtension({
  category: "PERFORMANCE",
  storageType: "Synced",
  title: i18nLazyString12(UIStrings12.flamechartSelectedNavigation),
  settingName: "flamechart-selected-navigation",
  settingType: "enum",
  defaultValue: "classic",
  options: [
    {
      title: i18nLazyString12(UIStrings12.modern),
      text: i18nLazyString12(UIStrings12.modern),
      value: "modern"
    },
    {
      title: i18nLazyString12(UIStrings12.classic),
      text: i18nLazyString12(UIStrings12.classic),
      value: "classic"
    }
  ]
});
Common8.Settings.registerSettingExtension({
  category: "MEMORY",
  experiment: "live-heap-profile",
  title: i18nLazyString12(UIStrings12.liveMemoryAllocationAnnotations),
  settingName: "memory-live-heap-profile",
  settingType: "boolean",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString12(UIStrings12.showLiveMemoryAllocation)
    },
    {
      value: false,
      title: i18nLazyString12(UIStrings12.hideLiveMemoryAllocation)
    }
  ]
});

// gen/front_end/ui/legacy/components/quick_open/quick_open-meta.js
import * as i18n26 from "./../../core/i18n/i18n.js";
import * as UI11 from "./../../ui/legacy/legacy.js";
var UIStrings13 = {
  /**
   * @description Title of action that opens a file
   */
  openFile: "Open file",
  /**
   * @description Title of command that runs a Quick Open command
   */
  runCommand: "Run command"
};
var str_13 = i18n26.i18n.registerUIStrings("ui/legacy/components/quick_open/quick_open-meta.ts", UIStrings13);
var i18nLazyString13 = i18n26.i18n.getLazilyComputedLocalizedString.bind(void 0, str_13);
var loadedQuickOpenModule;
async function loadQuickOpenModule() {
  if (!loadedQuickOpenModule) {
    loadedQuickOpenModule = await import("./../../ui/legacy/components/quick_open/quick_open.js");
  }
  return loadedQuickOpenModule;
}
UI11.ActionRegistration.registerActionExtension({
  actionId: "quick-open.show-command-menu",
  category: "GLOBAL",
  title: i18nLazyString13(UIStrings13.runCommand),
  async loadActionDelegate() {
    const QuickOpen2 = await loadQuickOpenModule();
    return new QuickOpen2.CommandMenu.ShowActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+P",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+P",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      shortcut: "F1",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI11.ActionRegistration.registerActionExtension({
  actionId: "quick-open.show",
  category: "GLOBAL",
  title: i18nLazyString13(UIStrings13.openFile),
  async loadActionDelegate() {
    const QuickOpen2 = await loadQuickOpenModule();
    return new QuickOpen2.QuickOpen.ShowActionDelegate();
  },
  order: 100,
  bindings: [
    {
      platform: "mac",
      shortcut: "Meta+P",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+O",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+P",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+O",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
UI11.ContextMenu.registerItem({
  location: "mainMenu/default",
  actionId: "quick-open.show-command-menu",
  order: void 0
});
UI11.ContextMenu.registerItem({
  location: "mainMenu/default",
  actionId: "quick-open.show",
  order: void 0
});

// gen/front_end/core/sdk/sdk-meta.js
import * as Common9 from "./../../core/common/common.js";
import * as i18n28 from "./../../core/i18n/i18n.js";
var UIStrings14 = {
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  preserveLogUponNavigation: "Preserve log upon navigation",
  /**
   * @description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  doNotPreserveLogUponNavigation: "Do not preserve log upon navigation",
  /**
   * @description Text for pausing the debugger on exceptions
   */
  pauseOnExceptions: "Pause on exceptions",
  /**
   * @description Title of a setting under the Debugger category that can be invoked through the Command Menu
   */
  doNotPauseOnExceptions: "Do not pause on exceptions",
  /**
   * @description Title of a setting under the Debugger category that can be invoked through the Command Menu
   */
  disableJavascript: "Disable JavaScript",
  /**
   * @description Title of a setting under the Debugger category that can be invoked through the Command Menu
   */
  enableJavascript: "Enable JavaScript",
  /**
   * @description Title of a setting under the Debugger category in Settings
   */
  disableAsyncStackTraces: "Disable async stack traces",
  /**
   * @description Title of a setting under the Debugger category that can be invoked through the Command Menu
   */
  doNotCaptureAsyncStackTraces: "Do not capture async stack traces",
  /**
   * @description Title of a setting under the Debugger category that can be invoked through the Command Menu
   */
  captureAsyncStackTraces: "Capture async stack traces",
  /**
   * @description Text of a setting that  turn on the measuring rulers when hover over a target
   */
  showRulersOnHover: "Show rulers on hover",
  /**
   * @description Text of a setting that do turn off the measuring rulers when hover over a target
   */
  doNotShowRulersOnHover: "Do not show rulers on hover",
  /**
   * @description Title of a setting that turns on grid area name labels
   */
  showAreaNames: "Show area names",
  /**
   * @description Title of a setting under the Grid category that turns CSS Grid Area highlighting on
   */
  showGridNamedAreas: "Show grid named areas",
  /**
   * @description Title of a setting under the Grid category that turns CSS Grid Area highlighting off
   */
  doNotShowGridNamedAreas: "Do not show grid named areas",
  /**
   * @description Title of a setting that turns on grid track size labels
   */
  showTrackSizes: "Show track sizes",
  /**
   * @description Title for CSS Grid tooling option
   */
  showGridTrackSizes: "Show grid track sizes",
  /**
   * @description Title for CSS Grid tooling option
   */
  doNotShowGridTrackSizes: "Do not show grid track sizes",
  /**
   * @description Title of a setting that turns on grid extension lines
   */
  extendGridLines: "Extend grid lines",
  /**
   * @description Title of a setting that turns off the grid extension lines
   */
  doNotExtendGridLines: "Do not extend grid lines",
  /**
   * @description Title of a setting that turns on grid line labels
   */
  showLineLabels: "Show line labels",
  /**
   * @description Title of a setting that turns off the grid line labels
   */
  hideLineLabels: "Hide line labels",
  /**
   * @description Title of a setting that turns on grid line number labels
   */
  showLineNumbers: "Show line numbers",
  /**
   * @description Title of a setting that turns on grid line name labels
   */
  showLineNames: "Show line names",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  showPaintFlashingRectangles: "Show paint flashing rectangles",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  hidePaintFlashingRectangles: "Hide paint flashing rectangles",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  showLayoutShiftRegions: "Show layout shift regions",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  hideLayoutShiftRegions: "Hide layout shift regions",
  /**
   * @description Text to highlight the rendering frames for ads
   */
  highlightAdFrames: "Highlight ad frames",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  doNotHighlightAdFrames: "Do not highlight ad frames",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  showLayerBorders: "Show layer borders",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  hideLayerBorders: "Hide layer borders",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  showFramesPerSecondFpsMeter: "Show frames per second (FPS) meter",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  hideFramesPerSecondFpsMeter: "Hide frames per second (FPS) meter",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  showScrollPerformanceBottlenecks: "Show scroll performance bottlenecks",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  hideScrollPerformanceBottlenecks: "Hide scroll performance bottlenecks",
  /**
   * @description Title of a Rendering setting that can be invoked through the Command Menu
   */
  emulateAFocusedPage: "Emulate a focused page",
  /**
   * @description Title of a Rendering setting that can be invoked through the Command Menu
   */
  doNotEmulateAFocusedPage: "Do not emulate a focused page",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  doNotEmulateCssMediaType: "Do not emulate CSS media type",
  /**
   * @description A drop-down menu option to do not emulate css media type
   */
  noEmulation: "No emulation",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  emulateCssPrintMediaType: "Emulate CSS print media type",
  /**
   * @description A drop-down menu option to emulate css print media type
   */
  print: "print",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  emulateCssScreenMediaType: "Emulate CSS screen media type",
  /**
   * @description A drop-down menu option to emulate css screen media type
   */
  screen: "screen",
  /**
   * @description A tag of Emulate CSS screen media type setting that can be searched in the command menu
   */
  query: "query",
  /**
   * @description Title of a setting under the Rendering drawer
   */
  emulateCssMediaType: "Emulate CSS media type",
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   * @example {prefers-color-scheme} PH1
   */
  doNotEmulateCss: "Do not emulate CSS {PH1}",
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   * @example {prefers-color-scheme: light} PH1
   */
  emulateCss: "Emulate CSS {PH1}",
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   * @example {prefers-color-scheme} PH1
   */
  emulateCssMediaFeature: "Emulate CSS media feature {PH1}",
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  doNotEmulateAnyVisionDeficiency: "Do not emulate any vision deficiency",
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateBlurredVision: "Emulate blurred vision",
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateReducedContrast: "Emulate reduced contrast",
  /**
   * @description Name of a vision deficiency that can be emulated via the Rendering drawer
   */
  blurredVision: "Blurred vision",
  /**
   * @description Name of a vision deficiency that can be emulated via the Rendering drawer
   */
  reducedContrast: "Reduced contrast",
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateProtanopia: "Emulate protanopia (no red)",
  /**
   * @description Name of a color vision deficiency that can be emulated via the Rendering drawer
   */
  protanopia: "Protanopia (no red)",
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateDeuteranopia: "Emulate deuteranopia (no green)",
  /**
   * @description Name of a color vision deficiency that can be emulated via the Rendering drawer
   */
  deuteranopia: "Deuteranopia (no green)",
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateTritanopia: "Emulate tritanopia (no blue)",
  /**
   * @description Name of a color vision deficiency that can be emulated via the Rendering drawer
   */
  tritanopia: "Tritanopia (no blue)",
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateAchromatopsia: "Emulate achromatopsia (no color)",
  /**
   * @description Name of a color vision deficiency that can be emulated via the Rendering drawer
   */
  achromatopsia: "Achromatopsia (no color)",
  /**
   * @description Title of a setting under the Rendering drawer
   */
  emulateVisionDeficiencies: "Emulate vision deficiencies",
  /**
   * @description Title of a setting under the Rendering drawer
   */
  emulateOsTextScale: "Emulate OS text scale",
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  doNotEmulateOsTextScale: "Do not emulate OS text scale",
  /**
   * @description A drop-down menu option to not emulate OS text scale
   */
  osTextScaleEmulationNone: "No emulation",
  /**
   * @description A drop-down menu option to emulate an OS text scale 85%
   */
  osTextScaleEmulation85: "85%",
  /**
   * @description A drop-down menu option to emulate an OS text scale of 100%
   */
  osTextScaleEmulation100: "100% (default)",
  /**
   * @description A drop-down menu option to emulate an OS text scale of 115%
   */
  osTextScaleEmulation115: "115%",
  /**
   * @description A drop-down menu option to emulate an OS text scale of 130%
   */
  osTextScaleEmulation130: "130%",
  /**
   * @description A drop-down menu option to emulate an OS text scale of 150%
   */
  osTextScaleEmulation150: "150%",
  /**
   * @description A drop-down menu option to emulate an OS text scale of 180%
   */
  osTextScaleEmulation180: "180%",
  /**
   * @description A drop-down menu option to emulate an OS text scale of 200%
   */
  osTextScaleEmulation200: "200%",
  /**
   * @description Text that refers to disabling local fonts
   */
  disableLocalFonts: "Disable local fonts",
  /**
   * @description Text that refers to enabling local fonts
   */
  enableLocalFonts: "Enable local fonts",
  /**
   * @description Title of a setting that disables AVIF format
   */
  disableAvifFormat: "Disable `AVIF` format",
  /**
   * @description Title of a setting that enables AVIF format
   */
  enableAvifFormat: "Enable `AVIF` format",
  /**
   * @description Title of a setting that disables WebP format
   */
  disableWebpFormat: "Disable `WebP` format",
  /**
   * @description Title of a setting that enables WebP format
   */
  enableWebpFormat: "Enable `WebP` format",
  /**
   * @description Title of a setting under the Console category in Settings
   */
  customFormatters: "Custom formatters",
  /**
   * @description Title of a setting under the Network category
   */
  networkRequestBlocking: "Network request blocking",
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  enableNetworkRequestBlocking: "Enable network request blocking",
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  disableNetworkRequestBlocking: "Disable network request blocking",
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  enableCache: "Enable cache",
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  disableCache: "Disable cache while DevTools is open",
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting
   * emulates that the webpage is in auto dark mode.
   */
  emulateAutoDarkMode: "Emulate auto dark mode",
  /**
   * @description Label of a checkbox in the DevTools settings UI.
   */
  enableRemoteFileLoading: "Allow loading remote file path resources in DevTools",
  /**
   * @description Tooltip text for a setting that controls whether external resource can be loaded in DevTools.
   */
  remoteFileLoadingInfo: "Example resource are source maps. Disabled by default for security reasons.",
  /**
   * @description Tooltip text for a setting that controls the network cache. Disabling the network cache can simulate the network connections of users that are visiting a page for the first time.
   */
  networkCacheExplanation: "Disabling the network cache will simulate a network experience similar to a first time visitor.",
  /**
   * @description Setting under the Sources category to toggle usage of JavaScript source maps.
   */
  javaScriptSourceMaps: "JavaScript source maps",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableJavaScriptSourceMaps: "Enable JavaScript source maps",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableJavaScriptSourceMaps: "Disable JavaScript source maps",
  /**
   * @description Title of a setting under the Sources category
   */
  cssSourceMaps: "CSS source maps",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  enableCssSourceMaps: "Enable CSS source maps",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  disableCssSourceMaps: "Disable CSS source maps",
  /**
   * @description Title of a setting under the Console category in Settings
   */
  logXmlhttprequests: "Log XMLHttpRequests"
};
var str_14 = i18n28.i18n.registerUIStrings("core/sdk/sdk-meta.ts", UIStrings14);
var i18nLazyString14 = i18n28.i18n.getLazilyComputedLocalizedString.bind(void 0, str_14);
Common9.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString14(UIStrings14.preserveLogUponNavigation),
  settingName: "preserve-console-log",
  settingType: "boolean",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.preserveLogUponNavigation)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.doNotPreserveLogUponNavigation)
    }
  ]
});
Common9.Settings.registerSettingExtension({
  category: "DEBUGGER",
  settingName: "pause-on-exception-enabled",
  settingType: "boolean",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.pauseOnExceptions)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.doNotPauseOnExceptions)
    }
  ]
});
Common9.Settings.registerSettingExtension({
  settingName: "pause-on-caught-exception",
  settingType: "boolean",
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  settingName: "pause-on-uncaught-exception",
  settingType: "boolean",
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "DEBUGGER",
  title: i18nLazyString14(UIStrings14.disableJavascript),
  settingName: "java-script-disabled",
  settingType: "boolean",
  storageType: "Session",
  order: 1,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.disableJavascript)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.enableJavascript)
    }
  ]
});
Common9.Settings.registerSettingExtension({
  category: "DEBUGGER",
  title: i18nLazyString14(UIStrings14.disableAsyncStackTraces),
  settingName: "disable-async-stack-traces",
  settingType: "boolean",
  defaultValue: false,
  order: 2,
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.doNotCaptureAsyncStackTraces)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.captureAsyncStackTraces)
    }
  ]
});
Common9.Settings.registerSettingExtension({
  category: "DEBUGGER",
  settingName: "breakpoints-active",
  settingType: "boolean",
  storageType: "Session",
  defaultValue: true
});
Common9.Settings.registerSettingExtension({
  category: "ELEMENTS",
  storageType: "Synced",
  title: i18nLazyString14(UIStrings14.showRulersOnHover),
  settingName: "show-metrics-rulers",
  settingType: "boolean",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.showRulersOnHover)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.doNotShowRulersOnHover)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "GRID",
  storageType: "Synced",
  title: i18nLazyString14(UIStrings14.showAreaNames),
  settingName: "show-grid-areas",
  settingType: "boolean",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.showGridNamedAreas)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.doNotShowGridNamedAreas)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "GRID",
  storageType: "Synced",
  title: i18nLazyString14(UIStrings14.showTrackSizes),
  settingName: "show-grid-track-sizes",
  settingType: "boolean",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.showGridTrackSizes)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.doNotShowGridTrackSizes)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "GRID",
  storageType: "Synced",
  title: i18nLazyString14(UIStrings14.extendGridLines),
  settingName: "extend-grid-lines",
  settingType: "boolean",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.extendGridLines)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.doNotExtendGridLines)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "GRID",
  storageType: "Synced",
  title: i18nLazyString14(UIStrings14.showLineLabels),
  settingName: "show-grid-line-labels",
  settingType: "enum",
  options: [
    {
      title: i18nLazyString14(UIStrings14.hideLineLabels),
      text: i18nLazyString14(UIStrings14.hideLineLabels),
      value: "none"
    },
    {
      title: i18nLazyString14(UIStrings14.showLineNumbers),
      text: i18nLazyString14(UIStrings14.showLineNumbers),
      value: "lineNumbers"
    },
    {
      title: i18nLazyString14(UIStrings14.showLineNames),
      text: i18nLazyString14(UIStrings14.showLineNames),
      value: "lineNames"
    }
  ],
  defaultValue: "lineNumbers"
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "show-paint-rects",
  settingType: "boolean",
  storageType: "Session",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.showPaintFlashingRectangles)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.hidePaintFlashingRectangles)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "show-layout-shift-regions",
  settingType: "boolean",
  storageType: "Session",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.showLayoutShiftRegions)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.hideLayoutShiftRegions)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "show-ad-highlights",
  settingType: "boolean",
  storageType: "Session",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.highlightAdFrames)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.doNotHighlightAdFrames)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "show-debug-borders",
  settingType: "boolean",
  storageType: "Session",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.showLayerBorders)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.hideLayerBorders)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "show-fps-counter",
  settingType: "boolean",
  storageType: "Session",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.showFramesPerSecondFpsMeter)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.hideFramesPerSecondFpsMeter)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "show-scroll-bottleneck-rects",
  settingType: "boolean",
  storageType: "Session",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.showScrollPerformanceBottlenecks)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.hideScrollPerformanceBottlenecks)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  title: i18nLazyString14(UIStrings14.emulateAFocusedPage),
  settingName: "emulate-page-focus",
  settingType: "boolean",
  storageType: "Local",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.emulateAFocusedPage)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.doNotEmulateAFocusedPage)
    }
  ]
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "emulated-css-media",
  settingType: "enum",
  storageType: "Session",
  defaultValue: "",
  options: [
    {
      title: i18nLazyString14(UIStrings14.doNotEmulateCssMediaType),
      text: i18nLazyString14(UIStrings14.noEmulation),
      value: ""
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCssPrintMediaType),
      text: i18nLazyString14(UIStrings14.print),
      value: "print"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCssScreenMediaType),
      text: i18nLazyString14(UIStrings14.screen),
      value: "screen"
    }
  ],
  tags: [
    i18nLazyString14(UIStrings14.query)
  ],
  title: i18nLazyString14(UIStrings14.emulateCssMediaType)
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "emulated-css-media-feature-prefers-color-scheme",
  settingType: "enum",
  storageType: "Session",
  defaultValue: "",
  options: [
    {
      title: i18nLazyString14(UIStrings14.doNotEmulateCss, { PH1: "prefers-color-scheme" }),
      text: i18nLazyString14(UIStrings14.noEmulation),
      value: ""
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "prefers-color-scheme: light" }),
      text: i18n28.i18n.lockedLazyString("prefers-color-scheme: light"),
      value: "light"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "prefers-color-scheme: dark" }),
      text: i18n28.i18n.lockedLazyString("prefers-color-scheme: dark"),
      value: "dark"
    }
  ],
  tags: [
    i18nLazyString14(UIStrings14.query)
  ],
  title: i18nLazyString14(UIStrings14.emulateCssMediaFeature, { PH1: "prefers-color-scheme" })
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "emulated-css-media-feature-forced-colors",
  settingType: "enum",
  storageType: "Session",
  defaultValue: "",
  options: [
    {
      title: i18nLazyString14(UIStrings14.doNotEmulateCss, { PH1: "forced-colors" }),
      text: i18nLazyString14(UIStrings14.noEmulation),
      value: ""
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "forced-colors: active" }),
      text: i18n28.i18n.lockedLazyString("forced-colors: active"),
      value: "active"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "forced-colors: none" }),
      text: i18n28.i18n.lockedLazyString("forced-colors: none"),
      value: "none"
    }
  ],
  tags: [
    i18nLazyString14(UIStrings14.query)
  ],
  title: i18nLazyString14(UIStrings14.emulateCssMediaFeature, { PH1: "forced-colors" })
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "emulated-css-media-feature-prefers-reduced-motion",
  settingType: "enum",
  storageType: "Session",
  defaultValue: "",
  options: [
    {
      title: i18nLazyString14(UIStrings14.doNotEmulateCss, { PH1: "prefers-reduced-motion" }),
      text: i18nLazyString14(UIStrings14.noEmulation),
      value: ""
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "prefers-reduced-motion: reduce" }),
      text: i18n28.i18n.lockedLazyString("prefers-reduced-motion: reduce"),
      value: "reduce"
    }
  ],
  tags: [
    i18nLazyString14(UIStrings14.query)
  ],
  title: i18nLazyString14(UIStrings14.emulateCssMediaFeature, { PH1: "prefers-reduced-motion" })
});
Common9.Settings.registerSettingExtension({
  settingName: "emulated-css-media-feature-prefers-contrast",
  settingType: "enum",
  storageType: "Session",
  defaultValue: "",
  options: [
    {
      title: i18nLazyString14(UIStrings14.doNotEmulateCss, { PH1: "prefers-contrast" }),
      text: i18nLazyString14(UIStrings14.noEmulation),
      value: ""
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "prefers-contrast: more" }),
      text: i18n28.i18n.lockedLazyString("prefers-contrast: more"),
      value: "more"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "prefers-contrast: less" }),
      text: i18n28.i18n.lockedLazyString("prefers-contrast: less"),
      value: "less"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "prefers-contrast: custom" }),
      text: i18n28.i18n.lockedLazyString("prefers-contrast: custom"),
      value: "custom"
    }
  ],
  tags: [
    i18nLazyString14(UIStrings14.query)
  ],
  title: i18nLazyString14(UIStrings14.emulateCssMediaFeature, { PH1: "prefers-contrast" })
});
Common9.Settings.registerSettingExtension({
  settingName: "emulated-css-media-feature-prefers-reduced-data",
  settingType: "enum",
  storageType: "Session",
  defaultValue: "",
  options: [
    {
      title: i18nLazyString14(UIStrings14.doNotEmulateCss, { PH1: "prefers-reduced-data" }),
      text: i18nLazyString14(UIStrings14.noEmulation),
      value: ""
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "prefers-reduced-data: reduce" }),
      text: i18n28.i18n.lockedLazyString("prefers-reduced-data: reduce"),
      value: "reduce"
    }
  ],
  title: i18nLazyString14(UIStrings14.emulateCssMediaFeature, { PH1: "prefers-reduced-data" })
});
Common9.Settings.registerSettingExtension({
  settingName: "emulated-css-media-feature-prefers-reduced-transparency",
  settingType: "enum",
  storageType: "Session",
  defaultValue: "",
  options: [
    {
      title: i18nLazyString14(UIStrings14.doNotEmulateCss, { PH1: "prefers-reduced-transparency" }),
      text: i18nLazyString14(UIStrings14.noEmulation),
      value: ""
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "prefers-reduced-transparency: reduce" }),
      text: i18n28.i18n.lockedLazyString("prefers-reduced-transparency: reduce"),
      value: "reduce"
    }
  ],
  title: i18nLazyString14(UIStrings14.emulateCssMediaFeature, { PH1: "prefers-reduced-transparency" })
});
Common9.Settings.registerSettingExtension({
  settingName: "emulated-css-media-feature-color-gamut",
  settingType: "enum",
  storageType: "Session",
  defaultValue: "",
  options: [
    {
      title: i18nLazyString14(UIStrings14.doNotEmulateCss, { PH1: "color-gamut" }),
      text: i18nLazyString14(UIStrings14.noEmulation),
      value: ""
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "color-gamut: srgb" }),
      text: i18n28.i18n.lockedLazyString("color-gamut: srgb"),
      value: "srgb"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "color-gamut: p3" }),
      text: i18n28.i18n.lockedLazyString("color-gamut: p3"),
      value: "p3"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateCss, { PH1: "color-gamut: rec2020" }),
      text: i18n28.i18n.lockedLazyString("color-gamut: rec2020"),
      value: "rec2020"
    }
  ],
  title: i18nLazyString14(UIStrings14.emulateCssMediaFeature, { PH1: "color-gamut" })
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "emulated-vision-deficiency",
  settingType: "enum",
  storageType: "Session",
  defaultValue: "none",
  options: [
    {
      title: i18nLazyString14(UIStrings14.doNotEmulateAnyVisionDeficiency),
      text: i18nLazyString14(UIStrings14.noEmulation),
      value: "none"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateBlurredVision),
      text: i18nLazyString14(UIStrings14.blurredVision),
      value: "blurredVision"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateReducedContrast),
      text: i18nLazyString14(UIStrings14.reducedContrast),
      value: "reducedContrast"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateProtanopia),
      text: i18nLazyString14(UIStrings14.protanopia),
      value: "protanopia"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateDeuteranopia),
      text: i18nLazyString14(UIStrings14.deuteranopia),
      value: "deuteranopia"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateTritanopia),
      text: i18nLazyString14(UIStrings14.tritanopia),
      value: "tritanopia"
    },
    {
      title: i18nLazyString14(UIStrings14.emulateAchromatopsia),
      text: i18nLazyString14(UIStrings14.achromatopsia),
      value: "achromatopsia"
    }
  ],
  tags: [
    i18nLazyString14(UIStrings14.query)
  ],
  title: i18nLazyString14(UIStrings14.emulateVisionDeficiencies)
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "emulated-os-text-scale",
  settingType: "enum",
  storageType: "Session",
  defaultValue: "",
  options: [
    {
      title: i18nLazyString14(UIStrings14.doNotEmulateOsTextScale),
      text: i18nLazyString14(UIStrings14.osTextScaleEmulationNone),
      value: ""
    },
    {
      title: i18nLazyString14(UIStrings14.osTextScaleEmulation85),
      text: i18nLazyString14(UIStrings14.osTextScaleEmulation85),
      value: "0.85"
    },
    {
      title: i18nLazyString14(UIStrings14.osTextScaleEmulation100),
      text: i18nLazyString14(UIStrings14.osTextScaleEmulation100),
      value: "1"
    },
    {
      title: i18nLazyString14(UIStrings14.osTextScaleEmulation115),
      text: i18nLazyString14(UIStrings14.osTextScaleEmulation115),
      value: "1.15"
    },
    {
      title: i18nLazyString14(UIStrings14.osTextScaleEmulation130),
      text: i18nLazyString14(UIStrings14.osTextScaleEmulation130),
      value: "1.3"
    },
    {
      title: i18nLazyString14(UIStrings14.osTextScaleEmulation150),
      text: i18nLazyString14(UIStrings14.osTextScaleEmulation150),
      value: "1.5"
    },
    {
      title: i18nLazyString14(UIStrings14.osTextScaleEmulation180),
      text: i18nLazyString14(UIStrings14.osTextScaleEmulation180),
      value: "1.8"
    },
    {
      title: i18nLazyString14(UIStrings14.osTextScaleEmulation200),
      text: i18nLazyString14(UIStrings14.osTextScaleEmulation200),
      value: "2"
    }
  ],
  tags: [
    i18nLazyString14(UIStrings14.query)
  ],
  title: i18nLazyString14(UIStrings14.emulateOsTextScale)
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "local-fonts-disabled",
  settingType: "boolean",
  storageType: "Session",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.disableLocalFonts)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.enableLocalFonts)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "avif-format-disabled",
  settingType: "boolean",
  storageType: "Session",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.disableAvifFormat)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.enableAvifFormat)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  settingName: "webp-format-disabled",
  settingType: "boolean",
  storageType: "Session",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.disableWebpFormat)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.enableWebpFormat)
    }
  ],
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "CONSOLE",
  title: i18nLazyString14(UIStrings14.customFormatters),
  settingName: "custom-formatters",
  settingType: "boolean",
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "NETWORK",
  title: i18nLazyString14(UIStrings14.networkRequestBlocking),
  settingName: "request-blocking-enabled",
  settingType: "boolean",
  storageType: "Local",
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.enableNetworkRequestBlocking)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.disableNetworkRequestBlocking)
    }
  ]
});
Common9.Settings.registerSettingExtension({
  category: "NETWORK",
  title: i18nLazyString14(UIStrings14.disableCache),
  settingName: "cache-disabled",
  settingType: "boolean",
  order: 0,
  defaultValue: false,
  userActionCondition: "hasOtherClients",
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.disableCache)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.enableCache)
    }
  ],
  learnMore: {
    tooltip: i18nLazyString14(UIStrings14.networkCacheExplanation)
  }
});
Common9.Settings.registerSettingExtension({
  category: "RENDERING",
  title: i18nLazyString14(UIStrings14.emulateAutoDarkMode),
  settingName: "emulate-auto-dark-mode",
  settingType: "boolean",
  storageType: "Session",
  defaultValue: false
});
Common9.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString14(UIStrings14.enableRemoteFileLoading),
  settingName: "network.enable-remote-file-loading",
  settingType: "boolean",
  defaultValue: false,
  learnMore: {
    tooltip: i18nLazyString14(UIStrings14.remoteFileLoadingInfo)
  }
});
Common9.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString14(UIStrings14.javaScriptSourceMaps),
  settingName: "js-source-maps-enabled",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.enableJavaScriptSourceMaps)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.disableJavaScriptSourceMaps)
    }
  ]
});
Common9.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString14(UIStrings14.cssSourceMaps),
  settingName: "css-source-maps-enabled",
  settingType: "boolean",
  defaultValue: true,
  options: [
    {
      value: true,
      title: i18nLazyString14(UIStrings14.enableCssSourceMaps)
    },
    {
      value: false,
      title: i18nLazyString14(UIStrings14.disableCssSourceMaps)
    }
  ]
});
Common9.Settings.registerSettingExtension({
  category: "CONSOLE",
  storageType: "Synced",
  title: i18nLazyString14(UIStrings14.logXmlhttprequests),
  settingName: "monitoring-xhr-enabled",
  settingType: "boolean",
  defaultValue: false
});

// gen/front_end/models/workspace/workspace-meta.js
import * as Common10 from "./../../core/common/common.js";
Common10.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "skip-stack-frames-pattern",
  settingType: "regex",
  defaultValue: "/node_modules/|^node:"
});
Common10.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "skip-content-scripts",
  settingType: "boolean",
  defaultValue: true
});
Common10.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "automatically-ignore-list-known-third-party-scripts",
  settingType: "boolean",
  defaultValue: true
});
Common10.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "skip-anonymous-scripts",
  settingType: "boolean",
  defaultValue: false
});
Common10.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "enable-ignore-listing",
  settingType: "boolean",
  defaultValue: true
});

// gen/front_end/ui/legacy/components/source_frame/source_frame-meta.js
import * as Common11 from "./../../core/common/common.js";
import * as i18n30 from "./../../core/i18n/i18n.js";
var UIStrings15 = {
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  defaultIndentation: "Default indentation:",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  setIndentationToSpaces: "Set indentation to 2 spaces",
  /**
   * @description A drop-down menu option to set indentation to 2 spaces
   */
  Spaces: "2 spaces",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  setIndentationToFSpaces: "Set indentation to 4 spaces",
  /**
   * @description A drop-down menu option to set indentation to 4 spaces
   */
  fSpaces: "4 spaces",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  setIndentationToESpaces: "Set indentation to 8 spaces",
  /**
   * @description A drop-down menu option to set indentation to 8 spaces
   */
  eSpaces: "8 spaces",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  setIndentationToTabCharacter: "Set indentation to tab character",
  /**
   * @description A drop-down menu option to set indentation to tab character
   */
  tabCharacter: "Tab character"
};
var str_15 = i18n30.i18n.registerUIStrings("ui/legacy/components/source_frame/source_frame-meta.ts", UIStrings15);
var i18nLazyString15 = i18n30.i18n.getLazilyComputedLocalizedString.bind(void 0, str_15);
Common11.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString15(UIStrings15.defaultIndentation),
  settingName: "text-editor-indent",
  settingType: "enum",
  defaultValue: "    ",
  options: [
    {
      title: i18nLazyString15(UIStrings15.setIndentationToSpaces),
      text: i18nLazyString15(UIStrings15.Spaces),
      value: "  "
    },
    {
      title: i18nLazyString15(UIStrings15.setIndentationToFSpaces),
      text: i18nLazyString15(UIStrings15.fSpaces),
      value: "    "
    },
    {
      title: i18nLazyString15(UIStrings15.setIndentationToESpaces),
      text: i18nLazyString15(UIStrings15.eSpaces),
      value: "        "
    },
    {
      title: i18nLazyString15(UIStrings15.setIndentationToTabCharacter),
      text: i18nLazyString15(UIStrings15.tabCharacter),
      value: "	"
    }
  ]
});

// gen/front_end/panels/console_counters/console_counters-meta.js
import * as UI12 from "./../../ui/legacy/legacy.js";
var loadedConsoleCountersModule;
async function loadConsoleCountersModule() {
  if (!loadedConsoleCountersModule) {
    loadedConsoleCountersModule = await import("./../../panels/console_counters/console_counters.js");
  }
  return loadedConsoleCountersModule;
}
UI12.Toolbar.registerToolbarItem({
  async loadItem() {
    const ConsoleCounters = await loadConsoleCountersModule();
    return ConsoleCounters.WarningErrorCounter.WarningErrorCounter.instance();
  },
  order: 1,
  location: "main-toolbar-right"
});

// gen/front_end/ui/legacy/components/object_ui/object_ui-meta.js
import * as SDK5 from "./../../core/sdk/sdk.js";
import * as UI13 from "./../../ui/legacy/legacy.js";
var loadedObjectUIModule;
async function loadObjectUIModule() {
  if (!loadedObjectUIModule) {
    loadedObjectUIModule = await import("./../../ui/legacy/components/object_ui/object_ui.js");
  }
  return loadedObjectUIModule;
}
UI13.UIUtils.registerRenderer({
  contextTypes() {
    return [SDK5.RemoteObject.RemoteObject];
  },
  async loadRenderer() {
    const ObjectUI3 = await loadObjectUIModule();
    return ObjectUI3.ObjectPropertiesSection.Renderer.instance();
  }
});

// gen/front_end/panels/explain/explain-meta.js
import * as Common12 from "./../../core/common/common.js";
import * as i18n33 from "./../../core/i18n/i18n.js";
import * as Console2 from "./../../panels/console/console.js";
import * as UI14 from "./../../ui/legacy/legacy.js";
var UIStrings16 = {
  /**
   * @description Message to offer insights for a console error message
   */
  explainThisError: "Understand this error",
  /**
   * @description Message to offer insights for a console warning message
   */
  explainThisWarning: "Understand this warning",
  /**
   * @description Message to offer insights for a console message
   */
  explainThisMessage: "Understand this message",
  /**
   * @description The setting title to enable the console insights feature via
   * the settings tab.
   */
  enableConsoleInsights: "Understand console messages with AI",
  /**
   * @description Message shown to the user if the DevTools locale is not
   * supported.
   */
  wrongLocale: "To use this feature, set your language preference to English in DevTools settings.",
  /**
   * @description Message shown to the user if the user's region is not
   * supported.
   */
  geoRestricted: "This feature is unavailable in your region.",
  /**
   * @description Message shown to the user if the enterprise policy does
   * not allow this feature.
   */
  policyRestricted: "This setting is managed by your administrator."
};
var str_16 = i18n33.i18n.registerUIStrings("panels/explain/explain-meta.ts", UIStrings16);
var i18nLazyString16 = i18n33.i18n.getLazilyComputedLocalizedString.bind(void 0, str_16);
var i18nString = i18n33.i18n.getLocalizedString.bind(void 0, str_16);
var setting = "console-insights-enabled";
var actions = [
  {
    actionId: "explain.console-message.hover",
    title: i18nLazyString16(UIStrings16.explainThisMessage),
    contextTypes() {
      return [Console2.ConsoleViewMessage.ConsoleViewMessage];
    }
  },
  {
    actionId: "explain.console-message.teaser",
    title: i18nLazyString16(UIStrings16.explainThisMessage),
    contextTypes() {
      return [];
    }
  },
  {
    actionId: "explain.console-message.context.error",
    title: i18nLazyString16(UIStrings16.explainThisError),
    contextTypes() {
      return [];
    }
  },
  {
    actionId: "explain.console-message.context.warning",
    title: i18nLazyString16(UIStrings16.explainThisWarning),
    contextTypes() {
      return [];
    }
  },
  {
    actionId: "explain.console-message.context.other",
    title: i18nLazyString16(UIStrings16.explainThisMessage),
    contextTypes() {
      return [];
    }
  }
];
function isLocaleRestricted() {
  const devtoolsLocale = i18n33.DevToolsLocale.DevToolsLocale.instance();
  return !devtoolsLocale.locale.startsWith("en-");
}
function isGeoRestricted(config) {
  return config?.aidaAvailability?.blockedByGeo === true;
}
function isPolicyRestricted(config) {
  return config?.aidaAvailability?.blockedByEnterprisePolicy === true;
}
function isFeatureEnabled(config) {
  return (config?.aidaAvailability?.enabled && config?.devToolsConsoleInsights?.enabled) === true;
}
Common12.Settings.registerSettingExtension({
  category: "AI",
  settingName: setting,
  settingType: "boolean",
  title: i18nLazyString16(UIStrings16.enableConsoleInsights),
  defaultValue: false,
  reloadRequired: false,
  condition: (config) => isFeatureEnabled(config),
  disabledCondition: (config) => {
    const reasons = [];
    if (isGeoRestricted(config)) {
      reasons.push(i18nString(UIStrings16.geoRestricted));
    }
    if (isPolicyRestricted(config)) {
      reasons.push(i18nString(UIStrings16.policyRestricted));
    }
    if (isLocaleRestricted()) {
      reasons.push(i18nString(UIStrings16.wrongLocale));
    }
    if (reasons.length > 0) {
      return { disabled: true, reasons };
    }
    return { disabled: false };
  }
});
for (const action of actions) {
  UI14.ActionRegistration.registerActionExtension({
    ...action,
    category: "CONSOLE",
    async loadActionDelegate() {
      const Explain = await import("./../../panels/explain/explain.js");
      return new Explain.ActionDelegate();
    },
    condition: (config) => {
      return isFeatureEnabled(config) && !isPolicyRestricted(config) && !isGeoRestricted(config);
    }
  });
}

// gen/front_end/panels/ai_assistance/ai_assistance-meta.js
import * as Common13 from "./../../core/common/common.js";
import * as i18n35 from "./../../core/i18n/i18n.js";
import * as UI15 from "./../../ui/legacy/legacy.js";
var UIStrings17 = {
  /**
   * @description The title of the AI assistance panel.
   */
  aiAssistance: "AI assistance",
  /**
   * @description The title of the command menu action for showing the AI assistance panel.
   */
  showAiAssistance: "Show AI assistance",
  /**
   * @description The setting title to enable the AI assistance via
   * the settings tab.
   */
  enableAiAssistance: "Enable AI assistance",
  /**
   * @description Text of a context menu item to redirect to the AI assistance panel with
   * the current context
   */
  debugWithAi: "Debug with AI",
  /**
   * @description Message shown to the user if the DevTools locale is not
   * supported.
   */
  wrongLocale: "To use this feature, set your language preference to English in DevTools settings.",
  /**
   * @description Message shown to the user if the user's region is not
   * supported.
   */
  geoRestricted: "This feature is unavailable in your region.",
  /**
   * @description Message shown to the user if the enterprise policy does
   * not allow this feature.
   */
  policyRestricted: "This setting is managed by your administrator."
};
var str_17 = i18n35.i18n.registerUIStrings("panels/ai_assistance/ai_assistance-meta.ts", UIStrings17);
var i18nString2 = i18n35.i18n.getLocalizedString.bind(void 0, str_17);
var i18nLazyString17 = i18n35.i18n.getLazilyComputedLocalizedString.bind(void 0, str_17);
var setting2 = "ai-assistance-enabled";
function isLocaleRestricted2() {
  const devtoolsLocale = i18n35.DevToolsLocale.DevToolsLocale.instance();
  return !devtoolsLocale.locale.startsWith("en-");
}
function isGeoRestricted2(config) {
  return config?.aidaAvailability?.blockedByGeo === true;
}
function isPolicyRestricted2(config) {
  return config?.aidaAvailability?.blockedByEnterprisePolicy === true;
}
var loadedAiAssistanceModule;
async function loadAiAssistanceModule() {
  if (!loadedAiAssistanceModule) {
    loadedAiAssistanceModule = await import("./../../panels/ai_assistance/ai_assistance.js");
  }
  return loadedAiAssistanceModule;
}
function isStylingAgentFeatureAvailable(config) {
  return (config?.aidaAvailability?.enabled && config?.devToolsFreestyler?.enabled) === true;
}
function isNetworkAgentFeatureAvailable(config) {
  return (config?.aidaAvailability?.enabled && config?.devToolsAiAssistanceNetworkAgent?.enabled) === true;
}
function isPerformanceAgentFeatureAvailable(config) {
  return (config?.aidaAvailability?.enabled && config?.devToolsAiAssistancePerformanceAgent?.enabled) === true;
}
function isFileAgentFeatureAvailable(config) {
  return (config?.aidaAvailability?.enabled && config?.devToolsAiAssistanceFileAgent?.enabled) === true;
}
function isAnyFeatureAvailable(config) {
  return isStylingAgentFeatureAvailable(config) || isNetworkAgentFeatureAvailable(config) || isPerformanceAgentFeatureAvailable(config) || isFileAgentFeatureAvailable(config);
}
UI15.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "freestyler",
  commandPrompt: i18nLazyString17(UIStrings17.showAiAssistance),
  title: i18nLazyString17(UIStrings17.aiAssistance),
  order: 10,
  persistence: "closeable",
  hasToolbar: false,
  condition: (config) => isAnyFeatureAvailable(config) && !isPolicyRestricted2(config),
  async loadView() {
    const AiAssistance = await loadAiAssistanceModule();
    return await AiAssistance.AiAssistancePanel.instance();
  }
});
Common13.Settings.registerSettingExtension({
  category: "AI",
  settingName: setting2,
  settingType: "boolean",
  title: i18nLazyString17(UIStrings17.enableAiAssistance),
  defaultValue: false,
  reloadRequired: false,
  condition: isAnyFeatureAvailable,
  disabledCondition: (config) => {
    const reasons = [];
    if (isGeoRestricted2(config)) {
      reasons.push(i18nString2(UIStrings17.geoRestricted));
    }
    if (isPolicyRestricted2(config)) {
      reasons.push(i18nString2(UIStrings17.policyRestricted));
    }
    if (isLocaleRestricted2()) {
      reasons.push(i18nString2(UIStrings17.wrongLocale));
    }
    if (reasons.length > 0) {
      return { disabled: true, reasons };
    }
    return { disabled: false };
  }
});
UI15.ActionRegistration.registerActionExtension({
  actionId: "freestyler.main-menu",
  contextTypes() {
    return [];
  },
  category: "GLOBAL",
  title: i18nLazyString17(UIStrings17.debugWithAi),
  configurableBindings: false,
  featurePromotionId: "ai-assistance",
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: (config) => isAnyFeatureAvailable(config) && !isPolicyRestricted2(config) && !isGeoRestricted2(config)
});
UI15.ActionRegistration.registerActionExtension({
  actionId: "freestyler.elements-floating-button",
  contextTypes() {
    return [];
  },
  category: "GLOBAL",
  title: i18nLazyString17(UIStrings17.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: (config) => isStylingAgentFeatureAvailable(config) && !isPolicyRestricted2(config) && !isGeoRestricted2(config)
});
UI15.ActionRegistration.registerActionExtension({
  actionId: "freestyler.element-panel-context",
  contextTypes() {
    return [];
  },
  category: "GLOBAL",
  title: i18nLazyString17(UIStrings17.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: (config) => isStylingAgentFeatureAvailable(config) && !isPolicyRestricted2(config) && !isGeoRestricted2(config)
});
UI15.ActionRegistration.registerActionExtension({
  actionId: "drjones.network-floating-button",
  contextTypes() {
    return [];
  },
  category: "GLOBAL",
  title: i18nLazyString17(UIStrings17.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: (config) => isNetworkAgentFeatureAvailable(config) && !isPolicyRestricted2(config) && !isGeoRestricted2(config)
});
UI15.ActionRegistration.registerActionExtension({
  actionId: "drjones.network-panel-context",
  contextTypes() {
    return [];
  },
  category: "GLOBAL",
  title: i18nLazyString17(UIStrings17.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: (config) => isNetworkAgentFeatureAvailable(config) && !isPolicyRestricted2(config) && !isGeoRestricted2(config)
});
UI15.ActionRegistration.registerActionExtension({
  actionId: "drjones.performance-panel-context",
  contextTypes() {
    return [];
  },
  category: "GLOBAL",
  title: i18nLazyString17(UIStrings17.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: (config) => isPerformanceAgentFeatureAvailable(config) && !isPolicyRestricted2(config) && !isGeoRestricted2(config)
});
UI15.ActionRegistration.registerActionExtension({
  actionId: "drjones.sources-floating-button",
  contextTypes() {
    return [];
  },
  category: "GLOBAL",
  title: i18nLazyString17(UIStrings17.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: (config) => isFileAgentFeatureAvailable(config) && !isPolicyRestricted2(config) && !isGeoRestricted2(config)
});
UI15.ActionRegistration.registerActionExtension({
  actionId: "drjones.sources-panel-context",
  contextTypes() {
    return [];
  },
  category: "GLOBAL",
  title: i18nLazyString17(UIStrings17.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: (config) => isFileAgentFeatureAvailable(config) && !isPolicyRestricted2(config) && !isGeoRestricted2(config)
});

// gen/front_end/entrypoints/shell/shell.prebundle.js
import "./../main/main.js";
//# sourceMappingURL=shell.js.map
