'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Github } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Production Tracker</CardTitle>
          <CardDescription>Inicia sesion para acceder al sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button>
            onClick={() =, { callbackUrl: '/' })}
            className="w-full">
            <Github className="mr-2 h-4 w-4" />
            Iniciar sesion con GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
