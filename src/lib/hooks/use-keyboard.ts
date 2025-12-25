"use client"

import { useEffect, useCallback } from "react"

type KeyHandler = (event: KeyboardEvent) => void

interface KeyboardShortcut {
  /** Key to listen for (e.g., 'k', 'Enter', 'Escape') */
  key: string
  /** Whether meta/cmd key must be pressed */
  meta?: boolean
  /** Whether ctrl key must be pressed */
  ctrl?: boolean
  /** Whether shift key must be pressed */
  shift?: boolean
  /** Whether alt key must be pressed */
  alt?: boolean
  /** Handler function */
  handler: KeyHandler
  /** Prevent default behavior */
  preventDefault?: boolean
  /** Prevent when focus is in an input element */
  ignoreInputs?: boolean
}

/**
 * Hook for handling keyboard shortcuts
 * 
 * @example
 * // Single shortcut
 * useKeyboard({
 *   key: 'k',
 *   meta: true,
 *   handler: () => setOpen(true),
 *   preventDefault: true
 * })
 * 
 * // Multiple shortcuts
 * useKeyboard([
 *   { key: 'Escape', handler: () => setOpen(false) },
 *   { key: '/', handler: () => searchRef.current?.focus(), ignoreInputs: true }
 * ])
 */
export function useKeyboard(
  shortcut: KeyboardShortcut | KeyboardShortcut[]
): void {
  const shortcuts = Array.isArray(shortcut) ? shortcut : [shortcut]

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    const isInput = 
      target.tagName === "INPUT" || 
      target.tagName === "TEXTAREA" || 
      target.isContentEditable

    for (const shortcut of shortcuts) {
      // Check if we should ignore this shortcut when in an input
      if (shortcut.ignoreInputs && isInput) continue

      // Check key match
      if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue

      // Check modifier keys
      if (shortcut.meta && !event.metaKey) continue
      if (shortcut.ctrl && !event.ctrlKey) continue
      if (shortcut.shift && !event.shiftKey) continue
      if (shortcut.alt && !event.altKey) continue

      // If we need meta/ctrl but neither is pressed, skip
      // This handles the case where neither is explicitly required
      if (shortcut.meta === true && !event.metaKey) continue

      // Found a match - run the handler
      if (shortcut.preventDefault) {
        event.preventDefault()
      }
      shortcut.handler(event)
      break
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Simple escape key handler
 */
export function useEscapeKey(handler: () => void, enabled: boolean = true): void {
  useKeyboard({
    key: "Escape",
    handler,
    ignoreInputs: false,
  })
}

/**
 * Focus search on "/" key
 */
export function useSearchFocus(
  ref: React.RefObject<HTMLInputElement | null>
): void {
  useKeyboard({
    key: "/",
    handler: () => ref.current?.focus(),
    preventDefault: true,
    ignoreInputs: true,
  })
}

