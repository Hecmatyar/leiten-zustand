import { produce } from "immer";
import { get, isEqual, set } from "lodash-es";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { StoreApi } from "zustand";

import { createAsyncActions } from "../helpers/createAsyncAction";
import { IExtraArgument } from "../interfaces/IExtraArgument";
import {
  ILeitenLoading,
  initialLeitenLoading,
} from "../interfaces/ILeitenLoading";
import { ILoadingStatus } from "../interfaces/ILoadingStatus";
import { DotNestedKeys, DotNestedValue } from "../interfaces/pathTypes";
import { useLeitenRequestStore } from "../stores/useLeitenRequestStore";

type UseRequestType<Payload, Result> = <U = ILeitenLoading<Payload, Result>>(
  selector?: (state: ILeitenLoading<Payload, Result>) => U,
) => U;

export interface ILeitenRequest<Payload, Result>
  extends UseRequestType<Payload, Result> {
  abort: () => void;
  clear: () => void;
  action: (
    params: Payload,
    extraParams?: { status?: ILoadingStatus; requestId?: string },
  ) => void;
  set: (value: Partial<Result> | void, rewrite?: boolean) => void;
  key: string;
  get: () => ILeitenLoading<Payload, Result>;
}

export interface IRequestCallback<Payload, Result> {
  previousResult: Result;
  result: Result;
  payload: Payload;
  requestId: string;
  error?: string;
}

export interface ILeitenRequestOptions<Payload, Result> {
  fulfilled?: (
    options: Omit<IRequestCallback<Payload, Result>, "error" | "fetchError">,
  ) => void;
  rejected?: (
    options: Omit<IRequestCallback<Payload, Result>, "result">,
  ) => void;
  abort?: (
    options: Omit<
      IRequestCallback<Payload, Result>,
      "error" | "fetchError" | "result"
    >,
  ) => void;
  resolved?: (
    options: Omit<
      IRequestCallback<Payload, Result>,
      "result" | "error" | "fetchError"
    >,
  ) => void;
  action?: (
    options: Omit<
      IRequestCallback<Payload, Result>,
      "error" | "fetchError" | "result"
    >,
  ) => void;
  initialStatus?: ILoadingStatus;
  optimisticUpdate?: (params: Payload) => Result;
}

/**
 * Represents a Leiten Request.
 * @template Store - The type of the store object.
 * @template P - The type of the path.
 * @template Payload - The type of the payload.
 * @template Result - The type of the result.
 * @param {StoreApi<Store>} store - The store object.
 * @param {P} path - The path.
 * @param {(params: Payload, extraArgument?: IExtraArgument) => Promise<Result>} payloadCreator - The payload creator function.
 * @param {ILeitenRequestOptions<Payload, Result>} [options] - The options for the request.
 * @returns {ILeitenRequest<Payload, Result>} - The Leiten Request object.
 */
export const leitenRequest = <
  Store extends object,
  P extends DotNestedKeys<Store>,
  Payload,
  Result extends DotNestedValue<Store, P> | null | void,
>(
  store: StoreApi<Store>,
  path: P extends string
    ? Result extends void
      ? P
      : DotNestedValue<Store, P> extends Result | null
        ? P
        : never
    : never,
  payloadCreator: (
    params: Payload,
    extraArgument?: IExtraArgument,
  ) => Promise<Result>,
  options?: ILeitenRequestOptions<Payload, Result>,
): ILeitenRequest<Payload, Result> => {
  const key = nanoid(12);
  const initialState = initialLeitenLoading<Payload, Result>(
    options?.initialStatus,
  );
  const initialContent = get(store.getState(), path, null) as Result;

  const setState = (state: ILeitenLoading<Payload, Result>) => {
    useLeitenRequestStore.setState({ [key]: state });
  };
  setState(initialState); //init request

  const setContent = (content: Result) => {
    const nextState = produce(store.getState(), (draft) => {
      set(draft, path, content);
    });
    store.setState(nextState);
  };

  const getState = (): ILeitenLoading<Payload, Result> => {
    return useLeitenRequestStore.getState()[key] || initialState;
  };

  const getContent = (): Result => {
    const result = get(store.getState(), path, "_empty") as Result | "_empty";
    if (result !== "_empty") {
      return result || initialContent;
    } else {
      return initialContent;
    }
  };

  const _set = (value: Partial<Result> | void, rewrite = false) => {
    if (typeof value === "object") {
      const state = getContent();
      const objectContent = rewrite
        ? ({ ...value } as Result)
        : ({ ...state, ...value } as Result);
      const content = typeof value === "object" ? objectContent : value;
      setContent(content);
    } else {
      value !== undefined && value !== null && setContent(value);
    }
  };

  let previousResult: Result = getContent();

  const reactions = {
    action: (payload: Payload, status?: ILoadingStatus, requestId?: string) => {
      setState({
        status: status ?? "loading",
        payload,
        error: null,
        requestId: requestId,
      });
      options?.action?.({
        previousResult,
        requestId: requestId || "",
        payload,
      });
      previousResult = getContent();

      if (options?.optimisticUpdate) {
        setContent(options.optimisticUpdate(payload));
      }
    },
    fulfilled: (result: Result, payload: Payload, requestId: string) => {
      const state = getState();
      setState({ ...state, status: "loaded" });
      if (requestId === state.requestId) {
        if (
          result !== undefined &&
          (!options?.optimisticUpdate || !isEqual(previousResult, result))
        ) {
          setContent(result);
        }
        options?.fulfilled?.({ previousResult, requestId, payload, result });
      }
    },
    rejected: (payload: Payload, error: string, requestId?: string) => {
      const state = getState();
      setState({ ...state, status: "error", error });
      options?.rejected?.({
        previousResult,
        requestId: requestId || "",
        payload,
        error,
      });
      if (options?.optimisticUpdate) {
        setContent(previousResult);
      }
    },
    abort: (payload: Payload, requestId: string) => {
      const state = getState();
      if (state.requestId === requestId) {
        setState(initialState);
        options?.abort?.({ previousResult, requestId, payload });
        if (options?.optimisticUpdate) {
          setContent(previousResult);
        }
      }
    },
    resolved: (payload: Payload, requestId: string) => {
      options?.resolved?.({ previousResult, requestId, payload });
    },
  };

  const { action, abort } = createAsyncActions(payloadCreator, reactions);

  const clear = () => {
    setState(initialState);
    setContent(initialContent);
  };

  const usages: Record<string, boolean> = {};
  const useRequest: UseRequestType<Payload, Result> = (selector) => {
    const [id] = useState(() => nanoid());

    useEffect(() => {
      usages[id] = true;

      return () => {
        usages[id] = false;
      };
    }, []);

    return useLeitenRequestStore((state) =>
      (selector || nonTypedReturn)(state[key] || initialState),
    );
  };

  resettableStoreSubscription(store, () => setState(initialState));

  const _get = () => {
    return useLeitenRequestStore.getState()[key];
  };

  return Object.assign(useRequest, {
    abort,
    action,
    clear,
    set: _set,
    key,
    get: _get,
    _usages: usages,
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nonTypedReturn = (value: any) => value;

/* eslint-disable @typescript-eslint/no-explicit-any */
export const resettableStoreSubscription = (
  store: StoreApi<object>,
  callback: () => void,
) => {
  setTimeout(() => {
    const hasResettable =
      (store.getState() as any)["_resettableLifeCycle"] !== undefined;
    if (hasResettable) {
      store.subscribe((next: any, prev: any) => {
        if (next["_resettableLifeCycle"] !== prev["_resettableLifeCycle"])
          callback();
      });
    }
  }, 0);
};
