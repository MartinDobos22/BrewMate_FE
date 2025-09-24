/*
 * Ľahká implementácia rozhrania podobného knižnici Zustand.
 * V prípade budúcej migrácie na originálnu knižnicu stačí nahradiť tento súbor importom.
 */
import {MutableRefObject, useCallback, useRef, useSyncExternalStore} from 'react';

type StateCreator<T> = (
  setState: (updater: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void,
  getState: () => T
) => T;

type Listener<T> = (state: T) => void;

export interface StoreApi<T> {
  getState: () => T;
  setState: (updater: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
  subscribe: (listener: Listener<T>) => () => void;
}

/**
 * Funkcia `create` vracia hook použiteľný rovnako ako `useStore` zo Zustandu.
 */
export function create<TState extends object>(initializer: StateCreator<TState>) {
  const listeners = new Set<Listener<TState>>();
  let state = {} as TState;

  const getState = () => state;

  const setState: StoreApi<TState>['setState'] = (updater, replace = false) => {
    const previous = state;
    const partial = typeof updater === 'function' ? (updater as (state: TState) => Partial<TState>)(previous) : updater;
    state = replace ? (partial as TState) : {...previous, ...partial};
    listeners.forEach((listener) => listener(state));
  };

  state = initializer(setState, getState);

  const subscribe: StoreApi<TState>['subscribe'] = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  function useStore(): TState;
  function useStore<TSlice>(selector: (state: TState) => TSlice): TSlice;
  function useStore<TSlice>(selector?: (state: TState) => TSlice): TState | TSlice {
    const selectorRef: MutableRefObject<(state: TState) => TSlice | TState> = useRef(
      (selector as (state: TState) => TSlice | TState) ?? ((s: TState) => s)
    );

    const subscribeWithSelector = useCallback(
      (callback: Listener<TSlice | TState>) =>
        subscribe((nextState) => {
          callback(selectorRef.current(nextState));
        }),
      []
    );

    return useSyncExternalStore(
      subscribeWithSelector,
      () => selectorRef.current(state),
      () => selectorRef.current(state)
    );
  }

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore as typeof useStore & StoreApi<TState>;
}
