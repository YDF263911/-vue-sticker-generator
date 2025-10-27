import { ref, onMounted, onBeforeUnmount } from 'vue'
import { supabase } from '@/utils/supabase'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

const userRef = ref<User | null>(null)
const sessionRef = ref<Session | null>(null)
const loadingRef = ref<boolean>(true)
let unsub: (() => void) | null = null

async function init() {
  loadingRef.value = true
  const { data: { session } } = await supabase.auth.getSession()
  sessionRef.value = session ?? null
  userRef.value = session?.user ?? null
  const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
    sessionRef.value = session
    userRef.value = session?.user ?? null
  })
  unsub = () => data.subscription.unsubscribe()
  loadingRef.value = false
}

export function useSupabaseAuth() {
  onMounted(() => {
    if (!unsub) init()
  })
  onBeforeUnmount(() => {
    // keep subscription globally; do not auto-unsub to preserve auth state across pages
  })

  async function signUpEmail(email: string, password: string) {
    return await supabase.auth.signUp({ email, password })
  }

  async function signInEmail(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  async function signInOtp(email: string) {
    return await supabase.auth.signInWithOtp({ email })
  }

  async function signOut() {
    return await supabase.auth.signOut()
  }

  return {
    user: userRef,
    session: sessionRef,
    loading: loadingRef,
    signUpEmail,
    signInEmail,
    signInOtp,
    signOut,
  }
}
