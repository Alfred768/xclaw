/**
 * Todo Page
 * Smart Todo List management page - extracted from documents via AI
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Check,
  X,
  Plus,
  Trash,
  PencilSimple,
  FloppyDisk,
  ListChecks,
  FileText,
  Clock,
  CheckCircle,
  Circle,
  Upload,
  CircleNotch,
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { parseTodoItemsFromResponse } from '@/stores/chat';

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}

export function Todo() {
  const { t, i18n } = useTranslation('todo');
  const [tasks, setTasks] = useState<TodoItem[]>([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drag & drop state
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Extract todos from file via backend handler
  const extractTodosFromFile = async (file: File) => {
    try {
      setError(null);
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log('[Todo] Staging file:', file.name, file.type);

      // Stage file to disk via IPC
      const staged = await window.electron.ipcRenderer.invoke('file:stageBuffer', {
        base64,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
      }) as {
        id: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        stagedPath: string;
        preview: string | null;
      };

      console.log('[Todo] Staged file:', staged);

      if (!staged?.stagedPath) {
        console.error('[Todo] Failed to stage file');
        return;
      }

      // PDF files: extract text locally in main process, then ask LLM on plain text.
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        console.log('[Todo] Using todo:extractFromPdf for PDF...');
        const extractResult = await window.electron.ipcRenderer.invoke(
          'todo:extractFromPdf',
          staged.stagedPath,
        ) as { success: boolean; items?: string[]; error?: string };

        if (!extractResult.success) {
          console.error('[Todo] todo:extractFromPdf failed:', extractResult.error);
          setError(extractResult.error || 'Failed to extract todos from PDF');
          return;
        }

        const todoItems = Array.isArray(extractResult.items)
          ? extractResult.items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : [];

        if (todoItems.length === 0) {
          console.log('[Todo] No todo items extracted from PDF');
          setError('No actionable todo items were extracted from this PDF.');
          return;
        }

        const addResult = await window.electron.ipcRenderer.invoke('todo:addMany', todoItems) as {
          success: boolean;
          tasks?: TodoItem[];
          error?: string;
        };
        if (addResult.success && addResult.tasks) {
          setTasks((prev) => [...prev, ...addResult.tasks!]);
        }
        return;
      }

      // For text files, use chat:sendWithMedia
      const language = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase();
      const languageInstruction = language.startsWith('zh')
        ? '请使用简体中文输出待办事项。'
        : language.startsWith('ja')
          ? 'ToDo項目は日本語で出力してください。'
          : 'Please output todo items in English.';

      const prompt = `请从以下文件中提取所有待办事项/行动项，并以以下JSON格式返回：
[TODO_LIST:["item1", "item2", "item3"]]

只返回JSON格式，不要有其他内容。如果文件中没有明确的待办事项，请返回空列表。
${languageInstruction}`;

      const chatResult = await window.electron.ipcRenderer.invoke(
        'chat:sendWithMedia',
        {
          sessionKey: 'agent:main:translate-todo',
          message: prompt,
          deliver: false,
          idempotencyKey: `todo-extract-${Date.now()}`,
          media: [{
            filePath: staged.stagedPath,
            mimeType: staged.mimeType,
            fileName: staged.fileName,
          }],
        },
      ) as { success: boolean; result?: { runId?: string } };

      console.log('[Todo] Gateway result:', chatResult);

      // Poll for results
      let todoItems: string[] = [];
      const maxRetries = 40; // 40 * 3000ms = 120 seconds timeout
      const retryDelay = 3000;

      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        try {
          const historyResult = await window.electron.ipcRenderer.invoke(
            'gateway:rpc',
            'chat.history',
            { sessionKey: 'agent:main:translate-todo', limit: 5 }
          ) as { success: boolean; result?: { messages?: Array<{ role: string; content?: unknown }> } };

          const messages = historyResult?.result?.messages || [];

          const lastAssistantMsg = messages.filter((m: { role: string }) => m.role === 'assistant').pop();

          if (lastAssistantMsg?.content) {
            const contentStr = typeof lastAssistantMsg.content === 'string'
              ? lastAssistantMsg.content
              : JSON.stringify(lastAssistantMsg.content);

            console.log('[Todo] Response content:', contentStr.substring(0, 500));

            const parsedItems = parseTodoItemsFromResponse(contentStr);
            if (parsedItems.length > 0) {
              todoItems = parsedItems;
              console.log('[Todo] Extracted items:', todoItems);
              break;
            }
          }
        } catch (err) {
          console.log('[Todo] Poll error:', err);
        }
      }

      if (todoItems.length > 0) {
        const addResult = await window.electron.ipcRenderer.invoke('todo:addMany', todoItems) as {
          success: boolean;
          tasks?: TodoItem[];
          error?: string;
        };
        if (addResult.success && addResult.tasks) {
          setTasks((prev) => [...prev, ...addResult.tasks!]);
        }
      } else {
        console.log('[Todo] No todo items extracted');
      }
    } catch (err) {
      console.error('[Todo] Extract error:', err);
      setError(String(err));
    }
  };

  // Handle file drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setExtracting(true);
    try {
      for (const file of files) {
        // Use Gateway to extract todos from any file
        await extractTodosFromFile(file);
      }
    } finally {
      setExtracting(false);
    }
  }, [tasks, extractTodosFromFile]);

  // Handle file input change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setExtracting(true);
    try {
      for (const file of files) {
        // Use Gateway to extract todos from any file
        await extractTodosFromFile(file);
      }
    } finally {
      setExtracting(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
            <ListChecks className="h-8 w-8 text-primary" />
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

      {/* Drop Zone - Extract todos from file */}
      <Card
        className={cn(
          "mb-6 border-2 border-dashed transition-colors cursor-pointer",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          extracting && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="py-6 flex flex-col items-center justify-center text-center">
          {extracting ? (
            <>
              <CircleNotch className="h-10 w-10 text-primary animate-spin mb-3" />
              <p className="text-muted-foreground">{t('extracting') || 'Extracting todos...'}</p>
            </>
          ) : (
            <>
              <Upload className={cn("h-10 w-10 mb-3", dragOver ? "text-primary" : "text-muted-foreground")} />
              <p className="font-medium">{t('dropFile') || 'Drop file here to extract todos'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('dropFileDesc') || 'Supports .txt, .md and other text files'}
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.markdown,.text,.log,.pdf"
            multiple
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

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
                <CheckCircle className="h-4 w-4" />
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
                  <PencilSimple className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={onDelete}
                >
                  <Trash className="h-4 w-4" />
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
