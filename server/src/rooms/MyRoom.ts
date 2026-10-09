import { Room, Client, CloseCode } from "colyseus";
import { MyRoomState, Player } from "./schema/MyRoomState.js";

export class MyRoom extends Room<{ state: MyRoomState }> {
  maxClients = 4;
  state = new MyRoomState();
  fixedTimeStep = 1000 / 60;

  fixedTick(deltaTime: number) {
    const velocity = 2;

    this.state.players.forEach((player) => {
      let input: any;

      while ((input = player.inputQueue.shift())) {
        if (input.left) {
          player.x -= velocity;
        } else if (input.right) {
          player.x += velocity;
        }

        if (input.up) {
          player.y -= velocity;
        } else if (input.down) {
          player.y += velocity;
        }
      }
    });
  }

  messages = {
    0: (client, payload) => {
      const player = this.state.players.get(client.sessionId);

      player.inputQueue.push(payload);
    },
  };

  onCreate(options: any) {
    /**
     * Called when a new room is created.
     */
    let elapsedTime = 0;
    this.setTimestep((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });
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
