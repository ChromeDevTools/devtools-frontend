/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as SourceMapScopes from '../../models/source_map_scopes/source_map_scopes.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import {AddDebugInfoURLDialog} from './AddSourceMapURLDialog.js';
import {BreakpointEditDialog, type BreakpointEditDialogResult} from './BreakpointEditDialog.js';
import {Plugin} from './Plugin.js';
import {ScriptFormatterEditorAction} from './ScriptFormatterEditorAction.js';
import {SourcesPanel} from './SourcesPanel.js';
import {getRegisteredEditorActions} from './SourcesView.js';

const {EMPTY_BREAKPOINT_CONDITION, NEVER_PAUSE_HERE_CONDITION} = Bindings.BreakpointManager;

const UIStrings = {
  /**
   *@description Text in Debugger Plugin of the Sources panel
   */
  thisScriptIsOnTheDebuggersIgnore: 'This script is on the debugger\'s ignore list',
  /**
   *@description Text to stop preventing the debugger from stepping into library code
   */
  removeFromIgnoreList: 'Remove from ignore list',
  /**
   *@description Text of a button in the Sources panel Debugger Plugin to configure ignore listing in Settings
   */
  configure: 'Configure',
  /**
   *@description Text in Debugger Plugin of the Sources panel
   */
  sourceMapFoundButIgnoredForFile: 'Source map found, but ignored for file on ignore list.',
  /**
   *@description Text to add a breakpoint
   */
  addBreakpoint: 'Add breakpoint',
  /**
   *@description A context menu item in the Debugger Plugin of the Sources panel
   */
  addConditionalBreakpoint: 'Add conditional breakpoint…',
  /**
   *@description A context menu item in the Debugger Plugin of the Sources panel
   */
  addLogpoint: 'Add logpoint…',
  /**
   *@description A context menu item in the Debugger Plugin of the Sources panel
   */
  neverPauseHere: 'Never pause here',
  /**
   *@description Context menu command to delete/remove a breakpoint that the user
   *has set. One line of code can have multiple breakpoints. Always >= 1 breakpoint.
   */
  removeBreakpoint: '{n, plural, =1 {Remove breakpoint} other {Remove all breakpoints in line}}',
  /**
   *@description A context menu item in the Debugger Plugin of the Sources panel
   */
  editBreakpoint: 'Edit breakpoint…',
  /**
   *@description Context menu command to disable (but not delete) a breakpoint
   *that the user has set. One line of code can have multiple breakpoints. Always
   *>= 1 breakpoint.
   */
  disableBreakpoint: '{n, plural, =1 {Disable breakpoint} other {Disable all breakpoints in line}}',
  /**
   *@description Context menu command to enable a breakpoint that the user has
   *set. One line of code can have multiple breakpoints. Always >= 1 breakpoint.
   */
  enableBreakpoint: '{n, plural, =1 {Enable breakpoint} other {Enable all breakpoints in line}}',
  /**
   *@description Text in Debugger Plugin of the Sources panel
   */
  addSourceMap: 'Add source map…',
  /**
   *@description Text in Debugger Plugin of the Sources panel
   */
  addWasmDebugInfo: 'Add DWARF debug info…',
  /**
   *@description Text in Debugger Plugin of the Sources panel
   */
  sourceMapDetected: 'Source map detected.',
  /**
   *@description Text in Debugger Plugin of the Sources panel
   */
  prettyprintThisMinifiedFile: 'Pretty-print this minified file?',
  /**
   *@description Label of a button in the Sources panel to pretty-print the current file
   */
  prettyprint: 'Pretty-print',
  /**
   *@description Text in Debugger Plugin pretty-print details message of the Sources panel
   *@example {Debug} PH1
   */
  prettyprintingWillFormatThisFile:
      'Pretty-printing will format this file in a new tab where you can continue debugging. You can also pretty-print this file by clicking the {PH1} button on the bottom status bar.',
  /**
   *@description Title of the Filtered List WidgetProvider of Quick Open
   *@example {Ctrl+P Ctrl+O} PH1
   */
  associatedFilesAreAvailable: 'Associated files are available via file tree or {PH1}.',
  /**
   *@description Text in Debugger Plugin of the Sources panel
   */
  associatedFilesShouldBeAdded:
      'Associated files should be added to the file tree. You can debug these resolved source files as regular JavaScript files.',
  /**
   *@description Text in Debugger Plugin of the Sources panel
   */
  theDebuggerWillSkipStepping: 'The debugger will skip stepping through this script, and will not stop on exceptions.',
  /**
   *@description Error message that is displayed in UI when a file needed for debugging information for a call frame is missing
   *@example {src/myapp.debug.wasm.dwp} PH1
   */
  debugFileNotFound: 'Failed to load debug file "{PH1}".',
  /**
   *@description Error message that is displayed when no debug info could be loaded
   *@example {app.wasm} PH1
   */
  debugInfoNotFound: 'Failed to load any debug info for {PH1}.',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/DebuggerPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// Note: Line numbers are passed around as zero-based numbers (though
// CodeMirror numbers them from 1).

// Don't scan for possible breakpoints on a line beyond this position;
const MAX_POSSIBLE_BREAKPOINT_LINE = 2500;

// Limits on inline variable view computation.
const MAX_CODE_SIZE_FOR_VALUE_DECORATIONS = 10000;
const MAX_PROPERTIES_IN_SCOPE_FOR_VALUE_DECORATIONS = 500;

type BreakpointDescription = {
  position: number,
  breakpoint: Bindings.BreakpointManager.Breakpoint,
};

const debuggerPluginForUISourceCode = new Map<Workspace.UISourceCode.UISourceCode, DebuggerPlugin>();

export class DebuggerPlugin extends Plugin {
  private editor: TextEditor.TextEditor.TextEditor|undefined = undefined;
  // Set if the debugger is stopped on a breakpoint in this file
  private executionLocation: Workspace.UISourceCode.UILocation|null = null;
  // Track state of the control key because holding it makes debugger
  // target locations show up in the editor
  private controlDown: boolean = false;
  private controlTimeout: number|undefined = undefined;
  private sourceMapInfobar: UI.Infobar.Infobar|null = null;
  private readonly scriptsPanel: SourcesPanel;
  private readonly breakpointManager: Bindings.BreakpointManager.BreakpointManager;
  // Manages pop-overs shown when the debugger is active and the user
  // hovers over an expression
  private popoverHelper: UI.PopoverHelper.PopoverHelper|null = null;
  private scriptFileForDebuggerModel:
      Map<SDK.DebuggerModel.DebuggerModel, Bindings.ResourceScriptMapping.ResourceScriptFile>;
  // The current set of breakpoints for this file. The locations in
  // here are kept in sync with their editor position. When a file's
  // content is edited and later saved, these are used as a source of
  // truth for re-creating the breakpoints.
  private breakpoints: BreakpointDescription[] = [];
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private continueToLocations: {from: number, to: number, async: boolean, click: () => void}[]|null = null;
  private readonly liveLocationPool: Bindings.LiveLocation.LiveLocationPool;
  // When the editor content is changed by the user, this becomes
  // true. When the plugin is muted, breakpoints show up as disabled
  // and can't be manipulated. It is cleared again when the content is
  // saved.
  private muted: boolean;
  // If the plugin is initialized in muted state, we cannot correlated
  // breakpoint position in the breakpoint manager with editor
  // locations, so breakpoint manipulation is permanently disabled.
  private initializedMuted: boolean;
  private ignoreListInfobar: UI.Infobar.Infobar|null;
  private prettyPrintInfobar!: UI.Infobar.Infobar|null;
  private refreshBreakpointsTimeout: undefined|number = undefined;
  private activeBreakpointDialog: BreakpointEditDialog|null = null;
  private missingDebugInfoBar: UI.Infobar.Infobar|null = null;

  private readonly ignoreListCallback: () => void;

  constructor(
      uiSourceCode: Workspace.UISourceCode.UISourceCode,
      private readonly transformer: SourceFrame.SourceFrame.Transformer) {
    super(uiSourceCode);

    debuggerPluginForUISourceCode.set(uiSourceCode, this);

    this.scriptsPanel = SourcesPanel.instance();
    this.breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance();

    this.breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointAdded, this.breakpointChange, this);
    this.breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointRemoved, this.breakpointChange, this);

    this.uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);

    this.scriptFileForDebuggerModel = new Map();

    this.ignoreListCallback = this.showIgnoreListInfobarIfNeeded.bind(this);
    Bindings.IgnoreListManager.IgnoreListManager.instance().addChangeListener(this.ignoreListCallback);

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DebuggerModel.CallFrame, this.callFrameChanged, this);
    this.liveLocationPool = new Bindings.LiveLocation.LiveLocationPool();

    this.updateScriptFiles();

    this.muted = this.uiSourceCode.isDirty();
    this.initializedMuted = this.muted;

    this.ignoreListInfobar = null;
    this.showIgnoreListInfobarIfNeeded();
    for (const scriptFile of this.scriptFileForDebuggerModel.values()) {
      scriptFile.checkMapping();
    }

    if (!Root.Runtime.experiments.isEnabled('sourcesPrettyPrint')) {
      this.prettyPrintInfobar = null;
      void this.detectMinified();
    }
  }

  editorExtension(): CodeMirror.Extension {
    // Kludge to hook editor keyboard events into the ShortcutRegistry
    // system.
    const handlers = this.shortcutHandlers();

    return [
      CodeMirror.EditorView.updateListener.of(update => this.onEditorUpdate(update)),
      CodeMirror.EditorView.domEventHandlers({
        keydown: (event): boolean => {
          if (this.onKeyDown(event)) {
            return true;
          }
          handlers(event);
          return event.defaultPrevented;
        },
        keyup: event => this.onKeyUp(event),
        mousemove: event => this.onMouseMove(event),
        mousedown: event => this.onMouseDown(event),
        focusout: event => this.onBlur(event),
        wheel: event => this.onWheel(event),
      }),
      CodeMirror.lineNumbers({
        domEventHandlers: {
          mousedown: (view, block, event) =>
              this.handleGutterClick(view.state.doc.lineAt(block.from), event as MouseEvent),
        },
      }),
      infobarState,
      breakpointMarkers,
      CodeMirror.Prec.highest(executionLine.field),
      CodeMirror.Prec.lowest(continueToMarkers.field),
      markIfContinueTo,
      valueDecorations.field,
      CodeMirror.Prec.lowest(evalExpression.field),
      theme,
      this.uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Debugger ?
          CodeMirror.EditorView.editorAttributes.of({class: 'source-frame-debugger-script'}) :
          [],
    ];
  }

  private shortcutHandlers(): (event: KeyboardEvent) => void {
    const selectionLine = (editor: TextEditor.TextEditor.TextEditor): CodeMirror.Line => {
      return editor.state.doc.lineAt(editor.state.selection.main.head);
    };

    return UI.ShortcutRegistry.ShortcutRegistry.instance().getShortcutListener({
      'debugger.toggle-breakpoint': async(): Promise<boolean> => {
        if (this.muted || !this.editor) {
          return false;
        }
        await this.toggleBreakpoint(selectionLine(this.editor), false);
        return true;
      },
      'debugger.toggle-breakpoint-enabled': async(): Promise<boolean> => {
        if (this.muted || !this.editor) {
          return false;
        }
        await this.toggleBreakpoint(selectionLine(this.editor), true);
        return true;
      },
      'debugger.breakpoint-input-window': async(): Promise<boolean> => {
        if (this.muted || !this.editor) {
          return false;
        }
        const line = selectionLine(this.editor);
        const breakpoint =
            this.breakpoints.find(b => b.position >= line.from && b.position <= line.to)?.breakpoint || null;
        Host.userMetrics.breakpointEditDialogRevealedFrom(
            Host.UserMetrics.BreakpointEditDialogRevealedFrom.KeyboardShortcut);
        this.editBreakpointCondition(line, breakpoint, null, breakpoint?.isLogpoint());
        return true;
      },
    });
  }

  editorInitialized(editor: TextEditor.TextEditor.TextEditor): void {
    // Start asynchronous actions that require access to the editor
    // instance
    this.editor = editor;
    computeNonBreakableLines(editor.state, this.transformer, this.uiSourceCode).then(linePositions => {
      if (linePositions.length) {
        editor.dispatch({effects: SourceFrame.SourceFrame.addNonBreakableLines.of(linePositions)});
      }
    }, console.error);
    if (this.ignoreListInfobar) {
      this.attachInfobar(this.ignoreListInfobar);
    }
    if (this.missingDebugInfoBar) {
      this.attachInfobar(this.missingDebugInfoBar);
    }
    if (this.sourceMapInfobar) {
      this.attachInfobar(this.sourceMapInfobar);
    }
    if (!this.muted) {
      void this.refreshBreakpoints();
    }
    void this.callFrameChanged();

    this.popoverHelper?.dispose();
    this.popoverHelper = new UI.PopoverHelper.PopoverHelper(editor, this.getPopoverRequest.bind(this));
    this.popoverHelper.setDisableOnClick(true);
    this.popoverHelper.setTimeout(250, 250);
    this.popoverHelper.setHasPadding(true);
  }

  static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return uiSourceCode.contentType().hasScripts();
  }

  private showIgnoreListInfobarIfNeeded(): void {
    const uiSourceCode = this.uiSourceCode;
    if (!uiSourceCode.contentType().hasScripts()) {
      return;
    }
    const projectType = uiSourceCode.project().type();
    if (!Bindings.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(uiSourceCode.url())) {
      this.hideIgnoreListInfobar();
      return;
    }

    if (this.ignoreListInfobar) {
      this.ignoreListInfobar.dispose();
    }

    function unIgnoreList(): void {
      Bindings.IgnoreListManager.IgnoreListManager.instance().unIgnoreListUISourceCode(uiSourceCode);
      if (projectType === Workspace.Workspace.projectTypes.ContentScripts) {
        Bindings.IgnoreListManager.IgnoreListManager.instance().unIgnoreListContentScripts();
      }
    }

    const infobar =
        new UI.Infobar.Infobar(UI.Infobar.Type.Warning, i18nString(UIStrings.thisScriptIsOnTheDebuggersIgnore), [
          {text: i18nString(UIStrings.removeFromIgnoreList), highlight: false, delegate: unIgnoreList, dismiss: true},
          {
            text: i18nString(UIStrings.configure),
            highlight: false,
            delegate:
                UI.ViewManager.ViewManager.instance().showView.bind(UI.ViewManager.ViewManager.instance(), 'blackbox'),
            dismiss: false,
          },
        ]);
    this.ignoreListInfobar = infobar;
    infobar.setCloseCallback(() => this.removeInfobar(this.ignoreListInfobar));

    infobar.createDetailsRowMessage(i18nString(UIStrings.theDebuggerWillSkipStepping));

    const scriptFile =
        this.scriptFileForDebuggerModel.size ? this.scriptFileForDebuggerModel.values().next().value : null;
    if (scriptFile && scriptFile.hasSourceMapURL()) {
      infobar.createDetailsRowMessage(i18nString(UIStrings.sourceMapFoundButIgnoredForFile));
    }
    this.attachInfobar(this.ignoreListInfobar);
  }

  attachInfobar(bar: UI.Infobar.Infobar): void {
    if (this.editor) {
      this.editor.dispatch({effects: addInfobar.of(bar)});
    }
  }

  removeInfobar(bar: UI.Infobar.Infobar|null): void {
    if (this.editor && bar) {
      this.editor.dispatch({effects: removeInfobar.of(bar)});
    }
  }

  private hideIgnoreListInfobar(): void {
    if (!this.ignoreListInfobar) {
      return;
    }
    this.ignoreListInfobar.dispose();
    this.ignoreListInfobar = null;
  }

  willHide(): void {
    this.popoverHelper?.hidePopover();
  }

  editBreakpointLocation({breakpoint, uiLocation}: Bindings.BreakpointManager.BreakpointLocation): void {
    const {lineNumber} = this.transformer.uiLocationToEditorLocation(uiLocation.lineNumber, uiLocation.columnNumber);
    const line = this.editor?.state.doc.line(lineNumber + 1);
    if (!line) {
      return;
    }
    this.editBreakpointCondition(line, breakpoint, null, breakpoint.isLogpoint());
  }

  populateLineGutterContextMenu(contextMenu: UI.ContextMenu.ContextMenu, editorLineNumber: number): void {
    const uiLocation = new Workspace.UISourceCode.UILocation(this.uiSourceCode, editorLineNumber, 0);
    this.scriptsPanel.appendUILocationItems(contextMenu, uiLocation);
    if (this.muted || !this.editor) {
      return;
    }
    const line = this.editor.state.doc.line(editorLineNumber + 1);
    const breakpoints = this.lineBreakpoints(line);
    const supportsConditionalBreakpoints =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().supportsConditionalBreakpoints(
            this.uiSourceCode);
    if (!breakpoints.length) {
      if (this.editor && SourceFrame.SourceFrame.isBreakableLine(this.editor.state, line)) {
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.addBreakpoint),
            this.createNewBreakpoint.bind(
                this, line, EMPTY_BREAKPOINT_CONDITION, /* enabled */ true, /* isLogpoint */ false));
        if (supportsConditionalBreakpoints) {
          contextMenu.debugSection().appendItem(i18nString(UIStrings.addConditionalBreakpoint), () => {
            Host.userMetrics.breakpointEditDialogRevealedFrom(
                Host.UserMetrics.BreakpointEditDialogRevealedFrom.LineGutterContextMenu);
            this.editBreakpointCondition(line, null, null, false /* isLogpoint */);
          });
          contextMenu.debugSection().appendItem(i18nString(UIStrings.addLogpoint), () => {
            Host.userMetrics.breakpointEditDialogRevealedFrom(
                Host.UserMetrics.BreakpointEditDialogRevealedFrom.LineGutterContextMenu);
            this.editBreakpointCondition(line, null, null, true /* isLogpoint */);
          });
          contextMenu.debugSection().appendItem(
              i18nString(UIStrings.neverPauseHere),
              this.createNewBreakpoint.bind(
                  this, line, NEVER_PAUSE_HERE_CONDITION, /* enabled */ true, /* isLogpoint */ false));
        }
      }
    } else {
      const removeTitle = i18nString(UIStrings.removeBreakpoint, {n: breakpoints.length});
      contextMenu.debugSection().appendItem(
          removeTitle, () => breakpoints.forEach(breakpoint => void breakpoint.remove(false)));
      if (breakpoints.length === 1 && supportsConditionalBreakpoints) {
        // Editing breakpoints only make sense for conditional breakpoints
        // and logpoints and both are currently only available for JavaScript
        // debugging.
        contextMenu.debugSection().appendItem(i18nString(UIStrings.editBreakpoint), () => {
          Host.userMetrics.breakpointEditDialogRevealedFrom(
              Host.UserMetrics.BreakpointEditDialogRevealedFrom.BreakpointMarkerContextMenu);
          this.editBreakpointCondition(line, breakpoints[0], null);
        });
      }
      const hasEnabled = breakpoints.some(breakpoint => breakpoint.enabled());
      if (hasEnabled) {
        const title = i18nString(UIStrings.disableBreakpoint, {n: breakpoints.length});
        contextMenu.debugSection().appendItem(
            title, () => breakpoints.forEach(breakpoint => breakpoint.setEnabled(false)));
      }
      const hasDisabled = breakpoints.some(breakpoint => !breakpoint.enabled());
      if (hasDisabled) {
        const title = i18nString(UIStrings.enableBreakpoint, {n: breakpoints.length});
        contextMenu.debugSection().appendItem(
            title, () => breakpoints.forEach(breakpoint => breakpoint.setEnabled(true)));
      }
    }
  }

  populateTextAreaContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void {
    function addSourceMapURL(scriptFile: Bindings.ResourceScriptMapping.ResourceScriptFile): void {
      const dialog =
          AddDebugInfoURLDialog.createAddSourceMapURLDialog(addSourceMapURLDialogCallback.bind(null, scriptFile));
      dialog.show();
    }

    function addSourceMapURLDialogCallback(
        scriptFile: Bindings.ResourceScriptMapping.ResourceScriptFile, url: Platform.DevToolsPath.UrlString): void {
      if (!url) {
        return;
      }
      scriptFile.addSourceMapURL(url);
    }

    function addDebugInfoURL(scriptFile: Bindings.ResourceScriptMapping.ResourceScriptFile): void {
      const dialog =
          AddDebugInfoURLDialog.createAddDWARFSymbolsURLDialog(addDebugInfoURLDialogCallback.bind(null, scriptFile));
      dialog.show();
    }

    function addDebugInfoURLDialogCallback(
        scriptFile: Bindings.ResourceScriptMapping.ResourceScriptFile, url: Platform.DevToolsPath.UrlString): void {
      if (!url) {
        return;
      }
      scriptFile.addDebugInfoURL(url);
    }

    if (this.uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network &&
        Common.Settings.Settings.instance().moduleSetting('jsSourceMapsEnabled').get() &&
        !Bindings.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(this.uiSourceCode.url())) {
      if (this.scriptFileForDebuggerModel.size) {
        const scriptFile: Bindings.ResourceScriptMapping.ResourceScriptFile =
            this.scriptFileForDebuggerModel.values().next().value;
        const addSourceMapURLLabel = i18nString(UIStrings.addSourceMap);
        contextMenu.debugSection().appendItem(addSourceMapURLLabel, addSourceMapURL.bind(null, scriptFile));
        if (scriptFile.script?.isWasm() &&
            !Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().pluginManager?.hasPluginForScript(
                scriptFile.script)) {
          contextMenu.debugSection().appendItem(
              i18nString(UIStrings.addWasmDebugInfo), addDebugInfoURL.bind(null, scriptFile));
        }
      }
    }
  }

  private workingCopyChanged(): void {
    if (!this.scriptFileForDebuggerModel.size) {
      this.setMuted(this.uiSourceCode.isDirty());
    }
  }

  private workingCopyCommitted(): void {
    this.scriptsPanel.updateLastModificationTime();
    if (!this.scriptFileForDebuggerModel.size) {
      this.setMuted(false);
    }
  }

  private didMergeToVM(): void {
    if (this.consistentScripts()) {
      this.setMuted(false);
    }
  }

  private didDivergeFromVM(): void {
    this.setMuted(true);
  }

  private setMuted(value: boolean): void {
    if (this.initializedMuted) {
      return;
    }
    if (value !== this.muted) {
      this.muted = value;
      if (!value) {
        void this.restoreBreakpointsAfterEditing();
      } else if (this.editor) {
        this.editor.dispatch({effects: muteBreakpoints.of(null)});
      }
    }
  }

  private consistentScripts(): boolean {
    for (const scriptFile of this.scriptFileForDebuggerModel.values()) {
      if (scriptFile.hasDivergedFromVM() || scriptFile.isMergingToVM()) {
        return false;
      }
    }
    return true;
  }

  private isVariableIdentifier(tokenType: string): boolean {
    return tokenType === 'VariableName' || tokenType === 'VariableDefinition';
  }

  private isIdentifier(tokenType: string): boolean {
    return tokenType === 'VariableName' || tokenType === 'VariableDefinition' || tokenType === 'PropertyName' ||
        tokenType === 'PropertyDefinition';
  }

  private getPopoverRequest(event: MouseEvent): UI.PopoverHelper.PopoverRequest|null {
    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      return null;
    }
    const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
    const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
    const {editor} = this;
    if (!debuggerModel || !debuggerModel.isPaused() || !editor) {
      return null;
    }

    const selectedCallFrame =
        (UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame) as SDK.DebuggerModel.CallFrame);
    if (!selectedCallFrame) {
      return null;
    }

    let textPosition = editor.editor.posAtCoords(event);
    if (!textPosition) {
      return null;
    }
    const positionCoords = editor.editor.coordsAtPos(textPosition);
    if (!positionCoords || event.clientY < positionCoords.top || event.clientY > positionCoords.bottom ||
        event.clientX < positionCoords.left - 30 || event.clientX > positionCoords.right + 30) {
      return null;
    }
    if (event.clientX < positionCoords.left && textPosition > editor.state.doc.lineAt(textPosition).from) {
      textPosition -= 1;
    }

    const highlightRange = computePopoverHighlightRange(editor.state, this.uiSourceCode.mimeType(), textPosition);
    if (!highlightRange) {
      return null;
    }

    const highlightLine = editor.state.doc.lineAt(highlightRange.from);
    if (highlightRange.to > highlightLine.to) {
      return null;
    }

    const leftCorner = editor.editor.coordsAtPos(highlightRange.from);
    const rightCorner = editor.editor.coordsAtPos(highlightRange.to);
    if (!leftCorner || !rightCorner) {
      return null;
    }
    const box = new AnchorBox(
        leftCorner.left, leftCorner.top - 2, rightCorner.right - leftCorner.left, rightCorner.bottom - leftCorner.top);
    const evaluationText = editor.state.sliceDoc(highlightRange.from, highlightRange.to);

    let objectPopoverHelper: ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper|null = null;
    return {
      box,
      show: async(popover: UI.GlassPane.GlassPane): Promise<boolean> => {
        const resolvedText = await SourceMapScopes.NamesResolver.resolveExpression(
            selectedCallFrame, evaluationText, this.uiSourceCode, highlightLine.number - 1,
            highlightRange.from - highlightLine.from, highlightRange.to - highlightLine.from);
        const result = await selectedCallFrame.evaluate({
          expression: resolvedText || evaluationText,
          objectGroup: 'popover',
          includeCommandLineAPI: false,
          silent: true,
          returnByValue: false,
          generatePreview: false,
          throwOnSideEffect: undefined,
          timeout: undefined,
          disableBreaks: undefined,
          replMode: undefined,
          allowUnsafeEvalBlockedByCSP: undefined,
        });
        if (!result || 'error' in result || !result.object ||
            (result.object.type === 'object' && result.object.subtype === 'error')) {
          return false;
        }
        objectPopoverHelper =
            await ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper.buildObjectPopover(result.object, popover);
        const potentiallyUpdatedCallFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
        if (!objectPopoverHelper || selectedCallFrame !== potentiallyUpdatedCallFrame) {
          debuggerModel.runtimeModel().releaseObjectGroup('popover');
          if (objectPopoverHelper) {
            objectPopoverHelper.dispose();
          }
          return false;
        }
        const decoration = CodeMirror.Decoration.set(evalExpressionMark.range(highlightRange.from, highlightRange.to));
        editor.dispatch({effects: evalExpression.update.of(decoration)});
        return true;
      },
      hide: (): void => {
        if (objectPopoverHelper) {
          objectPopoverHelper.dispose();
        }
        debuggerModel.runtimeModel().releaseObjectGroup('popover');
        editor.dispatch({effects: evalExpression.update.of(CodeMirror.Decoration.none)});
      },
    };
  }

  private onEditorUpdate(update: CodeMirror.ViewUpdate): void {
    if (!update.changes.empty) {
      // If the document changed, adjust known breakpoint positions
      // for that change
      for (const breakpointDesc of this.breakpoints) {
        breakpointDesc.position = update.changes.mapPos(breakpointDesc.position);
      }
    }
  }

  private onWheel(event: WheelEvent): void {
    if (this.executionLocation && UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      event.preventDefault();
    }
  }

  private onKeyDown(event: KeyboardEvent): boolean {
    const ctrlDown = UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event);
    if (!ctrlDown) {
      this.setControlDown(false);
    }
    if (event.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
      if (this.popoverHelper && this.popoverHelper.isPopoverVisible()) {
        this.popoverHelper.hidePopover();
        event.consume();
        return true;
      }
    }
    if (ctrlDown && this.executionLocation) {
      this.setControlDown(true);
    }
    return false;
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.executionLocation && this.controlDown &&
        UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      if (!this.continueToLocations) {
        void this.showContinueToLocations();
      }
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.executionLocation || !UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      return;
    }
    if (!this.continueToLocations || !this.editor) {
      return;
    }
    event.consume();
    const textPosition = this.editor.editor.posAtCoords(event);
    if (textPosition === null) {
      return;
    }
    for (const {from, to, click} of this.continueToLocations) {
      if (from <= textPosition && to >= textPosition) {
        click();
        break;
      }
    }
  }

  private onBlur(_event: Event): void {
    this.setControlDown(false);
  }

  private onKeyUp(_event: KeyboardEvent): void {
    this.setControlDown(false);
  }

  private setControlDown(state: boolean): void {
    if (state !== this.controlDown) {
      this.controlDown = state;
      clearTimeout(this.controlTimeout);
      this.controlTimeout = undefined;
      if (state && this.executionLocation) {
        this.controlTimeout = window.setTimeout(() => {
          if (this.executionLocation && this.controlDown) {
            void this.showContinueToLocations();
          }
        }, 150);
      } else {
        this.clearContinueToLocations();
      }
    }
  }

  private editBreakpointCondition(
      line: CodeMirror.Line, breakpoint: Bindings.BreakpointManager.Breakpoint|null, location: {
        lineNumber: number,
        columnNumber: number,
      }|null,
      isLogpoint?: boolean): void {
    if (breakpoint?.isRemoved) {
      // This method can get called for stale breakpoints, e.g. via the revealer.
      // In that case we don't show the edit dialog as to not resurrect the breakpoint
      // unintentionally.
      return;
    }
    const editor = this.editor as TextEditor.TextEditor.TextEditor;
    const oldCondition = breakpoint ? breakpoint.condition() : '';
    const isLogpointForDialog = breakpoint?.isLogpoint() ?? Boolean(isLogpoint);
    const decorationElement = document.createElement('div');
    const compartment = new CodeMirror.Compartment();
    const dialog = new BreakpointEditDialog(line.number - 1, oldCondition, isLogpointForDialog, async result => {
      this.activeBreakpointDialog = null;
      dialog.detach();
      editor.dispatch({effects: compartment.reconfigure([])});
      if (!result.committed) {
        return;
      }

      recordBreakpointWithConditionAdded(result);
      if (breakpoint) {
        breakpoint.setCondition(result.condition, result.isLogpoint);
      } else if (location) {
        await this.setBreakpoint(
            location.lineNumber, location.columnNumber, result.condition, /* enabled */ true, result.isLogpoint);
      } else {
        await this.createNewBreakpoint(line, result.condition, /* enabled */ true, result.isLogpoint);
      }
    });
    editor.dispatch({
      effects: CodeMirror.StateEffect.appendConfig.of(compartment.of(CodeMirror.EditorView.decorations.of(
          CodeMirror.Decoration.set([CodeMirror.Decoration
                                         .widget({
                                           block: true, widget: new class extends CodeMirror.WidgetType {
                                             toDOM(): HTMLElement {
                                               return decorationElement;
                                             }
                                           }(),
                                                                                  side: 1,
                                         })
                                         .range(line.to)])))),
    });
    dialog.markAsExternallyManaged();
    dialog.show(decorationElement);
    dialog.focusEditor();
    this.activeBreakpointDialog = dialog;

    function recordBreakpointWithConditionAdded(result: BreakpointEditDialogResult): void {
      const {condition: newCondition, isLogpoint} = result;
      const isConditionalBreakpoint = newCondition.length !== 0 && !isLogpoint;

      const wasLogpoint = breakpoint?.isLogpoint();
      const wasConditionalBreakpoint = oldCondition && oldCondition.length !== 0 && !wasLogpoint;
      if (isLogpoint && !wasLogpoint) {
        Host.userMetrics.breakpointWithConditionAdded(Host.UserMetrics.BreakpointWithConditionAdded.Logpoint);
      } else if (isConditionalBreakpoint && !wasConditionalBreakpoint) {
        Host.userMetrics.breakpointWithConditionAdded(
            Host.UserMetrics.BreakpointWithConditionAdded.ConditionalBreakpoint);
      }
    }
  }

  // Create decorations to indicate the current debugging position
  private computeExecutionDecorations(editorState: CodeMirror.EditorState, lineNumber: number, columnNumber: number):
      CodeMirror.DecorationSet {
    const {doc} = editorState;
    if (lineNumber >= doc.lines) {
      return CodeMirror.Decoration.none;
    }
    const line = doc.line(lineNumber + 1);
    const decorations: CodeMirror.Range<CodeMirror.Decoration>[] = [executionLineDeco.range(line.from)];
    const position = Math.min(line.to, line.from + columnNumber);
    let syntaxNode = CodeMirror.syntaxTree(editorState).resolveInner(position, 1);
    if (syntaxNode.to === syntaxNode.from - 1 && /[(.]/.test(doc.sliceString(syntaxNode.from, syntaxNode.to))) {
      syntaxNode = syntaxNode.resolve(syntaxNode.to, 1);
    }
    const tokenEnd = Math.min(line.to, syntaxNode.to);
    if (tokenEnd > position) {
      decorations.push(executionTokenDeco.range(position, tokenEnd));
    }

    return CodeMirror.Decoration.set(decorations);
  }

  // Show widgets with variable's values after lines that mention the
  // variables, if the debugger is paused in this file.
  private async updateValueDecorations(): Promise<void> {
    if (!this.editor) {
      return;
    }
    const decorations = this.executionLocation ? await this.computeValueDecorations() : null;
    // After the `await` the DebuggerPlugin could have been disposed. Re-check `this.editor`.
    if (!this.editor) {
      return;
    }
    if (decorations || this.editor.state.field(valueDecorations.field).size) {
      this.editor.dispatch({effects: valueDecorations.update.of(decorations || CodeMirror.Decoration.none)});
    }
  }

  async #rawLocationToEditorOffset(location: SDK.DebuggerModel.Location|null, url: Platform.DevToolsPath.UrlString):
      Promise<number|null> {
    const uiLocation = location &&
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
    if (!uiLocation || uiLocation.uiSourceCode.url() !== url) {
      return null;
    }
    const offset = this.editor?.toOffset(
        this.transformer.uiLocationToEditorLocation(uiLocation.lineNumber, uiLocation.columnNumber));
    return offset ?? null;
  }

  private async computeValueDecorations(): Promise<CodeMirror.DecorationSet|null> {
    if (!this.editor) {
      return null;
    }
    if (!Common.Settings.Settings.instance().moduleSetting('inlineVariableValues').get()) {
      return null;
    }
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (!executionContext) {
      return null;
    }
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame) {
      return null;
    }
    const url = this.uiSourceCode.url();

    const rawLocationToEditorOffset: (location: SDK.DebuggerModel.Location|null) => Promise<number|null> = location =>
        this.#rawLocationToEditorOffset(location, url);

    const functionOffsetPromise = this.#rawLocationToEditorOffset(callFrame.functionLocation(), url);
    const executionOffsetPromise = this.#rawLocationToEditorOffset(callFrame.location(), url);
    const [functionOffset, executionOffset] = await Promise.all([functionOffsetPromise, executionOffsetPromise]);
    if (!functionOffset || !executionOffset) {
      return null;
    }

    if (functionOffset >= executionOffset || executionOffset - functionOffset > MAX_CODE_SIZE_FOR_VALUE_DECORATIONS) {
      return null;
    }

    const variableNames = getVariableNamesByLine(this.editor.state, functionOffset, executionOffset, executionOffset);
    if (variableNames.length === 0) {
      return null;
    }

    const scopeMappings = await computeScopeMappings(callFrame, rawLocationToEditorOffset);
    if (scopeMappings.length === 0) {
      return null;
    }

    const variablesByLine = getVariableValuesByLine(scopeMappings, variableNames);
    if (!variablesByLine) {
      return null;
    }

    const decorations: CodeMirror.Range<CodeMirror.Decoration>[] = [];

    for (const [line, names] of variablesByLine) {
      const prevLine = variablesByLine.get(line - 1);
      let newNames = prevLine ? Array.from(names).filter(n => prevLine.get(n[0]) !== n[1]) : Array.from(names);
      if (!newNames.length) {
        continue;
      }
      if (newNames.length > 10) {
        newNames = newNames.slice(0, 10);
      }
      decorations.push(CodeMirror.Decoration.widget({widget: new ValueDecoration(newNames), side: 1})
                           .range(this.editor.state.doc.line(line + 1).to));
    }
    return CodeMirror.Decoration.set(decorations, true);
  }

  // Highlight the locations the debugger can continue to (when
  // Control is held)
  private async showContinueToLocations(): Promise<void> {
    this.popoverHelper?.hidePopover();
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (!executionContext || !this.editor) {
      return;
    }
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame) {
      return;
    }
    const start = callFrame.functionLocation() || callFrame.location();
    const debuggerModel = callFrame.debuggerModel;

    const {state} = this.editor;
    const locations = await debuggerModel.getPossibleBreakpoints(start, null, true);

    this.continueToLocations = [];
    let previousCallLine = -1;
    for (const location of locations.reverse()) {
      const editorLocation = this.transformer.uiLocationToEditorLocation(location.lineNumber, location.columnNumber);
      if (previousCallLine === editorLocation.lineNumber &&
              location.type !== Protocol.Debugger.BreakLocationType.Call ||
          editorLocation.lineNumber >= state.doc.lines) {
        continue;
      }
      const line = state.doc.line(editorLocation.lineNumber + 1);
      const position = Math.min(line.to, line.from + editorLocation.columnNumber);
      let syntaxNode = CodeMirror.syntaxTree(state).resolveInner(position, 1);
      if (syntaxNode.firstChild || syntaxNode.from < line.from ||
          syntaxNode.to > line.to) {  // Only use leaf nodes within the line
        continue;
      }
      if (syntaxNode.name === '.') {
        const nextNode = syntaxNode.resolve(syntaxNode.to, 1);
        if (nextNode.firstChild || nextNode.from < line.from || nextNode.to > line.to) {
          continue;
        }
        syntaxNode = nextNode;
      }
      const syntaxType = syntaxNode.name;
      const validKeyword = syntaxType === 'this' || syntaxType === 'return' || syntaxType === 'new' ||
          syntaxType === 'break' || syntaxType === 'continue';
      if (!validKeyword && !this.isIdentifier(syntaxType)) {
        continue;
      }

      this.continueToLocations.push(
          {from: syntaxNode.from, to: syntaxNode.to, async: false, click: () => location.continueToLocation()});
      if (location.type === Protocol.Debugger.BreakLocationType.Call) {
        previousCallLine = editorLocation.lineNumber;
      }

      const identifierName =
          validKeyword ? '' : line.text.slice(syntaxNode.from - line.from, syntaxNode.to - line.from);
      let asyncCall: CodeMirror.SyntaxNode|null = null;
      if (identifierName === 'then' && syntaxNode.parent?.name === 'MemberExpression') {
        asyncCall = syntaxNode.parent.parent;
      } else if (
          identifierName === 'setTimeout' || identifierName === 'setInterval' || identifierName === 'postMessage') {
        asyncCall = syntaxNode.parent;
      }
      if (syntaxType === 'new') {
        const callee = syntaxNode.parent?.getChild('Expression');
        if (callee && callee.name === 'VariableName' && state.sliceDoc(callee.from, callee.to) === 'Worker') {
          asyncCall = syntaxNode.parent;
        }
      }
      if (asyncCall && (asyncCall.name === 'CallExpression' || asyncCall.name === 'NewExpression') &&
          location.type === Protocol.Debugger.BreakLocationType.Call) {
        const firstArg = asyncCall.getChild('ArgList')?.firstChild?.nextSibling;
        let highlightNode;
        if (firstArg?.name === 'VariableName') {
          highlightNode = firstArg;
        } else if (firstArg?.name === 'ArrowFunction' || firstArg?.name === 'FunctionExpression') {
          highlightNode = firstArg.firstChild;
          if (highlightNode?.name === 'async') {
            highlightNode = highlightNode.nextSibling;
          }
        }
        if (highlightNode) {
          const isCurrentPosition = this.executionLocation &&
              location.lineNumber === this.executionLocation.lineNumber &&
              location.columnNumber === this.executionLocation.columnNumber;
          this.continueToLocations.push({
            from: highlightNode.from,
            to: highlightNode.to,
            async: true,
            click: () => this.asyncStepIn(location, Boolean(isCurrentPosition)),
          });
        }
      }
    }
    const decorations = CodeMirror.Decoration.set(
        this.continueToLocations.map(loc => {
          return (loc.async ? asyncContinueToMark : continueToMark).range(loc.from, loc.to);
        }),
        true);
    this.editor.dispatch({effects: continueToMarkers.update.of(decorations)});
  }

  private clearContinueToLocations(): void {
    if (this.editor && this.editor.state.field(continueToMarkers.field).size) {
      this.editor.dispatch({effects: continueToMarkers.update.of(CodeMirror.Decoration.none)});
    }
  }

  private asyncStepIn(location: SDK.DebuggerModel.BreakLocation, isCurrentPosition: boolean): void {
    if (!isCurrentPosition) {
      location.continueToLocation(asyncStepIn);
    } else {
      asyncStepIn();
    }

    function asyncStepIn(): void {
      location.debuggerModel.scheduleStepIntoAsync();
    }
  }

  private fetchBreakpoints(): {
    position: number,
    breakpoint: Bindings.BreakpointManager.Breakpoint,
  }[] {
    if (!this.editor) {
      return [];
    }
    const {editor} = this;
    const breakpointLocations = this.breakpointManager.breakpointLocationsForUISourceCode(this.uiSourceCode);
    return breakpointLocations.map(({uiLocation, breakpoint}) => {
      const editorLocation =
          this.transformer.uiLocationToEditorLocation(uiLocation.lineNumber, uiLocation.columnNumber);
      return {
        position: editor.toOffset(editorLocation),
        breakpoint,
      };
    });
  }

  private lineBreakpoints(line: CodeMirror.Line): readonly Bindings.BreakpointManager.Breakpoint[] {
    return this.breakpoints.filter(b => b.position >= line.from && b.position <= line.to).map(b => b.breakpoint);
  }

  // Compute the decorations for existing breakpoints (both on the
  // gutter and inline in the code)
  private async computeBreakpointDecoration(state: CodeMirror.EditorState, breakpoints: BreakpointDescription[]):
      Promise<BreakpointDecoration> {
    const decorations: CodeMirror.Range<CodeMirror.Decoration>[] = [];
    const gutterMarkers: CodeMirror.Range<CodeMirror.GutterMarker>[] = [];
    const breakpointsByLine = new Map<number, Bindings.BreakpointManager.Breakpoint[]>();
    const inlineMarkersByLine =
        new Map<number, {breakpoint: Bindings.BreakpointManager.Breakpoint | null, column: number}[]>();
    const possibleBreakpointRequests: Promise<void>[] = [];
    const inlineMarkerPositions = new Set<number>();

    const addInlineMarker =
        (linePos: number, columnNumber: number, breakpoint: Bindings.BreakpointManager.Breakpoint|null): void => {
          let inlineMarkers = inlineMarkersByLine.get(linePos);
          if (!inlineMarkers) {
            inlineMarkers = [];
            inlineMarkersByLine.set(linePos, inlineMarkers);
          }
          inlineMarkers.push({breakpoint, column: columnNumber});
        };

    for (const {position, breakpoint} of breakpoints) {
      const line = state.doc.lineAt(position);
      let forThisLine = breakpointsByLine.get(line.from);
      if (!forThisLine) {
        forThisLine = [];
        breakpointsByLine.set(line.from, forThisLine);
      }
      if (breakpoint.enabled() && forThisLine.every(b => !b.enabled())) {
        // Start a request for possible breakpoint positions on this line
        const start = this.transformer.editorLocationToUILocation(line.number - 1, 0);
        const end = this.transformer.editorLocationToUILocation(
            line.number - 1, Math.min(line.length, MAX_POSSIBLE_BREAKPOINT_LINE));
        const range = new TextUtils.TextRange.TextRange(
            start.lineNumber, start.columnNumber || 0, end.lineNumber, end.columnNumber || 0);
        possibleBreakpointRequests.push(this.breakpointManager.possibleBreakpoints(this.uiSourceCode, range)
                                            .then(locations => addPossibleBreakpoints(line, locations)));
      }
      forThisLine.push(breakpoint);
      if (breakpoint.enabled()) {
        inlineMarkerPositions.add(position);
        addInlineMarker(line.from, position - line.from, breakpoint);
      }
    }

    for (const [lineStart, lineBreakpoints] of breakpointsByLine) {
      const main = lineBreakpoints.sort(mostSpecificBreakpoint)[0];
      let gutterClass = 'cm-breakpoint';
      if (!main.enabled()) {
        gutterClass += ' cm-breakpoint-disabled';
      }
      if (!main.bound()) {
        gutterClass += ' cm-breakpoint-unbound';
      }
      if (main.isLogpoint()) {
        gutterClass += ' cm-breakpoint-logpoint';
      } else if (main.condition()) {
        gutterClass += ' cm-breakpoint-conditional';
      }
      gutterMarkers.push((new BreakpointGutterMarker(gutterClass)).range(lineStart));
    }

    const addPossibleBreakpoints = (line: CodeMirror.Line, locations: Workspace.UISourceCode.UILocation[]): void => {
      for (const location of locations) {
        const editorLocation = this.transformer.uiLocationToEditorLocation(location.lineNumber, location.columnNumber);
        if (editorLocation.lineNumber !== line.number - 1) {
          continue;
        }
        const position = Math.min(line.to, line.from + editorLocation.columnNumber);
        if (!inlineMarkerPositions.has(position)) {
          addInlineMarker(line.from, editorLocation.columnNumber, null);
        }
      }
    };

    await Promise.all(possibleBreakpointRequests);
    for (const [linePos, inlineMarkers] of inlineMarkersByLine) {
      if (inlineMarkers.length > 1) {
        for (const {column, breakpoint} of inlineMarkers) {
          const marker = new BreakpointInlineMarker(breakpoint, this);
          decorations.push(CodeMirror.Decoration.widget({widget: marker, side: -1}).range(linePos + column));
        }
      }
    }

    return {content: CodeMirror.Decoration.set(decorations, true), gutter: CodeMirror.RangeSet.of(gutterMarkers, true)};
  }

  // If, after editing, the editor is synced again (either by going
  // back to the original document or by saving), we replace any
  // breakpoints the breakpoint manager might have (which point into
  // the old file) with the breakpoints we have, which had their
  // positions tracked through the changes.
  private async restoreBreakpointsAfterEditing(): Promise<void> {
    const {breakpoints} = this;
    const editor = this.editor as TextEditor.TextEditor.TextEditor;
    this.breakpoints = [];
    await Promise.all(breakpoints.map(async description => {
      const {breakpoint, position} = description;
      const condition = breakpoint.condition(), enabled = breakpoint.enabled(), isLogpoint = breakpoint.isLogpoint();
      await breakpoint.remove(false);
      const editorLocation = editor.toLineColumn(position);
      const uiLocation =
          this.transformer.editorLocationToUILocation(editorLocation.lineNumber, editorLocation.columnNumber);
      await this.setBreakpoint(uiLocation.lineNumber, uiLocation.columnNumber, condition, enabled, isLogpoint);
    }));
  }

  private async refreshBreakpoints(): Promise<void> {
    if (this.editor) {
      this.breakpoints = this.fetchBreakpoints();
      const forBreakpoints = this.breakpoints;
      const decorations = await this.computeBreakpointDecoration(this.editor.state, forBreakpoints);
      // After the `await` we could have disposed of this DebuggerPlugin, so re-check `this.editor`.
      if (this.editor && this.breakpoints === forBreakpoints &&
          (decorations.gutter.size || this.editor.state.field(breakpointMarkers, false)?.gutter.size)) {
        this.editor.dispatch({effects: setBreakpointDeco.of(decorations)});
      }
    }
  }

  private breakpointChange(event: Common.EventTarget.EventTargetEvent<Bindings.BreakpointManager.BreakpointLocation>):
      void {
    const {uiLocation} = event.data;
    if (uiLocation.uiSourceCode !== this.uiSourceCode || this.muted) {
      return;
    }
    for (const scriptFile of this.scriptFileForDebuggerModel.values()) {
      if (scriptFile.isDivergingFromVM() || scriptFile.isMergingToVM()) {
        return;
      }
    }
    // These tend to arrive in bursts, so debounce them
    window.clearTimeout(this.refreshBreakpointsTimeout);
    this.refreshBreakpointsTimeout = window.setTimeout(() => this.refreshBreakpoints(), 50);
  }

  onInlineBreakpointMarkerClick(event: MouseEvent, breakpoint: Bindings.BreakpointManager.Breakpoint|null): void {
    event.consume(true);
    if (breakpoint) {
      if (event.shiftKey) {
        breakpoint.setEnabled(!breakpoint.enabled());
      } else {
        void breakpoint.remove(false);
      }
    } else if (this.editor) {
      const editorLocation = this.editor.editor.posAtDOM(event.target as unknown as HTMLElement);
      const line = this.editor.state.doc.lineAt(editorLocation);
      const uiLocation = this.transformer.editorLocationToUILocation(line.number - 1, editorLocation - line.from);
      void this.setBreakpoint(
          uiLocation.lineNumber, uiLocation.columnNumber, EMPTY_BREAKPOINT_CONDITION, /* enabled */ true,
          /* isLogpoint */ false);
    }
  }

  onInlineBreakpointMarkerContextMenu(event: MouseEvent, breakpoint: Bindings.BreakpointManager.Breakpoint|null): void {
    event.consume(true);
    // If there's events coming from the editor, there must be an editor.
    const editor = this.editor as TextEditor.TextEditor.TextEditor;
    const position = editor.editor.posAtDOM(event.target as unknown as HTMLElement);
    const line = editor.state.doc.lineAt(position);
    if (!SourceFrame.SourceFrame.isBreakableLine(editor.state, line) ||
        // Editing breakpoints only make sense for conditional breakpoints
        // and logpoints.
        !Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().supportsConditionalBreakpoints(
            this.uiSourceCode)) {
      return;
    }
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    if (breakpoint) {
      contextMenu.debugSection().appendItem(i18nString(UIStrings.editBreakpoint), () => {
        Host.userMetrics.breakpointEditDialogRevealedFrom(
            Host.UserMetrics.BreakpointEditDialogRevealedFrom.BreakpointMarkerContextMenu);
        this.editBreakpointCondition(line, breakpoint, null);
      });
    } else {
      const uiLocation = this.transformer.editorLocationToUILocation(line.number - 1, position - line.from);
      contextMenu.debugSection().appendItem(i18nString(UIStrings.addConditionalBreakpoint), () => {
        Host.userMetrics.breakpointEditDialogRevealedFrom(
            Host.UserMetrics.BreakpointEditDialogRevealedFrom.BreakpointMarkerContextMenu);
        this.editBreakpointCondition(line, null, uiLocation, false /* preferLogpoint */);
      });
      contextMenu.debugSection().appendItem(i18nString(UIStrings.addLogpoint), () => {
        Host.userMetrics.breakpointEditDialogRevealedFrom(
            Host.UserMetrics.BreakpointEditDialogRevealedFrom.BreakpointMarkerContextMenu);
        this.editBreakpointCondition(line, null, uiLocation, true /* preferLogpoint */);
      });

      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.neverPauseHere),
          () => this.setBreakpoint(
              uiLocation.lineNumber, uiLocation.columnNumber, NEVER_PAUSE_HERE_CONDITION, /* enabled */ true,
              /* isLogpoint */ false));
    }
    void contextMenu.show();
  }

  private updateScriptFiles(): void {
    for (const debuggerModel of SDK.TargetManager.TargetManager.instance().models(SDK.DebuggerModel.DebuggerModel)) {
      const scriptFile = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptFile(
          this.uiSourceCode, debuggerModel);
      if (scriptFile) {
        this.updateScriptFile(debuggerModel);
      }
    }
  }

  private updateScriptFile(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    const oldScriptFile = this.scriptFileForDebuggerModel.get(debuggerModel);
    const newScriptFile = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptFile(
        this.uiSourceCode, debuggerModel);
    this.scriptFileForDebuggerModel.delete(debuggerModel);
    if (oldScriptFile) {
      oldScriptFile.removeEventListener(
          Bindings.ResourceScriptMapping.ResourceScriptFile.Events.DidMergeToVM, this.didMergeToVM, this);
      oldScriptFile.removeEventListener(
          Bindings.ResourceScriptMapping.ResourceScriptFile.Events.DidDivergeFromVM, this.didDivergeFromVM, this);
      if (this.muted && !this.uiSourceCode.isDirty() && this.consistentScripts()) {
        this.setMuted(false);
      }
    }
    if (!newScriptFile) {
      return;
    }
    this.scriptFileForDebuggerModel.set(debuggerModel, newScriptFile);
    newScriptFile.addEventListener(
        Bindings.ResourceScriptMapping.ResourceScriptFile.Events.DidMergeToVM, this.didMergeToVM, this);
    newScriptFile.addEventListener(
        Bindings.ResourceScriptMapping.ResourceScriptFile.Events.DidDivergeFromVM, this.didDivergeFromVM, this);
    newScriptFile.checkMapping();
    if (newScriptFile.hasSourceMapURL()) {
      this.showSourceMapInfobar();
    }

    void newScriptFile.missingSymbolFiles().then(resources => {
      if (resources) {
        const details = i18nString(UIStrings.debugInfoNotFound, {PH1: newScriptFile.uiSourceCode.url()});
        this.updateMissingDebugInfoInfobar({resources, details});
      } else {
        this.updateMissingDebugInfoInfobar(null);
      }
    });
  }

  private updateMissingDebugInfoInfobar(warning: SDK.DebuggerModel.MissingDebugInfoDetails|null): void {
    if (this.missingDebugInfoBar) {
      return;
    }
    if (warning === null) {
      this.removeInfobar(this.missingDebugInfoBar);
      this.missingDebugInfoBar = null;
      return;
    }
    this.missingDebugInfoBar = UI.Infobar.Infobar.create(UI.Infobar.Type.Error, warning.details, []);
    if (!this.missingDebugInfoBar) {
      return;
    }
    for (const resource of warning.resources) {
      const detailsRow =
          this.missingDebugInfoBar?.createDetailsRowMessage(i18nString(UIStrings.debugFileNotFound, {PH1: resource}));
      if (detailsRow) {
        detailsRow.classList.add('infobar-selectable');
      }
    }
    this.missingDebugInfoBar.setCloseCallback(() => {
      this.removeInfobar(this.missingDebugInfoBar);
      this.missingDebugInfoBar = null;
    });
    this.attachInfobar(this.missingDebugInfoBar);
  }

  private showSourceMapInfobar(): void {
    if (this.sourceMapInfobar) {
      return;
    }
    this.sourceMapInfobar = UI.Infobar.Infobar.create(
        UI.Infobar.Type.Info, i18nString(UIStrings.sourceMapDetected), [],
        Common.Settings.Settings.instance().createSetting('sourceMapInfobarDisabled', false));
    if (!this.sourceMapInfobar) {
      return;
    }
    this.sourceMapInfobar.createDetailsRowMessage(i18nString(UIStrings.associatedFilesShouldBeAdded));
    this.sourceMapInfobar.createDetailsRowMessage(i18nString(UIStrings.associatedFilesAreAvailable, {
      PH1: String(UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction('quickOpen.show')),
    }));
    this.sourceMapInfobar.setCloseCallback(() => {
      this.removeInfobar(this.sourceMapInfobar);
      this.sourceMapInfobar = null;
    });
    this.attachInfobar(this.sourceMapInfobar);
  }

  private async detectMinified(): Promise<void> {
    const content = this.uiSourceCode.content();
    if (!content || !TextUtils.TextUtils.isMinified(content)) {
      return;
    }

    const editorActions = getRegisteredEditorActions();
    let formatterCallback: (() => void)|null = null;
    for (const editorAction of editorActions) {
      if (editorAction instanceof ScriptFormatterEditorAction) {
        // Check if the source code is formattable the same way the pretty print button does
        if (!editorAction.isCurrentUISourceCodeFormattable()) {
          return;
        }
        formatterCallback = editorAction.toggleFormatScriptSource.bind(editorAction);
        break;
      }
    }

    this.prettyPrintInfobar = UI.Infobar.Infobar.create(
        UI.Infobar.Type.Info, i18nString(UIStrings.prettyprintThisMinifiedFile),
        [{text: i18nString(UIStrings.prettyprint), delegate: formatterCallback, highlight: true, dismiss: true}],
        Common.Settings.Settings.instance().createSetting('prettyPrintInfobarDisabled', false));
    if (!this.prettyPrintInfobar) {
      return;
    }

    this.prettyPrintInfobar.setCloseCallback(() => {
      this.removeInfobar(this.prettyPrintInfobar);
      this.prettyPrintInfobar = null;
    });
    const toolbar = new UI.Toolbar.Toolbar('');
    const button = new UI.Toolbar.ToolbarButton('', 'largeicon-pretty-print');
    toolbar.appendToolbarItem(button);
    toolbar.element.style.display = 'inline';
    toolbar.element.style.verticalAlign = 'middle';
    toolbar.element.style.marginBottom = '3px';
    toolbar.element.style.pointerEvents = 'none';
    toolbar.element.tabIndex = -1;
    const element = this.prettyPrintInfobar.createDetailsRowMessage();
    element.appendChild(
        i18n.i18n.getFormatLocalizedString(str_, UIStrings.prettyprintingWillFormatThisFile, {PH1: toolbar.element}));
    UI.ARIAUtils.markAsAlert(element);
    this.attachInfobar(this.prettyPrintInfobar);
  }

  private handleGutterClick(line: CodeMirror.Line, event: MouseEvent): boolean {
    if (this.muted || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey) {
      return false;
    }
    void this.toggleBreakpoint(line, event.shiftKey);
    return true;
  }

  private async toggleBreakpoint(line: CodeMirror.Line, onlyDisable: boolean): Promise<void> {
    if (this.muted) {
      return;
    }
    if (this.activeBreakpointDialog) {
      this.activeBreakpointDialog.finishEditing(false, '');
    }

    const breakpoints = this.lineBreakpoints(line);
    if (!breakpoints.length) {
      await this.createNewBreakpoint(line, EMPTY_BREAKPOINT_CONDITION, /* enabled */ true, /* isLogpoint */ false);
      return;
    }
    const hasDisabled = breakpoints.some(b => !b.enabled());
    for (const breakpoint of breakpoints) {
      if (onlyDisable) {
        breakpoint.setEnabled(hasDisabled);
      } else {
        void breakpoint.remove(false);
      }
    }
  }

  private async createNewBreakpoint(
      line: CodeMirror.Line, condition: Bindings.BreakpointManager.UserCondition, enabled: boolean,
      isLogpoint: boolean): Promise<void> {
    if (!this.editor || !SourceFrame.SourceFrame.isBreakableLine(this.editor.state, line)) {
      return;
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ScriptsBreakpointSet);
    const origin = this.transformer.editorLocationToUILocation(line.number - 1);
    await this.setBreakpoint(origin.lineNumber, origin.columnNumber, condition, enabled, isLogpoint);
  }

  private async setBreakpoint(
      lineNumber: number, columnNumber: number|undefined, condition: Bindings.BreakpointManager.UserCondition,
      enabled: boolean, isLogpoint: boolean): Promise<void> {
    Common.Settings.Settings.instance().moduleSetting('breakpointsActive').set(true);
    await this.breakpointManager.setBreakpoint(
        this.uiSourceCode, lineNumber, columnNumber, condition, enabled, isLogpoint,
        Bindings.BreakpointManager.BreakpointOrigin.USER_ACTION);
    this.breakpointWasSetForTest(lineNumber, columnNumber, condition, enabled);
  }

  private breakpointWasSetForTest(
      _lineNumber: number, _columnNumber: number|undefined, _condition: string, _enabled: boolean): void {
  }

  private async callFrameChanged(): Promise<void> {
    this.liveLocationPool.disposeAll();
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame) {
      this.setExecutionLocation(null);
    } else {
      await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(
          callFrame.location(), async(liveLocation: Bindings.LiveLocation.LiveLocation): Promise<void> => {
            const uiLocation = await liveLocation.uiLocation();
            if (uiLocation && uiLocation.uiSourceCode.url() === this.uiSourceCode.url()) {
              this.setExecutionLocation(uiLocation);
              this.updateMissingDebugInfoInfobar(callFrame.missingDebugInfoDetails);
            } else {
              this.setExecutionLocation(null);
            }
          }, this.liveLocationPool);
    }
  }

  private setExecutionLocation(executionLocation: Workspace.UISourceCode.UILocation|null): void {
    if (this.executionLocation === executionLocation || !this.editor) {
      return;
    }
    this.executionLocation = executionLocation;

    if (executionLocation) {
      const editorLocation =
          this.transformer.uiLocationToEditorLocation(executionLocation.lineNumber, executionLocation.columnNumber);
      const decorations =
          this.computeExecutionDecorations(this.editor.state, editorLocation.lineNumber, editorLocation.columnNumber);
      this.editor.dispatch({effects: executionLine.update.of(decorations)});
      void this.updateValueDecorations();
      if (this.controlDown) {
        void this.showContinueToLocations();
      }
    } else {
      this.editor.dispatch({
        effects: [
          executionLine.update.of(CodeMirror.Decoration.none),
          continueToMarkers.update.of(CodeMirror.Decoration.none),
          valueDecorations.update.of(CodeMirror.Decoration.none),
        ],
      });
    }
  }

  dispose(): void {
    this.hideIgnoreListInfobar();
    if (this.sourceMapInfobar) {
      this.sourceMapInfobar.dispose();
    }
    if (this.prettyPrintInfobar) {
      this.prettyPrintInfobar.dispose();
    }
    for (const script of this.scriptFileForDebuggerModel.values()) {
      script.removeEventListener(
          Bindings.ResourceScriptMapping.ResourceScriptFile.Events.DidMergeToVM, this.didMergeToVM, this);
      script.removeEventListener(
          Bindings.ResourceScriptMapping.ResourceScriptFile.Events.DidDivergeFromVM, this.didDivergeFromVM, this);
    }
    this.scriptFileForDebuggerModel.clear();

    this.popoverHelper?.hidePopover();
    this.popoverHelper?.dispose();

    this.breakpointManager.removeEventListener(
        Bindings.BreakpointManager.Events.BreakpointAdded, this.breakpointChange, this);
    this.breakpointManager.removeEventListener(
        Bindings.BreakpointManager.Events.BreakpointRemoved, this.breakpointChange, this);
    this.uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);

    Bindings.IgnoreListManager.IgnoreListManager.instance().removeChangeListener(this.ignoreListCallback);

    debuggerPluginForUISourceCode.delete(this.uiSourceCode);
    super.dispose();

    window.clearTimeout(this.refreshBreakpointsTimeout);
    // Clear `this.editor` to signal that we are disposed. Any function from this `DebuggerPlugin` instance
    // still running or scheduled will early return and not do any work.
    this.editor = undefined;

    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DebuggerModel.CallFrame, this.callFrameChanged, this);
    this.liveLocationPool.disposeAll();
  }
}

let breakpointLocationRevealerInstance: BreakpointLocationRevealer;

export class BreakpointLocationRevealer implements Common.Revealer.Revealer {
  static instance({forceNew}: {forceNew: boolean} = {forceNew: false}): BreakpointLocationRevealer {
    if (!breakpointLocationRevealerInstance || forceNew) {
      breakpointLocationRevealerInstance = new BreakpointLocationRevealer();
    }

    return breakpointLocationRevealerInstance;
  }

  async reveal(breakpointLocation: Object, omitFocus?: boolean|undefined): Promise<void> {
    if (!(breakpointLocation instanceof Bindings.BreakpointManager.BreakpointLocation)) {
      throw new Error('Internal error: not a breakpoint location');
    }
    const {uiLocation} = breakpointLocation;
    SourcesPanel.instance().showUILocation(uiLocation, omitFocus);
    const debuggerPlugin = debuggerPluginForUISourceCode.get(uiLocation.uiSourceCode);
    if (debuggerPlugin) {
      debuggerPlugin.editBreakpointLocation(breakpointLocation);
    }
  }
}

// Infobar panel state, used to show additional panels below the editor.

const addInfobar = CodeMirror.StateEffect.define<UI.Infobar.Infobar>();
const removeInfobar = CodeMirror.StateEffect.define<UI.Infobar.Infobar>();

const infobarState = CodeMirror.StateField.define<UI.Infobar.Infobar[]>({
  create(): UI.Infobar.Infobar[] {
    return [];
  },
  update(current, tr): UI.Infobar.Infobar[] {
    for (const effect of tr.effects) {
      if (effect.is(addInfobar)) {
        current = current.concat(effect.value);
      } else if (effect.is(removeInfobar)) {
        current = current.filter(b => b !== effect.value);
      }
    }
    return current;
  },
  provide: (field): CodeMirror.Extension => CodeMirror.showPanel.computeN(
      [field],
      (state): (() => CodeMirror.Panel)[] =>
          state.field(field).map((bar): (() => CodeMirror.Panel) => (): CodeMirror.Panel => ({dom: bar.element}))),
});

// Enumerate non-breakable lines (lines without a known corresponding
// position in the UISource).
async function computeNonBreakableLines(
    state: CodeMirror.EditorState, transformer: SourceFrame.SourceFrame.Transformer,
    sourceCode: Workspace.UISourceCode.UISourceCode): Promise<readonly number[]> {
  const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
  const mappedLines = await debuggerWorkspaceBinding.getMappedLines(sourceCode);
  if (!mappedLines) {
    return [];
  }
  const linePositions = [];
  for (let i = 0; i < state.doc.lines; i++) {
    const {lineNumber} = transformer.editorLocationToUILocation(i, 0);
    if (!mappedLines.has(lineNumber)) {
      linePositions.push(state.doc.line(i + 1).from);
    }
  }
  return linePositions;
}

// Breakpoint markers

type BreakpointDecoration = {
  content: CodeMirror.DecorationSet,
  gutter: CodeMirror.RangeSet<CodeMirror.GutterMarker>,
};

const setBreakpointDeco = CodeMirror.StateEffect.define<BreakpointDecoration>();
const muteBreakpoints = CodeMirror.StateEffect.define<null>();

function muteGutterMarkers(markers: CodeMirror.RangeSet<CodeMirror.GutterMarker>, doc: CodeMirror.Text):
    CodeMirror.RangeSet<CodeMirror.GutterMarker> {
  const newMarkers: CodeMirror.Range<CodeMirror.GutterMarker>[] = [];
  markers.between(0, doc.length, (from, _to, marker) => {
    let className: string = marker.elementClass;
    if (!/cm-breakpoint-disabled/.test(className)) {
      className += ' cm-breakpoint-disabled';
    }
    newMarkers.push(new BreakpointGutterMarker(className).range(from));
  });
  return CodeMirror.RangeSet.of(newMarkers, false);
}

// Holds the inline breakpoint marker decorations and the gutter
// markers for lines with breakpoints. When the set of active markers
// changes in non-muted state (the editor content matches the original
// file), it is recomputed and updated with `setBreakpointDeco`. When
// the editor content goes out of sync with the original file, the
// `muteBreakpoints` effect hides the inline markers and makes sure
// all gutter markers are displayed as disabled.
const breakpointMarkers = CodeMirror.StateField.define<BreakpointDecoration>({
  create(): BreakpointDecoration {
    return {content: CodeMirror.RangeSet.empty, gutter: CodeMirror.RangeSet.empty};
  },
  update(deco, tr): BreakpointDecoration {
    if (!tr.changes.empty) {
      deco = {content: deco.content.map(tr.changes), gutter: deco.gutter.map(tr.changes)};
    }
    for (const effect of tr.effects) {
      if (effect.is(setBreakpointDeco)) {
        deco = effect.value;
      } else if (effect.is(muteBreakpoints)) {
        deco = {content: CodeMirror.RangeSet.empty, gutter: muteGutterMarkers(deco.gutter, tr.state.doc)};
      }
    }
    return deco;
  },
  provide: field =>
      [CodeMirror.EditorView.decorations.from(field, deco => deco.content),
       CodeMirror.lineNumberMarkers.from(field, deco => deco.gutter)],
});

class BreakpointInlineMarker extends CodeMirror.WidgetType {
  class: string;

  constructor(readonly breakpoint: Bindings.BreakpointManager.Breakpoint|null, readonly parent: DebuggerPlugin) {
    super();
    // Eagerly compute DOM class so that the widget is recreated when it changes.
    this.class = 'cm-inlineBreakpoint';
    if (breakpoint?.isLogpoint()) {
      this.class += ' cm-inlineBreakpoint-logpoint';
    } else if (breakpoint?.condition()) {
      this.class += ' cm-inlineBreakpoint-conditional';
    }
    if (!breakpoint?.enabled()) {
      this.class += ' cm-inlineBreakpoint-disabled';
    }
  }

  eq(other: BreakpointInlineMarker): boolean {
    return other.class === this.class && other.breakpoint === this.breakpoint;
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = this.class;
    span.addEventListener('click', (event: MouseEvent) => {
      this.parent.onInlineBreakpointMarkerClick(event, this.breakpoint);
      event.consume();
    });
    span.addEventListener('contextmenu', (event: MouseEvent) => {
      this.parent.onInlineBreakpointMarkerContextMenu(event, this.breakpoint);
      event.consume();
    });
    return span;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

class BreakpointGutterMarker extends CodeMirror.GutterMarker {
  constructor(readonly elementClass: string) {
    super();
  }

  eq(other: BreakpointGutterMarker): boolean {
    return other.elementClass === this.elementClass;
  }
}

function mostSpecificBreakpoint(
    a: Bindings.BreakpointManager.Breakpoint, b: Bindings.BreakpointManager.Breakpoint): number {
  if (a.enabled() !== b.enabled()) {
    return a.enabled() ? -1 : 1;
  }
  if (a.bound() !== b.bound()) {
    return a.bound() ? -1 : 1;
  }
  if (Boolean(a.condition()) !== Boolean(b.condition())) {
    return Boolean(a.condition()) ? -1 : 1;
  }
  return 0;
}

// Generic helper for creating pairs of editor state fields and
// effects to model imperatively updated decorations.

function defineStatefulDecoration(): {
  update: CodeMirror.StateEffectType<CodeMirror.DecorationSet>,
  field: CodeMirror.StateField<CodeMirror.DecorationSet>,
} {
  const update = CodeMirror.StateEffect.define<CodeMirror.DecorationSet>();
  const field = CodeMirror.StateField.define<CodeMirror.DecorationSet>({
    create(): CodeMirror.DecorationSet {
      return CodeMirror.Decoration.none;
    },
    update(deco, tr): CodeMirror.DecorationSet {
      return tr.effects.reduce((deco, effect) => effect.is(update) ? effect.value : deco, deco.map(tr.changes));
    },
    provide: field => CodeMirror.EditorView.decorations.from(field),
  });
  return {update, field};
}

// Execution line highlight

const executionLineDeco = CodeMirror.Decoration.line({attributes: {class: 'cm-executionLine'}});
const executionTokenDeco = CodeMirror.Decoration.mark({attributes: {class: 'cm-executionToken'}});
const executionLine = defineStatefulDecoration();

// Continue-to markers

const continueToMark = CodeMirror.Decoration.mark({class: 'cm-continueToLocation'});
const asyncContinueToMark = CodeMirror.Decoration.mark({class: 'cm-continueToLocation cm-continueToLocation-async'});

const continueToMarkers = defineStatefulDecoration();

const noMarkers = {}, hasContinueMarkers = {
  class: 'cm-hasContinueMarkers',
};

// Add a class to the content element when there are active
// continue-to markers. This hides the background on the current
// execution line.
const markIfContinueTo =
    CodeMirror.EditorView.contentAttributes.compute([continueToMarkers.field], (state): Record<string, string> => {
      return state.field(continueToMarkers.field).size ? hasContinueMarkers : noMarkers;
    });

// Variable value decorations

class ValueDecoration extends CodeMirror.WidgetType {
  constructor(readonly pairs: [string, SDK.RemoteObject.RemoteObject][]) {
    super();
  }

  eq(other: ValueDecoration): boolean {
    return this.pairs.length === other.pairs.length &&
        this.pairs.every((p, i) => p[0] === other.pairs[i][0] && p[1] === other.pairs[i][1]);
  }

  toDOM(): HTMLElement {
    const formatter = new ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
    const widget = document.createElement('div');
    widget.classList.add('cm-variableValues');
    let first = true;
    for (const [name, value] of this.pairs) {
      if (first) {
        first = false;
      } else {
        UI.UIUtils.createTextChild(widget, ', ');
      }
      const nameValuePair = (widget.createChild('span') as HTMLElement);
      UI.UIUtils.createTextChild(nameValuePair, name + ' = ');
      const propertyCount = value.preview ? value.preview.properties.length : 0;
      const entryCount = value.preview && value.preview.entries ? value.preview.entries.length : 0;
      if (value.preview && propertyCount + entryCount < 10) {
        formatter.appendObjectPreview(nameValuePair, value.preview, false /* isEntry */);
      } else {
        const propertyValue = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValue(
            value, /* wasThrown */ false, /* showPreview */ false);
        nameValuePair.appendChild(propertyValue.element);
      }
    }
    return widget;
  }
}

const valueDecorations = defineStatefulDecoration();

function isVariableIdentifier(tokenType: string): boolean {
  return tokenType === 'VariableName' || tokenType === 'VariableDefinition';
}

function isVariableDefinition(tokenType: string): boolean {
  return tokenType === 'VariableDefinition';
}

function isLetConstDefinition(tokenType: string): boolean {
  return tokenType === 'let' || tokenType === 'const';
}

function isScopeNode(tokenType: string): boolean {
  return tokenType === 'Block' || tokenType === 'ForSpec';
}

class SiblingScopeVariables {
  blockList: Set<string> = new Set<string>();
  variables: {line: number, from: number, id: string}[] = [];
}

export function getVariableNamesByLine(
    editorState: CodeMirror.EditorState, fromPos: number, toPos: number,
    currentPos: number): {line: number, from: number, id: string}[] {
  const fromLine = editorState.doc.lineAt(fromPos);
  fromPos = Math.min(fromLine.to, fromPos);
  toPos = editorState.doc.lineAt(toPos).from;

  const tree = CodeMirror.ensureSyntaxTree(editorState, toPos, 100);
  if (!tree) {
    return [];
  }

  // Sibling scope is a scope that does not contain the current position.
  // We will exclude variables that are defined (and used in those scopes (since we are currently outside of their lifetime).
  function isSiblingScopeNode(node: {name: string, from: number, to: number}): boolean {
    return isScopeNode(node.name) && (node.to < currentPos || currentPos < node.from);
  }

  const names: {line: number, from: number, id: string}[] = [];
  let curLine = fromLine;
  const siblingStack: SiblingScopeVariables[] = [];
  let currentLetConstDefinition: CodeMirror.SyntaxNode|null = null;

  function currentNames(): {line: number, from: number, id: string}[] {
    return siblingStack.length ? siblingStack[siblingStack.length - 1].variables : names;
  }

  tree.iterate({
    from: fromPos,
    to: toPos,
    enter: node => {
      if (node.from < fromPos) {
        return;
      }

      if (isLetConstDefinition(node.name)) {
        currentLetConstDefinition = node.node.nextSibling;
        return;
      }

      if (isSiblingScopeNode(node)) {
        siblingStack.push(new SiblingScopeVariables());
        return;
      }

      const varName = isVariableIdentifier(node.name) && editorState.sliceDoc(node.from, node.to);
      if (!varName) {
        return;
      }

      if (currentLetConstDefinition && isVariableDefinition(node.name) && siblingStack.length > 0) {
        siblingStack[siblingStack.length - 1].blockList.add(varName);
        return;
      }

      if (node.from > curLine.to) {
        curLine = editorState.doc.lineAt(node.from);
      }

      currentNames().push({line: curLine.number - 1, from: node.from, id: varName});
    },
    leave: node => {
      if (currentLetConstDefinition === node.node) {
        currentLetConstDefinition = null;
      } else if (isSiblingScopeNode(node)) {
        const topScope = siblingStack.pop();
        const nameList = currentNames();
        for (const token of topScope?.variables ?? []) {
          if (!topScope?.blockList.has(token.id)) {
            nameList.push(token);
          }
        }
      }
    },
  });
  return names;
}

export async function computeScopeMappings(
    callFrame: SDK.DebuggerModel.CallFrame,
    rawLocationToEditorOffset: (l: SDK.DebuggerModel.Location|null) => Promise<number|null>):
    Promise<{scopeStart: number, scopeEnd: number, variableMap: Map<string, SDK.RemoteObject.RemoteObject>}[]> {
  const scopeMappings:
      {scopeStart: number, scopeEnd: number, variableMap: Map<string, SDK.RemoteObject.RemoteObject>}[] = [];
  for (const scope of callFrame.scopeChain()) {
    const scopeStart = await rawLocationToEditorOffset(scope.startLocation());
    if (!scopeStart) {
      break;
    }
    const scopeEnd = await rawLocationToEditorOffset(scope.endLocation());
    if (!scopeEnd) {
      break;
    }

    const {properties} = await SourceMapScopes.NamesResolver.resolveScopeInObject(scope).getAllProperties(false, false);
    if (!properties || properties.length > MAX_PROPERTIES_IN_SCOPE_FOR_VALUE_DECORATIONS) {
      break;
    }
    const variableMap = new Map<string, SDK.RemoteObject.RemoteObject>(
        properties.map(p => [p.name, p.value] as [string, SDK.RemoteObject.RemoteObject]));

    scopeMappings.push({scopeStart, scopeEnd, variableMap});

    // Let us only get mappings for block scopes until we see a surrounding function (local) scope.
    if (scope.type() === Protocol.Debugger.ScopeType.Local) {
      break;
    }
  }
  return scopeMappings;
}

export function getVariableValuesByLine(
    scopeMappings: {scopeStart: number, scopeEnd: number, variableMap: Map<string, SDK.RemoteObject.RemoteObject>}[],
    variableNames: {line: number, from: number, id: string}[]): Map<number, Map<string, SDK.RemoteObject.RemoteObject>>|
    null {
  const namesPerLine = new Map<number, Map<string, SDK.RemoteObject.RemoteObject>>();
  for (const {line, from, id} of variableNames) {
    const varValue = findVariableInChain(id, from, scopeMappings);
    if (!varValue) {
      continue;
    }
    let names = namesPerLine.get(line);
    if (!names) {
      names = new Map();
      namesPerLine.set(line, names);
    }
    names.set(id, varValue);
  }
  return namesPerLine;

  function findVariableInChain(
      name: string,
      pos: number,
      scopeMappings: {scopeStart: number, scopeEnd: number, variableMap: Map<string, SDK.RemoteObject.RemoteObject>}[],
      ): SDK.RemoteObject.RemoteObject|null {
    for (const scope of scopeMappings) {
      if (pos < scope.scopeStart || pos >= scope.scopeEnd) {
        continue;
      }
      const value = scope.variableMap.get(name);
      if (value) {
        return value;
      }
    }
    return null;
  }
}

// Pop-over

export function computePopoverHighlightRange(state: CodeMirror.EditorState, mimeType: string, cursorPos: number): {
  from: number,
  to: number,
}|null {
  const {main} = state.selection;
  if (!main.empty) {
    if (cursorPos < main.from || main.to < cursorPos) {
      return null;
    }
    return {from: main.from, to: main.to};
  }

  const tree = CodeMirror.ensureSyntaxTree(state, cursorPos, 5 * 1000);
  if (!tree) {
    return null;
  }

  const node = tree.resolveInner(cursorPos, 1);
  // Only do something if the cursor is over a leaf node.
  if (node.firstChild) {
    return null;
  }

  switch (mimeType) {
    case 'application/wasm': {
      if (node.name !== 'Identifier') {
        return null;
      }
      // For $label identifiers we can't show a meaningful preview (https://crbug.com/1155548),
      // so we suppress them for now. Label identifiers can only appear as operands to control
      // instructions[1].
      //
      // [1]: https://webassembly.github.io/spec/core/text/instructions.html#control-instructions
      const controlInstructions = ['block', 'loop', 'if', 'else', 'end', 'br', 'br_if', 'br_table'];
      for (let parent: CodeMirror.SyntaxNode|null = node.parent; parent; parent = parent.parent) {
        if (parent.name === 'App') {
          const firstChild = parent.firstChild;
          const opName = firstChild?.name === 'Keyword' && state.sliceDoc(firstChild.from, firstChild.to);
          if (opName && controlInstructions.includes(opName)) {
            return null;
          }
        }
      }
      return {from: node.from, to: node.to};
    }

    case 'text/html':
    case 'text/javascript':
    case 'text/jsx':
    case 'text/typescript':
    case 'text/typescript-jsx': {
      let current: CodeMirror.SyntaxNode|null = node;
      while (current && current.name !== 'this' && current.name !== 'VariableDefinition' &&
             current.name !== 'VariableName' && current.name !== 'MemberExpression' &&
             !(current.name === 'PropertyName' && current.parent?.name === 'PatternProperty' &&
               current.nextSibling?.name !== ':') &&
             !(current.name === 'PropertyDefinition' && current.parent?.name === 'Property' &&
               current.nextSibling?.name !== ':')) {
        current = current.parent;
      }
      if (!current) {
        return null;
      }
      return {from: current.from, to: current.to};
    }

    default: {
      // In other languages, just assume a token consisting entirely
      // of identifier-like characters is an identifier.
      if (node.to - node.from > 50 || /[^\w_\-$]/.test(state.sliceDoc(node.from, node.to))) {
        return null;
      }
      return {from: node.from, to: node.to};
    }
  }
}

// Evaluated expression mark for pop-over

const evalExpressionMark = CodeMirror.Decoration.mark({class: 'cm-evaluatedExpression'});

const evalExpression = defineStatefulDecoration();

// Styling for plugin-local elements

const theme = CodeMirror.EditorView.baseTheme({
  '.cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement': {
    '&:hover, &.cm-breakpoint': {
      borderStyle: 'solid',
      borderWidth: '1px 4px 1px 1px',
      marginRight: '-4px',
      paddingLeft: '8px',
      // Make sure text doesn't move down due to the border above it.
      lineHeight: 'calc(1.2em - 2px)',
      position: 'relative',
    },
    '&:hover': {
      WebkitBorderImage: lineNumberArrow('#ebeced', '#ebeced'),
    },
    '&.cm-breakpoint': {
      color: '#fff',
      WebkitBorderImage: lineNumberArrow('#4285f4', '#1a73e8'),
    },
    '&.cm-breakpoint-conditional': {
      WebkitBorderImage: lineNumberArrow('#f29900', '#e37400'),
      '&::before': {
        content: '"?"',
        position: 'absolute',
        top: 0,
        left: '1px',
      },
    },
    '&.cm-breakpoint-logpoint': {
      WebkitBorderImage: lineNumberArrow('#f439a0', '#d01884'),
      '&::before': {
        content: '"‥"',
        position: 'absolute',
        top: '-3px',
        left: '1px',
      },
    },
  },
  '&dark .cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement': {
    '&:hover': {
      WebkitBorderImage: lineNumberArrow('#3c4043', '#3c4043'),
    },
    '&.cm-breakpoint': {
      WebkitBorderImage: lineNumberArrow('#5186EC', '#1a73e8'),
    },
    '&.cm-breakpoint-conditional': {
      WebkitBorderImage: lineNumberArrow('#e9a33a', '#e37400'),
    },
    '&.cm-breakpoint-logpoint': {
      WebkitBorderImage: lineNumberArrow('#E54D9B', '#d01884'),
    },
  },
  ':host-context(.breakpoints-deactivated) & .cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement.cm-breakpoint, .cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement.cm-breakpoint-disabled':
      {
        color: '#1a73e8',
        WebkitBorderImage: lineNumberArrow('#d9e7fd', '#1a73e8'),
        '&.cm-breakpoint-conditional': {
          color: '#e37400',
          WebkitBorderImage: lineNumberArrow('#fcebcc', '#e37400'),
        },
        '&.cm-breakpoint-logpoint': {
          color: '#d01884',
          WebkitBorderImage: lineNumberArrow('#fdd7ec', '#f439a0'),
        },
      },
  ':host-context(.breakpoints-deactivated) &dark .cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement.cm-breakpoint, &dark .cm-gutters .cm-gutter.cm-lineNumbers .cm-gutterElement.cm-breakpoint-disabled':
      {
        WebkitBorderImage: lineNumberArrow('#2a384e', '#1a73e8'),
        '&.cm-breakpoint-conditional': {
          WebkitBorderImage: lineNumberArrow('#4d3c1d', '#e37400'),
        },
        '&.cm-breakpoint-logpoint': {
          WebkitBorderImage: lineNumberArrow('#4e283d', '#f439a0'),
        },
      },

  '.cm-inlineBreakpoint': {
    cursor: 'pointer',
    position: 'relative',
    top: '1px',
    content: inlineBreakpointArrow('#4285F4', '#1A73E8'),
    height: '10px',
    '&.cm-inlineBreakpoint-conditional': {
      content: inlineConditionalBreakpointArrow('#F29900', '#E37400'),
    },
    '&.cm-inlineBreakpoint-logpoint': {
      content: inlineLogpointArrow('#F439A0', '#D01884'),
    },
  },
  '&dark .cm-inlineBreakpoint': {
    content: inlineBreakpointArrow('#5186EC', '#1A73E8'),
    '&.cm-inlineBreakpoint-conditional': {
      content: inlineConditionalBreakpointArrow('#e9a33a', '#E37400'),
    },
    '&.cm-inlineBreakpoint-logpoint': {
      content: inlineLogpointArrow('#E54D9B', '#D01884'),
    },
  },
  ':host-context(.breakpoints-deactivated) & .cm-inlineBreakpoint, .cm-inlineBreakpoint-disabled': {
    content: inlineBreakpointArrow('#4285F4', '#1A73E8', '0.2'),
    '&.cm-inlineBreakpoint-conditional': {
      content: inlineConditionalBreakpointArrow('#F9AB00', '#E37400', '0.2'),
    },
    '&.cm-inlineBreakpoint-logpoint': {
      content: inlineLogpointArrow('#F439A0', '#D01884', '0.2'),
    },
  },

  '.cm-executionLine': {
    backgroundColor: 'var(--color-execution-line-background)',
    outline: '1px solid var(--color-execution-line-outline)',
    '.cm-hasContinueMarkers &': {
      backgroundColor: 'transparent',
    },
    '&.cm-highlightedLine': {
      animation: 'cm-fading-highlight-execution 2s 0s',
    },
  },
  '.cm-executionToken': {
    backgroundColor: 'var(--color-execution-token-background)',
  },
  '@keyframes cm-fading-highlight-execution': {
    from: {
      backgroundColor: 'var(--color-highlighted-line)',
    },
    to: {
      backgroundColor: 'var(--color-execution-line-background)',
    },
  },

  '.cm-continueToLocation': {
    cursor: 'pointer',
    backgroundColor: 'var(--color-continue-to-location)',
    '&:hover': {
      backgroundColor: 'var(--color-continue-to-location-hover)',
      border: '1px solid var(--color-continue-to-location-hover-border)',
      margin: '0 -1px',
    },
    '&.cm-continueToLocation-async': {
      backgroundColor: 'var(--color-continue-to-location-async)',
      '&:hover': {
        backgroundColor: 'var(--color-continue-to-location-async-hover)',
        border: '1px solid var(--color-continue-to-location-async-hover-border)',
        margin: '0 -1px',
      },
    },
  },

  '.cm-evaluatedExpression': {
    backgroundColor: 'var(--color-evaluated-expression)',
    border: '1px solid var(--color-evaluated-expression-border)',
    margin: '0 -1px',
  },

  '.cm-variableValues': {
    display: 'inline',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '1000px',
    opacity: '80%',
    backgroundColor: 'var(--color-variable-values)',
    marginLeft: '10px',
    padding: '0 5px',
    userSelect: 'text',
    '.cm-executionLine &': {
      backgroundColor: 'transparent',
      opacity: '50%',
    },
  },
});

function lineNumberArrow(color: string, outline: string): string {
  return `url('data:image/svg+xml,<svg height="11" width="26" xmlns="http://www.w3.org/2000/svg"><path d="M22.8.5l2.7 5-2.7 5H.5V.5z" fill="${
      encodeURIComponent(color)}" stroke="${encodeURIComponent(outline)}"/></svg>') 1 3 1 1`;
}

function inlineBreakpointArrow(color: string, outline: string, opacity: string = '1'): string {
  return `url('data:image/svg+xml,<svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.5 0.5H5.80139C6.29382 0.5 6.7549 0.741701 7.03503 1.14669L10.392 6L7.03503 10.8533C6.7549 11.2583 6.29382 11.5 5.80139 11.5H0.5V0.5Z" fill="${
      encodeURIComponent(
          color)}" stroke="${encodeURIComponent(outline)}" fill-opacity="${encodeURIComponent(opacity)}"/></svg>')`;
}

function inlineConditionalBreakpointArrow(color: string, outline: string, opacity: string = '1'): string {
  return `url('data:image/svg+xml,<svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.5 0.5H5.80139C6.29382 0.5 6.75489 0.741701 7.03503 1.14669L10.392 6L7.03503 10.8533C6.75489 11.2583 6.29382 11.5 5.80138 11.5H0.5V0.5Z" fill="${
      encodeURIComponent(color)}" fill-opacity="${encodeURIComponent(opacity)}" stroke="${
      encodeURIComponent(
          outline)}"/><path d="M3.51074 7.75635H4.68408V9H3.51074V7.75635ZM4.68408 7.23779H3.51074V6.56104C3.51074 6.271 3.55615 6.02344 3.64697 5.81836C3.73779 5.61328 3.90039 5.39648 4.13477 5.16797L4.53027 4.77686C4.71484 4.59814 4.83936 4.4502 4.90381 4.33301C4.97119 4.21582 5.00488 4.09424 5.00488 3.96826C5.00488 3.77197 4.9375 3.62402 4.80273 3.52441C4.66797 3.4248 4.46582 3.375 4.19629 3.375C3.9502 3.375 3.69238 3.42773 3.42285 3.5332C3.15625 3.63574 2.88232 3.78955 2.60107 3.99463V2.81689C2.88818 2.65283 3.17822 2.52979 3.47119 2.44775C3.76709 2.36279 4.06299 2.32031 4.35889 2.32031C4.95068 2.32031 5.41504 2.45801 5.75195 2.7334C6.08887 3.00879 6.25732 3.38818 6.25732 3.87158C6.25732 4.09424 6.20752 4.30225 6.10791 4.49561C6.0083 4.68604 5.8208 4.91602 5.54541 5.18555L5.15869 5.56348C4.95947 5.75684 4.83203 5.91504 4.77637 6.03809C4.7207 6.16113 4.69287 6.31201 4.69287 6.49072C4.69287 6.51709 4.69141 6.54785 4.68848 6.58301C4.68848 6.61816 4.68701 6.65625 4.68408 6.69727V7.23779Z" fill="white"/></svg>')`;
}

function inlineLogpointArrow(color: string, outline: string, opacity: string = '1'): string {
  return `url('data:image/svg+xml,<svg width="11" height="12" viewBox="0 0 11 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.5 0.5H5.80139C6.29382 0.5 6.7549 0.741701 7.03503 1.14669L10.392 6L7.03503 10.8533C6.7549 11.2583 6.29382 11.5 5.80139 11.5H0.5V0.5Z" fill="${
      encodeURIComponent(color)}" stroke="${encodeURIComponent(outline)}" fill-opacity="${
      encodeURIComponent(
          opacity)}"/><circle cx="3" cy="6" r="1" fill="white"/><circle cx="7" cy="6" r="1" fill="white"/></svg>')`;
}
