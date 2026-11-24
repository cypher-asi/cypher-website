import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BackToTop from './BackToTop';

const setScroll = (y: number) => {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
};

afterEach(() => setScroll(0));

describe('BackToTop', () => {
  it('stays hidden near the top of the page', () => {
    render(<BackToTop />);
    setScroll(100);
    expect(screen.queryByRole('button', { name: 'Back to top' })).toBeNull();
  });

  it('appears after scrolling down and scrolls the window to the top', () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    render(<BackToTop />);
    setScroll(window.innerHeight * 2);
    fireEvent.click(screen.getByRole('button', { name: 'Back to top' }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });
});
