"use client";

import { useEffect, useState } from "react";
import { supabase, userToEmail } from "./supabase";

export interface Profile { id: string; username: string; name: string; roles: string[]; validated: boolean }
export interface ValRequest { id: string; user_id: string; name: string; dni: string; cuil: string; nacimiento: string; origen: string; residencia: string; status: string; created_at: string; dni_front?: string; dni_back?: string }
export interface PropMedia { url: string; kind: string; position: number }
export interface PropRow { id: string; owner_id: string; title: string; type: string; zona: string; address: string; price: number; status: string; created_at: string; image?: string; rating?: number; beds?: number; baths?: number; m2?: number; cochera?: boolean; agent?: string; source?: string; media?: PropMedia[] }

async function fetchProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
  return (data as Profile) ?? null;
}

/* ---------- AUTH ---------- */
export async function signInUser(username: string, password: string): Promise<{ profile?: Profile; error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: userToEmail(username), password });
  if (error || !data.user) return { error: "Usuario o contraseña incorrectos." };
  const p = await fetchProfile(data.user.id);
  return p ? { profile: p } : { error: "No se encontró el perfil." };
}
export async function signUpUser(username: string, password: string): Promise<{ profile?: Profile; error?: string }> {
  const uname = username.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({ email: userToEmail(uname), password });
  if (error || !data.user) return { error: error?.message || "No se pudo crear la cuenta." };
  const { error: perr } = await supabase.from("profiles").insert({ id: data.user.id, username: uname, name: uname, roles: [] });
  if (perr && !perr.message.includes("duplicate")) return { error: perr.message };
  return { profile: { id: data.user.id, username: uname, name: uname, roles: [], validated: false } };
}
export async function signOutUser() { await supabase.auth.signOut(); }

export async function signInWithGoogle(next?: string) {
  await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: (typeof window !== "undefined" ? window.location.origin : "") + (next ?? "") } });
}

export async function amIAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

export async function updateRoles(roles: string[]) {
  const { data } = await supabase.auth.getUser();
  if (data.user) await supabase.from("profiles").update({ roles }).eq("id", data.user.id);
}

export function useProfile(): { profile: Profile | null; loading: boolean } {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      setProfile(data.user ? await fetchProfile(data.user.id) : null);
      setLoading(false);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    const ch = supabase.channel("me").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load()).subscribe();
    return () => { sub.subscription.unsubscribe(); supabase.removeChannel(ch); };
  }, []);
  return { profile, loading };
}

export function useMyValidation(userId: string | undefined): string {
  const [st, setSt] = useState("none");
  useEffect(() => {
    if (!userId) { setSt("none"); return; }
    const load = async () => {
      const { data } = await supabase.from("validation_requests").select("status").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setSt(data?.status ?? "none");
    };
    load();
    const ch = supabase.channel("myval").on("postgres_changes", { event: "*", schema: "public", table: "validation_requests" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);
  return st;
}

export function useMyProperties(ownerId: string | undefined): PropRow[] {
  const [rows, setRows] = useState<PropRow[]>([]);
  useEffect(() => {
    if (!ownerId) { setRows([]); return; }
    const load = async () => {
      const { data } = await supabase.from("properties").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
      setRows((data as PropRow[]) ?? []);
    };
    load();
    const ch = supabase.channel("myprops").on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerId]);
  return rows;
}

/* ---------- ACTIONS ---------- */
export async function submitValidation(f: { name: string; dni: string; cuil: string; nacimiento: string; origen: string; residencia: string; dni_front?: string; dni_back?: string }) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("validation_requests").insert({ user_id: data.user.id, ...f, status: "pending" });
}

// Sube una foto del DNI al bucket privado; devuelve el path guardado.
export async function uploadKyc(file: File, side: "front" | "back"): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${data.user.id}/dni-${side}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("kyc").upload(path, file, { upsert: true });
  return error ? null : path;
}

// URL firmada temporal para que el admin vea la imagen del DNI.
export async function kycSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("kyc").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
export async function submitProperty(f: { title: string; type: string; zona: string; address: string; price: number }, images: string[] = []) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { data: ins } = await supabase.from("properties").insert({ owner_id: data.user.id, ...f, image: images[0] ?? null, status: "pending" }).select("id").single();
  if (ins && images.length) {
    await supabase.from("property_media").insert(images.map((url, i) => ({ property_id: (ins as { id: string }).id, url, kind: "image", position: i })));
  }
}

export async function uploadPropertyImage(file: File): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${data.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from("property-images").upload(path, file, { upsert: true });
  if (error) return null;
  return supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
}
export async function resolveValidation(r: ValRequest, ok: boolean) {
  await supabase.from("validation_requests").update({ status: ok ? "validated" : "rejected" }).eq("id", r.id);
  if (ok) await supabase.from("profiles").update({ validated: true }).eq("id", r.user_id);
}
export async function resolveProperty(id: string, ok: boolean) {
  await supabase.from("properties").update({ status: ok ? "active" : "rejected" }).eq("id", id);
}

/* ---------- ADMIN ---------- */
export function usePendingApprovals(enabled: boolean): { vals: ValRequest[]; props: PropRow[] } {
  const [vals, setVals] = useState<ValRequest[]>([]);
  const [props, setProps] = useState<PropRow[]>([]);
  useEffect(() => {
    if (!enabled) return;
    const load = async () => {
      const v = await supabase.from("validation_requests").select("*").eq("status", "pending").order("created_at");
      const p = await supabase.from("properties").select("*").eq("status", "pending").order("created_at");
      setVals((v.data as ValRequest[]) ?? []);
      setProps((p.data as PropRow[]) ?? []);
    };
    load();
    const ch = supabase.channel("admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "validation_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [enabled]);
  return { vals, props };
}

/* ---------- MARKETPLACE + CANDIDATOS ---------- */
export interface Application { id: string; property_id: string; tenant_id: string; status: string; created_at: string; property?: { title: string; zona: string; price: number; image?: string; owner_id?: string } }

const sortMedia = (p: PropRow): PropRow => ({ ...p, media: (p.media ?? []).slice().sort((a, b) => a.position - b.position) });

export function useActiveProperties(): PropRow[] {
  const [rows, setRows] = useState<PropRow[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("properties").select("*, media:property_media(url,kind,position)").eq("status", "active").order("created_at", { ascending: false });
      setRows(((data as PropRow[]) ?? []).map(sortMedia));
    };
    load();
    const ch = supabase.channel("active")
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "property_media" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return rows;
}

export async function getProperty(id: string): Promise<PropRow | null> {
  const { data } = await supabase.from("properties").select("*, media:property_media(url,kind,position)").eq("id", id).maybeSingle();
  return data ? sortMedia(data as PropRow) : null;
}

export async function submitApplication(propertyId: string): Promise<{ ok?: boolean; error?: string }> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Iniciá sesión." };
  const { error } = await supabase.from("applications").insert({ property_id: propertyId, tenant_id: data.user.id });
  if (error) return { error: error.message.includes("duplicate") ? "Ya te contactaste con esta propiedad." : error.message };
  return { ok: true };
}

export function useMyApplications(tenantId: string | undefined): Application[] {
  const [rows, setRows] = useState<Application[]>([]);
  useEffect(() => {
    if (!tenantId) { setRows([]); return; }
    const load = async () => { const { data } = await supabase.from("applications").select("*, property:properties(title,zona,price,image)").eq("tenant_id", tenantId).order("created_at", { ascending: false }); setRows((data as Application[]) ?? []); };
    load();
    const ch = supabase.channel("myapps").on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId]);
  return rows;
}

export function useCandidates(ownerId: string | undefined): Application[] {
  const [rows, setRows] = useState<Application[]>([]);
  useEffect(() => {
    if (!ownerId) { setRows([]); return; }
    const load = async () => { const { data } = await supabase.from("applications").select("*, property:properties!inner(title,zona,price,owner_id)").eq("property.owner_id", ownerId).order("created_at", { ascending: false }); setRows((data as Application[]) ?? []); };
    load();
    const ch = supabase.channel("cands").on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerId]);
  return rows;
}

export async function resolveApplication(id: string, status: "accepted" | "rejected") {
  await supabase.from("applications").update({ status }).eq("id", id);
}

/* ---------- ADMIN: stats y eventos REALES ---------- */
export function useAdminStats(): { usuarios: number; validados: number; activas: number; enAprobacion: number } {
  const [s, setS] = useState({ usuarios: 0, validados: 0, activas: 0, enAprobacion: 0 });
  useEffect(() => {
    const load = async () => {
      const [u, v, a, pv, pp] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("validated", true),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("validation_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setS({ usuarios: u.count ?? 0, validados: v.count ?? 0, activas: a.count ?? 0, enAprobacion: (pv.count ?? 0) + (pp.count ?? 0) });
    };
    load();
    const ch = supabase.channel("stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "validation_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return s;
}

export interface AdminUser { id: string; username: string; name: string; roles: string[]; validated: boolean; created_at: string }
export function useAllUsers(): AdminUser[] {
  const [rows, setRows] = useState<AdminUser[]>([]);
  useEffect(() => {
    const load = async () => { const { data } = await supabase.from("profiles").select("id,username,name,roles,validated,created_at").order("created_at", { ascending: false }); setRows((data as AdminUser[]) ?? []); };
    load();
    const ch = supabase.channel("allusers").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return rows;
}
export function useAllProperties(): PropRow[] {
  const [rows, setRows] = useState<PropRow[]>([]);
  useEffect(() => {
    const load = async () => { const { data } = await supabase.from("properties").select("*").order("created_at", { ascending: false }); setRows((data as PropRow[]) ?? []); };
    load();
    const ch = supabase.channel("allprops").on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return rows;
}

export interface AuditEvent { id: number; actor: string | null; actor_label: string | null; action: string; entity: string; entity_id: string | null; meta: Record<string, unknown>; at: string }
export function useAudit(limit = 50): AuditEvent[] {
  const [rows, setRows] = useState<AuditEvent[]>([]);
  useEffect(() => {
    const load = async () => { const { data } = await supabase.from("audit_events").select("*").order("at", { ascending: false }).limit(limit); setRows((data as AuditEvent[]) ?? []); };
    load();
    const ch = supabase.channel("audit").on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_events" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [limit]);
  return rows;
}

export interface AdminUserRow { id: string; username: string; name: string; email: string | null; provider: string; roles: string[]; validated: boolean; source: string; created_at: string; last_sign_in: string | null; props_count: number; apps_count: number }
export function useAdminUsers(): AdminUserRow[] {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  useEffect(() => {
    const load = async () => { const { data } = await supabase.rpc("admin_users"); setRows((data as AdminUserRow[]) ?? []); };
    load();
    const ch = supabase.channel("adminusers")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return rows;
}

export interface RecentEvent { id: string; text: string; tone: "info" | "ok" | "warn"; at: string }
export function useRecentEvents(): RecentEvent[] {
  const [ev, setEv] = useState<RecentEvent[]>([]);
  useEffect(() => {
    const load = async () => {
      const [v, p, ap] = await Promise.all([
        supabase.from("validation_requests").select("id,name,status,created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("properties").select("id,title,status,created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("applications").select("id,created_at,property:properties(title)").order("created_at", { ascending: false }).limit(8),
      ]);
      const out: RecentEvent[] = [];
      (v.data ?? []).forEach((x: { id: string; name: string; status: string; created_at: string }) => out.push({ id: "v" + x.id, text: `Validación DNI · ${x.name} (${x.status})`, tone: x.status === "validated" ? "ok" : x.status === "rejected" ? "warn" : "info", at: x.created_at }));
      (p.data ?? []).forEach((x: { id: string; title: string; status: string; created_at: string }) => out.push({ id: "p" + x.id, text: `Propiedad · ${x.title} (${x.status})`, tone: x.status === "active" ? "ok" : "info", at: x.created_at }));
      (ap.data ?? []).forEach((x: { id: string; created_at: string; property?: { title?: string } | { title?: string }[] }) => { const pr = Array.isArray(x.property) ? x.property[0] : x.property; out.push({ id: "a" + x.id, text: `Candidato · ${pr?.title ?? "propiedad"}`, tone: "info", at: x.created_at }); });
      out.sort((a, b) => (a.at < b.at ? 1 : -1));
      setEv(out.slice(0, 12));
    };
    load();
    const ch = supabase.channel("events")
      .on("postgres_changes", { event: "*", schema: "public", table: "validation_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return ev;
}
