import { useState } from 'react';
import { useAppStore } from '../store';

interface AIChatProps {
  raceId: string;
}

const EXAMPLE_QUESTIONS = [
  'What if Hamilton pitted 5 laps earlier?',
  'What if there was no safety car?',
  'What if it rained from lap 20?',
  'Could Norris have won with a one-stop?',
];

export function AIChat({ raceId }: AIChatProps) {
  const [input, setInput] = useState('');
  const chatMessages = useAppStore((s) => s.chatMessages);
  const chatLoading = useAppStore((s) => s.chatLoading);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);

  function handleSend() {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput('');
    sendChatMessage(raceId, text);
  }

  function handleExample(q: string) {
    setInput(q);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Chat thread */}
      {chatMessages.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '8px 0',
          }}
        >
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 300,
                lineHeight: '1.7',
                ...(msg.role === 'user'
                  ? {
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                    }
                  : {
                      background: 'var(--bg-surface)',
                      borderLeft: '2px solid var(--accent)',
                      borderRadius: '0',
                      color: 'var(--text-secondary)',
                    }),
              }}
            >
              {msg.content}
            </div>
          ))}
          {chatLoading && (
            <div
              style={{
                alignSelf: 'flex-start',
                color: 'var(--text-muted)',
                fontSize: '13px',
                padding: '8px 12px',
              }}
            >
              Thinking...
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a what-if question..."
          style={{
            flex: 1,
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 300,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={chatLoading || !input.trim()}
          style={{
            background: 'var(--text-primary)',
            color: 'var(--bg-base)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 400,
            cursor: chatLoading ? 'not-allowed' : 'pointer',
            opacity: chatLoading || !input.trim() ? 0.5 : 1,
          }}
        >
          Ask
        </button>
      </div>

      {/* Example pills */}
      {chatMessages.length === 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleExample(q)}
              style={{
                background: 'transparent',
                border: '0.5px solid var(--border-subtle)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: 300,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-emphasis)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
