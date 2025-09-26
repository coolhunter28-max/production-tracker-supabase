'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  })
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleLoginChange = (field: string, value: string) => {
    setLoginForm(prev => ({ ...prev, [field]: value }))
  }

  const handleRegisterChange = (field: string, value: string) => {
    setRegisterForm(prev => ({ ...prev, [field]: value }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      })
      
      if (error) throw error
      
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.password,
        options: {
          data: {
            name: registerForm.name
          }
        }
      })
      
      if (error) throw error
      
      // Crear registro en la tabla de usuarios
      if (data.user) {
        await supabase.from('usuarios').insert([{
          id: data.user.id,
          email: data.user.email,
          nombre: registerForm.name,
          rol: 'usuario'
        }])
      }
      
      setError('Registro exitoso. Por favor, revisa tu correo para confirmar tu cuenta.')
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Calzado Production Manager</h1>
          <p className="text-gray-600 mt-2">Inicia sesión para continuar</p>
        </div>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Correo Electrónico</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => handleLoginChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => handleLoginChange('password', e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="register-name">Nombre</Label>
                <Input
                  id="register-name"
                  value={registerForm.name}
                  onChange={(e) => handleRegisterChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="register-email">Correo Electrónico</Label>
                <Input
                  id="register-email"
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => handleRegisterChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="register-password">Contraseña</Label>
                <Input
                  id="register-password"
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => handleRegisterChange('password', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="register-confirm-password">Confirmar Contraseña</Label>
                <Input
                  id="register-confirm-password"
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => handleRegisterChange('confirmPassword', e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Registrando...' : 'Registrarse'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        
        {error && (
          <Alert className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}