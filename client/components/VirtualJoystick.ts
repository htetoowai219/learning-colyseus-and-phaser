import Phaser from "phaser";

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;

  private baseX: number;
  private baseY: number;
  private radius: number;

  private pointerId = -1; // -1 means no finger is controlling me rn. Store it so a second finger tapping elsewhere can't hijack the stick
  private vector = new Phaser.Math.Vector2(0, 0);
  private deadzone = 0.35;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number) {
    this.scene = scene;
    this.baseX = x;
    this.baseY = y;
    this.radius = radius;

    this.base = scene.add.circle(x, y, radius, 0x000000, 0.3);
    this.base.setScrollFactor(0).setDepth(1000);

    this.thumb = scene.add.circle(x, y, radius * 0.45, 0xffffff, 0.6);
    this.thumb.setScrollFactor(0).setDepth(1001);

    scene.input.on("pointerdown", this.onPointerDown, this);
    scene.input.on("pointermove", this.onPointerMove, this);
    scene.input.on("pointerup", this.onPointerUp, this);
    scene.input.on("pointerupoutside", this.onPointerUp, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.pointerId !== -1) return;
    const dist = Phaser.Math.Distance.Between(
      pointer.x,
      pointer.y,
      this.baseX,
      this.baseY,
    );
    if (dist > this.radius) return;

    this.pointerId = pointer.id;
    this.updateThumb(pointer.x, pointer.y);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.pointerId) return;

    this.updateThumb(pointer.x, pointer.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = -1;
    this.vector.set(0, 0);
    this.thumb.setPosition(this.baseX, this.baseY);
  }

  private updateThumb(px: number, py: number) {
    let dx = px - this.baseX;
    let dy = py - this.baseY;

    const dist = Math.hypot(dx, dy);

    // snap back to the edge if the numb goes outside the joystick
    if (dist > this.radius) {
      dx = (dx / dist) * this.radius;
      dy = (dy / dist) * this.radius;
    }

    this.thumb.setPosition(this.baseX + dx, this.baseY + dy);
    this.vector.set(dx / this.radius, dy / this.radius);
  }

  get left() {
    return this.vector.x < -this.deadzone;
  }
  get right() {
    return this.vector.x > this.deadzone;
  }
  get up() {
    return this.vector.y < -this.deadzone;
  }
  get down() {
    return this.vector.y > this.deadzone;
  }

  destroy() {
    this.scene.input.off("pointerdown", this.onPointerDown, this);
    this.scene.input.off("pointermove", this.onPointerMove, this);
    this.scene.input.off("pointerup", this.onPointerUp, this);
    this.scene.input.off("pointerupoutside", this.onPointerUp, this);
    this.base.destroy();
    this.thumb.destroy();
  }
}
