// Shared input schema for client-predicted movement.
//
// KEEP IN SYNC with server/src/shared/MoveInput.ts — both sides must encode the
// exact same fields so the server decodes what the client predicted. The two
// copies are duplicated (not imported across packages) on purpose.
import { schema, t, type SchemaType } from "@colyseus/schema";

export const MoveInput = schema(
  {
    left: t.boolean(),
    right: t.boolean(),
    up: t.boolean(),
    down: t.boolean(),
  },
  "MoveInput",
);

export type MoveInput = SchemaType<typeof MoveInput>;
