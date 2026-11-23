import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductGridControls, useProductGridDensity } from './ProductGridControls';

function Preview() {
  const density = useProductGridDensity();
  return <output aria-label="Grid density">{density}</output>;
}

describe('shared product grid preference', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('updates every visible control and persists through navigation', () => {
    localStorage.setItem('ww-product-grid-density', 'standard');
    const page = render(<><ProductGridControls/><ProductGridControls/><Preview/></>);
    fireEvent.click(screen.getAllByRole('button', { name: '6 columns' })[0]);
    expect(screen.getByLabelText('Grid density')).toHaveTextContent('compact');
    for (const control of screen.getAllByRole('group', { name: 'Product layout' })) {
      expect(within(control).getByRole('button', { name: '6 columns' })).toHaveAttribute('aria-pressed', 'true');
    }
    page.unmount();
    render(<ProductGridControls/>);
    expect(screen.getByRole('button', { name: '6 columns' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('returns from list to the chosen grid size and responds to another tab', () => {
    const onViewChange = vi.fn();
    render(<><ProductGridControls view="list" onViewChange={onViewChange}/><Preview/></>);
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '2 columns' }));
    expect(onViewChange).toHaveBeenCalledWith('grid');
    act(() => {
      localStorage.setItem('ww-product-grid-density', 'standard');
      window.dispatchEvent(new StorageEvent('storage', { key: 'ww-product-grid-density' }));
    });
    expect(screen.getByLabelText('Grid density')).toHaveTextContent('standard');
  });

  it('keeps icon counts and labels accurate as the viewport changes', () => {
    let width = 390;
    const listeners = new Set<() => void>();
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() { return width <= Number(query.match(/\d+/)?.[0]); },
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    }));
    render(<><ProductGridControls/><Preview/></>);
    const expectColumns = (counts: number[]) => {
      const buttons = within(screen.getByRole('group', { name: 'Product layout' })).getAllByRole('button');
      expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual(counts.map(count => `${count} ${count === 1 ? 'column' : 'columns'}`));
      expect(buttons.map(button => button.querySelectorAll('rect').length)).toEqual(counts);
    };
    expectColumns([1, 2, 3]);
    fireEvent.click(screen.getByRole('button', { name: '2 columns' }));
    expect(screen.getByLabelText('Grid density')).toHaveTextContent('standard');
    act(() => { width = 900; listeners.forEach(listener => listener()); });
    expectColumns([2, 3, 4]);
    expect(screen.getByRole('button', { name: '3 columns' })).toHaveAttribute('aria-pressed', 'true');
    act(() => { width = 1440; listeners.forEach(listener => listener()); });
    expectColumns([2, 4, 6]);
    expect(screen.getByRole('button', { name: '4 columns' })).toHaveAttribute('aria-pressed', 'true');
  });
});
