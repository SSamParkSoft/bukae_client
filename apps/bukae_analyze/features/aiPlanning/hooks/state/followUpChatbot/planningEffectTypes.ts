export type RefState<T> = { current: T }
export type StateSetter<T> = (value: T | ((prev: T) => T)) => void
