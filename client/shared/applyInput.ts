// Deterministic movement step. The SAME function runs on the client (prediction
// + rollback replay) and the server (authority), integrating over the shared
// fixed `dt` so both produce bit-identical positions.
//
// KEEP IN SYNC with server/src/shared/applyInput.ts.
export interface MoveInputLike {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

// Pixels per second. The old hand-rolled code moved 2 px per 60 Hz tick;
// 2 * 60 = 120 px/s preserves the same feel now that we integrate by dt.
export const SPEED = 120;

export function applyInput(
  entity: { x: number; y: number },
  input: MoveInputLike,
  dt: number,
) {
  const v = SPEED * dt;

  if (input.left) {
    entity.x -= v;
  } else if (input.right) {
    entity.x += v;
  }

  if (input.up) {
    entity.y -= v;
  } else if (input.down) {
    entity.y += v;
  }
}
