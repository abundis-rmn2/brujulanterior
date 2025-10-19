import React, { useState, useEffect, useRef } from 'react';
import { Send, Save, Trash2, Plus, MessageSquare } from 'lucide-react';
import './DeepSeekChat.css';

const SYSTEM_PROMPTS_KEY = 'deepseekSystemPrompts';
const USERS_INFO_KEY = 'deepseekUsersInfo'; // Nuevo: clave para info de usuario
const DEFAULT_API_KEY = 'sk-9ddf3001eace4fdeb18b958fe5e10751';
const PROFILE_LIST_KEY = 'cartaAstralProfiles';

const initialPromptsState = {
  prompts: [],
  current: '',
};

const initialUsersState = {
  users: [],
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
  const [usersState, setUsersState] = useState(initialUsersState);
  const [activeTab, setActiveTab] = useState('prompt'); // 'prompt' o 'users'

  // Cargar prompts y usuarios desde localStorage al montar
  useEffect(() => {
    // Prompts
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
    // Usuarios: cargar perfiles de cartaAstralProfiles
    try {
      const storedProfilesRaw = localStorage.getItem(PROFILE_LIST_KEY);
      let usersArr = [];
      if (storedProfilesRaw) {
        const profiles = JSON.parse(storedProfilesRaw);
        // Convierte cada perfil a objeto { info: texto }
        usersArr = profiles.map(p => ({
          info: `${p.name} - ${p.date} - ${p.place}\n\n${p.svgUrl ? 'Carta: ' + p.svgUrl + '\n' : ''}` +
            (p.planets && p.planets.length
              ? 'Planetas:\n' + p.planets.map(pl =>
                  `- ${pl.planet?.es || pl.planet?.en}: ${pl.zodiac_sign?.name?.es || pl.zodiac_sign?.name?.en} (${pl.normDegree ? pl.normDegree.toFixed(2) : ''}°)${String(pl.isRetro).toLowerCase() === 'true' ? ' retrógrado' : ''}`
                ).join('\n') + '\n'
              : '') +
            (p.houses && p.houses.length
              ? 'Casas:\n' + p.houses.map(h =>
                  `- Casa ${h.House}: ${h.zodiac_sign?.name?.es || h.zodiac_sign?.name?.en} (${h.normDegree ? h.normDegree.toFixed(2) : ''}°)`
                ).join('\n') + '\n'
              : '') +
            (p.aspects && p.aspects.length
              ? 'Aspectos:\n' + p.aspects.map(a =>
                  `- ${a.planet_1?.es || a.planet_1?.en} y ${a.planet_2?.es || a.planet_2?.en}: ${a.aspect?.es || a.aspect?.en}`
                ).join('\n')
              : '')
        }));
      }
      setUsersState({
        users: usersArr,
        current: usersArr.length > 0 ? usersArr[0].info : '',
      });
    } catch {
      setUsersState(initialUsersState);
    }
    setApiKey(DEFAULT_API_KEY);
  }, []);

  // Guardar prompts en localStorage cuando cambian
  useEffect(() => {
    try {
      localStorage.setItem(SYSTEM_PROMPTS_KEY, JSON.stringify(promptsState));
      console.log('[DeepSeekChat] Prompts y prompt activo guardados en localStorage:', promptsState);
    } catch (e) {
      setStorageError('No se pudo guardar los prompts en el almacenamiento local.');
      console.error('[DeepSeekChat] Error al guardar prompts en localStorage:', e);
    }
  }, [promptsState]);

  // Guardar usuarios en localStorage cuando cambian
  useEffect(() => {
    try {
      localStorage.setItem(USERS_INFO_KEY, JSON.stringify(usersState));
    } catch {}
  }, [usersState]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Añadir usuario desde CartaAstral.jsx (si existe en localStorage)
  useEffect(() => {
    // Busca si hay un usuario nuevo en localStorage (por ejemplo, de CartaAstral.jsx)
    const lastUserRaw = localStorage.getItem('cartaAstralUserInfo');
    if (lastUserRaw) {
      try {
        const user = JSON.parse(lastUserRaw);
        if (user && user.info) {
          setUsersState(prev => {
            // Evita duplicados exactos
            const exists = prev.users.some(u => u.info === user.info);
            if (exists) return prev;
            return {
              users: [user, ...prev.users],
              current: user.info,
            };
          });
          // Limpia la clave temporal
          localStorage.removeItem('cartaAstralUserInfo');
        }
      } catch {}
    }
  }, []);

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

  // Seleccionar usuario
  const selectUserInfo = (info) => {
    setUsersState(prev => ({ ...prev, current: info }));
  };

  // Eliminar usuario
  const deleteUserInfo = (info) => {
    setUsersState(prev => {
      const updatedUsers = prev.users.filter(u => u.info !== info);
      const updatedCurrent = prev.current === info ? '' : prev.current;
      return { users: updatedUsers, current: updatedCurrent };
    });
  };

  // Añadir contenido de usuario al chat como mensaje de usuario
  const addUserInfoToChat = (user) => {
    if (!user || !user.info) return;
    setMessages(prev => [
      ...prev,
      { role: 'user', content: user.info }
    ]);
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

  // Cambiar entre tabs
  const handleTabChange = (tab) => setActiveTab(tab);

  return (
    <div className="deepseek-chat-container">
      <aside className="sidebar">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            className={`btn${activeTab === 'prompt' ? ' active' : ''}`}
            onClick={() => handleTabChange('prompt')}
          >
            Prompts
          </button>
          <button
            className={`btn${activeTab === 'users' ? ' active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            Usuarios
          </button>
        </div>
        {activeTab === 'prompt' && (
          <>
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
          </>
        )}
        {activeTab === 'users' && (
          <>
            <h2>Usuarios</h2>
            <div className="prompts-list">
              {usersState.users.length === 0 && (
                <div className="empty-prompts">No hay información de usuario</div>
              )}
              {usersState.users.map(user => (
                <div
                  key={user.info}
                  className={`prompt-item${usersState.current === user.info ? ' active' : ''}`}
                >
                  <button
                    className="btn use-btn"
                    onClick={() => selectUserInfo(user.info)}
                    title="Usar este usuario"
                  >
                    <MessageSquare size={14} />
                  </button>
                  <span
                    className="prompt-text"
                    title={user.info}
                    onClick={() => selectUserInfo(user.info)}
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {user.info.length > 40 ? user.info.slice(0, 40) + '…' : user.info}
                  </span>
                  <button
                    className="btn"
                    style={{ marginLeft: 6 }}
                    title="Añadir al chat"
                    onClick={() => addUserInfoToChat(user)}
                  >
                    Añadir al chat
                  </button>
                  <button
                    className="btn delete-btn"
                    onClick={() => deleteUserInfo(user.info)}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="current-prompt">
              <strong>Usuario activo:</strong>
              <div className="current-prompt-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                {usersState.current
                  ? (
                      <>
                        {usersState.current.length > 100
                          ? usersState.current.slice(0, 100) + '…'
                          : usersState.current}
                        <button
                          className="btn"
                          style={{ marginLeft: 8 }}
                          title="Desactivar usuario activo"
                          onClick={() => setUsersState(prev => ({ ...prev, current: '' }))}
                        >
                          Desactivar
                        </button>
                      </>
                    )
                  : <em>Ninguno</em>}
              </div>
            </div>
          </>
        )}
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
