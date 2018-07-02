import Flags from "./flags";

export const KeypadLedState = new Flags({
  Ready: 1 << 0,
  Armed: 1 << 1,
  Memory: 1 << 2,
  Bypass: 1 << 3,
  Trouble: 1 << 4,
  Program: 1 << 5,
  Fire: 1 << 6,
  Backlight: 1 << 7
});
