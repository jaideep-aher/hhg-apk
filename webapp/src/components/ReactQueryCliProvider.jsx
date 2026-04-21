"use client"
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import React from 'react'

const queryClient = new QueryClient()

export const ReactQueryCliProvider = ({children}) => {
    return <QueryClientProvider client={queryClient}>
       {children}</QueryClientProvider>
    }