// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Interfaces from './interface.js';

interface Dog {
  name: string;
  isGoodDog: boolean;
}

class Breadcrumbs extends HTMLElement {
  public update(person: Interfaces.Person, dog: Dog): void {
  }
}

customElements.define('devtools-breadcrumbs', Breadcrumbs);
