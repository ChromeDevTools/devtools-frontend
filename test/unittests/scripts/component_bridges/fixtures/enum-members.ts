// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const enum GoodDog {
  yes = 'yes',
  alsoYes = 'alsoYes',
}

interface Dog {
  name: string;
  isGoodDog: GoodDog.yes;
}

class BasicComponent extends HTMLElement {
  set dog(dog: Dog) {
    this.dog = dog;
  }
}

customElements.define('devtools-test-component', BasicComponent);
