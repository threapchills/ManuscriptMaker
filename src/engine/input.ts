import type { ControlInput } from './controller';

/**
 * Keyboard, gamepad and touch merged into one controller. Presses are latched
 * so a tap shorter than a frame still jumps.
 */
export type GameAction = 'restart' | 'exit' | 'pause' | 'lens';

const LEFT = ['ArrowLeft', 'KeyA'], RIGHT = ['ArrowRight', 'KeyD'], UP = ['ArrowUp', 'KeyW'], DOWN = ['ArrowDown', 'KeyS'];
const JUMP = ['Space', 'KeyZ', 'KeyK', 'KeyJ'];

export class InputController {
  private keys = new Set<string>();
  private touch = { left: false, right: false, up: false, down: false, jump: false };
  private jumpLatch = false;
  private upLatch = false;
  private padJump = false;
  private padButtons: boolean[] = [];
  onAction?: (action: GameAction) => void;
  /** Set when any gamepad has been used, so the UI can show pad glyphs. */
  usingPad = false;

  attach(target: Window = window): () => void {
    const down = (event: KeyboardEvent) => {
      const editable = (event.target as HTMLElement | null)?.closest?.('input,textarea,select,[contenteditable="true"]');
      if (editable) return;
      const code = event.code;
      if ([...LEFT, ...RIGHT, ...UP, ...DOWN, ...JUMP].includes(code)) event.preventDefault();
      if (!this.keys.has(code) && !event.repeat) {
        if (JUMP.includes(code)) this.jumpLatch = true;
        if (UP.includes(code)) this.upLatch = true;
      }
      this.keys.add(code);
      if (event.repeat) return;
      if (code === 'KeyR') this.onAction?.('restart');
      else if (code === 'Escape' || code === 'KeyE' || code === 'Tab') { if (code === 'Tab') event.preventDefault(); this.onAction?.('exit'); }
      else if (code === 'KeyP') this.onAction?.('pause');
      else if (code === 'KeyL') this.onAction?.('lens');
    };
    const up = (event: KeyboardEvent) => this.keys.delete(event.code);
    const clear = () => { this.keys.clear(); this.touch = { left: false, right: false, up: false, down: false, jump: false }; };
    target.addEventListener('keydown', down);
    target.addEventListener('keyup', up);
    target.addEventListener('blur', clear);
    return () => { target.removeEventListener('keydown', down); target.removeEventListener('keyup', up); target.removeEventListener('blur', clear); };
  }

  setTouch(button: keyof InputController['touch'], held: boolean): void {
    if (button === 'jump' && held && !this.touch.jump) this.jumpLatch = true;
    if (button === 'up' && held && !this.touch.up) this.upLatch = true;
    this.touch[button] = held;
  }

  /** Poll gamepads once per animation frame. */
  poll(): void {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    let jump = false;
    const buttons: boolean[] = [];
    for (const pad of pads) {
      if (!pad) continue;
      pad.buttons.forEach((b, i) => { buttons[i] = buttons[i] || b.pressed; });
      if (pad.buttons[0]?.pressed || pad.buttons[1]?.pressed) jump = true;
    }
    if (jump && !this.padJump) { this.jumpLatch = true; this.usingPad = true; }
    this.padJump = jump;
    const was = this.padButtons;
    if (buttons[9] && !was[9]) this.onAction?.('pause');
    if (buttons[3] && !was[3]) this.onAction?.('restart');
    if ((buttons[8] && !was[8]) || (buttons[2] && !was[2])) this.onAction?.('exit');
    this.padButtons = buttons;
  }

  private pad(): { x: number; up: boolean; down: boolean } {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    let x = 0, up = false, down = false;
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
      if (Math.abs(ax) > .25) { x = ax; this.usingPad = true; }
      if (pad.buttons[14]?.pressed) x = -1;
      if (pad.buttons[15]?.pressed) x = 1;
      if (ay < -.5 || pad.buttons[12]?.pressed) up = true;
      if (ay > .5 || pad.buttons[13]?.pressed) down = true;
    }
    return { x, up, down };
  }

  /** The state for one fixed step. Reading consumes the jump press. */
  read(): ControlInput {
    const has = (codes: string[]) => codes.some(code => this.keys.has(code));
    const pad = this.pad();
    const left = has(LEFT) || this.touch.left, right = has(RIGHT) || this.touch.right;
    const x = left !== right ? (right ? 1 : -1) : pad.x;
    const jump = has(JUMP) || this.touch.jump || this.padJump;
    const input: ControlInput = { x, up: has(UP) || this.touch.up || pad.up, down: has(DOWN) || this.touch.down || pad.down, jump, jumpPressed: this.jumpLatch, upPressed: this.upLatch };
    this.jumpLatch = false; this.upLatch = false;
    return input;
  }

  reset(): void { this.keys.clear(); this.jumpLatch = false; this.upLatch = false; this.touch = { left: false, right: false, up: false, down: false, jump: false }; }
}
