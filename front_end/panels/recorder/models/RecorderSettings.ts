// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';

import {ConverterIds} from './ConverterIds.js';
import {PlayRecordingSpeed} from './RecordingPlayer.js';
import {SelectorType} from './Schema.js';

const UIStrings = {
  /**
   * @description This string is used to generate the default name for the create recording form in the Recording panel.
   * The format is similar to the one used by MacOS to generate names for screenshots. Both {DATE} and {TIME} are localized
   * using the current locale.
   *
   * @example {2022-08-04} DATE
   * @example {10:32:48} TIME
   */
  defaultRecordingName: 'Recording {DATE} at {TIME}',
};

const str_ = i18n.i18n.registerUIStrings(
    'panels/recorder/models/RecorderSettings.ts',
    UIStrings,
);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class RecorderSettings {
  #selectorAttribute = Common.Settings.Settings.instance().createSetting(
      'recorderSelectorAttribute',
      '',
  );
  #speed = Common.Settings.Settings.instance().createSetting(
      'recorderPanelReplaySpeed',
      PlayRecordingSpeed.Normal,
  );
  #replayExtension = Common.Settings.Settings.instance().createSetting(
      'recorderPanelReplayExtension',
      '',
  );
  #selectorTypes = new Map<SelectorType, Common.Settings.Setting<boolean>>();
  #preferredCopyFormat = Common.Settings.Settings.instance().createSetting<string>(
      'recorder_preferred_copy_format',
      ConverterIds.JSON,
  );

  constructor() {
    for (const selectorType of Object.values(SelectorType)) {
      this.#selectorTypes.set(
          selectorType,
          Common.Settings.Settings.instance().createSetting(
              `recorder${selectorType}SelectorEnabled`,
              true,
              ),
      );
    }
  }

  get selectorAttribute(): string {
    return this.#selectorAttribute.get();
  }

  set selectorAttribute(value: string) {
    this.#selectorAttribute.set(value);
  }

  get speed(): PlayRecordingSpeed {
    return this.#speed.get();
  }

  set speed(speed: PlayRecordingSpeed) {
    this.#speed.set(speed);
  }

  get replayExtension(): string {
    return this.#replayExtension.get();
  }

  set replayExtension(replayExtension: string) {
    this.#replayExtension.set(replayExtension);
  }

  get defaultTitle(): Common.UIString.LocalizedString {
    const now = new Date();

    return i18nString(UIStrings.defaultRecordingName, {
      DATE: now.toLocaleDateString(),
      TIME: now.toLocaleTimeString(),
    });
  }

  get defaultSelectors(): SelectorType[] {
    return Object.values(SelectorType)
        .filter(
            type => this.getSelectorByType(type),
        );
  }

  getSelectorByType(type: SelectorType): boolean|undefined {
    return this.#selectorTypes.get(type)?.get();
  }

  setSelectorByType(type: SelectorType, value: boolean): void {
    this.#selectorTypes.get(type)?.set(value);
  }

  get preferredCopyFormat(): string {
    return this.#preferredCopyFormat.get();
  }

  set preferredCopyFormat(value: string) {
    this.#preferredCopyFormat.set(value);
  }
}
