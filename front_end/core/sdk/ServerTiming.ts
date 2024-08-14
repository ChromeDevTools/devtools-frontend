// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
type NameValue = Platform.ServerTiming.NameValue;

const UIStrings = {
  /**
   *@description Text in Server Timing
   */
  deprecatedSyntaxFoundPleaseUse: 'Deprecated syntax found. Please use: <name>;dur=<duration>;desc=<description>',
  /**
   *@description Text in Server Timing
   *@example {https} PH1
   */
  duplicateParameterSIgnored: 'Duplicate parameter "{PH1}" ignored.',
  /**
   *@description Text in Server Timing
   *@example {https} PH1
   */
  noValueFoundForParameterS: 'No value found for parameter "{PH1}".',
  /**
   *@description Text in Server Timing
   *@example {https} PH1
   */
  unrecognizedParameterS: 'Unrecognized parameter "{PH1}".',
  /**
   *@description Text in Server Timing
   */
  extraneousTrailingCharacters: 'Extraneous trailing characters.',
  /**
   *@description Text in Server Timing
   *@example {https} PH1
   *@example {2.0} PH2
   */
  unableToParseSValueS: 'Unable to parse "{PH1}" value "{PH2}".',
};

const str_ = i18n.i18n.registerUIStrings('core/sdk/ServerTiming.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const warningMessage: Platform.ServerTiming.ServerTimingParsingWarningMessage = {
  deprecratedSyntax: () => i18nString(UIStrings.deprecatedSyntaxFoundPleaseUse),
  duplicateParameter: (param: string) => i18nString(UIStrings.duplicateParameterSIgnored, {PH1: param}),
  noValueFoundForParameter: (param: string) => i18nString(UIStrings.noValueFoundForParameterS, {PH1: param}),
  unrecognizedParameter: (param: string) => i18nString(UIStrings.unrecognizedParameterS, {PH1: param}),
  extraneousTrailingCharacters: () => i18nString(UIStrings.extraneousTrailingCharacters),
  unableToParseValue: (paramName: string, paramValue: string) =>
      i18nString(UIStrings.unableToParseSValueS, {PH1: paramName, PH2: paramValue}),
};
/**
 * This is a wrapper for the ServerTiming implementation in
 * core/platform which uses localized strings for warnings. The
 * implementation at core/platform/ is kept without dependencies to the
 * i18n moduke so that it remains portable outside of devtools, which is
 * needed to be used by the trace/ model of the Performance panel.
 */
export class ServerTiming extends Platform.ServerTiming.ServerTiming {
  static override parseHeaders(headers: NameValue[]): ServerTiming[]|null {
    return Platform.ServerTiming.ServerTiming.parseHeaders(headers, warningMessage);
  }

  /**
   * TODO(crbug.com/1011811): Instead of using !Object<string, *> we should have a proper type
   *                          with #name, desc and dur properties.
   */
  static override createFromHeaderValue(valueString: string): {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [x: string]: any,
  }[] {
    return Platform.ServerTiming.ServerTiming.createFromHeaderValue(valueString, warningMessage);
  }

  static override getParserForParameter(paramName: string):
      ((arg0: {
         // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         [x: string]: any,
       },
        arg1: string|null) => void)|null {
    return Platform.ServerTiming.ServerTiming.getParserForParameter(paramName, warningMessage);
  }
}
