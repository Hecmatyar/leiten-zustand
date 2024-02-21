import { create } from "zustand";

import { leitenFilterRequest } from "../controllers/leitenFilterRequest";
import { getChart, IChartFilter } from "./requests";

interface IState {
  chart: number[];
  filter: IChartFilter;
}

const useExampleStore = create<IState>(() => ({
  chart: [],
  filter: {
    period: "today",
    type: "sales",
  },
}));

const useChartController = leitenFilterRequest(useExampleStore, "chart", () => {
  const filter = useExampleStore.getState().filter;
  return getChart(filter);
});

const filterController = useChartController.createFilter("filter");

const Example = () => {
  return (
    <>
      <Filter />
      <Chart />
    </>
  );
};

const Filter = () => {
  const user = useExampleStore((state) => state.filter);

  return user ? (
    <form>
      <select
        onChange={(value) =>
          filterController.patch({ period: value.target.value as any })
        }
      />
    </form>
  ) : null;
};

const Chart = () => {
  const data = useExampleStore((state) => state.chart);

  return <>{data}</>;
};
