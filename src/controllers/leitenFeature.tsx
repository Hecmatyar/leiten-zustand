import { isEqual } from "lodash-es";
import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { create, UseBoundStore } from "zustand";

import { RestrictedStoreApi } from "../interfaces/pathTypes";

type IUseProps<DEPS> = DEPS extends void
  ? void
  : UseBoundStore<RestrictedStoreApi<DEPS>>;
type EmptyFunction = () => void;
type EffectCallback = () => void | EmptyFunction;

type IMount = {
  mount: (m: EffectCallback) => void;
};

type InnerAction = {
  _init: EffectCallback;
};

export interface IFeatureCreator<DEPS> extends IMount {
  useProps: UseBoundStore<RestrictedStoreApi<DEPS>> | IUseProps<DEPS>;
}

type Return<FEATURE, DEPS> = [
  (() => FEATURE) & {
    create: (useProps: IFeatureCreator<DEPS>["useProps"]) => FEATURE;
  },
  FC<
    PropsWithChildren<
      DEPS extends void
        ? { value?: DEPS | undefined }
        : {
            value: DEPS;
          }
    >
  > & {
    Unit: FC<PropsWithChildren<{ value: FEATURE }>>;
  },
];

type StaticReturn<FEATURE, DEPS, STATIC> = [
  Return<FEATURE, DEPS>[0],
  Return<FEATURE, DEPS>[1],
  () => STATIC,
];

const createSingleton = <SINGLETON,>(creator: (arg: IMount) => SINGLETON) => {
  const lazySingletonRef: { current: SINGLETON | null } = { current: null };

  const mountedRef = { current: 0 };

  const mountList: EffectCallback[] = [];
  const mount = (m: EffectCallback) => {
    mountList.push(m);
  };
  const unmountList: ReturnType<EffectCallback>[] = [];

  const _init = () => {
    if (mountedRef.current === 0) {
      mountList.forEach((m) => {
        unmountList.push(m());
      });
      mountList.length = 0;
    }
    mountedRef.current++;
    return () => {
      mountedRef.current--;
      Promise.resolve().then(() => {
        if (mountedRef.current === 0) {
          unmountList.forEach((un) => un?.());
          unmountList.length = 0;
          lazySingletonRef.current = null;
        }
      });
    };
  };

  const getSingleton = () => {
    if (!lazySingletonRef.current) {
      lazySingletonRef.current = creator({ mount });
      return lazySingletonRef.current;
    } else {
      return lazySingletonRef.current;
    }
  };

  return { getSingleton, _init };
};

export const leitenSingleton = <SINGLETON,>(
  creator: (arg: IMount) => SINGLETON,
) => {
  const singleton = createSingleton(creator);
  const useSingleton = () => {
    useEffect(singleton._init, []);
    return singleton.getSingleton();
  };
  return { ...singleton, useSingleton };
};

export function leitenFeature<FEATURE extends object, DEPS>(
  storeCreator: (deps: IFeatureCreator<DEPS>) => FEATURE,
): Return<FEATURE, DEPS>;
export function leitenFeature<FEATURE extends object, DEPS, STATIC>(
  syncCreator: (arg: IMount) => STATIC,
  asyncCreator: (deps: IFeatureCreator<DEPS>, _static: STATIC) => FEATURE,
): StaticReturn<FEATURE, DEPS, STATIC>;

export function leitenFeature<FEATURE extends object, DEPS, STATIC>(
  staticCreator:
    | ((deps: IFeatureCreator<DEPS>) => FEATURE)
    | ((arg: IMount) => STATIC),
  creator?: (deps: IFeatureCreator<DEPS>, _static: STATIC) => FEATURE,
): STATIC extends void
  ? Return<FEATURE, DEPS>
  : StaticReturn<FEATURE, DEPS, STATIC> {
  const storeCreator = (creator || staticCreator) as (
    deps: IFeatureCreator<DEPS>,
    _static: STATIC,
  ) => FEATURE;
  const _static = creator
    ? leitenSingleton(staticCreator as (arg: IMount) => STATIC)
    : undefined;

  const StoreContext = createContext<FEATURE | null>(null);

  const useFeature = () => {
    const store = useContext(StoreContext);
    if (!store) {
      throw new Error("[leitenFeature] The provider is not defined");
    }
    return store;
  };

  const UnitProvider = ({
    children,
    value,
  }: PropsWithChildren<{
    value: FEATURE & InnerAction;
  }>) => {
    useEffect(value._init, []);
    return (
      <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
    );
  };

  const _creator = (
    useProps: IFeatureCreator<DEPS>["useProps"],
  ): FEATURE & InnerAction => {
    const mountList: EffectCallback[] = [];
    const mount = (m: EffectCallback) => mountList.push(m);
    const _init = () => {
      const unmountList = mountList.map((m) => m());
      return () => {
        unmountList.forEach((un) => un?.());
      };
    };

    if (_static) {
      mount(_static._init);
    }

    return Object.assign(
      storeCreator({ useProps, mount }, _static?.getSingleton() as STATIC),
      {
        _init,
      },
    );
  };

  const StoreProvider = ({
    children,
    value,
  }: PropsWithChildren<
    DEPS extends void
      ? { value?: DEPS }
      : {
          value: DEPS;
        }
  >) => {
    const usePropsStore = useProps(value as DEPS);
    const [store] = useState(() => _creator(usePropsStore));

    useEffect(store._init, []);

    return (
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    );
  };

  const Provider = Object.assign(StoreProvider, { Unit: UnitProvider });

  const useHook = Object.assign(useFeature, { create: _creator });

  return (
    _static ? [useHook, Provider, _static.useSingleton] : [useHook, Provider]
  ) as STATIC extends void
    ? Return<FEATURE, DEPS>
    : StaticReturn<FEATURE, DEPS, STATIC>;
}

const useProps = <PROPS,>(props: PROPS) => {
  const [usePropsStore] = useState(() => create(() => props));
  useEffect(() => {
    if (!isEqual(props, usePropsStore.getState()))
      usePropsStore.setState(props);
  }, [props]);
  return usePropsStore;
};
