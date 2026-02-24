'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * SyncProgressBanner
 * 
 * Polls /api/sync/queue-status every 3 seconds.
 * Shows a subtle animated progress bar while attendance data is being
 * recalculated by the Edge Function after a sync.
 * 
 * Lifecycle:
 *  - Hidden:    queue is empty (isActive = false, no recent activity)
 *  - Sliding in: queue becomes active (new sync lands)
 *  - Progressing: updates bar as percent climbs
 *  - Success:   reaches 100%, shows checkmark for 3 seconds, slides out
 * 
 * This is designed to be mounted once in the dashboard and left running.
 * It never blocks the UI — data loads from cache regardless.
 */
export function SyncProgressBanner({ onComplete }) {
    const [state, setState] = useState({
        visible: false,
        percent: 0,
        done: 0,
        total: 0,
        pending: 0,
        processing: 0,
        completing: false, // true during the 3s "done" phase before hiding
    })

    const pollRef = useRef(null)
    const completingRef = useRef(false)

    const checkStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/sync/queue-status', { cache: 'no-store' })
            if (!res.ok) return
            const data = await res.json()

            if (data.isActive) {
                // Queue is active — show and update
                completingRef.current = false
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
                // Queue just finished — show 100% for 3 seconds then hide
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

                // Notify parent (e.g. to refresh dashboard data)
                onComplete?.()

                // Hide after 3 seconds
                setTimeout(() => {
                    setState(prev => ({ ...prev, visible: false, completing: false }))
                    completingRef.current = false
                }, 3000)
            }
            // If total === 0 → no recent queue activity, stay hidden
        } catch {
            // Silently ignore — non-critical
        }
    }, [onComplete])

    useEffect(() => {
        // Poll every 3 seconds
        checkStatus()
        pollRef.current = setInterval(checkStatus, 3000)
        return () => clearInterval(pollRef.current)
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
      `}</style>

            <div style={{ padding: '16px 18px 14px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    {/* Animated icon */}
                    <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: isComplete
                            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                            : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
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
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                                <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
                            {isComplete ? 'Attendance Data Ready' : 'Updating Attendance Data'}
                        </div>
                        <div style={{ fontSize: 11, color: '#888', fontWeight: 500, marginTop: 1 }}>
                            {isComplete
                                ? `${state.done} records synced and updated`
                                : state.pending > 0
                                    ? `${state.done} of ${state.total} employees processed`
                                    : `Finishing up… ${state.processing} remaining`
                            }
                        </div>
                    </div>

                    {/* Percent badge */}
                    <div style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: isComplete ? '#16a34a' : '#2563eb',
                        minWidth: 36,
                        textAlign: 'right',
                        transition: 'color 0.4s ease',
                    }}>
                        {state.percent}%
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

                {/* Footer — only shown when active */}
                {!isComplete && (
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        marginTop: 8,
                    }}>
                        <span style={{ fontSize: 10, color: '#bbb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Processing via Edge Function
                        </span>
                        <span style={{ fontSize: 10, color: '#bbb', fontWeight: 600 }}>
                            Auto-refresh when done
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
