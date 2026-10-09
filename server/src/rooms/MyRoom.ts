import { Room, Client, CloseCode } from "colyseus";
import { MyRoomState, Player } from "./schema/MyRoomState.js";

export class MyRoom extends Room<{ state: MyRoomState }> {
  maxClients = 4;
  state = new MyRoomState();

  messages = {
    0: (client, payload) => {
      const player = this.state.players.get(client.sessionId);
      const velocity = 2;

      if (payload.left) {
        player.x -= velocity;
      } else if (payload.right) {
        player.x += velocity;
      }

      if (payload.up) {
        player.y -= velocity;
      } else if (payload.down) {
        player.y += velocity;
      }
    },
    yourMessageType: (client: Client, message: any) => {
      /**
       * Handle "yourMessageType" message.
       */
      console.log(client.sessionId, "sent a message:", message);
    },
  };

  onCreate(options: any) {
    /**
     * Called when a new room is created.
     */
  }

  onJoin(client: Client, options: any) {
    /**
     * Called when a client joins the room.
     */
    console.log(client.sessionId, "joined!");

    const mapWidth = 800;
    const mapHeight = 600;

    const player = new Player();

    player.x = Math.random() * mapWidth;
    player.y = Math.random() * mapHeight;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, code: CloseCode) {
    /**
     * Called when a client leaves the room.
     */
    console.log(client.sessionId, "left!", code);
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    /**
     * Called when the room is disposed.
     */
    console.log("room", this.roomId, "disposing...");
  }
}
