"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function PedidosRedirect() {
  var router = useRouter();
  useEffect(function () { router.replace("/dashboard/pedidos"); }, [router]);
  return null;
}
