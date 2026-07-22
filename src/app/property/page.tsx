"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { MediaCarousel } from "@/components/MediaCarousel";
import { PropRow, getProperty, signInWithGoogle, submitApplication, useMyValidation, useProfile } from "@/lib/store";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="lux-mesh pointer-events-none fixed inset-0 -z-10" />
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#f7f6f2]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 font-display font-bold text-white soft">N</div><span className="font-display text-lg font-semibold tracking-tight text-stone-900">Neo Rent <span className="text-emerald-600">Go</span></span></Link>
          <Link href="/" className="text-sm font-semibold text-stone-500 hover:text-stone-900">← Volver al marketplace</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}

function Gate({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return <div className="soft mx-auto max-w-md rounded-3xl border border-stone-200 bg-white p-10 text-center"><h1 className="font-display text-2xl font-semibold text-stone-900">{title}</h1><p className="mt-2 text-sm text-stone-500">{sub}</p><div className="mt-6 flex justify-center">{children}</div></div>;
}

export default function PropertyPage() {
  const { profile } = useProfile();
  const rawVal = useMyValidation(profile?.id);
  const validated = !!profile?.validated || rawVal === "validated";
  const [prop, setProp] = useState<PropRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<"idle" | "busy" | "done" | "err">("idle");
  const [cmsg, setCmsg] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { setLoading(false); return; }
    getProperty(id).then((p) => { setProp(p); setLoading(false); });
  }, []);

  const doContact = async () => {
    if (!prop) return;
    setContact("busy");
    const r = await submitApplication(prop.id);
    if (r.ok) setContact("done"); else { setContact("err"); setCmsg(r.error ?? "Error"); }
  };

  if (loading) return <Shell><p className="py-20 text-center text-stone-500">Cargando…</p></Shell>;
  if (!prop || prop.status !== "active") return <Shell><div className="soft rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-500">Publicación no disponible. <Link href="/" className="font-semibold text-emerald-700">Volver</Link></div></Shell>;
  if (!profile) return <Shell><Gate title="Iniciá sesión para ver la publicación" sub="Con tu cuenta de Google accedés a los datos completos."><button onClick={() => signInWithGoogle()} className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white">Iniciar sesión con Google</button></Gate></Shell>;
  if (!validated) return <Shell><Gate title="Validá tu cuenta global" sub="Para abrir la publicación completa y operar necesitás validar tu identidad con DNI (una sola vez)."><Link href="/" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">Ir a validar</Link></Gate></Shell>;

  return (
    <Shell>
      <div className="soft-lg overflow-hidden rounded-[2rem] border border-stone-200 bg-white">
        <MediaCarousel media={prop.media} image={prop.image} arrows="always" className="h-[26rem] sm:h-[30rem]" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold capitalize text-stone-600">{prop.type}</span>
          <h1 className="mt-3 font-display text-3xl font-semibold text-stone-900">{prop.title}</h1>
          <p className="mt-1 text-stone-500">{prop.zona}{prop.address ? ` · ${prop.address}` : ""} · Neuquén</p>
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-stone-600">
            {prop.type === "vivienda" && <span>🛏 {prop.beds || "Mono"} amb.</span>}
            <span>🚿 {prop.baths} baño(s)</span>
            {prop.m2 ? <span>📐 {prop.m2} m²</span> : null}
            {prop.cochera && <span>🚗 Cochera</span>}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-stone-500">Publicación verificada dentro de Neo Rent Go. Contactá desde la plataforma; la comunicación queda registrada de forma segura.</p>
        </div>
        <div className="soft h-fit rounded-3xl border border-stone-200 bg-white p-5">
          <div className="font-display text-3xl font-semibold text-emerald-700">{fmt(prop.price)}</div>
          <div className="text-sm text-stone-400">por mes</div>
          {contact === "done"
            ? <div className="mt-4 rounded-xl bg-emerald-100 px-4 py-3 text-center text-sm font-semibold text-emerald-700">Contactado ✓ — tu interés quedó registrado.</div>
            : <button onClick={doContact} disabled={contact === "busy"} className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60">{contact === "busy" ? "Enviando…" : "Contactar"}</button>}
          {contact === "err" && <p className="mt-2 text-center text-xs text-rose-500">{cmsg}</p>}
        </div>
      </div>
    </Shell>
  );
}
