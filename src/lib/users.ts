export interface AppUser {
  username: string;
  name: string;
  roles: string[];
}

interface SeededUser extends AppUser {
  password: string;
}

// Usuarios sembrados para pruebas (mock — se reemplaza por Supabase Auth después).
export const SEEDED_USERS: SeededUser[] = [
  { username: "maxiprueba", password: "maxiprueba", name: "Maxi Prueba", roles: ["inquilino", "propietario"] },
];

// Panel de administración del sistema.
export const ADMIN_CREDENTIALS = { username: "administer", password: "rataemi" };

export function authenticate(username: string, password: string): AppUser | null {
  const u = SEEDED_USERS.find(
    (x) => x.username === username.trim().toLowerCase() && x.password === password
  );
  if (!u) return null;
  return { username: u.username, name: u.name, roles: u.roles };
}
