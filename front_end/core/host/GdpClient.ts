// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../root/root.js';

import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import type {DispatchHttpRequestRequest, DispatchHttpRequestResult} from './InspectorFrontendHostAPI.js';

export enum SubscriptionStatus {
  ENABLED = 'SUBSCRIPTION_STATE_ENABLED',
  PENDING = 'SUBSCRIPTION_STATE_PENDING',
  CANCELED = 'SUBSCRIPTION_STATE_CANCELED',
  REFUNDED = 'SUBSCRIPTION_STATE_REFUNDED',
  AWAITING_FIX = 'SUBSCRIPTION_STATE_AWAITING_FIX',
  ON_HOLD = 'SUBSCRIPTION_STATE_ACCOUNT_ON_HOLD',
}

export enum SubscriptionTier {
  PREMIUM_ANNUAL = 'SUBSCRIPTION_TIER_PREMIUM_ANNUAL',
  PREMIUM_MONTHLY = 'SUBSCRIPTION_TIER_PREMIUM_MONTHLY',
  PRO_ANNUAL = 'SUBSCRIPTION_TIER_PRO_ANNUAL',
  PRO_MONTHLY = 'SUBSCRIPTION_TIER_PRO_MONTHLY',
}

enum EligibilityStatus {
  ELIGIBLE = 'ELIGIBLE',
  NOT_ELIGIBLE = 'NOT_ELIGIBLE',
}

export enum EmailPreference {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

interface CheckElibigilityResponse {
  createProfile: EligibilityStatus;
}

export interface Profile {
  // Resource name of the profile.
  // Format: profiles/{obfuscated_profile_id}
  name: string;
  activeSubscription?: {
    subscriptionStatus: SubscriptionStatus,
    // To ensure forward compatibility, we accept any string, allowing the server to
    // introduce new subscription tiers without breaking older clients.
    subscriptionTier: SubscriptionTier|string,
  };
}

async function makeHttpRequest<R extends object>(request: DispatchHttpRequestRequest): Promise<R|null> {
  if (!Root.Runtime.hostConfig.devToolsGdpProfiles?.enabled) {
    return null;
  }

  const response = await new Promise<DispatchHttpRequestResult>(resolve => {
    InspectorFrontendHostInstance.dispatchHttpRequest(request, resolve);
  });

  debugLog({request, response});
  if ('response' in response && response.statusCode === 200) {
    return JSON.parse(response.response) as R;
  }

  return null;
}

const SERVICE_NAME = 'gdpService';
let gdpClientInstance: GdpClient|null = null;
export class GdpClient {
  #cachedProfilePromise?: Promise<Profile|null>;
  #cachedEligibilityPromise?: Promise<CheckElibigilityResponse|null>;

  private constructor() {
  }

  static instance({forceNew}: {
    forceNew: boolean,
  } = {forceNew: false}): GdpClient {
    if (!gdpClientInstance || forceNew) {
      gdpClientInstance = new GdpClient();
    }
    return gdpClientInstance;
  }

  async initialize(): Promise<void> {
    void this.getProfile();
    void this.checkEligibility();
  }

  async getProfile(): Promise<Profile|null> {
    if (this.#cachedProfilePromise) {
      return await this.#cachedProfilePromise;
    }

    this.#cachedProfilePromise = makeHttpRequest({
      service: SERVICE_NAME,
      path: '/v1beta1/profile:get',
      method: 'GET',
    });
    return await this.#cachedProfilePromise;
  }

  async checkEligibility(): Promise<CheckElibigilityResponse|null> {
    if (this.#cachedEligibilityPromise) {
      return await this.#cachedEligibilityPromise;
    }

    this.#cachedEligibilityPromise =
        makeHttpRequest({service: SERVICE_NAME, path: '/v1beta1/eligibility:check', method: 'GET'});

    return await this.#cachedEligibilityPromise;
  }

  createProfile({user, emailPreference}: {user: string, emailPreference: EmailPreference}): Promise<Profile|null> {
    return makeHttpRequest({
      service: SERVICE_NAME,
      path: '/v1beta1/profiles',
      method: 'POST',
      body: JSON.stringify({
        user,
        newsletter_email: emailPreference,
      })
    });
  }
}

function isDebugMode(): boolean {
  return Boolean(localStorage.getItem('debugGdpIntegrationEnabled'));
}

function debugLog(...log: unknown[]): void {
  if (!isDebugMode()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log('debugLog', ...log);
}

function setDebugGdpIntegrationEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem('debugGdpIntegrationEnabled', 'true');
  } else {
    localStorage.removeItem('debugGdpIntegrationEnabled');
  }
}

// @ts-expect-error
globalThis.setDebugGdpIntegrationEnabled = setDebugGdpIntegrationEnabled;
