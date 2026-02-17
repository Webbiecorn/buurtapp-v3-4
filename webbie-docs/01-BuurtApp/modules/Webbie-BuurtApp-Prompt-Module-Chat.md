# AI Prompt: Chat (AI-Powered) Module - Buurtconciërge App

## Context
Je gaat een complete AI-powered Chat module bouwen voor een React + TypeScript wijkbeheer applicatie. Deze module gebruikt Google Gemini API voor naturaal language queries over app data, statistieken en hulp.

## Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6
- **AI:** Google Gemini API (gemini-1.5-flash)
- **Styling:** Tailwind CSS 3.4 (dark mode)
- **State:** React Context + local state
- **Icons:** Lucide React
- **Markdown:** react-markdown voor formatted responses

## Module Requirements

### Core Functionaliteit

1. **ChatPage - Main Interface**
   - Full-height chat container
   - Message bubbles (user vs AI)
   - Input field (bottom, sticky)
   - Send button + Enter key submit
   - Loading indicator tijdens AI response
   - Auto-scroll to bottom bij nieuwe message
   - Message history persistence (localStorage)
   - "Clear chat" button

2. **AI Capabilities**
   - Beantwoord vragen over app data:
     - "Hoeveel meldingen zijn er in Boswijk?"
     - "Wat is de status van project X?"
     - "Geef een overzicht van uren deze week"
   - Statistieken analyse:
     - "Wat is de meest voorkomende melding categorie?"
     - "Welke wijk heeft de meeste projecten?"
   - Help functionaliteit:
     - "Hoe maak ik een nieuw dossier?"
     - "Wat betekent status 'Fixi melding gemaakt'?"
   - Context-aware (multi-turn conversation)

3. **Features**
   - **Suggested questions:** Quick action buttons met veelgestelde vragen
   - **Code highlighting:** Syntax highlighting voor code snippets in antwoorden
   - **Copy button:** Per message
   - **Regenerate response:** Bij slechte antwoorden
   - **Stop generation:** Cancel tijdens lange responses
   - **Export chat:** Download als markdown
   - **Voice input:** (optioneel, Web Speech API)

4. **Message Types**
   - **User messages:** Rechts, blauwe bubble
   - **AI messages:** Links, grijze bubble, met avatar
   - **System messages:** Centered, klein lettertype (bijv. "Chat gestart")
   - **Error messages:** Rood gemarkeerd
   - **Loading messages:** Animatie met typing dots

5. **Context Injection**
   - Bij elke AI call:
     - Geef app data mee (count summaries, niet full data)
     - User role + permissions
     - Current date + time
     - Recent messages (last 10 for context)
   - Prompt engineering voor consistente responses

## Data Model

```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Component Examples

### ChatPage.tsx
```tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { sendAIQuery } from '@/services/aiInsights';
import { Button, Input } from '@/components/ui';
import { Send, Trash2, Download, StopCircle, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

export const ChatPage: React.FC = () => {
  const { meldingen, projecten, urenregistraties, dossiers, currentUser } = useAppContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load messages from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })));
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Prepare context data
  const contextData = {
    meldingenCount: meldingen.length,
    meldingenByStatus: {
      'In behandeling': meldingen.filter(m => m.status === 'In behandeling').length,
      'Fixi melding': meldingen.filter(m => m.status === 'Fixi melding gemaakt').length,
      'Afgerond': meldingen.filter(m => m.status === 'Afgerond').length,
    },
    meldingenByWijk: meldingen.reduce((acc, m) => {
      acc[m.wijk] = (acc[m.wijk] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    topCategories: getTopCategories(meldingen, 3),
    projectenCount: projecten.length,
    lopendeProjecten: projecten.filter(p => p.status === 'Lopend').length,
    urenDezeWeek: calculateUrenThisWeek(urenregistraties),
    dossiersCount: dossiers.length,
    userRole: currentUser?.role,
    currentDate: new Date().toLocaleDateString('nl-NL'),
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create abort controller
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Build context prompt
      const contextPrompt = buildContextPrompt(contextData, messages.slice(-10));

      // Call Gemini API
      const response = await sendAIQuery(
        contextPrompt + '\n\nUser question: ' + userMessage.content,
        controller.signal
      );

      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Response gestopt');
      } else {
        const errorMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, er is een fout opgetreden. Probeer het opnieuw.',
          timestamp: new Date(),
          isError: true,
        };
        setMessages(prev => [...prev, errorMessage]);
        toast.error('AI fout');
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
      inputRef.current?.focus();
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length < 2) return;

    // Remove last AI message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      setMessages(prev => prev.slice(0, -1));
      setInput(lastUserMessage.content);
      setTimeout(() => handleSend(), 100);
    }
  };

  const handleClearChat = () => {
    if (confirm('Weet je zeker dat je de chat wilt wissen?')) {
      setMessages([]);
      localStorage.removeItem('chat_history');
      toast.success('Chat gewist');
    }
  };

  const handleExportChat = () => {
    const markdown = messages
      .map(m => `**${m.role === 'user' ? 'Jij' : 'AI'}** (${formatDate(m.timestamp)}):\n${m.content}\n`)
      .join('\n---\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_export_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Chat geëxporteerd');
  };

  const suggestedQuestions = [
    'Hoeveel meldingen zijn er in Boswijk?',
    'Wat is de meest voorkomende categorie?',
    'Geef een overzicht van uren deze week',
    'Hoeveel lopende projecten zijn er?',
    'Hoe maak ik een nieuw dossier?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              AI Assistent
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Stel vragen over je wijkdata
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportChat}
            disabled={messages.length === 0}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Welkom bij de AI Assistent
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Stel vragen over meldingen, projecten, uren en meer
            </p>

            {/* Suggested Questions */}
            <div className="max-w-2xl mx-auto space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Probeer een van deze vragen:
              </p>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="block w-full px-4 py-3 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Stel een vraag..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {isLoading ? (
              <Button onClick={handleStop} variant="danger">
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button onClick={handleSend} disabled={!input.trim()}>
                <Send className="w-5 h-5" />
              </Button>
            )}
          </div>

          {messages.length > 0 && !isLoading && (
            <button
              onClick={handleRegenerate}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Regenerate response
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : message.isError
              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
          }`}
        >
          <ReactMarkdown
            className="prose prose-sm dark:prose-invert max-w-none"
            components={{
              code: ({ inline, children }) => (
                inline ? (
                  <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-sm">
                    {children}
                  </code>
                ) : (
                  <pre className="bg-gray-800 text-white p-3 rounded overflow-x-auto">
                    <code>{children}</code>
                  </pre>
                )
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
          {formatDate(message.timestamp)}
        </p>
      </div>
    </div>
  );
};
```

### aiInsights.ts (Service)
```typescript
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function sendAIQuery(prompt: string, signal?: AbortSignal): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || 'Geen antwoord ontvangen';
}

function buildContextPrompt(contextData: any, recentMessages: ChatMessage[]): string {
  return `
Je bent een AI assistent voor de Buurtconciërge App, een wijkbeheer applicatie.

**Context Data:**
- Totaal meldingen: ${contextData.meldingenCount}
- Meldingen per status: ${JSON.stringify(contextData.meldingenByStatus)}
- Meldingen per wijk: ${JSON.stringify(contextData.meldingenByWijk)}
- Top categorieën: ${contextData.topCategories.join(', ')}
- Totaal projecten: ${contextData.projectenCount} (waarvan ${contextData.lopendeProjecten} lopend)
- Uren deze week: ${contextData.urenDezeWeek.toFixed(1)}u
- Totaal dossiers: ${contextData.dossiersCount}
- Gebruikersrol: ${contextData.userRole}
- Datum: ${contextData.currentDate}

**Recente conversatie:**
${recentMessages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n')}

Beantwoord vragen in het Nederlands, wees behulpzaam en concise. Gebruik markdown formatting waar relevant.
`;
}
```

## Analytics
```typescript
trackEvent('chat_message_sent', { messageLength: input.length });
trackEvent('chat_response_received', { responseLength: response.length });
trackEvent('chat_exported');
```

## Testing Checklist
- [ ] Messages verzenden werkt
- [ ] AI responses komen terug
- [ ] Loading state tijdens wachten
- [ ] Stop generation werkt
- [ ] Regenerate response werkt
- [ ] Chat history persistence (localStorage)
- [ ] Export naar markdown werkt
- [ ] Clear chat werkt
- [ ] Markdown rendering correct
- [ ] Dark mode support
- [ ] Mobile responsive

Succes! 💬
