"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PropRow, ValRequest, resolveProperty, resolveValidation, signInUser, signOutUser, usePendingApprovals } from "@/lib/store";

interface Event { id: string; text: string; time: string; tone: "info" | "ok" | "warn" }
type Kind = "dni" | "propiedad" | "martillero" | "alp";

const now = () => new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

const FEED_POOL: [string, Event["tone"]][] = [
  ["Nuevo inquilino registrado · @lu***", "info"], ["Carta de presentación completada", "info"],
  ["Garante aceptó invitación", "ok"], ["Visita agendada · ALP asignado", "info"],
  ["Contrato en revisión · martillero", "info"], ["Pago acreditado en custodia (PSP)", "ok"],
];

export default function Administer() {
  const [authed, setAuthed] = useState(false);
  return authed ? <Dashboard /> : <Gate onOk={() => setAuthed(true)} />;
}

function Gate({ onOk }: { onOk: () => void }) {
  const [u, setU] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr("");
    const { profile, error } = await signInUser(u, pw);
    setBusy(false);
    if (error || !profile) { setErr("Credenciales inválidas."); return; }
    if (!profile.roles.includes("admin")) { setErr("Esta cuenta no es de administración."); await signOutUser(); return; }
    onOk();
  };
  return (
    <div className="lux-mesh grid min-h-screen place-items-center p-4">
      <div className="soft-lg w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-8">
        <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-black text-white">◆</div><span className="font-display text-lg font-semibold text-stone-900">Neo Rent Go · <span className="text-amber-600">Administer</span></span></div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-stone-900">Panel de sistema</h1>
        <p className="mt-1 text-sm text-stone-500">Acceso restringido · aprobaciones y registro.</p>
        <div className="mt-6 space-y-3">
          <input value={u} onChange={(e) => { setU(e.target.value); setErr(""); }} placeholder="usuario" className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-amber-400 focus:bg-white" />
          <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="contraseña" className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-amber-400 focus:bg-white" />
          {err && <p className="text-xs text-rose-500">{err}</p>}
        </div>
        <button onClick={submit} disabled={busy} className="mt-6 w-full rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60">{busy ? "…" : "Entrar al panel"}</button>
        <Link href="/" className="mt-4 block text-center text-sm text-stone-500 hover:text-stone-800">← Volver al sitio</Link>
      </div>
    </div>
  );
}

function Dashboard() {
  const { vals, props } = usePendingApprovals(true);
  const [clock, setClock] = useState(now());
  const [feed, setFeed] = useState<Event[]>([]);
  const [registry, setRegistry] = useState<{ id: string; action: string; time: string }[]>([]);
  const [staticPending, setStaticPending] = useState([
    { id: "m1", kind: "martillero" as Kind, title: "Est. Gómez · Matrícula 1123", subtitle: "Verificación manual de matrícula" },
    { id: "al1", kind: "alp" as Kind, title: "Carlos M. · ALP", subtitle: "Invitación a team de M. Ríos" },
  ]);
  const idRef = useRef(0);

  useEffect(() => {
    const c = setInterval(() => setClock(now()), 1000);
    const f = setInterval(() => { const [text, tone] = FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)]; setFeed((p) => [{ id: `e${idRef.current++}`, text, time: now(), tone }, ...p].slice(0, 14)); }, 4000);
    return () => { clearInterval(c); clearInterval(f); };
  }, []);

  const log = (action: string, ok: boolean, title: string) => {
    setRegistry((p) => [{ id: `r${idRef.current++}`, action, time: now() }, ...p].slice(0, 20));
    setFeed((p) => [{ id: `e${idRef.current++}`, text: `${ok ? "✔ Aprobado" : "✘ Rechazado"}: ${title}`, time: now(), tone: (ok ? "ok" : "warn") as Event["tone"] }, ...p].slice(0, 14));
  };

  interface Row { key: string; kind: Kind; title: string; subtitle: string; resolve: (ok: boolean) => void }
  const rows: Row[] = [
    ...vals.map((r: ValRequest): Row => ({ key: r.id, kind: "dni", title: `${r.name} · DNI ${r.dni ?? ""}`, subtitle: `CUIL ${r.cuil ?? "—"} · valida identidad`, resolve: (ok) => { resolveValidation(r, ok); log(`${ok ? "Aprobó" : "Rechazó"} DNI de ${r.name}`, ok, r.name); } })),
    ...props.map((p: PropRow): Row => ({ key: p.id, kind: "propiedad", title: p.title, subtitle: `${p.zona ?? ""} · ${fmt(p.price)}`, resolve: (ok) => { resolveProperty(p.id, ok); log(`${ok ? "Habilitó" : "Rechazó"} propiedad · ${p.title}`, ok, p.title); } })),
    ...staticPending.map((s): Row => ({ key: s.id, kind: s.kind, title: s.title, subtitle: s.subtitle, resolve: (ok) => { setStaticPending((prev) => prev.filter((x) => x.id !== s.id)); log(`${ok ? "Aprobó" : "Rechazó"} ${s.kind} · ${s.title}`, ok, s.title); } })),
  ];

  const stats: [string, string][] = [["Usuarios", "1.284"], ["Propiedades activas", "312"], ["En aprobación", String(rows.length)], ["Operaciones", "47"], ["Martilleros", "9"]];
  const toneClass = { info: "text-sky-600", ok: "text-emerald-600", warn: "text-amber-600" };
  const kindClass: Record<Kind, string> = { dni: "bg-violet-100 text-violet-700", propiedad: "bg-sky-100 text-sky-700", martillero: "bg-emerald-100 text-emerald-700", alp: "bg-amber-100 text-amber-700" };

  return (
    <div className="relative min-h-screen">
      <div className="lux-mesh pointer-events-none fixed inset-0 -z-10" />
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f7f6f2]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-black text-white">◆</div><span className="font-display text-lg font-semibold text-stone-900">Administer</span><span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> en vivo</span></div>
          <div className="flex items-center gap-4"><span className="font-display text-sm tabular-nums text-stone-500">{clock}</span><Link href="/" onClick={() => signOutUser()} className="text-sm text-stone-500 hover:text-stone-900">Salir</Link></div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">{stats.map(([l, v]) => (<div key={l} className="soft rounded-2xl border border-stone-200 bg-white p-4"><div className="font-display text-2xl font-semibold text-stone-900">{v}</div><div className="mt-1 text-xs text-stone-500">{l}</div></div>))}</div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="mb-1 font-display text-xl font-semibold text-stone-900">Aprobaciones pendientes</h2>
            <p className="mb-4 text-sm text-stone-500">Solicitudes reales de usuarios (DNI y propiedades) desde Supabase, en vivo.</p>
            <div className="space-y-3">
              {rows.length === 0 && <p className="soft rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">Todo al día ✦</p>}
              {rows.map((r) => (
                <div key={r.key} className="animate-fadeUp soft flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4">
                  <div><span className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${kindClass[r.kind]}`}>{r.kind}</span><p className="font-medium text-stone-900">{r.title}</p><p className="text-xs text-stone-500">{r.subtitle}</p></div>
                  <div className="flex shrink-0 gap-2"><button onClick={() => r.resolve(true)} className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">Aprobar</button><button onClick={() => r.resolve(false)} className="rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-semibold text-stone-600 transition hover:border-rose-300 hover:text-rose-600">Rechazar</button></div>
                </div>
              ))}
            </div>

            <h2 className="mb-4 mt-8 font-display text-xl font-semibold text-stone-900">Registro (auditable)</h2>
            <div className="soft overflow-hidden rounded-2xl border border-stone-200 bg-white">
              {registry.length === 0 ? (<p className="p-5 text-sm text-stone-500">Sin acciones todavía. Aprobá o rechazá algo para verlo acá.</p>) : (
                <table className="w-full text-sm"><tbody>{registry.map((r) => (<tr key={r.id} className="border-b border-stone-100 last:border-0"><td className="px-4 py-2.5 font-display text-xs tabular-nums text-stone-400">{r.time}</td><td className="px-4 py-2.5 font-medium text-emerald-700">@administer</td><td className="px-4 py-2.5 text-stone-600">{r.action}</td></tr>))}</tbody></table>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-stone-900">Seguimiento en vivo</h2>
            <div className="soft space-y-2.5 rounded-2xl border border-stone-200 bg-white p-4">
              {feed.length === 0 && <p className="py-6 text-center text-sm text-stone-500">Escuchando eventos…</p>}
              {feed.map((e) => (<div key={e.id} className="animate-fadeUp flex items-start gap-3 rounded-xl bg-stone-50 px-3 py-2.5"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${e.tone === "ok" ? "bg-emerald-500" : e.tone === "warn" ? "bg-amber-500" : "bg-sky-500"}`} /><div className="min-w-0 flex-1"><p className={`text-sm ${toneClass[e.tone]}`}>{e.text}</p><p className="font-display text-[11px] tabular-nums text-stone-400">{e.time}</p></div></div>))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
