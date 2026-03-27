import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Todo } from '@/pages/Todo';

const baseTask = {
  id: 'task-1',
  content: 'Ship redesign',
  status: 'pending' as const,
  created_at: '2026-03-20T10:00:00.000Z',
  updated_at: '2026-03-20T10:00:00.000Z',
};

describe('todo page contract', () => {
  const invoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    invoke.mockReset();
  });

  it('covers loading/empty/error/success states', async () => {
    const unresolved = new Promise(() => undefined);
    invoke.mockImplementation((channel: string) => {
      if (channel === 'todo:getAll') return unresolved;
      return Promise.resolve({ success: true });
    });

    const { unmount } = render(<Todo />);
    expect(screen.getByTestId('todo-state-loading')).toBeInTheDocument();
    unmount();

    invoke.mockImplementation((channel: string) => {
      if (channel === 'todo:getAll') return Promise.resolve({ success: true, tasks: [] });
      return Promise.resolve({ success: true });
    });
    const emptyView = render(<Todo />);
    expect(await screen.findByTestId('todo-state-empty')).toBeInTheDocument();
    emptyView.unmount();

    invoke.mockImplementation((channel: string) => {
      if (channel === 'todo:getAll') return Promise.resolve({ success: false, error: 'network fail' });
      return Promise.resolve({ success: true });
    });
    const errorView = render(<Todo />);
    expect(await screen.findByTestId('todo-state-error')).toBeInTheDocument();
    errorView.unmount();

    invoke.mockImplementation((channel: string) => {
      if (channel === 'todo:getAll') return Promise.resolve({ success: true, tasks: [baseTask] });
      return Promise.resolve({ success: true });
    });
    render(<Todo />);
    expect(await screen.findByTestId('todo-state-success')).toBeInTheDocument();
    expect(screen.getByTestId('todo-list-section')).toBeInTheDocument();
  });

  it('keeps create/edit/complete/delete and quick-add/edit entry points reachable', async () => {
    invoke.mockImplementation((channel: string, payload?: unknown) => {
      if (channel === 'todo:getAll') {
        return Promise.resolve({ success: true, tasks: [baseTask] });
      }
      if (channel === 'todo:add') {
        return Promise.resolve({
          success: true,
          task: {
            ...baseTask,
            id: 'task-2',
            content: String(payload),
          },
        });
      }
      if (channel === 'todo:update') {
        const updatePayload = payload as { id: string; content: string };
        return Promise.resolve({
          success: true,
          task: {
            ...baseTask,
            id: updatePayload.id,
            content: updatePayload.content,
            updated_at: '2026-03-20T10:10:00.000Z',
          },
        });
      }
      if (channel === 'todo:toggle') {
        return Promise.resolve({
          success: true,
          task: {
            ...baseTask,
            status: 'completed',
            updated_at: '2026-03-20T10:11:00.000Z',
          },
        });
      }
      if (channel === 'todo:delete') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({ success: true });
    });

    render(<Todo />);

    await screen.findByText('Ship redesign');

    const quickAddInput = screen.getByTestId('todo-quick-add-input');
    fireEvent.change(quickAddInput, { target: { value: 'Add smoke tests' } });
    fireEvent.click(screen.getByTestId('todo-quick-add-submit'));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('todo:add', 'Add smoke tests');
    });

    fireEvent.click(screen.getByTestId('todo-edit-task-1'));
    const editInput = screen.getByTestId('todo-edit-input-task-1');
    fireEvent.change(editInput, { target: { value: 'Ship redesign quickly' } });
    fireEvent.click(screen.getByTestId('todo-edit-save-task-1'));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('todo:update', {
        id: 'task-1',
        content: 'Ship redesign quickly',
      });
    });

    fireEvent.click(screen.getByTestId('todo-toggle-task-1'));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('todo:toggle', 'task-1');
    });

    fireEvent.click(screen.getByTestId('todo-delete-task-1'));
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('todo:delete', 'task-1');
    });
  });
});
