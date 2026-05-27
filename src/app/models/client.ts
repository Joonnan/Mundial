export interface Usuario {
  id: string;
  rol: 'admin' | 'user';
  nombre_usuario?: string;
  username?: string;
  displayName?: string;
  display_name?: string;
  puntos?: number;
  puntos_total?: number; // <-- Añadido para que el HTML no falle
}