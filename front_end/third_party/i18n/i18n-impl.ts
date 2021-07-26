// Copyright 2018 The Lighthouse Authors. All Rights Reserved.
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

import {RegisteredFileStrings} from './localized-string-set.js';

export type UIStrings = Record<string, string>;
export type LocalizedMessages = Record<string, {message: string}>;

/**
 * Encapsulates the global state of the i18n runtime.
 */
export class I18n {
  private localeData = new Map<Intl.UnicodeBCP47LocaleIdentifier, LocalizedMessages>();

  registerLocaleData(locale: Intl.UnicodeBCP47LocaleIdentifier, messages: LocalizedMessages): void {
    this.localeData.set(locale, messages);
  }

  registerFileStrings(filename: string, stringStructure: UIStrings): RegisteredFileStrings {
    return new RegisteredFileStrings(filename, stringStructure, this.localeData);
  }
}
