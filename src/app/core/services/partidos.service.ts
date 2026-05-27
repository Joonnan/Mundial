// src/app/core/services/partidos.service.ts
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Partido, Apuesta, ClasificacionRow } from '../models';

@Injectable({ providedIn: 'root' })
export class PartidosService {
  private supa = inject(SupabaseService).client;

  async getPartidos(): Promise<Partido[]> {
    const { data, error } = await this.supa
      .from('partidos')
      .select('*')
      .order('date_dt');
    if (error) throw error;
    return data ?? [];
  }

  async getApuestasUsuario(userId: string): Promise<Apuesta[]> {
    const { data, error } = await this.supa
      .from('apuestas')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data ?? [];
  }

  async upsertApuesta(
    userId: string, partidoId: number,
    golesLocal: number, golesVisitante: number
  ): Promise<string | null> {
    const { error } = await this.supa.from('apuestas').upsert(
      { user_id: userId, partido_id: partidoId, goles_local: golesLocal, goles_visitante: golesVisitante },
      { onConflict: 'user_id,partido_id' }
    );
    return error?.message ?? null;
  }

  async getClasificacion(): Promise<ClasificacionRow[]> {
    const { data, error } = await this.supa
      .from('clasificacion')
      .select('*')
      .order('posicion');
    if (error) throw error;
    return data ?? [];
  }

  // Admin
  async actualizarMarcador(
    matchNumber: number,
    golesLocal: number,
    golesVisitante: number
  ): Promise<string | null> {
    const { error } = await this.supa
      .from('partidos')
      .update({ goles_local: golesLocal, goles_visitante: golesVisitante, estado: 'finalizado' })
      .eq('match_number', matchNumber);
    return error?.message ?? null;
  }

  async reabrirPartido(matchNumber: number): Promise<string | null> {
    const { error } = await this.supa
      .from('partidos')
      .update({ goles_local: null, goles_visitante: null, estado: 'pendiente' })
      .eq('match_number', matchNumber);
    return error?.message ?? null;
  }
}
