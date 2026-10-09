import { schema, t, type SchemaType } from "@colyseus/schema";

export const Player = schema(
  {
    x: t.number(),
    y: t.number(),
    inputQueue: t
      .ref(Array)
      .noSync()
      .default(() => []),
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
