// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../ui/legacy/legacy.js';
import '../../ui/components/markdown_view/markdown_view.js';
import '../../ui/components/spinners/spinners.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ChangesPanel from '../changes/changes.js';
import * as PanelCommon from '../common/common.js';

import {SelectWorkspaceDialog} from './SelectWorkspaceDialog.js';

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   * @description Text displayed for showing patch widget view.
   */
  unsavedChanges: 'Unsaved changes',
  /**
   * @description Loading text displayed as a summary title when the patch suggestion is getting loaded
   */
  applyingToWorkspace: 'Applying to workspace…',
  /**
   * @description Button text for staging changes to workspace.
   */
  applyToWorkspace: 'Apply to workspace',
  /**
   * @description Button text to change the selected workspace
   */
  change: 'Change',
  /**
   * @description Accessible title of the Change button to indicate that
   * the button can be used to change the root folder.
   */
  changeRootFolder: 'Change project root folder',
  /**
   * @description Button text to cancel applying to workspace
   */
  cancel: 'Cancel',
  /**
   * @description Button text to discard the suggested changes and not save them to file system
   */
  discard: 'Discard',
  /**
   * @description Button text to save all the suggested changes to file system
   */
  saveAll: 'Save all',
  /**
   * @description Header text after the user saved the changes to the disk.
   */
  savedToDisk: 'Saved to disk',
  /**
   * @description Disclaimer text shown for using code snippets with caution
   */
  codeDisclaimer: 'Use code snippets with caution',
  /**
   * @description Tooltip text for the info icon beside the "Apply to workspace" button
   */
  applyToWorkspaceTooltip: 'Source code from the selected folder is sent to Google to generate code suggestions.',
  /**
   * @description Tooltip text for the info icon beside the "Apply to workspace" button when enterprise logging is off
   */
  applyToWorkspaceTooltipNoLogging:
      'Source code from the selected folder is sent to Google to generate code suggestions. This data will not be used to improve Google’s AI models.',
  /**
   * @description The footer disclaimer that links to more information
   * about the AI feature. Same text as in ChatView.
   */
  learnMore: 'Learn more',
  /**
   * @description Header text for the AI-powered code suggestions disclaimer dialog.
   */
  freDisclaimerHeader: 'Apply changes directly to your project’s source code',
  /**
   * @description First disclaimer item text for the fre dialog.
   */
  freDisclaimerTextAiWontAlwaysGetItRight: 'This feature uses AI and won’t always get it right',
  /**
   * @description Second disclaimer item text for the fre dialog.
   */
  freDisclaimerTextPrivacy:
      'To generate code suggestions, source code from the selected folder is sent to Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Second disclaimer item text for the fre dialog when enterprise logging is off.
   */
  freDisclaimerTextPrivacyNoLogging:
      'To generate code suggestions, source code from the selected folder is sent to Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Third disclaimer item text for the fre dialog.
   */
  freDisclaimerTextUseWithCaution: 'Use generated code snippets with caution',
  /**
   * @description Title of the link opening data that was used to
   * produce a code suggestion.
   */
  viewUploadedFiles: 'View data sent to Google',
  /**
   * @description Text indicating that a link opens in a new tab (for a11y).
   */
  opensInNewTab: '(opens in a new tab)',
  /**
   * @description Generic error text for the case the changes were not applied to the workspace.
   */
  genericErrorMessage: 'Changes couldn’t be applied to your workspace.',
} as const;

const lockedString = i18n.i18n.lockedString;

const CODE_SNIPPET_WARNING_URL = 'https://support.google.com/legal/answer/13505487';

export enum PatchSuggestionState {
  /**
   * The user did not attempt patching yet
   */
  INITIAL = 'initial',
  /**
   * Applying to page tree is in progress
   */
  LOADING = 'loading',
  /**
   * Applying to page tree succeeded
   */
  SUCCESS = 'success',
  /**
   * Applying to page tree failed
   */
  ERROR = 'error',
}

enum SelectedProjectType {
  /**
   * No project selected
   */
  NONE = 'none',
  /**
   * The selected project is not an automatic workspace project
   */
  REGULAR = 'regular',
  /**
   * The selected project is a disconnected automatic workspace project
   */
  AUTOMATIC_DISCONNECTED = 'automaticDisconnected',
  /**
   * The selected project is a connected automatic workspace project
   */
  AUTOMATIC_CONNECTED = 'automaticConnected',
}

export interface ViewInput {
  workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
  patchSuggestionState: PatchSuggestionState;
  changeSummary?: string;
  sources?: string;
  projectName: string;
  projectPath: Platform.DevToolsPath.RawPathString;
  projectType: SelectedProjectType;
  savedToDisk?: boolean;
  applyToWorkspaceTooltipText: Platform.UIString.LocalizedString;
  onLearnMoreTooltipClick: () => void;
  onApplyToWorkspace: () => void;
  onCancel: () => void;
  onDiscard: () => void;
  onSaveAll: () => void;
  onChangeWorkspaceClick?: () => void;
}

export interface ViewOutput {
  tooltipRef?: Directives.Ref<HTMLElement>;
  changeRef?: Directives.Ref<HTMLElement>;
  summaryRef?: Directives.Ref<HTMLElement>;
}

type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export class PatchWidget extends UI.Widget.Widget {
  changeSummary = '';
  changeManager: AiAssistanceModel.ChangeManager|undefined;
  // Whether the user completed first run experience dialog or not.
  #aiPatchingFreCompletedSetting =
      Common.Settings.Settings.instance().createSetting('ai-assistance-patching-fre-completed', false);
  #projectIdSetting =
      Common.Settings.Settings.instance().createSetting('ai-assistance-patching-selected-project-id', '');
  #view: View;
  #viewOutput: ViewOutput = {};
  #aidaClient: Host.AidaClient.AidaClient;
  #applyPatchAbortController?: AbortController;
  #project?: Workspace.Workspace.Project;
  #patchSources?: string;
  #savedToDisk?: boolean;
  #noLogging: boolean;  // Whether the enterprise setting is `ALLOW_WITHOUT_LOGGING` or not.
  #patchSuggestionState = PatchSuggestionState.INITIAL;
  #workspaceDiff = WorkspaceDiff.WorkspaceDiff.workspaceDiff();
  #workspace = Workspace.Workspace.WorkspaceImpl.instance();
  #automaticFileSystem =
      Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance().automaticFileSystem;
  #applyToDisconnectedAutomaticWorkspace = false;
  #popoverHelper: UI.PopoverHelper.PopoverHelper|null = null;
  // `rpcId` from the `applyPatch` request
  #rpcId: Host.AidaClient.RpcGlobalId|null = null;

  constructor(element?: HTMLElement, view?: View, opts?: {
    aidaClient: Host.AidaClient.AidaClient,
  }) {
    super(element);
    this.#aidaClient = opts?.aidaClient ?? new Host.AidaClient.AidaClient();
    this.#noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;

    // clang-format off
    this.#view = view ?? ((input, output, target) => {
      if (!input.changeSummary && input.patchSuggestionState === PatchSuggestionState.INITIAL) {
        return;
      }
      output.tooltipRef = output.tooltipRef ?? Directives.createRef<HTMLElement>();
      output.changeRef = output.changeRef ?? Directives.createRef<HTMLElement>();
      output.summaryRef = output.summaryRef ?? Directives.createRef<HTMLElement>();

      function renderSourcesLink(): LitTemplate {
        if (!input.sources) {
          return nothing;
        }

        return html`<x-link
          class="link"
          title="${UIStringsNotTranslate.viewUploadedFiles} ${UIStringsNotTranslate.opensInNewTab}"
          href="data:text/plain;charset=utf-8,${encodeURIComponent(input.sources)}"
          jslog=${VisualLogging.link('files-used-in-patching').track({click: true})}>
          ${UIStringsNotTranslate.viewUploadedFiles}
        </x-link>`;
      }

      function renderHeader(): LitTemplate {
        if (input.savedToDisk) {
          return html`
            <devtools-icon class="green-bright-icon summary-badge" name="check-circle"></devtools-icon>
            <span class="header-text">
              ${lockedString(UIStringsNotTranslate.savedToDisk)}
            </span>
          `;
        }

        if (input.patchSuggestionState === PatchSuggestionState.SUCCESS) {
          return html`
            <devtools-icon class="on-tonal-icon summary-badge" name="difference"></devtools-icon>
            <span class="header-text">
              ${lockedString(`File changes in ${input.projectName}`)}
            </span>
            <devtools-icon
              class="arrow"
              name="chevron-down"
            ></devtools-icon>
          `;
        }

        return html`
          <devtools-icon class="on-tonal-icon summary-badge" name="pen-spark"></devtools-icon>
          <span class="header-text">
            ${lockedString(UIStringsNotTranslate.unsavedChanges)}
          </span>
          <devtools-icon
            class="arrow"
            name="chevron-down"
          ></devtools-icon>
        `;
      }

      function renderContent(): LitTemplate {
        if ((!input.changeSummary && input.patchSuggestionState === PatchSuggestionState.INITIAL) || input.savedToDisk) {
          return nothing;
        }

        if (input.patchSuggestionState === PatchSuggestionState.SUCCESS) {
          return html`<devtools-widget .widgetConfig=${UI.Widget.widgetConfig(ChangesPanel.CombinedDiffView.CombinedDiffView, {
            workspaceDiff: input.workspaceDiff,
            // Ignore user creates inspector-stylesheets
            ignoredUrls: ['inspector://']
          })}></devtools-widget>`;
        }

        return html`<devtools-code-block
          .code=${input.changeSummary ?? ''}
          .codeLang=${'css'}
          .displayNotice=${true}
        ></devtools-code-block>
        ${input.patchSuggestionState === PatchSuggestionState.ERROR
          ? html`<div class="error-container">
              <devtools-icon name="cross-circle-filled"></devtools-icon>${
              lockedString(UIStringsNotTranslate.genericErrorMessage)
              } ${renderSourcesLink()}
            </div>`
          : nothing
        }`;
      }

      function renderFooter(): LitTemplate {
        if (input.savedToDisk) {
          return nothing;
        }

        if (input.patchSuggestionState === PatchSuggestionState.SUCCESS) {
          return html`
          <div class="footer">
            <div class="left-side">
              <x-link class="link disclaimer-link" href="https://support.google.com/legal/answer/13505487" jslog=${
                VisualLogging.link('code-disclaimer').track({
                  click: true,
                })}>
                ${lockedString(UIStringsNotTranslate.codeDisclaimer)}
              </x-link>
              ${renderSourcesLink()}
            </div>
            <div class="save-or-discard-buttons">
              <devtools-button
                @click=${input.onDiscard}
                .jslogContext=${'patch-widget.discard'}
                .variant=${Buttons.Button.Variant.OUTLINED}>
                  ${lockedString(UIStringsNotTranslate.discard)}
              </devtools-button>
              <devtools-button
                @click=${input.onSaveAll}
                .jslogContext=${'patch-widget.save-all'}
                .variant=${Buttons.Button.Variant.PRIMARY}>
                  ${lockedString(UIStringsNotTranslate.saveAll)}
              </devtools-button>
            </div>
          </div>
          `;
        }

        const iconName = input.projectType === SelectedProjectType.AUTOMATIC_DISCONNECTED ? 'folder-off' : input.projectType === SelectedProjectType.AUTOMATIC_CONNECTED ? 'folder-asterisk' : 'folder';
        return html`
        <div class="footer">
          ${input.projectName ? html`
            <div class="change-workspace" jslog=${VisualLogging.section('patch-widget.workspace')}>
                <devtools-icon .name=${iconName}></devtools-icon>
                <span class="folder-name" title=${input.projectPath}>${input.projectName}</span>
              ${input.onChangeWorkspaceClick ? html`
                <devtools-button
                  @click=${input.onChangeWorkspaceClick}
                  .jslogContext=${'change-workspace'}
                  .variant=${Buttons.Button.Variant.TEXT}
                  .title=${lockedString(UIStringsNotTranslate.changeRootFolder)}
                  .disabled=${input.patchSuggestionState === PatchSuggestionState.LOADING}
                  ${Directives.ref(output.changeRef)}
                >${lockedString(UIStringsNotTranslate.change)}</devtools-button>
              ` : nothing}
            </div>
          ` : nothing}
          <div class="apply-to-workspace-container" aria-live="polite">
            ${input.patchSuggestionState === PatchSuggestionState.LOADING ? html`
              <div class="loading-text-container" jslog=${VisualLogging.section('patch-widget.apply-to-workspace-loading')}>
                <devtools-spinner></devtools-spinner>
                <span>
                  ${lockedString(UIStringsNotTranslate.applyingToWorkspace)}
                </span>
              </div>
            ` : html`
                <devtools-button
                @click=${input.onApplyToWorkspace}
                .jslogContext=${'patch-widget.apply-to-workspace'}
                .variant=${Buttons.Button.Variant.OUTLINED}>
                ${lockedString(UIStringsNotTranslate.applyToWorkspace)}
              </devtools-button>
            `}
            ${input.patchSuggestionState === PatchSuggestionState.LOADING ? html`<devtools-button
              @click=${input.onCancel}
              .jslogContext=${'cancel'}
              .variant=${Buttons.Button.Variant.OUTLINED}>
              ${lockedString(UIStringsNotTranslate.cancel)}
            </devtools-button>` : nothing}
            <devtools-button
              aria-details="info-tooltip"
              .jslogContext=${'patch-widget.info-tooltip-trigger'}
              .iconName=${'info'}
              .variant=${Buttons.Button.Variant.ICON}
              .title=${input.applyToWorkspaceTooltipText}
            ></devtools-button>
          </div>
        </div>`;
      }

      // Use a simple div for the "Saved to disk" state as it's not expandable,
      // otherwise use the interactive <details> element.
      const template = input.savedToDisk
        ? html`
          <div class="change-summary saved-to-disk" role="status" aria-live="polite">
            <div class="header-container">
             ${renderHeader()}
             </div>
          </div>`
        : html`
          <details class="change-summary" jslog=${VisualLogging.section('patch-widget')}>
            <summary class="header-container" ${Directives.ref(output.summaryRef)}>
              ${renderHeader()}
            </summary>
            ${renderContent()}
            ${renderFooter()}
          </details>
        `;

      render(template, target, {host: target});
    });
    // We're using PopoverHelper as a workaround instead of using <devtools-tooltip>. See the bug for more details.
    // TODO: Update here when b/409965560 is fixed.
    this.#popoverHelper = new UI.PopoverHelper.PopoverHelper(this.contentElement, event => {
      // There are two ways this event is received for showing a popover case:
      // * The latest element on the composed path is `<devtools-button>`
      // * The 2nd element on the composed path is `<devtools-button>` (the last element is the `<button>` inside it.)
      const hoveredNode = event.composedPath()[0];
      const maybeDevToolsButton = event.composedPath()[2];

      const popoverShownNode = hoveredNode instanceof HTMLElement && hoveredNode.getAttribute('aria-details') === 'info-tooltip' ? hoveredNode
        : maybeDevToolsButton instanceof HTMLElement && maybeDevToolsButton.getAttribute('aria-details') === 'info-tooltip' ? maybeDevToolsButton
        : null;
      if (!popoverShownNode) {
        return null;
      }
      return {
        box: popoverShownNode.boxInWindow(),
        show: async (popover: UI.GlassPane.GlassPane) => {
          // clang-format off
          render(html`
            <style>
              .info-tooltip-container {
                max-width: var(--sys-size-28);
                padding: var(--sys-size-4) var(--sys-size-5);

                .tooltip-link {
                  display: block;
                  margin-top: var(--sys-size-4);
                  color: var(--sys-color-primary);
                  padding-left: 0;
                }
              }
            </style>
            <div class="info-tooltip-container">
              ${UIStringsNotTranslate.applyToWorkspaceTooltip}
              <button
                class="link tooltip-link"
                role="link"
                jslog=${VisualLogging.link('open-ai-settings').track({
                  click: true,
                })}
                @click=${this.#onLearnMoreTooltipClick}
              >${lockedString(UIStringsNotTranslate.learnMore)}</button>
            </div>`, popover.contentElement, {host: this});
          // clang-forat on
          return true;
        },
      };
    }, 'patch-widget.info-tooltip');
    this.#popoverHelper.setTimeout(0);
    // clang-format on
    this.requestUpdate();
  }

  #onLearnMoreTooltipClick(): void {
    this.#viewOutput.tooltipRef?.value?.hidePopover();
    void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
  }

  #getDisplayedProject(): {projectName: string, projectPath: Platform.DevToolsPath.RawPathString} {
    if (this.#project) {
      return {
        projectName: Common.ParsedURL.ParsedURL.encodedPathToRawPathString(
            this.#project.displayName() as Platform.DevToolsPath.EncodedPathString),
        projectPath: Common.ParsedURL.ParsedURL.urlToRawPathString(
            this.#project.id() as Platform.DevToolsPath.UrlString, Host.Platform.isWin()),
      };
    }
    if (this.#automaticFileSystem) {
      return {
        projectName: Common.ParsedURL.ParsedURL.extractName(this.#automaticFileSystem.root),
        projectPath: this.#automaticFileSystem.root,
      };
    }
    return {
      projectName: '',
      projectPath: Platform.DevToolsPath.EmptyRawPathString,
    };
  }

  #shouldShowChangeButton(): boolean {
    const automaticFileSystemProject =
        this.#automaticFileSystem ? this.#workspace.projectForFileSystemRoot(this.#automaticFileSystem.root) : null;
    const regularProjects = this.#workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem)
                                .filter(
                                    project => project instanceof Persistence.FileSystemWorkspaceBinding.FileSystem &&
                                        project.fileSystem().type() ===
                                            Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT)
                                .filter(project => project !== automaticFileSystemProject);
    return regularProjects.length > 0;
  }

  #getSelectedProjectType(projectPath: Platform.DevToolsPath.RawPathString): SelectedProjectType {
    if (this.#automaticFileSystem && this.#automaticFileSystem.root === projectPath) {
      return this.#project ? SelectedProjectType.AUTOMATIC_CONNECTED : SelectedProjectType.AUTOMATIC_DISCONNECTED;
    }
    return this.#project ? SelectedProjectType.NONE : SelectedProjectType.REGULAR;
  }

  override performUpdate(): void {
    const {projectName, projectPath} = this.#getDisplayedProject();

    this.#view(
        {
          workspaceDiff: this.#workspaceDiff,
          changeSummary: this.changeSummary,
          patchSuggestionState: this.#patchSuggestionState,
          sources: this.#patchSources,
          projectName,
          projectPath,
          projectType: this.#getSelectedProjectType(projectPath),
          savedToDisk: this.#savedToDisk,
          applyToWorkspaceTooltipText: this.#noLogging ?
              lockedString(UIStringsNotTranslate.applyToWorkspaceTooltipNoLogging) :
              lockedString(UIStringsNotTranslate.applyToWorkspaceTooltip),
          onLearnMoreTooltipClick: this.#onLearnMoreTooltipClick.bind(this),
          onApplyToWorkspace: this.#onApplyToWorkspace.bind(this),
          onCancel: () => {
            this.#applyPatchAbortController?.abort();
          },
          onDiscard: this.#onDiscard.bind(this),
          onSaveAll: this.#onSaveAll.bind(this),
          onChangeWorkspaceClick: this.#shouldShowChangeButton() ?
              this.#showSelectWorkspaceDialog.bind(this, {applyPatch: false}) :
              undefined,
        },
        this.#viewOutput, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    this.#selectDefaultProject();

    if (isAiAssistancePatchingEnabled()) {
      this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, this.#onProjectAdded, this);
      this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#onProjectRemoved, this);
    }
  }

  override willHide(): void {
    this.#applyToDisconnectedAutomaticWorkspace = false;
    if (isAiAssistancePatchingEnabled()) {
      this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectAdded, this.#onProjectAdded, this);
      this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#onProjectRemoved, this);
    }
  }

  async #showFreDisclaimerIfNeeded(): Promise<boolean> {
    const isAiPatchingFreCompleted = this.#aiPatchingFreCompletedSetting.get();
    if (isAiPatchingFreCompleted) {
      return true;
    }

    const result = await PanelCommon.FreDialog.show({
      header: {iconName: 'smart-assistant', text: lockedString(UIStringsNotTranslate.freDisclaimerHeader)},
      reminderItems: [
        {
          iconName: 'psychiatry',
          content: lockedString(UIStringsNotTranslate.freDisclaimerTextAiWontAlwaysGetItRight),
        },
        {
          iconName: 'google',
          content: this.#noLogging ? lockedString(UIStringsNotTranslate.freDisclaimerTextPrivacyNoLogging) :
                                     lockedString(UIStringsNotTranslate.freDisclaimerTextPrivacy),
        },
        {
          iconName: 'warning',
          // clang-format off
          content: html`<x-link
            href=${CODE_SNIPPET_WARNING_URL}
            class="link devtools-link"
            jslog=${VisualLogging.link('code-snippets-explainer.patch-widget').track({
              click: true
            })}
          >${lockedString(UIStringsNotTranslate.freDisclaimerTextUseWithCaution)}</x-link>`,
          // clang-format on
        }
      ],
      onLearnMoreClick: () => {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
      },
      ariaLabel: lockedString(UIStringsNotTranslate.freDisclaimerHeader),
      learnMoreButtonTitle: lockedString(UIStringsNotTranslate.learnMore),
    });

    if (result) {
      this.#aiPatchingFreCompletedSetting.set(true);
    }
    return result;
  }

  #selectDefaultProject(): void {
    const project = this.#automaticFileSystem ?
        this.#workspace.projectForFileSystemRoot(this.#automaticFileSystem.root) :
        this.#workspace.project(this.#projectIdSetting.get());
    if (project) {
      this.#project = project;
    } else {
      this.#project = undefined;
      this.#projectIdSetting.set('');
    }
    this.requestUpdate();
  }

  #onProjectAdded(event: Common.EventTarget.EventTargetEvent<Workspace.Workspace.Project>): void {
    const addedProject = event.data;
    if (this.#applyToDisconnectedAutomaticWorkspace && this.#automaticFileSystem &&
        addedProject === this.#workspace.projectForFileSystemRoot(this.#automaticFileSystem.root)) {
      this.#applyToDisconnectedAutomaticWorkspace = false;
      this.#project = addedProject;
      void this.#applyPatchAndUpdateUI();
    } else if (this.#project === undefined) {
      this.#selectDefaultProject();
    }
  }

  #onProjectRemoved(): void {
    if (this.#project && !this.#workspace.project(this.#project.id())) {
      this.#projectIdSetting.set('');
      this.#project = undefined;
      this.requestUpdate();
    }
  }

  #showSelectWorkspaceDialog(options: {applyPatch: boolean} = {applyPatch: false}): void {
    const onProjectSelected = (project: Workspace.Workspace.Project): void => {
      this.#project = project;
      this.#projectIdSetting.set(project.id());
      if (options.applyPatch) {
        void this.#applyPatchAndUpdateUI();
      } else {
        this.requestUpdate();
        void this.updateComplete.then(() => {
          this.contentElement?.querySelector('.apply-to-workspace-container devtools-button')
              ?.shadowRoot?.querySelector('button')
              ?.focus();
        });
      }
    };

    SelectWorkspaceDialog.show(onProjectSelected, this.#project);
  }

  async #onApplyToWorkspace(): Promise<void> {
    if (!isAiAssistancePatchingEnabled()) {
      return;
    }

    // Show the FRE dialog if needed and only continue when
    // the user accepted the disclaimer.
    const freDisclaimerCompleted = await this.#showFreDisclaimerIfNeeded();
    if (!freDisclaimerCompleted) {
      return;
    }

    if (this.#project) {
      await this.#applyPatchAndUpdateUI();
    } else if (this.#automaticFileSystem) {
      this.#applyToDisconnectedAutomaticWorkspace = true;
      await Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance().connectAutomaticFileSystem(
          /* addIfMissing= */ true);
    } else {
      this.#showSelectWorkspaceDialog({applyPatch: true});
    }
  }

  /**
   * The modified files excluding inspector stylesheets
   */
  get #modifiedFiles(): Workspace.UISourceCode.UISourceCode[] {
    return this.#workspaceDiff.modifiedUISourceCodes().filter(modifiedUISourceCode => {
      return !modifiedUISourceCode.url().startsWith('inspector://');
    });
  }

  async #applyPatchAndUpdateUI(): Promise<void> {
    const changeSummary = this.changeSummary;
    if (!changeSummary) {
      throw new Error('Change summary does not exist');
    }

    this.#patchSuggestionState = PatchSuggestionState.LOADING;
    this.#rpcId = null;
    this.requestUpdate();
    const {response, processedFiles} = await this.#applyPatch(changeSummary);
    if (response && 'rpcId' in response && response.rpcId) {
      this.#rpcId = response.rpcId;
    }

    // Determines if applying the patch resulted in any actual file changes in the workspace.
    // This is crucial because the agent might return an answer (e.g., an explanation)
    // without making any code modifications (i.e., no `writeFile` calls).
    // If no files were modified, we avoid transitioning to a success state,
    // which would otherwise lead to an empty and potentially confusing diff view.
    //
    // Note: The `hasChanges` check below is based on `modifiedUISourceCodes()`, which reflects
    // *all* current modifications in the workspace. It does not differentiate between
    // changes made by this specific AI patch operation versus pre-existing changes
    // made by the user. Consequently, if the AI patch itself makes no changes but the
    // user already had other modified files, the widget will still transition to the
    // success state (displaying all current workspace modifications).
    const hasChanges = this.#modifiedFiles.length > 0;
    if (response?.type === AiAssistanceModel.ResponseType.ANSWER && hasChanges) {
      this.#patchSuggestionState = PatchSuggestionState.SUCCESS;
    } else if (
        response?.type === AiAssistanceModel.ResponseType.ERROR &&
        response.error === AiAssistanceModel.ErrorType.ABORT) {
      // If this is an abort error, we're returning back to the initial state.
      this.#patchSuggestionState = PatchSuggestionState.INITIAL;
    } else {
      this.#patchSuggestionState = PatchSuggestionState.ERROR;
    }
    this.#patchSources = `Filenames in ${this.#project?.displayName()}.
Files:
${processedFiles.map(filename => `* ${filename}`).join('\n')}`;
    this.requestUpdate();

    if (this.#patchSuggestionState === PatchSuggestionState.SUCCESS) {
      void this.updateComplete.then(() => {
        this.#viewOutput.summaryRef?.value?.focus();
      });
    }
  }

  #onDiscard(): void {
    for (const modifiedUISourceCode of this.#modifiedFiles) {
      modifiedUISourceCode.resetWorkingCopy();
    }

    this.#patchSuggestionState = PatchSuggestionState.INITIAL;
    this.#patchSources = undefined;
    void this.changeManager?.popStashedChanges();
    this.#submitRating(Host.AidaClient.Rating.NEGATIVE);
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.#viewOutput.changeRef?.value?.focus();
    });
  }

  #onSaveAll(): void {
    for (const modifiedUISourceCode of this.#modifiedFiles) {
      modifiedUISourceCode.commitWorkingCopy();
    }
    void this.changeManager?.stashChanges().then(() => {
      this.changeManager?.dropStashedChanges();
    });

    this.#savedToDisk = true;
    this.#submitRating(Host.AidaClient.Rating.POSITIVE);
    this.requestUpdate();
  }

  #submitRating(rating: Host.AidaClient.Rating): void {
    if (!this.#rpcId) {
      return;
    }

    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: this.#rpcId,
      disable_user_content_logging: true,
      do_conversation_client_event: {
        user_feedback: {
          sentiment: rating,
        },
      },
    });
  }

  async #applyPatch(changeSummary: string): Promise<{
    response: AiAssistanceModel.ResponseData | undefined,
    processedFiles: string[],
  }> {
    if (!this.#project) {
      throw new Error('Project does not exist');
    }
    this.#applyPatchAbortController = new AbortController();
    const agent = new AiAssistanceModel.PatchAgent({
      aidaClient: this.#aidaClient,
      serverSideLoggingEnabled: false,
      project: this.#project,
    });
    const {responses, processedFiles} =
        await agent.applyChanges(changeSummary, {signal: this.#applyPatchAbortController.signal});
    return {
      response: responses.at(-1),
      processedFiles,
    };
  }
}

export function isAiAssistancePatchingEnabled(): boolean {
  return Boolean(Root.Runtime.hostConfig.devToolsFreestyler?.patching);
}

interface ExpectedChange {
  path: string;
  matches: string[];
  doesNotMatch?: string[];
}

// @ts-expect-error temporary global function for local testing.
window.aiAssistanceTestPatchPrompt =
    async (projectName: string, changeSummary: string, expectedChanges: ExpectedChange[]) => {
  if (!isAiAssistancePatchingEnabled()) {
    return;
  }
  const workspaceDiff = WorkspaceDiff.WorkspaceDiff.workspaceDiff();
  const workspace = Workspace.Workspace.WorkspaceImpl.instance();
  const project = workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem)
                      .filter(
                          project => project instanceof Persistence.FileSystemWorkspaceBinding.FileSystem &&
                              project.fileSystem().type() ===
                                  Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT)
                      .find(project => project.displayName() === projectName);

  if (!project) {
    throw new Error('project not found');
  }
  const aidaClient = new Host.AidaClient.AidaClient();
  const agent = new AiAssistanceModel.PatchAgent({
    aidaClient,
    serverSideLoggingEnabled: false,
    project,
  });
  try {
    const assertionFailures = [];
    const {processedFiles, responses} = await agent.applyChanges(changeSummary);
    if (responses.at(-1)?.type === AiAssistanceModel.ResponseType.ERROR) {
      return {
        error: 'failed to patch',
        debugInfo: {
          responses,
          processedFiles,
        },
      };
    }
    for (const file of processedFiles) {
      const change = expectedChanges.find(change => change.path === file);
      if (!change) {
        assertionFailures.push(`Patched ${file} that was not expected`);
        break;
      }
      const agentProject = agent.agentProject;
      const content = await agentProject.readFile(file);
      if (!content) {
        throw new Error(`${file} has no content`);
      }
      for (const m of change.matches) {
        if (!content.match(new RegExp(m, 'gm'))) {
          assertionFailures.push({
            message: `Did not match ${m} in ${file}`,
            file,
            content,
          });
        }
      }
      for (const m of change.doesNotMatch || []) {
        if (content.match(new RegExp(m, 'gm'))) {
          assertionFailures.push({
            message: `Unexpectedly matched ${m} in ${file}`,
            file,
            content,
          });
        }
      }
    }
    return {
      assertionFailures,
      debugInfo: {
        responses,
        processedFiles,
      },
    };
  } finally {
    workspaceDiff.modifiedUISourceCodes().forEach(modifiedUISourceCode => {
      modifiedUISourceCode.resetWorkingCopy();
    });
  }
};
