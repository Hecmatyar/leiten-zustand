import { produce } from "immer";
import { get, set } from "lodash-es";
import { StoreApi } from "zustand/esm";
import { useShallow } from "zustand/react/shallow";

import { useLeitenRequests } from "../hooks/useLeitenRequest";
import {
  ArrayElementType,
  DotNestedKeys,
  DotNestedValue,
  ValueOf,
} from "../interfaces/dotNestedKeys";
import {
  ILeitenLoading,
  ILoadingStatus,
  initialLeitenLoading,
} from "../interfaces/IContentLoading";
import {
  IExtraArgument,
  ILeitenRequest,
  ILeitenRequestOptions,
  leitenRequest,
  resettableStoreSubscription,
} from "./leitenRequest";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ILeitenGroupRequestParams<Params> {
  key: string;
  params: Params;
}

export interface IGroupCallOptions {
  status?: ILoadingStatus;
  requestId?: string;
}

export type AcceptableGroupRequestType<Store extends object> =
  void | DotNestedValue<Store, DotNestedKeys<Store>> | null;

type LeitenState<Payload, Result> = ILeitenLoading<
  ILeitenGroupRequestParams<Payload>,
  Result
>;

type UseRequestType<Payload, Result> = <U = LeitenState<Payload, Result>>(
  key: string,
  selector?: (state: LeitenState<Payload, Result>) => U,
) => U;

type UseGroupRequestType<Payload, Result> = <U = LeitenState<Payload, Result>>(
  selector?: (state: Record<string, LeitenState<Payload, Result>>) => U,
) => U;

export type ILeitenGroupRequest<Payload, Result> = {
  clear: (key?: string) => void;
  action: (
    params: ILeitenGroupRequestParams<Payload>[],
    options?: IGroupCallOptions,
  ) => void;
  requests: Record<
    string,
    ILeitenRequest<ILeitenGroupRequestParams<Payload>, Result>
  >;
} & UseRequestType<Payload, Result> &
  UseGroupRequestType<Payload, Result>;

export interface ILeitenGroupRequestOption<Payload, Result>
  extends ILeitenRequestOptions<ILeitenGroupRequestParams<Payload>, Result> {
  initialContent?: Result | ((key: string) => Result);
}

export interface ILeitenGroupRequestArrayOption<Payload, Result>
  extends ILeitenGroupRequestOption<Payload, Result> {
  getKey: (value: Result) => string;
}

export const leitenGroupRequest = <
  Store extends object,
  P extends DotNestedKeys<Store>,
  Payload,
  Result extends DotNestedValue<Store, P> extends Record<
    string,
    AcceptableGroupRequestType<Store>
  >
    ? ValueOf<DotNestedValue<Store, P>>
    : ArrayElementType<DotNestedValue<Store, P>>,
>(
  store: StoreApi<Store>,
  path: P extends string
    ? Result extends void
      ? P
      : DotNestedValue<Store, P> extends Record<string, Result> | Array<any>
      ? P
      : never
    : never,
  payloadCreator: (
    params: ILeitenGroupRequestParams<Payload>,
    extraArgument?: IExtraArgument,
  ) => Promise<Result>,
  options?: DotNestedValue<Store, P> extends Record<
    string,
    AcceptableGroupRequestType<Store>
  >
    ? ILeitenGroupRequestOption<Payload, Result>
    : ILeitenGroupRequestArrayOption<Payload, Result>,
): ILeitenGroupRequest<Payload, Result> => {
  const initialRequestState = initialLeitenLoading<
    ILeitenGroupRequestParams<Payload>,
    Result
  >(options?.initialStatus);
  let requests: Record<
    string,
    ILeitenRequest<ILeitenGroupRequestParams<Payload>, Result>
  > = {};

  const isArray = Array.isArray(get(store.getState(), path));

  const getPathToArrayItem = (key: string) => {
    const raw = get(store.getState(), path, []);
    const source = Array.isArray(raw) ? raw : [];
    const find = source.findIndex(
      (s) =>
        (options as ILeitenGroupRequestArrayOption<Payload, Result>)?.getKey?.(
          s,
        ) === key,
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
      payload = async (
        params: ILeitenGroupRequestParams<Payload>,
        extraArgument?: IExtraArgument,
      ) => {
        const result = await payloadCreator(params, extraArgument);
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

      if (options?.initialContent) {
        const initial = checkInitial(options.initialContent)
          ? options.initialContent(key)
          : options.initialContent;
        const nextState = produce(store.getState(), (draft) => {
          set(draft, pathWithKey, initial);
        });
        store.setState(nextState);
      }
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    requests[key] = leitenRequest(store, pathWithKey, payload, options);
  };

  const action = (
    params: ILeitenGroupRequestParams<Payload>[],
    options?: IGroupCallOptions,
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
      const nextState = produce(store.getState(), (draft) => {
        set(draft, path, {});
      });
      store.setState(nextState);
      requests = {};
    }
  };

  const useRequest: UseRequestType<Payload, Result> = (key, selector) => {
    return useLeitenRequests((state) => {
      const id = requests[key]?.key;
      return (selector || nonTypedReturn)(
        (id && state[id]) || initialRequestState,
      );
    });
  };

  const useGroupRequest: UseGroupRequestType<Payload, Result> = (selector) => {
    return useLeitenRequests(
      useShallow((state: Record<string, LeitenState<Payload, Result>>) => {
        const keys = Object.entries(requests).map(([id, value]) => ({
          id,
          key: value.key,
        }));
        const requestsStore: typeof state = keys.reduce(
          (acc, { id, key }) => {
            return Object.assign(acc, { [id]: state[key] });
          },
          {} as typeof state,
        );

        return (selector || nonTypedReturn)(requestsStore);
      }),
    );
  };

  function hook<Payload, Result, U = LeitenState<Payload, Result>>(
    key: string,
    selector?: (state: LeitenState<Payload, Result>) => U,
  ): U;
  function hook<Payload, Result, U = LeitenState<Payload, Result>>(
    selector?: (state: Record<string, LeitenState<Payload, Result>>) => U,
  ): U;
  function hook<Payload, Result, U = LeitenState<Payload, Result>>(
    first?:
      | string
      | ((state: Record<string, LeitenState<Payload, Result>>) => U),
    second?:
      | ((state: LeitenState<Payload, Result>) => U)
      | ((a: U, b: U) => boolean),
  ): U {
    if (first !== undefined && typeof first === "string") {
      return useRequest(first, second as any);
    } else {
      return useGroupRequest(first as any) as any;
    }
  }

  resettableStoreSubscription(store, () => clear());

  return Object.assign(hook, { clear, action, requests, call: action });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nonTypedReturn = (value: any) => value;
const checkInitial = <Result>(
  value: Result | ((key: string) => Result),
): value is (key: string) => Result => typeof value === "function";
