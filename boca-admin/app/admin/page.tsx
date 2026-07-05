"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminHome() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/registros");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-bombonera text-sm">Cargando...</p>
    </div>
  );
}
