// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T, Args extends any[] = any[]> = new (...args: Args) => T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AbstractConstructor<T, Args extends any[] = any[]> = (abstract new (...args: Args) => T);

export type ConstructorOrAbstract<T> = Constructor<T>|AbstractConstructor<T>;
