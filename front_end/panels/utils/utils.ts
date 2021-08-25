// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export function imageNameForResourceType(resourceType: Common.ResourceType.ResourceType): string {
  switch (resourceType) {
    case Common.ResourceType.resourceTypes.Document:
      return 'ic_file_document';
    case Common.ResourceType.resourceTypes.Image:
      return 'ic_file_image';
    case Common.ResourceType.resourceTypes.Font:
      return 'ic_file_font';
    case Common.ResourceType.resourceTypes.Script:
      return 'ic_file_script';
    case Common.ResourceType.resourceTypes.Stylesheet:
      return 'ic_file_stylesheet';
    case Common.ResourceType.resourceTypes.WebBundle:
      return 'ic_file_webbundle';
    default:
      return 'ic_file_default';
  }
}
