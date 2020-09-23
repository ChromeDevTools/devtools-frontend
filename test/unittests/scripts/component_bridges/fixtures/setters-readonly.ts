// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface Dog {
  name: string;
  isGoodDog: boolean;
}

interface Cat {
  name: string;
}

interface BasicData {
  dog: Readonly<Dog>, otherAnimals: ReadonlyArray<Cat>
}

class BasicComponent extends HTMLElement {
  public set data(data: BasicData) {
  }
}

customElements.define('devtools-test-component', BasicComponent);
