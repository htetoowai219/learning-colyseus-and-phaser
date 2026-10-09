import Phaser from "phaser";
import { Client, Room, Callbacks } from "@colyseus/sdk";
import { Player, SessionId } from "./types/types";

// custom scene class
export class GameScene extends Phaser.Scene {
  room: Room;

  playerEntities: { [sessionId: string]: any } = {};

  inputPayload = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

  cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;

  preload() {
    // preload scene
    this.load.image(
      "ship_0001",
      "https://cdn.jsdelivr.net/gh/colyseus/tutorial-phaser@master/client/dist/assets/ship_0001.png",
    );
    this.cursorKeys = this.input.keyboard.createCursorKeys();
  }

  client = new Client("http://localhost:2567");

  async create() {
    // create scene
    console.log("Joining room...");

    try {
      this.room = await this.client.joinOrCreate("my_room");
      console.log("Joined successfully!");
    } catch (e) {
      console.error(e);
    }

    const callbacks = Callbacks.get(this.room);
    callbacks.onAdd("players", (player: Player, sessionId: SessionId) => {
      // A player has joined
      console.log(
        "A player has joined! Their unique session id is ",
        sessionId,
      );

      const entity = this.physics.add.image(player.x, player.y, "ship_0001");

      this.playerEntities[sessionId] = entity;

      callbacks.onChange(player, () => {
        entity.x = player.x;
        entity.y = player.y;
      });
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
    // game loop
    if (!this.room) {
      return;
    }

    this.inputPayload.left = this.cursorKeys.left.isDown;
    this.inputPayload.right = this.cursorKeys.right.isDown;
    this.inputPayload.up = this.cursorKeys.up.isDown;
    this.inputPayload.down = this.cursorKeys.down.isDown;
    this.room.send(0, this.inputPayload);
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
};

// instantiate the game
const game = new Phaser.Game(config);
