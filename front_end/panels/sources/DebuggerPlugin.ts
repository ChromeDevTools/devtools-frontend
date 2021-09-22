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
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';

import type * as TextEditor from '../../ui/legacy/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Protocol from '../../generated/protocol.js';

import {AddSourceMapURLDialog} from './AddSourceMapURLDialog.js';
import {BreakpointEditDialog, LogpointPrefix} from './BreakpointEditDialog.js';
import {Plugin} from './Plugin.js';
import {ScriptFormatterEditorAction} from './ScriptFormatterEditorAction.js';
import {resolveExpression, resolveScopeInObject} from './SourceMapNamesResolver.js';
import {SourcesPanel} from './SourcesPanel.js';
import {getRegisteredEditorActions} from './SourcesView.js';

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
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/DebuggerPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
// eslint-disable-next-line no-unused-vars
class DecoratorWidget extends HTMLDivElement {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  nameToToken!: Map<string, HTMLElement>;
  constructor() {
    super();
  }
}

export class DebuggerPlugin extends Plugin {
  private textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor;
  private uiSourceCode: Workspace.UISourceCode.UISourceCode;
  private readonly transformer: SourceFrame.SourceFrame.Transformer;
  private executionLocation: Workspace.UISourceCode.UILocation|null;
  private controlDown: boolean;
  private asyncStepInHoveredLine: number|null;
  private asyncStepInHovered: boolean;
  private clearValueWidgetsTimer: number|null;
  private sourceMapInfobar: UI.Infobar.Infobar|null;
  private controlTimeout: number|null;
  private readonly scriptsPanel: SourcesPanel;
  private readonly breakpointManager: Bindings.BreakpointManager.BreakpointManager;
  private readonly popoverHelper: UI.PopoverHelper.PopoverHelper;
  private readonly boundPopoverHelperHide: () => void;
  private readonly boundKeyDown: (arg0: Event) => void;
  private readonly boundKeyUp: (arg0: Event) => void;
  private readonly boundMouseMove: (arg0: Event) => void;
  private readonly boundMouseDown: (arg0: Event) => void;
  private readonly boundBlur: (arg0: Event) => void;
  private readonly boundWheel: (arg0: Event) => void;
  private readonly boundGutterClick:
      (arg0: Common.EventTarget.EventTargetEvent<SourceFrame.SourcesTextEditor.GutterClickEventData>) => void;
  private readonly breakpointDecorations: Set<BreakpointDecoration>;
  private readonly decorationByBreakpoint: Map<Bindings.BreakpointManager.Breakpoint, BreakpointDecoration>;
  private readonly possibleBreakpointsRequested: Set<number>;
  private scriptFileForDebuggerModel:
      Map<SDK.DebuggerModel.DebuggerModel, Bindings.ResourceScriptMapping.ResourceScriptFile>;
  private readonly valueWidgets: Map<number, DecoratorWidget>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private continueToLocationDecorations: Map<any, Function>|null;
  private readonly liveLocationPool: Bindings.LiveLocation.LiveLocationPool;
  private muted: boolean;
  private mutedFromStart: boolean;
  private ignoreListInfobar: UI.Infobar.Infobar|null;
  private hasLineWithoutMapping: boolean;
  private prettyPrintInfobar!: UI.Infobar.Infobar|null;
  private scheduledBreakpointDecorationUpdates?: Set<BreakpointDecoration>|null;

  constructor(
      textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor, uiSourceCode: Workspace.UISourceCode.UISourceCode,
      transformer: SourceFrame.SourceFrame.Transformer) {
    super();
    this.textEditor = textEditor;
    this.uiSourceCode = uiSourceCode;
    this.transformer = transformer;

    this.executionLocation = null;
    this.controlDown = false;
    this.asyncStepInHoveredLine = 0;
    this.asyncStepInHovered = false;
    this.clearValueWidgetsTimer = null;
    this.sourceMapInfobar = null;
    this.controlTimeout = null;

    this.scriptsPanel = SourcesPanel.instance();
    this.breakpointManager = Bindings.BreakpointManager.BreakpointManager.instance();
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Debugger) {
      this.textEditor.element.classList.add('source-frame-debugger-script');
    }

    this.popoverHelper =
        new UI.PopoverHelper.PopoverHelper(this.scriptsPanel.element, this.getPopoverRequest.bind(this));
    this.popoverHelper.setDisableOnClick(true);
    this.popoverHelper.setTimeout(250, 250);
    this.popoverHelper.setHasPadding(true);
    this.boundPopoverHelperHide = this.popoverHelper.hidePopover.bind(this.popoverHelper);
    this.scriptsPanel.element.addEventListener('scroll', this.boundPopoverHelperHide, true);

    const shortcutHandlers = {
      'debugger.toggle-breakpoint': async(): Promise<boolean> => {
        const selection = this.textEditor.selection();
        if (!selection) {
          return false;
        }
        await this.toggleBreakpoint(selection.startLine, false);
        return true;
      },
      'debugger.toggle-breakpoint-enabled': async(): Promise<boolean> => {
        const selection = this.textEditor.selection();
        if (!selection) {
          return false;
        }
        await this.toggleBreakpoint(selection.startLine, true);
        return true;
      },
      'debugger.breakpoint-input-window': async(): Promise<boolean> => {
        const selection = this.textEditor.selection();
        if (!selection) {
          return false;
        }
        const breakpoints = this.lineBreakpointDecorations(selection.startLine)
                                .map(decoration => decoration.breakpoint)
                                .filter(breakpoint => Boolean(breakpoint));
        let breakpoint: (Bindings.BreakpointManager.Breakpoint|null)|null = null;
        if (breakpoints.length) {
          breakpoint = breakpoints[0];
        }
        const isLogpoint = breakpoint ? breakpoint.condition().includes(LogpointPrefix) : false;
        this.editBreakpointCondition(selection.startLine, breakpoint, null, isLogpoint);
        return true;
      },
    };
    UI.ShortcutRegistry.ShortcutRegistry.instance().addShortcutListener(this.textEditor.element, shortcutHandlers);
    this.boundKeyDown = (this.onKeyDown.bind(this) as (arg0: Event) => void);
    this.textEditor.element.addEventListener('keydown', this.boundKeyDown, true);
    this.boundKeyUp = (this.onKeyUp.bind(this) as (arg0: Event) => void);
    this.textEditor.element.addEventListener('keyup', this.boundKeyUp, true);
    this.boundMouseMove = (this.onMouseMove.bind(this) as (arg0: Event) => void);
    this.textEditor.element.addEventListener('mousemove', this.boundMouseMove, false);
    this.boundMouseDown = (this.onMouseDown.bind(this) as (arg0: Event) => void);
    this.textEditor.element.addEventListener('mousedown', this.boundMouseDown, true);
    this.boundBlur = (this.onBlur.bind(this) as (arg0: Event) => void);
    this.textEditor.element.addEventListener('focusout', this.boundBlur, false);
    this.boundWheel = (this.onWheel.bind(this) as (arg0: Event) => void);
    this.textEditor.element.addEventListener('wheel', this.boundWheel, true);
    this.boundGutterClick =
        (e: Common.EventTarget.EventTargetEvent<SourceFrame.SourcesTextEditor.GutterClickEventData>): void => {
          this.handleGutterClick(e);
        };

    this.textEditor.addEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick, this.boundGutterClick, this);

    this.breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointAdded, this.breakpointAdded, this);
    this.breakpointManager.addEventListener(
        Bindings.BreakpointManager.Events.BreakpointRemoved, this.breakpointRemoved, this);

    this.uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.uiSourceCode.addEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);

    this.breakpointDecorations = new Set();
    this.decorationByBreakpoint = new Map();
    this.possibleBreakpointsRequested = new Set();

    this.scriptFileForDebuggerModel = new Map();

    Common.Settings.Settings.instance()
        .moduleSetting('skipStackFramesPattern')
        .addChangeListener(this.showIgnoreListInfobarIfNeeded, this);
    Common.Settings.Settings.instance()
        .moduleSetting('skipContentScripts')
        .addChangeListener(this.showIgnoreListInfobarIfNeeded, this);

    this.valueWidgets = new Map();
    this.continueToLocationDecorations = null;

    UI.Context.Context.instance().addFlavorChangeListener(SDK.DebuggerModel.CallFrame, this.callFrameChanged, this);
    this.liveLocationPool = new Bindings.LiveLocation.LiveLocationPool();
    this.callFrameChanged();

    this.updateScriptFiles();

    if (this.uiSourceCode.isDirty()) {
      this.muted = true;
      this.mutedFromStart = true;
    } else {
      this.muted = false;
      this.mutedFromStart = false;
      this.initializeBreakpoints();
    }

    this.ignoreListInfobar = null;
    this.showIgnoreListInfobarIfNeeded();

    for (const scriptFile of this.scriptFileForDebuggerModel.values()) {
      scriptFile.checkMapping();
    }

    this.hasLineWithoutMapping = false;
    this.updateLinesWithoutMappingHighlight();
    if (!Root.Runtime.experiments.isEnabled('sourcesPrettyPrint')) {
      this.prettyPrintInfobar = null;
      this.detectMinified();
    }
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
    if (!Bindings.IgnoreListManager.IgnoreListManager.instance().isIgnoreListedUISourceCode(uiSourceCode)) {
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

    infobar.createDetailsRowMessage(i18nString(UIStrings.theDebuggerWillSkipStepping));

    const scriptFile =
        this.scriptFileForDebuggerModel.size ? this.scriptFileForDebuggerModel.values().next().value : null;
    if (scriptFile && scriptFile.hasSourceMapURL()) {
      infobar.createDetailsRowMessage(i18nString(UIStrings.sourceMapFoundButIgnoredForFile));
    }
    this.textEditor.attachInfobar(this.ignoreListInfobar);
  }

  private hideIgnoreListInfobar(): void {
    if (!this.ignoreListInfobar) {
      return;
    }
    this.ignoreListInfobar.dispose();
    this.ignoreListInfobar = null;
  }

  wasShown(): void {
    if (this.executionLocation) {
      // We need SourcesTextEditor to be initialized prior to this call. @see crbug.com/499889
      queueMicrotask(() => {
        this.generateValuesInSource();
      });
    }
  }

  willHide(): void {
    this.popoverHelper.hidePopover();
  }

  async populateLineGutterContextMenu(contextMenu: UI.ContextMenu.ContextMenu, editorLineNumber: number):
      Promise<void> {
    const uiLocation = new Workspace.UISourceCode.UILocation(this.uiSourceCode, editorLineNumber, 0);
    this.scriptsPanel.appendUILocationItems(contextMenu, uiLocation);
    const breakpoints =
        (this.lineBreakpointDecorations(editorLineNumber)
             .map(decoration => decoration.breakpoint)
             .filter(breakpoint => Boolean(breakpoint)) as Bindings.BreakpointManager.Breakpoint[]);
    const supportsConditionalBreakpoints =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().supportsConditionalBreakpoints(
            this.uiSourceCode);
    if (!breakpoints.length) {
      if (!this.textEditor.hasLineClass(editorLineNumber, 'cm-non-breakable-line')) {
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.addBreakpoint), this.createNewBreakpoint.bind(this, editorLineNumber, '', true));
        if (supportsConditionalBreakpoints) {
          contextMenu.debugSection().appendItem(
              i18nString(UIStrings.addConditionalBreakpoint),
              this.editBreakpointCondition.bind(this, editorLineNumber, null, null, false /* preferLogpoint */));
          contextMenu.debugSection().appendItem(
              i18nString(UIStrings.addLogpoint),
              this.editBreakpointCondition.bind(this, editorLineNumber, null, null, true /* preferLogpoint */));
          contextMenu.debugSection().appendItem(
              i18nString(UIStrings.neverPauseHere),
              this.createNewBreakpoint.bind(this, editorLineNumber, 'false', true));
        }
      }
    } else {
      const removeTitle = i18nString(UIStrings.removeBreakpoint, {n: breakpoints.length});
      contextMenu.debugSection().appendItem(removeTitle, () => breakpoints.map(breakpoint => breakpoint.remove(false)));
      if (breakpoints.length === 1 && supportsConditionalBreakpoints) {
        // Editing breakpoints only make sense for conditional breakpoints
        // and logpoints and both are currently only available for JavaScript
        // debugging.
        contextMenu.debugSection().appendItem(
            i18nString(UIStrings.editBreakpoint),
            this.editBreakpointCondition.bind(
                this, editorLineNumber, breakpoints[0], null, false /* preferLogpoint */));
      }
      const hasEnabled = breakpoints.some(breakpoint => breakpoint.enabled());
      if (hasEnabled) {
        const title = i18nString(UIStrings.disableBreakpoint, {n: breakpoints.length});
        contextMenu.debugSection().appendItem(title, () => breakpoints.map(breakpoint => breakpoint.setEnabled(false)));
      }
      const hasDisabled = breakpoints.some(breakpoint => !breakpoint.enabled());
      if (hasDisabled) {
        const title = i18nString(UIStrings.enableBreakpoint, {n: breakpoints.length});
        contextMenu.debugSection().appendItem(title, () => breakpoints.map(breakpoint => breakpoint.setEnabled(true)));
      }
    }
  }

  populateTextAreaContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu, editorLineNumber: number, editorColumnNumber: number): Promise<void> {
    function addSourceMapURL(scriptFile: Bindings.ResourceScriptMapping.ResourceScriptFile): void {
      const dialog = new AddSourceMapURLDialog(addSourceMapURLDialogCallback.bind(null, scriptFile));
      dialog.show();
    }

    function addSourceMapURLDialogCallback(
        scriptFile: Bindings.ResourceScriptMapping.ResourceScriptFile, url: string): void {
      if (!url) {
        return;
      }
      scriptFile.addSourceMapURL(url);
    }

    function populateSourceMapMembers(this: DebuggerPlugin): void {
      if (this.uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network &&
          Common.Settings.Settings.instance().moduleSetting('jsSourceMapsEnabled').get() &&
          !Bindings.IgnoreListManager.IgnoreListManager.instance().isIgnoreListedUISourceCode(this.uiSourceCode)) {
        if (this.scriptFileForDebuggerModel.size) {
          const scriptFile = this.scriptFileForDebuggerModel.values().next().value;
          const addSourceMapURLLabel = i18nString(UIStrings.addSourceMap);
          contextMenu.debugSection().appendItem(addSourceMapURLLabel, addSourceMapURL.bind(null, scriptFile));
        }
      }
    }

    return super.populateTextAreaContextMenu(contextMenu, editorLineNumber, editorColumnNumber)
        .then(populateSourceMapMembers.bind(this));
  }

  private workingCopyChanged(): void {
    if (this.scriptFileForDebuggerModel.size) {
      return;
    }

    if (this.uiSourceCode.isDirty()) {
      this.muteBreakpointsWhileEditing();
    } else {
      this.restoreBreakpointsAfterEditing();
    }
  }

  private workingCopyCommitted(): void {
    this.scriptsPanel.updateLastModificationTime();
    if (!this.scriptFileForDebuggerModel.size) {
      this.restoreBreakpointsAfterEditing();
    }
  }

  private didMergeToVM(): void {
    this.restoreBreakpointsIfConsistentScripts();
  }

  private didDivergeFromVM(): void {
    this.muteBreakpointsWhileEditing();
  }

  private muteBreakpointsWhileEditing(): void {
    if (this.muted) {
      return;
    }
    for (const decoration of this.breakpointDecorations) {
      this.updateBreakpointDecoration(decoration);
    }
    this.muted = true;
  }

  private async restoreBreakpointsIfConsistentScripts(): Promise<void> {
    for (const scriptFile of this.scriptFileForDebuggerModel.values()) {
      if (scriptFile.hasDivergedFromVM() || scriptFile.isMergingToVM()) {
        return;
      }
    }

    await this.restoreBreakpointsAfterEditing();
  }

  private async restoreBreakpointsAfterEditing(): Promise<void> {
    this.muted = false;
    if (this.mutedFromStart) {
      this.mutedFromStart = false;
      this.initializeBreakpoints();
      return;
    }
    const decorations = Array.from(this.breakpointDecorations);
    this.breakpointDecorations.clear();
    this.textEditor.operation(() => decorations.map(decoration => decoration.hide()));
    for (const decoration of decorations) {
      if (!decoration.breakpoint) {
        continue;
      }
      const enabled = decoration.enabled;
      decoration.breakpoint.remove(false);
      const location = decoration.handle.resolve();
      if (location) {
        await this.setBreakpoint(location.lineNumber, location.columnNumber, decoration.condition, enabled);
      }
    }
  }

  private isIdentifier(tokenType: string): boolean {
    return tokenType.startsWith('js-variable') || tokenType.startsWith('js-property') || tokenType === 'js-def' ||
        tokenType === 'variable';
  }

  private getPopoverRequest(event: MouseEvent): UI.PopoverHelper.PopoverRequest|null {
    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      return null;
    }
    const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
    const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
    if (!debuggerModel || !debuggerModel.isPaused()) {
      return null;
    }

    const textPosition = this.textEditor.coordinatesToCursorPosition(event.x, event.y);
    if (!textPosition) {
      return null;
    }

    const mouseLine = textPosition.startLine;
    const mouseColumn = textPosition.startColumn;
    const textSelection = this.textEditor.selection().normalize();
    let editorLineNumber = -1;
    let startHighlight = -1;
    let endHighlight = -1;

    const selectedCallFrame =
        (UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame) as SDK.DebuggerModel.CallFrame);
    if (!selectedCallFrame) {
      return null;
    }

    if (textSelection && !textSelection.isEmpty()) {
      if (textSelection.startLine !== textSelection.endLine || textSelection.startLine !== mouseLine ||
          mouseColumn < textSelection.startColumn || mouseColumn > textSelection.endColumn) {
        return null;
      }
      editorLineNumber = textSelection.startLine;
      startHighlight = textSelection.startColumn;
      endHighlight = textSelection.endColumn - 1;
    } else if (this.uiSourceCode.mimeType() === 'application/wasm') {
      const token = this.textEditor.tokenAtTextPosition(textPosition.startLine, textPosition.startColumn);
      if (!token || token.type !== 'variable-2') {
        return null;
      }
      editorLineNumber = textPosition.startLine;
      startHighlight = token.startColumn;
      endHighlight = token.endColumn - 1;

      // For $label identifiers we can't show a meaningful preview (https://crbug.com/1155548),
      // so we suppress them for now. Label identifiers can only appear as operands to control
      // instructions[1], so we just check the first token on the line and filter them out.
      //
      // [1]: https://webassembly.github.io/spec/core/text/instructions.html#control-instructions
      for (let firstColumn = 0; firstColumn < startHighlight; ++firstColumn) {
        const firstToken = this.textEditor.tokenAtTextPosition(editorLineNumber, firstColumn);
        if (firstToken && firstToken.type === 'keyword') {
          const line = this.textEditor.line(editorLineNumber);
          switch (line.substring(firstToken.startColumn, firstToken.endColumn)) {
            case 'block':
            case 'loop':
            case 'if':
            case 'else':
            case 'end':
            case 'br':
            case 'br_if':
            case 'br_table':
              return null;
            default:
              break;
          }
          break;
        }
      }
    } else {
      let token = this.textEditor.tokenAtTextPosition(textPosition.startLine, textPosition.startColumn);
      if (!token) {
        return null;
      }
      editorLineNumber = textPosition.startLine;
      const line = this.textEditor.line(editorLineNumber);
      let tokenContent = line.substring(token.startColumn, token.endColumn);

      // When the user hovers an opening bracket, we look for the closing bracket
      // and kick off the matching from that below.
      if (tokenContent === '[') {
        const closingColumn = line.indexOf(']', token.startColumn);
        if (closingColumn < 0) {
          return null;
        }
        token = this.textEditor.tokenAtTextPosition(editorLineNumber, closingColumn);
        if (!token) {
          return null;
        }
        tokenContent = line.substring(token.startColumn, token.endColumn);
      }
      startHighlight = token.startColumn;
      endHighlight = token.endColumn - 1;

      // Consume multiple `[index][0]...[f(1)]` at the end of the expression.
      while (tokenContent === ']') {
        startHighlight = line.lastIndexOf('[', startHighlight) - 1;
        if (startHighlight < 0) {
          return null;
        }
        token = this.textEditor.tokenAtTextPosition(editorLineNumber, startHighlight);
        if (!token) {
          return null;
        }
        tokenContent = line.substring(token.startColumn, token.endColumn);
        startHighlight = token.startColumn;
      }

      if (!token.type) {
        return null;
      }
      const isIdentifier = this.isIdentifier(token.type);
      if (!isIdentifier && (token.type !== 'js-keyword' || tokenContent !== 'this')) {
        return null;
      }

      while (startHighlight > 1 && line.charAt(startHighlight - 1) === '.') {
        // Consume multiple `[index][0]...[f(1)]` preceeding a dot.
        while (line.charAt(startHighlight - 2) === ']') {
          startHighlight = line.lastIndexOf('[', startHighlight - 2) - 1;
          if (startHighlight < 0) {
            return null;
          }
        }
        const tokenBefore = this.textEditor.tokenAtTextPosition(editorLineNumber, startHighlight - 2);
        if (!tokenBefore || !tokenBefore.type) {
          return null;
        }
        if (tokenBefore.type === 'js-meta') {
          break;
        }
        if (tokenBefore.type === 'js-string-2') {
          // If we hit a template literal, find the opening ` in this line.
          // TODO(bmeurer): We should eventually replace this tokenization
          // approach with a proper soluation based on parsing, maybe reusing
          // the Parser and AST inside V8 for this (or potentially relying on
          // acorn to do the job).
          if (tokenBefore.endColumn < 2) {
            return null;
          }
          startHighlight = line.lastIndexOf('`', tokenBefore.endColumn - 2);
          if (startHighlight < 0) {
            return null;
          }
          break;
        }
        startHighlight = tokenBefore.startColumn;
      }
    }

    const leftCorner =
        (this.textEditor.cursorPositionToCoordinates(editorLineNumber, startHighlight) as
         TextEditor.CodeMirrorTextEditor.Coordinates);
    const rightCorner =
        (this.textEditor.cursorPositionToCoordinates(editorLineNumber, endHighlight) as
         TextEditor.CodeMirrorTextEditor.Coordinates);
    const box = new AnchorBox(leftCorner.x, leftCorner.y, rightCorner.x - leftCorner.x, leftCorner.height);

    let objectPopoverHelper: ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper|null = null;
    let highlightDescriptor: CodeMirror.TextMarker|null = null;

    async function evaluate(uiSourceCode: Workspace.UISourceCode.UISourceCode, evaluationText: string): Promise<{
      object: SDK.RemoteObject.RemoteObject,
      exceptionDetails?: Protocol.Runtime.ExceptionDetails,
    }|{
      error: string,
    }|null> {
      const resolvedText = await resolveExpression(
          selectedCallFrame, evaluationText, uiSourceCode, editorLineNumber, startHighlight, endHighlight);
      return await selectedCallFrame.evaluate({
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
    }

    return {
      box,
      show: async(popover: UI.GlassPane.GlassPane): Promise<boolean> => {
        const evaluationText = this.textEditor.line(editorLineNumber).substring(startHighlight, endHighlight + 1);
        const result = await evaluate(this.uiSourceCode, evaluationText);

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
        const highlightRange =
            new TextUtils.TextRange.TextRange(editorLineNumber, startHighlight, editorLineNumber, endHighlight);
        highlightDescriptor = this.textEditor.highlightRange(highlightRange, 'source-frame-eval-expression');
        return true;
      },
      hide: (): void => {
        if (objectPopoverHelper) {
          objectPopoverHelper.dispose();
        }
        debuggerModel.runtimeModel().releaseObjectGroup('popover');
        if (highlightDescriptor) {
          this.textEditor.removeHighlight(highlightDescriptor);
        }
      },
    };
  }

  private onWheel(event: WheelEvent): void {
    if (this.executionLocation && UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      event.preventDefault();
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!event.ctrlKey || (!event.metaKey && Host.Platform.isMac())) {
      this.clearControlDown();
    }

    if (event.key === Platform.KeyboardUtilities.ESCAPE_KEY) {
      if (this.popoverHelper.isPopoverVisible()) {
        this.popoverHelper.hidePopover();
        event.consume();
      }
      return;
    }

    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event) && this.executionLocation) {
      this.controlDown = true;
      if (event.key === (Host.Platform.isMac() ? 'Meta' : 'Control')) {
        this.controlTimeout = window.setTimeout(() => {
          if (this.executionLocation && this.controlDown) {
            this.showContinueToLocations();
          }
        }, 150);
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.executionLocation && this.controlDown &&
        UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      if (!this.continueToLocationDecorations) {
        this.showContinueToLocations();
      }
    }
    if (this.continueToLocationDecorations) {
      const target = (event.target as Element);
      const textPosition = this.textEditor.coordinatesToCursorPosition(event.x, event.y);
      const hovering = Boolean(target.enclosingNodeOrSelfWithClass('source-frame-async-step-in'));
      this.setAsyncStepInHoveredLine(textPosition ? textPosition.startLine : null, hovering);
    }
  }

  private setAsyncStepInHoveredLine(editorLineNumber: number|null, hovered: boolean): void {
    if (this.asyncStepInHoveredLine === editorLineNumber && this.asyncStepInHovered === hovered) {
      return;
    }
    if (this.asyncStepInHovered && this.asyncStepInHoveredLine) {
      this.textEditor.toggleLineClass(this.asyncStepInHoveredLine, 'source-frame-async-step-in-hovered', false);
    }
    this.asyncStepInHoveredLine = editorLineNumber;
    this.asyncStepInHovered = hovered;
    if (this.asyncStepInHovered && this.asyncStepInHoveredLine) {
      this.textEditor.toggleLineClass(this.asyncStepInHoveredLine, 'source-frame-async-step-in-hovered', true);
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.executionLocation || !UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event)) {
      return;
    }
    if (!this.continueToLocationDecorations) {
      return;
    }
    event.consume();
    const textPosition = this.textEditor.coordinatesToCursorPosition(event.x, event.y);
    if (!textPosition) {
      return;
    }
    for (const decoration of this.continueToLocationDecorations.keys()) {
      const range = decoration.find();
      if (!range) {
        continue;
      }
      if (range.from.line !== textPosition.startLine || range.to.line !== textPosition.startLine) {
        continue;
      }
      if (range.from.ch <= textPosition.startColumn && textPosition.startColumn <= range.to.ch) {
        const callback = this.continueToLocationDecorations.get(decoration);
        if (!callback) {
          throw new Error('Expected a function');
        }
        callback();
        break;
      }
    }
  }

  private onBlur(_event: Event): void {
    this.clearControlDown();
  }

  private onKeyUp(_event: KeyboardEvent): void {
    this.clearControlDown();
  }

  private clearControlDown(): void {
    this.controlDown = false;
    this.clearContinueToLocations();
    if (this.controlTimeout) {
      clearTimeout(this.controlTimeout);
    }
  }

  private async editBreakpointCondition(
      editorLineNumber: number, breakpoint: Bindings.BreakpointManager.Breakpoint|null, location: {
        lineNumber: number,
        columnNumber: number,
      }|null,
      preferLogpoint?: boolean): Promise<void> {
    const oldCondition = breakpoint ? breakpoint.condition() : '';
    const decorationElement = document.createElement('div');
    const dialog = new BreakpointEditDialog(editorLineNumber, oldCondition, Boolean(preferLogpoint), async result => {
      dialog.detach();
      this.textEditor.removeDecoration(decorationElement, editorLineNumber);
      if (!result.committed) {
        return;
      }
      if (breakpoint) {
        breakpoint.setCondition(result.condition);
      } else if (location) {
        await this.setBreakpoint(location.lineNumber, location.columnNumber, result.condition, true);
      } else {
        await this.createNewBreakpoint(editorLineNumber, result.condition, true);
      }
    });
    this.textEditor.addDecoration(decorationElement, editorLineNumber);
    dialog.markAsExternallyManaged();
    dialog.show(decorationElement);
    dialog.focusEditor();
  }

  private async executionLineChanged(liveLocation: Bindings.LiveLocation.LiveLocation): Promise<void> {
    this.clearExecutionLine();
    const uiLocation = await liveLocation.uiLocation();
    if (!uiLocation || uiLocation.uiSourceCode.url() !== this.uiSourceCode.url()) {
      this.executionLocation = null;
      return;
    }

    this.executionLocation = uiLocation;
    const editorLocation = this.transformer.uiLocationToEditorLocation(uiLocation.lineNumber, uiLocation.columnNumber);
    this.textEditor.setExecutionLocation(editorLocation.lineNumber, editorLocation.columnNumber);
    if (this.textEditor.isShowing()) {
      // We need SourcesTextEditor to be initialized prior to this call. @see crbug.com/506566
      queueMicrotask(() => {
        if (this.controlDown) {
          this.showContinueToLocations();
        } else {
          this.generateValuesInSource();
        }
      });
    }
  }

  private generateValuesInSource(): void {
    if (!Common.Settings.Settings.instance().moduleSetting('inlineVariableValues').get()) {
      return;
    }
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (!executionContext) {
      return;
    }
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame) {
      return;
    }

    const localScope = callFrame.localScope();
    const functionLocation = callFrame.functionLocation();
    if (localScope && functionLocation) {
      resolveScopeInObject(localScope)
          .getAllProperties(false, false)
          .then(this.prepareScopeVariables.bind(this, callFrame));
    }
  }

  private showContinueToLocations(): void {
    this.popoverHelper.hidePopover();
    const executionContext = UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext);
    if (!executionContext) {
      return;
    }
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame) {
      return;
    }
    const start = callFrame.functionLocation() || callFrame.location();
    const debuggerModel = callFrame.debuggerModel;
    debuggerModel.getPossibleBreakpoints(start, null, true)
        .then(locations => this.textEditor.operation(renderLocations.bind(this, locations)));

    function renderLocations(this: DebuggerPlugin, locations: SDK.DebuggerModel.BreakLocation[]): void {
      this.clearContinueToLocationsNoRestore();
      this.textEditor.hideExecutionLineBackground();
      this.continueToLocationDecorations = new Map();
      locations = locations.reverse();
      let previousCallLine = -1;
      for (const location of locations) {
        const editorLocation = this.transformer.uiLocationToEditorLocation(location.lineNumber, location.columnNumber);
        const tokenThatIsPossiblyNull =
            this.textEditor.tokenAtTextPosition(editorLocation.lineNumber, editorLocation.columnNumber);
        if (!tokenThatIsPossiblyNull) {
          continue;
        }
        let token: TextEditor.CodeMirrorTextEditor.Token =
            (tokenThatIsPossiblyNull as TextEditor.CodeMirrorTextEditor.Token);

        const line = this.textEditor.line(editorLocation.lineNumber);
        let tokenContent = line.substring(token.startColumn, token.endColumn);
        if (!token.type && tokenContent === '.') {
          const nextToken = this.textEditor.tokenAtTextPosition(editorLocation.lineNumber, token.endColumn + 1);
          if (!nextToken) {
            throw new Error('nextToken should not be null.');
          }
          token = nextToken;
          tokenContent = line.substring(token.startColumn, token.endColumn);
        }
        if (!token.type) {
          continue;
        }
        const validKeyword = token.type === 'js-keyword' &&
            (tokenContent === 'this' || tokenContent === 'return' || tokenContent === 'new' ||
             tokenContent === 'continue' || tokenContent === 'break');
        if (!validKeyword && !this.isIdentifier(token.type)) {
          continue;
        }
        if (previousCallLine === editorLocation.lineNumber &&
            location.type !== Protocol.Debugger.BreakLocationType.Call) {
          continue;
        }

        let highlightRange: TextUtils.TextRange.TextRange = new TextUtils.TextRange.TextRange(
            editorLocation.lineNumber, token.startColumn, editorLocation.lineNumber, token.endColumn - 1);
        let decoration = this.textEditor.highlightRange(highlightRange, 'source-frame-continue-to-location');
        this.continueToLocationDecorations.set(decoration, location.continueToLocation.bind(location));
        if (location.type === Protocol.Debugger.BreakLocationType.Call) {
          previousCallLine = editorLocation.lineNumber;
        }

        let isAsyncCall: boolean = (line[token.startColumn - 1] === '.' && tokenContent === 'then') ||
            tokenContent === 'setTimeout' || tokenContent === 'setInterval' || tokenContent === 'postMessage';
        if (tokenContent === 'new') {
          const nextToken = this.textEditor.tokenAtTextPosition(editorLocation.lineNumber, token.endColumn + 1);
          if (!nextToken) {
            throw new Error('nextToken should not be null.');
          }
          token = nextToken;
          tokenContent = line.substring(token.startColumn, token.endColumn);
          isAsyncCall = tokenContent === 'Worker';
        }
        const isCurrentPosition = this.executionLocation && location.lineNumber === this.executionLocation.lineNumber &&
            location.columnNumber === this.executionLocation.columnNumber;
        if (location.type === Protocol.Debugger.BreakLocationType.Call && isAsyncCall) {
          const asyncStepInRange =
              this.findAsyncStepInRange(this.textEditor, editorLocation.lineNumber, line, token.endColumn);
          if (asyncStepInRange) {
            highlightRange = new TextUtils.TextRange.TextRange(
                editorLocation.lineNumber, asyncStepInRange.from, editorLocation.lineNumber, asyncStepInRange.to - 1);
            decoration = this.textEditor.highlightRange(highlightRange, 'source-frame-async-step-in');
            this.continueToLocationDecorations.set(
                decoration, this.asyncStepIn.bind(this, location, Boolean(isCurrentPosition)));
          }
        }
      }

      this.continueToLocationRenderedForTest();
    }
  }

  private continueToLocationRenderedForTest(): void {
  }

  private findAsyncStepInRange(
      textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor, editorLineNumber: number, line: string,
      column: number): {
    from: number,
    to: number,
  }|null {
    let token: (TextEditor.CodeMirrorTextEditor.Token|null)|null = null;
    let tokenText;
    let from: number = column;
    let to: number = line.length;

    let position = line.indexOf('(', column);
    const argumentsStart = position;
    if (position === -1) {
      return null;
    }
    position++;

    skipWhitespace();
    if (position >= line.length) {
      return null;
    }

    token = nextToken();
    if (!token) {
      return null;
    }
    from = token.startColumn;

    if (token.type === 'js-keyword' && tokenText === 'async') {
      skipWhitespace();
      if (position >= line.length) {
        return {from: from, to: to};
      }
      token = nextToken();
      if (!token) {
        return {from: from, to: to};
      }
    }

    if (token.type === 'js-keyword' && tokenText === 'function') {
      return {from: from, to: to};
    }

    if (token.type === 'js-string') {
      return {from: argumentsStart, to: to};
    }

    if (token.type && this.isIdentifier(token.type)) {
      return {from: from, to: to};
    }

    if (tokenText !== '(') {
      return null;
    }
    const closeParen = line.indexOf(')', position);
    if (closeParen === -1 || line.substring(position, closeParen).indexOf('(') !== -1) {
      return {from: from, to: to};
    }
    return {from: from, to: closeParen + 1};

    function nextToken(): TextEditor.CodeMirrorTextEditor.Token|null {
      token = textEditor.tokenAtTextPosition(editorLineNumber, position);
      if (token) {
        position = token.endColumn;
        to = token.endColumn;
        tokenText = line.substring(token.startColumn, token.endColumn);
      }

      return token;
    }

    function skipWhitespace(): void {
      while (position < line.length) {
        if (line[position] === ' ') {
          position++;
          continue;
        }
        const token = textEditor.tokenAtTextPosition(editorLineNumber, position);
        if (!token) {
          throw new Error('expected token to not be null');
        }
        if (token.type === 'js-comment') {
          position = token.endColumn;
          continue;
        }
        break;
      }
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

  private async prepareScopeVariables(
      callFrame: SDK.DebuggerModel.CallFrame, allProperties: SDK.RemoteObject.GetPropertiesResult): Promise<void> {
    const properties = allProperties.properties;
    this.clearValueWidgets();
    if (!properties || !properties.length || properties.length > 500 || !this.textEditor.isShowing()) {
      return;
    }

    const functionUILocationPromise =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
            (callFrame.functionLocation() as SDK.DebuggerModel.Location));
    const executionUILocationPromise =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
            callFrame.location());
    const [functionUILocation, executionUILocation] =
        await Promise.all([functionUILocationPromise, executionUILocationPromise]);
    if (!functionUILocation || !executionUILocation ||
        functionUILocation.uiSourceCode.url() !== this.uiSourceCode.url() ||
        executionUILocation.uiSourceCode.url() !== this.uiSourceCode.url()) {
      return;
    }

    const functionEditorLocation =
        this.transformer.uiLocationToEditorLocation(functionUILocation.lineNumber, functionUILocation.columnNumber);
    const executionEditorLocation =
        this.transformer.uiLocationToEditorLocation(executionUILocation.lineNumber, executionUILocation.columnNumber);
    const fromLine = functionEditorLocation.lineNumber;
    const fromColumn = functionEditorLocation.columnNumber;
    const toLine = executionEditorLocation.lineNumber;
    if (fromLine >= toLine || toLine - fromLine > 500 || fromLine < 0 || toLine >= this.textEditor.linesCount) {
      return;
    }

    const valuesMap = new Map<string, SDK.RemoteObject.RemoteObject|null|undefined>();
    for (const property of properties) {
      valuesMap.set(property.name, property.value);
    }

    const namesPerLine = new Map<number, Set<string>>();
    let skipObjectProperty = false;
    const tokenizer = TextUtils.CodeMirrorUtils.TokenizerFactory.instance().createTokenizer('text/javascript');
    tokenizer(this.textEditor.line(fromLine).substring(fromColumn), processToken.bind(this, fromLine));
    for (let i = fromLine + 1; i < toLine; ++i) {
      tokenizer(this.textEditor.line(i), processToken.bind(this, i));
    }

    function processToken(
        this: DebuggerPlugin, editorLineNumber: number, tokenValue: string, tokenType: string|null, _column: number,
        _newColumn: number): void {
      if (!skipObjectProperty && tokenType && this.isIdentifier(tokenType) && valuesMap.get(tokenValue)) {
        let names = namesPerLine.get(editorLineNumber);
        if (!names) {
          names = new Set();
          namesPerLine.set(editorLineNumber, names);
        }
        names.add(tokenValue);
      }
      skipObjectProperty = tokenValue === '.';
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // @ts-expect-error
    this.textEditor.operation(this.renderDecorations.bind(this, valuesMap, namesPerLine, fromLine, toLine));
  }

  private renderDecorations(
      valuesMap: Map<string, SDK.RemoteObject.RemoteObject>, namesPerLine: Map<number, Set<string>>, fromLine: number,
      toLine: number): void {
    const formatter = new ObjectUI.RemoteObjectPreviewFormatter.RemoteObjectPreviewFormatter();
    for (let i = fromLine; i < toLine; ++i) {
      const names = namesPerLine.get(i);
      const oldWidget = this.valueWidgets.get(i);
      if (!names) {
        if (oldWidget) {
          this.valueWidgets.delete(i);
          this.textEditor.removeDecoration(oldWidget, i);
        }
        continue;
      }

      const widget = (document.createElement('div') as DecoratorWidget);
      widget.classList.add('text-editor-value-decoration');
      const base = this.textEditor.cursorPositionToCoordinates(i, 0);
      if (!base) {
        throw new Error('base is expected to not be null');
      }
      const offset = this.textEditor.cursorPositionToCoordinates(i, this.textEditor.line(i).length);
      if (!offset) {
        throw new Error('offset is expected to not be null');
      }
      const codeMirrorLinesLeftPadding = 4;
      const left = offset.x - base.x + codeMirrorLinesLeftPadding;
      widget.style.left = left + 'px';
      widget.nameToToken = new Map();

      let renderedNameCount = 0;
      for (const name of names) {
        if (renderedNameCount > 10) {
          break;
        }
        const names = namesPerLine.get(i - 1);
        if (names && names.has(name)) {
          continue;
        }  // Only render name once in the given continuous block.
        if (renderedNameCount) {
          UI.UIUtils.createTextChild(widget, ', ');
        }
        const nameValuePair = (widget.createChild('span') as HTMLElement);
        widget.nameToToken.set(name, nameValuePair);
        UI.UIUtils.createTextChild(nameValuePair, name + ' = ');
        const value = valuesMap.get(name);
        if (!value) {
          throw new Error('value is expected to be null');
        }
        const propertyCount = value.preview ? value.preview.properties.length : 0;
        const entryCount = value.preview && value.preview.entries ? value.preview.entries.length : 0;
        if (value.preview && propertyCount + entryCount < 10) {
          formatter.appendObjectPreview(nameValuePair, value.preview, false /* isEntry */);
        } else {
          const propertyValue = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValue(
              value, /* wasThrown */ false, /* showPreview */ false);
          nameValuePair.appendChild(propertyValue.element);
        }
        ++renderedNameCount;
      }

      let widgetChanged = true;
      if (oldWidget) {
        widgetChanged = false;
        for (const name of widget.nameToToken.keys()) {
          const oldTextElement = oldWidget.nameToToken.get(name);
          const newTextElement = widget.nameToToken.get(name);
          const oldText = oldTextElement ? oldTextElement.textContent : '';
          const newText = newTextElement ? newTextElement.textContent : '';
          if (newText !== oldText) {
            widgetChanged = true;
            UI.UIUtils.runCSSAnimationOnce(
                (widget.nameToToken.get(name) as Element), 'source-frame-value-update-highlight');
          }
        }
        if (widgetChanged) {
          this.valueWidgets.delete(i);
          this.textEditor.removeDecoration(oldWidget, i);
        }
      }
      if (widgetChanged) {
        this.valueWidgets.set(i, widget);
        this.textEditor.addDecoration(widget, i);
      }
    }
  }

  private clearExecutionLine(): void {
    this.textEditor.operation(() => {
      if (this.executionLocation) {
        this.textEditor.clearExecutionLine();
      }
      this.executionLocation = null;
      if (this.clearValueWidgetsTimer) {
        clearTimeout(this.clearValueWidgetsTimer);
        this.clearValueWidgetsTimer = null;
      }
      this.clearValueWidgetsTimer = window.setTimeout(this.clearValueWidgets.bind(this), 1000);
      this.clearContinueToLocationsNoRestore();
    });
  }

  private clearValueWidgets(): void {
    if (this.clearValueWidgetsTimer) {
      clearTimeout(this.clearValueWidgetsTimer);
    }
    this.clearValueWidgetsTimer = null;
    this.textEditor.operation(() => {
      for (const line of this.valueWidgets.keys()) {
        const valueWidget = this.valueWidgets.get(line);
        if (valueWidget) {
          this.textEditor.removeDecoration(valueWidget, line);
        }
      }
      this.valueWidgets.clear();
    });
  }

  private clearContinueToLocationsNoRestore(): void {
    const continueToLocationDecorations = this.continueToLocationDecorations;
    if (!continueToLocationDecorations) {
      return;
    }
    this.textEditor.operation(() => {
      for (const decoration of continueToLocationDecorations.keys()) {
        this.textEditor.removeHighlight(decoration);
      }
      this.continueToLocationDecorations = null;
      this.setAsyncStepInHoveredLine(null, false);
    });
  }

  private clearContinueToLocations(): void {
    if (!this.continueToLocationDecorations) {
      return;
    }
    this.textEditor.operation(() => {
      this.textEditor.showExecutionLineBackground();
      this.generateValuesInSource();
      this.clearContinueToLocationsNoRestore();
    });
  }

  private lineBreakpointDecorations(lineNumber: number): BreakpointDecoration[] {
    return Array.from(this.breakpointDecorations)
        .filter(decoration => (decoration.handle.resolve() || {}).lineNumber === lineNumber);
  }

  private breakpointDecoration(editorLineNumber: number, editorColumnNumber: number): BreakpointDecoration|null {
    for (const decoration of this.breakpointDecorations) {
      const location = decoration.handle.resolve();
      if (!location) {
        continue;
      }
      if (location.lineNumber === editorLineNumber && location.columnNumber === editorColumnNumber) {
        return decoration;
      }
    }
    return null;
  }

  private updateBreakpointDecoration(decoration: BreakpointDecoration): void {
    if (!this.scheduledBreakpointDecorationUpdates) {
      this.scheduledBreakpointDecorationUpdates = new Set();
      queueMicrotask(() => {
        this.textEditor.operation(update.bind(this));
      });
    }
    this.scheduledBreakpointDecorationUpdates.add(decoration);

    function update(this: DebuggerPlugin): void {
      if (!this.scheduledBreakpointDecorationUpdates) {
        return;
      }
      const editorLineNumbers = new Set<number>();
      for (const decoration of this.scheduledBreakpointDecorationUpdates) {
        const location = decoration.handle.resolve();
        if (!location) {
          continue;
        }
        editorLineNumbers.add(location.lineNumber);
      }
      this.scheduledBreakpointDecorationUpdates = null;
      let waitingForInlineDecorations = false;
      for (const lineNumber of editorLineNumbers) {
        const decorations = this.lineBreakpointDecorations(lineNumber);
        updateGutter.call(this, lineNumber, decorations);
        if (this.possibleBreakpointsRequested.has(lineNumber)) {
          waitingForInlineDecorations = true;
          continue;
        }
        updateInlineDecorations.call(this, lineNumber, decorations);
      }
      if (!waitingForInlineDecorations) {
        this.breakpointDecorationsUpdatedForTest();
      }
    }

    function updateGutter(this: DebuggerPlugin, editorLineNumber: number, decorations: BreakpointDecoration[]): void {
      this.textEditor.toggleLineClass(editorLineNumber, 'cm-breakpoint', false);
      this.textEditor.toggleLineClass(editorLineNumber, 'cm-breakpoint-disabled', false);
      this.textEditor.toggleLineClass(editorLineNumber, 'cm-breakpoint-unbound', false);
      this.textEditor.toggleLineClass(editorLineNumber, 'cm-breakpoint-conditional', false);
      this.textEditor.toggleLineClass(editorLineNumber, 'cm-breakpoint-logpoint', false);

      if (decorations.length) {
        decorations.sort(BreakpointDecoration.mostSpecificFirst);
        const isDisabled = !decorations[0].enabled || this.muted;
        const isLogpoint = decorations[0].condition.includes(LogpointPrefix);
        const isUnbound = !decorations[0].bound;
        const isConditionalBreakpoint = Boolean(decorations[0].condition) && !isLogpoint;

        this.textEditor.toggleLineClass(editorLineNumber, 'cm-breakpoint', true);
        this.textEditor.toggleLineClass(editorLineNumber, 'cm-breakpoint-disabled', isDisabled);
        this.textEditor.toggleLineClass(editorLineNumber, 'cm-breakpoint-unbound', isUnbound && !isDisabled);
        this.textEditor.toggleLineClass(editorLineNumber, 'cm-breakpoint-logpoint', isLogpoint);
        this.textEditor.toggleLineClass(editorLineNumber, 'cm-breakpoint-conditional', isConditionalBreakpoint);
      }
    }

    function updateInlineDecorations(
        this: DebuggerPlugin, editorLineNumber: number, decorations: BreakpointDecoration[]): void {
      const actualBookmarks = new Set<TextEditor.CodeMirrorTextEditor.TextEditorBookMark>(
          // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
          // @ts-expect-error
          decorations.map(decoration => decoration.bookmark).filter(bookmark => Boolean(bookmark)));
      const lineEnd = this.textEditor.line(editorLineNumber).length;
      const bookmarks = this.textEditor.bookmarks(
          new TextUtils.TextRange.TextRange(editorLineNumber, 0, editorLineNumber, lineEnd),
          BreakpointDecoration.bookmarkSymbol);
      for (const bookmark of bookmarks) {
        if (!actualBookmarks.has(bookmark)) {
          bookmark.clear();
        }
      }
      if (!decorations.length) {
        return;
      }
      if (decorations.length > 1) {
        for (const decoration of decorations) {
          decoration.update();
          if (!this.muted) {
            decoration.show();
          } else {
            decoration.hide();
          }
        }
      } else {
        decorations[0].update();
        decorations[0].hide();
      }
    }
  }

  private breakpointDecorationsUpdatedForTest(): void {
  }

  private async inlineBreakpointClick(decoration: BreakpointDecoration, event: MouseEvent): Promise<void> {
    event.consume(true);
    if (decoration.breakpoint) {
      if (event.shiftKey) {
        decoration.breakpoint.setEnabled(!decoration.breakpoint.enabled());
      } else {
        decoration.breakpoint.remove(false);
      }
    } else {
      const editorLocation = decoration.handle.resolve();
      if (!editorLocation) {
        return;
      }
      const location =
          this.transformer.editorLocationToUILocation(editorLocation.lineNumber, editorLocation.columnNumber);
      await this.setBreakpoint(location.lineNumber, location.columnNumber, decoration.condition, true);
    }
  }

  private inlineBreakpointContextMenu(decoration: BreakpointDecoration, event: Event): void {
    event.consume(true);
    const editorLocation = decoration.handle.resolve();
    if (!editorLocation) {
      return;
    }
    if (this.textEditor.hasLineClass(editorLocation.lineNumber, 'cm-non-breakable-line')) {
      return;
    }
    if (!Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().supportsConditionalBreakpoints(
            this.uiSourceCode)) {
      // Editing breakpoints only make sense for conditional breakpoints
      // and logpoints.
      return;
    }
    const location =
        this.transformer.editorLocationToUILocation(editorLocation.lineNumber, editorLocation.columnNumber);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    if (decoration.breakpoint) {
      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.editBreakpoint),
          this.editBreakpointCondition.bind(
              this, editorLocation.lineNumber, decoration.breakpoint, null, false /* preferLogpoint */));
    } else {
      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.addConditionalBreakpoint),
          this.editBreakpointCondition.bind(
              this, editorLocation.lineNumber, null, editorLocation, false /* preferLogpoint */));
      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.addLogpoint),
          this.editBreakpointCondition.bind(
              this, editorLocation.lineNumber, null, editorLocation, true /* preferLogpoint */));
      contextMenu.debugSection().appendItem(
          i18nString(UIStrings.neverPauseHere),
          this.setBreakpoint.bind(this, location.lineNumber, location.columnNumber, 'false', true));
    }
    contextMenu.show();
  }

  private shouldIgnoreExternalBreakpointEvents(
      event: Common.EventTarget.EventTargetEvent<Bindings.BreakpointManager.BreakpointLocation>): boolean {
    const {uiLocation} = event.data;
    if (uiLocation.uiSourceCode !== this.uiSourceCode) {
      return true;
    }
    if (this.muted) {
      return true;
    }
    for (const scriptFile of this.scriptFileForDebuggerModel.values()) {
      if (scriptFile.isDivergingFromVM() || scriptFile.isMergingToVM()) {
        return true;
      }
    }
    return false;
  }

  private breakpointAdded(event: Common.EventTarget.EventTargetEvent<Bindings.BreakpointManager.BreakpointLocation>):
      void {
    if (this.shouldIgnoreExternalBreakpointEvents(event)) {
      return;
    }
    const {breakpoint, uiLocation} = event.data;
    this.addBreakpoint(uiLocation, breakpoint);
  }

  private addBreakpoint(
      uiLocation: Workspace.UISourceCode.UILocation, breakpoint: Bindings.BreakpointManager.Breakpoint): void {
    const editorLocation = this.transformer.uiLocationToEditorLocation(uiLocation.lineNumber, uiLocation.columnNumber);
    const lineDecorations = this.lineBreakpointDecorations(uiLocation.lineNumber);
    let decoration = this.breakpointDecoration(editorLocation.lineNumber, editorLocation.columnNumber);
    if (decoration) {
      decoration.breakpoint = breakpoint;
      decoration.condition = breakpoint.condition();
      decoration.enabled = breakpoint.enabled();
    } else {
      const handle = this.textEditor.textEditorPositionHandle(editorLocation.lineNumber, editorLocation.columnNumber);
      decoration = new BreakpointDecoration(
          this.textEditor, handle, breakpoint.condition(), breakpoint.enabled(),
          breakpoint.bound() || !breakpoint.hasBoundScript(), breakpoint);
      decoration.element.addEventListener('click', this.inlineBreakpointClick.bind(this, decoration), true);
      decoration.element.addEventListener('contextmenu', this.inlineBreakpointContextMenu.bind(this, decoration), true);
      this.breakpointDecorations.add(decoration);
    }
    this.decorationByBreakpoint.set(breakpoint, decoration);
    this.updateBreakpointDecoration(decoration);
    if (breakpoint.enabled() && !lineDecorations.length) {
      this.possibleBreakpointsRequested.add(editorLocation.lineNumber);
      const start = this.transformer.editorLocationToUILocation(editorLocation.lineNumber, 0);
      const end = this.transformer.editorLocationToUILocation(editorLocation.lineNumber + 1, 0);
      this.breakpointManager
          .possibleBreakpoints(
              this.uiSourceCode,
              new TextUtils.TextRange.TextRange(
                  start.lineNumber, start.columnNumber || 0, end.lineNumber, end.columnNumber || 0))
          .then(addInlineDecorations.bind(this, editorLocation.lineNumber));
    }

    function addInlineDecorations(
        this: DebuggerPlugin, editorLineNumber: number, possibleLocations: Workspace.UISourceCode.UILocation[]): void {
      this.possibleBreakpointsRequested.delete(editorLineNumber);
      const decorations = this.lineBreakpointDecorations(editorLineNumber);
      for (const decoration of decorations) {
        this.updateBreakpointDecoration(decoration);
      }
      if (!decorations.some(decoration => Boolean(decoration.breakpoint))) {
        return;
      }
      const columns = new Set<number>();
      for (const decoration of decorations) {
        const editorLocation = decoration.handle.resolve();
        if (!editorLocation) {
          continue;
        }
        columns.add(editorLocation.columnNumber);
      }
      // Only consider the first 100 inline breakpoints, as DevTools might appear to hang while CodeMirror is updating
      // the inline breakpoints. See crbug.com/1060105.
      for (const location of possibleLocations.slice(0, 100)) {
        const editorLocation = this.transformer.uiLocationToEditorLocation(location.lineNumber, location.columnNumber);
        if (editorLocation.lineNumber !== editorLineNumber) {
          continue;
        }
        if (columns.has(editorLocation.columnNumber)) {
          continue;
        }
        const handle = this.textEditor.textEditorPositionHandle(editorLocation.lineNumber, editorLocation.columnNumber);
        const decoration = new BreakpointDecoration(
            this.textEditor, handle, '', /** enabled */ false, /** bound */ false, /** breakpoint */ null);
        decoration.element.addEventListener('click', this.inlineBreakpointClick.bind(this, decoration), true);
        decoration.element.addEventListener(
            'contextmenu', this.inlineBreakpointContextMenu.bind(this, decoration), true);
        this.breakpointDecorations.add(decoration);
        this.updateBreakpointDecoration(decoration);
      }
    }
  }

  private breakpointRemoved(event: Common.EventTarget.EventTargetEvent<Bindings.BreakpointManager.BreakpointLocation>):
      void {
    if (this.shouldIgnoreExternalBreakpointEvents(event)) {
      return;
    }
    const {breakpoint, uiLocation} = event.data;
    const decoration = this.decorationByBreakpoint.get(breakpoint);
    if (!decoration) {
      return;
    }
    this.decorationByBreakpoint.delete(breakpoint);

    const editorLocation = this.transformer.uiLocationToEditorLocation(uiLocation.lineNumber, uiLocation.columnNumber);
    decoration.breakpoint = null;
    decoration.enabled = false;

    const lineDecorations = this.lineBreakpointDecorations(editorLocation.lineNumber);
    if (!lineDecorations.some(decoration => Boolean(decoration.breakpoint))) {
      for (const lineDecoration of lineDecorations) {
        this.breakpointDecorations.delete(lineDecoration);
        this.updateBreakpointDecoration(lineDecoration);
      }
    } else {
      this.updateBreakpointDecoration(decoration);
    }
  }

  private initializeBreakpoints(): void {
    const breakpointLocations = this.breakpointManager.breakpointLocationsForUISourceCode(this.uiSourceCode);
    for (const breakpointLocation of breakpointLocations) {
      this.addBreakpoint(breakpointLocation.uiLocation, breakpointLocation.breakpoint);
    }
  }

  private updateLinesWithoutMappingHighlight(): void {
    if (Bindings.CompilerScriptMapping.CompilerScriptMapping.uiSourceCodeOrigin(this.uiSourceCode).length) {
      const linesCount = this.textEditor.linesCount;
      for (let i = 0; i < linesCount; ++i) {
        const lineHasMapping =
            Bindings.CompilerScriptMapping.CompilerScriptMapping.uiLineHasMapping(this.uiSourceCode, i);
        if (!lineHasMapping) {
          this.hasLineWithoutMapping = true;
        }
        if (this.hasLineWithoutMapping) {
          this.textEditor.toggleLineClass(i, 'cm-non-breakable-line', !lineHasMapping);
        }
      }
      return;
    }

    const {pluginManager} = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    if (pluginManager) {
      pluginManager.getMappedLines(this.uiSourceCode)
          .then(mappedLines => {
            if (mappedLines === undefined) {
              return;
            }
            const linesCount = this.textEditor.linesCount;
            for (let i = 0; i < linesCount; ++i) {
              const lineHasMapping = mappedLines.has(i);
              if (!lineHasMapping) {
                this.hasLineWithoutMapping = true;
              }
              if (this.hasLineWithoutMapping) {
                this.textEditor.toggleLineClass(i, 'cm-non-breakable-line', !lineHasMapping);
              }
            }
          })
          .catch(console.error);
    }
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
      if (this.muted && !this.uiSourceCode.isDirty()) {
        this.restoreBreakpointsIfConsistentScripts();
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
      this.sourceMapInfobar = null;
    });
    this.textEditor.attachInfobar(this.sourceMapInfobar);
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
      this.prettyPrintInfobar = null;
    });
    const toolbar = new UI.Toolbar.Toolbar('');
    const button = new UI.Toolbar.ToolbarButton('', 'largeicon-pretty-print');
    toolbar.appendToolbarItem(button);
    toolbar.element.style.display = 'inline-block';
    toolbar.element.style.verticalAlign = 'middle';
    toolbar.element.style.marginBottom = '3px';
    toolbar.element.style.pointerEvents = 'none';
    toolbar.element.tabIndex = -1;
    const element = this.prettyPrintInfobar.createDetailsRowMessage();
    element.appendChild(
        i18n.i18n.getFormatLocalizedString(str_, UIStrings.prettyprintingWillFormatThisFile, {PH1: toolbar.element}));
    UI.ARIAUtils.markAsAlert(element);
    this.textEditor.attachInfobar(this.prettyPrintInfobar);
  }

  private async handleGutterClick(
      event: Common.EventTarget.EventTargetEvent<SourceFrame.SourcesTextEditor.GutterClickEventData>): Promise<void> {
    if (this.muted) {
      return;
    }

    const {gutterType, lineNumber: editorLineNumber, event: eventObject} = event.data;
    if (gutterType !== SourceFrame.SourcesTextEditor.lineNumbersGutterType) {
      return;
    }

    if (eventObject.button !== 0 || eventObject.altKey || eventObject.ctrlKey || eventObject.metaKey) {
      return;
    }

    await this.toggleBreakpoint(editorLineNumber, eventObject.shiftKey);
    eventObject.consume(true);
  }

  private async toggleBreakpoint(editorLineNumber: number, onlyDisable: boolean): Promise<void> {
    const decorations = this.lineBreakpointDecorations(editorLineNumber);
    if (!decorations.length) {
      await this.createNewBreakpoint(editorLineNumber, '', true);
      return;
    }
    const hasDisabled = this.textEditor.hasLineClass(editorLineNumber, 'cm-breakpoint-disabled');
    const breakpoints =
        (decorations.map(decoration => decoration.breakpoint).filter(breakpoint => Boolean(breakpoint)) as
         Bindings.BreakpointManager.Breakpoint[]);
    for (const breakpoint of breakpoints) {
      if (onlyDisable) {
        breakpoint.setEnabled(hasDisabled);
      } else {
        breakpoint.remove(false);
      }
    }
  }

  private async createNewBreakpoint(editorLineNumber: number, condition: string, enabled: boolean): Promise<void> {
    if (this.textEditor.hasLineClass(editorLineNumber, 'cm-non-breakable-line')) {
      return;
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ScriptsBreakpointSet);
    const origin = this.transformer.editorLocationToUILocation(editorLineNumber);
    await this.setBreakpoint(origin.lineNumber, origin.columnNumber, condition, enabled);
  }

  private async setBreakpoint(lineNumber: number, columnNumber: number|undefined, condition: string, enabled: boolean):
      Promise<void> {
    Common.Settings.Settings.instance().moduleSetting('breakpointsActive').set(true);
    await this.breakpointManager.setBreakpoint(this.uiSourceCode, lineNumber, columnNumber, condition, enabled);
    this.breakpointWasSetForTest(lineNumber, columnNumber, condition, enabled);
  }

  private breakpointWasSetForTest(
      _lineNumber: number, _columnNumber: number|undefined, _condition: string, _enabled: boolean): void {
  }

  private async callFrameChanged(): Promise<void> {
    this.liveLocationPool.disposeAll();
    const callFrame = UI.Context.Context.instance().flavor(SDK.DebuggerModel.CallFrame);
    if (!callFrame) {
      this.clearExecutionLine();
      return;
    }
    await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createCallFrameLiveLocation(
        callFrame.location(), this.executionLineChanged.bind(this), this.liveLocationPool);
  }

  dispose(): void {
    for (const decoration of this.breakpointDecorations) {
      decoration.dispose();
    }
    this.breakpointDecorations.clear();
    if (this.scheduledBreakpointDecorationUpdates) {
      for (const decoration of this.scheduledBreakpointDecorationUpdates) {
        decoration.dispose();
      }
      this.scheduledBreakpointDecorationUpdates.clear();
    }

    this.hideIgnoreListInfobar();
    if (this.sourceMapInfobar) {
      this.sourceMapInfobar.dispose();
    }
    if (this.prettyPrintInfobar) {
      this.prettyPrintInfobar.dispose();
    }
    this.scriptsPanel.element.removeEventListener('scroll', this.boundPopoverHelperHide, true);
    for (const script of this.scriptFileForDebuggerModel.values()) {
      script.removeEventListener(
          Bindings.ResourceScriptMapping.ResourceScriptFile.Events.DidMergeToVM, this.didMergeToVM, this);
      script.removeEventListener(
          Bindings.ResourceScriptMapping.ResourceScriptFile.Events.DidDivergeFromVM, this.didDivergeFromVM, this);
    }
    this.scriptFileForDebuggerModel.clear();

    this.textEditor.element.removeEventListener('keydown', this.boundKeyDown, true);
    this.textEditor.element.removeEventListener('keyup', this.boundKeyUp, true);
    this.textEditor.element.removeEventListener('mousemove', this.boundMouseMove, false);
    this.textEditor.element.removeEventListener('mousedown', this.boundMouseDown, true);
    this.textEditor.element.removeEventListener('focusout', this.boundBlur, false);
    this.textEditor.element.removeEventListener('wheel', this.boundWheel, true);

    this.textEditor.removeEventListener(SourceFrame.SourcesTextEditor.Events.GutterClick, this.boundGutterClick, this);
    this.popoverHelper.hidePopover();
    this.popoverHelper.dispose();

    this.breakpointManager.removeEventListener(
        Bindings.BreakpointManager.Events.BreakpointAdded, this.breakpointAdded, this);
    this.breakpointManager.removeEventListener(
        Bindings.BreakpointManager.Events.BreakpointRemoved, this.breakpointRemoved, this);
    this.uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyChanged, this.workingCopyChanged, this);
    this.uiSourceCode.removeEventListener(
        Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);

    Common.Settings.Settings.instance()
        .moduleSetting('skipStackFramesPattern')
        .removeChangeListener(this.showIgnoreListInfobarIfNeeded, this);
    Common.Settings.Settings.instance()
        .moduleSetting('skipContentScripts')
        .removeChangeListener(this.showIgnoreListInfobarIfNeeded, this);
    super.dispose();

    this.clearExecutionLine();
    UI.Context.Context.instance().removeFlavorChangeListener(SDK.DebuggerModel.CallFrame, this.callFrameChanged, this);
    this.liveLocationPool.disposeAll();
  }
}

export class BreakpointDecoration {
  private textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor;
  handle: TextEditor.CodeMirrorTextEditor.TextEditorPositionHandle;
  condition: string;
  enabled: boolean;
  bound: boolean;
  breakpoint: Bindings.BreakpointManager.Breakpoint|null;
  element: HTMLSpanElement;
  bookmark: TextEditor.CodeMirrorTextEditor.TextEditorBookMark|null;
  constructor(
      textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor,
      handle: TextEditor.CodeMirrorTextEditor.TextEditorPositionHandle, condition: string, enabled: boolean,
      bound: boolean, breakpoint: Bindings.BreakpointManager.Breakpoint|null) {
    this.textEditor = textEditor;
    this.handle = handle;
    this.condition = condition;
    this.enabled = enabled;
    this.bound = bound;
    this.breakpoint = breakpoint;
    this.element = document.createElement('span');
    this.element.classList.toggle('cm-inline-breakpoint', true);

    this.bookmark = null;
  }

  static mostSpecificFirst(decoration1: BreakpointDecoration, decoration2: BreakpointDecoration): number {
    if (decoration1.enabled !== decoration2.enabled) {
      return decoration1.enabled ? -1 : 1;
    }
    if (decoration1.bound !== decoration2.bound) {
      return decoration1.bound ? -1 : 1;
    }
    if (Boolean(decoration1.condition) !== Boolean(decoration2.condition)) {
      return Boolean(decoration1.condition) ? -1 : 1;
    }
    return 0;
  }

  update(): void {
    const isLogpoint = Boolean(this.condition) && this.condition.includes(LogpointPrefix);
    const isConditionalBreakpoint = Boolean(this.condition) && !isLogpoint;
    this.element.classList.toggle('cm-inline-logpoint', isLogpoint);
    this.element.classList.toggle('cm-inline-breakpoint-conditional', isConditionalBreakpoint);
    this.element.classList.toggle('cm-inline-disabled', !this.enabled);
  }

  show(): void {
    if (this.bookmark) {
      return;
    }
    const editorLocation = this.handle.resolve();
    if (!editorLocation) {
      return;
    }
    this.bookmark = this.textEditor.addBookmark(
        editorLocation.lineNumber, editorLocation.columnNumber, this.element, BreakpointDecoration.bookmarkSymbol);
    // @ts-ignore Only used for layout tests
    this.bookmark[BreakpointDecoration.elementSymbolForTest] = this.element;
  }

  hide(): void {
    if (!this.bookmark) {
      return;
    }
    this.bookmark.clear();
    this.bookmark = null;
  }

  dispose(): void {
    const location = this.handle.resolve();
    if (location) {
      this.textEditor.toggleLineClass(location.lineNumber, 'cm-breakpoint', false);
      this.textEditor.toggleLineClass(location.lineNumber, 'cm-breakpoint-disabled', false);
      this.textEditor.toggleLineClass(location.lineNumber, 'cm-breakpoint-unbound', false);
      this.textEditor.toggleLineClass(location.lineNumber, 'cm-breakpoint-conditional', false);
      this.textEditor.toggleLineClass(location.lineNumber, 'cm-breakpoint-logpoint', false);
    }
    this.hide();
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly bookmarkSymbol = Symbol('bookmark');
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly elementSymbolForTest = Symbol('element');
}

export const continueToLocationDecorationSymbol = Symbol('bookmark');
