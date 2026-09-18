// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/components/data_grid/data_grid.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as NetworkForward from '../network/forward/forward.js';

import backendLinkingSettingsTabStyles from './backendLinkingSettingsTab.css.js';

const {ifDefined} = Directives;

const UIStrings = {
  /**
   * @description Title for the backend linking settings tab card in DevTools Settings.
   */
  rulesSectionHeading: 'Backend linking rules',
  /**
   * @description Title for the backend linking settings tab card in DevTools Settings.
   */
  placeholderDocHeading: 'Available placeholders',
  /**
   * @description Description explaining what backend linking rules do.
   */
  description:
      'Configure links to external backend debugging, APM, or tracing tools for matching network requests. Use placeholders to insert correlation IDs extracted from request and response headers.',
  /**
   * @description Header column title in the backend linking rules table for the URL pattern.
   */
  urlPatternColumn: 'URL pattern',
  /**
   * @description Header column title in the backend linking rules table for the target URL template.
   */
  targetUrlTemplateColumn: 'Target URL template',
  /**
   * @description Header column title in the backend linking rules table for the label.
   */
  labelColumn: 'Label',
  /**
   * @description Header column title in the placeholder reference table.
   */
  placeholderColumn: 'Placeholder',
  /**
   * @description Header source column title in the placeholder reference table.
   */
  headerColumn: 'Referenced header / property',
  /**
   * @description Description of the devtoolsDebugId placeholder. The placeholder values will always be `desc`, `devtools-debug-id`, and `Server-Timing`.
   */
  devtoolsDebugIdDescription: 'Value of the `desc` parameter in the `devtools-debug-id` `Server-Timing` entry',
  /**
   * @description Description of the requestId placeholder. The placeholder value will always be `X-Request-ID`.
   */
  requestIdDescription: 'Value of the `X-Request-ID` response header',
  /**
   * @description Description of the correlationId placeholder. The placeholder values will always be `X-Correlation-ID` and `Correlation-ID`.
   */
  correlationIdDescription: 'Value of the `X-Correlation-ID` or `Correlation-ID` response header',
  /**
   * @description Description of the traceId placeholder. The placeholder values will always be `trace-id`, `Server-Timing`, and `traceparent`.
   */
  traceIdDescription: '16-byte hex trace ID from the `trace-id` response header or `Server-Timing` `traceparent` entry',
  /**
   * @description Description of the spanId placeholder. The placeholder values will always be `Server-Timing` and `traceparent`.
   */
  spanIdDescription: '8-byte hex parent span ID from the `Server-Timing` `traceparent` entry',
  /**
   * @description Error message in the backend linking settings tab when the URL pattern is empty.
   */
  urlPatternCannotBeEmpty: 'URL pattern can’t be empty',
  /**
   * @description Error message in the backend linking settings tab when the URL pattern is invalid.
   */
  invalidUrlPattern: 'URL pattern must be a valid URL pattern',
  /**
   * @description Error message in the backend linking settings tab when the target URL template is empty.
   */
  targetUrlTemplateCannotBeEmpty: 'Target URL template can’t be empty',
  /**
   * @description Error message in the backend linking settings tab when the target URL template does not contain a
   * placeholder.
   */
  templateRequiresPlaceholder: 'Target URL template must contain at least one placeholder',
  /**
   * @description Error message in the backend linking settings tab when the label is empty.
   */
  labelCannotBeEmpty: 'Label can’t be empty',
  /**
   * @description Warning message displayed below the backend linking rules table when one or more rules are invalid.
   */
  invalidRulesWarning: 'Invalid rules will not be applied or saved',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/settings/BackendLinkingSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function validPattern(urlPattern: string): boolean {
  try {
    new URLPattern(urlPattern);
    return true;
  } catch {
    return false;
  }
}

function hasPlaceholder(targetUrlTemplate: string): boolean {
  return NetworkForward.BackendLinking.BACKEND_LINKING_PLACEHOLDERS.some(placeholder =>
                                                                             targetUrlTemplate.includes(placeholder));
}

function isRuleValid(rule: NetworkForward.BackendLinking.BackendLinkingRule): boolean {
  return Boolean(rule.urlPattern) && validPattern(rule.urlPattern) && Boolean(rule.targetUrlTemplate) &&
      hasPlaceholder(rule.targetUrlTemplate) && Boolean(rule.label);
}

export interface ViewInput {
  rules: NetworkForward.BackendLinking.BackendLinkingRule[];
  onAddRule: (rule: NetworkForward.BackendLinking.BackendLinkingRule) => void;
  onUpdateRule: (oldRule: NetworkForward.BackendLinking.BackendLinkingRule,
                 newRule: NetworkForward.BackendLinking.BackendLinkingRule) => void;
  onDeleteRule: (rule: NetworkForward.BackendLinking.BackendLinkingRule) => void;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const onCreate = (event: CustomEvent<{urlPattern?: string, targetUrlTemplate?: string, label?: string}>): void => {
    const data = event.detail;
    const urlPattern = data.urlPattern?.trim();
    const targetUrlTemplate = data.targetUrlTemplate?.trim();
    const label = data.label?.trim();
    if (!urlPattern && !targetUrlTemplate && !label) {
      return;
    }
    input.onAddRule({
      urlPattern: urlPattern ?? '',
      targetUrlTemplate: targetUrlTemplate ?? '',
      label: label ?? '',
    });
  };

  const onEdit = (rule: NetworkForward.BackendLinking.BackendLinkingRule,
                  event: CustomEvent<{columnId: string, valueBeforeEditing: string, newText: string}>): void => {
    const {columnId, newText} = event.detail;
    const newRule = {...rule};
    if (columnId === 'urlPattern') {
      newRule.urlPattern = newText.trim();
    } else if (columnId === 'targetUrlTemplate') {
      newRule.targetUrlTemplate = newText.trim();
    } else if (columnId === 'label') {
      newRule.label = newText.trim();
    }
    input.onUpdateRule(rule, newRule);
  };

  // clang-format off
  render(html`
     <style>${backendLinkingSettingsTabStyles}</style>
      <style>${UI.inspectorCommonStyles}</style>
      <div class="settings-card-container-wrapper" jslog=${VisualLogging.pane('backend-linking')}>
        <div class="settings-card-container">
          <devtools-card heading=${i18nString(UIStrings.rulesSectionHeading)}>
            <p class="description-text">${i18nString(UIStrings.description)}</p>
            <devtools-data-grid
              name=${i18nString(UIStrings.rulesSectionHeading)}
              striped
              inline
              @delete=${() => {}}
              @create=${onCreate}>
              <table>
                <style>${backendLinkingSettingsTabStyles}</style>
                <thead>
                  <tr>
                    <th id="urlPattern" editable>${i18nString(UIStrings.urlPatternColumn)}</th>
                    <th id="targetUrlTemplate" editable>${i18nString(UIStrings.targetUrlTemplateColumn)}</th>
                    <th id="label" editable>${i18nString(UIStrings.labelColumn)}</th>
                  </tr>
                </thead>
                <tbody>
                  ${input.rules.map(rule => {
           return html`
                    <tr @edit=${
               (event: CustomEvent<{columnId: string, valueBeforeEditing: string, newText: string}>) =>
                   onEdit(rule, event)}
                        @delete=${() => input.onDeleteRule(rule)}>
                      <td title=${ifDefined(
                          !rule.urlPattern ? i18nString(UIStrings.urlPatternCannotBeEmpty) :
                          !validPattern(rule.urlPattern) ? i18nString(UIStrings.invalidUrlPattern) :
                          undefined)}>
                        <devtools-icon name="warning-filled" class="small warning-icon"
                          ?hidden=${Boolean(rule.urlPattern) && validPattern(rule.urlPattern)}></devtools-icon>
                        ${rule.urlPattern}
                      </td>
                      <td title=${ifDefined(
                          !rule.targetUrlTemplate ? i18nString(UIStrings.targetUrlTemplateCannotBeEmpty) :
                          !hasPlaceholder(rule.targetUrlTemplate) ? i18nString(UIStrings.templateRequiresPlaceholder) :
                          undefined)}>
                        <devtools-icon name="warning-filled" class="small warning-icon"
                          ?hidden=${Boolean(rule.targetUrlTemplate) && hasPlaceholder(rule.targetUrlTemplate)}></devtools-icon>
                        ${rule.targetUrlTemplate}
                      </td>
                      <td title=${ifDefined(!rule.label ? i18nString(UIStrings.labelCannotBeEmpty) : undefined)}>
                        <devtools-icon name="warning-filled" class="small warning-icon"
                          ?hidden=${Boolean(rule.label)}></devtools-icon>
                        ${rule.label}
                      </td>
                    </tr>
                  `;
         })}
                  <tr placeholder></tr>
                </tbody>
              </table>
            </devtools-data-grid>
            ${input.rules.some(rule => !isRuleValid(rule)) ? html`
              <div class="warning-footer">
                <devtools-icon name="warning-filled" class="small"></devtools-icon>
                <span>${i18nString(UIStrings.invalidRulesWarning)}</span>
              </div>
            ` : nothing}
          </devtools-card>
          <devtools-card heading=${i18nString(UIStrings.placeholderDocHeading)}>
            <dl class="intro-section">
              <div class="column-header">${i18nString(UIStrings.placeholderColumn)}</div>
              <div class="column-header">${i18nString(UIStrings.headerColumn)}</div>
              <dt class="placeholder">${'${devtoolsDebugId}'}</dt>
              <dd class="source-header">Server-Timing: devtools-debug-id</dd>
              <dd class="placeholder-description">${i18nString(UIStrings.devtoolsDebugIdDescription)}</dd>
              <dt class="placeholder">${'${requestId}'}</dt>
              <dd class="source-header">X-Request-ID</dd>
              <dd class="placeholder-description">${i18nString(UIStrings.requestIdDescription)}</dd>
              <dt class="placeholder">${'${correlationId}'}</dt>
              <dd class="source-header">X-Correlation-ID / Correlation-ID</dd>
              <dd class="placeholder-description">${i18nString(UIStrings.correlationIdDescription)}</dd>
              <dt class="placeholder">${'${traceId}'}</dt>
              <dd class="source-header">trace-id / Server-Timing: traceparent</dd>
              <dd class="placeholder-description">${i18nString(UIStrings.traceIdDescription)}</dd>
              <dt class="placeholder">${'${spanId}'}</dt>
              <dd class="source-header">Server-Timing: traceparent</dd>
              <dd class="placeholder-description">${i18nString(UIStrings.spanIdDescription)}</dd>
            </dl>
          </devtools-card>
        </div>
      </div>`,
         // clang-format on
         target);
};

export class BackendLinkingSettingsTab extends UI.Widget.VBox {
  readonly #view: View;
  readonly #rulesSetting: Common.Settings.Setting<NetworkForward.BackendLinking.BackendLinkingRule[]>;

  constructor(target?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(target);
    this.#view = view;
    const res = Common.Settings.Settings.instance().maybeResolve(
        NetworkForward.BackendLinking.backendLinkingRulesSettingDescriptor);
    if (!('setting' in res)) {
      throw new Error('Backend linking setting is not available');
    }
    this.#rulesSetting = res.setting;
  }

  override wasShown(): void {
    super.wasShown();
    this.#rulesSetting.addChangeListener(this.requestUpdate, this);
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    this.#rulesSetting.removeChangeListener(this.requestUpdate, this);
  }

  override performUpdate(): void {
    const input: ViewInput = {
      rules: this.#rulesSetting.get(),
      onAddRule: rule => {
        if (!isRuleValid(rule)) {
          return;
        }
        this.#rulesSetting.set([...this.#rulesSetting.get(), rule]);
      },
      onUpdateRule: (oldRule, newRule) => {
        if (!isRuleValid(newRule)) {
          return;
        }
        const rules = [...this.#rulesSetting.get()];
        const index = rules.indexOf(oldRule);
        if (index !== -1) {
          rules[index] = newRule;
          this.#rulesSetting.set(rules);
        }
      },
      onDeleteRule: rule => {
        const rules = [...this.#rulesSetting.get()];
        const index = rules.indexOf(rule);
        if (index !== -1) {
          rules.splice(index, 1);
          this.#rulesSetting.set(rules);
        }
      },
    };
    this.#view(input, {}, this.contentElement);
  }
}
