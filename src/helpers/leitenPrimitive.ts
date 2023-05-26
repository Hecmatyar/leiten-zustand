import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand";

import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";

interface ILeitenPrimitiveEffects<VALUE, State> {
  patchEffect?: (value: VALUE) => Partial<State>;
  sideEffect?: (value: { prev: VALUE; next: VALUE }) => void;
}

export type ILeitenPrimitive<VALUE> = {
  set: (value: VALUE) => void;
  clear: () => void;
};

export const leitenPrimitive = <
  Store extends object,
  P extends DotNestedKeys<Store>
>(
  store: StoreApi<Store>,
  path: P extends string ? P : never,
  effects?: ILeitenPrimitiveEffects<DotNestedValue<Store, P>, Store>
): ILeitenPrimitive<DotNestedValue<Store, P>> => {
  type VALUE = DotNestedValue<Store, P>;
  const initialValue = get(store.getState(), path, "_empty") as
    | VALUE
    | "_empty";
  if (initialValue === "_empty") {
    throw new Error("[leitenPrimitive] The defined path does not exist");
  }

  const getState = (): VALUE => {
    const value = get(store.getState(), path, "_empty") as VALUE | "_empty";
    return value !== "_empty" ? value : initialValue;
  };

  const setState = (value: VALUE) => {
    const prev = getState();
    const draftState = produce(store.getState(), (draft) => {
      set(draft, path, value);
    });
    const nextState = effects?.patchEffect
      ? { ...effects.patchEffect(value), ...draftState }
      : draftState;
    store.setState(nextState);
    effects?.sideEffect?.({ prev, next: value });
  };

  const clear = () => {
    setState(initialValue);
  };

  return { set: setState, clear };
};
