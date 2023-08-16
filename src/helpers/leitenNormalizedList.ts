import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand/esm";

import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";
import { ILeitenList } from "./leitenList";

/* eslint-disable @typescript-eslint/no-explicit-any */

type NormalizedType<ITEM> = Record<string, ITEM>;
type ValueOf<T> = T extends Record<infer _K, infer V> ? V : never;

export const leitenNormalizedList = <
  Store extends object,
  P extends DotNestedKeys<Store>
>(
  store: StoreApi<Store>,
  path: P extends string
    ? DotNestedValue<Store, P> extends Record<string, unknown>
      ? P
      : never
    : never,
  params: {
    compare?: (
      left: ValueOf<DotNestedValue<Store, P>>,
      right: ValueOf<DotNestedValue<Store, P>>
    ) => boolean;
    sideEffect?: () => void;
    patchEffect?: (
      items: NormalizedType<ValueOf<DotNestedValue<Store, P>>>
    ) => Partial<Store>;
    getKey: (item: ValueOf<DotNestedValue<Store, P>>) => string;
  }
): ILeitenList<ValueOf<DotNestedValue<Store, P>>> & {
  removeByKey: (value: string | string[]) => void;
  get: () => NormalizedType<ValueOf<DotNestedValue<Store, P>>>;
} => {
  type ITEM = ValueOf<DotNestedValue<Store, P>>;

  const initialValue = get(
    store.getState(),
    path,
    "_empty"
  ) as NormalizedType<ITEM>;
  if ((initialValue as any) === "_empty" || typeof initialValue !== "object") {
    throw new Error(
      "[leitenNormalizedList] The defined path does not match the required structure"
    );
  }

  const compare = params?.compare || defaultCompareList;

  const setState = (value: NormalizedType<ITEM>) => {
    const draftState = produce(store.getState(), (draft) => {
      set(draft, path, value);
    });
    const nextState = params?.patchEffect
      ? { ...draftState, ...params.patchEffect(value) }
      : draftState;
    store.setState(nextState);
    params?.sideEffect?.();
  };

  const _get = (): NormalizedType<ITEM> => {
    const list = get(store.getState(), path, "_empty") as
      | NormalizedType<ITEM>
      | "_empty";
    if (list !== "_empty") {
      return list;
    } else {
      return initialValue;
    }
  };

  const getMap = (items: ITEM[]): NormalizedType<ITEM> => {
    return items.reduce<NormalizedType<ITEM>>((acc, val) => {
      const key = params.getKey(val);
      acc[key] = val;
      return acc;
    }, {});
  };

  const _set = (items: ITEM[]) => {
    setState(getMap(items));
  };

  const add = (items: ITEM | ITEM[]) => {
    setState({
      ..._get(),
      ...getMap(Array.isArray(items) ? items : [items]),
    });
  };

  const clear = () => {
    const nextState = produce(store.getState(), (draft) => {
      set(draft, path, initialValue);
    });
    store.setState(nextState);
  };

  const removeByKey = (removeKeys: string[] | string) => {
    const acc: NormalizedType<ITEM> = {};
    for (const [key, item] of Object.entries(_get())) {
      if (
        Array.isArray(removeKeys)
          ? !removeKeys.includes(key)
          : removeKeys !== key
      ) {
        acc[key] = item;
      }
    }
    setState(acc);
  };

  const remove = (remove: ITEM[] | ITEM) => {
    const acc: NormalizedType<ITEM> = {};
    for (const [key, item] of Object.entries(_get())) {
      if (
        Array.isArray(remove)
          ? !remove.some((i) => compare(item, i))
          : !compare(item, remove)
      ) {
        acc[key] = item;
      }
    }
    setState(acc);
  };

  const filter = (validate: (item: ITEM) => boolean) => {
    setState(
      Object.fromEntries(
        Object.entries(_get()).filter(([_, item]) => validate(item))
      )
    );
  };

  const update = (items: ITEM[] | ITEM) => {
    const updated = getMap(Array.isArray(items) ? items : [items]);
    setState({ ..._get(), ...updated });
  };

  const toggle = (item: ITEM) => {
    const key = params.getKey(item);
    const isChecked = key in _get();

    if (isChecked) {
      removeByKey(key);
    } else {
      add(item);
    }
  };

  return {
    set: _set,
    get: _get,
    clear,
    toggle,
    update,
    filter,
    remove,
    add,
    removeByKey,
  };
};

export const defaultCompareList = <ITEM>(left: ITEM, right: ITEM): boolean =>
  left === right;
