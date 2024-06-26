// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO(crbug.com/348449529): refactor to proper devtools module

import {ConnectionPool} from './simulation/ConnectionPool.js';
import {Constants} from './simulation/Constants.js';
import {DNSCache} from './simulation/DNSCache.js';
import {NetworkAnalyzer} from './simulation/NetworkAnalyzer.js';
import {type CompleteNodeTiming, SimulatorTimingMap} from './simulation/SimulationTimingMap.js';
import {Simulator} from './simulation/Simulator.js';
import {TCPConnection} from './simulation/TCPConnection.js';
import {type AnyNetworkObject, type Simulation} from './types/lantern.js';

export type MetricCoefficients = Simulation.MetricCoefficients;
export type MetricComputationDataInput = Simulation.MetricComputationDataInput;
export type NodeTiming = Simulation.NodeTiming;
export type Options = Simulation.Options;
export type ProcessedNavigation = Simulation.ProcessedNavigation;
export type Result<T = AnyNetworkObject> = Simulation.Result<T>;
export type Settings = Simulation.Settings;
export type URL = Simulation.URL;

export {
  ConnectionPool,
  Constants,
  DNSCache,
  NetworkAnalyzer,
  CompleteNodeTiming,
  SimulatorTimingMap,
  Simulator,
  TCPConnection,
};
