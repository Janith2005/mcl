import { useState } from 'react'
import { MessageSquarePlus, X, Star, Send } from 'lucide-react'
import { apiPost } from '@/api/client'

type FeedbackType = 'bug' | 'feature' | 'general'

const typeOptions: { value: FeedbackType; label: string }[] = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
]

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('general')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!message.trim()) return

    setIsSubmitting(true)
    try {
      await apiPost('/api/v1/feedback', {
        type,
        message: message.trim(),
        page: window.location.pathname,
        rating: rating > 0 ? rating : undefined,
      })
      setToast('Feedback submitted! Thanks for helping us improve.')
      setMessage('')
      setRating(0)
      setType('general')
      setTimeout(() => {
        setToast(null)
        setIsOpen(false)
      }, 2000)
    } catch {
      setToast('Failed to submit feedback. Please try again.')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toast notification
  if (toast && !isOpen) {
    return (
      <div
        className="fixed right-4 bottom-20 z-50 px-4 py-3 text-sm font-medium shadow-lg"
        style={{
          background: 'var(--ip-surface)',
          color: 'var(--ip-text)',
          borderRadius: 'var(--ip-radius-md)',
          border: '1px solid var(--ip-border)',
          boxShadow: 'var(--ip-shadow-lg)',
          maxWidth: '320px',
        }}
      >
        {toast}
      </div>
    )
  }

  // Floating button (positioned above where TacticalAssistant's collapsed button sits)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-20 w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg z-50 hover:opacity-90 transition-opacity"
        style={{
          background: 'var(--ip-accent-plum, #7c3aed)',
          boxShadow: 'var(--ip-shadow-md)',
        }}
        title="Send Feedback"
      >
        <MessageSquarePlus size={18} />
      </button>
    )
  }

  return (
    <div
      className="fixed right-4 bottom-20 z-50 w-80 flex flex-col"
      style={{
        background: 'var(--ip-surface)',
        borderRadius: 'var(--ip-radius-lg)',
        border: '1px solid var(--ip-border)',
        boxShadow: 'var(--ip-shadow-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--ip-border-subtle)' }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
        >
          Send Feedback
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-[var(--ip-bg-subtle)]"
        >
          <X size={14} style={{ color: 'var(--ip-text-secondary)' }} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Type selector */}
        <div className="flex gap-1">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              className="flex-1 py-1.5 text-xs font-medium transition-all"
              style={{
                borderRadius: 'var(--ip-radius-full)',
                background: type === opt.value ? 'var(--ip-text)' : 'var(--ip-bg-subtle)',
                color: type === opt.value ? 'var(--ip-text-on-primary)' : 'var(--ip-text-secondary)',
                border: `1px solid ${type === opt.value ? 'transparent' : 'var(--ip-border-subtle)'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's on your mind..."
          rows={4}
          className="w-full text-sm outline-none resize-none py-2.5 px-3"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-md)',
            color: 'var(--ip-text)',
            border: '1px solid var(--ip-border)',
          }}
        />

        {/* Star rating */}
        <div>
          <label
            className="block text-[10px] tracking-widest font-semibold mb-1.5"
            style={{ color: 'var(--ip-text-tertiary)' }}
          >
            RATING (OPTIONAL)
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star === rating ? 0 : star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  size={18}
                  fill={(hoverRating || rating) >= star ? 'var(--ip-warning, #f59e0b)' : 'none'}
                  style={{
                    color: (hoverRating || rating) >= star
                      ? 'var(--ip-warning, #f59e0b)'
                      : 'var(--ip-text-tertiary)',
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toast inside modal */}
      {toast && (
        <div
          className="mx-4 mb-2 px-3 py-2 text-xs font-medium"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-sm)',
            color: 'var(--ip-success, #22c55e)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Submit */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--ip-border-subtle)' }}>
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background: 'var(--ip-primary-gradient)',
            borderRadius: 'var(--ip-radius-md)',
            boxShadow: 'var(--ip-shadow-sm)',
          }}
        >
          <Send size={14} />
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  )
}
