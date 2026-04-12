import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from 'firebase/auth'

interface AuthState {
  user: (User & { role?: string }) | null
  initialized: boolean
  setUser: (user: (User & { role?: string }) | null) => void
  setInitialized: (initialized: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      initialized: false,
      setUser: (user) => set({ user }),
      setInitialized: (initialized) => set({ initialized }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
