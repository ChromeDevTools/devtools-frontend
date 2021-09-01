// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class ValueChangedEvent extends Event {
  static readonly eventName = 'valuechanged';
  data: {value: string};

  constructor(value: string) {
    super(ValueChangedEvent.eventName, {});
    this.data = {value};
  }
}
