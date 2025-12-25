export type QueryKey =
    | [string, Record<string, number | string | undefined>]
    | [string, string]
    | [string]
    | readonly string[]

export function getQueryKey(
    queryKey: QueryKey,
    route: Record<string, number | string | undefined> = {},
    query: Record<string, number | string | undefined> = {}
) {
    const [mainKey, otherKeys = {}] = queryKey
    const objectKeys = typeof otherKeys === 'object' ? otherKeys : {}

    return [mainKey, { ...objectKeys, ...route, ...query }]
}
