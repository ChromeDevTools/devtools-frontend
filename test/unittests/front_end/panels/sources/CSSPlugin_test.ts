// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Sources from '../../../../../front_end/panels/sources/sources.js';

describe('CSSPlugin', () => {
  const {CSSPlugin} = Sources.CSSPlugin;
  describe('accepts', () => {
    it('holds true for documents', () => {
      const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      uiSourceCode.contentType.returns(Common.ResourceType.resourceTypes.Document);
      assert.isTrue(CSSPlugin.accepts(uiSourceCode));
    });

    it('holds true for style sheets', () => {
      const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode);
      uiSourceCode.contentType.returns(Common.ResourceType.resourceTypes.Stylesheet);
      assert.isTrue(CSSPlugin.accepts(uiSourceCode));
    });
  });
});
