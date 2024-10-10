// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import type * as Extensions from '../extensions/extensions.js';
import type * as Models from '../models/models.js';
import {PlayRecordingSpeed} from '../models/RecordingPlayer.js';
import * as Actions from '../recorder-actions/recorder-actions.js';

import {
  type SelectButtonClickEvent,
  type SelectButtonItem,
  type SelectMenuSelectedEvent,
  Variant as SelectButtonVariant,
} from './SelectButton.js';

const {html} = LitHtml;

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
};

const items: SelectButtonItem[] = [
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
  readonly #boundRender = this.#render.bind(this);
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
        this.#boundRender,
    );
  }

  connectedCallback(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(
        this,
        this.#boundRender,
    );
  }

  #handleSelectMenuSelected(event: SelectMenuSelectedEvent): void {
    const speed = event.value as PlayRecordingSpeed;
    if (this.#settings && event.value) {
      this.#settings.speed = speed;
      this.#settings.replayExtension = '';
    }

    Host.userMetrics.recordingReplaySpeed(replaySpeedToMetricSpeedMap[speed]);
    void ComponentHelpers.ScheduledRender.scheduleRender(
        this,
        this.#boundRender,
    );
  }

  #handleSelectButtonClick(event: SelectButtonClickEvent): void {
    event.stopPropagation();

    if (event.value && event.value.startsWith(REPLAY_EXTENSION_PREFIX)) {
      if (this.#settings) {
        this.#settings.replayExtension = event.value;
      }
      const extensionIdx = Number(
          event.value.substring(REPLAY_EXTENSION_PREFIX.length),
      );
      this.dispatchEvent(
          new StartReplayEvent(
              PlayRecordingSpeed.NORMAL,
              this.#replayExtensions[extensionIdx],
              ),
      );
      void ComponentHelpers.ScheduledRender.scheduleRender(
          this,
          this.#boundRender,
      );
      return;
    }

    this.dispatchEvent(new StartReplayEvent(this.#settings ? this.#settings.speed : PlayRecordingSpeed.NORMAL));
    void ComponentHelpers.ScheduledRender.scheduleRender(
        this,
        this.#boundRender,
    );
  }

  #render(): void {
    const groups = [{name: i18nString(UIStrings.speedGroup), items}];

    if (this.#replayExtensions.length) {
      groups.push({
        name: i18nString(UIStrings.extensionGroup),
        items: this.#replayExtensions.map((extension, idx) => {
          return {
            value: REPLAY_EXTENSION_PREFIX + idx,
            buttonIconName: 'play',
            buttonLabel: () => extension.getName(),
            label: () => extension.getName(),
          };
        }),
      });
    }

    // clang-format off
    LitHtml.render(
      html`
    <devtools-select-button
      @selectmenuselected=${this.#handleSelectMenuSelected}
      @selectbuttonclick=${this.#handleSelectButtonClick}
      .variant=${SelectButtonVariant.PRIMARY}
      .showItemDivider=${false}
      .disabled=${this.#props.disabled}
      .action=${Actions.RecorderActions.REPLAY_RECORDING}
      .value=${this.#settings?.replayExtension || this.#settings?.speed || ''}
      .buttonLabel=${i18nString(UIStrings.Replay)}
      .groups=${groups}
      jslog=${VisualLogging.action(Actions.RecorderActions.REPLAY_RECORDING).track({click: true})}>
    </devtools-select-button>`,
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
