import { Room, Client, CloseCode } from "colyseus";
import { MyRoomState, Player } from "./schema/MyRoomState.js";
import { MoveInput } from "../shared/MoveInput.js";
import { applyInput } from "../shared/applyInput.js";

export class MyRoom extends Room<{ state: MyRoomState; input: MoveInput }> {
  maxClients = 4;
  state = new MyRoomState();

  // Per-client input schema + buffered inbound frames. `defineInput` also powers
  // the client's `room.clock`/`room.input()` and advertises the fixed tick rate.
  inputs = this.defineInput(MoveInput, { bufferMaxSize: 64 });

  onCreate(options: any) {
    /**
     * Called when a new room is created.
     */
    // Broadcast state at 30 Hz instead of the 20 Hz default. The input ack
    // rides the patch, so this shrinks ack quantization (~50ms -> ~33ms) and
    // lets remote interpolation use a smaller delay. Cost: ~50% more outbound
    // bandwidth (trivial at our 4-player cap). Sim stays at 60 Hz below.
    this.patchRate = 1000 / 30;

    // Fixed 60 Hz simulation. `ctx.dt` is the exact same dt the client predicts
    // with, so server and client integrate applyInput() identically.
    this.setFixedTimestep((ctx) => {
      this.state.players.forEach((player, sessionId) => {
        // Exactly one input per tick: the ack (`consumedCount`) then matches the
        // inputs actually simulated; the client reconciles against reproducible state.
        const input = this.inputs.get(sessionId).next();
        if (!input) return;

        applyInput(player, input, ctx.dt);
      });
    }, 60);
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
