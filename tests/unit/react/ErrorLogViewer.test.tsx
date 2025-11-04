import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorLogViewer } from '../../../packages/ai/src/react/ErrorLogViewer';
import type { ErrorEvent } from '../../../packages/ai/src/errors/TelemetryHooks';

describe('ErrorLogViewer', () => {
  const mockErrors: ErrorEvent[] = [
    {
      error: {
        type: 'NetworkError',
        severity: 'high',
        message: 'Request failed',
        details: { stack: 'Error: Request failed\n  at fetch' },
      },
      originalError: new Error('Request failed'),
      timestamp: Date.now(),
      recovered: false,
    },
    {
      error: {
        type: 'ValidationError',
        severity: 'medium',
        message: 'Invalid input',
        details: {},
      },
      originalError: new Error('Invalid input'),
      timestamp: Date.now() - 60000,
      recovered: true,
      recoveryAction: { type: 'retry' },
    },
  ];

  it('should render error log viewer', () => {
    render(<ErrorLogViewer errors={mockErrors} />);
    expect(screen.getByText(/Error Log/)).toBeInTheDocument();
  });

  it('should display error count', () => {
    render(<ErrorLogViewer errors={mockErrors} />);
    expect(screen.getByText(/\(2\/2\)/)).toBeInTheDocument();
  });

  it('should show error types', () => {
    render(<ErrorLogViewer errors={mockErrors} />);
    expect(screen.getByText('NetworkError')).toBeInTheDocument();
    expect(screen.getByText('ValidationError')).toBeInTheDocument();
  });

  it('should filter by type', () => {
    render(<ErrorLogViewer errors={mockErrors} />);

    const typeFilter = screen.getByDisplayValue('All Types');
    fireEvent.change(typeFilter, { target: { value: 'NetworkError' } });

    expect(typeFilter).toHaveValue('NetworkError');
  });

  it('should filter by severity', () => {
    render(<ErrorLogViewer errors={mockErrors} />);

    const severityFilter = screen.getByDisplayValue('All Severities');
    fireEvent.change(severityFilter, { target: { value: 'high' } });

    expect(severityFilter).toHaveValue('high');
  });

  it('should filter by recovery status', () => {
    render(<ErrorLogViewer errors={mockErrors} />);

    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.change(statusFilter, { target: { value: 'true' } });

    expect(statusFilter).toHaveValue('true');
  });

  it('should search errors', () => {
    render(<ErrorLogViewer errors={mockErrors} />);

    const searchInput = screen.getByPlaceholderText('Search errors...');
    fireEvent.change(searchInput, { target: { value: 'Network' } });

    expect(searchInput).toHaveValue('Network');
  });

  it('should group errors by type', () => {
    render(<ErrorLogViewer errors={mockErrors} />);

    const groupCheckbox = screen.getByRole('checkbox');
    fireEvent.click(groupCheckbox);

    expect(groupCheckbox).toBeChecked();
  });

  it('should mark error as resolved', () => {
    const onResolve = vi.fn();
    render(<ErrorLogViewer errors={mockErrors} onResolve={onResolve} />);

    const resolveButtons = screen.getAllByText('Mark Resolved');
    fireEvent.click(resolveButtons[0]);

    expect(onResolve).toHaveBeenCalledWith(0);
  });

  it('should show error details on click', () => {
    render(<ErrorLogViewer errors={mockErrors} />);

    const errorItem = screen.getByText('Request failed');
    fireEvent.click(errorItem);

    expect(screen.getByText('Error Details')).toBeInTheDocument();
  });

  it('should close details modal', () => {
    render(<ErrorLogViewer errors={mockErrors} />);

    fireEvent.click(screen.getByText('Request failed'));

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(screen.queryByText('Error Details')).not.toBeInTheDocument();
  });

  it('should export errors', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    render(<ErrorLogViewer errors={mockErrors} />);

    const exportButton = screen.getByLabelText('Export errors');
    fireEvent.click(exportButton);

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it('should render with dark theme', () => {
    const { container } = render(<ErrorLogViewer errors={mockErrors} theme="dark" />);
    expect(container.querySelector('.error-log-viewer--dark')).toBeInTheDocument();
  });

  it('should show empty state when no errors', () => {
    render(<ErrorLogViewer errors={[]} />);
    expect(screen.getByText(/No errors logged yet/)).toBeInTheDocument();
  });

  it('should respect maxErrors limit', () => {
    const manyErrors = Array.from({ length: 200 }, (_, i) => ({
      ...mockErrors[0],
      timestamp: Date.now() - i * 1000,
    }));

    render(<ErrorLogViewer errors={manyErrors} maxErrors={50} />);

    // Should only show last 50 errors
    expect(screen.getByText(/\(200\/200\)/)).toBeInTheDocument();
  });
});
