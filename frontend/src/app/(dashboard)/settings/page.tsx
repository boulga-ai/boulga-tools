"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuota } from "@/hooks/useQuota";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const TIERS = [
  { value: "introduction", label: "Introduction", price: "Gratuit", access: "Pack Introduction, quota limite." },
  { value: "goutte", label: "Goutte", price: "2 900 FCFA/mois", access: "Introduction + un pack au choix, telechargements debloques." },
  { value: "source", label: "Source", price: "5 999 FCFA/mois", access: "Comme Goutte, quota plus genereux." },
  { value: "fleuve", label: "Fleuve", price: "9 999 FCFA/mois", access: "Les deux packs debloques." },
  { value: "ocean", label: "Ocean", price: "29 999 FCFA/mois", access: "Illimite, multi-sieges, API." },
];

type QuotaHistoryRow = {
  period: string;
  words_used: number;
  words_limit: number;
  downloads_used: number;
  downloads_limit: number;
};

export default function SettingsPage() {
  const { user, profile, refetchProfile, signOut } = useAuth();
  const { quota } = useQuota();

  const wordsUsedPct =
    quota && quota.words_limit > 0
      ? Math.min(100, Math.round(((quota.words_limit - quota.words_remaining) / quota.words_limit) * 100))
      : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1>Parametres</h1>
        <p className="text-muted-foreground">Profil, abonnement et quotas.</p>
      </div>

      <Tabs defaultValue="profil">
        <TabsList>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="abonnement">Abonnement</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
        </TabsList>

        <TabsContent value="profil" className="pt-4">
          <ProfilTab
            key={profile ? "ready" : "loading"}
            email={user?.email}
            fullName={profile?.full_name}
            phone={profile?.phone}
            onSaved={refetchProfile}
            onSignOut={signOut}
          />
        </TabsContent>

        <TabsContent value="abonnement" className="pt-4">
          <div className="flex flex-col gap-3">
            {TIERS.map((tier) => {
              const current = profile?.current_tier === tier.value;
              return (
                <div
                  key={tier.value}
                  className={cn(
                    "flex items-center justify-between rounded-[12px] border p-4",
                    current && "border-bleu-boulga bg-blue-50",
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tier.label}</span>
                      {current && (
                        <span className="flex items-center gap-1 rounded-[4px] bg-bleu-boulga px-1.5 py-0.5 text-xs text-white">
                          <Check className="size-3" /> Actuel
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{tier.access}</p>
                  </div>
                  <span className="text-sm font-medium">{tier.price}</span>
                </div>
              );
            })}
            <a href="mailto:boulgacorporation@gmail.com" className="w-fit">
              <Button variant="outline">
                <Mail className="size-4" />
                Changer de palier — contactez boulgacorporation@gmail.com
              </Button>
            </a>
          </div>
        </TabsContent>

        <TabsContent value="quotas" className="pt-4">
          <div className="flex flex-col gap-6">
            {quota && (
              <div className="flex flex-col gap-3 rounded-[12px] border bg-card p-5">
                <h3>Ce mois-ci</h3>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>Mots</span>
                    <span className="text-muted-foreground">
                      {quota.words_remaining.toLocaleString("fr-FR")} / {quota.words_limit.toLocaleString("fr-FR")} restants
                    </span>
                  </div>
                  <Progress value={wordsUsedPct} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {quota.downloads_remaining.toLocaleString("fr-FR")} telechargements restants ce mois.
                </p>
              </div>
            )}
            <QuotaHistory />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfilTab({
  email,
  fullName,
  phone,
  onSaved,
  onSignOut,
}: {
  email?: string;
  fullName?: string;
  phone?: string | null;
  onSaved: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [name, setName] = useState(fullName ?? "");
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await apiFetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, phone: phoneValue || undefined }),
      });
      if (!res.ok) throw new Error("Enregistrement impossible.");
      await onSaved();
      toast.success("Profil mis a jour");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caracteres.");
      return;
    }
    setChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      toast.success("Mot de passe mis a jour");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    const res = await apiFetch("/api/v1/users/me", { method: "DELETE" });
    if (!res.ok) {
      toast.error("Suppression du compte impossible.");
      return;
    }
    await onSignOut();
    router.push("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[12px] border bg-card p-5">
        <div className="flex flex-col gap-1.5">
          <Label>Nom complet</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Email</Label>
          <Input value={email ?? ""} disabled />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Telephone</Label>
          <Input value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} />
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-fit">
          {saving ? "Enregistrement..." : "Sauvegarder"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-[12px] border bg-card p-5">
        <h3>Changer de mot de passe</h3>
        <div className="flex flex-col gap-1.5">
          <Label>Nouveau mot de passe</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <Button variant="outline" onClick={handleChangePassword} disabled={changingPassword} className="w-fit">
          {changingPassword ? "Mise a jour..." : "Changer le mot de passe"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-[12px] border border-erreur/30 bg-erreur/5 p-5">
        <h3 className="text-erreur">Zone dangereuse</h3>
        <p className="text-sm text-muted-foreground">
          La suppression de votre compte est definitive et efface tous vos documents et donnees.
        </p>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive" className="w-fit" />}>
            Supprimer mon compte
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer definitivement votre compte ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irreversible : documents, conversations et historique seront
                perdus.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function QuotaHistory() {
  const [history, setHistory] = useState<QuotaHistoryRow[] | null>(null);

  useEffect(() => {
    apiFetch("/api/v1/users/me/quota/history").then((res) => {
      if (res.ok) res.json().then(setHistory);
    });
  }, []);

  if (!history || history.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border bg-card p-5">
      <h3>Historique (6 derniers mois)</h3>
      {history.map((h) => (
        <div key={h.period} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{h.period}</span>
          <span>
            {h.words_used.toLocaleString("fr-FR")}/{h.words_limit.toLocaleString("fr-FR")} mots ·{" "}
            {h.downloads_used}/{h.downloads_limit} telechargements
          </span>
        </div>
      ))}
    </div>
  );
}
