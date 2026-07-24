import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl" />
      </div>

      <main className="flex-grow flex items-center justify-center px-4 md:px-8 z-10 py-12">
        <LoginForm />
      </main>

      <footer className="w-full py-4 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-3 bg-surface border-t border-outline-variant/30 z-20">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">SGHR</span>
          <span className="text-[13px] text-on-surface-variant/60">&copy; 2026 CENFFOR. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
