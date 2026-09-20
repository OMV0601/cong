import { Routes, Route, Navigate } from 'react-router-dom'
import Setup from './routes/Setup'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Setup />} />
      {/* Phase 1 adds /person/:id, Phase 2 adds /c/:token. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
