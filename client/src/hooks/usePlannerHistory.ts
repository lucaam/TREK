import { useRef, useReducer } from 'react'

export interface UndoEntry {
  label: string
  undo: () => Promise<void> | void
  redo?: () => Promise<void> | void
}

export function usePlannerHistory(maxEntries = 30) {
  const historyRef = useRef<UndoEntry[]>([])
  const redoRef = useRef<UndoEntry[]>([])
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  const pushUndo = (label: string, undoFn: () => Promise<void> | void, redoFn?: () => Promise<void> | void) => {
    historyRef.current = [{ label, undo: undoFn, redo: redoFn }, ...historyRef.current].slice(0, maxEntries)
    redoRef.current = []
    forceUpdate()
  }

  const undo = async () => {
    if (historyRef.current.length === 0) return
    const [first, ...rest] = historyRef.current
    historyRef.current = rest
    if (first.redo) {
      redoRef.current = [first, ...redoRef.current].slice(0, maxEntries)
    }
    forceUpdate()
    try { await first.undo() } catch (e) { console.error('Undo failed:', e) }
  }

  const redo = async () => {
    if (redoRef.current.length === 0) return
    const [first, ...rest] = redoRef.current
    redoRef.current = rest
    historyRef.current = [first, ...historyRef.current].slice(0, maxEntries)
    forceUpdate()
    try { await first.redo!() } catch (e) { console.error('Redo failed:', e) }
  }

  const canUndo = historyRef.current.length > 0
  const canRedo = redoRef.current.length > 0
  const lastActionLabel = historyRef.current[0]?.label ?? null
  const lastRedoLabel = redoRef.current[0]?.label ?? null

  return { pushUndo, undo, redo, canUndo, canRedo, lastActionLabel, lastRedoLabel }
}
