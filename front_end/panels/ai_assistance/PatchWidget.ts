// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../ui/legacy/legacy.js';
import '../../ui/components/markdown_view/markdown_view.js';
import '../../ui/components/spinners/spinners.js';
import '../../ui/components/tooltips/tooltips.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as WorkspaceDiff from '../../models/workspace_diff/workspace_diff.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ChangesPanel from '../changes/changes.js';
import * as PanelCommon from '../common/common.js';

import {SelectWorkspaceDialog} from './SelectWorkspaceDialog.js';

const {classMap} = Directives;

/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
  /**
   *@description Text displayed for showing patch widget view.
   */
  unsavedChanges: 'Unsaved changes',
  /**
   *@description Loading text displayed as a summary title when the patch suggestion is getting loaded
   */
  applyingToWorkspace: 'Applying to workspace…',
  /**
   *@description Button text for staging changes to workspace.
   */
  applyToWorkspace: 'Apply to workspace',
  /**
   *@description Button text to change the selected workspace
   */
  change: 'Change',
  /**
   *@description Button text to cancel applying to workspace
   */
  cancel: 'Cancel',
  /**
   *@description Button text to discard the suggested changes and not save them to file system
   */
  discard: 'Discard',
  /**
   *@description Button text to save all the suggested changes to file system
   */
  saveAll: 'Save all',
  /**
   *@description Header text after the user saved the changes to the disk.
   */
  savedToDisk: 'Saved to disk',
  /**
   *@description Disclaimer text shown for using code snippets with caution
   */
  codeDisclaimer: 'Use code snippets with caution',
  /**
   *@description Tooltip text for the info icon beside the "Apply to workspace" button
   */
  applyToWorkspaceTooltip: 'Source code from the selected folder is sent to Google to generate code suggestions.',
  /**
   *@description Tooltip text for the info icon beside the "Apply to workspace" button when enterprise logging is off
   */
  applyToWorkspaceTooltipNoLogging:
      'Source code from the selected folder is sent to Google to generate code suggestions. This data will not be used to improve Google’s AI models.',
  /**
   *@description The footer disclaimer that links to more information
   * about the AI feature. Same text as in ChatView.
   */
  learnMore: 'Learn about AI in DevTools',
  /**
   *@description Header text for the AI-powered code suggestions disclaimer dialog.
   */
  freDisclaimerHeader: 'Get AI-powered code suggestions for your workspace',
  /**
   *@description First disclaimer item text for the fre dialog.
   */
  freDisclaimerTextAiWontAlwaysGetItRight: 'This feature uses AI and won’t always get it right',
  /**
   *@description Second disclaimer item text for the fre dialog.
   */
  freDisclaimerTextPrivacy: 'Source code from the selected folder is sent to Google to generate code suggestions',
  /**
   *@description Second disclaimer item text for the fre dialog when enterprise logging is off.
   */
  freDisclaimerTextPrivacyNoLogging:
      'Source code from the selected folder is sent to Google to generate code suggestions. This data will not be used to improve Google’s AI models.',
  /**
   *@description Third disclaimer item text for the fre dialog.
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

export interface ViewInput {
  workspaceDiff: WorkspaceDiff.WorkspaceDiff.WorkspaceDiffImpl;
  patchSuggestionState: PatchSuggestionState;
  changeSummary?: string;
  sources?: string;
  projectName?: string;
  savedToDisk?: boolean;
  projectPath: Platform.DevToolsPath.RawPathString;
  applyToWorkspaceTooltipText: Platform.UIString.LocalizedString;
  onLearnMoreTooltipClick: () => void;
  onApplyToWorkspace: () => void;
  onCancel: () => void;
  onDiscard: () => void;
  onSaveAll: () => void;
  onChangeWorkspaceClick: () => void;
}

export interface ViewOutput {
  tooltipRef?: Directives.Ref<HTMLElement>;
  changeRef?: Directives.Ref<HTMLElement>;
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

  constructor(element?: HTMLElement, view?: View, opts?: {
    aidaClient: Host.AidaClient.AidaClient,
  }) {
    super(false, false, element);
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

      function renderSourcesLink(): LitTemplate {
        if (!input.sources) {
          return nothing;
        }

        return html`<x-link
          class="link"
          title="${UIStringsNotTranslate.viewUploadedFiles} ${UIStringsNotTranslate.opensInNewTab}"
          href="data:text/plain,${encodeURIComponent(input.sources)}"
          jslog=${VisualLogging.link('files-used-in-patching').track({click: true})}>
          ${UIStringsNotTranslate.viewUploadedFiles}
        </x-link>`;
      }

      function renderHeader(): LitTemplate {
        if (input.savedToDisk) {
          return html`
            <devtools-icon class="green-bright-icon summary-badge" .name=${'check-circle'}></devtools-icon>
            <span class="header-text">
              ${lockedString(UIStringsNotTranslate.savedToDisk)}
            </span>
          `;
        }

        if (input.patchSuggestionState === PatchSuggestionState.SUCCESS) {
          return html`
            <devtools-icon class="on-tonal-icon summary-badge" .name=${'difference'}></devtools-icon>
            <span class="header-text">
              ${lockedString(`File changes in ${input.projectName}`)}
            </span>
            <devtools-icon
              class="arrow"
              .name=${'chevron-down'}
            ></devtools-icon>
          `;
        }

        return html`
          <devtools-icon class="on-tonal-icon summary-badge" .name=${'pen-spark'}></devtools-icon>
          <span class="header-text">
            ${lockedString(UIStringsNotTranslate.unsavedChanges)}
          </span>
          <devtools-icon
            class="arrow"
            .name=${'chevron-down'}
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
              <devtools-icon .name=${'cross-circle-filled'}></devtools-icon>${
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

        return html`
        <div class="footer">
          ${input.projectName ? html`
            <div class="change-workspace">
              <div class="selected-folder">
                <devtools-icon .name=${'folder'}></devtools-icon> <span class="folder-name" title=${input.projectPath}>${input.projectName}</span>
              </div>
              <devtools-button
                @click=${input.onChangeWorkspaceClick}
                .jslogContext=${'change-workspace'}
                .variant=${Buttons.Button.Variant.TEXT}
                ${Directives.ref(output.changeRef)}
              >${lockedString(UIStringsNotTranslate.change)}</devtools-button>
            </div>
          ` : nothing}
          <div class="apply-to-workspace-container">
            ${input.patchSuggestionState === PatchSuggestionState.LOADING ? html`
              <div class="loading-text-container">
                <devtools-spinner></devtools-spinner>
                <span>
                  ${lockedString(UIStringsNotTranslate.applyingToWorkspace)}
                </span>
              </div>
            ` : html`
              <devtools-button
                @click=${input.onApplyToWorkspace}
                .jslogContext=${'stage-to-workspace'}
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
              .iconName=${'info'}
              .variant=${Buttons.Button.Variant.ICON}
              .title=${input.applyToWorkspaceTooltipText}
            ></devtools-button>
            <devtools-tooltip variant="rich" id="info-tooltip" ${Directives.ref(output.tooltipRef)}>
              <div class="info-tooltip-container">
                ${input.applyToWorkspaceTooltipText}
                <button
                  class="link tooltip-link"
                  role="link"
                  jslog=${VisualLogging.link('open-ai-settings').track({
                    click: true,
                  })}
                  @click=${input.onLearnMoreTooltipClick}
                >${lockedString(UIStringsNotTranslate.learnMore)}</button>
              </div>
            </devtools-tooltip>
          </div>
        </div>`;
      }

      render(
        html`
          <details class=${classMap({
            'change-summary': true,
            'saved-to-disk': Boolean(input.savedToDisk)
          })}>
            <summary>
              ${renderHeader()}
            </summary>
            ${renderContent()}
            ${renderFooter()}
          </details>
        `,
        target,
        {host: target}
      );
    });
    // clang-format on
    this.requestUpdate();
  }

  #onLearnMoreTooltipClick(): void {
    this.#viewOutput.tooltipRef?.value?.hidePopover();
    void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
  }

  override performUpdate(): void {
    const projectName = this.#project ? Common.ParsedURL.ParsedURL.encodedPathToRawPathString(
                                            this.#project.displayName() as Platform.DevToolsPath.EncodedPathString) :
                                        undefined;
    const projectPath = this.#project ?
        Common.ParsedURL.ParsedURL.urlToRawPathString(
            this.#project.id() as Platform.DevToolsPath.UrlString, Host.Platform.isWin()) :
        Platform.DevToolsPath.EmptyRawPathString;
    this.#view(
        {
          workspaceDiff: this.#workspaceDiff,
          changeSummary: this.changeSummary,
          patchSuggestionState: this.#patchSuggestionState,
          sources: this.#patchSources,
          projectName,
          projectPath,
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
          onChangeWorkspaceClick: this.#showSelectWorkspaceDialog.bind(this, {applyPatch: false}),
        },
        this.#viewOutput, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    this.#selectDefaultProject();

    if (isAiAssistancePatchingEnabled()) {
      this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#onProjectRemoved, this);

      // @ts-expect-error temporary global function for local testing.
      window.aiAssistanceTestPatchPrompt = async (changeSummary: string) => {
        return await this.#applyPatch(changeSummary);
      };
    }
  }

  override willHide(): void {
    if (isAiAssistancePatchingEnabled()) {
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
            class="link"
            jslog=${VisualLogging.link('code-snippets-explainer.patch-widget').track({
              click: true
            })}
          >${lockedString(UIStringsNotTranslate.freDisclaimerTextUseWithCaution)}</x-link>`,
          // clang-format on
        }
      ],
      onLearnMoreClick: () => {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
      }
    });

    if (result) {
      this.#aiPatchingFreCompletedSetting.set(true);
    }
    return result;
  }

  #selectDefaultProject(): void {
    const project = this.#workspace.project(this.#projectIdSetting.get());
    if (project) {
      this.#project = project;
    } else {
      this.#project = undefined;
      this.#projectIdSetting.set('');
    }
    this.requestUpdate();
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
    } else {
      this.#showSelectWorkspaceDialog({applyPatch: true});
    }
  }

  async #applyPatchAndUpdateUI(): Promise<void> {
    const changeSummary = this.changeSummary;
    if (!changeSummary) {
      throw new Error('Change summary does not exist');
    }

    this.#patchSuggestionState = PatchSuggestionState.LOADING;
    this.requestUpdate();
    const {response, processedFiles} = await this.#applyPatch(changeSummary);
    if (response?.type === AiAssistanceModel.ResponseType.ANSWER) {
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
  }

  #onDiscard(): void {
    this.#workspaceDiff.modifiedUISourceCodes().forEach(modifiedUISourceCode => {
      modifiedUISourceCode.resetWorkingCopy();
    });

    this.#patchSuggestionState = PatchSuggestionState.INITIAL;
    this.#patchSources = undefined;
    void this.changeManager?.popStashedChanges();
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.#viewOutput.changeRef?.value?.focus();
    });
  }

  #onSaveAll(): void {
    this.#workspaceDiff.modifiedUISourceCodes().forEach(modifiedUISourceCode => {
      if (!modifiedUISourceCode.url().startsWith('inspector://')) {
        modifiedUISourceCode.commitWorkingCopy();
      }
    });
    void this.changeManager?.stashChanges().then(() => {
      this.changeManager?.dropStashedChanges();
    });

    this.#savedToDisk = true;
    this.requestUpdate();
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
