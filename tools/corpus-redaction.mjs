export const LOCATION_PARAMS = new Set(["zip", "zipCode", "lat", "long"]);
export const REDACTED = "[REDACTED]";

const secrets = new Set();

export const rememberSecret = (value) => {
  if (typeof value === "string" && value.length >= 6) secrets.add(value);
};

export const rememberedSecrets = () => [...secrets];

export function redactPath(path) {
  const [route, query] = path.split("?");
  if (!query) return route;
  const redacted = query.split("&").map((pair) => {
    const key = pair.slice(0, pair.indexOf("="));
    return LOCATION_PARAMS.has(key) ? `${key}=${REDACTED}` : pair;
  });
  return `${route}?${redacted.join("&")}`;
}

export function redactBody(value) {
  if (Array.isArray(value)) return value.map(redactBody);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        key === "distance" ? null : redactBody(inner),
      ]),
    );
  }
  return value;
}

export function redactSecrets(text) {
  return [...secrets].reduce(
    (acc, secret) => acc.split(secret).join(REDACTED),
    text,
  );
}
