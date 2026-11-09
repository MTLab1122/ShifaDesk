import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../app/page';

describe('HomePage', () => {
  it('renders the MatabAI brand title', () => {
    render(<HomePage />);
    expect(screen.getByText(/MatabAI/i)).toBeInTheDocument();
  });

  it('renders the operational badge', () => {
    render(<HomePage />);
    expect(screen.getByText(/Phase 1 & Phase 2 Operational/i)).toBeInTheDocument();
  });

  it('renders architectural foundation cards', () => {
    render(<HomePage />);
    expect(screen.getByText('Multi-Tenant Architecture')).toBeInTheDocument();
    expect(screen.getByText('Backend & Auth API')).toBeInTheDocument();
    expect(screen.getByText('Multilingual SaaS UI')).toBeInTheDocument();
  });

  it('renders portal access buttons', () => {
    render(<HomePage />);
    expect(screen.getByText('Launch Staff Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Open Patient Portal')).toBeInTheDocument();
  });
});
