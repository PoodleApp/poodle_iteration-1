
declare class Immutable$Record<T:Object> {
  get<A>(key: $Enum<T>): A;
  set<A>(key: $Enum<T>, value: A): void;
  remove(key: $Enum<T>): void;
  size: number;
}

declare module "immutable" {

  declare function Record<T:Object, R: T & Immutable$Record<T>>(spec: T): Class<R>;

}
