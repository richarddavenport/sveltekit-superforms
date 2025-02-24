import type { z, AnyZodObject, ZodArray, ZodObject } from 'zod';
import type { Entity, UnwrappedEntity } from './server/entity.js';
import type { Writable } from 'svelte/store';
import type { MaybePromise } from '$app/forms';

export class SuperFormError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, SuperFormError.prototype);
  }
}

export type RawShape<T> = T extends ZodObject<infer U> ? U : never;

type UnwrappedRawShape<
  T extends AnyZodObject,
  P extends keyof RawShape<T>
> = UnwrappedEntity<RawShape<T>[P]>;

type SuperStructArray<T extends AnyZodObject, Data, ArrayData = never> = {
  [Property in keyof RawShape<T>]?: T extends any
    ? UnwrappedRawShape<T, Property> extends AnyZodObject
      ? SuperStructArray<UnwrappedRawShape<T, Property>, Data, ArrayData>
      : UnwrappedRawShape<T, Property> extends ZodArray<infer A>
      ? ArrayData &
          Record<
            number,
            UnwrappedEntity<A> extends AnyZodObject
              ? SuperStructArray<UnwrappedEntity<A>, Data, ArrayData>
              : Data
          >
      : Data
    : never;
};

type SuperStruct<T extends AnyZodObject, Data> = Partial<{
  [Property in keyof RawShape<T>]: T extends any
    ? UnwrappedRawShape<T, Property> extends AnyZodObject
      ? SuperStruct<UnwrappedRawShape<T, Property>, Data>
      : UnwrappedRawShape<T, Property> extends ZodArray<infer A>
      ? UnwrappedEntity<A> extends AnyZodObject
        ? SuperStruct<UnwrappedEntity<A>, Data>
        : InputConstraint
      : InputConstraint
    : never;
}>;

export type Validator<V> = (
  value: V
) => MaybePromise<string | string[] | null | undefined>;

// Cannot be a SuperStruct due to Property having to be passed on.
// Deep recursive problem fixed thanks to https://www.angularfix.com/2022/01/why-am-i-getting-instantiation-is.html
export type Validators<T extends AnyZodObject> = Partial<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [Property in keyof RawShape<T>]: T extends any
    ? UnwrappedRawShape<T, Property> extends AnyZodObject
      ? Validators<UnwrappedRawShape<T, Property>>
      : UnwrappedRawShape<T, Property> extends ZodArray<infer A>
      ? UnwrappedEntity<A> extends AnyZodObject
        ? Validators<UnwrappedEntity<A>>
        : Validator<
            z.infer<T>[Property] extends Array<infer A2>
              ? A2
              : z.infer<T>[Property]
          >
      : Validator<z.infer<T>[Property]>
    : never;
}>;

export type TaintedFields<T extends AnyZodObject> = SuperStructArray<
  T,
  true
>;

export type ValidationErrors<T extends AnyZodObject> = SuperStructArray<
  T,
  string[],
  { _errors?: string[] }
>;

export type InputConstraint = Partial<{
  pattern: string; // RegExp
  min: number | string; // Date
  max: number | string; // Date
  required: boolean;
  step: number;
  minlength: number;
  maxlength: number;
}>;

export type InputConstraints<T extends AnyZodObject> = SuperStruct<
  T,
  InputConstraint
>;

export type Validation<
  T extends AnyZodObject,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
> = {
  valid: boolean;
  errors: ValidationErrors<T>;
  data: z.infer<T>;
  empty: boolean;
  constraints: Entity<T>['constraints'];
  message?: M;
  id?: string;
  meta?: Entity<T>['meta'];
};

export type FormField<
  T extends AnyZodObject,
  Property extends keyof z.infer<T>
> = {
  readonly name: string;
  value: Writable<z.infer<T>[Property]>;
  errors?: Writable<ValidationErrors<T>[Property]>;
  constraints?: Writable<InputConstraints<T>[Property]>;
  readonly type?: string;
};

export type FormFields<T extends AnyZodObject> = {
  [Property in keyof z.infer<T>]-?: FormField<T, Property>;
};
