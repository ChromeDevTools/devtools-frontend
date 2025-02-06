// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../core/host/host.js';

function createMockAidaClient(fetch: Host.AidaClient.AidaClient['fetch']): Host.AidaClient.AidaClient {
  const fetchStub = sinon.stub();
  const registerClientEventStub = sinon.stub();
  return {
    fetch: fetchStub.callsFake(fetch),
    registerClientEvent: registerClientEventStub,
  };
}

type MockAidaResponse =
    Omit<Host.AidaClient.AidaResponse, 'completed'|'metadata'>&{metadata?: Host.AidaClient.AidaResponseMetadata};

/**
 * Creates a mock AIDA client that responds using `data`.
 *
 * Each first-level item of `data` is a single response.
 * Each second-level item of `data` is a chunk of a response.
 * The last chunk sets completed flag to true;
 */
export function mockAidaClient(data: Array<[MockAidaResponse, ...MockAidaResponse[]]> = []):
    Host.AidaClient.AidaClient {
  let callId = 0;
  async function* provideAnswer(_: Host.AidaClient.AidaRequest, options?: {signal?: AbortSignal}) {
    if (!data[callId]) {
      throw new Error('No data provided to the mock client');
    }

    for (const [idx, chunk] of data[callId].entries()) {
      if (options?.signal?.aborted) {
        throw new Host.AidaClient.AidaAbortError();
      }
      const metadata = chunk.metadata ?? {};
      if (metadata?.attributionMetadata?.attributionAction === Host.AidaClient.RecitationAction.BLOCK) {
        throw new Host.AidaClient.AidaBlockError();
      }
      yield {
        ...chunk,
        metadata,
        completed: idx === data[callId].length - 1,
      };
    }

    callId++;
  }

  return createMockAidaClient(provideAnswer);
}
