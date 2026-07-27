import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword } from "../lib/firebase";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Mail, KeyRound } from "lucide-react";

export function AuthDialog({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t("compila_tutti_i_campi", "Compila tutti i campi"));
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        toast.success(t("login_success", "Accesso effettuato con successo"));
      } else {
        await registerWithEmail(email, password);
        toast.success(t("register_success", "Registrazione completata"));
      }
      setIsOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(t("auth_error", "Errore durante l'autenticazione"), {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      setIsOpen(false);
    } catch (error) {
      // Handled in loginWithGoogle
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error(t("inserisci_email", "Inserisci l'email prima di fare il reset"));
      return;
    }
    try {
      await resetPassword(email);
      toast.success(t("reset_email_sent", "Email di reset inviata!"));
    } catch (error: any) {
      toast.error(t("errore", "Errore"), { description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 z-[3000]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            {isLogin ? "Accedi" : "Registrati"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-11 rounded-xl"
                placeholder="mario@email.com"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-11 rounded-xl"
                placeholder="********"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            disabled={loading}
          >
            {loading ? "Attendere..." : (isLogin ? "Accedi" : "Registrati")}
          </Button>
          
          {isLogin && (
            <div className="text-center">
              <button 
                type="button" 
                onClick={handleResetPassword}
                className="text-xs text-indigo-600 hover:underline"
              >
                Password dimenticata?
              </button>
            </div>
          )}

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-bold">Oppure</span>
            </div>
          </div>

          <Button 
            type="button"
            variant="outline" 
            className="w-full h-11 rounded-xl flex items-center gap-2"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continua con Google
          </Button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              {isLogin ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
