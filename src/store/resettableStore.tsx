import { ReactNode, useEffect } from "react";
import { StoreApi } from "zustand";

export const leitenResettable = <Store, _>(
  useStore: StoreApi<Store>,
  getState?: () => Store
) => {
  const initialState = useStore.getState();
  useStore.setState({ _resettableLifeCycle: false } as Store);

  return ({ children }: { children?: ReactNode }) => {
    useEffect(() => {
      const reset = { _resettableLifeCycle: true } as Store;
      useStore.setState(reset);

      return () => {
        useStore.setState(
          { ...(getState?.() || initialState), _resettableLifeCycle: false },
          true
        );
      };
    }, []);

    return <>{children}</>;
  };
};
