// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/markdown_view/markdown_view.js';
import '../../../ui/kit/kit.js';

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import type {Step} from './ChatMessage.js';
import {renderRelevantDataDisclaimer} from './RelevantDataDisclaimer.js';

const {html, Directives: {ref}} = Lit;
const lockedString = i18n.i18n.lockedString;

const RELEVANT_DATA_TOOLTIP_ID = 'relevant-data-link-permission-prompt';

const UIStringsNotTranslate = {
  /**
   * @description Button text in the permission prompt that skips the tool call.
   */
  skipToolCall: 'No',
  /**
   * @description Button text in the permission prompt that allows the tool call once.
   */
  allowThisTime: 'Yes, allow this time',
  /**
   * @description Button text in the permission prompt that allows the tool call now and in the future.
   */
  allowAlways: 'Yes, and always allow',
  /**
   * @description Fallback title of the permission prompt when the tool has no title.
   */
  allowThisAction: 'Allow this action?',
  /**
   * @description First part of the second sentence of the permission prompt disclaimer. Followed by a link with the text "settings".
   */
  changePermissionsIn: 'Change permissions in ',
  /**
   * @description Link text in the permission prompt disclaimer. Opens the list of allowed tools in the AI settings.
   */
  settings: 'settings',
  /**
   * @description Last part of the second sentence of the permission prompt disclaimer. Preceded by a link with the text "settings".
   */
  atAnyTime: ' at any time',
  /**
   * @description Heading text for the code block that shows the code to be executed after the user allows it.
   */
  codeToExecute: 'Code to execute',
} as const;

function openAllowedToolsSettings(): void {
  void Common.Revealer.reveal(Common.Settings.Settings.instance().resolve(
      AiAssistanceModel.AlwaysAllowedTools.alwaysAllowedToolsSettingDescriptor));
}

function renderChangePermissionsInSettings(): Lit.LitTemplate {
  // clang-format off
  return html`${lockedString(UIStringsNotTranslate.changePermissionsIn)}<button
      class="link"
      role="link"
      jslog=${VisualLogging.link('ai-open-allowed-tools-settings').track({click: true})}
      @click=${openAllowedToolsSettings}
    >${lockedString(UIStringsNotTranslate.settings)}</button>${lockedString(UIStringsNotTranslate.atAnyTime)}`;
  // clang-format on
}

/**
 * Moves focus to the "No" button when the prompt first appears. Must stay at
 * module level: Lit only invokes a ref callback when its identity changes, so
 * a stable function runs once per element instead of on every re-render.
 */
function focusOnFirstRender(element: Element|undefined): void {
  // Lit calls this before the element is in the DOM, so delay focus().
  queueMicrotask(() => (element as HTMLElement | undefined)?.focus());
}

/**
 * Renders the permission prompt for a step that needs approval.
 *
 * Used only with the natural language interface
 * (`AiUtils.isNaturalLanguageInterfaceEnabled()`), where `ChatView` renders
 * it in place of the chat input. Without the flag, `ChatMessage` renders the
 * legacy Cancel / Continue buttons from `renderSideEffectConfirmationUi` inside
 * the step.
 *
 * A separate UI is needed because the natural language interface significantly
 * changes the permission prompt.
 *
 * TODO(b/516828269): Remove `renderSideEffectConfirmationUi` once the natural
 * language interface launches.
 */
export function renderPermissionPrompt(step: Step, disclaimerText: string): Lit.LitTemplate {
  if (step.state.type !== 'needs_approval') {
    return Lit.nothing;
  }
  const dialog = step.state.sideEffectDialog;
  const title = dialog.permissionTitle ?? lockedString(UIStringsNotTranslate.allowThisAction);

  const description =
      dialog.description ? html`<p class="permission-prompt-description">${dialog.description}</p>` : Lit.nothing;

  const code = step.javascriptCode ? html`<devtools-code-block
      class="permission-prompt-code"
      .code=${step.javascriptCode.trim()}
      .codeLang=${'js'}
      .displayNotice=${true}
      .header=${lockedString(UIStringsNotTranslate.codeToExecute)}
    ></devtools-code-block>` :
                                     Lit.nothing;

  const allowAlwaysButton = dialog.permissionPrompt === AiAssistanceModel.Tool.PermissionPrompt.ALLOW_ONCE_OR_ALWAYS ?
      html`<devtools-button
      .data=${{
        variant: Buttons.Button.Variant.OUTLINED,
        jslogContext: 'always-allow-execute-code',
      } as Buttons.Button.ButtonData}
      @click=${() => dialog.onAnswer(AiAssistanceModel.Tool.PermissionDecision.ALLOW_ALWAYS)}
    >${lockedString(UIStringsNotTranslate.allowAlways)}</devtools-button>` :
      Lit.nothing;

  // clang-format off
  return html`
  <div class="permission-prompt"
    jslog=${VisualLogging.section('side-effect-confirmation')}>
    <div class="permission-prompt-header">
      <devtools-icon name="lock"></devtools-icon>
      <h2 class="permission-prompt-title">${title}</h2>
    </div>
    ${description}
    ${code}
    <div class="permission-prompt-buttons">
      <devtools-button
        .data=${{
          variant: Buttons.Button.Variant.TEXT,
          jslogContext: 'decline-execute-code',
        } as Buttons.Button.ButtonData}
        @click=${() => dialog.onAnswer(AiAssistanceModel.Tool.PermissionDecision.REJECT)}
        ${ref(focusOnFirstRender)}
      >${lockedString(UIStringsNotTranslate.skipToolCall)}</devtools-button>
      ${allowAlwaysButton}
      <devtools-button
        .data=${{
          variant: Buttons.Button.Variant.PRIMARY,
          jslogContext: 'accept-execute-code',
        } as Buttons.Button.ButtonData}
        @click=${() => dialog.onAnswer(AiAssistanceModel.Tool.PermissionDecision.ALLOW_ONCE)}
      >${lockedString(UIStringsNotTranslate.allowThisTime)}</devtools-button>
    </div>
    <div class="permission-prompt-footer">
      ${renderRelevantDataDisclaimer(RELEVANT_DATA_TOOLTIP_ID, disclaimerText)}.
      ${renderChangePermissionsInSettings()}.
    </div>
  </div>`;
  // clang-format on
}
