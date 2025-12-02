// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import type * as Extensions from '../extensions/extensions.js';
import * as Models from '../models/models.js';
import {PlayRecordingSpeed} from '../models/RecordingPlayer.js';
import * as Actions from '../recorder-actions/recorder-actions.js';

import replaySectionStyles from './replaySection.css.js';

const {html, Directives: {ifDefined, repeat}} = Lit;

const UIStrings = {
  /**
   * @description Replay button label
   */
  Replay: 'Replay',
  /**
   * @description Button label for the normal speed replay option
   */
  ReplayNormalButtonLabel: 'Normal speed',
  /**
   * @description Item label for the normal speed replay option
   */
  ReplayNormalItemLabel: 'Normal (Default)',
  /**
   * @description Button label for the slow speed replay option
   */
  ReplaySlowButtonLabel: 'Slow speed',
  /**
   * @description Item label for the slow speed replay option
   */
  ReplaySlowItemLabel: 'Slow',
  /**
   * @description Button label for the very slow speed replay option
   */
  ReplayVerySlowButtonLabel: 'Very slow speed',
  /**
   * @description Item label for the very slow speed replay option
   */
  ReplayVerySlowItemLabel: 'Very slow',
  /**
   * @description Button label for the extremely slow speed replay option
   */
  ReplayExtremelySlowButtonLabel: 'Extremely slow speed',
  /**
   * @description Item label for the slow speed replay option
   */
  ReplayExtremelySlowItemLabel: 'Extremely slow',
  /**
   * @description Label for a group of items in the replay menu that indicate various replay speeds (e.g., Normal, Fast, Slow).
   */
  speedGroup: 'Speed',
  /**
   * @description Label for a group of items in the replay menu that indicate various extensions that can be used for replay.
   */
  extensionGroup: 'Extensions',
} as const;

const items = [
  {
    value: PlayRecordingSpeed.NORMAL,
    buttonIconName: 'play',
    buttonLabel: () => i18nString(UIStrings.ReplayNormalButtonLabel),
    label: () => i18nString(UIStrings.ReplayNormalItemLabel),
  },
  {
    value: PlayRecordingSpeed.SLOW,
    buttonIconName: 'play',
    buttonLabel: () => i18nString(UIStrings.ReplaySlowButtonLabel),
    label: () => i18nString(UIStrings.ReplaySlowItemLabel),
  },
  {
    value: PlayRecordingSpeed.VERY_SLOW,
    buttonIconName: 'play',
    buttonLabel: () => i18nString(UIStrings.ReplayVerySlowButtonLabel),
    label: () => i18nString(UIStrings.ReplayVerySlowItemLabel),
  },
  {
    value: PlayRecordingSpeed.EXTREMELY_SLOW,
    buttonIconName: 'play',
    buttonLabel: () => i18nString(UIStrings.ReplayExtremelySlowButtonLabel),
    label: () => i18nString(UIStrings.ReplayExtremelySlowItemLabel),
  },
];

const replaySpeedToMetricSpeedMap = {
  [PlayRecordingSpeed.NORMAL]: Host.UserMetrics.RecordingReplaySpeed.NORMAL,
  [PlayRecordingSpeed.SLOW]: Host.UserMetrics.RecordingReplaySpeed.SLOW,
  [PlayRecordingSpeed.VERY_SLOW]: Host.UserMetrics.RecordingReplaySpeed.VERY_SLOW,
  [PlayRecordingSpeed.EXTREMELY_SLOW]: Host.UserMetrics.RecordingReplaySpeed.EXTREMELY_SLOW,
} as const;

const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/components/ReplaySection.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class StartReplayEvent extends Event {
  static readonly eventName = 'startreplay';

  constructor(
      public speed: PlayRecordingSpeed,
      public extension?: Extensions.ExtensionManager.Extension,
  ) {
    super(StartReplayEvent.eventName, {bubbles: true, composed: true});
  }
}

export interface ReplaySectionProps {
  disabled: boolean;
}

export interface ReplaySectionData {
  settings: Models.RecorderSettings.RecorderSettings;
  replayExtensions: Extensions.ExtensionManager.Extension[];
}

const REPLAY_EXTENSION_PREFIX = 'extension';

export class ReplaySection extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #props: ReplaySectionProps = {disabled: false};
  #settings?: Models.RecorderSettings.RecorderSettings;
  #replayExtensions: Extensions.ExtensionManager.Extension[] = [];

  set data(data: ReplaySectionData) {
    this.#settings = data.settings;
    this.#replayExtensions = data.replayExtensions;
  }

  get disabled(): boolean {
    return this.#props.disabled;
  }

  set disabled(disabled: boolean) {
    this.#props.disabled = disabled;
    void ComponentHelpers.ScheduledRender.scheduleRender(
        this,
        this.#render,
    );
  }

  connectedCallback(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(
        this,
        this.#render,
    );
  }

  #handleClick(ev: Event, value?: string): void {
    ev.stopPropagation();
    if (value?.startsWith(REPLAY_EXTENSION_PREFIX)) {
      if (this.#settings) {
        this.#settings.replayExtension = value;
      }
      const extensionIdx = Number(
          value.substring(REPLAY_EXTENSION_PREFIX.length),
      );
      this.dispatchEvent(
          new StartReplayEvent(
              PlayRecordingSpeed.NORMAL,
              this.#replayExtensions[extensionIdx],
              ),
      );
      void ComponentHelpers.ScheduledRender.scheduleRender(
          this,
          this.#render,
      );
      return;
    }

    this.dispatchEvent(new StartReplayEvent(this.#settings ? this.#settings.speed : PlayRecordingSpeed.NORMAL));
    void ComponentHelpers.ScheduledRender.scheduleRender(
        this,
        this.#render,
    );
  }

  #handleSelectMenuSelect(
      event: Event,
      ): void {
    if (event.target instanceof HTMLSelectElement) {
      const speed = event.target.value as PlayRecordingSpeed;
      this.changeSpeed(speed);
    }
  }

  changeSpeed(speed: PlayRecordingSpeed): void {
    if (this.#settings && speed) {
      this.#settings.speed = speed;
      this.#settings.replayExtension = '';
    }

    if (replaySpeedToMetricSpeedMap[speed]) {
      Host.userMetrics.recordingReplaySpeed(replaySpeedToMetricSpeedMap[speed]);
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #getTitle(label: string): string {
    return Models.Tooltip.getTooltipForActions(label, Actions.RecorderActions.REPLAY_RECORDING);
  }

  #render(): void {
    const groups = [{name: i18nString(UIStrings.speedGroup), items}];

    if (this.#replayExtensions.length) {
      groups.push({
        name: i18nString(UIStrings.extensionGroup),
        items: this.#replayExtensions.map((extension, idx) => {
          return {
            value: (REPLAY_EXTENSION_PREFIX + idx) as PlayRecordingSpeed,
            buttonIconName: 'play',
            buttonLabel: () => extension.getName() as Platform.UIString.LocalizedString,
            label: () => extension.getName() as Platform.UIString.LocalizedString,
          };
        }),
      });
    }

    const value = this.#settings?.replayExtension || this.#settings?.speed || '';
    const selectedItem = items.find(item => item.value === value) || items[0];
    if (!selectedItem) {
      return;
    }

    const buttonVariant = Buttons.Button.Variant.PRIMARY;
    const menuLabel = selectedItem.buttonLabel ? selectedItem.buttonLabel() : selectedItem.label();

    // clang-format off
    Lit.render(
      html`
        <style>
          ${UI.inspectorCommonStyles}
        </style>
        <style>
          ${replaySectionStyles}
        </style>
        <div
          class="select-button"
          title=${ifDefined(this.#getTitle(menuLabel))}
        >
          <label>
            ${groups.length > 1
              ? html`
                  <div
                    class="groups-label"
                    >${groups
                      .map(group => {
                        return group.name;
                      })
                      .join(' & ')}</div>`
              : Lit.nothing}
            <select
              class="primary"
              ?disabled=${this.#props.disabled}
              jslog=${VisualLogging.dropDown('network-conditions').track({
                change: true,
              })}
              @change=${this.#handleSelectMenuSelect}
            >
              ${groups.length > 1
                ? repeat(groups, group => group.name, group =>
                    html`
                      <optgroup label=${group.name}>
                        ${repeat(group.items, item => item.value, item => {
                          const selected = item.value === selectedItem.value;
                          return html`
                            <option
                              .title=${item.label()}
                              value=${item.value}
                              ?selected=${selected}
                              jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(item.value)).track({click: true})}
                            >
                              ${(selected && item.buttonLabel) ? item.buttonLabel() : item.label()}
                            </option>
                          `;
                        })}
                      </optgroup>
                    `,
                  )
                : repeat(items, item => item.value, item => {
                    const selected = item.value === selectedItem.value;
                    return html`
                      <option
                        .title=${item.label()}
                        value=${item.value}
                        ?selected=${selected}
                        jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(item.value)).track({click: true})}
                      >
                        ${(selected && item.buttonLabel) ? item.buttonLabel() : item.label()}
                      </option>
                    `;
                  })}
            </select>
          </label>
          <devtools-button
            .disabled=${this.#props.disabled}
            .variant=${buttonVariant}
            .iconName=${selectedItem.buttonIconName}
            @click=${(ev: Event) => this.#handleClick(ev, value)}
            jslog=${VisualLogging.action(Actions.RecorderActions.REPLAY_RECORDING).track({click: true})}
          >
            ${i18nString(UIStrings.Replay)}
          </devtools-button>
        </div>`,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  }
}

customElements.define(
    'devtools-replay-section',
    ReplaySection,
);

declare global {
  interface HTMLElementEventMap {
    startreplay: StartReplayEvent;
  }

  interface HTMLElementTagNameMap {
    'devtools-replay-section': ReplaySection;
  }
}
