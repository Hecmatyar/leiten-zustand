import { produce } from "immer";
import { get, isEqual, set } from "lodash-es";
import { nanoid } from "nanoid";
import { StoreApi } from "zustand";
import { shallow } from "zustand/shallow";

import { useLeitenRequests } from "../hooks/useLeitenRequest";
import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";
import {
  ILeitenLoading,
  ILoadingStatus,
  initialLeitenLoading,
} from "../interfaces/IContentLoading";

/* eslint-disable @typescript-eslint/no-explicit-any */

type UseRequestType<Payload, Result> = <U = ILeitenLoading<Payload, Result>>(
  selector?: (state: ILeitenLoading<Payload, Result>) => U,
  equals?: (a: U, b: U) => boolean
) => U;

export interface ILeitenRequest<Payload, Result>
  extends UseRequestType<Payload, Result> {
  abort: () => void;
  clear: () => void;
  action: (
    params: Payload,
    extraParams?: { status?: ILoadingStatus; requestId?: string }
  ) => void;
  set: (value: Partial<Result> | void, rewrite?: boolean) => void;
  key: string;
}

export interface ILeitenRequestCallback<Payload, Result> {
  previousResult: Result;
  result: Result;
  payload: Payload;
  requestId: string;
  error?: string;
}

export interface ILeitenRequestOptions<Payload, Result> {
  fulfilled?: (
    options: Omit<ILeitenRequestCallback<Payload, Result>, "error">
  ) => void;
  rejected?: (
    options: Omit<ILeitenRequestCallback<Payload, Result>, "result">
  ) => void;
  abort?: (
    options: Omit<ILeitenRequestCallback<Payload, Result>, "error" | "result">
  ) => void;
  resolved?: (
    options: Omit<ILeitenRequestCallback<Payload, Result>, "result" | "error">
  ) => void;
  action?: (
    options: Omit<ILeitenRequestCallback<Payload, Result>, "error" | "result">
  ) => void;
  initialStatus?: ILoadingStatus;
  optimisticUpdate?: (params: Payload) => Result;
}

export const leitenRequest = <
  Store extends object,
  P extends DotNestedKeys<Store>,
  Payload,
  Result
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
    extraArgument?: IExtraArgument
  ) => Promise<Result>,
  options?: ILeitenRequestOptions<Payload, Result>
): ILeitenRequest<Payload, Result> => {
  const key = nanoid(12);
  const initialContent: Result = get(store.getState(), path, null) as Result;
  const initialState = initialLeitenLoading<Payload, Result>(
    options?.initialStatus
  );

  const setState = (state: ILeitenLoading<Payload, Result>) => {
    useLeitenRequests.setState({ [key]: state });
  };
  setState(initialState); //init request

  const setContent = (content: Result) => {
    const nextState = produce(store.getState(), (draft) => {
      set(draft, path, content);
    });
    store.setState(nextState);
  };

  const getState = (): ILeitenLoading<Payload, Result> => {
    return useLeitenRequests.getState()[key] || initialState;
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
    }
  };

  let previousResult: Result = getContent();

  const reactions = {
    action: (payload: Payload, status?: ILoadingStatus, requestId?: string) => {
      setState({
        status: status ?? "loading",
        payload,
        error: undefined,
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
      if (requestId === state.requestId) {
        setState({ ...state, status: "loaded" });
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
      setState(initialState);
      options?.abort?.({ previousResult, requestId, payload });
      if (options?.optimisticUpdate) {
        setContent(previousResult);
      }
    },
    resolved: (payload: Payload, requestId: string) => {
      options?.resolved?.({ previousResult, requestId, payload });
    },
  };

  const { action, abort } = createAsyncActions(payloadCreator, reactions);

  const _abort = () => {
    abort();
  };

  const clear = () => {
    setState(initialState);
    setContent(initialContent);
  };

  const useRequest: UseRequestType<Payload, Result> = (selector, equals) => {
    return useLeitenRequests(
      (state) => (selector || nonTypedReturn)(state[key] || initialState),
      shallow || equals
    );
  };

  const resettable =
    (store.getState() as any)["_resettableLifeCycle"] !== undefined;
  if (resettable) {
    store.subscribe((next, prev) => {
      if (
        (next as any)["_resettableLifeCycle"] === false &&
        (prev as any)["_resettableLifeCycle"] === true
      )
        setState(initialState);
    });
  }

  return Object.assign(useRequest, {
    abort: _abort,
    action,
    clear,
    set: _set,
    key,
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nonTypedReturn = (value: any) => value;

function createAsyncActions<Payload, Result>(
  payloadCreator: (
    params: Payload,
    extraArgument?: IExtraArgument
  ) => Promise<Result>,
  extra?: IReaction<Payload, Result>
) {
  let controller = new AbortController();
  let signal = controller.signal;

  const abort = () => {
    controller.abort();
    controller = new AbortController();
    signal = controller.signal;
  };

  const action = (
    params: Payload,
    options?: { status?: ILoadingStatus; requestId?: string }
  ) => {
    const requestId = options?.requestId || nanoid();
    extra?.action?.(params, options?.status, requestId);
    payloadCreator(params, { signal })
      .then((result) => {
        extra?.fulfilled?.(result, params, requestId);
      })
      .catch((error) => {
        if (error.message === "The user aborted a request.") {
          extra?.abort?.(params, requestId);
        } else {
          extra?.rejected?.(params, error, requestId);
        }
      })
      .finally(() => {
        extra?.resolved?.(params, requestId);
      });
  };
  return { action, abort };
}

interface IReaction<Payload, Result> {
  fulfilled?: (result: Result, params: Payload, requestId: string) => void;
  rejected?: (params: Payload, error: string, requestId?: string) => void;
  abort?: (params: Payload, requestId: string) => void;
  resolved?: (params: Payload, requestId: string) => void;
  action?: (
    params: Payload,
    status?: ILoadingStatus,
    requestId?: string
  ) => void;
}

type IExtraArgument = {
  signal: AbortSignal;
  // requestId: string
};
