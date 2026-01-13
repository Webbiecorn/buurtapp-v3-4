/**
 * BuurtApp Firestore Hooks
 * 
 * Pre-configured hooks for BuurtApp collections using @webbiecorn/firebase
 * Provides type-safe access to all Firestore collections
 */

import { useCollection, useDocument, useCRUD } from '@webbiecorn/firebase';
import type { UseCollectionOptions } from '@webbiecorn/firebase';

// ============================================================================
// Collection Types (extend as needed)
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role?: string;
  wijk?: string;
  createdAt?: Date;
}

export interface Melding {
  id: string;
  titel?: string;
  beschrijving?: string;
  status: 'open' | 'in_behandeling' | 'opgelost' | 'gesloten';
  wijk?: string;
  adres?: string;
  createdAt?: Date;
  updatedAt?: Date;
  userId?: string;
}

export interface Project {
  id: string;
  naam: string;
  beschrijving?: string;
  status: 'concept' | 'actief' | 'afgerond' | 'geannuleerd';
  startDatum?: Date;
  eindDatum?: Date;
  createdAt?: Date;
}

export interface Dossier {
  id: string;
  adres: string;
  wijkNummer?: number;
  notities?: string;
  createdAt?: Date;
}

export interface Achterpad {
  id: string;
  adres?: string;
  status: 'te_beoordelen' | 'goedgekeurd' | 'afgekeurd' | 'in_behandeling';
  wijk?: string;
  createdAt?: Date;
}

export interface Notificatie {
  id: string;
  userId: string;
  titel: string;
  bericht?: string;
  gelezen: boolean;
  createdAt?: Date;
}

export interface UrenRegistratie {
  id: string;
  userId: string;
  projectId?: string;
  datum: Date;
  uren: number;
  beschrijving?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt?: Date;
}

export interface ExternalContact {
  id: string;
  naam: string;
  email?: string;
  telefoon?: string;
  organisatie?: string;
}

// ============================================================================
// Collection Hooks
// ============================================================================

/**
 * Hook for users collection
 */
export function useUsers(options?: Partial<UseCollectionOptions<User>>) {
  return useCollection<User>('users', options);
}

/**
 * Hook for meldingen collection
 */
export function useMeldingen(options?: Partial<UseCollectionOptions<Melding>>) {
  return useCollection<Melding>('meldingen', options);
}

/**
 * Hook for projecten collection
 */
export function useProjecten(options?: Partial<UseCollectionOptions<Project>>) {
  return useCollection<Project>('projecten', options);
}

/**
 * Hook for dossiers collection
 */
export function useDossiers(options?: Partial<UseCollectionOptions<Dossier>>) {
  return useCollection<Dossier>('dossiers', options);
}

/**
 * Hook for achterpaden collection
 */
export function useAchterpaden(options?: Partial<UseCollectionOptions<Achterpad>>) {
  return useCollection<Achterpad>('achterpaden', options);
}

/**
 * Hook for notificaties collection
 */
export function useNotificaties(options?: Partial<UseCollectionOptions<Notificatie>>) {
  return useCollection<Notificatie>('notificaties', options);
}

/**
 * Hook for urenregistraties collection
 */
export function useUrenRegistraties(options?: Partial<UseCollectionOptions<UrenRegistratie>>) {
  return useCollection<UrenRegistratie>('urenregistraties', options);
}

/**
 * Hook for conversations collection
 */
export function useConversations(options?: Partial<UseCollectionOptions<Conversation>>) {
  return useCollection<Conversation>('conversations', options);
}

/**
 * Hook for external_contacts collection
 */
export function useExternalContacts(options?: Partial<UseCollectionOptions<ExternalContact>>) {
  return useCollection<ExternalContact>('external_contacts', options);
}

// ============================================================================
// Document Hooks
// ============================================================================

export function useUser(userId: string) {
  return useDocument<User>('users', userId);
}

export function useMelding(meldingId: string) {
  return useDocument<Melding>('meldingen', meldingId);
}

export function useProject(projectId: string) {
  return useDocument<Project>('projecten', projectId);
}

export function useDossier(dossierId: string) {
  return useDocument<Dossier>('dossiers', dossierId);
}

export function useAchterpad(achterpadId: string) {
  return useDocument<Achterpad>('achterpaden', achterpadId);
}

// ============================================================================
// CRUD Hooks
// ============================================================================

export function useMeldingenCRUD() {
  return useCRUD<Melding>('meldingen');
}

export function useProjectenCRUD() {
  return useCRUD<Project>('projecten');
}

export function useDossiersCRUD() {
  return useCRUD<Dossier>('dossiers');
}

export function useAchterpadenCRUD() {
  return useCRUD<Achterpad>('achterpaden');
}

export function useNotificatiesCRUD() {
  return useCRUD<Notificatie>('notificaties');
}

export function useUrenRegistratiesCRUD() {
  return useCRUD<UrenRegistratie>('urenregistraties');
}
