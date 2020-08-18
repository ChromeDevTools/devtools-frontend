// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface Dog {
  name: string;
  isGoodDog: boolean;
}

interface Other {
  name: string
}

class ArrayParams extends HTMLElement {
  public update(dogs: Dog[]): void {
  }

  private thing(x: Other) {
  }
}

customElements.define('devtools-test-component', ArrayParams);
