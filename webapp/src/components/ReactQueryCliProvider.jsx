"use client"
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import React from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
})

export const ReactQueryCliProvider = ({children}) => {
    return <QueryClientProvider client={queryClient}>
       {children}</QueryClientProvider>
    }
