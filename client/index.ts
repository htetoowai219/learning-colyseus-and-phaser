import Phaser from "phaser";
import { Client, Room, Callbacks, Predict, type InputHandle } from "@colyseus/sdk";
import { Player, SessionId } from "./types/types";
import { VirtualJoystick } from "./components/VirtualJoystick";
import { MoveInput } from "./shared/MoveInput";
import { applyInput, SPEED } from "./shared/applyInput";

// custom scene class
export class GameScene extends Phaser.Scene {
  room: Room;
  joystick?: VirtualJoystick;

  playerEntities: { [sessionId: string]: any } = {};

  cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

  currentPlayer: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  remoteRef: Phaser.GameObjects.Rectangle;

  // The official Colyseus prediction stack. `predict` is the one per-frame driver:
  // it smooths remote players, reconciles the local player, and paces input sends.
  predict: Predict;
  netInput: InputHandle<MoveInput>;
  me: any;
  remoteMode: "lerp" | "extrapolate" = "lerp";
  debugText?: Phaser.GameObjects.Text;

  preload() {
    // preload scene
    this.load.image(
      "ship_0001",
      "https://cdn.jsdelivr.net/gh/colyseus/tutorial-phaser@master/client/dist/assets/ship_0001.png",
    );
  }

  // client = new Client("http://localhost:2567");
  client = new Client(`http://${window.location.hostname}:2567`);

  async create() {
    // create scene
    console.log("Joining room...");

    // Set up keyboard here (not preload) and capture the arrow keys so the page
    // doesn't scroll while playing.
    if (this.input.keyboard) {
      this.cursorKeys = this.input.keyboard.createCursorKeys();
      this.input.keyboard.addCapture("UP,DOWN,LEFT,RIGHT");
    } else {
      console.error("[input] keyboard plugin is not available");
    }

    try {
      this.room = await this.client.joinOrCreate("my_room");
      console.log("Joined successfully!");
    } catch (e) {
      console.error(e);
      return;
    }

    this.joystick = new VirtualJoystick(this, 110, this.scale.height - 110, 80);

    // One Predict per room. `delay` is the interp buffer remotes render at, and
    // the reconciler auto-binds it as the input's `renderDelay`.
    this.predict = Predict.get(this.room, { mode: "lerp", delay: 70 });

    // The single surface that stages + sends input. The input schema arrives via
    // the join handshake, but we pass it explicitly so our local class is used.
    this.netInput = this.room.input({ type: MoveInput });

    // Connection-quality readout: RTT/jitter are the real cause of the
    // sprite-vs-rect gap; pending/FPS tell network vs device apart.
    this.debugText = this.add
      .text(8, 8, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#000000a0",
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(2000);

    // Remote players: render 70ms in the past, interpolated between snapshots.
    // This covers ALL players; the reconciler below overlays our own entity.
    // A/B flag: ?remote=extrapolate renders remotes live off their last
    // velocity (hides latency, can overshoot then correct) instead of smoothed
    // interpolation. Default stays "lerp".
    this.remoteMode =
      new URLSearchParams(window.location.search).get("remote") ===
      "extrapolate"
        ? "extrapolate"
        : "lerp";

    this.predict.attachAll("players", {
      mode: this.remoteMode,
      fields: ["x", "y"],
    });

    const callbacks = Callbacks.get(this.room);
    callbacks.onAdd("players", (player: Player, sessionId: SessionId) => {
      // A player has joined
      console.log(
        "A player has joined! Their unique session id is ",
        sessionId,
      );

      const entity = this.physics.add.image(player.x, player.y, "ship_0001");
      this.playerEntities[sessionId] = entity;

      if (sessionId === this.room.sessionId) {
        this.currentPlayer = entity;

        // Raw server position, for side-by-side comparison against the
        // reconciled (predicted) sprite.
        this.remoteRef = this.add.rectangle(0, 0, entity.width, entity.height);
        this.remoteRef.setStrokeStyle(1, 0xff0000);

        callbacks.onChange(player, () => {
          this.remoteRef.x = player.x;
          this.remoteRef.y = player.y;
        });

        // Local player: server-reconciled rollback. It observes `input` (we only
        // stage + send through the handle) and replays unacked inputs on every ack.
        this.me = this.predict.reconciler(player, {
          input: this.netInput,
          step: (ctx, state, cmd) => applyInput(state, cmd, ctx.dt),
          smoothMs: 65,
        });
      }
    });

    callbacks.onRemove("players", (player: Player, sessionId: SessionId) => {
      console.log("A player has left! Their unique session id is ", sessionId);
      const entity = this.playerEntities[sessionId];
      if (entity) {
        entity.destroy();

        delete this.playerEntities[sessionId];
      }
    });
  }

  update(time: number, delta: number): void {
    // `players` is undefined until the first state patch decodes, and update()
    // runs every frame — including before/while we're joining.
    if (!this.room || !this.netInput || !this.room.state?.players) {
      return;
    }

    // 1) How many fixed input steps are due this frame. Phaser's `time` is the
    // rAF timestamp, the same axis `predict.tick` expects.
    const steps = this.predict.tick(time);

    // 2) Stage + send exactly that many inputs. Send BEFORE reading render values.
    for (let i = 0; i < steps; i++) {
      this.netInput.data.left =
        !!this.cursorKeys?.left.isDown || !!this.joystick?.left;
      this.netInput.data.right =
        !!this.cursorKeys?.right.isDown || !!this.joystick?.right;
      this.netInput.data.up =
        !!this.cursorKeys?.up.isDown || !!this.joystick?.up;
      this.netInput.data.down =
        !!this.cursorKeys?.down.isDown || !!this.joystick?.down;
      this.netInput.send();
    }

    // 3) Render: one read idiom for local (reconciled) and remote (smoothed).
    this.room.state.players.forEach((player: Player, sessionId: SessionId) => {
      const entity = this.playerEntities[sessionId];
      if (!entity) return;

      entity.x = this.predict.value(player, "x");
      entity.y = this.predict.value(player, "y");
    });

    // 4) Connection-quality readout.
    if (this.debugText) {
      const clock = this.room.clock;
      const lead =
        this.netInput.pendingCount * (SPEED / (this.netInput.tickRate ?? 60));
      this.debugText.setText([
        `RTT ${clock.smoothedRtt().toFixed(0)}ms (last ${clock.rtt().toFixed(0)})  jitter ${clock.jitter().toFixed(1)}ms`,
        `pending ${this.netInput.pendingCount}  tick ${this.netInput.tickRate ?? "?"}Hz  patch ${this.netInput.patchRate ?? "?"}ms`,
        `fps ${this.game.loop.actualFps.toFixed(0)}`,
        `mode ${this.remoteMode}  lead ~${lead.toFixed(0)}px`,
      ]);
    }
  }
}

// game config
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#b6d53c",
  parent: "phaser-example",
  physics: { default: "arcade" },
  pixelArt: true,
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

// instantiate the game
const game = new Phaser.Game(config);
