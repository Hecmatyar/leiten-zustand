import { nanoid } from "nanoid";
import { ReactNode, useEffect } from "react";
import { StoreApi } from "zustand";

/** @deprecated use leitenFeature instead */
export const leitenResettable = <Store, _>(
  useStore: StoreApi<Store>,
  getState?: () => Store,
) => {
  const initialState = useStore.getState();
  useStore.setState({ _resettableLifeCycle: nanoid() } as Store);

  return ({ children }: { children?: ReactNode }) => {
    useEffect(() => {
      return () => {
        useStore.setState(
          { ...(getState?.() || initialState), _resettableLifeCycle: nanoid() },
          true,
        );
      };
    }, []);

    return <>{children}</>;
  };
};
