type EventsType = Record<string, any>;

export interface IEmitter<E extends EventsType> {
  /**
   * Add a listener to a specific event.
   *
   * @param eventName - The name of the event
   * @param listener - A listener function that takes as parameter the payload of the event
   */
  addEventListener<K extends keyof E>(
    eventName: K,
    listener: (data: E[K]) => void
  ): void;

  /**
   * Remove a listener from a specific event.
   *
   * @param eventName - The name of the event
   * @param listener - A listener function that had been added previously
   */
  removeEventListener<K extends keyof E>(
    eventName: K,
    listener: (data: E[K]) => void
  ): void;

  removeListeners<K extends keyof E>(eventName: K): void;
}

/**
 * A concrete implementation of the {@link Emitter} interface
 *
 * @public
 */
export class ConcreteEmitter<E extends EventsType> implements IEmitter<E> {
  private _listeners: Partial<Record<keyof E, Set<(data: any) => void>>>;

  constructor() {
    this._listeners = {};
  }

  /** {@inheritDoc Emitter.addEventListener} */
  addEventListener<K extends keyof E>(
    eventName: K,
    listener: (data: E[K]) => void
  ) {
    let listeners = this._listeners[eventName];

    if (!listeners) {
      listeners = new Set();
      this._listeners[eventName] = listeners;
    }

    listeners.add(listener);
  }

  /** {@inheritDoc Emitter.removeEventListener} */
  removeEventListener<K extends keyof E>(
    eventName: K,
    listener: (data: E[K]) => void
  ) {
    const listeners = this._listeners[eventName];

    if (!listeners) {
      return;
    }

    listeners.delete(listener);
  }

  /** @internal */
  protected emit<K extends keyof E>(eventName: K, data: E[K]) {
    const listeners = this._listeners[eventName];

    if (!listeners) {
      return;
    }

    listeners.forEach(listener => {
      listener(data);
    });
  }

  removeListeners<K extends keyof E>(eventName: K) {
    const listeners = this._listeners[eventName];
    if (!listeners) {
      return;
    }

    listeners.clear();
  }
}
