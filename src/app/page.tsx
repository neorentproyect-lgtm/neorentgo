"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ACCENT, ROLES, RoleId } from "@/lib/app-data";
import {
  Application, Profile, PropRow, resolveApplication, signInWithGoogle, signOutUser,
  submitApplication, submitProperty, submitValidation, updateRoles, uploadKyc,
  useActiveProperties, useCandidates, useMyApplications, useMyProperties, useMyValidation, useProfile,
} from "@/lib/store";

type Filter = "todas" | "vivienda" | "comercial" | "industrial";
type View = { type: "marketplace" } | { type: "global" } | { type: "role"; role: RoleId };
interface Notif { text: string; dot: string }

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

const I = {
  bed: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 17v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5M2 17v3M22 17v3M2 13h20M6 10V8a2 2 0 0 1 2-2h3v4" strokeLinecap="round"/></svg>),
  bath: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-2ZM6 19l-1 2M18 19l1 2" strokeLinecap="round"/></svg>),
  ruler: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8l5-5 13 13-5 5L3 8Zm4 0 1.5 1.5M10 5l1.5 1.5M13 8l1.5 1.5M16 11l1.5 1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  car: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 11l1.5-4A2 2 0 0 1 8.4 6h7.2a2 2 0 0 1 1.9 1l1.5 4M4 11h16v5H4v-5Zm2 5v2M18 16v2M7 14h1M16 14h1" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  pin: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" strokeLinejoin="round"/><circle cx="12" cy="10" r="2.4"/></svg>),
  lock: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>),
  check: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  shield: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3Z" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  search: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2" strokeLinecap="round"/></svg>),
  bell: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  chevron: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  plus: (p: string) => (<svg className={p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>),
  google: (p: string) => (<svg className={p} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>),
};

const ROLE_IDS = Object.keys(ROLES) as RoleId[];
const isRole = (r: string): r is RoleId => (ROLE_IDS as string[]).includes(r);
const PROP_CHIP: Record<string, string> = { pending: "bg-amber-100 text-amber-700", active: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700" };
const PROP_LABEL: Record<string, string> = { pending: "En revisión", active: "Publicada", rejected: "Rechazada" };
const APP_CHIP: Record<string, string> = { pending: "bg-amber-100 text-amber-700", accepted: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700" };

const login = () => signInWithGoogle();

export default function Home() {
  const { profile } = useProfile();
  const rawVal = useMyValidation(profile?.id);
  const valStatus = profile?.validated ? "validated" : rawVal;
  const validated = valStatus === "validated";
  const roles = (profile?.roles ?? []).filter(isRole);

  const candidates = useCandidates(roles.includes("propietario") ? profile?.id : undefined);
  const myApps = useMyApplications(roles.includes("inquilino") ? profile?.id : undefined);

  const notifs = useMemo<Notif[]>(() => {
    const out: Notif[] = [];
    if (valStatus === "pending") out.push({ text: "Tu validación de cuenta global está en revisión.", dot: "bg-amber-500" });
    if (valStatus === "rejected") out.push({ text: "Tu validación fue rechazada — reintentá.", dot: "bg-rose-500" });
    if (candidates.length) out.push({ text: `Tenés ${candidates.length} candidato(s) en tus propiedades.`, dot: "bg-sky-500" });
    myApps.filter((a) => a.status === "accepted").forEach((a) => out.push({ text: `Te aceptaron en "${a.property?.title ?? "una propiedad"}".`, dot: "bg-emerald-500" }));
    return out;
  }, [valStatus, candidates.length, myApps]);

  const [view, setView] = useState<View>({ type: "marketplace" });
  const [showDni, setShowDni] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  const tier: "anon" | "account" | "validated" = !profile ? "anon" : validated ? "validated" : "account";
  const openValidate = () => setShowDni(true);
  const activateRole = async (r: RoleId) => { if (!validated) { openValidate(); return; } await updateRoles([...roles, r]); setView({ type: "role", role: r }); };
  const startPublish = () => { if (!profile) { login(); return; } if (!validated) { openValidate(); return; } if (!roles.includes("propietario")) updateRoles([...roles, "propietario"]); setShowPublish(true); };
  const logout = async () => { await signOutUser(); setView({ type: "marketplace" }); };

  return (
    <div className="relative min-h-screen">
      <div className="lux-mesh pointer-events-none fixed inset-0 -z-10" />
      <TopBar
        profile={profile} roles={roles} view={view} valStatus={valStatus} validated={validated} notifs={notifs}
        onLogout={logout} goHome={() => setView({ type: "marketplace" })} goGlobal={() => setView({ type: "global" })}
        goRole={(r) => setView({ type: "role", role: r })} activateRole={activateRole} onValidateOpen={openValidate}
      />

      {view.type === "marketplace" && <Marketplace tier={tier} profile={profile} validated={validated} valStatus={valStatus} onValidate={openValidate} />}
      {view.type === "global" && profile && <GlobalDashboard profile={profile} roles={roles} notifs={notifs} validated={validated} valStatus={valStatus} goRole={(r) => setView({ type: "role", role: r })} activateRole={activateRole} onValidate={openValidate} />}
      {view.type === "role" && profile && <RoleDashboard role={view.role} profile={profile} onPublish={startPublish} />}
      {view.type === "marketplace" && <Footer />}

      {showDni && <DniModal onClose={() => setShowDni(false)} />}
      {showPublish && <PublishModal onClose={() => setShowPublish(false)} onDone={() => setView({ type: "role", role: "propietario" })} />}
    </div>
  );
}

/* ------------------------------ banner ------------------------------ */
function ValidateBanner({ onValidate }: { onValidate: () => void }) {
  return (
    <div className="soft flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">{I.shield("h-6 w-6")}</span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold text-stone-900">Validá tu cuenta global</p>
        <p className="text-sm text-stone-600">Necesitás tu <b>DNI (frente y dorso)</b> para verificar tu identidad. Es una sola vez y <b>habilita activar roles, contactar y operar</b>.</p>
      </div>
      <button onClick={onValidate} className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500">Validar cuenta global</button>
    </div>
  );
}

/* ------------------------------ TOP BAR ------------------------------ */
function TopBar(props: {
  profile: Profile | null; roles: RoleId[]; view: View; valStatus: string; validated: boolean; notifs: Notif[];
  onLogout: () => void; goHome: () => void; goGlobal: () => void; goRole: (r: RoleId) => void; activateRole: (r: RoleId) => void; onValidateOpen: () => void;
}) {
  const { profile, roles, view, valStatus, validated, notifs, onLogout, goHome, goGlobal, goRole, activateRole, onValidateOpen } = props;
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const current = view.type === "role" ? view.role : null;
  const inactive = ROLE_IDS.filter((r) => !roles.includes(r));

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#f7f6f2]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <button onClick={goHome} className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 font-display font-bold text-white soft">N</div>
          <span className="font-display text-lg font-semibold tracking-tight text-stone-900">Neo Rent <span className="text-emerald-600">Go</span></span>
          {current && <span className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACCENT[current].soft} ${ACCENT[current].text}`}>{ROLES[current].emoji} {ROLES[current].label}</span>}
        </button>

        {!profile ? (
          <button onClick={login} className="flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">{I.google("h-4 w-4")} Ingresar</button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setBell(!bell); setMenu(false); }} className="relative grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:text-stone-900">
                {I.bell("h-5 w-5")}{notifs.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />}
              </button>
              {bell && (<>
                <div className="fixed inset-0 z-10" onClick={() => setBell(false)} />
                <div className="animate-fadeUp absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-stone-200 bg-white soft-lg">
                  <div className="border-b border-stone-100 px-4 py-3 font-display text-sm font-semibold text-stone-900">Notificaciones</div>
                  <div className="max-h-80 overflow-auto">
                    {notifs.length === 0 && <p className="px-4 py-6 text-center text-sm text-stone-400">Sin novedades por ahora</p>}
                    {notifs.map((n, i) => (<div key={i} className="flex gap-3 border-b border-stone-50 px-4 py-3 last:border-0"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.dot}`} /><p className="text-sm leading-snug text-stone-700">{n.text}</p></div>))}
                  </div>
                </div>
              </>)}
            </div>

            <div className="relative">
              <button onClick={() => { setMenu(!menu); setBell(false); }} className="flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1.5 pl-1.5 pr-3 transition hover:border-stone-300">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-xs font-bold text-white">{profile.username.slice(0, 1).toUpperCase()}</span>
                <span className="text-sm font-medium text-stone-700">@{profile.username}</span>
                {validated && <span className="text-emerald-600">{I.check("h-4 w-4")}</span>}
                {I.chevron(`h-4 w-4 text-stone-400 transition ${menu ? "rotate-180" : ""}`)}
              </button>
              {menu && (<>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="animate-fadeUp absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-white soft-lg">
                  <div className="flex items-center gap-3 border-b border-stone-100 p-4">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 font-display font-bold text-white">{profile.username.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0"><p className="truncate font-semibold text-stone-900">{profile.name}</p><p className="text-xs text-stone-500">{validated ? <span className="text-emerald-600">cuenta validada ✓</span> : valStatus === "pending" ? <span className="text-amber-600">validación en revisión</span> : valStatus === "rejected" ? <span className="text-rose-500">validación rechazada</span> : <span className="text-stone-400">sin validar</span>}</p></div>
                  </div>

                  <button onClick={() => { goGlobal(); setMenu(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-stone-700 transition hover:bg-stone-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-stone-100 text-stone-600">🏠</span> Home global</button>

                  <div className="border-t border-stone-100 px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-400">Tus roles</div>
                  {roles.length === 0 && <p className="px-4 pb-2 text-sm text-stone-400">Todavía no activaste ninguno.</p>}
                  {roles.map((r) => (<button key={r} onClick={() => { goRole(r); setMenu(false); }} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-stone-50 ${view.type === "role" && view.role === r ? "bg-stone-50" : ""}`}><span className={`grid h-8 w-8 place-items-center rounded-lg text-base ${ACCENT[r].soft}`}>{ROLES[r].emoji}</span><span className="flex-1"><span className="block text-sm font-medium text-stone-800">{ROLES[r].label}</span><span className="block text-xs text-stone-400">{ROLES[r].desc}</span></span></button>))}

                  {!validated ? (
                    <div className="border-t border-stone-100 p-2">
                      <button onClick={() => { onValidateOpen(); setMenu(false); }} className="w-full rounded-lg bg-emerald-50 px-3 py-2.5 text-left text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">🛡️ Validar cuenta global<span className="block text-xs font-normal text-emerald-600/80">Desbloqueá activar roles y operar</span></button>
                    </div>
                  ) : (
                    <>
                      {inactive.length > 0 && <div className="border-t border-stone-100 px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-stone-400">Activar rol</div>}
                      {inactive.map((r) => (<button key={r} onClick={() => { activateRole(r); setMenu(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-stone-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-stone-100 text-base opacity-70">{ROLES[r].emoji}</span><span className="flex-1"><span className="block text-sm font-medium text-stone-600">{ROLES[r].label}</span>{ROLES[r].requires && <span className="block text-xs text-stone-400">Requiere: {ROLES[r].requires}</span>}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Activar</span></button>))}
                    </>
                  )}

                  <div className="border-t border-stone-100 p-2"><button onClick={() => { onLogout(); setMenu(false); }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-stone-500 transition hover:bg-stone-50">Cerrar sesión</button></div>
                </div>
              </>)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ------------------------------ MARKETPLACE ------------------------------ */
const TYPES: { id: Filter; label: string }[] = [{ id: "todas", label: "Todas" }, { id: "vivienda", label: "Vivienda" }, { id: "comercial", label: "Comercial" }, { id: "industrial", label: "Industrial" }];

function Marketplace({ tier, profile, validated, valStatus, onValidate }: { tier: "anon" | "account" | "validated"; profile: Profile | null; validated: boolean; valStatus: string; onValidate: () => void }) {
  const all = useActiveProperties();
  const [filter, setFilter] = useState<Filter>("todas");
  const [q, setQ] = useState("");
  const list = useMemo(() => all.filter((p) => (filter === "todas" || p.type === filter) && (q.trim() === "" || `${p.zona ?? ""} ${p.address ?? ""} ${p.title}`.toLowerCase().includes(q.trim().toLowerCase()))), [all, filter, q]);
  const featured = all[0];

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:py-20 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/15 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700">Alquileres curados · Patagonia</span>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.04] tracking-tight text-stone-900 sm:text-[4.1rem]">El alquiler,<br /><span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 bg-clip-text text-transparent">elevado a experiencia.</span></h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-stone-500">Propietario, inquilino y martillero en un solo circuito. Cada uno gestiona lo suyo; nosotros lo unimos: claro, seguro y más barato.</p>
          {!profile ? (
            <div className="soft mt-8 max-w-sm rounded-2xl border border-stone-200 bg-white p-5">
              <p className="text-sm font-medium text-stone-700">Entrá para ver precios, contactar y operar.</p>
              <button onClick={login} className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-xl border border-stone-200 bg-white py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50">{I.google("h-4 w-4")} Iniciar sesión con Google</button>
            </div>
          ) : (
            <div className="mt-8 flex gap-10">{[["−30%", "comisión más baja"], [String(all.length), "propiedades activas"]].map(([n, l]) => (<div key={l}><div className="font-display text-3xl font-semibold text-stone-900">{n}</div><div className="mt-1 text-xs text-stone-500">{l}</div></div>))}</div>
          )}
        </div>
        {featured && (
          <div className="animate-floaty">
            <div className="soft-lg overflow-hidden rounded-[2rem] border border-stone-200 bg-white"><div className="relative h-[25rem]">
              {featured.image ? <img src={featured.image} alt={featured.title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-emerald-200 to-teal-300" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5"><p className="text-xs text-white/80">{featured.zona} · Neuquén</p><h3 className="font-display text-2xl font-semibold text-white">{featured.title}</h3><div className="mt-2"><span className="font-display text-xl font-semibold text-white">{fmt(featured.price)} <span className="text-sm font-normal text-white/80">/mes</span></span></div></div>
            </div></div>
          </div>
        )}
      </section>

      <div className="mx-auto max-w-6xl px-5">
        {profile && !validated ? (
          <ValidateBanner onValidate={onValidate} />
        ) : (
          <div className="soft flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm">
            <span className="font-semibold text-stone-700">Tu acceso:</span>
            <span className="font-semibold text-emerald-700">{tier === "anon" ? "Anónimo" : "Validado"}</span>
            <span className="text-stone-400">{tier === "anon" ? "— ingresá con Google para ver precios y operar." : "— acceso completo: contactás y operás."}</span>
            {tier === "anon" && <button onClick={login} className="ml-auto flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white">{I.google("h-3.5 w-3.5")} Ingresar</button>}
          </div>
        )}
      </div>

      <main className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold text-emerald-600">Curaduría</p><h2 className="font-display text-3xl font-semibold text-stone-900">Propiedades en Neuquén</h2></div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5"><span className="text-stone-400">{I.search("h-4 w-4")}</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por zona o calle…" className="w-44 bg-transparent text-sm text-stone-800 outline-none placeholder:text-stone-400" /></div>
            {TYPES.map((t) => (<button key={t.id} onClick={() => setFilter(t.id)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${filter === t.id ? "bg-stone-900 text-white" : "border border-stone-200 bg-white text-stone-500 hover:text-stone-900"}`}>{t.label}</button>))}
          </div>
        </div>
        {list.length === 0 ? (
          <div className="soft rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-500">{all.length === 0 ? "Cargando propiedades…" : "No hay propiedades para ese filtro."}</div>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <PropertyCard key={p.id} p={p} tier={tier} />)}</div>
        )}
      </main>
    </>
  );
}

function PropertyCard({ p, tier }: { p: PropRow; tier: "anon" | "account" | "validated" }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [msg, setMsg] = useState("");
  const showPrice = tier !== "anon";
  const canContact = tier === "validated";
  const contact = async () => {
    if (!canContact) { if (tier === "anon") login(); return; }
    setState("busy");
    const r = await submitApplication(p.id);
    if (r.ok) setState("done"); else { setState("err"); setMsg(r.error ?? "Error"); }
  };
  return (
    <article className="soft group overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white transition duration-300 hover:-translate-y-1.5">
      <div className="relative h-56 overflow-hidden">
        {p.image ? <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="h-full w-full bg-gradient-to-br from-emerald-200 to-teal-300" />}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold capitalize text-stone-700 backdrop-blur">{p.type}</span>
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold leading-snug text-stone-900">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">{I.pin("h-3.5 w-3.5 shrink-0")}<span>{p.zona}{showPrice && p.address ? ` · ${p.address}` : ""}</span></p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-400">{p.type === "vivienda" && <span className="flex items-center gap-1.5">{I.bed("h-4 w-4")} {p.beds || "Mono"}</span>}<span className="flex items-center gap-1.5">{I.bath("h-4 w-4")} {p.baths}</span>{p.m2 ? <span className="flex items-center gap-1.5">{I.ruler("h-4 w-4")} {p.m2} m²</span> : null}{p.cochera && <span className="flex items-center gap-1.5">{I.car("h-4 w-4")} Cochera</span>}</div>
        <div className="mt-5 flex items-end justify-between border-t border-stone-100 pt-4">
          {showPrice ? (<div><div className="font-display text-xl font-semibold text-emerald-700">{fmt(p.price)}</div><div className="text-xs text-stone-400">por mes</div></div>) : (<div className="flex items-center gap-2 text-sm font-medium text-stone-400">{I.lock("h-4 w-4")} Ingresá para ver precio</div>)}
          {state === "done" ? (<span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">Contactado ✓</span>)
          : (<button onClick={contact} disabled={state === "busy"} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${canContact ? "bg-emerald-600 text-white hover:bg-emerald-500" : "border border-stone-200 text-stone-500 hover:text-stone-800"}`}>{state === "busy" ? "…" : canContact ? "Contactar" : tier === "anon" ? "Ingresar" : "Validá tu cuenta"}</button>)}
        </div>
        {state === "err" && <p className="mt-2 text-right text-xs text-rose-500">{msg}</p>}
      </div>
    </article>
  );
}

/* ------------------------------ ROLE TABS ------------------------------ */
function RoleTabs({ roles, validated, active, onGlobal, onRole, onValidate, onActivate }: { roles: RoleId[]; validated: boolean; active: "global" | RoleId; onGlobal: () => void; onRole: (r: RoleId) => void; onValidate: () => void; onActivate: (r: RoleId) => void }) {
  const [open, setOpen] = useState(false);
  const inactive = ROLE_IDS.filter((r) => !roles.includes(r));
  const tab = (on: boolean) => `rounded-full px-4 py-1.5 text-sm font-semibold transition ${on ? "bg-stone-900 text-white" : "border border-stone-200 bg-white text-stone-600 hover:text-stone-900"}`;
  return (
    <div className="relative mb-6 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4">
      <button onClick={onGlobal} className={tab(active === "global")}>🏠 Global</button>
      {roles.map((r) => <button key={r} onClick={() => onRole(r)} className={tab(active === r)}>{ROLES[r].emoji} {ROLES[r].label}</button>)}
      {inactive.length > 0 && (
        <button onClick={() => { if (!validated) { onValidate(); return; } setOpen(!open); }} className="grid h-8 w-8 place-items-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:text-stone-900">{I.plus("h-4 w-4")}</button>
      )}
      {open && validated && (<>
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
        <div className="animate-fadeUp absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-2xl border border-stone-200 bg-white soft-lg">
          <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-stone-400">Activar otro rol</div>
          {inactive.map((r) => (<button key={r} onClick={() => { onActivate(r); setOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-stone-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-stone-100 text-base">{ROLES[r].emoji}</span><span className="flex-1"><span className="block text-sm font-medium text-stone-700">{ROLES[r].label}</span>{ROLES[r].requires && <span className="block text-xs text-stone-400">Requiere: {ROLES[r].requires}</span>}</span></button>))}
        </div>
      </>)}
    </div>
  );
}

/* ------------------------------ GLOBAL HOME ------------------------------ */
function GlobalDashboard({ profile, roles, notifs, validated, valStatus, goRole, activateRole, onValidate }: { profile: Profile; roles: RoleId[]; notifs: Notif[]; validated: boolean; valStatus: string; goRole: (r: RoleId) => void; activateRole: (r: RoleId) => void; onValidate: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <RoleTabs roles={roles} validated={validated} active="global" onGlobal={() => {}} onRole={goRole} onValidate={onValidate} onActivate={activateRole} />

      <h1 className="font-display text-4xl font-semibold text-stone-900">Hola, {profile.name.split(" ")[0]} 👋</h1>
      <p className="mt-2 text-stone-500">Tu home: novedades, resúmenes y tus roles.</p>

      {!validated && <div className="mt-6"><ValidateBanner onValidate={onValidate} /></div>}
      {validated && <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">{I.check("h-4 w-4")} Cuenta global validada — tus funciones están habilitadas.</div>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold text-stone-900">Tus roles</h3>
          {roles.length === 0 ? (
            <div className="soft rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">{validated ? "Activá un rol desde el “+” de arriba o tu menú para empezar a operar." : "Validá tu cuenta global para activar roles."}</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">{roles.map((r) => (<button key={r} onClick={() => goRole(r)} className="soft group rounded-3xl border border-stone-200 bg-white p-5 text-left transition hover:-translate-y-1"><div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl text-xl ${ACCENT[r].soft}`}>{ROLES[r].emoji}</span><div><p className="font-display text-lg font-semibold text-stone-900">{ROLES[r].label}</p><p className="text-xs text-stone-400">{ROLES[r].desc}</p></div></div><span className={`mt-4 inline-block text-xs font-semibold ${ACCENT[r].text}`}>Entrar al panel →</span></button>))}</div>
          )}
        </div>
        <div className="soft rounded-3xl border border-stone-200 bg-white p-5">
          <h3 className="font-display text-lg font-semibold text-stone-900">Novedades</h3>
          <div className="mt-3 space-y-3">{notifs.length === 0 ? <p className="text-sm text-stone-400">Sin novedades por ahora.</p> : notifs.map((n, i) => (<div key={i} className="flex gap-3"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.dot}`} /><p className="text-sm leading-snug text-stone-700">{n.text}</p></div>))}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ ROLE DASHBOARD ------------------------------ */
function RoleDashboard({ role, profile, onPublish }: { role: RoleId; profile: Profile; onPublish: () => void }) {
  const a = ACCENT[role];
  const isProp = role === "propietario";
  const isInq = role === "inquilino";
  const mine = useMyProperties(isProp ? profile.id : undefined);
  const candidates = useCandidates(isProp ? profile.id : undefined);
  const apps = useMyApplications(isInq ? profile.id : undefined);

  const summary: [string, string][] = isProp
    ? [[String(mine.length), "propiedades"], [String(mine.filter((p) => p.status === "pending").length), "en revisión"], [String(candidates.length), "candidatos"]]
    : isInq ? [[String(apps.length), "postulaciones"], [String(apps.filter((x) => x.status === "accepted").length), "aceptadas"], [profile.validated ? "✓" : "—", "cuenta"]] : [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><span className={`grid h-14 w-14 place-items-center rounded-2xl text-2xl ${a.soft}`}>{ROLES[role].emoji}</span><div><p className={`text-sm font-semibold ${a.text}`}>Panel de {ROLES[role].label.toLowerCase()}</p><h1 className="font-display text-3xl font-semibold text-stone-900">{ROLES[role].label}</h1></div></div>
        {isProp && <button onClick={onPublish} className="flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500">{I.plus("h-4 w-4")} Publicar propiedad</button>}
      </div>

      {(isProp || isInq) && <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3">{summary.map(([n, l]) => (<div key={l} className="soft rounded-2xl border border-stone-200 bg-white p-4"><div className={`font-display text-2xl font-semibold ${a.text}`}>{n}</div><div className="mt-1 text-xs text-stone-500">{l}</div></div>))}</div>}

      {isProp && (
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section className="soft rounded-3xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 font-display text-lg font-semibold text-stone-900">Mis propiedades</h3>
            {mine.length === 0 ? (<div className="rounded-2xl bg-stone-50 p-6 text-center text-sm text-stone-500">Todavía no publicaste ninguna. <button onClick={onPublish} className="font-semibold text-emerald-700">Publicá la primera →</button></div>)
            : (<div className="space-y-2.5">{mine.map((p) => (<div key={p.id} className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 px-4 py-3"><div><p className="font-medium text-stone-800">{p.title}</p><p className="text-xs text-stone-400">{p.zona} · {fmt(p.price)}/mes</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PROP_CHIP[p.status]}`}>{PROP_LABEL[p.status]}</span></div>))}</div>)}
          </section>
          <section className="soft rounded-3xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 font-display text-lg font-semibold text-stone-900">Candidatos</h3>
            {candidates.length === 0 ? (<div className="rounded-2xl bg-stone-50 p-6 text-center text-sm text-stone-500">Sin candidatos todavía. Aparecen cuando un inquilino se contacta.</div>)
            : (<div className="space-y-2.5">{candidates.map((c) => (<div key={c.id} className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3"><div className="flex items-center justify-between"><p className="text-sm font-medium text-stone-800">Interesado en “{c.property?.title}”</p><span className="text-xs text-stone-400">{new Date(c.created_at).toLocaleDateString("es-AR")}</span></div>{c.status === "pending" ? (<div className="mt-2 flex gap-2"><button onClick={() => resolveApplication(c.id, "accepted")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">Aceptar</button><button onClick={() => resolveApplication(c.id, "rejected")} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:border-rose-300 hover:text-rose-600">Rechazar</button></div>) : (<span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${APP_CHIP[c.status]}`}>{c.status === "accepted" ? "Aceptado" : "Rechazado"}</span>)}</div>))}</div>)}
          </section>
        </div>
      )}

      {isInq && (
        <section className="soft mt-7 rounded-3xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 font-display text-lg font-semibold text-stone-900">Mis postulaciones</h3>
          {apps.length === 0 ? (<div className="rounded-2xl bg-stone-50 p-6 text-center text-sm text-stone-500">Todavía no te contactaste con ninguna propiedad. Andá al marketplace y tocá “Contactar”.</div>)
          : (<div className="space-y-2.5">{apps.map((x) => (<div key={x.id} className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50 px-4 py-3"><div><p className="font-medium text-stone-800">{x.property?.title}</p><p className="text-xs text-stone-400">{x.property?.zona} · {fmt(x.property?.price ?? 0)}/mes</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${APP_CHIP[x.status]}`}>{x.status === "pending" ? "Enviada" : x.status === "accepted" ? "Aceptada" : "Rechazada"}</span></div>))}</div>)}
        </section>
      )}

      {!isProp && !isInq && (
        <div className="soft mt-7 rounded-3xl border border-stone-200 bg-white p-10 text-center"><p className="text-stone-500">Este panel se activa cuando tengas actividad como <b>{ROLES[role].label.toLowerCase()}</b>. Todavía no hay datos reales para mostrar — y no inventamos ninguno.</p></div>
      )}
    </div>
  );
}

/* ------------------------------ MODALS ------------------------------ */
function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (<div><label className="mb-1 block text-xs font-medium text-stone-500">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-400 focus:bg-white" /></div>);
}
function ModalShell({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: React.ReactNode; onClose: () => void }) {
  return (<div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-stone-900/30 p-4 backdrop-blur-sm" onClick={onClose}><div className="soft-lg my-8 w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-7" onClick={(e) => e.stopPropagation()}><h2 className="font-display text-2xl font-semibold text-stone-900">{title}</h2><p className="mt-1 text-sm text-stone-500">{subtitle}</p>{children}</div></div>);
}

function FileDrop({ label, file, onFile }: { label: string; file: File | null; onFile: (f: File | null) => void }) {
  return (
    <label className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-3 py-5 text-center text-sm font-medium transition ${file ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-stone-300 text-stone-500 hover:border-stone-400"}`}>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      <span>{file ? `✓ ${file.name.length > 16 ? file.name.slice(0, 16) + "…" : file.name}` : `📷 ${label}`}</span>
    </label>
  );
}

function DniModal({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ nombre: "", segundo: "", apellido: "", nacimiento: "", origen: "", residencia: "", dni: "", cuil: "" });
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof f) => (v: string) => { setF({ ...f, [k]: v }); setErr(""); };
  const submit = async () => {
    if (!f.nombre || !f.apellido || !f.dni || !f.cuil) { setErr("Completá nombre, apellido, DNI y CUIL."); return; }
    if (!front || !back) { setErr("Subí la foto del frente y del dorso del DNI."); return; }
    setBusy(true); setErr("");
    const [pf, pb] = await Promise.all([uploadKyc(front, "front"), uploadKyc(back, "back")]);
    if (!pf || !pb) { setBusy(false); setErr("No se pudieron subir las imágenes. Reintentá."); return; }
    await submitValidation({ name: `${f.nombre} ${f.apellido}`.trim(), dni: f.dni, cuil: f.cuil, nacimiento: f.nacimiento, origen: f.origen, residencia: f.residencia, dni_front: pf, dni_back: pb });
    onClose();
  };
  return (
    <ModalShell title="Validar cuenta global" subtitle="Subí las fotos de tu DNI. Se guardan cifradas y las revisa el sistema para habilitar tus funciones." onClose={onClose}>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field label="Nombre" value={f.nombre} onChange={up("nombre")} placeholder="Maxi" />
        <Field label="Segundo nombre (opc.)" value={f.segundo} onChange={up("segundo")} />
        <Field label="Apellido" value={f.apellido} onChange={up("apellido")} placeholder="Prueba" />
        <Field label="Fecha de nacimiento" value={f.nacimiento} onChange={up("nacimiento")} type="date" />
        <Field label="Lugar de origen" value={f.origen} onChange={up("origen")} placeholder="Neuquén" />
        <Field label="Lugar de residencia" value={f.residencia} onChange={up("residencia")} placeholder="Neuquén" />
        <Field label="N° de DNI" value={f.dni} onChange={up("dni")} placeholder="40.123.456" />
        <Field label="CUIL" value={f.cuil} onChange={up("cuil")} placeholder="20-40123456-3" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <FileDrop label="Foto del frente" file={front} onFile={(x) => { setFront(x); setErr(""); }} />
        <FileDrop label="Foto del dorso" file={back} onFile={(x) => { setBack(x); setErr(""); }} />
      </div>
      {err && <p className="mt-3 text-xs text-rose-500">{err}</p>}
      <div className="mt-6 flex gap-3"><button onClick={onClose} className="flex-1 rounded-xl border border-stone-200 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50">Cancelar</button><button onClick={submit} disabled={busy} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">{busy ? "Subiendo…" : "Enviar a validación"}</button></div>
    </ModalShell>
  );
}

function PublishModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ title: "", type: "vivienda", zona: "", address: "", price: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof f) => (v: string) => { setF({ ...f, [k]: v }); setErr(""); };
  const submit = async () => {
    if (!f.title || !f.zona || !f.address || !f.price) { setErr("Completá todos los campos."); return; }
    setBusy(true);
    await submitProperty({ title: f.title, type: f.type, zona: f.zona, address: f.address, price: Number(f.price) || 0 });
    onDone(); onClose();
  };
  return (
    <ModalShell title="Publicar propiedad" subtitle="Se envía a un martillero de la jurisdicción para tomar el caso y habilitarla." onClose={onClose}>
      <div className="mt-5 space-y-3">
        <Field label="Título" value={f.title} onChange={up("title")} placeholder="Departamento 2 amb. a estrenar" />
        <div><label className="mb-1 block text-xs font-medium text-stone-500">Tipo</label><select value={f.type} onChange={(e) => up("type")(e.target.value)} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-400 focus:bg-white"><option value="vivienda">Vivienda</option><option value="comercial">Comercial</option><option value="industrial">Industrial</option></select></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Zona" value={f.zona} onChange={up("zona")} placeholder="Área Centro Este" /><Field label="Dirección" value={f.address} onChange={up("address")} placeholder="Alderete 1240" /></div>
        <Field label="Precio mensual (ARS)" value={f.price} onChange={up("price")} placeholder="385000" type="number" />
      </div>
      {err && <p className="mt-3 text-xs text-rose-500">{err}</p>}
      <div className="mt-6 flex gap-3"><button onClick={onClose} className="flex-1 rounded-xl border border-stone-200 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50">Cancelar</button><button onClick={submit} disabled={busy} className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">{busy ? "Enviando…" : "Enviar a publicación"}</button></div>
    </ModalShell>
  );
}

function Footer() {
  return (
    <footer className="border-t border-stone-200">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
        <div className="flex items-center gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 font-display font-bold text-white">N</div><span className="font-display text-lg font-semibold text-stone-900">Neo Rent Go</span></div>
        <p className="text-sm text-stone-500">El circuito de alquiler completo, productizado. Neuquén, Argentina.</p>
        <Link href="/administer" className="text-sm font-semibold text-stone-500 hover:text-emerald-700">Panel del sistema →</Link>
      </div>
      <div className="border-t border-stone-200/70 py-5 text-center text-xs text-stone-400">Neo Rent Go · MVP · datos reales sobre Supabase</div>
    </footer>
  );
}
