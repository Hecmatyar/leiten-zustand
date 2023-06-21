import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand/esm";
import { shallow } from "zustand/shallow";

import { useLeitenRequests } from "../hooks/useLeitenRequest";
import { DotNestedKeys, DotNestedValue } from "../interfaces/dotNestedKeys";
import {
  ILeitenLoading,
  ILoadingStatus,
  initialLeitenLoading,
} from "../interfaces/IContentLoading";
import {
  ILeitenRequest,
  ILeitenRequestOptions,
  leitenRequest,
} from "./leitenRequest";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ILeitenGroupRequestParams<Params> {
  key: string;
  params: Params;
}

interface ICallOptions {
  status?: ILoadingStatus;
  requestId?: string;
}

type LeitenState<Payload, Result> = ILeitenLoading<
  ILeitenGroupRequestParams<Payload>,
  Result
>;

type UseRequestType<Payload, Result> = <U = LeitenState<Payload, Result>>(
  key: string,
  selector?: (state: LeitenState<Payload, Result>) => U,
  equals?: (a: U, b: U) => boolean
) => U;

type UseGroupRequestType<Payload, Result> = <U = LeitenState<Payload, Result>>(
  selector?: (state: Record<string, LeitenState<Payload, Result>>) => U,
  equals?: (a: U, b: U) => boolean
) => U;

export type ILeitenGroupRequest<Payload, Result> = {
  clear: (key?: string) => void;
  call: (
    params: ILeitenGroupRequestParams<Payload>[],
    options?: ICallOptions
  ) => void;
  requests: Record<
    string,
    ILeitenRequest<ILeitenGroupRequestParams<Payload>, Result>
  >;
} & UseRequestType<Payload, Result> &
  UseGroupRequestType<Payload, Result>;

interface ILeitenGroupRequestOption<Payload, Result>
  extends ILeitenRequestOptions<ILeitenGroupRequestParams<Payload>, Result> {
  initialContent?: Result;
}

interface ILeitenGroupRequestArrayOption<Payload, Result>
  extends ILeitenGroupRequestOption<Payload, Result> {
  getKey: (value: Result) => string;
}

export const leitenGroupRequest = <
  Store extends object,
  P extends DotNestedKeys<Store>,
  Payload,
  Result
>(
  store: StoreApi<Store>,
  path: P extends string
    ? DotNestedValue<Store, P> extends Record<string, Result> | Array<Result>
      ? P
      : never
    : never,
  payloadCreator: (
    params: ILeitenGroupRequestParams<Payload>
  ) => Promise<Result>,
  options?: DotNestedValue<Store, P> extends Record<string, Result>
    ? ILeitenGroupRequestOption<Payload, Result>
    : ILeitenGroupRequestArrayOption<Payload, Result>
): ILeitenGroupRequest<Payload, Result> => {
  const initialRequestState = initialLeitenLoading<
    ILeitenGroupRequestParams<Payload>,
    Result
  >(options?.initialStatus);
  let requests: Record<
    string,
    ILeitenRequest<ILeitenGroupRequestParams<Payload>, Result>
  > = {};

  let isArray: boolean;
  setTimeout(() => {
    isArray = Array.isArray(get(store.getState(), path));
  }, 0);

  const getPathToArrayItem = (key: string) => {
    const source = get(store.getState(), path, []);
    const find = source.findIndex(
      (s) =>
        (options as ILeitenGroupRequestArrayOption<Payload, Result>)?.getKey?.(
          s
        ) === key
    );
    const index = find !== -1 ? find : source.length;
    const withKey = (path + `["${index}"]`) as DotNestedKeys<Store>;
    return { withKey, isNew: find === -1 };
  };

  const add = (key: string) => {
    let pathWithKey = "" as DotNestedKeys<Store>;
    let payload = payloadCreator;
    if (isArray) {
      const before = getPathToArrayItem(key);
      pathWithKey = before.withKey;
      // eslint-disable-next-line
      // @ts-ignore
      payload = async (params: ILeitenGroupRequestParams<Payload>) => {
        const result = await payloadCreator(params);
        const after = getPathToArrayItem(key);
        if ((before.isNew && after.isNew) || !after.isNew) {
          const nextState = produce(store.getState(), (draft) => {
            set(draft, after.withKey, result);
          });
          store.setState(nextState);
        }
      };
    } else {
      pathWithKey = (path + `.${key}`) as DotNestedKeys<Store>;
      const nextState = produce(store.getState(), (draft) => {
        set(draft, pathWithKey, options?.initialContent ?? null);
      });
      store.setState(nextState);
    }
    requests[key] = leitenRequest(store, pathWithKey, payload, options);
  };

  const call = (
    params: ILeitenGroupRequestParams<Payload>[],
    options?: ICallOptions
  ) => {
    params.forEach(({ key, params }) => {
      const request = requests[key];
      const payload = { key, params };

      if (request && !isArray) {
        request.action(payload, options);
      } else {
        add(key);
        requests[key].action(payload);
      }
    });
  };

  const clear = (key?: string) => {
    if (key) {
      !isArray && requests[key].clear();
      delete requests[key];
    } else {
      set(store, path, {});
      requests = {};
    }
  };

  const useRequest: UseRequestType<Payload, Result> = (
    key,
    selector,
    equals
  ) => {
    return useLeitenRequests((state) => {
      const id = requests[key]?.key;
      return (selector || nonTypedReturn)(
        (id && state[id]) || initialRequestState
      );
    }, shallow || equals);
  };

  const useGroupRequest: UseGroupRequestType<Payload, Result> = (
    selector,
    equals
  ) => {
    return useLeitenRequests(
      (state: Record<string, LeitenState<Payload, Result>>) => {
        const keys = Object.entries(requests).map(([id, value]) => ({
          id,
          key: value.key,
        }));
        const requestsStore: typeof state = keys.reduce((acc, { id, key }) => {
          return Object.assign(acc, { [id]: state[key] });
        }, {} as typeof state);

        return (selector || nonTypedReturn)(requestsStore);
      },
      shallow || equals
    );
  };

  function hook<Payload, Result, U = LeitenState<Payload, Result>>(
    key: string,
    selector?: (state: LeitenState<Payload, Result>) => U,
    equals?: (a: U, b: U) => boolean
  ): U;
  function hook<Payload, Result, U = LeitenState<Payload, Result>>(
    selector?: (state: Record<string, LeitenState<Payload, Result>>) => U,
    equals?: (a: U, b: U) => boolean
  ): U;
  function hook<Payload, Result, U = LeitenState<Payload, Result>>(
    first?:
      | string
      | ((state: Record<string, LeitenState<Payload, Result>>) => U),
    second?:
      | ((state: LeitenState<Payload, Result>) => U)
      | ((a: U, b: U) => boolean),
    third?: (a: U, b: U) => boolean
  ): U {
    if (first !== undefined && typeof first === "string") {
      return useRequest(first, second as any, third);
    } else {
      return useGroupRequest(first as any, second as any) as any;
    }
  }

  const resettable =
    (store.getState() as any)["_resettableLifeCycle"] !== undefined;
  if (resettable) {
    store.subscribe((next) => {
      if ((next as any)["_resettableLifeCycle"] === false) clear();
    });
  }

  return Object.assign(hook, { clear, call, requests });
};

const nonTypedReturn = (value: any) => value;
