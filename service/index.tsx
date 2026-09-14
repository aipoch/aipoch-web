'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { type ReactNode, useState } from 'react'
import { API_URL } from '@/lib/config'
import { waitForBrowserMock } from '@/mocks/ready'

// Create the Axios instance.
export const apiClient = axios.create({
  baseURL: API_URL,
  // timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor.
apiClient.interceptors.request.use(
  async (config) => {
    await waitForBrowserMock()
    // Add an authentication token here when needed.
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Centralized error handling.
    if (error.response) {
      // API Error handled silently
    } else if (error.request) {
      // Network Error handled silently
    }
    return Promise.reject(error)
  }
)

// Create the QueryClient.
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // Five-minute cache freshness window.
        refetchOnWindowFocus: false,
        retry: 1
      }
    }
  })
}

// React Query provider component.
export function ApiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
