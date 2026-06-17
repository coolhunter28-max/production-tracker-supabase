"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
}

type UserProfile = {
  email: string | null;
  full_name: string | null;
  role: string | null;
};

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function fetchUser() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      setEmail(userData.user.email ?? null);

      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("email, full_name, role")
        .eq("id", userData.user.id)
        .maybeSingle();

      setProfile((profileData ?? null) as UserProfile | null);
      setLoading(false);
    }

    fetchUser();
  }, [router]);

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  const displayName = profile?.full_name || email || "Usuario";
  const displayRole = profile?.role || "Usuario";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">Calzado Production Manager</h1>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 font-medium text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div>
                <p className="font-medium">{displayName}</p>
                <p className="text-sm text-gray-500">{displayRole}</p>
              </div>
            </div>

            <Button variant="outline" onClick={handleSignOut}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}