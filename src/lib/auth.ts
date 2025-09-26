import { supabase } from './supabase'

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name
      }
    }
  })
  
  if (data.user && !error) {
    await supabase.from('usuarios').insert([{
      id: data.user.id,
      email: data.user.email,
      nombre: name,
      rol: 'usuario'
    }])
  }
  
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single()
    
    return { user, usuario }
  }
  
  return { user: null, usuario: null }
}