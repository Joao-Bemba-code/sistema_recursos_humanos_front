import { redirect } from "next/navigation";

// O painel da plataforma passou a ter rota e login proprios.
export default function PainelPlataformaAntigo() {
  redirect("/plataforma");
}
