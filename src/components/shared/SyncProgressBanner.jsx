'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * SyncProgressBanner
 *
 * Polls /api/sync/queue-status every 3 seconds.
 * Shows a subtle animated progress banner while attendance data is being
 * recalculated by the Edge Function after a sync.
 *
 * - Slides in when queue becomes active
 * - Shows animated shimmer progress bar with live percent
 * - Transitions to green checkmark at 100%, holds for 3 seconds
 * - Auto-hides OR can be manually dismissed with the × button
 */
export function SyncProgressBanner({ onComplete }) {
    const [state, setState] = useState({
        visible: false,
        percent: 0,
        done: 0,
        total: 0,
        pending: 0,
        processing: 0,
        completing: false,
    })
    const [dismissed, setDismissed] = useState(false)

    const pollRef = useRef(null)
    const completingRef = useRef(false)
    const hideTimerRef = useRef(null)

    const dismiss = useCallback(() => {
        setState(prev => ({ ...prev, visible: false, completing: false }))
        setDismissed(true)
        completingRef.current = false
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        // Reset dismissed after 30s so next real sync can show again
        setTimeout(() => setDismissed(false), 30000)
    }, [])

    const checkStatus = useCallback(async () => {
        if (dismissed) return
        try {
            const res = await fetch('/api/sync/queue-status', { cache: 'no-store' })
            if (!res.ok) return
            const data = await res.json()

            if (data.isActive) {
                completingRef.current = false
                if (hideTimerRef.current) {
                    clearTimeout(hideTimerRef.current)
                    hideTimerRef.current = null
                }
                setState(prev => ({
                    ...prev,
                    visible: true,
                    completing: false,
                    percent: data.percent,
                    done: data.done,
                    total: data.total,
                    pending: data.pending,
                    processing: data.processing,
                }))
            } else if (data.total > 0 && !completingRef.current) {
                // Queue just finished — show 100% complete state
                completingRef.current = true
                setState(prev => ({
                    ...prev,
                    visible: true,
                    completing: true,
                    percent: 100,
                    done: data.done,
                    total: data.total,
                    pending: 0,
                    processing: 0,
                }))
                onComplete?.()
                // Auto-hide after 4 seconds (user can also dismiss manually)
                hideTimerRef.current = setTimeout(() => {
                    setState(prev => ({ ...prev, visible: false, completing: false }))
                    completingRef.current = false
                    hideTimerRef.current = null
                }, 4000)
            }
            // If total === 0 → no recent queue activity, stay hidden
        } catch {
            // Silently ignore — non-critical
        }
    }, [dismissed, onComplete])

    useEffect(() => {
        checkStatus()
        pollRef.current = setInterval(checkStatus, 3000)
        return () => {
            clearInterval(pollRef.current)
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
        }
    }, [checkStatus])

    if (!state.visible) return null

    const isComplete = state.completing || state.percent >= 100

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
                width: 340,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0,0,0,0.06)',
                animation: 'slideInBanner 0.3s cubic-bezier(0.2, 0, 0, 1)',
            }}
        >
            <style>{`
        @keyframes slideInBanner {
          from { transform: translateY(20px) scale(0.97); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

            <div style={{ padding: '14px 14px 12px 16px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {/* Icon */}
                    <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: isComplete
                            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                            : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.4s ease',
                    }}>
                        {isComplete ? (
                            // Checkmark
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M3 8l3.5 3.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        ) : (
                            // Spinning dots / sync icon
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 1.2s linear infinite' }}>
                                <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                                <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )}
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
                            {isComplete ? 'Attendance Data Ready' : 'Updating Attendance Data'}
                        </div>
                        <div style={{ fontSize: 11, color: '#888', fontWeight: 500, marginTop: 1 }}>
                            {isComplete
                                ? `${state.done} records synced and ready`
                                : state.pending > 0
                                    ? `${state.done} of ${state.total} employees processed`
                                    : `Finishing… ${state.processing} remaining`
                            }
                        </div>
                    </div>

                    {/* Right side: percent + dismiss button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{
                            fontSize: 12, fontWeight: 800,
                            color: isComplete ? '#16a34a' : '#2563eb',
                            transition: 'color 0.4s ease',
                        }}>
                            {state.percent}%
                        </span>
                        {/* × close button */}
                        <button
                            onClick={dismiss}
                            aria-label="Dismiss"
                            style={{
                                width: 22, height: 22,
                                borderRadius: 6,
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#bbb',
                                fontSize: 16,
                                lineHeight: 1,
                                padding: 0,
                                transition: 'color 0.15s, background 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = '#f1f3f5' }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#bbb'; e.currentTarget.style.background = 'transparent' }}
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Progress track */}
                <div style={{
                    height: 5,
                    borderRadius: 99,
                    background: '#f1f3f5',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%',
                        borderRadius: 99,
                        width: `${state.percent}%`,
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: isComplete
                            ? '#22c55e'
                            : `linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%)`,
                        backgroundSize: isComplete ? 'auto' : '200% auto',
                        animation: isComplete ? 'none' : 'shimmer 1.5s linear infinite',
                    }} />
                </div>

                {/* Footer — only when still active */}
                {!isComplete && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        marginTop: 7,
                    }}>
                        <span style={{ fontSize: 10, color: '#ccc', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Processing via Edge Function
                        </span>
                        <span style={{ fontSize: 10, color: '#ccc', fontWeight: 600 }}>
                            Auto-refresh when done
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
