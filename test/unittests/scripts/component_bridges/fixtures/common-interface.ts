// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Note for the reader: path isn't correct, but this is fine for the fixture.
import * as Common from '../../common/common.js';

class NestedCommonInterface extends HTMLElement {
  public update(color: Common.Color.Color): void {
  }
}

customElements.define('devtools-test-component', ArrayParams);
