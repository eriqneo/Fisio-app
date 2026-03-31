import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Clock, 
  Eraser,
  CheckSquare
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Start typing...',
      }),
      Highlight,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const addTimestamp = () => {
    const now = new Date().toLocaleString();
    editor.chain().focus().insertContent(`[${now}] `).run();
  };

  return (
    <div className="border border-primary/5 rounded-[32px] overflow-hidden bg-white focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-sm">
      <div className="flex items-center gap-2 px-6 py-4 bg-primary/[0.02] border-b border-primary/5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive('bold') ? 'bg-primary text-white' : 'hover:bg-primary/5 text-primary/40'}`}
        >
          <Bold size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive('italic') ? 'bg-primary text-white' : 'hover:bg-primary/5 text-primary/40'}`}
        >
          <Italic size={18} />
        </button>
        
        <div className="w-px h-6 bg-primary/10 mx-2" />
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive('bulletList') ? 'bg-primary text-white' : 'hover:bg-primary/5 text-primary/40'}`}
        >
          <List size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive('orderedList') ? 'bg-primary text-white' : 'hover:bg-primary/5 text-primary/40'}`}
        >
          <ListOrdered size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive('taskList') ? 'bg-primary text-white' : 'hover:bg-primary/5 text-primary/40'}`}
        >
          <CheckSquare size={18} />
        </button>
        
        <div className="w-px h-6 bg-primary/10 mx-2" />
        
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="p-2 rounded-xl hover:bg-primary/5 text-primary/40 transition-all"
          title="Clear Formatting"
        >
          <Eraser size={18} />
        </button>
        
        <div className="flex-1" />
        
        <button
          type="button"
          onClick={addTimestamp}
          className="px-4 py-2 rounded-xl hover:bg-primary/5 text-primary/40 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]"
        >
          <Clock size={16} />
          Timestamp
        </button>
      </div>
      <EditorContent 
        editor={editor} 
        className="p-8 min-h-[200px] prose prose-sm max-w-none focus:outline-none"
      />
    </div>
  );
}
