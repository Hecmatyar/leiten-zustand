import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand";

import { DotNestedKeys, DotNestedValue } from "../interfaces/pathTypes";

interface ILeitenConstructorActions<Target> {
  set: (value: Target) => void;
  get: () => Target;
  store: StoreApi<object>;
  // listen: () => void;
  initialValue: Target;
  _hook: () => null;
}

/**
 * Creates a constructor function for a Leiten primitive.
 *
 * @template Value - The type of the primitive value.
 * @template Signature - The type of the constructor signature.
 * @template Methods - The type of methods to be added to the primitive.
 * @param {Function} signature - The function to generate methods for the primitive.
 * @returns {Function} - The constructor function.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export const leitenConstructor = <Value, Signature extends any[], Methods extends Record<any, any>>(
  signature: (value: Signature, actions: ILeitenConstructorActions<Value>) => Methods,
) => {
  return <Store extends object, P extends DotNestedKeys<Store>>(
    store: StoreApi<Store>,
    path: P extends string ? (DotNestedValue<Store, P> extends Value ? P : never) : never,
    ...rest: Signature
  ) => {
    const initialValue = get(store.getState(), path, "_empty") as Value;
    if (initialValue === "_empty") {
      throw new Error("[leitenPrimitive] The defined path does not exist");
    }

    const _get = (): Value => {
      const value = get(store.getState(), path, "_empty") as Value | "_empty";
      return value !== "_empty" ? value : initialValue;
    };

    const _set = (next: Value) => {
      const nextState = produce(store.getState(), (draft) => {
        set(draft, path, next);
      });
      store.setState(nextState);
    };

    const _hook = () => null;

    return signature(rest, { initialValue, get: _get, set: _set, _hook, store });
  };
};

// type Params = [(value: number) => string, { onStart?: () => void }];

// const leitenExport = leitenConstructor(
//   ([payload, effects]: Params, { get, set }: ILeitenConstructorActions<string>) => {
//     const action = () => {
//       effects?.onStart?.();
//
//       const value = payload(12);
//       set(value);
//     };
//
//     return { action, get };
//   },
// );
//
// const useAuthStore = create(() => ({ test: { a: [{ a: 12 }, { a: 11 }], b: "12" } }));
// const controllers = leitenExport(useAuthStore, "test.b", () => "120", {
//   onStart: () => {
//     console.log(a);
//   },
// });
// const a = controllers.get();
