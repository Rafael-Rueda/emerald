"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

type SidebarSetter = (content: React.ReactNode | null) => void;

/**
 * Setter context — provides the stable setter function to children.
 * Separating setter from value prevents re-renders on the writing side.
 */
const SidebarSetterContext = createContext<SidebarSetter>(() => {});

/**
 * Value context — provides the current sidebar content to readers.
 * Only components that call useSidebarSlot subscribe to value changes.
 */
const SidebarValueContext = createContext<React.ReactNode | null>(null);

/**
 * SidebarProvider — provides a way for page-level components
 * to inject sidebar content into the shell-level sidebar slot.
 *
 * Uses a split-context pattern so that the sidebar content writer
 * (ReadingShell) does not re-render when the value changes.
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarContent, setSidebarContentState] =
    useState<React.ReactNode | null>(null);

  // Stable setter ref to avoid re-render cascades
  const setterRef = useRef<SidebarSetter>(setSidebarContentState);
  setterRef.current = setSidebarContentState;

  const stableSetter = useCallback((content: React.ReactNode | null) => {
    setterRef.current(content);
  }, []);

  return (
    <SidebarSetterContext.Provider value={stableSetter}>
      <SidebarValueContext.Provider value={sidebarContent}>
        {children}
      </SidebarValueContext.Provider>
    </SidebarSetterContext.Provider>
  );
}

/**
 * useSidebarSlot — read the current sidebar content.
 * Used by the PublicShell wrapper to render page-provided sidebar content.
 */
export function useSidebarSlot(): React.ReactNode | null {
  return useContext(SidebarValueContext);
}

/**
 * useSetSidebar — get a stable setter for sidebar content.
 * Used by ReadingShell to inject navigation into the shell's sidebar area.
 */
export function useSetSidebar(): SidebarSetter {
  return useContext(SidebarSetterContext);
}
