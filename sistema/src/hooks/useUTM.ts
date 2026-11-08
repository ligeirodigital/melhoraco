import { getAttribution, type Attribution } from "@/lib/attribution";
export type UTMData = Attribution;
/** Compatibility export; the sole attribution implementation is attribution.ts. */
export const useUTM = () => getAttribution();
