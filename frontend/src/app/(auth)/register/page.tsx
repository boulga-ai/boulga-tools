"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
      },
    });
    setLoading(false);

    if (error) {
      toast.error("Inscription impossible", { description: error.message });
      return;
    }

    toast.success("Compte cree", { description: "Bienvenue sur Boulga AI." });
    router.push("/");
    router.refresh();
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-center">Creer un compte</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Nom complet</Label>
          <Input
            id="fullName"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Aminata Traore"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Numero de telephone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+226 70 00 00 00"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Creation en cours..." : "Creer mon compte"}
        </Button>
      </form>

      <div className="relative text-center text-xs text-muted-foreground">
        <span className="bg-card relative z-10 px-2">ou</span>
        <div className="absolute inset-x-0 top-1/2 border-t" />
      </div>

      <Button type="button" variant="outline" onClick={handleGoogle}>
        Continuer avec Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Deja un compte ?{" "}
        <Link href="/login" className="text-bleu-boulga font-medium">
          Connectez-vous
        </Link>
      </p>
    </div>
  );
}
