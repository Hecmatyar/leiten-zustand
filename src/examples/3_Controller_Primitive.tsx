import { useEffect } from "react";
import { create } from "zustand";

import { leitenPrimitive } from "../controllers/leitenPrimitive";

interface IState {
  step: number;
  counter: { prev: number; next: number };
  callback: ((value: number) => void) | null;
}

const useExampleStore = create<IState>(() => ({
  step: 1,
  counter: { prev: 0, next: 2 },
  callback: null,
}));
const stepController = leitenPrimitive(useExampleStore, "step");
const counterController = leitenPrimitive(useExampleStore, "counter");
const callbackController = leitenPrimitive(useExampleStore, "callback");

const Example = () => {
  const { step, counter, callback } = useExampleStore();

  useEffect(() => {
    callbackController.set((value: number) => {
      alert(value);
    });
  }, []);

  const handleNextStep = () => {
    stepController.set(step + 1);
  };

  const handleCounter = () => {
    counterController.set({ next: counter.next + 2, prev: counter.prev + 3 });
  };

  return (
    <>
      step: {step}
      <button onClick={handleNextStep}>Next Step</button>
      counter: next {counter.next}, previous: {counter.prev}
      <button onClick={handleCounter}>Set counter</button>
      <button onClick={() => callback?.(step)}>Alert step</button>
    </>
  );
};
