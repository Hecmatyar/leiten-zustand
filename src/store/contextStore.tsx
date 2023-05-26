import { createContext, ReactNode, useContext, useState } from "react";
import { create, StateCreator, StoreApi, useStore } from "zustand";

export const leitenContext = <STATE, R>(
  state: StateCreator<STATE>,
  applyStore?: (store: StoreApi<STATE>) => R
) => {
  const StoreContext = createContext<{
    store: StoreApi<STATE> | null;
    withStore: R | null;
  }>({ store: null, withStore: null });
  const useZustandStore = <R,>(
    selector: (s: STATE) => R,
    equalityFn?: (a: R, b: R) => boolean
  ): R => {
    const { store } = useContext(StoreContext);
    if (!store) {
      throw new Error("[ZustandContextStore] The provider is not defined");
    }
    return useStore(store, selector, equalityFn);
  };
  const useZustandMeta = <T,>(selector: (withStore: R) => T) => {
    const { withStore } = useContext(StoreContext);
    if (!withStore) {
      throw new Error("[ZustandContextStore] The provider is not defined");
    }
    return selector(withStore);
  };
  const createStore = () => create<STATE>(state);

  const StoreProvider = ({ children }: { children: ReactNode }) => {
    const [store] = useState(createStore);
    const [withStore] = useState(() => applyStore?.(store) || null);
    return (
      <StoreContext.Provider value={{ store, withStore }}>
        {children}
      </StoreContext.Provider>
    );
  };

  return [useZustandStore, StoreProvider, useZustandMeta] as const;
};
