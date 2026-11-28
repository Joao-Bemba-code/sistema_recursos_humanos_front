import Link from "next/link";

export const metadata = {
  title: "Termos e Condições | SGHR",
  description: "Termos e condições de utilização do Sistema de Gestão de Recursos Humanos.",
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-surface-card p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">SGHR</p>
        <h1 className="mt-2 text-2xl font-bold text-on-surface">Termos e Condições</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-on-surface-variant">
          O Sistema de Gestão de Recursos Humanos destina-se à gestão interna de informações de colaboradores,
          assiduidade, folha salarial, formações e comunicações da organização.
        </p>
        <ul className="mt-5 space-y-3 text-[14px] leading-relaxed text-on-surface-variant">
          <li>• Os dados introduzidos devem ser verdadeiros e atualizados pelos utilizadores autorizados.</li>
          <li>• O acesso é pessoal e intransmissível, devendo cada utilizador proteger as suas credenciais.</li>
          <li>• As operações ficam registadas para auditoria e conformidade com as políticas internas.</li>
          <li>• Em caso de dúvida, utilize o Canal de Suporte disponível no painel.</li>
        </ul>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Voltar ao painel
        </Link>
      </div>
    </main>
  );
}
