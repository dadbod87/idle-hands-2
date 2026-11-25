import {renderRegionalScore} from './regional-score.ts';
import { renderLodgingScore } from './lodging-score.ts';
import {renderOrchardScore} from './orchard-score.ts';
import { AUDIO_RATE, audioMetrics, renderTheme } from '../design/audio-sketch.ts';
import { isPlaceScore, SCORE_FRAMES, SCORE_RATE } from './score.ts';

// This module runs in a dedicated worker. Keep worker globals out of DOM types.
const worker = self as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

worker.onmessage = ({ data }) => {
  if (!isPlaceScore(data)) {
    worker.postMessage(null);
    return;
  }
  try {
    const samples = data === 'orchard' ? renderOrchardScore()
      : data === 'lodging' ? renderLodgingScore()
      : data === 'mossbank' || data === 'pumpworks' ? renderRegionalScore(data)
      : renderTheme(data);
    audioMetrics(samples);
    if (AUDIO_RATE !== SCORE_RATE || samples.length !== SCORE_FRAMES[data]) {
      throw new Error('Unexpected score format.');
    }
    worker.postMessage({ score: data, rate: AUDIO_RATE, pcm: samples.buffer }, [samples.buffer]);
  } catch {
    worker.postMessage(null);
  }
};
