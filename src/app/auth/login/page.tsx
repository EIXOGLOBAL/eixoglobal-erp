import { LoginForm } from "@/components/auth/login-form";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Login - EixoGlobal ERP",
  description: "Faça login na sua conta",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">EixoGlobal ERP</h1>
          <p className="text-muted-foreground mt-2">
            Sistema de Gestão Empresarial
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-8 border">
          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          © 2026 EixoGlobal. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
