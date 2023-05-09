// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import type * as Models from '../models/models.js';
import {PlayRecordingSpeed} from '../models/RecordingPlayer.js';
import * as Actions from '../recorder-actions.js';  // eslint-disable-line rulesdir/es_modules_import
import type * as Extensions from '../extensions/extensions.js';

import {
  SelectButton,
  Variant as SelectButtonVariant,
  type SelectButtonItem,
  type SelectButtonClickEvent,
} from './SelectButton.js';

const UIStrings = {
  /**
   * @description Button label for the normal speed replay option
   */
  ReplayNormalButtonLabel: 'Replay',
  /**
   * @description Item label for the normal speed replay option
   */
  ReplayNormalItemLabel: 'Normal (Default)',
  /**
   * @description Button label for the slow speed replay option
   */
  ReplaySlowButtonLabel: 'Slow replay',
  /**
   * @description Item label for the slow speed replay option
   */
  ReplaySlowItemLabel: 'Slow',
  /**
   * @description Button label for the very slow speed replay option
   */
  ReplayVerySlowButtonLabel: 'Very slow replay',
  /**
   * @description Item label for the very slow speed replay option
   */
  ReplayVerySlowItemLabel: 'Very slow',
  /**
   * @description Button label for the extremely slow speed replay option
   */
  ReplayExtremelySlowButtonLabel: 'Extremely slow replay',
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
    value: PlayRecordingSpeed.Normal,
    buttonIconName: 'play',
    buttonLabel: (): string => i18nString(UIStrings.ReplayNormalButtonLabel),
    label: (): string => i18nString(UIStrings.ReplayNormalItemLabel),
  },
  {
    value: PlayRecordingSpeed.Slow,
    buttonIconName: 'play',
    buttonLabel: (): string => i18nString(UIStrings.ReplaySlowButtonLabel),
    label: (): string => i18nString(UIStrings.ReplaySlowItemLabel),
  },
  {
    value: PlayRecordingSpeed.VerySlow,
    buttonIconName: 'play',
    buttonLabel: (): string => i18nString(UIStrings.ReplayVerySlowButtonLabel),
    label: (): string => i18nString(UIStrings.ReplayVerySlowItemLabel),
  },
  {
    value: PlayRecordingSpeed.ExtremelySlow,
    buttonIconName: 'play',
    buttonLabel: (): string => i18nString(UIStrings.ReplayExtremelySlowButtonLabel),
    label: (): string => i18nString(UIStrings.ReplayExtremelySlowItemLabel),
  },
];

const replaySpeedToMetricSpeedMap = {
  [PlayRecordingSpeed.Normal]: Host.UserMetrics.RecordingReplaySpeed.Normal,
  [PlayRecordingSpeed.Slow]: Host.UserMetrics.RecordingReplaySpeed.Slow,
  [PlayRecordingSpeed.VerySlow]: Host.UserMetrics.RecordingReplaySpeed.VerySlow,
  [PlayRecordingSpeed.ExtremelySlow]: Host.UserMetrics.RecordingReplaySpeed.ExtremelySlow,
} as const;

const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/components/ReplayButton.ts',
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

export interface ReplayButtonProps {
  disabled: boolean;
}

export interface ReplayButtonData {
  settings: Models.RecorderSettings.RecorderSettings;
  replayExtensions: Extensions.ExtensionManager.Extension[];
}

const REPLAY_EXTENSION_PREFIX = 'extension';

export class ReplayButton extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-replay-button`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  readonly #props: ReplayButtonProps = {disabled: false};
  #settings?: Models.RecorderSettings.RecorderSettings;
  #replayExtensions: Extensions.ExtensionManager.Extension[] = [];

  set data(data: ReplayButtonData) {
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

  #handleSelectButtonClick(event: SelectButtonClickEvent): void {
    event.stopPropagation();

    if (event.value.startsWith(REPLAY_EXTENSION_PREFIX)) {
      if (this.#settings) {
        this.#settings.replayExtension = event.value;
      }
      const extensionIdx = Number(
          event.value.substring(REPLAY_EXTENSION_PREFIX.length),
      );
      this.dispatchEvent(
          new StartReplayEvent(
              PlayRecordingSpeed.Normal,
              this.#replayExtensions[extensionIdx],
              ),
      );
      void ComponentHelpers.ScheduledRender.scheduleRender(
          this,
          this.#boundRender,
      );
      return;
    }

    const speed = event.value as PlayRecordingSpeed;
    if (this.#settings) {
      this.#settings.speed = speed;
      this.#settings.replayExtension = '';
    }

    Host.userMetrics.recordingReplaySpeed(replaySpeedToMetricSpeedMap[speed]);
    this.dispatchEvent(new StartReplayEvent(event.value as PlayRecordingSpeed));
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
            buttonLabel: (): string => extension.getName(),
            label: (): string => extension.getName(),
          };
        }),
      });
    }

    // clang-format off
    LitHtml.render(
      LitHtml.html`
    <${SelectButton.litTagName}
      @selectbuttonclick=${this.#handleSelectButtonClick}
      .variant=${SelectButtonVariant.PRIMARY}
      .showItemDivider=${false}
      .disabled=${this.#props.disabled}
      .action=${Actions.RecorderActions.ReplayRecording}
      .value=${this.#settings?.replayExtension || this.#settings?.speed}
      .groups=${groups}>
    </${SelectButton.litTagName}>`,
      this.#shadow,
      { host: this },
    );
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent(
    'devtools-replay-button',
    ReplayButton,
);

declare global {
  interface HTMLElementEventMap {
    startreplay: StartReplayEvent;
  }

  interface HTMLElementTagNameMap {
    'devtools-replay-button': ReplayButton;
  }
}
