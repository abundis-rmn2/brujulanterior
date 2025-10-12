import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import DeepSeekChat from './components/DeepSeekChat';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="App">
        <DeepSeekChat />
      </div>
    </>
  )
}

export default App
