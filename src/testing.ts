/**
 * Test builds. The hidden test tools in Settings (seven taps on the
 * version line) and the "act as a free user" override exist only in
 * development, or when this phone's Pro comes from a sandbox purchase,
 * which is what TestFlight purchases are. An App Store purchase is never
 * sandbox, so the App Store build never shows the tools and ignores a
 * stored override. Kept apart from purchases.ts, which stays a copy of
 * the engine's.
 */
import Purchases from 'react-native-purchases';
import { ENTITLEMENT_ID, isBillingAvailable } from './purchases';

/** True when the active Pro entitlement is a sandbox (TestFlight) purchase. Unknown counts as no. */
export async function hasSandboxPro(): Promise<boolean> {
  if (!isBillingAvailable()) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID]?.isSandbox === true;
  } catch {
    return false;
  }
}
