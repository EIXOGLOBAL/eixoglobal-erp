"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Copy, Check } from "lucide-react";
import QRCode from "qrcode";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface MFASetupProps {
  onComplete?: () => void;
}

export function MFASetup({ onComplete }: MFASetupProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"setup" | "verify" | "complete">("setup");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const handleSetup = async () => {
    setIsLoading(true);

    try {
      const result = await authClient.twoFactor.enable();

      if (result.error) {
        toast({
          title: "Erro ao configurar 2FA",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      // Generate QR code
      const otpauthUrl = result.data.totpUri;
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      
      setQrCode(qrCodeDataUrl);
      setSecret(result.data.secret);
      setBackupCodes(result.data.backupCodes || []);
      setStep("verify");
    } catch (error) {
      toast({
        title: "Erro ao configurar 2FA",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await authClient.twoFactor.verify({
        code: verificationCode,
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
        title: "2FA ativado com sucesso!",
        description: "Sua conta agora está protegida com autenticação de dois fatores.",
      });

      setStep("complete");
      
      if (onComplete) {
        onComplete();
      }
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

  const copyToClipboard = async (text: string, type: "secret" | "backup") => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === "secret") {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else {
        setCopiedBackupCodes(true);
        setTimeout(() => setCopiedBackupCodes(false), 2000);
      }

      toast({
        title: "Copiado!",
        description: "Texto copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  if (step === "setup") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurar Autenticação de Dois Fatores
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Por que usar 2FA?</AlertTitle>
            <AlertDescription>
              A autenticação de dois fatores protege sua conta mesmo se sua senha for comprometida.
              Você precisará de um código do seu aplicativo autenticador para fazer login.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">Você precisará de:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Um aplicativo autenticador (Google Authenticator, Authy, etc.)</li>
              <li>Acesso ao seu dispositivo móvel</li>
            </ul>
          </div>

          <Button onClick={handleSetup} disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Começar Configuração
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "verify") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escanear Código QR</CardTitle>
          <CardDescription>
            Use seu aplicativo autenticador para escanear o código
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            {qrCode && (
              <img src={qrCode} alt="QR Code" className="w-64 h-64" />
            )}

            <div className="w-full space-y-2">
              <Label>Ou insira manualmente:</Label>
              <div className="flex gap-2">
                <Input value={secret} readOnly className="font-mono" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(secret, "secret")}
                >
                  {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <Alert>
            <AlertTitle>Códigos de Backup</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Guarde estes códigos em um lugar seguro. Você pode usá-los se perder acesso ao seu dispositivo:</p>
              <div className="bg-muted p-3 rounded-md font-mono text-sm space-y-1">
                {backupCodes.map((code, index) => (
                  <div key={index}>{code}</div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(backupCodes.join("\n"), "backup")}
                className="w-full mt-2"
              >
                {copiedBackupCodes ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Códigos
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código de Verificação</Label>
              <Input
                id="code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={isLoading}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                required
              />
              <p className="text-sm text-muted-foreground">
                Insira o código de 6 dígitos do seu aplicativo autenticador
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || verificationCode.length !== 6}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar e Ativar
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <Check className="h-5 w-5" />
          2FA Ativado com Sucesso!
        </CardTitle>
        <CardDescription>
          Sua conta agora está protegida com autenticação de dois fatores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Próximos Passos</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Guarde seus códigos de backup em um lugar seguro</li>
              <li>Você precisará do código do autenticador no próximo login</li>
              <li>Você pode desativar o 2FA a qualquer momento nas configurações</li>
            </ul>
          </AlertDescription>
        </Alert>

        {backupCodes.length > 0 && (
          <div className="space-y-2">
            <Label>Seus Códigos de Backup:</Label>
            <div className="bg-muted p-3 rounded-md font-mono text-sm space-y-1">
              {backupCodes.map((code, index) => (
                <div key={index}>{code}</div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(backupCodes.join("\n"), "backup")}
              className="w-full"
            >
              {copiedBackupCodes ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Códigos
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
