type DotPrefix<T extends string> = T extends "" ? "" : `.${T}`;

export type DotNestedKeys<T> = (
  T extends object
    ? T extends Array<any>
      ? ""
      :
          | {
              [K in Exclude<keyof T, symbol>]: `${K}${DotPrefix<
                DotNestedKeys<T[K]>
              >}`;
            }[Exclude<keyof T, symbol>]
          | keyof T
    : ""
) extends infer D
  ? Extract<D, string>
  : never;

export type DotNestedValue<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  O extends Record<string, any>,
  Path extends string
> = Path extends `${infer Head}.${infer Tail}`
  ? DotNestedValue<O[Head], Tail>
  : O[Path];

export type ValueOf<T> = T extends Record<infer _K, infer V> ? V : never;
