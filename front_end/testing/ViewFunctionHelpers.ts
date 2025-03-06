// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as UI from '../ui/legacy/legacy.js';

type WidgetConstructor = abstract new (...args: any[]) => UI.Widget.Widget|HTMLElement;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ViewFunctionLike = ((input: any, output: any, target: HTMLElement) => void);

type FindViewFunction<ParametersT extends readonly unknown[]> = ParametersT extends [infer Head, ...infer Tail] ?
    Head extends ViewFunctionLike ? Head : FindViewFunction<Tail>:
    never;

type ViewFunction<WidgetConstructorT extends WidgetConstructor> =
    FindViewFunction<Required<ConstructorParameters<WidgetConstructorT>>>;

type ViewFunctionParameters<WidgetConstructorT extends WidgetConstructor> =
    Parameters<ViewFunction<WidgetConstructorT>>;

export type ViewInput<WidgetConstructorT extends WidgetConstructor> =
    ViewFunctionParameters<WidgetConstructorT>[0];

export type ViewOutput<WidgetConstructorT extends WidgetConstructor> =
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    {} extends ViewFunctionParameters<WidgetConstructorT>[1] ? never :
    ViewFunctionParameters<WidgetConstructorT>[1];

interface ViewStubExtensions<WidgetConstructorT extends WidgetConstructor> {
  input: ViewInput<WidgetConstructorT>;
  nextInput: Promise<ViewInput<WidgetConstructorT>>;
  callCount: number;
}

interface InternalViewStubExtensions<WidgetConstructorT extends WidgetConstructor> extends
    ViewStubExtensions<WidgetConstructorT> {
  invoked?: (input: ViewInput<WidgetConstructorT>) => void;
}

export type ViewFunctionStub<WidgetConstructorT extends WidgetConstructor> =
    ViewFunction<WidgetConstructorT>&ViewStubExtensions<WidgetConstructorT>;

export function createViewFunctionStub<WidgetConstructorT extends WidgetConstructor>(
    constructor: WidgetConstructorT,
    outputValues?: ViewOutput<WidgetConstructorT>): ViewFunctionStub<WidgetConstructorT> {
  const result: InternalViewStubExtensions<WidgetConstructorT> =
      ((input: ViewInput<WidgetConstructorT>, output: ViewOutput<WidgetConstructorT>, _target: HTMLElement) => {
        ++result.callCount;
        result.input = input;
        if (output && outputValues) {
          Object.assign((output as object), outputValues);
        }
        result.invoked?.(input);
      }) as ViewFunctionStub<WidgetConstructorT>;
  result.callCount = 0;
  Object.defineProperty(result, 'nextInput', {
    get() {
      return new Promise<ViewInput<WidgetConstructorT>>(resolve => {
        result.invoked = resolve;
      });
    }
  });
  return result as ViewFunctionStub<WidgetConstructorT>;
}
