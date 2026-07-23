"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PropRow, ValRequest, amIAdmin, kycSignedUrl, resolveProperty, resolveValidation, signInWithGoogle, signOutUser, useAdminStats, useAdminUsers, useAllProperties, useAudit, usePendingApprovals, useProfile } from "@/lib/store";

type Kind = "dni" | "propiedad";
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
const nowClock = () => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);
const gIcon = (<svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>);

const ACTION_LABEL: Record<string, string> = {
  "user.created": "Usuario creado", "user.roles_changed": "Cambió sus roles", "user.validated": "Cuenta validada", "user.unvalidated": "Validación revertida",
  "validation.submitted": "Envió validación", "validation.validated": "Validación aprobada", "validation.rejected": "Validación rechazada",
  "property.created": "Publicó propiedad", "property.active": "Propiedad habilitada", "property.pending": "Propiedad en revisión", "property.rejected": "Propiedad rechazada",
  "application.created": "Se postuló a una propiedad", "application.accepted": "Postulación aceptada", "application.rejected": "Postulación rechazada",
};
const actionTone = (a: string): "ok" | "warn" | "info" => (a.includes("rejected") || a.includes("unvalidated") ? "warn" : a.includes("validated") || a.endsWith(".active") || a.includes("accepted") ? "ok" : "info");
const sourceBadge = (s: string) => (s === "seed" ? { c: "bg-violet-100 text-violet-700", l: "Demo · sin enlazar" } : s === "legacy" ? { c: "bg-amber-100 text-amber-700", l: "Antes de OAuth" } : { c: "bg-emerald-100 text-emerald-700", l: "Real" });

function GateShell({ children }: { children: ReactNode }) {
  return (
    <div className="lux-mesh grid min-h-screen place-items-center p-4">
      <div className="soft-lg w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-8 text-center">
        <div className="flex items-center justify-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-black text-white">◆</div><span className="font-display text-lg font-semibold text-stone-900">Neo Rent Go · <span className="text-amber-600">Mayordomo</span></span></div>
        {children}
        <Link href="/" className="mt-6 block text-sm text-stone-500 hover:text-stone-800">← Volver al sitio</Link>
      </div>
    </div>
  );
}

export default function Mayordomo() {
  const { profile, loading } = useProfile();
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => { if (!profile) { setAdmin(null); return; } amIAdmin().then(setAdmin); }, [profile?.id]);

  if (loading) return <GateShell><p className="mt-6 text-sm text-stone-500">Cargando…</p></GateShell>;
  if (!profile) return (
    <GateShell>
      <h1 className="mt-5 font-display text-2xl font-semibold text-stone-900">Panel de sistema</h1>
      <p className="mt-1 text-sm text-stone-500">Acceso restringido. Ingresá con una cuenta autorizada.</p>
      <button onClick={() => signInWithGoogle("/mayordomo")} className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-stone-200 bg-white py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50">{gIcon} Ingresar con Google</button>
    </GateShell>
  );
  if (admin === null) return <GateShell><p className="mt-6 text-sm text-stone-500">Verificando acceso…</p></GateShell>;
  if (!admin) return (
    <GateShell>
      <h1 className="mt-5 font-display text-2xl font-semibold text-stone-900">Acceso no autorizado</h1>
      <p className="mt-1 text-sm text-stone-500">La cuenta <b>{profile.name}</b> no está en la lista de administradores.</p>
      <button onClick={() => signOutUser()} className="mt-6 w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white transition hover:bg-stone-800">Cerrar sesión</button>
    </GateShell>
  );
  return <Dashboard />;
}

function Dashboard() {
  const { vals, props } = usePendingApprovals(true);
  const st = useAdminStats();
  const events = useAudit(60);
  const users = useAdminUsers();
  const allProps = useAllProperties();
  const [clock, setClock] = useState(nowClock());
  const idRef = useRef(0);
  const [registry, setRegistry] = useState<{ id: string; action: string; time: string }[]>([]);
  useEffect(() => { const c = setInterval(() => setClock(nowClock()), 1000); return () => clearInterval(c); }, []);
  const log = (action: string) => setRegistry((p) => [{ id: `r${idRef.current++}`, action, time: nowClock() }, ...p].slice(0, 20));
  const openDoc = async (path?: string) => { if (!path) return; const url = await kycSignedUrl(path); if (url) window.open(url, "_blank"); };

  interface Row { key: string; kind: Kind; title: string; subtitle: string; front?: string; back?: string; resolve: (ok: boolean) => void }
  const rows: Row[] = [
    ...vals.map((r: ValRequest): Row => ({ key: r.id, kind: "dni", title: `${r.name} · DNI ${r.dni ?? ""}`, subtitle: `CUIL ${r.cuil ?? "—"} · valida identidad`, front: r.dni_front, back: r.dni_back, resolve: (ok) => { resolveValidation(r, ok); log(`${ok ? "Aprobó" : "Rechazó"} DNI de ${r.name}`); } })),
    ...props.map((p: PropRow): Row => ({ key: p.id, kind: "propiedad", title: p.title, subtitle: `${p.zona ?? ""} · ${fmt(p.price)}`, resolve: (ok) => { resolveProperty(p.id, ok); log(`${ok ? "Habilitó" : "Rechazó"} propiedad · ${p.title}`); } })),
  ];

  const stats: [string, number][] = [["Usuarios", st.usuarios], ["Validados", st.validados], ["Propiedades activas", st.activas], ["En aprobación", rows.length]];
  const kindClass: Record<Kind, string> = { dni: "bg-violet-100 text-violet-700", propiedad: "bg-sky-100 text-sky-700" };
  const toneDot = { info: "bg-sky-500", ok: "bg-emerald-500", warn: "bg-amber-500" };
  const th = "px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400";

  return (
    <div className="relative min-h-screen">
      <div className="lux-mesh pointer-events-none fixed inset-0 -z-10" />
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f7f6f2]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-black text-white">◆</div><span className="font-display text-lg font-semibold text-stone-900">Mayordomo</span><span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> panóptico</span></div>
          <div className="flex items-center gap-4"><span className="font-display text-sm tabular-nums text-stone-500">{clock}</span><button onClick={() => signOutUser()} className="text-sm text-stone-500 hover:text-stone-900">Salir</button></div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{stats.map(([l, v]) => (<div key={l} className="soft rounded-2xl border border-stone-200 bg-white p-4"><div className="font-display text-2xl font-semibold text-stone-900 tabular-nums">{v}</div><div className="mt-1 text-xs text-stone-500">{l}</div></div>))}</div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="mb-1 font-display text-xl font-semibold text-stone-900">Aprobaciones pendientes</h2>
            <p className="mb-4 text-sm text-stone-500">Solicitudes reales (DNI y propiedades), en vivo.</p>
            <div className="space-y-3">
              {rows.length === 0 && <p className="soft rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">Todo al día ✦</p>}
              {rows.map((r) => (
                <div key={r.key} className="animate-fadeUp soft flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4">
                  <div><span className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${kindClass[r.kind]}`}>{r.kind}</span><p className="font-medium text-stone-900">{r.title}</p><p className="text-xs text-stone-500">{r.subtitle}</p>{(r.front || r.back) && <div className="mt-1.5 flex gap-2">{r.front && <button onClick={() => openDoc(r.front)} className="rounded-lg bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-200">Ver frente</button>}{r.back && <button onClick={() => openDoc(r.back)} className="rounded-lg bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-200">Ver dorso</button>}</div>}</div>
                  <div className="flex shrink-0 gap-2"><button onClick={() => r.resolve(true)} className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">Aprobar</button><button onClick={() => r.resolve(false)} className="rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-600 transition hover:border-rose-300 hover:text-rose-600">Rechazar</button></div>
                </div>
              ))}
            </div>
            {registry.length > 0 && (<>
              <h2 className="mb-3 mt-8 font-display text-lg font-semibold text-stone-900">Tus acciones (esta sesión)</h2>
              <div className="soft overflow-hidden rounded-2xl border border-stone-200 bg-white"><table className="w-full text-sm"><tbody>{registry.map((r) => (<tr key={r.id} className="border-b border-stone-100 last:border-0"><td className="px-4 py-2.5 font-display text-xs tabular-nums text-stone-400">{r.time}</td><td className="px-4 py-2.5 text-stone-600">{r.action}</td></tr>))}</tbody></table></div>
            </>)}
          </section>

          <section>
            <h2 className="mb-1 font-display text-xl font-semibold text-stone-900">Todo lo que pasa</h2>
            <p className="mb-4 text-sm text-stone-500">Audit log del sistema, en tiempo real.</p>
            <div className="soft max-h-[32rem] space-y-2.5 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4">
              {events.length === 0 && <p className="py-6 text-center text-sm text-stone-500">Sin eventos todavía.</p>}
              {events.map((e) => { const t = actionTone(e.action); return (
                <div key={e.id} className="flex items-start gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[t]}`} />
                  <div className="min-w-0 flex-1"><p className="text-sm text-stone-700"><span className="font-medium text-stone-900">{e.actor_label ?? "sistema"}</span> · {ACTION_LABEL[e.action] ?? e.action}</p><p className="font-display text-[11px] tabular-nums text-stone-400">{dt(e.at)} · {e.entity}</p></div>
                </div>
              ); })}
            </div>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl font-semibold text-stone-900">Usuarios <span className="text-stone-400">({users.length})</span></h2>
          <div className="soft overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full min-w-[920px] text-sm">
              <thead><tr className="border-b border-stone-100"><th className={th}>Usuario</th><th className={th}>Acceso</th><th className={th}>Validación</th><th className={th}>Roles</th><th className={th}>Procedencia</th><th className={th}>Prop.</th><th className={th}>Post.</th><th className={th}>Alta</th><th className={th}>Último acceso</th></tr></thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={9} className="px-4 py-5 text-stone-500">Sin usuarios.</td></tr>}
                {users.map((u) => { const sb = sourceBadge(u.source); return (<tr key={u.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3"><p className="font-medium text-stone-800">{u.name}</p><p className="text-xs text-stone-400">@{u.username} · {u.email ?? "—"}</p></td>
                  <td className="px-4 py-3">{u.provider === "google" ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{gIcon} Google</span> : <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-500">Email</span>}</td>
                  <td className="px-4 py-3">{u.validated ? <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Validado</span> : <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-500">Sin validar</span>}</td>
                  <td className="px-4 py-3">{u.roles.length ? <div className="flex flex-wrap gap-1">{u.roles.map((r) => <span key={r} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium capitalize text-stone-600">{r}</span>)}</div> : <span className="text-xs text-stone-400">—</span>}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sb.c}`}>{sb.l}</span></td>
                  <td className="px-4 py-3 tabular-nums text-stone-600">{u.props_count}</td>
                  <td className="px-4 py-3 tabular-nums text-stone-600">{u.apps_count}</td>
                  <td className="px-4 py-3 text-xs tabular-nums text-stone-400">{dt(u.created_at)}</td>
                  <td className="px-4 py-3 text-xs tabular-nums text-stone-400">{dt(u.last_sign_in)}</td>
                </tr>); })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 font-display text-xl font-semibold text-stone-900">Propiedades <span className="text-stone-400">({allProps.length})</span></h2>
          <div className="soft overflow-x-auto rounded-2xl border border-stone-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b border-stone-100"><th className={th}>Título</th><th className={th}>Zona</th><th className={th}>Estado</th><th className={th}>Procedencia</th><th className={th}>Precio</th></tr></thead>
              <tbody>
                {allProps.length === 0 && <tr><td colSpan={5} className="px-4 py-5 text-stone-500">Sin propiedades.</td></tr>}
                {allProps.map((p) => { const sb = sourceBadge(p.source ?? "real"); return (<tr key={p.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3"><p className="font-medium text-stone-800">{p.title}</p><p className="text-xs capitalize text-stone-400">{p.type}</p></td>
                  <td className="px-4 py-3 text-stone-600">{p.zona}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : p.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{p.status === "active" ? "Publicada" : p.status === "pending" ? "En revisión" : "Rechazada"}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${sb.c}`}>{sb.l}</span></td>
                  <td className="px-4 py-3 font-medium tabular-nums text-stone-700">{fmt(p.price)}</td>
                </tr>); })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
