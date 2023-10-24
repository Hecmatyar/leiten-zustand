import { produce } from "immer";
import { get, set } from "lodash-es";
import { nanoid } from "nanoid";
import { StoreApi } from "zustand";

import {
  leitenModalManagerAction,
  useLeitenModalStack,
} from "../hooks/useLeitenModals";
import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";

type ActionType = "OPEN" | "CLOSE" | "TOGGLE" | "SET_DATA";

export interface ILeitenModal<Data> {
  open: (data?: Data, replace?: boolean) => void;
  close: () => void;
  action: (params: {
    type: ActionType;
    payload?: Data;
    replace?: boolean;
  }) => void;

  (): [boolean, boolean];
}

export const leitenModal = <
  Store extends object,
  P extends DotNestedKeys<Store>,
>(
  store: StoreApi<Store>,
  path: P extends string ? P : never,
  extra?: {
    reaction?: (params: {
      type: ActionType;
      payload?: DotNestedValue<Store, P>;
    }) => void;
    clearOnClose?: boolean;
  },
): ILeitenModal<DotNestedValue<Store, P>> => {
  type Data = DotNestedValue<Store, P>;

  const initialData = get(store.getState(), path, "_empty") as Data;
  if (initialData === "_empty") {
    throw new Error("[leitenModal] The defined path does not exist");
  }

  const key = nanoid(10);

  const setContent = (value: Data) => {
    const nextState = produce(store.getState(), (draft) => {
      set(draft, path, value);
    });
    store.setState(nextState);
  };

  const setState = (value: boolean, replace?: boolean) => {
    leitenModalManagerAction(key, value, replace);
  };

  const action = (params: {
    type: ActionType;
    payload?: Data;
    replace?: boolean;
  }) => {
    if (params.type === "CLOSE") {
      setState(false);
      if (extra?.clearOnClose) {
        setContent(initialData);
      }
    } else if (params.type === "OPEN") {
      setState(true, params.replace);
      params.payload && setContent(params.payload);
    } else if (params.type === "TOGGLE") {
      const isOpen = () => useLeitenModalStack.getState().queue.includes(key);

      setState(!isOpen());
      if (!isOpen() && extra?.clearOnClose) {
        setContent(initialData);
      }
    } else if (params.type === "SET_DATA") {
      params.payload && setContent(params.payload);
    }
    extra?.reaction?.(params);
  };

  const open = (data?: DotNestedValue<Store, P>, replace?: boolean) => {
    action({ type: "OPEN", payload: data, replace });
  };

  const close = () => action({ type: "CLOSE" });

  const useOpen = () => {
    return useLeitenModalStack((state) => {
      const open = state.queue.includes(key);
      const hidden = open && state.queue[state.queue.length - 1] !== key;
      return [open, hidden] as [boolean, boolean];
    });
  };

  return Object.assign(useOpen, { action, close, open });
};
