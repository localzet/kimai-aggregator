import { createContext, ReactNode, useEffect, useMemo, useState } from 'react'
import consola from 'consola/browser'

import { removeToken, useToken } from '@entities/session-store'
import { logoutEvents } from '@shared/emitters'
import { AuthContext } from '@shared/hoks/auth-context'
import { resetAllStores } from '@shared/hoks/store-wrapper'

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isInitialized, setIsInitialized] = useState(false)
    const [isLoggedOut, setIsLoggedOut] = useState(false)
    const token = useToken()

    const logoutUser = () => {
        if (isLoggedOut) {
            return
        }

        try {
            setIsLoggedOut(true)
            setIsAuthenticated(false)
            removeToken()
            resetAllStores()
        } finally {
            setIsLoggedOut(false)
        }
    }

    useEffect(() => {
        const unsubscribe = logoutEvents.subscribe(() => {
            logoutUser()
        })

        return unsubscribe
    }, [])

    useEffect(() => {
        ; (async () => {
            if (!token) {
                setIsAuthenticated(false)
                setIsInitialized(true)
                return
            }

            try {
                setIsAuthenticated(true)
                setIsLoggedOut(false)
            } catch (error) {
                console.error(error)
                logoutUser()
            } finally {
                setIsInitialized(true)
            }
        })()
    }, [token])

    const value = useMemo(
        () => ({ isAuthenticated, isInitialized, setIsAuthenticated }),
        [isAuthenticated, isInitialized]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
