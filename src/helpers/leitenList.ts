import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand/esm";

import {
  ArrayElementType,
  DotNestedKeys,
  DotNestedValue,
  NormalizedType,
  ValueOf,
} from "../interfaces/dotNestedKeys";
import { AcceptableGroupRequestType } from "./leitenGroupRequest";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ILeitenList<ITEM> = {
  set: (items: ITEM[]) => void;
  add: (items: ITEM[] | ITEM) => void;
  remove: (items: ITEM[] | ITEM | string | string[]) => void;
  toggle: (item: ITEM) => void;
  update: (item: ITEM[] | ITEM) => void;
  clear: () => void;
  filter: (validate: (item: ITEM) => boolean) => void;
};

export interface ILeitenListOptions<ITEM, State, SET> {
  compare?: (left: ITEM, right: ITEM) => boolean;
  sideEffect?: () => void;
  patchEffect?: (items: SET) => Partial<State>;
}

export interface ILeitenNormalizedListOptions<ITEM, State, SET>
  extends ILeitenListOptions<ITEM, State, SET> {
  getKey: (item: ITEM) => string;
}

export const leitenList = <
  Store extends object,
  P extends DotNestedKeys<Store>,
  ITEM extends DotNestedValue<Store, P> extends Record<
    string,
    AcceptableGroupRequestType<Store>
  >
    ? ValueOf<DotNestedValue<Store, P>>
    : ArrayElementType<DotNestedValue<Store, P>>,
  SET extends DotNestedValue<Store, P> extends Record<
    string,
    AcceptableGroupRequestType<Store>
  >
    ? NormalizedType<ITEM>
    : ITEM[],
>(
  store: StoreApi<Store>,
  path: P extends string
    ? ITEM extends void
      ? P
      : DotNestedValue<Store, P> extends Record<string, any> | Array<any>
        ? P
        : never
    : never,
  options?: DotNestedValue<Store, P> extends Record<
    string,
    AcceptableGroupRequestType<Store>
  >
    ? ILeitenNormalizedListOptions<ITEM, Store, SET>
    : ILeitenListOptions<ITEM, Store, SET>,
): ILeitenList<ITEM> & { get: () => SET } => {
  const initialValue = get(store.getState(), path, "_empty") as SET;
  if ((initialValue as any) === "_empty" || typeof initialValue !== "object") {
    throw new Error(
      "[leitenList] The defined path does not match the required structure",
    );
  }
  const isArray = Array.isArray(initialValue);
  const compare = options?.compare || defaultCompareList;
  const getKey = (options as ILeitenNormalizedListOptions<ITEM, Store, SET>)
    ?.getKey;

  const _setState = (value: SET) => {
    const draftState = produce(store.getState(), (draft) => {
      set(draft, path, value);
    });
    const nextState = options?.patchEffect
      ? { ...draftState, ...options.patchEffect(value) }
      : draftState;
    store.setState(nextState);
    options?.sideEffect?.();
  };

  const getState = (): SET => {
    const value = get(store.getState(), path, "_empty");
    if (value !== "_empty") {
      return value;
    } else {
      return initialValue;
    }
  };

  const _set = (items: ITEM[]) => {
    isArray
      ? _setState(items as SET)
      : _setState(_getMap(items, getKey) as SET);
  };

  const add = (items: ITEM[] | ITEM) => {
    if (isArray) {
      const values = Array.isArray(items)
        ? items.filter((existing) =>
            (getState() as ITEM[]).every((item) => !compare(existing, item)),
          )
        : (getState() as ITEM[]).every((item) => !compare(items, item))
          ? [items]
          : [];

      _setState([...(getState() as ITEM[]), ...values] as SET);
    } else {
      _setState({
        ...getState(),
        ..._getMap(Array.isArray(items) ? items : [items], getKey),
      });
    }
  };

  const clear = () => {
    const nextState = produce(store.getState(), (draft) => {
      set(draft, path, initialValue);
    });
    store.setState(nextState);
  };

  const remove = (items: ITEM[] | ITEM | string | string[]) => {
    if (isArray) {
      _setState(
        (getState() as ITEM[]).filter(
          (item) =>
            !_itemIsInArray(
              items,
              [typeof item === "string" ? item : getKey?.(item), item],
              compare,
            ),
        ) as SET,
      );
    } else {
      const acc: NormalizedType<ITEM> = {};
      for (const [key, item] of Object.entries(getState())) {
        if (!_itemIsInArray(items, [key, item], compare)) {
          acc[key] = item;
        }
      }
      _setState(acc as SET);
    }
  };

  const filter = (validate: (item: ITEM) => boolean) => {
    if (isArray) {
      _setState((getState() as ITEM[]).filter(validate) as SET);
    } else {
      _setState(
        Object.fromEntries(
          Object.entries(getState()).filter(([_, item]) => validate(item)),
        ) as SET,
      );
    }
  };

  const update = (items: ITEM[] | ITEM) => {
    if (isArray) {
      if (Array.isArray(items)) {
        _setState(
          (getState() as ITEM[]).map((existing) => {
            const item = items.find((item) => compare(existing, item));
            return item || existing;
          }) as SET,
        );
      } else {
        _setState(
          (getState() as ITEM[]).map((existing) =>
            compare(existing, items) ? items : existing,
          ) as SET,
        );
      }
    } else {
      const updated = _getMap(Array.isArray(items) ? items : [items], getKey);
      _setState({ ...getState(), ...updated });
    }
  };

  const toggle = (item: ITEM) => {
    const exist = isArray
      ? !!(getState() as ITEM[]).find((_item) => compare(item, _item))
      : getKey(item) in getState();

    exist ? remove(item) : add(item);
  };

  return {
    set: _set,
    get: getState,
    clear,
    toggle,
    update,
    filter,
    remove,
    add,
  };
};

export const defaultCompareList = <ITEM>(left: ITEM, right: ITEM): boolean =>
  left === right;

const _getMap = <ITEM>(
  items: ITEM[],
  getKey: (item: ITEM) => string,
): NormalizedType<ITEM> => {
  return items.reduce<NormalizedType<ITEM>>((acc, item) => {
    const key = getKey?.(item) || String(item);
    acc[key] = item;
    return acc;
  }, {});
};

const _itemIsInArray = <ITEM>(
  items: ITEM[] | ITEM | string | string[],
  [key, item]: [key: string, item: ITEM],
  compare: (left: ITEM, right: ITEM) => boolean,
) => {
  if (Array.isArray(items)) {
    items.some((i) => (typeof i === "string" ? i === key : compare(item, i)));
  } else {
    return typeof items !== "string" ? compare(item, items) : items === key;
  }
};
