// Copyright (c) Meta Platforms, Inc. and affiliates.
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Chrome DevTools has an experiment system integrated deeply with its panel
// framework and settings UI. We add some React Native-specific experiments,
// some of which control new RN-specific UI and some of which add gating to
// *existing* features.
//
// The goals are:
// 1. To allow the core, non-RN entry points (like `inspector.ts`) to continue
//    to work, largely unmodified, for ease of testing.
// 2. To allow users of each entry point to enable or disable experiments as
//    needed through the UI.
// 3. To only show experiments in Settings if they are relevant to the current
//    entry point.
// 4. To minimise RN-specific changes to core code, for ease of rebasing onto
//    new versions of Chrome DevTools.
// 5. To allow RN entry points to enable/configure *core* experiments before
//    they are registered (in MainImpl).
//
// To add a new React Native-specific experiment:
// - define it in the RNExperiments enum and Experiments enum (in Runtime.ts)
// - register it in this file (rn_experiments.ts)
//   - set `enabledByDefault` as appropriate
// - optionally, configure it further in each RN-specific entry point
//   (rn_inspector.ts, rn_fusebox.ts)
//
// React Native-specific experiments are merged into the main ExperimentsSupport
// object in MainImpl and can't be configured further afterwards (except
// through the UI).

import * as Root from '../../core/root/root.js';

export const RNExperimentName = Root.Runtime.RNExperimentName;
export type RNExperimentName = Root.Runtime.RNExperimentName;

const state = {
  didInitializeExperiments: false,
  isReactNativeEntryPoint: false,
};

/**
 * Set whether the current entry point is a React Native entry point.
 * This must be called before constructing MainImpl.
 */
export function setIsReactNativeEntryPoint(value: boolean): void {
  if (state.didInitializeExperiments) {
    throw new Error(
      'setIsReactNativeEntryPoint must be called before constructing MainImpl',
    );
  }
  state.isReactNativeEntryPoint = value;
}

type RNExperimentPredicate = ({
  isReactNativeEntryPoint,
}: {
  isReactNativeEntryPoint: boolean,
}) => boolean;
type RNExperimentSpec = {
  name: RNExperimentName,
  title: string,
  unstable: boolean,
  docLink?: string,
  feedbackLink?: string,
  enabledByDefault?: boolean | RNExperimentPredicate,
};

class RNExperiment {
  readonly name: RNExperimentName;
  readonly title: string;
  readonly unstable: boolean;
  readonly docLink?: string;
  readonly feedbackLink?: string;
  enabledByDefault: RNExperimentPredicate;

  constructor(spec: RNExperimentSpec) {
    this.name = spec.name;
    this.title = spec.title;
    this.unstable = spec.unstable;
    this.docLink = spec.docLink;
    this.feedbackLink = spec.feedbackLink;
    this.enabledByDefault = normalizePredicate(spec.enabledByDefault, false);
  }
}

function normalizePredicate(
  pred: boolean | null | undefined | RNExperimentPredicate,
  defaultValue: boolean,
): RNExperimentPredicate {
  if (pred === null || pred === undefined) {
    return () => defaultValue;
  }
  if (typeof pred === 'boolean') {
    return () => pred;
  }
  return pred;
}

class RNExperimentsSupport {
  #experiments: Map<Root.Runtime.RNExperimentName, RNExperiment> = new Map();
  #defaultEnabledCoreExperiments = new Set<Root.Runtime.ExperimentName>();

  register(spec: RNExperimentSpec): void {
    if (state.didInitializeExperiments) {
      throw new Error(
        'Experiments must be registered before constructing MainImpl',
      );
    }
    const { name } = spec;
    if (this.#experiments.has(name)) {
      throw new Error(`React Native Experiment ${name} is already registered`);
    }
    this.#experiments.set(name, new RNExperiment(spec));
  }

  /**
   * Enable the given (RN-specific or core) experiments by default.
   */
  enableExperimentsByDefault(names: Root.Runtime.ExperimentName[]): void {
    if (state.didInitializeExperiments) {
      throw new Error(
        'Experiments must be configured before constructing MainImpl',
      );
    }
    for (const name of names) {
      if (Object.prototype.hasOwnProperty.call(RNExperimentName, name)) {
        const experiment = this.#experiments.get(
          name as unknown as RNExperimentName,
        );
        if (!experiment) {
          throw new Error(`React Native Experiment ${name} is not registered`);
        }
        experiment.enabledByDefault = (): boolean => true;
      } else {
        this.#defaultEnabledCoreExperiments.add(
          name as Root.Runtime.ExperimentName,
        );
      }
    }
  }

  copyInto(other: Root.Runtime.ExperimentsSupport, titlePrefix: string = ''): void {
    for (const [name, spec] of this.#experiments) {
      other.register(
        name,
        titlePrefix + spec.title,
        spec.unstable,
        spec.docLink,
        spec.feedbackLink,
      );
      if (
        spec.enabledByDefault({
          isReactNativeEntryPoint: state.isReactNativeEntryPoint,
        })
      ) {
        other.enableExperimentsByDefault([name]);
      }
    }
    for (const name of this.#defaultEnabledCoreExperiments) {
      other.enableExperimentsByDefault([name]);
    }
    state.didInitializeExperiments = true;
  }
}

// Early registration for React Native-specific experiments. Only use this
// *before* constructing MainImpl; afterwards read from Root.Runtime.experiments
// as normal.
export const Instance = new RNExperimentsSupport();

Instance.register({
  name: RNExperimentName.JS_HEAP_PROFILER_ENABLE,
  title: 'Enable Heap Profiler',
  unstable: false,
  enabledByDefault: ({ isReactNativeEntryPoint }) => !isReactNativeEntryPoint,
});

Instance.register({
  name: RNExperimentName.REACT_NATIVE_SPECIFIC_UI,
  title: 'Show React Native-specific UI',
  unstable: false,
  enabledByDefault: ({ isReactNativeEntryPoint }) => isReactNativeEntryPoint,
});

Instance.register({
  name: RNExperimentName.ENABLE_PERFORMANCE_PANEL,
  title: 'Enable Performance panel',
  unstable: true,
  enabledByDefault: ({ isReactNativeEntryPoint }) => !isReactNativeEntryPoint,
});
