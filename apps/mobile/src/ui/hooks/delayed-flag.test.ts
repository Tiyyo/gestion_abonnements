import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SKELETON_DELAY_MS, startDelay } from './delayed-flag';

describe('startDelay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ne déclenche rien avant la fin du délai', () => {
    const onElapsed = vi.fn();
    startDelay(onElapsed, SKELETON_DELAY_MS);
    vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    expect(onElapsed).not.toHaveBeenCalled();
  });

  it('déclenche une seule fois à la fin du délai', () => {
    const onElapsed = vi.fn();
    startDelay(onElapsed, SKELETON_DELAY_MS);
    vi.advanceTimersByTime(SKELETON_DELAY_MS * 4);
    expect(onElapsed).toHaveBeenCalledTimes(1);
  });

  it('ne déclenche pas si le chargement se termine avant (annulation)', () => {
    const onElapsed = vi.fn();
    const cancel = startDelay(onElapsed, SKELETON_DELAY_MS);
    vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    cancel();
    vi.advanceTimersByTime(SKELETON_DELAY_MS * 4);
    expect(onElapsed).not.toHaveBeenCalled();
  });
});
