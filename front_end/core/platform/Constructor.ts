// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export type Constructor<T> = new (...args: any[]) => T;

export type AbstractConstructor<T> = (abstract new (...args: any[]) => T);

export type ConstructorOrAbstract<T> = Constructor<T>|AbstractConstructor<T>;
