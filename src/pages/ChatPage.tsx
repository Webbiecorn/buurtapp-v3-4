import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Timestamp, collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

interface MessageDoc {
  id: string;
  text?: string | null;
  attachments?: Array<{ url: string; type: 'image' | 'pdf' | 'file'; name: string; size: number }> | null;
  userId: string;
  createdAt: Date;
}

const ChatPage: React.FC = () => {
  const { conversationId } = ReactRouterDOM.useParams();
  const { users, currentUser, sendChatMessage, markConversationSeen } = useAppContext();
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const otherUsers = useMemo(() => users.filter(u => participants.includes(u.id)), [users, participants]);

  useEffect(() => {
    if (!conversationId) return;
    // subscribe to conversation meta
    const unsubConv = onSnapshot(doc(db, 'conversations', conversationId), (snap) => {
      if (snap.exists()) {
        const data: any = snap.data();
        setParticipants(Array.isArray(data.participants) ? data.participants : []);
        setTitle(data.title);
      }
    });
    // subscribe to messages
    const q = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(q, (ss) => {
      const list = ss.docs.map(d => {
        const v: any = d.data();
        return {
          id: d.id,
          text: v.text ?? undefined,
          attachments: v.attachments ?? undefined,
          userId: v.userId,
          createdAt: v.createdAt instanceof Timestamp ? v.createdAt.toDate() : new Date(),
        } as MessageDoc;
      });
      setMessages(list);
      // scroll to bottom on new message
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    // mark as seen
    markConversationSeen(conversationId);
    return () => {
      unsubConv();
      unsubMsgs();
    };
  }, [conversationId, markConversationSeen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files;
    if (!f) return;
    setFiles(Array.from(f));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId) return;
    if (!text.trim() && files.length === 0) return;
    await sendChatMessage(conversationId, { text: text.trim() || undefined, files });
    setText('');
    setFiles([]);
    const input = document.getElementById('chat-file-input') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const nameFor = (userId: string) => users.find(u => u.id === userId)?.name || 'Onbekend';
  const avatarFor = (userId: string) => users.find(u => u.id === userId)?.avatarUrl;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b px-4 py-3 bg-white dark:bg-dark-surface">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
          {title || otherUsers.map(u => u.name).join(', ') || 'Chat'}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-dark-bg">
        {messages.map(m => {
          const mine = m.userId === currentUser?.id;
          return (
            <div key={m.id} className={`mb-3 flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 shadow ${mine ? 'bg-brand-primary text-white' : 'bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text-primary'}`}>
                <div className="flex items-center mb-1">
                  {!mine && <img src={avatarFor(m.userId)} alt="" className="h-5 w-5 rounded-full mr-2" />}
                  <span className="text-xs opacity-70">{nameFor(m.userId)}</span>
                  <span className="text-xs opacity-60 ml-2">{m.createdAt.toLocaleString()}</span>
                </div>
                {m.text && <div className="whitespace-pre-wrap text-sm">{m.text}</div>}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {m.attachments.map((a, idx) => (
                      <div key={idx} className="text-sm">
                        {a.type === 'image' ? (
                          <a href={a.url} target="_blank" rel="noreferrer">
                            <img src={a.url} alt={a.name} className="rounded max-h-64" />
                          </a>
                        ) : a.type === 'pdf' ? (
                          <a href={a.url} target="_blank" rel="noreferrer" className="underline">{a.name} (PDF)</a>
                        ) : (
                          <a href={a.url} target="_blank" rel="noreferrer" className="underline">{a.name}</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t bg-white dark:bg-dark-surface p-3 flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 rounded border border-gray-300 dark:border-dark-border bg-gray-50 dark:bg-dark-bg px-3 py-2"
          placeholder="Typ een bericht..."
        />
        <input
          id="chat-file-input"
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <label htmlFor="chat-file-input" className="px-3 py-2 rounded bg-gray-100 dark:bg-dark-bg border border-gray-300 dark:border-dark-border cursor-pointer">Bijlagen</label>
        <button type="submit" className="px-4 py-2 rounded bg-brand-primary text-white">Verstuur</button>
      </form>
    </div>
  );
};

export default ChatPage;
