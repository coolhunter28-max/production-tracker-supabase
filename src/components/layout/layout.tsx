'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, getCurrentUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [usuario, setUsuario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchUser = async () => {
      const { user, usuario } = await getCurrentUser()
      
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setUsuario(usuario)
        setLoading(false)
      }
    }
    
    fetchUser()
  }, [router])
  
  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold">Calzado Production Manager</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {/* Avatar alternativo con un div */}
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                {usuario?.nombre?.charAt(0) || user?.email?.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{usuario?.nombre || user?.email}</p>
                <p className="text-sm text-gray-500">{usuario?.rol || 'Usuario'}</p>
              </div>
            </div>
            
            <Button variant="outline" onClick={handleSignOut}>
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}