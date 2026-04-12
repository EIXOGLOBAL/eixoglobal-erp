"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await (authClient.twoFactor as any).verify({
        code,
      });

      if (result.error) {
        toast({
          title: "Código inválido",
          description: "O código de verificação está incorreto. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Verificação concluída",
        description: "Login realizado com sucesso!",
      });

      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      toast({
        title: "Erro ao verificar código",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Verificação em Duas Etapas</h1>
          <p className="text-muted-foreground mt-2">
            Insira o código do seu aplicativo autenticador
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-8 border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Código de Verificação</Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={isLoading}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                autoFocus
                required
              />
              <p className="text-sm text-muted-foreground text-center">
                Código de 6 dígitos
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Voltar ao login
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          © 2026 EixoGlobal. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <Verify2FAContent />
    </Suspense>
  );
}
