var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/snippets/ScriptSnippetFileSystem.js
var ScriptSnippetFileSystem_exports = {};
__export(ScriptSnippetFileSystem_exports, {
  SnippetFileSystem: () => SnippetFileSystem,
  evaluateScriptSnippet: () => evaluateScriptSnippet,
  findSnippetsProject: () => findSnippetsProject,
  isSnippetsProject: () => isSnippetsProject,
  isSnippetsUISourceCode: () => isSnippetsUISourceCode
});
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Persistence from "./../../models/persistence/persistence.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Default snippet name when a new snippet is created in the Sources panel
   * @example {1} PH1
   */
  scriptSnippet: "Script snippet #{PH1}",
  /**
   * @description Text to show something is linked to another
   * @example {example.url} PH1
   */
  linkedTo: "Linked to {PH1}"
};
var str_ = i18n.i18n.registerUIStrings("panels/snippets/ScriptSnippetFileSystem.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function escapeSnippetName(name) {
  return Common.ParsedURL.ParsedURL.rawPathToEncodedPathString(name);
}
function unescapeSnippetName(name) {
  return Common.ParsedURL.ParsedURL.encodedPathToRawPathString(name);
}
var SnippetFileSystem = class extends Persistence.PlatformFileSystem.PlatformFileSystem {
  lastSnippetIdentifierSetting;
  snippetsSetting;
  constructor() {
    super("snippet://", Persistence.PlatformFileSystem.PlatformFileSystemType.SNIPPETS, false);
    this.lastSnippetIdentifierSetting = Common.Settings.Settings.instance().createSetting("script-snippets-last-identifier", 0);
    this.snippetsSetting = Common.Settings.Settings.instance().createSetting("script-snippets", []);
  }
  initialFilePaths() {
    const savedSnippets = this.snippetsSetting.get();
    return savedSnippets.map((snippet) => escapeSnippetName(snippet.name));
  }
  async createFile(_path, _name) {
    const nextId = this.lastSnippetIdentifierSetting.get() + 1;
    this.lastSnippetIdentifierSetting.set(nextId);
    const snippetName = i18nString(UIStrings.scriptSnippet, { PH1: nextId });
    const snippets = this.snippetsSetting.get();
    snippets.push({ name: snippetName, content: "" });
    this.snippetsSetting.set(snippets);
    return escapeSnippetName(snippetName);
  }
  async deleteFile(path) {
    const name = unescapeSnippetName(Common.ParsedURL.ParsedURL.substring(path, 1));
    const allSnippets = this.snippetsSetting.get();
    const snippets = allSnippets.filter((snippet) => snippet.name !== name);
    if (allSnippets.length !== snippets.length) {
      this.snippetsSetting.set(snippets);
      return true;
    }
    return false;
  }
  async requestFileContent(path) {
    const name = unescapeSnippetName(Common.ParsedURL.ParsedURL.substring(path, 1));
    const snippets = this.snippetsSetting.get();
    const snippet = snippets.find((snippet2) => snippet2.name === name);
    if (snippet) {
      return new TextUtils.ContentData.ContentData(
        snippet.content,
        /* isBase64 */
        false,
        "text/javascript"
      );
    }
    return { error: `A snippet with name '${name}' was not found` };
  }
  async setFileContent(path, content, _isBase64) {
    const name = unescapeSnippetName(Common.ParsedURL.ParsedURL.substring(path, 1));
    const snippets = this.snippetsSetting.get();
    const snippet = snippets.find((snippet2) => snippet2.name === name);
    if (snippet) {
      snippet.content = content;
      this.snippetsSetting.set(snippets);
      return true;
    }
    return false;
  }
  renameFile(path, newName, callback) {
    const name = unescapeSnippetName(Common.ParsedURL.ParsedURL.substring(path, 1));
    const snippets = this.snippetsSetting.get();
    const snippet = snippets.find((snippet2) => snippet2.name === name);
    newName = Common.ParsedURL.ParsedURL.trim(newName);
    if (!snippet || newName.length === 0 || snippets.find((snippet2) => snippet2.name === newName)) {
      callback(false);
      return;
    }
    snippet.name = newName;
    this.snippetsSetting.set(snippets);
    callback(true, newName);
  }
  async searchInPath(query, _progress) {
    const re = new RegExp(Platform.StringUtilities.escapeForRegExp(query), "i");
    const allSnippets = this.snippetsSetting.get();
    const matchedSnippets = allSnippets.filter((snippet) => snippet.content.match(re));
    return matchedSnippets.map((snippet) => `snippet:///${escapeSnippetName(snippet.name)}`);
  }
  mimeFromPath(_path) {
    return "text/javascript";
  }
  contentType(_path) {
    return Common.ResourceType.resourceTypes.Script;
  }
  tooltipForURL(url) {
    return i18nString(UIStrings.linkedTo, { PH1: unescapeSnippetName(Common.ParsedURL.ParsedURL.sliceUrlToEncodedPathString(url, this.path().length)) });
  }
  supportsAutomapping() {
    return true;
  }
};
async function evaluateScriptSnippet(uiSourceCode) {
  if (!Common.ParsedURL.schemeIs(uiSourceCode.url(), "snippet:")) {
    return;
  }
  const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
  if (!executionContext) {
    return;
  }
  const runtimeModel = executionContext.runtimeModel;
  const consoleModel = executionContext.target().model(SDK.ConsoleModel.ConsoleModel);
  await uiSourceCode.requestContentData();
  uiSourceCode.commitWorkingCopy();
  const expression = uiSourceCode.workingCopy();
  Common.Console.Console.instance().show();
  const url = uiSourceCode.url();
  const result = await executionContext.evaluate({
    expression: `${expression}
//# sourceURL=${url}`,
    objectGroup: "console",
    silent: false,
    includeCommandLineAPI: true,
    returnByValue: false,
    generatePreview: true,
    replMode: true
  }, true, true);
  if ("exceptionDetails" in result && result.exceptionDetails) {
    consoleModel?.addMessage(SDK.ConsoleModel.ConsoleMessage.fromException(
      runtimeModel,
      result.exceptionDetails,
      /* messageType */
      void 0,
      /* timestamp */
      void 0,
      url
    ));
    return;
  }
  if (!("object" in result) || !result.object) {
    return;
  }
  const scripts = executionContext.debuggerModel.scriptsForSourceURL(url);
  if (scripts.length < 1) {
    return;
  }
  const scriptId = scripts[scripts.length - 1].scriptId;
  const details = {
    type: SDK.ConsoleModel.FrontendMessageType.Result,
    url,
    parameters: [result.object],
    executionContextId: executionContext.id,
    scriptId
  };
  consoleModel?.addMessage(new SDK.ConsoleModel.ConsoleMessage(runtimeModel, "javascript", "info", "", details));
}
function isSnippetsUISourceCode(uiSourceCode) {
  return Common.ParsedURL.schemeIs(uiSourceCode.url(), "snippet:");
}
function isSnippetsProject(project) {
  return project.type() === Workspace.Workspace.projectTypes.FileSystem && Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) === Persistence.PlatformFileSystem.PlatformFileSystemType.SNIPPETS;
}
function findSnippetsProject() {
  const workspaceProject = Workspace.Workspace.WorkspaceImpl.instance().projectsForType(Workspace.Workspace.projectTypes.FileSystem).find((project) => Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) === "snippets");
  if (!workspaceProject) {
    throw new Error("Unable to find workspace project for the snippets file system");
  }
  return workspaceProject;
}

// gen/front_end/panels/snippets/SnippetsQuickOpen.js
var SnippetsQuickOpen_exports = {};
__export(SnippetsQuickOpen_exports, {
  SnippetsQuickOpen: () => SnippetsQuickOpen
});
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as IconButton from "./../../ui/components/icon_button/icon_button.js";
import * as QuickOpen from "./../../ui/legacy/components/quick_open/quick_open.js";
var UIStrings2 = {
  /**
   * @description Text in Snippets Quick Open of the Sources panel when opening snippets
   */
  noSnippetsFound: "No snippets found.",
  /**
   * @description Text for command prefix of run a code snippet
   */
  run: "Run",
  /**
   * @description Text for suggestion of run a code snippet
   */
  snippet: "Snippet",
  /**
   * @description Text for help title of run code snippet menu
   */
  runSnippet: "Run snippet"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/snippets/SnippetsQuickOpen.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var i18nLazyString = i18n3.i18n.getLazilyComputedLocalizedString.bind(void 0, str_2);
var snippetsQuickOpenInstance;
var SnippetsQuickOpen = class _SnippetsQuickOpen extends QuickOpen.FilteredListWidget.Provider {
  snippets;
  constructor() {
    super("snippet");
    this.snippets = [];
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!snippetsQuickOpenInstance || forceNew) {
      snippetsQuickOpenInstance = new _SnippetsQuickOpen();
    }
    return snippetsQuickOpenInstance;
  }
  selectItem(itemIndex, _promptValue) {
    if (itemIndex === null) {
      return;
    }
    void evaluateScriptSnippet(this.snippets[itemIndex]);
  }
  notFoundText(_query) {
    return i18nString2(UIStrings2.noSnippetsFound);
  }
  attach() {
    this.snippets = [...findSnippetsProject().uiSourceCodes()];
  }
  detach() {
    this.snippets = [];
  }
  itemScoreAt(itemIndex, query) {
    return query.length / this.snippets[itemIndex].name().length;
  }
  itemCount() {
    return this.snippets.length;
  }
  itemKeyAt(itemIndex) {
    return this.snippets[itemIndex].name();
  }
  renderItem(itemIndex, query, titleElement, _subtitleElement) {
    const icon = IconButton.Icon.create("snippet", "snippet");
    titleElement.parentElement?.parentElement?.insertBefore(icon, titleElement.parentElement);
    titleElement.textContent = this.snippets[itemIndex].name();
    QuickOpen.FilteredListWidget.FilteredListWidget.highlightRanges(titleElement, query, true);
  }
};
QuickOpen.FilteredListWidget.registerProvider({
  prefix: "!",
  iconName: "exclamation",
  provider: () => Promise.resolve(SnippetsQuickOpen.instance()),
  helpTitle: i18nLazyString(UIStrings2.runSnippet),
  titlePrefix: i18nLazyString(UIStrings2.run),
  titleSuggestion: i18nLazyString(UIStrings2.snippet)
});
export {
  ScriptSnippetFileSystem_exports as ScriptSnippetFileSystem,
  SnippetsQuickOpen_exports as SnippetsQuickOpen
};
//# sourceMappingURL=snippets.js.map
