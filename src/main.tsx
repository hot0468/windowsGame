import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 아이콘 데이터를 앱 렌더 전에 등록한다(CDN 미사용, 첫 렌더 깜빡임 방지).
import './icons/bootstrap'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
