import type { ISetTokenAction } from './set-token-action.interface'

export interface IActions {
    actions: {
        removeToken: () => void
        setToken: (dto: ISetTokenAction) => void
    }
}
