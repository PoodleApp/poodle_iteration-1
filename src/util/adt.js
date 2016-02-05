/*
 * Pattern matching for algebraic data types.
 *
 * Example usage:
 *
 *     // `Option<T>` is the algebraic data type
 *     type Option<T> = Some<T> | None
 *
 *     // `Some<T>` and `None` are data constructors for the type `Option<T>`
 *     class Some<T> {
 *       value: T;
 *       constructor(value: T) { this.value = value }
 *     }
 *
 *     class None {}
 *
 *     function getOrElse<T>(def: T, v: Option<T>): T {
 *       return match(
 *         $(Some, ({ value }) => value),
 *         $(None, () => def)
 *       )(v)
 *     }
 *
 *     assert( getOrElse(2, new Some(3)) === 3 )
 *
 *     assert( getOrElse(2, new None) === 2 )
 *
 * @flow
 */

type Result<R> = ?{ result: R }

function match<T, R>(...patterns: ((_: T) => Result<R>)[]): (_: T) => R {
  return v => {
    const result = patterns.reduce((r, pat) => r || pat(v), undefined)
    if (result) {
      return result.result
    }
    else {
      throw new MatchError(v)
    }
  }
}

function $<T, U:T, R>(klass: Class<U>, fn: (_: U) => R): (_: T) => Result<R> {
  return v => {
    if (v instanceof klass) {
      return { result: fn(v) }
    }
  }
}

class MatchError<T> extends Error {
  value: T;
  constructor(value: T) {
    super(`No pattern matched: ${value}`)
    this.value = value
  }
}

export {
  MatchError,
  match,
  $,
}
