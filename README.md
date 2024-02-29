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
const useRequest = leitenRequest(useStore, "data", async (id: string) => getData(id));
// includes update User method
const userController = leitenRecord(useStore, "data.user");
// includes remove Card method
const cardsController = leitenList(useStore, "data.cards", { compare: (a, b) => a.id == b.id });
```

Using "leiten" controllers empowers you to simplify your state management by removing redundant actions, eliminating
unnecessary states, and reducing the complexity of working with nested objects. By adopting "leiten" controllers you can
create a cleaner and more streamlined store structure, making it easier to manage and manipulate your application's
data.

All actions and states for your **zustand**
store. [Examples](https://github.com/Hecmatyar/leiten-zustand/tree/main/src/examples/controllers)

- [leitenRequest](https://github.com/Hecmatyar/leiten-zustand/blob/main/src/examples/controllers/1_Controller_Request.tsx)
  Helps handle requests (promises) and catch errors. Returns a **hook** with request parameters and provides
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

### Options

**leitenRecord**, **leitenPrimitive**, **leitenList** have options with callbacks:
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

⚠️If **leitenList** use with regular list (Array) then you should to provide **compare** function to provide the unique
id. For the normalized list (Record) you need to define the **getKey** function.

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
    // if you use this callback, then leitenRequest will automatically switch to optimistic update mode  
    // the result of this function will be immediately stored in storage and if the promise fails
    // it will be rolled back to the previous value
  },
  initialStatus: ILoadingStatus // initial status if request, 'init' by default
});
```

### FilterRequest

Usage example. There can be an unlimited number of filters. After the patch, inside
the **lateFilterRequest**, a comparison is made with the previous filter value and the request is executed. From one
filter you can influence the state of other filters

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
// listeners works only if you are use hook returned from leitenFilterRequest in some mounted component on the page 

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

All requests working with **useLeitenRequestStore**. Usually you will never need it, but if you need it, then the record
is
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
  const status = useLeitenRequestStore(state => state[useController.key].status)
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
const useRecordController = leitenGroupRequest(useStore, "record", async (id: string) => getCard(id))
const useArrayController = leitenGroupRequest(useStore, "array", async (id: string) => getCard(id), {
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

### Feature controller

The features developed via zustand is not modular enough and may have numerous dependencies (import of different zustand
stores) that developers may not be aware of. This causes significant problems and confusion when multiple people work on
the project's codebase. To provide developers with a way to create independent features and an efficient method for
identifying modularity issues, the **LeitenFeature** has been developed.

Example of a simple feature:

```tsx
interface IProps {
  authorId: string;
}

interface IState {
  comments: { id: string; text: string; author: string }[];
}

const [useFeature, FeatureProvider] = leitenFeature(
  ({ useProps, mount }: IFeatureCreator<IProps>) => {
    const useStore = create<IState>(() => ({ comments: [] }));
    const request = leitenFilterRequest(useStore, "comments", async (_: void) => {
      return [{ id: "1", text: "Hello", author: useProps.getState().authorId }];
    });

    // works like useEffect
    mount(request.action);
    // create listener on mount and stop when unmounted
    mount(() => request.listen(useProps, "authorId")); // the return value will be called when unmounted

    return { useStore };
  },
);
```

#### The feature code is isolated in its module

Now, all the code required for the feature is within a single scope and isolated

- If a developer sees diverse data and stores within the feature, splitting the feature into two is easier.
- Unwanted dependencies from external stores can be easily identified

#### One place where dependencies are passed to the feature

All external dependencies required by the feature are defined in the **useProps** store. This allows

- making informed decisions about the presence of external dependencies
- enables tracking all feature dependencies at once in a single file.

#### Controller and store names can be simplified

Since the feature has become isolated, it is possible to adopt a system of straightforward variable naming. For example,
useStore instead of **useAuthorCommentsStore**.

#### Reducing the number of useEffect

Now, inside the feature, **mount** method is available. Functions can be passed to them to be executed at the
corresponding stage of the feature's lifecycle. Method can be **called multiple** times, creating an array of functions
to execute. The passed function can return a function for unsubscribing

In addition, dependency subscriptions can also be handled within LeitenFeature, eliminating the need to move such
functionality into any specific component.

#### Props synchronization on the LeitenFeature side

LeitenFeature takes care of memoization and consolidating all dependencies into one store, freeing the developer from
manual dependency management.

#### Injections instead of singletons provide code reuse safety

If there is a need to use the same code in multiple features, there is no need to use a singleton store and engage in
the complex process of reusing a single store for different features.

```tsx
const [useFeature, FeatureProvider] = leitenFeature(
  ({}: IFeatureCreator<IProps>) => {
    const { useComments, request } = storeCreator();
    //some code
    return { useComments, ... };
  },
);

const [useSecondFeature, SecondFeatureProvider] = leitenFeature(
  ({ useProps, mount }: IFeatureCreator<IProps>) => {
    const { useComments, request } = storeCreator();
    //some code
    return { useComments, ... };
  },
);

const storeCreator = () => {
  const useComments = create<IState>(() => ({ comments: [] }));
  const request = leitenFilterRequest(useComments, "comments", async (_: void) => {
    return [{ id: "1", text: "Hello", author: "" }];
  });

  return { request, useComments };
};
```

Now, any store, action, and similar entities can be extracted into a separate function and safely injected into the
required feature. In the example, two different features use the same functionality, which they share **between
themselves**.

#### Tools for identifying architectural errors in code writing

In component code, there should be no imports from other features or singleton stores from previously written features.
This way, it can be guaranteed that the component code works only for one feature and operates independently of the
environment.

```tsx
const Component = (() => {
  const { useComments } = useFeature();
  const comments = useComments(state => state.comments); // right usage
  const user = useUser((s) => s.user); // incrorrect, extrenal store used

  return <span>{}</span>;
});
```

#### A wrapper component for your feature is needed

Feature - it is advisable to make it a memoized component. Inside, it contains the code of your feature. All
dependencies required by the **feature** must be passed in the _value_

```tsx
<FeatureProvider value={{ authorId: "name" }}>
  <Feature />
</FeatureProvider>
```

#### Interaction between features (Advanced usages)

Since there are no global stores now, the question arises of how to implement interaction between nested features. This
can be achieved through external feature management. For external management, a third parameter is required, which is
exported by **leitenFeature**.

```tsx
const [useUnit, UnitProvider] = leitenFeature(({}: IFeatureCreator<IProps>) => {
  const useComments = create<IState>(() => ({ comments: [] }));

  const request = leitenFilterRequest(useComments, "comments", async (_: void) => {
    return [{ id: "1", text: "Hello", author: "" }];
  });

  const action = () => {
    // code
  };

  return { useComments, action };
});

const [useParent, ParentProvider] = leitenFeature(({}: IFeatureCreator<IDeps>) => {
  // To do this we can write a simple helper
  const childDeps = create(() => ({ authorId: "123" }));
  const childUnit = useUnit.create(childDeps);

  const parentAction = () => {
    // code
    childUnit.action();
    // code
  };

  return { childUnit };
});
```

In the example, a feature **useUnit** is described, and we want to use it in the parent feature **useParent**. We will
use the third parameter **createUnit**, provided by the child feature, and create childUnit inside the parent feature.
Now, within the parent feature, we have access to all the functionality of **childUnit**, and we can use it.

Now, we need to make changes to the code of our provider.

```tsx
export const ParentUnit = () => {
  const { childUnit } = useParent();
  return (
    <>
      <UnitProvider.Unit value={childUnit}>
        <Feature />
      </UnitProvider.Unit>
    </>
  );
};
```

To use our **childUnit**, you need to pass it to the provider, updating its record beforehand and adding _.Unit_. Now,
our feature has become managed and will work in the context created for it by the parent feature.

In most cases, creating managed features is not required, but this option is provided if more complex interactions need
to be established.

#### Using static stores and methods

Each **leitenFeature** can have not only a set of dynamic data but also static data. Static data can be used as shared
data for all instances of _leitenFeature_ (for example, a modal window or a common data bus). Static data is needed to
be used for synchronization within all instances of _leitenFeature_ or outside the _leitenFeature_ context (use only
when absolutely necessary, do not abuse).

For using the static part of leitenFeature you should pass two functions into _leitenFeature_. The first one is the
**static** creator. The return value from this function is available as the second prop of the dynamic creator function.

```tsx
const [useUnit, UnitProvider, useStatic] = leitenFeature(
  ({ mount }) => { // static creator
    const useCommonStore = create<{ common: string }>(() => ({ common: "" }));
    const action = () => { /* code */
    };
    return { useCommonStore, action };
  },
  ({ useProps }: IFeatureCreator<IProps>, { useCommonStore }) => {
    const useComments = create<IState>(() => ({ comments: [] }));
    const request = leitenFilterRequest(useComments, "comments", async (_: void) => {
      return [{ id: "1", text: "Hello", author: "" }];
    });
    const action = () => { /* code */
    };
    return { useComments, action, useProps, request };
  },
);
```

Now you are able to use the static object of your leitenFeature.

```tsx
const { action, useCommonStore } = useStatic();
```

Pros and cons

:plus:

- The feature code is isolated in its own module.
- Dependencies are passed to the feature in one place.
- Controller and store names can be simplified.
- Reducing the number of useEffect.
- Props synchronization on the LeitenFeature side.
- Injections instead of singletons provide code reuse safety.
- Easily test the business logic of a feature
- Tools for identifying architectural errors in code writing.
- No circular dependencies.
- No global stores. But if necessary, possible to create a global store.

:minus:

- It is necessary to wrap the feature with a provider.
- Limited interaction between different features.