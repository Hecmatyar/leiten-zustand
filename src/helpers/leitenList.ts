import { produce } from "immer";
import { get, isArray, set } from "lodash-es";
import { StoreApi } from "zustand/esm";

import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";
import { defaultCompareList } from "./leitenNormalizedList";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ILeitenList<ITEM> = {
  set: (items: ITEM[]) => void;
  add: (items: ITEM[] | ITEM) => void;
  remove: (items: ITEM[] | ITEM) => void;
  toggle: (item: ITEM) => void;
  update: (item: ITEM[] | ITEM) => void;
  clear: () => void;
  filter: (validate: (item: ITEM) => boolean) => void;
};
type ArrayElement<ArrType> = ArrType extends readonly (infer ElementType)[]
  ? ElementType
  : never;

export interface ILeitenListEffects<ITEM, State> {
  compare?: (left: ITEM, right: ITEM) => boolean;
  sideEffect?: () => void;
  patchEffect?: (items: ITEM[]) => Partial<State>;
}

export const leitenList = <
  Store extends object,
  P extends DotNestedKeys<Store>
>(
  store: StoreApi<Store>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path: P extends string
    ? DotNestedValue<Store, P> extends Array<any> | null
      ? P
      : never
    : never,
  params?: ILeitenListEffects<ArrayElement<DotNestedValue<Store, P>>, Store>
): ILeitenList<ArrayElement<DotNestedValue<Store, P>>> & {
  get: () => ArrayElement<DotNestedValue<Store, P>>[];
} => {
  type ITEM = ArrayElement<DotNestedValue<Store, P>>;
  const initialValue = get(store.getState(), path, "_empty") as ITEM[];
  if ((initialValue as any) === "_empty") {
    throw new Error(
      "[leitenList] The defined path does not match the required structure"
    );
  }

  const compare = params?.compare || defaultCompareList;

  const _set = (value: ITEM[]) => {
    const draftState = produce(store.getState(), (draft) => {
      set(draft, path, value);
    });
    const nextState = params?.patchEffect
      ? { ...draftState, ...params.patchEffect(value) }
      : draftState;
    store.setState(nextState);
    params?.sideEffect?.();
  };

  const _get = (): ITEM[] => {
    const array = get(store.getState(), path, initialValue);
    if (isArray(array)) {
      return array;
    } else {
      return [];
    }
  };

  const add = (items: ITEM[] | ITEM) => {
    if (Array.isArray(items)) {
      const values = items.filter((existing) =>
        _get().every((item) => !compare(existing, item))
      );
      _set([..._get(), ...values]);
    } else {
      const values = _get().every((item) => !compare(items, item))
        ? [items]
        : [];
      _set([..._get(), ...values]);
    }
  };

  const clear = () => {
    const nextState = produce(store.getState(), (draft) => {
      set(draft, path, initialValue || []);
    });
    store.setState(nextState);
  };

  const remove = (items: ITEM[] | ITEM) => {
    if (Array.isArray(items)) {
      _set(
        _get().filter(
          (item) => !items.find((removeItem) => compare(item, removeItem))
        )
      );
    } else {
      _set(_get().filter((item) => !compare(item, items)));
    }
  };

  const filter = (validate: (item: ITEM) => boolean) => {
    _set(_get().filter(validate));
  };

  const update = (items: ITEM[] | ITEM) => {
    if (Array.isArray(items)) {
      _set(
        _get().map((existing) => {
          const item = items.find((item) => compare(existing, item));
          return item || existing;
        })
      );
    } else {
      _set(
        _get().map((existing) => (compare(existing, items) ? items : existing))
      );
    }
  };

  const toggle = (item: ITEM) => {
    const exist = !!_get().find((_item) => compare(item, _item));

    if (exist) {
      remove(item);
    } else {
      add(item);
    }
  };

  return { set: _set, get: _get, clear, toggle, update, filter, remove, add };
};
