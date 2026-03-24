"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

type HeaderControlsSetter = (content: React.ReactNode | null) => void;

const HeaderControlsSetterContext = createContext<HeaderControlsSetter>(
  () => {},
);

const HeaderControlsValueContext = createContext<React.ReactNode | null>(null);

/**
 * HeaderControlsProvider — allows page-level components to inject
 * controls (version selector, search) into the shell header.
 *
 * Uses the same split-context pattern as SidebarProvider.
 */
export function HeaderControlsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [content, setContentState] = useState<React.ReactNode | null>(null);

  const setterRef = useRef<HeaderControlsSetter>(setContentState);
  setterRef.current = setContentState;

  const stableSetter = useCallback((node: React.ReactNode | null) => {
    setterRef.current(node);
  }, []);

  return (
    <HeaderControlsSetterContext.Provider value={stableSetter}>
      <HeaderControlsValueContext.Provider value={content}>
        {children}
      </HeaderControlsValueContext.Provider>
    </HeaderControlsSetterContext.Provider>
  );
}

/**
 * useHeaderControlsSlot — read header controls content.
 * Used by DocsShell to pass controls into PublicShell header.
 */
export function useHeaderControlsSlot(): React.ReactNode | null {
  return useContext(HeaderControlsValueContext);
}

/**
 * useSetHeaderControls — get stable setter for header controls.
 * Used by ReadingShell to inject version selector + search into header.
 */
export function useSetHeaderControls(): HeaderControlsSetter {
  return useContext(HeaderControlsSetterContext);
}
