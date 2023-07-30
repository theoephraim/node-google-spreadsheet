// utility types
export type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> &
Partial<Pick<Type, Key>>;

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

