// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// We need these enums here as enum values of enums defined in closure land
// are typed as string, and hence provide for weaker type-checking.

export enum FrontendMessageType {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  Result = 'result',
  Command = 'command',
  System = 'system',
  QueryObjectResult = 'queryObjectResult',
  /* eslint-enable @typescript-eslint/naming-convention */
}
