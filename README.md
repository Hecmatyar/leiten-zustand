# Zustand controllers

> Helps to avoid using other state managers to execute requests and allows you to work efficiently with zustand.

The Zustand Fetching Helpers library provides a set of functions and controllers that facilitate working with Zustand, a
state management library. The functions described below are _**well-typed**_ and allow working with _**nested**_
objects. While Zustand suggests writing
custom [slices](https://github.com/pmndrs/zustand/blob/main/docs/guides/slices-pattern.md) to divide the store into
several parts, this library aims to simplify common data-related tasks without the need for additional state management
solutions.

To get a better understanding of what this library offers and how it works, you can refer to
the [live example on CodeSandbox](https://codesandbox.io/p/devbox/leiten-standard-example)
. In many cases, the provided controllers will help reduce the complexity of your store, eliminating the need to split
it into multiple parts.

## Installation

You can install the library using npm:

```bash
npm install leiten-zustand
```

Since "Zustand" translates to "state" in German, we decided to adhere to the same naming strategy and used the word "
leiten" (meaning "lead" and "manage") to denote our controllers.

Common view

```tsx
const useStore = create<IState>(() => ({ ... })); //clean store without actions
const useController = leiten[Controller](useStore, "dot.nested.path", [options]);
```

### Small Example

Let's create some fake example - load data and then change it.

#### Pure zustand

```tsx
const useStore = create<IStore>((set, get) => ({
  loadData: async (id: string) => {
    try {
      set({ loadingData: true })
      const response = await getData(id);
      set({ data: response })
    } catch {
      // Todo show error
    } finally {
      set({ loadingData: false })
    }
  },
  loadingData: false,
  data: { user: null, cards: [] },
  updateUser: (user: Partial<IUser>) => {
    set({ data: { ...get().data, user: { ...get().data?.user, ...user } } })
  },
  removeCard: (cardId: string) => {
    const cards = get().data.cards.filter(card => card.id !== cardId);
    set({ data: { ...get().data, cards } })
  }
}))
```

#### With leiten controllers

```tsx
import { leitenRequest, leitenRecord, leitenList } from "leiten-zustand"

const useStore = create<IStore>(() => ({
  data: { user: null, cards: [] },
}));

// loadData & loadingData
const useRequest = leitenRequest(useStore, "data", (id: string) => getData(id));
// updateUser
const userController = leitenRecord(useStore, "data.user");
// removeCard
const cardsController = leitenList(useStore, "data.cards", { compare: (a, b) => a.id == b.id });
```

Using "leiten" controllers empowers you to simplify your state management by removing redundant actions, eliminating
unnecessary states, and reducing the complexity of working with nested objects. By adopting "leiten" controllers you can
create a cleaner and more streamlined store structure, making it easier to manage and manipulate your application's
data.

All actions and states for your **zustand**
store. [Examples](https://github.com/Hecmatyar/leiten-zustand/tree/main/src/examples/controllers)

- [leitenRequest](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/controllers/1_Controller_Request.tsx)
  Helps handle requests (any async function) and catch errors. Returns a **hook** with request parameters and provides
  methods such as _action_, _clear_, _abort_, and _set_.
- [leitenGroupRequest](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/controllers/6_Controller_GroupRequest.tsx)
  Handles multiple similar requests dynamically. Returns a **hook** with two overloads and provides methods such
  as _action_ and _clear_. Can work with arrays as well as with the normalized list.
- [leitenRecord](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/controllers/2_Controller_Record.tsx)
  Works with objects and provides methods such as _set_, _patch_ and _clear_.
- [leitenPrimitive](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/controllers/3_Controller_Primitive.tsx)
  Works with data as if it were a primitive value, but it can be an object, function, or primitives. Provides methods
  such as _set_ and _clear_.
- [leitenList](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/controllers/4_Controller_List.tsx)
  Works with arrays and provides methods such as _set_, _clear_, _add_, _update_, _remove_, _toggle_, and _filter_. If
  the array item
  is an object, a **compare** function needs to be set in the controller's options (third parameter).
- [leitenModal](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/controllers/5_Controller_Modal.tsx)
  Helps work with modals and provides a built-in modal manager for cascading modals. Returns hooks
  with [openState, hiddenState] and provides methods such as _open_, _close_ and _action_.
- [leitenFilterRequest](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/controllers/7_Controller_FilterRequest.tsx)
  Same as **leitenRequest** but provide _createFilter_ and _listen_ methods, which allows you to create an
  unlimited number of filters for the request. The request will automatically start _action_ when the filter's _patch_
  method is called. Or in case _listen_, the request will be executed if the observed value changes.
- [leitenGroupFilterRequest](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/controllers/7_Controller_FilterRequest.tsx)
  Same as **leitenGroupRequest** but provide _createFilter_ method, which allows you to
  create an
  unlimited number of filters for the request. Works like leitenFilterRequest.

> All leitenControllers automatically infer the required types based on the specified path and will throw a **TypeScript
> error** if the provided path does not match the controller's requirements or established types.
>- Argument of type 'string' is not assignable to parameter of type 'never'.

⚠️ If you encounter an error when specifying the path to your field in the store, it is likely because you are
attempting to attach a controller to a field with an incompatible type. Please ensure that the field you are attaching
the controller to has a permitted type to resolve this issue.

Library well tree shaking and have dependencies from **immer**, **lodash-es** and **nanoid**

## Advanced

### Options

**leitenRecord**, **leitenPrimitive**, **leitenList** and **leitenNormalizedList** have options with callbacks:
_sideEffect_ and _patchEffect_. You can use them to extend basic functionality

```tsx
const useExampleStore = create<IState>(() => ({ user: null }));
const recordController = leitenRecord(useExampleStore, "user", {
  sideEffect: (value: { prev: IUser; next: IUser }) => {
    // you can execude here some side actions
  },
  patchEffect: (value: VALUE) => {
    // you can update your entire store here in one tick with value update
  },
});
```

**leitenRequest** and **leitenGroupRequest** have a useful reactions: _fulfilled_, _rejected_, _abort_, _resolved_
and _action_

```tsx
const useExampleStore = create<IState>(() => ({ user: null }));
const recordController = leitenRequest(useExampleStore, "user", async (id: string) => getUser(id), {
  fulfilled: ({ previousResult, result, payload }) => {
    // do something after successful request
  },
  rejected: ({ previousResult, error, payload }) => {
    // do something after error request
  },
  abort: ({ previousResult, payload }) => {
    // do something after request was aborted
  },
  resolved: ({ previousResult, payload }) => {
    // do something after request was resolved
  },
  action: ({ previousResult, payload }) => {
    // do something before request was called
  },
  optimisticUpdate: (payload) => {
    //if you use this callback, then leitenRequest will automatically switch to optimistic update mode  
  },
  initialStatus: ILoadingStatus // initial status if request, init by default
});
```

- leitenList - if you are using object then you also should specify **compare** function like in example
- leitenNormalizedList - in addition to the **compare** function, you also need to define the **getKey** function

### Store

The library provides wrappers
for [ContextStore](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/store/ContextStore.tsx)
and [ResettableStore](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/store/ResettableStore.tsx).
These wrappers can be used to enhance your Zustand store with additional features.

### FilterRequest

Usage example. There can be an unlimited number of filters. After the patch, inside
the **lateFilterRequest**, a comparison is made with the previous filter value and the request is executed. From one
filter
you can influence the state of other filters

```tsx
interface IState {
  users: IUser[];
  filter: IFilter;
  table: ITableFilter;
}

const useExampleStore = create<IState>(() => ({
  user: [],
  filter: { search: "" },
  table: { page: 1 }
}));

const useController = leitenFilterRequest(useExampleStore, "users", async () => {
  const props = useExampleStore().getState().filter.search;
  return getUser(props)
});

const filter = useController.createFilter("filter", {
  sideEffect: () => {
    useExampleStore.setState({ table: { page: 1 } })
  }
});
const tableFilter = useController.createFilter("table");

useController.listen(useAnotherStore, "period"); // create listener for the external store

const User = () => {
  useEffect(() => {
    //initial call
    useController.action();
  }, [])

  return <>
    <input onChange={event => filter.patch({ search: event.target.value })} />
    <UserTable />
  </>
}
```

### Request

All requests working with **useLeitenRequests**. Usually you will never need it, but if you need it, then the record is
stored there with all the query parameters. The request key is returned by each leitenRequest

```tsx
interface IState {
  user: IUser | null;
}

const useExampleStore = create<IState>(() => ({
  user: null,
}));

const useController = leitenRequest(useExampleStore, "user", getUser);

const User = () => {
  //  const status = useController(state => state.status) - the same
  const status = useLeitenRequests(state => state[useController.key].status)
  return <>{status}</>
}
```

leitenMap also can be helpful,
[example](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/controllers/6_Controller_GroupRequest.tsx)

### Group Request

leitenGroupRequest works equally well with both a normalized list and a regular array. If you are using an array, make
sure to specify the **getKey** function, as shown in the example
below. [Codesandbox link](https://codesandbox.io/p/devbox/fcdrs4) with arrays

```tsx
interface IStore {
  record: Record<string, ICard>,
  array: ICard[],
}

const useStore = create<IStore>(() => ({
  record: {},
  array: []
}));
const useRecordController = leitenGroupRequest(useStore, "record", (id: string) => getCard(id))
const useArrayController = leitenGroupRequest(useStore, "array", (id: string) => getCard(id), {
  getKey: (value) => value.id
})
```

leitenGroupRequest return overloaded hook

```tsx
interface IState {
  cards: Record<string, ICard>;
}

const useExampleStore = create<IState>(() => ({
  cards: {},
}));

export const useGroupController = leitenGroupRequest(
  useExampleStore,
  "cards",
  async (props: ILeitenGroupRequestParams<string>) => {
    return getCard(props.params);
  },
);

const status = useGroupController(id, (state) => state.status); //First param is key, better option
// or
const requests = useGroupController((state) => state); // Record with all requests
```