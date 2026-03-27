/**
 * Todo Page
 * Smart Todo List management page - extracted from documents via AI
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus,
  ListChecks,
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
import { TodoListSection } from './components/TodoListSection';
import { TodoStateActionLink, TodoStatePanel } from './components/TodoStatePanel';

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
    void fetchTasks();
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
          setTasks((prev) => [...prev, ...addResult.tasks]);
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
          setTasks((prev) => [...prev, ...addResult.tasks]);
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
  }, [extractTodosFromFile]);

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
        setTasks(tasks.map((task) => (task.id === id ? result.task as TodoItem : task)));
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
        setTasks(tasks.filter((task) => task.id !== id));
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
        setTasks(tasks.map((task) => (task.id === id ? result.task as TodoItem : task)));
        setEditingId(null);
        setEditingContent('');
      } else {
        setError(result.error || 'Failed to update task');
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const pendingTasks = tasks.filter((task) => task.status === 'pending');
  const completedTasks = tasks.filter((task) => task.status === 'completed');

  return (
    <div className="container mx-auto max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-3">
            <ListChecks className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">
          {pendingTasks.length} {t('pending')} / {completedTasks.length} {t('completed')}
        </Badge>
      </div>

      {/* Drop Zone - Extract todos from file */}
      <Card
        className={cn(
          'mb-6 cursor-pointer border-2 border-dashed transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          extracting && 'pointer-events-none opacity-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          {extracting ? (
            <>
              <CircleNotch className="mb-3 h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('extracting') || 'Extracting todos...'}</p>
            </>
          ) : (
            <>
              <Upload className={cn('mb-3 h-10 w-10', dragOver ? 'text-primary' : 'text-muted-foreground')} />
              <p className="font-medium">{t('dropFile') || 'Drop file here to extract todos'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
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

      {/* Quick add */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder={t('addTask')}
              value={newTaskContent}
              onChange={(event) => setNewTaskContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void addTask();
                }
              }}
              className="flex-1"
              data-testid="todo-quick-add-input"
            />
            <Button
              onClick={() => {
                void addTask();
              }}
              disabled={!newTaskContent.trim()}
              data-testid="todo-quick-add-submit"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <TodoStatePanel
          state="error"
          error={error}
          onDismissError={() => setError(null)}
        />
      ) : null}

      {loading ? (
        <TodoStatePanel state="loading" description={t('loading')} />
      ) : tasks.length === 0 ? (
        <TodoStatePanel
          state="empty"
          title={t('noTasks')}
          description={t('noTasksDesc')}
        >
          <TodoStateActionLink href="/chat" label={t('goToChat')} />
        </TodoStatePanel>
      ) : (
        <>
          <TodoStatePanel
            state="success"
            title={`${pendingTasks.length} ${t('pending')} / ${completedTasks.length} ${t('completed')}`}
            description={t('description')}
          />
          <TodoListSection
            pendingTasks={pendingTasks}
            completedTasks={completedTasks}
            editingId={editingId}
            editingContent={editingContent}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onStartEdit={startEditing}
            onCancelEdit={cancelEditing}
            onSaveEdit={saveEditing}
            onEditingContentChange={setEditingContent}
            t={t}
          />
        </>
      )}
    </div>
  );
}

export default Todo;
