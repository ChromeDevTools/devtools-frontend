// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// We need these enums here as enum values of enums defined in closure land
// are typed as string, and hence provide for weaker type-checking.

// eslint-disable-next-line rulesdir/const_enum
export enum FrontendMessageType {
  Result = 'result',
  Command = 'command',
  System = 'system',
  QueryObjectResult = 'queryObjectResult',
}

// eslint-disable-next-line rulesdir/const_enum
export enum FrontendMessageSource {
  CSS = 'css',
  ConsoleAPI = 'console-api',
}
