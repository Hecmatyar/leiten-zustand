import { create } from "zustand";

import { leitenList, leitenNormalizedList } from "../../helpers";
import { IKeyword } from "../requests";

interface IState {
  info: {
    keywords: IKeyword[];
    normalizedKeywords: Record<string, IKeyword>;
  };
}

const useExampleStore = create<IState>(() => ({
  info: {
    keywords: [],
    normalizedKeywords: {},
  },
}));

const listController = leitenList(useExampleStore, "info.keywords", {
  compare: (a, b) => a.value === b.value,
});
const normalizedListController = leitenNormalizedList(
  useExampleStore,
  "info.normalizedKeywords",
  { getKey: (item) => item.value }
);

const Keywords = () => {
  const keywords = useExampleStore((state) => state.info.keywords);

  return (
    <>
      {keywords?.map((k) => (
        <Keyword item={k} />
      ))}
      <button onClick={() => listController.add([{ value: "test", bid: 0 }])}>
        add
      </button>
    </>
  );
};

const Keyword = ({ item }: { item: IKeyword }) => {
  return (
    <>
      value:
      <input
        defaultValue={item.value}
        onChange={(e) =>
          listController.update({ value: e.target.value, bid: item.bid })
        }
      />
      bid: {item.bid}
      <br />
      <button onClick={() => listController.remove([item])}>remove</button>
    </>
  );
};
