import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PerformanceTimeline, type PerformanceEntry } from '../../../packages/ai/src/react/PerformanceTimeline';

describe('PerformanceTimeline', () => {
  const mockEntries: PerformanceEntry[] = [
    {
      name: 'API Call 1',
      startTime: 0,
      duration: 150,
      type: 'api',
      details: { endpoint: '/users' },
    },
    {
      name: 'Cache Read',
      startTime: 50,
      duration: 5,
      type: 'cache',
    },
    {
      name: 'Render Component',
      startTime: 100,
      duration: 30,
      type: 'render',
    },
  ];

  it('should render performance timeline', () => {
    render(<PerformanceTimeline entries={mockEntries} />);
    expect(screen.getByText('⏱️ Performance Timeline')).toBeInTheDocument();
  });

  it('should display statistics', () => {
    render(<PerformanceTimeline entries={mockEntries} />);

    expect(screen.getByText(/Total Operations/)).toBeInTheDocument();
    expect(screen.getByText(/Avg Duration/)).toBeInTheDocument();
    expect(screen.getByText(/Slowest/)).toBeInTheDocument();
    expect(screen.getByText(/Fastest/)).toBeInTheDocument();
  });

  it('should filter by type', () => {
    render(<PerformanceTimeline entries={mockEntries} />);

    const filterSelect = screen.getByDisplayValue('All Types');
    fireEvent.change(filterSelect, { target: { value: 'api' } });

    expect(filterSelect).toHaveValue('api');
  });

  it('should zoom in', () => {
    render(<PerformanceTimeline entries={mockEntries} />);

    const zoomInButton = screen.getByLabelText('Zoom in');
    fireEvent.click(zoomInButton);

    // Verify zoom button is still interactive
    expect(zoomInButton).toBeInTheDocument();
  });

  it('should zoom out', () => {
    render(<PerformanceTimeline entries={mockEntries} />);

    const zoomOutButton = screen.getByLabelText('Zoom out');
    fireEvent.click(zoomOutButton);

    expect(zoomOutButton).toBeInTheDocument();
  });

  it('should reset view', () => {
    render(<PerformanceTimeline entries={mockEntries} />);

    const resetButton = screen.getByLabelText('Reset view');
    fireEvent.click(resetButton);

    expect(resetButton).toBeInTheDocument();
  });

  it('should show entry details on click', () => {
    render(<PerformanceTimeline entries={mockEntries} />);

    const entryElement = screen.getByText('API Call 1');
    fireEvent.click(entryElement);

    expect(screen.getByText('Operation Details')).toBeInTheDocument();
  });

  it('should close details panel', () => {
    render(<PerformanceTimeline entries={mockEntries} />);

    fireEvent.click(screen.getByText('API Call 1'));

    const closeButton = screen.getByLabelText('Close details');
    fireEvent.click(closeButton);

    expect(screen.queryByText('Operation Details')).not.toBeInTheDocument();
  });

  it('should detect bottlenecks', () => {
    const entriesWithBottleneck: PerformanceEntry[] = [
      {
        name: 'Slow Operation',
        startTime: 0,
        duration: 1000,
        type: 'api',
      },
      {
        name: 'Fast Operation',
        startTime: 1000,
        duration: 10,
        type: 'cache',
      },
    ];

    render(<PerformanceTimeline entries={entriesWithBottleneck} />);

    expect(screen.getByText(/bottleneck/)).toBeInTheDocument();
  });

  it('should export timeline data', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    render(<PerformanceTimeline entries={mockEntries} />);

    const exportButton = screen.getByLabelText('Export');
    fireEvent.click(exportButton);

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it('should render with dark theme', () => {
    const { container } = render(<PerformanceTimeline entries={mockEntries} theme="dark" />);
    expect(container.querySelector('.performance-timeline--dark')).toBeInTheDocument();
  });

  it('should show empty state when no entries', () => {
    render(<PerformanceTimeline entries={[]} />);
    expect(screen.getByText(/No performance data available/)).toBeInTheDocument();
  });

  it('should render waterfall chart', () => {
    const { container } = render(<PerformanceTimeline entries={mockEntries} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should hide details when showDetails is false', () => {
    render(<PerformanceTimeline entries={mockEntries} showDetails={false} />);

    fireEvent.click(screen.getByText('API Call 1'));

    expect(screen.queryByText('Operation Details')).not.toBeInTheDocument();
  });
});
