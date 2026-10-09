import { schema, t, type SchemaType } from "@colyseus/schema";

export const Player = schema(
  {
    x: t.number(),
    y: t.number(),
  },
  "Player",
);

export const MyRoomState = schema(
  {
    players: t.map(Player),
  },
  "MyRoomState",
);

export type MyRoomState = SchemaType<typeof MyRoomState>;
