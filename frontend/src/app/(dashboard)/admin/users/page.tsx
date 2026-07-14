"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";

const TIERS = ["introduction", "goutte", "source", "fleuve", "ocean"];

type UserRow = {
  id: string;
  full_name: string;
  phone: string | null;
  current_tier: string;
  role: string;
  created_at: string;
};

type UserDetail = {
  profile: UserRow;
  quota: { words_used: number; words_limit: number; downloads_used: number; downloads_limit: number } | null;
  recent_usage: { tool: string; model: string; cost_usd: number; created_at: string }[];
};

const PER_PAGE = 20;

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);

  async function loadUsers() {
    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
    if (search.trim()) params.set("search", search.trim());
    const res = await apiFetch(`/api/v1/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.items);
      setTotal(data.total);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
    if (search.trim()) params.set("search", search.trim());
    apiFetch(`/api/v1/admin/users?${params}`).then((res) => {
      if (res.ok) {
        res.json().then((data) => {
          setUsers(data.items);
          setTotal(data.total);
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearch() {
    // si on est deja sur la page 1, changer `page` ne redeclenche pas l'effet : on
    // recharge nous-memes. Sinon, laisser l'effet [page] s'en charger evite un
    // doublon de requete avec un `page` obsolete.
    if (page === 1) loadUsers();
    else setPage(1);
  }

  async function openDetail(id: string) {
    setSelectedId(id);
    const res = await apiFetch(`/api/v1/admin/users/${id}`);
    if (res.ok) setDetail(await res.json());
  }

  async function changeTier(tier: string) {
    if (!selectedId) return;
    const res = await apiFetch(`/api/v1/admin/users/${selectedId}/tier`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    if (res.ok) {
      toast.success("Palier mis à jour");
      openDetail(selectedId);
      loadUsers();
    } else {
      toast.error("Mise à jour impossible");
    }
  }

  async function resetQuota() {
    if (!selectedId) return;
    const res = await apiFetch(`/api/v1/admin/users/${selectedId}/reset-quota`, { method: "POST" });
    if (res.ok) {
      toast.success("Quota réinitialisé");
      openDetail(selectedId);
    } else {
      toast.error("Réinitialisation impossible");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1>Utilisateurs</h1>
        <p className="text-muted-foreground">Recherche et gestion des comptes.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Rechercher par nom..."
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          Rechercher
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[12px] border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Palier</TableHead>
              <TableHead>Inscrit le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} onClick={() => openDetail(u.id)} className="cursor-pointer">
                <TableCell>{u.full_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{u.current_tier}</Badge>
                </TableCell>
                <TableCell>{new Date(u.created_at).toLocaleDateString("fr-FR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} utilisateur(s)</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span>
            {page}/{totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      </div>

      <Sheet open={!!selectedId} onOpenChange={(open) => !open && (setSelectedId(null), setDetail(null))}>
        <SheetContent className="w-full max-w-md overflow-y-auto p-6">
          <SheetHeader className="px-0">
            <SheetTitle>{detail?.profile.full_name}</SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="flex flex-col gap-5 pt-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase text-muted-foreground">Palier</span>
                <Select value={detail.profile.current_tier} onValueChange={(v) => v && changeTier(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {detail.quota && (
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Quota du mois</span>
                  <span>
                    {detail.quota.words_used.toLocaleString("fr-FR")} / {detail.quota.words_limit.toLocaleString("fr-FR")} mots
                  </span>
                  <span>
                    {detail.quota.downloads_used} / {detail.quota.downloads_limit} téléchargements
                  </span>
                  <Button variant="outline" size="sm" onClick={resetQuota} className="mt-1 w-fit">
                    Réinitialiser le quota
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Historique d&apos;usage (50 derniers)
                </span>
                <div className="flex flex-col gap-1">
                  {detail.recent_usage.map((u, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>
                        {u.tool} ({u.model})
                      </span>
                      <span className="text-muted-foreground">${u.cost_usd.toFixed(4)}</span>
                    </div>
                  ))}
                  {detail.recent_usage.length === 0 && (
                    <span className="text-xs text-muted-foreground">Aucune génération.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
