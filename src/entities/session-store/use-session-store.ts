import { createJSONStorage, devtools, persist } from 'zustand/middleware'
import { create } from 'zustand'

import { IActions, ISetTokenAction, IState } from './interfaces'

export const useSessionStore = create<IActions & IState>()(
    persist(
        devtools(
            (set) => ({
                accessToken: '',
                refreshToken: undefined,
                actions: {
                    setToken: (dto: ISetTokenAction) => {
                        set({ accessToken: dto.accessToken, refreshToken: dto.refreshToken })
                    },
                    removeToken: () => {
                        set({ accessToken: '', refreshToken: undefined })
                    }
                }
            }),
            { name: 'sessionStore', anonymousActionType: 'sessionStore' }
        ),
        {
            name: 'sessionStore',
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken
            }),
            storage: createJSONStorage(() => localStorage)
        }
    )
)

// Note: do NOT import or call into the axios module here —
// importing axios from the session store creates a circular dependency.
// The axios module subscribes to this store and will apply the Authorization header.

export const useAccessToken = () => useSessionStore((state) => state.accessToken)
// backwards compatibility alias
export const useToken = useAccessToken
export const useSessionStoreActions = () => useSessionStore((state) => state.actions)

export const setToken = (dto: ISetTokenAction) => useSessionStore.setState({ accessToken: dto.accessToken, refreshToken: dto.refreshToken })
export const removeToken = () => useSessionStore.getState().actions.removeToken()
export const useRefreshToken = () => useSessionStore((state) => state.refreshToken)
