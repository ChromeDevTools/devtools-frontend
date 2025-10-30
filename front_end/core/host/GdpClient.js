"use strict";
import * as Root from "../root/root.js";
import * as DispatchHttpRequestClient from "./DispatchHttpRequestClient.js";
export var SubscriptionStatus = /* @__PURE__ */ ((SubscriptionStatus2) => {
  SubscriptionStatus2["ENABLED"] = "SUBSCRIPTION_STATE_ENABLED";
  SubscriptionStatus2["PENDING"] = "SUBSCRIPTION_STATE_PENDING";
  SubscriptionStatus2["CANCELED"] = "SUBSCRIPTION_STATE_CANCELED";
  SubscriptionStatus2["REFUNDED"] = "SUBSCRIPTION_STATE_REFUNDED";
  SubscriptionStatus2["AWAITING_FIX"] = "SUBSCRIPTION_STATE_AWAITING_FIX";
  SubscriptionStatus2["ON_HOLD"] = "SUBSCRIPTION_STATE_ACCOUNT_ON_HOLD";
  return SubscriptionStatus2;
})(SubscriptionStatus || {});
export var SubscriptionTier = /* @__PURE__ */ ((SubscriptionTier2) => {
  SubscriptionTier2["PREMIUM_ANNUAL"] = "SUBSCRIPTION_TIER_PREMIUM_ANNUAL";
  SubscriptionTier2["PREMIUM_MONTHLY"] = "SUBSCRIPTION_TIER_PREMIUM_MONTHLY";
  SubscriptionTier2["PRO_ANNUAL"] = "SUBSCRIPTION_TIER_PRO_ANNUAL";
  SubscriptionTier2["PRO_MONTHLY"] = "SUBSCRIPTION_TIER_PRO_MONTHLY";
  return SubscriptionTier2;
})(SubscriptionTier || {});
export var EligibilityStatus = /* @__PURE__ */ ((EligibilityStatus2) => {
  EligibilityStatus2["ELIGIBLE"] = "ELIGIBLE";
  EligibilityStatus2["NOT_ELIGIBLE"] = "NOT_ELIGIBLE";
  return EligibilityStatus2;
})(EligibilityStatus || {});
export var EmailPreference = /* @__PURE__ */ ((EmailPreference2) => {
  EmailPreference2["ENABLED"] = "ENABLED";
  EmailPreference2["DISABLED"] = "DISABLED";
  return EmailPreference2;
})(EmailPreference || {});
function normalizeBadgeName(name) {
  return name.replace(/profiles\/[^/]+\/awards\//, "profiles/me/awards/");
}
export const GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK = "https://developers.google.com/profile/u/me";
async function makeHttpRequest(request) {
  if (!isGdpProfilesAvailable()) {
    throw new DispatchHttpRequestClient.DispatchHttpRequestError(
      DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE
    );
  }
  const response = await DispatchHttpRequestClient.makeHttpRequest(request);
  return response;
}
const SERVICE_NAME = "gdpService";
let gdpClientInstance = null;
export class GdpClient {
  #cachedProfilePromise;
  #cachedEligibilityPromise;
  constructor() {
  }
  static instance({ forceNew } = { forceNew: false }) {
    if (!gdpClientInstance || forceNew) {
      gdpClientInstance = new GdpClient();
    }
    return gdpClientInstance;
  }
  /**
   * Fetches the user's GDP profile and eligibility status.
   *
   * It first attempts to fetch the profile. If the profile is not found
   * (a `NOT_FOUND` error), this is handled gracefully by treating the profile
   * as `null` and then proceeding to check for eligibility.
   *
   * @returns A promise that resolves with an object containing the `profile`
   * and `isEligible` status, or `null` if an unexpected error occurs.
   */
  async getProfile() {
    try {
      const profile = await this.#getProfile();
      return {
        profile,
        isEligible: true
      };
    } catch (err) {
      if (err instanceof DispatchHttpRequestClient.DispatchHttpRequestError && err.type === DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE) {
        return null;
      }
    }
    try {
      const checkEligibilityResponse = await this.#checkEligibility();
      return {
        profile: null,
        isEligible: checkEligibilityResponse.createProfile === "ELIGIBLE" /* ELIGIBLE */
      };
    } catch {
      return null;
    }
  }
  async #getProfile() {
    if (this.#cachedProfilePromise) {
      return await this.#cachedProfilePromise;
    }
    this.#cachedProfilePromise = makeHttpRequest({
      service: SERVICE_NAME,
      path: "/v1beta1/profile:get",
      method: "GET"
    }).then((profile) => {
      this.#cachedEligibilityPromise = Promise.resolve({ createProfile: "ELIGIBLE" /* ELIGIBLE */ });
      return profile;
    });
    return await this.#cachedProfilePromise;
  }
  async #checkEligibility() {
    if (this.#cachedEligibilityPromise) {
      return await this.#cachedEligibilityPromise;
    }
    this.#cachedEligibilityPromise = makeHttpRequest({ service: SERVICE_NAME, path: "/v1beta1/eligibility:check", method: "GET" });
    return await this.#cachedEligibilityPromise;
  }
  /**
   * @returns null if the request fails, the awarded badge names otherwise.
   */
  async getAwardedBadgeNames({ names }) {
    try {
      const response = await makeHttpRequest({
        service: SERVICE_NAME,
        path: "/v1beta1/profiles/me/awards:batchGet",
        method: "GET",
        queryParams: {
          allowMissing: "true",
          names
        }
      });
      return new Set(response.awards?.map((award) => normalizeBadgeName(award.name)) ?? []);
    } catch {
      return null;
    }
  }
  async createProfile({ user, emailPreference }) {
    try {
      const response = await makeHttpRequest({
        service: SERVICE_NAME,
        path: "/v1beta1/profiles",
        method: "POST",
        body: JSON.stringify({
          user,
          newsletter_email: emailPreference
        })
      });
      this.#clearCache();
      return response;
    } catch {
      return null;
    }
  }
  #clearCache() {
    this.#cachedProfilePromise = void 0;
    this.#cachedEligibilityPromise = void 0;
  }
  async createAward({ name }) {
    try {
      const response = await makeHttpRequest({
        service: SERVICE_NAME,
        path: "/v1beta1/profiles/me/awards",
        method: "POST",
        body: JSON.stringify({
          awardingUri: "devtools://devtools",
          name
        })
      });
      return response;
    } catch {
      return null;
    }
  }
}
export function isGdpProfilesAvailable() {
  const isBaseFeatureEnabled = Boolean(Root.Runtime.hostConfig.devToolsGdpProfiles?.enabled);
  const isBrandedBuild = Boolean(Root.Runtime.hostConfig.devToolsGdpProfilesAvailability?.enabled);
  const isOffTheRecordProfile = Root.Runtime.hostConfig.isOffTheRecord;
  const isDisabledByEnterprisePolicy = getGdpProfilesEnterprisePolicy() === Root.Runtime.GdpProfilesEnterprisePolicyValue.DISABLED;
  return isBaseFeatureEnabled && isBrandedBuild && !isOffTheRecordProfile && !isDisabledByEnterprisePolicy;
}
export function getGdpProfilesEnterprisePolicy() {
  return Root.Runtime.hostConfig.devToolsGdpProfilesAvailability?.enterprisePolicyValue ?? Root.Runtime.GdpProfilesEnterprisePolicyValue.DISABLED;
}
export function isBadgesEnabled() {
  const isBadgesEnabledByEnterprisePolicy = getGdpProfilesEnterprisePolicy() === Root.Runtime.GdpProfilesEnterprisePolicyValue.ENABLED;
  const isBadgesEnabledByFeatureFlag = Boolean(Root.Runtime.hostConfig.devToolsGdpProfiles?.badgesEnabled);
  return isBadgesEnabledByEnterprisePolicy && isBadgesEnabledByFeatureFlag;
}
export function isStarterBadgeEnabled() {
  return Boolean(Root.Runtime.hostConfig.devToolsGdpProfiles?.starterBadgeEnabled);
}
//# sourceMappingURL=GdpClient.js.map
