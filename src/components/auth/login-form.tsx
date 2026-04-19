"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth-actions";

interface LoginFormProps {
  redirectTo?: string;
  showPasskey?: boolean;
}

const initialState: LoginState = {};

/**
 * LoginForm — usa a server action `login()` (auth legacy: USERNAME + bcrypt + JOSE JWT).
 *
 * O Better-Auth foi introduzido em commits recentes mas o schema do banco
 * ainda não comporta (users sem emailVerified/image, credenciais não migradas
 * para a tabela `accounts`). Enquanto a migração não é feita, usamos a
 * implementação estável de auth legacy, que é a que o admin em prod usa.
 */
export function LoginForm({ redirectTo = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(login, initialState);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo de volta!",
      });
      router.push(redirectTo);
      router.refresh();
    } else if (state?.message) {
      toast({
        title: "Erro ao fazer login",
        description: state.message,
        variant: "destructive",
      });
    }
  }, [state, redirectTo, router, toast]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Usuário</Label>
        <Input
          id="username"
          name="username"
          type="text"
          placeholder="admin"
          autoComplete="username"
          required
          disabled={isPending}
          aria-invalid={!!state?.errors?.username}
        />
        {state?.errors?.username?.[0] && (
          <p className="text-xs text-red-600">{state.errors.username[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={isPending}
            aria-invalid={!!state?.errors?.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {state?.errors?.password?.[0] && (
          <p className="text-xs text-red-600">{state.errors.password[0]}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}
