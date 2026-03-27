import { Check, Circle, CheckCircle, Clock, PencilSimple, Trash, X, FloppyDisk } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}

interface TodoListSectionProps {
  pendingTasks: TodoItem[];
  completedTasks: TodoItem[];
  editingId: string | null;
  editingContent: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onStartEdit: (task: TodoItem) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onEditingContentChange: (content: string) => void;
  t: (key: string) => string;
}

export function TodoListSection({
  pendingTasks,
  completedTasks,
  editingId,
  editingContent,
  onToggle,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditingContentChange,
  t,
}: TodoListSectionProps) {
  return (
    <div className="space-y-6" data-testid="todo-list-section">
      {pendingTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Circle className="h-4 w-4" />
            {t('pendingTasks')} ({pendingTasks.length})
          </h2>
          {pendingTasks.map((task) => (
            <TodoListItem
              key={task.id}
              task={task}
              isEditing={editingId === task.id}
              editingContent={editingContent}
              onToggle={() => onToggle(task.id)}
              onDelete={() => onDelete(task.id)}
              onStartEdit={() => onStartEdit(task)}
              onCancelEdit={onCancelEdit}
              onSaveEdit={() => onSaveEdit(task.id)}
              onEditingContentChange={onEditingContentChange}
              t={t}
            />
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            {t('completedTasks')} ({completedTasks.length})
          </h2>
          {completedTasks.map((task) => (
            <TodoListItem
              key={task.id}
              task={task}
              isEditing={editingId === task.id}
              editingContent={editingContent}
              onToggle={() => onToggle(task.id)}
              onDelete={() => onDelete(task.id)}
              onStartEdit={() => onStartEdit(task)}
              onCancelEdit={onCancelEdit}
              onSaveEdit={() => onSaveEdit(task.id)}
              onEditingContentChange={onEditingContentChange}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TodoListItemProps {
  task: TodoItem;
  isEditing: boolean;
  editingContent: string;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditingContentChange: (content: string) => void;
  t: (key: string) => string;
}

function TodoListItem({
  task,
  isEditing,
  editingContent,
  onToggle,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditingContentChange,
  t,
}: TodoListItemProps) {
  const isCompleted = task.status === 'completed';

  return (
    <Card className={cn('transition-all', isCompleted && 'opacity-60')}>
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={cn(
              'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors',
              isCompleted
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-muted-foreground hover:border-primary'
            )}
            data-testid={`todo-toggle-${task.id}`}
          >
            {isCompleted && <Check className="h-3 w-3" />}
          </button>

          {isEditing ? (
            <Input
              value={editingContent}
              onChange={(event) => onEditingContentChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSaveEdit();
                if (event.key === 'Escape') onCancelEdit();
              }}
              className="h-8 flex-1"
              autoFocus
              data-testid={`todo-edit-input-${task.id}`}
            />
          ) : (
            <span className={cn('flex-1', isCompleted && 'text-muted-foreground line-through')}>
              {task.content}
            </span>
          )}

          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-500"
                  onClick={onSaveEdit}
                  data-testid={`todo-edit-save-${task.id}`}
                >
                  <FloppyDisk className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onCancelEdit}
                  data-testid={`todo-edit-cancel-${task.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onStartEdit}
                  data-testid={`todo-edit-${task.id}`}
                >
                  <PencilSimple className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={onDelete}
                  data-testid={`todo-delete-${task.id}`}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="ml-8 mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{t('created')}: {new Date(task.created_at).toLocaleDateString()}</span>
          {task.updated_at !== task.created_at ? (
            <span>• {t('updated')}: {new Date(task.updated_at).toLocaleDateString()}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
