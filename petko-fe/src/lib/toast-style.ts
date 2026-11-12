import pawImg from '@/assets/paw_white.png'

type ToastVariant = 'success' | 'error' | 'warning'

const COLORS: Record<ToastVariant, { bg: string; rgba: string }> = {
  success: { bg: '#1a7a1a',  rgba: 'rgba(26,122,26,0.85)'   }, // green  — add / create
  error:   { bg: '#b91c1c',  rgba: 'rgba(185,28,28,0.85)'   }, // red    — delete / remove
  warning: { bg: '#a16207',  rgba: 'rgba(161,98,7,0.85)'    }, // amber  — update / change
}

export function toastStyle(variant: ToastVariant): React.CSSProperties {
  const { bg, rgba } = COLORS[variant]
  return {
    background: bg,
    color: '#fff',
    fontWeight: '600',
    fontSize: '14px',
    borderRadius: '12px',
    padding: '14px 20px',
    minWidth: '260px',
    maxWidth: '340px',
    backgroundImage: `linear-gradient(${rgba}, ${rgba}), url(${pawImg})`,
    backgroundRepeat: 'no-repeat, no-repeat',
    backgroundPosition: 'center, right -8px bottom -8px',
    backgroundSize: 'cover, 80px 80px',
  }
}

export function toastIconTheme(variant: ToastVariant) {
  return { primary: '#fff', secondary: COLORS[variant].bg }
}
