import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../app/page';

describe('HomePage', () => {
  it('renders the MatabAI brand title', () => {
    render(<HomePage />);
    expect(screen.getByText(/MatabAI/i)).toBeInTheDocument();
  });

  it('renders the phase 0 operational badge', () => {
    render(<HomePage />);
    expect(screen.getByText(/Phase 0 Operational/i)).toBeInTheDocument();
  });

  it('renders architectural foundation cards', () => {
    render(<HomePage />);
    expect(screen.getByText('Core Monorepo')).toBeInTheDocument();
    expect(screen.getByText('Backend Architecture')).toBeInTheDocument();
    expect(screen.getByText('Security & DB')).toBeInTheDocument();
  });
});
