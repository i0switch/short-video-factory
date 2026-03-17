// カスタムイージング関数 (Remotion設計書 E章)

/** ease-out cubic */
export function outCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** ease-out quad */
export function outQuad(t: number): number {
  return 1 - Math.pow(1 - t, 2)
}

/** ease-out back (overshoot) — popIn 用 */
export function outBack(t: number, overshoot = 1.70158): number {
  return 1 + (overshoot + 1) * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2)
}

/** linear */
export function linear(t: number): number {
  return t
}
