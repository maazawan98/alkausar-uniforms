import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { checkEmail, adminLogin, type EmailCheckResult } from "@/lib/admin-auth.functions";
import { useSetAdminSession } from "@/hooks/use-admin-session";
import { Loader2 } from "lucide-react";


type Step =
  | { kind: "initial" }
  | { kind: "admin_password"; email: string; error?: string }
  | { kind: "admin_locked" }
  | { kind: "not_admin" };

const RETURN_KEY = "alk_return_path";

export function AccountModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState<Step>({ kind: "initial" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const check = useServerFn(checkEmail);
  const login = useServerFn(adminLogin);
  const navigate = useNavigate();
  const adminSession = useSetAdminSession();


  useEffect(() => {
    if (!open) {
      // Reset after close
      const t = setTimeout(() => {
        setStep({ kind: "initial" });
        setEmail("");
        setPassword("");
        setLoading(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const startGoogle = async () => {
    try {
      sessionStorage.setItem(
        RETURN_KEY,
        window.location.pathname + window.location.search,
      );
    } catch {}
    setLoading(true);
    // Full-page redirect to Google; supabase-js detects the returned session
    // from the URL on load, and __root.tsx's onAuthStateChange listener
    // handles the welcome toast + return-path navigation from there.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setLoading(false);
      toast.error("Google sign-in failed. Please try again.");
    }
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res: EmailCheckResult = await check({ data: { email: email.trim() } });
      if (res.status === "password_required") {
        setStep({ kind: "admin_password", email: res.email });
      } else if (res.status === "locked") {
        setStep({ kind: "admin_locked" });
      } else {
        setStep({ kind: "not_admin" });
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== "admin_password") return;
    setLoading(true);
    try {
      const res = await login({ data: { email: step.email, password } });
      if (res.status === "success") {
        adminSession.set(res.session);
        toast.success("Welcome Admin");
        onOpenChange(false);
        await navigate({ to: "/admin" });
      } else if (res.status === "wrong_password") {

        setPassword("");
        setStep({
          kind: "admin_password",
          email: step.email,
          error: `Incorrect password. ${res.attemptsRemaining} attempt${res.attemptsRemaining === 1 ? "" : "s"} remaining.`,
        });
      } else if (res.status === "now_locked" || res.status === "locked") {
        setStep({ kind: "admin_locked" });
      } else {
        setStep({ kind: "not_admin" });
      }
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-0 p-0 overflow-hidden">
        <div className="p-8 md:p-10">
          <DialogTitle asChild>
            <h2 className="text-center text-2xl font-bold text-brand-black">
              {step.kind === "admin_password" ? "Admin Login" : "Welcome"}
            </h2>
          </DialogTitle>
          <p className="mt-1.5 text-center text-sm text-brand-black/50">
            {step.kind === "initial" && "Sign in to Alkausar Uniforms"}
            {step.kind === "admin_password" && step.email}
            {step.kind === "admin_locked" && "Account locked"}
            {step.kind === "not_admin" && "Not an admin"}
          </p>

          <div className="mt-8 space-y-5">
            {(step.kind === "initial" ||
              step.kind === "admin_locked" ||
              step.kind === "not_admin") && (
              <button
                type="button"
                onClick={startGoogle}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-3 rounded-full border border-black/10 bg-white hover:bg-brand-cream disabled:opacity-60 transition-colors px-5 py-3.5 text-sm font-semibold text-brand-black"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>
            )}

            {step.kind === "admin_locked" && (
              <p className="text-sm text-center text-brand-black/70 leading-relaxed">
                This email has been temporarily disabled for 24 hours due to multiple failed login attempts.
                <br />
                <br />
                Please continue with Google.
              </p>
            )}

            {step.kind === "not_admin" && (
              <p className="text-sm text-center text-brand-black/70 leading-relaxed">
                This email is not registered as an administrator.
                <br />
                <br />
                Please continue with Google.
              </p>
            )}

            {step.kind === "initial" && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-black/10" />
                  <span className="text-[10px] uppercase tracking-[0.25em] text-black/40">
                    Or
                  </span>
                  <div className="flex-1 h-px bg-black/10" />
                </div>
                <form onSubmit={submitEmail} className="space-y-3">
                  <label className="text-xs uppercase tracking-widest text-black/50">
                    Email Address
                  </label>
                  <input
                    type="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-full border border-black/10 bg-brand-cream/50 px-5 py-3.5 text-sm focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
                    placeholder="you@example.com"
                  />
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#CF0A0A] hover:bg-[#DC5F00] disabled:opacity-60 transition-colors text-white text-sm font-semibold px-5 py-3.5"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Continue
                  </button>
                </form>
              </>
            )}

            {step.kind === "admin_password" && (
              <form onSubmit={submitPassword} className="space-y-3">
                <label className="text-xs uppercase tracking-widest text-black/50">
                  Password
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-full border border-black/10 bg-brand-cream/50 px-5 py-3.5 text-sm focus:outline-none focus:border-brand-orange focus:bg-white transition-colors"
                />
                {step.error && (
                  <p className="text-sm text-[#CF0A0A] text-center">{step.error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#CF0A0A] hover:bg-[#DC5F00] disabled:opacity-60 transition-colors text-white text-sm font-semibold px-5 py-3.5"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Login
                </button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 1 1 0-12.4c1.95 0 3.26.83 4 1.55l2.73-2.63C16.98 3.15 14.7 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12S6.6 21.8 12 21.8c6.94 0 11.5-4.87 11.5-11.72 0-.79-.09-1.4-.2-1.98H12z" />
    </svg>
  );
}

export { RETURN_KEY };
