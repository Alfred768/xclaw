/**
 * Todo Page
 * Smart Todo List management page - extracted from documents via AI
 */
import { useEffect, useState } from 'react';
import {
  Check,
  X,
  Plus,
  Trash2,
  Edit3,
  Save,
  ListTodo,
  FileText,
  Clock,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}

export function Todo() {
  const { t } = useTranslation('todo');
  const [tasks, setTasks] = useState<TodoItem[]>([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tasks on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const result = await window.electron.ipcRenderer.invoke('todo:getAll') as {
        success: boolean;
        tasks?: TodoItem[];
        error?: string;
      };
      if (result.success && result.tasks) {
        setTasks(result.tasks);
      } else {
        setError(result.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const addTask = async () => {
    if (!newTaskContent.trim()) return;

    try {
      const result = await window.electron.ipcRenderer.invoke('todo:add', newTaskContent) as {
        success: boolean;
        task?: TodoItem;
        error?: string;
      };
      if (result.success && result.task) {
        setTasks([...tasks, result.task]);
        setNewTaskContent('');
      } else {
        setError(result.error || 'Failed to add task');
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const toggleTask = async (id: string) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('todo:toggle', id) as {
        success: boolean;
        task?: TodoItem;
        error?: string;
      };
      if (result.success && result.task) {
        setTasks(tasks.map((t) => (t.id === id ? result.task! : t)));
      } else {
        setError(result.error || 'Failed to toggle task');
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const result = await window.electron.ipcRenderer.invoke('todo:delete', id) as {
        success: boolean;
        error?: string;
      };
      if (result.success) {
        setTasks(tasks.filter((t) => t.id !== id));
      } else {
        setError(result.error || 'Failed to delete task');
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const startEditing = (task: TodoItem) => {
    setEditingId(task.id);
    setEditingContent(task.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const saveEditing = async (id: string) => {
    if (!editingContent.trim()) return;

    try {
      const result = await window.electron.ipcRenderer.invoke('todo:update', {
        id,
        content: editingContent,
      }) as {
        success: boolean;
        task?: TodoItem;
        error?: string;
      };
      if (result.success && result.task) {
        setTasks(tasks.map((t) => (t.id === id ? result.task! : t)));
        setEditingId(null);
        setEditingContent('');
      } else {
        setError(result.error || 'Failed to update task');
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <ListTodo className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">
              {t('description')}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {pendingTasks.length} {t('pending')} / {completedTasks.length} {t('completed')}
        </Badge>
      </div>

      {/* Add new task */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder={t('addTask')}
              value={newTaskContent}
              onChange={(e) => setNewTaskContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              className="flex-1"
            />
            <Button onClick={addTask} disabled={!newTaskContent.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline"
          >
            {t('dismiss')}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('loading')}</p>
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noTasks')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('noTasksDesc')}
            </p>
            <Button variant="outline" asChild>
              <a href="/chat">{t('goToChat')}</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Circle className="h-4 w-4" />
                {t('pendingTasks')} ({pendingTasks.length})
              </h2>
              {pendingTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isEditing={editingId === task.id}
                  editingContent={editingContent}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                  onStartEdit={() => startEditing(task)}
                  onCancelEdit={cancelEditing}
                  onSaveEdit={() => saveEditing(task.id)}
                  onEditingContentChange={setEditingContent}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t('completedTasks')} ({completedTasks.length})
              </h2>
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isEditing={editingId === task.id}
                  editingContent={editingContent}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                  onStartEdit={() => startEditing(task)}
                  onCancelEdit={cancelEditing}
                  onSaveEdit={() => saveEditing(task.id)}
                  onEditingContentChange={setEditingContent}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Task item component
interface TaskItemProps {
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

function TaskItem({
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
}: TaskItemProps) {
  const isCompleted = task.status === 'completed';

  return (
    <Card className={cn(
      "transition-all",
      isCompleted && "opacity-60"
    )}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <button
            onClick={onToggle}
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
              isCompleted
                ? "bg-green-500 border-green-500 text-white"
                : "border-muted-foreground hover:border-primary"
            )}
          >
            {isCompleted && <Check className="h-3 w-3" />}
          </button>

          {/* Content */}
          {isEditing ? (
            <Input
              value={editingContent}
              onChange={(e) => onEditingContentChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="flex-1 h-8"
              autoFocus
            />
          ) : (
            <span className={cn(
              "flex-1",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {task.content}
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-500"
                  onClick={onSaveEdit}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onCancelEdit}
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
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 mt-2 ml-8 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{t('created')}: {new Date(task.created_at).toLocaleDateString()}</span>
          {task.updated_at !== task.created_at && (
            <span>• {t('updated')}: {new Date(task.updated_at).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default Todo;
