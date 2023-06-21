import { produce } from "immer";
import { get, isArray, set } from "lodash-es";
import { StoreApi } from "zustand/esm";

import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";

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
): ILeitenList<ArrayElement<DotNestedValue<Store, P>>> => {
  type ITEM = ArrayElement<DotNestedValue<Store, P>>;
  let initialValue: ITEM[];
  setTimeout(() => {
    initialValue = get(store.getState(), path, "_empty") as ITEM[];
    if ((initialValue as any) === "_empty") {
      throw new Error(
        "[leitenList] The defined path does not match the required structure"
      );
    }
  }, 0);

  const compare = params?.compare || defaultCompareList;

  const setState = (value: ITEM[]) => {
    const draftState = produce(store.getState(), (draft) => {
      set(draft, path, value);
    });
    const nextState = params?.patchEffect
      ? { ...params.patchEffect(value), ...draftState }
      : draftState;
    store.setState(nextState);
    params?.sideEffect?.();
  };

  const getState = (): ITEM[] => {
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
        getState().every((item) => !compare(existing, item))
      );
      setState([...getState(), ...values]);
    } else {
      const values = getState().every((item) => !compare(items, item))
        ? [items]
        : [];
      setState([...getState(), ...values]);
    }
  };

  const clear = () => {
    setState(initialValue || []);
  };

  const remove = (items: ITEM[] | ITEM) => {
    if (Array.isArray(items)) {
      setState(
        getState().filter(
          (item) => !items.find((removeItem) => compare(item, removeItem))
        )
      );
    } else {
      setState(getState().filter((item) => !compare(item, items)));
    }
  };

  const filter = (validate: (item: ITEM) => boolean) => {
    setState(getState().filter(validate));
  };

  const update = (items: ITEM[] | ITEM) => {
    if (Array.isArray(items)) {
      setState(
        getState().map((existing) => {
          const item = items.find((item) => compare(existing, item));
          return item || existing;
        })
      );
    } else {
      setState(
        getState().map((existing) =>
          compare(existing, items) ? items : existing
        )
      );
    }
  };

  const toggle = (item: ITEM) => {
    const exist = !!getState().find((_item) => compare(item, _item));

    if (exist) {
      remove(item);
    } else {
      add(item);
    }
  };

  return { set: setState, clear, toggle, update, filter, remove, add };
};

const defaultCompareList = <ITEM>(left: ITEM, right: ITEM): boolean =>
  left === right;
