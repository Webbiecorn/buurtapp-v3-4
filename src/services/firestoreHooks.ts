/**
 * BuurtApp Firestore Hooks
 *
 * Pre-configured hooks for BuurtApp collections using @webbiecorn/firebase
 * Provides type-safe access to all Firestore collections
 */

import { useCollection, useDocument, useCRUD } from '@webbiecorn/firebase';
import { db } from '../firebase';
import type { QueryConstraint } from 'firebase/firestore';

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
// Helper type for hook options
// ============================================================================

interface CollectionHookOptions {
  constraints?: QueryConstraint[];
  realtime?: boolean;
}

// ============================================================================
// Collection Hooks
// ============================================================================

export function useUsers(options?: CollectionHookOptions) {
  return useCollection<User>({
    db,
    collectionPath: 'users',
    constraints: options?.constraints,
    realtime: options?.realtime,
  });
}

export function useMeldingen(options?: CollectionHookOptions) {
  return useCollection<Melding>({
    db,
    collectionPath: 'meldingen',
    constraints: options?.constraints,
    realtime: options?.realtime,
  });
}

export function useProjecten(options?: CollectionHookOptions) {
  return useCollection<Project>({
    db,
    collectionPath: 'projecten',
    constraints: options?.constraints,
    realtime: options?.realtime,
  });
}

export function useDossiers(options?: CollectionHookOptions) {
  return useCollection<Dossier>({
    db,
    collectionPath: 'dossiers',
    constraints: options?.constraints,
    realtime: options?.realtime,
  });
}

export function useAchterpaden(options?: CollectionHookOptions) {
  return useCollection<Achterpad>({
    db,
    collectionPath: 'achterpaden',
    constraints: options?.constraints,
    realtime: options?.realtime,
  });
}

export function useNotificaties(options?: CollectionHookOptions) {
  return useCollection<Notificatie>({
    db,
    collectionPath: 'notificaties',
    constraints: options?.constraints,
    realtime: options?.realtime,
  });
}

export function useUrenRegistraties(options?: CollectionHookOptions) {
  return useCollection<UrenRegistratie>({
    db,
    collectionPath: 'urenregistraties',
    constraints: options?.constraints,
    realtime: options?.realtime,
  });
}

export function useConversations(options?: CollectionHookOptions) {
  return useCollection<Conversation>({
    db,
    collectionPath: 'conversations',
    constraints: options?.constraints,
    realtime: options?.realtime,
  });
}

export function useExternalContacts(options?: CollectionHookOptions) {
  return useCollection<ExternalContact>({
    db,
    collectionPath: 'external_contacts',
    constraints: options?.constraints,
    realtime: options?.realtime,
  });
}

// ============================================================================
// Document Hooks
// ============================================================================

export function useUser(userId: string | null | undefined) {
  return useDocument<User>({
    db,
    collectionPath: 'users',
    documentId: userId,
  });
}

export function useMelding(meldingId: string | null | undefined) {
  return useDocument<Melding>({
    db,
    collectionPath: 'meldingen',
    documentId: meldingId,
  });
}

export function useProject(projectId: string | null | undefined) {
  return useDocument<Project>({
    db,
    collectionPath: 'projecten',
    documentId: projectId,
  });
}

export function useDossier(dossierId: string | null | undefined) {
  return useDocument<Dossier>({
    db,
    collectionPath: 'dossiers',
    documentId: dossierId,
  });
}

export function useAchterpad(achterpadId: string | null | undefined) {
  return useDocument<Achterpad>({
    db,
    collectionPath: 'achterpaden',
    documentId: achterpadId,
  });
}

export function useConversation(conversationId: string | null | undefined) {
  return useDocument<Conversation>({
    db,
    collectionPath: 'conversations',
    documentId: conversationId,
  });
}

// ============================================================================
// CRUD Hooks
// ============================================================================

export function useMeldingenCRUD() {
  return useCRUD<Melding>({ db, collectionPath: 'meldingen' });
}

export function useProjectenCRUD() {
  return useCRUD<Project>({ db, collectionPath: 'projecten' });
}

export function useDossiersCRUD() {
  return useCRUD<Dossier>({ db, collectionPath: 'dossiers' });
}

export function useAchterpadenCRUD() {
  return useCRUD<Achterpad>({ db, collectionPath: 'achterpaden' });
}

export function useNotificatiesCRUD() {
  return useCRUD<Notificatie>({ db, collectionPath: 'notificaties' });
}

export function useUrenRegistratiesCRUD() {
  return useCRUD<UrenRegistratie>({ db, collectionPath: 'urenregistraties' });
}
