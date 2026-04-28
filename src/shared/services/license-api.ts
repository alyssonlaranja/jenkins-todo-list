import { getApiBaseUrl } from '@/shared/lib/api-helpers'
import type { ApiResponse } from '@/shared/lib/generic-results'
import { swrFetcher } from '@/shared/lib/swr-fetcher'
import type { License } from '@/shared/types/license'

const API_BASE_URL = getApiBaseUrl()

/**
 * License API Service
 *
 * Provides methods to interact with the License API endpoints
 */
export const licenseApi = {
  /**
   * Fetches all licenses for a specific user
   * @param userId - The user ID to fetch licenses for
   * @returns Promise with ApiResponse containing licenses
   */
  getUserLicenses: async (userId: string): Promise<ApiResponse<License[]>> => {
    if (!userId) {
      return {
        succeeded: false,
        message: 'User ID is required to fetch licenses',
        data: [],
        errors: null,
      }
    }

    // Match cockpit-portal endpoint format
    const url = `${API_BASE_URL}/api/ActiveDirectoryUser/${userId}/licenses`

    try {
      return await swrFetcher<ApiResponse<License[]>>(url)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to fetch user licenses:', error)
      return {
        succeeded: false,
        message: errorMessage,
        data: [],
        errors: { message: errorMessage },
      }
    }
  },

  /**
   * Fetches all licenses (admin only)
   * @returns Promise with the list of all licenses
   */
  getAllLicenses: async (): Promise<ApiResponse<License[]>> => {
    const url = `${API_BASE_URL}/api/License/GetAllLicenses`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch all licenses: ${response.statusText}`)
    }

    return response.json()
  },
}
