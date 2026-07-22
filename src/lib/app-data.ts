export type RoleId = "inquilino" | "propietario" | "martillero" | "garante" | "alp";

export interface RoleMeta {
  id: RoleId;
  label: string;
  desc: string;
  emoji: string;
  requires?: string; // condición de activación
}

export const ROLES: Record<RoleId, RoleMeta> = {
  inquilino: { id: "inquilino", label: "Inquilino", desc: "Buscás y alquilás", emoji: "🔑" },
  propietario: { id: "propietario", label: "Propietario", desc: "Publicás y gestionás", emoji: "🏠" },
  martillero: { id: "martillero", label: "Martillero", desc: "Validás y cerrás", emoji: "⚖️", requires: "Matrícula vigente" },
  garante: { id: "garante", label: "Garante", desc: "Respaldás a un inquilino", emoji: "🤝", requires: "Invitación" },
  alp: { id: "alp", label: "ALP", desc: "Visitás propiedades", emoji: "📸", requires: "Invitación de martillero" },
};

// Clases Tailwind completas por rol (literales para que Tailwind las incluya)
export const ACCENT: Record<RoleId, { text: string; soft: string; dot: string; chip: string; bar: string; ring: string }> = {
  inquilino:   { text: "text-emerald-700", soft: "bg-emerald-50", dot: "bg-emerald-500", chip: "bg-emerald-600", bar: "bg-emerald-500", ring: "ring-emerald-200" },
  propietario: { text: "text-sky-700",     soft: "bg-sky-50",     dot: "bg-sky-500",     chip: "bg-sky-600",     bar: "bg-sky-500",     ring: "ring-sky-200" },
  martillero:  { text: "text-amber-700",   soft: "bg-amber-50",   dot: "bg-amber-500",   chip: "bg-amber-500",   bar: "bg-amber-500",   ring: "ring-amber-200" },
  garante:     { text: "text-violet-700",  soft: "bg-violet-50",  dot: "bg-violet-500",  chip: "bg-violet-600",  bar: "bg-violet-500",  ring: "ring-violet-200" },
  alp:         { text: "text-rose-700",    soft: "bg-rose-50",    dot: "bg-rose-500",    chip: "bg-rose-600",    bar: "bg-rose-500",    ring: "ring-rose-200" },
};

export const NAV_BY_VIEW: Record<string, string[]> = {
  marketplace: ["Alquilar", "Publicar", "Para martilleros"],
  global: ["Resumen", "Notificaciones", "Operaciones"],
  inquilino: ["Buscar", "Mis búsquedas", "Visitas", "Favoritos"],
  propietario: ["Mis propiedades", "Publicar", "Solicitudes"],
  martillero: ["Casos", "Clientes", "Contratos", "Comisiones"],
  garante: ["Solicitudes", "Mis recibos"],
  alp: ["Visitas asignadas", "Agenda", "Ganancias"],
};

export interface Notif { text: string; time: string; unread?: boolean }
export interface Op { title: string; stage: string; progress: number }

export const ROLE_DATA: Record<RoleId, { summary: [string, string][]; notifs: Notif[]; ops: Op[] }> = {
  inquilino: {
    summary: [["2", "búsquedas activas"], ["1", "visita mañana"], ["1", "garante pendiente"]],
    notifs: [
      { text: "Tu visita a “Depto 2 amb. · Centro Este” fue confirmada para mañana 17:00", time: "hace 8 min", unread: true },
      { text: "El propietario aprobó tu avance en “Casa 3 dorm. · Rincón de Emilio”", time: "hace 1 h", unread: true },
      { text: "Falta que tu garante Ana complete sus recibos de sueldo", time: "hace 3 h" },
    ],
    ops: [
      { title: "Depto 2 amb. · Centro Este", stage: "Visita agendada", progress: 40 },
      { title: "Casa 3 dorm. · Rincón de Emilio", stage: "Avance aprobado", progress: 60 },
      { title: "Monoambiente · Universidad", stage: "Carta enviada", progress: 20 },
    ],
  },
  propietario: {
    summary: [["4", "propiedades"], ["3", "candidatos"], ["1", "en revisión"]],
    notifs: [
      { text: "3 candidatos nuevos para “Departamento 3 amb. · Centro Oeste”", time: "hace 15 min", unread: true },
      { text: "“Local · Av. Argentina” está en revisión del martillero", time: "hace 2 h", unread: true },
      { text: "Se generó una reserva en “PH 2 dorm. · Bardas”", time: "ayer" },
    ],
    ops: [
      { title: "Departamento 3 amb. · Centro Oeste", stage: "3 candidatos por revisar", progress: 55 },
      { title: "Local · Av. Argentina", stage: "En habilitación (martillero)", progress: 30 },
      { title: "PH 2 dorm. · Bardas", stage: "Reserva generada", progress: 75 },
    ],
  },
  martillero: {
    summary: [["5", "casos activos"], ["2", "contratos"], ["$210k", "comisiones mes"]],
    notifs: [
      { text: "Nuevo caso disponible en tu jurisdicción: “Casa 3 dorm. · Rincón de Emilio”", time: "hace 5 min", unread: true },
      { text: "Contrato #10428 listo para tu revisión", time: "hace 40 min", unread: true },
      { text: "Comisión acreditada en custodia: $210.000", time: "hace 4 h" },
    ],
    ops: [
      { title: "Caso #10428 · Depto 2 amb.", stage: "Contrato en revisión", progress: 70 },
      { title: "Caso #10431 · Local Av. Argentina", stage: "Validación de documentos", progress: 35 },
      { title: "Caso #10433 · PH 2 dorm.", stage: "Coordinando posesión", progress: 88 },
    ],
  },
  garante: {
    summary: [["1", "solicitud activa"], ["1", "recibo pendiente"]],
    notifs: [{ text: "Lucas te solicitó como garante para “Depto 2 amb.”", time: "hace 1 h", unread: true }],
    ops: [{ title: "Garantía para Lucas · Depto 2 amb.", stage: "Faltan recibos", progress: 25 }],
  },
  alp: {
    summary: [["3", "visitas hoy"], ["$7.500", "ganancias hoy"]],
    notifs: [{ text: "Nueva visita asignada por M. Ríos · 15:30", time: "hace 20 min", unread: true }],
    ops: [{ title: "Visita · Casa 3 dorm.", stage: "En ruta", progress: 50 }],
  },
};
