/** Transpose one original pluck into a deterministic mono phrase. */
export function addPluck(
 phrase: Float32Array, voice: Float32Array, start: number,
 transpose: number, gain: number, release: number,
) {
 const length = Math.floor((voice.length - 1) / transpose);
 for (let i = 0; i < length; i++) {
  const source = i * transpose;
  const index = Math.floor(source);
  const blend = source - index;
  const sample = (voice[index] * (1 - blend) + voice[index + 1] * blend)
   * gain * Math.min(1, (length - 1 - i) / release);
  phrase[start + i] += sample;
 }
}
