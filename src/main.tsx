import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { router } from '@/app/router'
import { AuthProvider } from '@/providers/AuthProvider'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 45_000, retry: 1 } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={queryClient}><AuthProvider><MotionConfig reducedMotion="user">
    <RouterProvider router={router}/>
    <Toaster position="top-right" closeButton toastOptions={{ className: 'studio-toast' }}/>
  </MotionConfig></AuthProvider></QueryClientProvider></StrictMode>,
)
