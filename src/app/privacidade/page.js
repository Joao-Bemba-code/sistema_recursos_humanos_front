import Link from "next/link";

export const metadata = {
  title: "Política de Dados | SGHR",
  description: "Política de privacidade e tratamento de dados do Sistema de Gestão de Recursos Humanos.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-surface-card p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">SGHR</p>
        <h1 className="mt-2 text-2xl font-bold text-on-surface">Política de Dados</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-on-surface-variant">
          Os dados pessoais geridos neste sistema são utilizados exclusivamente para fins de administração de
          recursos humanos, respeitando os princípios de minimização, confidencialidade e segurança.
        </p>
        <ul className="mt-5 space-y-3 text-[14px] leading-relaxed text-on-surface-variant">
          <li>• Cada organização administra os seus próprios dados e utilizadores.</li>
          <li>• O acesso às informações depende das permissões atribuídas a cada perfil.</li>
          <li>• Não são partilhados dados com terceiros para fins comerciais.</li>
          <li>• Pedidos de consulta, correção ou eliminação podem ser submetidos pelo Canal de Suporte.</li>
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
