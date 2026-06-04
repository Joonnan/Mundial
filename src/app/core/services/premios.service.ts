import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// Definición de interfaces para mayor seguridad de tipos
export interface Prediccion {
  usuario_id: string;
  categoria: string;
  prediccion: string;
}

@Injectable({
  providedIn: 'root'
})
export class PremiosService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  /**
   * Obtiene todas las predicciones de un usuario específico
   */
  async getPrediccionesUsuario(uid: string): Promise<Prediccion[]> {
    const { data, error } = await this.supabase
      .from('predicciones_premios')
      .select('*')
      .eq('usuario_id', uid);

    if (error) {
      console.error('Error al obtener predicciones:', error.message);
      return [];
    }
    return data ?? [];
  }

  /**
   * Inserta o actualiza una predicción.
   * Asegúrate de tener una restricción (constraint) en tu tabla de Supabase 
   * sobre los campos que identifican la unicidad (ej. usuario_id + categoria).
   */
  async upsertPrediccion(uid: string, categoria: string, prediccion: string): Promise<string | null> {
    const { error } = await this.supabase
      .from('predicciones_premios')
      .upsert({
        usuario_id: uid,
        categoria,
        prediccion
      });

    return error?.message ?? null;
  }

  /**
   * Obtiene la fecha de cierre desde la tabla de configuración
   */
  async getInicioMundial(): Promise<Date | null> {
    const { data, error } = await this.supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'inicio_mundial')
      .single();

    if (error || !data) {
      console.error('Error al obtener fecha de inicio:', error?.message);
      return null;
    }
    
    return new Date(data.valor);
  }
}