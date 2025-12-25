export function createUrl(
  base: string,
  queryParams?: Record<string, number | string | undefined>,
  routeParams?: Record<string, number | string | undefined>,
) {
  const url = Object.entries(routeParams ?? {}).reduce(
    (acc, [key, value]) => acc.replaceAll(`:${key}`, String(value)),
    base,
  );

  if (!queryParams) return url;

  const query = new URLSearchParams();

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (value === 0) {
      query.append(key, "0");
      return;
    }

    const processedValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);

    query.append(key, processedValue);
  });

  return `${url}?${query.toString()}`;
}
