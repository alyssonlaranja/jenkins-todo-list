/**
 * A discriminated union for representing success or failure results
 * Enables more type-safe and functional error handling
 */
export type Result<T, E = Error> = Success<T> | Failure<E>

/**
 * Represents a successful operation
 */
export interface Success<T> {
  readonly success: true
  readonly data: T
}

/**
 * Represents a failed operation
 */
export interface Failure<E> {
  readonly success: false
  readonly error: E
}

/**
 * Create a success result
 */
export function success<T, E = Error>(data: T): Result<T, E> {
  return { success: true, data }
}

/**
 * Create a failure result
 */
export function failure<T, E = Error>(error: E): Result<T, E> {
  return { success: false, error }
}

/**
 * Apply a function to the success value of a Result
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.success) {
    return success(fn(result.data))
  }
  return result
}

/**
 * Chain Results together (monadic bind)
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.success) {
    return fn(result.data)
  }
  return result
}

/**
 * Convert a Promise that might throw to a Promise<Result>
 */
export async function fromPromise<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await promise
    return success(data)
  } catch (error) {
    return failure(error as E)
  }
}

/**
 * Handle both cases of a Result
 */
export function match<T, E, U>(
  result: Result<T, E>,
  onSuccess: (data: T) => U,
  onFailure: (error: E) => U
): U {
  if (result.success) {
    return onSuccess(result.data)
  }
  return onFailure(result.error)
}
