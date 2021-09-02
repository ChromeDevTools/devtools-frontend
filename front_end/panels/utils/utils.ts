// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';

export function imageNameForResourceType(resourceType: Common.ResourceType.ResourceType): string {
  if (resourceType.isDocument()) {
    return 'ic_file_document';
  }
  if (resourceType.isImage()) {
    return 'ic_file_image';
  }
  if (resourceType.isFont()) {
    return 'ic_file_font';
  }
  if (resourceType.isScript()) {
    return 'ic_file_script';
  }
  if (resourceType.isStyleSheet()) {
    return 'ic_file_stylesheet';
  }
  if (resourceType.isWebbundle()) {
    return 'ic_file_webbundle';
  }
  return 'ic_file_default';
}
