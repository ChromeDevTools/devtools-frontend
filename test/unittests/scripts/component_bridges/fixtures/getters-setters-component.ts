// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface Dog {
  name: string;
  isGoodDog: boolean;
}

class BasicComponent extends HTMLElement {
  public set dog(dog: Dog) {
    this.dog = dog;
  }

  public get dog(): Dog {
    return this.dog;
  }
}

customElements.define('devtools-test-component', BasicComponent);
