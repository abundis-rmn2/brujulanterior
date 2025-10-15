import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import DeepSeekChat from './components/DeepSeekChat';
import CartaAstral from './components/CartaAstral';
import PantallaInicio from './components/PantallaInicio'; // Importa el nuevo componente

function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <nav style={{ padding: '1em', display: 'flex', gap: '1em' }}>
        <Link to="/">Inicio</Link>
        <Link to="/gracia-chat">Ir a Gracia Chat</Link>
        <Link to="/carta-astral">Ir a Carta Astral</Link>
      </nav>
      <div className="App">
        <Routes>
          <Route path="/" element={<PantallaInicio />} />
          <Route path="/gracia-chat" element={<DeepSeekChat />} />
          <Route path="/carta-astral" element={<CartaAstral />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
