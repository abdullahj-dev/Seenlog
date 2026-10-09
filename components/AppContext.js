'use client';
import { createContext, useContext } from 'react';

// App.js owns the state and logic and shares it here; screens and shell pieces read what they need with useApp().
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);
