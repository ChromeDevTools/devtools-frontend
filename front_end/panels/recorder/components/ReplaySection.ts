// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
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

const REPLAY_EXTENSION_PREFIX = 'extension';

interface Item {
  value: string;
  buttonIconName: string;
  buttonLabel?: () => Platform.UIString.LocalizedString;
  label: () => Platform.UIString.LocalizedString;
}

interface Group {
  name: string;
  items: Item[];
}

interface ViewInput {
  disabled: boolean;
  groups: Group[];
  selectedItem: Item;
  actionTitle: string;
  onButtonClick: () => void;
  onItemSelected: (item: string) => void;
}

export type ViewOutput = undefined;

export const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const {disabled, groups, selectedItem, actionTitle, onButtonClick, onItemSelected} = input;
  const buttonVariant = Buttons.Button.Variant.PRIMARY;

  const handleClick = (ev: Event): void => {
    ev.stopPropagation();
    onButtonClick();
  };

  const handleSelectMenuSelect = (
      event: Event,
      ): void => {
    if (event.target instanceof HTMLSelectElement) {
      onItemSelected(event.target.value);
    }
  };

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
        title=${ifDefined(actionTitle)}
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
            ?disabled=${disabled}
            jslog=${VisualLogging.dropDown('network-conditions').track({
              change: true,
            })}
            @change=${handleSelectMenuSelect}
          >
            ${repeat(groups, group => group.name, group =>
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
            )}
          </select>
        </label>
        <devtools-button
          .disabled=${disabled}
          .variant=${buttonVariant}
          .iconName=${selectedItem.buttonIconName}
          @click=${handleClick}
          jslog=${VisualLogging.action(Actions.RecorderActions.REPLAY_RECORDING).track({click: true})}
        >
          ${i18nString(UIStrings.Replay)}
        </devtools-button>
      </div>`,
    target,
  );
  // clang-format on
};

/**
 * This presenter combines built-in replay speeds and extensions into a single
 * select menu + a button.
 */
export class ReplaySection extends UI.Widget.Widget {
  onStartReplay?: (speed: PlayRecordingSpeed, extension?: Extensions.ExtensionManager.Extension) => void;

  #disabled = false;
  #settings?: Models.RecorderSettings.RecorderSettings;
  #replayExtensions: Extensions.ExtensionManager.Extension[] = [];
  #view: typeof DEFAULT_VIEW;
  #groups: Group[] = [];

  constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view || DEFAULT_VIEW;
    this.#groups = this.#computeGroups();
  }

  set settings(settings: Models.RecorderSettings.RecorderSettings|undefined) {
    this.#settings = settings;
    this.performUpdate();
  }

  set replayExtensions(replayExtensions: Extensions.ExtensionManager.Extension[]) {
    this.#replayExtensions = replayExtensions;
    this.#groups = this.#computeGroups();
    this.performUpdate();
  }

  get disabled(): boolean {
    return this.#disabled;
  }

  set disabled(disabled: boolean) {
    this.#disabled = disabled;
    this.performUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.performUpdate();
  }

  override performUpdate(): void {
    const selectedItem = this.#getSelectedItem();
    this.#view(
        {
          disabled: this.#disabled,
          groups: this.#groups,
          selectedItem,
          actionTitle:
              Models.Tooltip.getTooltipForActions(selectedItem.label(), Actions.RecorderActions.REPLAY_RECORDING),
          onButtonClick: () => this.#onStartReplay(),
          onItemSelected: (item: string) => this.#onItemSelected(item),
        },
        undefined,
        this.contentElement,
    );
  }

  #computeGroups(): Group[] {
    const groups: Group[] = [{
      name: i18nString(UIStrings.speedGroup),
      items: [
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
      ]
    }];
    if (this.#replayExtensions.length) {
      groups.push({
        name: i18nString(UIStrings.extensionGroup),
        items: this.#replayExtensions.map((extension, idx) => {
          return {
            value: (REPLAY_EXTENSION_PREFIX + idx),
            buttonIconName: 'play',
            buttonLabel: () => extension.getName() as Platform.UIString.LocalizedString,
            label: () => extension.getName() as Platform.UIString.LocalizedString,
          };
        }),
      });
    }
    return groups;
  }

  #getSelectedItem(): Item {
    const value = this.#settings?.replayExtension || this.#settings?.speed || '';
    for (const group of this.#groups) {
      for (const item of group.items) {
        if (item.value === value) {
          return item;
        }
      }
    }
    return this.#groups[0].items[0];
  }

  #onStartReplay(): void {
    const value = this.#settings?.replayExtension || this.#settings?.speed || '';
    if (value?.startsWith(REPLAY_EXTENSION_PREFIX)) {
      const extensionIdx = Number(
          value.substring(REPLAY_EXTENSION_PREFIX.length),
      );
      const extension = this.#replayExtensions[extensionIdx];
      if (this.#settings) {
        this.#settings.replayExtension = REPLAY_EXTENSION_PREFIX + extensionIdx;
      }
      if (this.onStartReplay) {
        this.onStartReplay(PlayRecordingSpeed.NORMAL, extension);
      }
    } else if (this.onStartReplay) {
      this.onStartReplay(this.#settings ? this.#settings.speed : PlayRecordingSpeed.NORMAL);
    }
    this.performUpdate();
  }

  #onItemSelected(item: string): void {
    const speed = item as PlayRecordingSpeed;
    if (this.#settings && speed) {
      this.#settings.speed = speed;
      this.#settings.replayExtension = '';
    }

    if (replaySpeedToMetricSpeedMap[speed]) {
      Host.userMetrics.recordingReplaySpeed(replaySpeedToMetricSpeedMap[speed]);
    }
    this.performUpdate();
  }
}
