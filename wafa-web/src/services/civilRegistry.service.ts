import type { CivilRegistryRecord } from '../types';
import { apiRequest } from './apiClient';

/**
 * Calls the protected Laravel adapter. Official credentials and tokens must
 * remain on the backend and are never exposed to the browser.
 */
export function fetchCivilRegistry(identityOrName: string): Promise<CivilRegistryRecord> {
  return apiRequest<CivilRegistryRecord>(
    `/civil-registry/lookup?query=${encodeURIComponent(identityOrName)}`,
  );
}
