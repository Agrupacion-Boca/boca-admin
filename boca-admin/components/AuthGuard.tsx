"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      // Chequeo de UX: ¿está en la tabla admins?
      // (la protección real de los datos la hace RLS en Supabase,
      // esto solo evita mostrar pantallas vacías a alguien sin permiso)
      const { data: adminRow } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (!adminRow) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    check();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-bombonera text-sm">Verificando acceso...</p>
      </div>
    );
  }

  return <>{children}</>;
}
