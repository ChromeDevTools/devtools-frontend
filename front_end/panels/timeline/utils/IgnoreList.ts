// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Trace from '../../../models/trace/trace.js';

import {SourceMapsResolver} from './SourceMapsResolver.js';

export function isIgnoreListedEntry(entry: Trace.Types.Events.Event): boolean {
  if (!Trace.Types.Events.isProfileCall(entry)) {
    return false;
  }
  const rawUrl = entry.callFrame.url as Platform.DevToolsPath.UrlString;

  const sourceMappedData = SourceMapsResolver.resolvedCodeLocationForEntry(entry);
  const script = sourceMappedData?.script;
  const uiSourceCode = sourceMappedData?.devtoolsLocation?.uiSourceCode;
  const resolvedUrl = uiSourceCode?.url();
  const isKnownThirdParty = uiSourceCode?.isKnownThirdParty();
  const isContentScript = script?.isContentScript();
  const ignoreListOptions: Bindings.IgnoreListManager.IgnoreListGeneralRules = {isContentScript, isKnownThirdParty};
  const urlToUse = resolvedUrl || rawUrl;
  return isIgnoreListedURL(urlToUse, ignoreListOptions);
}

export function isIgnoreListedURL(
    url: Platform.DevToolsPath.UrlString, options?: Bindings.IgnoreListManager.IgnoreListGeneralRules): boolean {
  return Bindings.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(url, options);
}
