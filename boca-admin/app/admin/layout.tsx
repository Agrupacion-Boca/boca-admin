"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "@/components/AuthGuard";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/registros", label: "Registros" },
  { href: "/admin/padron", label: "Padrón" },
  { href: "/admin/noticias", label: "Noticias" },
  { href: "/admin/encuestas", label: "Encuestas" },
  { href: "/admin/usuarios", label: "Usuarios" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex">
        <aside className="w-56 bg-bombonera-deep text-white flex flex-col shrink-0">
          <div className="px-5 py-5 border-b border-white/10">
            <div className="font-black text-sm tracking-wide">
              BOCA <span className="text-oro">BOCA</span> BOCA
            </div>
            <div className="text-xs text-white/50 mt-0.5">Panel admin</div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {nav.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-oro text-bombonera-deep"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 py-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </AuthGuard>
  );
}
