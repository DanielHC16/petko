import { useNavigate } from 'react-router-dom'
import TosModal from './tos-modal'

/** Dev-only preview: http://localhost:5173/tos-preview */
export default function TosPreview() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-petko-cream">
      <TosModal onAccept={() => navigate('/')} />
    </div>
  )
}
