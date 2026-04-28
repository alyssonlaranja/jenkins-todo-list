import { getApiBaseUrl } from '@/shared/lib/api-helpers'
import type { ApiResponse } from '@/shared/lib/generic-results'
import { swrFetcher } from '@/shared/lib/swr-fetcher'
import type { Namespace } from '@/shared/types/license'

const API_BASE_URL = getApiBaseUrl()

/**
 * Namespace API Service
 *
 * Provides methods to interact with the Namespace API endpoints
 */
export const namespaceApi = {
  /**
   * Fetches namespaces for a specific user and license
   * @param userId - The user ID
   * @param licenseId - The license ID
   * @returns Promise with ApiResponse containing namespaces
   */
  getUserNamespacesByLicense: async (
    userId: string,
    licenseId: string
  ): Promise<ApiResponse<Namespace[]>> => {
    if (!userId || !licenseId) {
      return {
        succeeded: false,
        message: 'UserId and LicenseId are required',
        data: [],
        errors: null,
      }
    }

    // Match cockpit-portal endpoint format with pagination
    const url = `${API_BASE_URL}/api/Namespace/GetAllNamespacesByUserLicenseId/${licenseId}/${userId}?Page=1&PageSize=1000`

    try {
      return await swrFetcher<ApiResponse<Namespace[]>>(url)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error fetching namespaces'
      console.error('Error fetching namespaces by user and license:', message)
      return {
        succeeded: false,
        message,
        data: [],
        errors: { message },
      }
    }
  },

  /**
   * Fetches all namespaces for a specific license (admin only)
   * @param licenseId - The license ID
   * @returns Promise with the list of namespaces
   */
  getAllNamespacesByLicenseId: async (
    licenseId: string
  ): Promise<ApiResponse<Namespace[]>> => {
    const url = `${API_BASE_URL}/api/Namespace/GetAllNamespacesByLicenseId/${licenseId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch namespaces by license: ${response.statusText}`
      )
    }

    return response.json()
  },

  /**
   * Fetches a single namespace by ID
   * @param namespaceId - The namespace ID
   * @returns Promise with the namespace
   */
  getNamespaceById: async (
    namespaceId: string
  ): Promise<ApiResponse<Namespace>> => {
    const url = `${API_BASE_URL}/api/Namespace/GetNamespaceById/${namespaceId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch namespace: ${response.statusText}`)
    }

    return response.json()
  },
}
