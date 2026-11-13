/** Trusted code-owned schema port, never supplied by a command/request. */
export type RuleSchema<T> = { parse(value:unknown):T; safeParse(value:unknown):{success:true;data:T}|{success:false} };
