import React, { useState, useEffect, useRef } from 'react';
import { Send, Save, Trash2, Plus, MessageSquare } from 'lucide-react';
import './DeepSeekChat.css';

const SYSTEM_PROMPTS_KEY = 'deepseekSystemPrompts';
const DEFAULT_API_KEY = 'sk-9ddf3001eace4fdeb18b958fe5e10751';

const initialPromptsState = {
  prompts: [],
  current: '',
};

const DeepSeekChat = () => {
  const [promptsState, setPromptsState] = useState(initialPromptsState);
  const [newSystemPrompt, setNewSystemPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const chatEndRef = useRef(null);

  // Cargar prompts y prompt activo desde localStorage al montar
  useEffect(() => {
    try {
      const storedPromptsRaw = localStorage.getItem(SYSTEM_PROMPTS_KEY);
      console.log('[DeepSeekChat] Leyendo prompts de localStorage:', storedPromptsRaw);
      const stored = storedPromptsRaw ? JSON.parse(storedPromptsRaw) : initialPromptsState;
      setPromptsState({
        prompts: Array.isArray(stored.prompts) ? stored.prompts : [],
        current: typeof stored.current === 'string' ? stored.current : '',
      });
      console.log('[DeepSeekChat] Prompts restaurados:', stored.prompts, 'Prompt activo:', stored.current);
    } catch (e) {
      setPromptsState(initialPromptsState);
      setStorageError('No se pudo leer los prompts del almacenamiento local.');
      console.error('[DeepSeekChat] Error al leer prompts de localStorage:', e);
    }
    setApiKey(DEFAULT_API_KEY);
  }, []);

  // Guardar prompts y prompt activo en localStorage cuando cambian
  useEffect(() => {
    try {
      localStorage.setItem(SYSTEM_PROMPTS_KEY, JSON.stringify(promptsState));
      console.log('[DeepSeekChat] Prompts y prompt activo guardados en localStorage:', promptsState);
    } catch (e) {
      setStorageError('No se pudo guardar los prompts en el almacenamiento local.');
      console.error('[DeepSeekChat] Error al guardar prompts en localStorage:', e);
    }
  }, [promptsState]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Guardar nuevo prompt
  const saveSystemPrompt = () => {
    const prompt = newSystemPrompt.trim();
    if (!prompt || promptsState.prompts.includes(prompt)) return;
    setPromptsState(prev => ({
      prompts: [prompt, ...prev.prompts],
      current: prompt,
    }));
    setNewSystemPrompt('');
    console.log('[DeepSeekChat] Nuevo prompt guardado y seleccionado:', prompt);
  };

  // Eliminar prompt
  const deleteSystemPrompt = (prompt) => {
    setPromptsState(prev => {
      const updatedPrompts = prev.prompts.filter(p => p !== prompt);
      const updatedCurrent = prev.current === prompt ? '' : prev.current;
      console.log('[DeepSeekChat] Prompt eliminado:', prompt);
      return { prompts: updatedPrompts, current: updatedCurrent };
    });
  };

  // Seleccionar prompt
  const selectSystemPrompt = (prompt) => {
    setPromptsState(prev => ({ ...prev, current: prompt }));
  };

  // Limpiar chat
  const clearChat = () => {
    setMessages([]);
    setError('');
  };

  // Enviar mensaje al API
  const sendMessage = async () => {
    if (!inputMessage.trim() || !apiKey) return;
    setError('');
    const userMsg = { role: 'user', content: inputMessage };
    const sysMsg = promptsState.current
      ? [{ role: 'system', content: promptsState.current }]
      : [];
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [...sysMsg, ...newMessages],
        }),
      });
      if (!res.ok) throw new Error('Error en la API');
      const data = await res.json();
      const assistantMsg = {
        role: 'assistant',
        content: data.choices?.[0]?.message?.content || 'Sin respuesta',
      };
      setMessages([...newMessages, assistantMsg]);
    } catch (e) {
      setError('Error al conectar con DeepSeek API');
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar con Enter
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) sendMessage();
    }
  };

  return (
    <div className="deepseek-chat-container">
      <aside className="sidebar">
        <h2>Prompts del sistema</h2>
        <textarea
          className="prompt-input"
          placeholder="Nuevo system prompt..."
          value={newSystemPrompt}
          onChange={e => setNewSystemPrompt(e.target.value)}
          rows={3}
        />
        <button
          className="btn save-btn"
          onClick={saveSystemPrompt}
          disabled={!newSystemPrompt.trim()}
          title="Guardar prompt"
        >
          <Save size={16} /> Guardar
        </button>
        <div className="prompts-list">
          {promptsState.prompts.length === 0 && (
            <div className="empty-prompts">No hay prompts guardados</div>
          )}
          {promptsState.prompts.map(prompt => (
            <div
              key={prompt}
              className={`prompt-item${promptsState.current === prompt ? ' active' : ''}`}
            >
              <button
                className="btn use-btn"
                onClick={() => selectSystemPrompt(prompt)}
                title="Usar este prompt"
              >
                <MessageSquare size={14} />
              </button>
              <span
                className="prompt-text"
                title={prompt}
                onClick={() => selectSystemPrompt(prompt)}
              >
                {prompt.length > 40 ? prompt.slice(0, 40) + '…' : prompt}
              </span>
              <button
                className="btn delete-btn"
                onClick={() => deleteSystemPrompt(prompt)}
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="current-prompt">
          <strong>Prompt activo:</strong>
          <div className="current-prompt-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            {promptsState.current
              ? (
                  <>
                    {promptsState.current.length > 100
                      ? promptsState.current.slice(0, 100) + '…'
                      : promptsState.current}
                    <button
                      className="btn"
                      style={{ marginLeft: 8 }}
                      title="Desactivar prompt activo"
                      onClick={() => setPromptsState(prev => ({ ...prev, current: '' }))}
                    >
                      Desactivar
                    </button>
                  </>
                )
              : <em>Ninguno</em>}
          </div>
        </div>
        <div className="api-key-section">
          <label htmlFor="api-key">API Key DeepSeek</label>
          <input
            id="api-key"
            type="password"
            className="api-key-input"
            placeholder="Tu API Key"
            value={apiKey}
            onChange={e => setApiKey(DEFAULT_API_KEY)}
            autoComplete="off"
          />
        </div>
      </aside>
      <main className="chat-area">
        <header className="chat-header">
          <h1>Gracia Chat</h1>
          <button className="btn clear-btn" onClick={clearChat} disabled={isLoading}>
            Limpiar chat
          </button>
        </header>
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-chat">Empieza la conversación…</div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'}`}
            >
              <span className="role">{msg.role === 'user' ? 'Tú:' : 'Gracia:'}</span>
              <span className="content">{msg.content}</span>
            </div>
          ))}
          {isLoading && (
            <div className="chat-message assistant loading">
              <span className="role">Gracia:</span>
              <span className="content typing-indicator">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        {error && <div className="error-message">{error}</div>}
        {storageError && (
          <div className="error-message">{storageError}</div>
        )}
        <form
          className="chat-input-form"
          onSubmit={e => {
            e.preventDefault();
            if (!isLoading) sendMessage();
          }}
        >
          <textarea
            className="chat-input"
            placeholder="Escribe tu mensaje…"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={handleInputKeyDown}
            rows={2}
            disabled={isLoading}
          />
          <button
            className="btn send-btn"
            type="submit"
            disabled={isLoading || !inputMessage.trim() || !apiKey}
            title="Enviar"
          >
            <Send size={18} />
          </button>
        </form>
      </main>
    </div>
  );
};

export default DeepSeekChat;
