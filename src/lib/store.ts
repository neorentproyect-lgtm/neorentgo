"use client";

import { useEffect, useState } from "react";
import { supabase, userToEmail } from "./supabase";

export interface Profile { id: string; username: string; name: string; roles: string[]; validated: boolean }
export interface ValRequest { id: string; user_id: string; name: string; dni: string; cuil: string; nacimiento: string; origen: string; residencia: string; status: string; created_at: string }
export interface PropRow { id: string; owner_id: string; title: string; type: string; zona: string; address: string; price: number; status: string; created_at: string; image?: string; rating?: number; beds?: number; baths?: number; m2?: number; cochera?: boolean; agent?: string }

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
export async function submitValidation(f: { name: string; dni: string; cuil: string; nacimiento: string; origen: string; residencia: string }) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("validation_requests").insert({ user_id: data.user.id, ...f, status: "pending" });
}
export async function submitProperty(f: { title: string; type: string; zona: string; address: string; price: number }) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("properties").insert({ owner_id: data.user.id, ...f, status: "pending" });
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

export function useActiveProperties(): PropRow[] {
  const [rows, setRows] = useState<PropRow[]>([]);
  useEffect(() => {
    const load = async () => { const { data } = await supabase.from("properties").select("*").eq("status", "active").order("created_at", { ascending: false }); setRows((data as PropRow[]) ?? []); };
    load();
    const ch = supabase.channel("active").on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return rows;
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
