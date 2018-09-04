import * as _ from "lodash";

export type MapperDirection = "fromDB" | "toDB";

export type KeyMapper = (
  name: string,
  direction: MapperDirection
) => string | undefined;

export function mapObjectKeys(
  data: any,
  direction: MapperDirection,
  mapper?: KeyMapper
): any {
  if (Array.isArray(data)) {
    return data.map(item => mapObjectKeys(item, direction, mapper));
  } else if (data != null && data.constructor === Object) {
    return Object.entries(data).reduce(
      (mapped, [k, v]) => {
        const mappedK = mapKey(k, direction, mapper);
        const mappedV =
          typeof v === "object" ? mapObjectKeys(v, direction, mapper) : v;
        mapped[mappedK] = mappedV;
        return mapped;
      },
      {} as any
    );
  } else {
    return data;
  }
}

export function mapKeys(
  keys: string[],
  direction: MapperDirection,
  mapper?: KeyMapper
): string[] {
  return keys.map(k => mapKey(k, direction, mapper));
}

export function mapKey(
  name: string,
  direction: MapperDirection,
  mapper?: KeyMapper
) {
  let mapped;
  if (mapper != null) {
    mapped = mapper(name, direction);
  }
  if (mapped == null) {
    mapped = defaultKeyMapper(name, direction);
  }

  return mapped;
}

function defaultKeyMapper(name: string, direction: MapperDirection) {
  if (name === "*") {
    return name;
  }
  return direction === "fromDB" ? _.camelCase(name) : _.snakeCase(name);
}
