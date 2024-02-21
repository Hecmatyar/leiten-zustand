import { produce } from "immer";
import { create } from "zustand";

export interface LeitenModalManagerState {
  queue: string[];
}

export const useLeitenModalStack = create<LeitenModalManagerState>(() => ({
  queue: [],
}));

export const leitenModalManagerAction = (
  key: string,
  value: boolean,
  replace?: boolean,
) => {
  const nextState = produce(useLeitenModalStack.getState(), (draft) => {
    let queue = draft.queue.filter((modal) => modal !== key);
    if (replace) {
      queue = [];
    }
    if (value) {
      queue.push(key);
    }
    draft.queue = queue;
  });
  useLeitenModalStack.setState(nextState);
};
