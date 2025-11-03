export interface DossierNotitie {
  id: string;
  userId: string;
  timestamp: Date;
  text: string;
  isBelangrijk: boolean;
  reacties?: DossierReactie[];
}
export interface DossierDocument {
  id: string;
  url: string;
  name: string;
  uploadedAt: Date;
  userId: string;
}

// DossierTaak verwijderd – taken zijn niet langer onderdeel van WoningDossier

export interface DossierAfspraak {
  id: string;
  start: Date;
  end?: Date | null;
  description?: string;
  bewonerId?: string;
  bewonerNaam?: string;
  createdBy: string;
  createdAt: Date;
}

export interface DossierBewoner {
  id: string;
  name: string;
  contact: string;
  from: Date;
  to?: Date;
  extraInfo?: string;
  // Nieuwe optionele afspraakvelden per bewoner
  afspraakGemaakt?: boolean;
  afspraakStart?: Date | null;
  afspraakEinde?: Date | null;
  afspraakNotitie?: string;
}

export interface DossierHistorieItem {
  id: string;
  type: string;
  description: string;
  date: Date;
  userId: string;
}

export interface DossierReactie {
  id: string;
  userId: string;
  timestamp: Date;
  text: string;
}

export type DossierStatus = 'actief' | 'afgesloten' | 'in onderzoek' | 'afspraak'; // <-- WIJZIGING HIER
export type DossierLabel = 'woning' | 'bedrijf' | 'overig';

export interface WoningDossier {
  id: string; // adres
  adres: string;
  gebruikerId: string;
  location?: { lat: number; lon: number } | null;
  woningType?: string | null;
  notities: DossierNotitie[];
  documenten: DossierDocument[];
  afspraken: DossierAfspraak[];
  bewoners: DossierBewoner[];
  historie: DossierHistorieItem[];
  status: DossierStatus;
  labels: DossierLabel[];
  updates: any[]; // of een meer specifiek type
}
import type { ReactNode } from 'react';

// Enums
export enum UserRole {
  Concierge = 'Concierge',
  Beheerder = 'Beheerder',
  Viewer = 'Viewer',
}

export enum MeldingStatus {
  InBehandeling = 'In behandeling',
  FixiMeldingGemaakt = 'Fixi melding gemaakt',
  Afgerond = 'Afgerond',
}

export enum ProjectStatus {
  Lopend = 'Lopend',
  Afgerond = 'Afgerond',
}

// Data Models
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  phone?: string;
}

export interface Locatie {
  lat: number;
  lon: number;
  adres?: string;
}

export interface MeldingUpdate {
  id: string;
  userId: string;
  timestamp: Date;
  text: string;
  attachments: string[];
}

export interface Melding {
  id: string;
  titel: string;
  omschrijving: string;
  status: MeldingStatus;
  attachments: string[];
  locatie?: Locatie;
  timestamp: Date;
  gebruikerId: string;
  wijk: string;
  categorie: string;
  updates: MeldingUpdate[];
  afgerondTimestamp?: Date;
}

export interface Urenregistratie {
  id: string;
  gebruikerId: string;
  start: Date;
  eind: Date;
  // Nieuwe gestructureerde velden
  activiteit: 'Project' | 'Wijkronde' | 'Intern overleg' | 'Extern overleg' | 'Persoonlijke ontwikkeling' | 'Overig';
  projectId?: string;
  projectName?: string;
  wijk?: 'Atol' | 'Boswijk' | 'Jol' | 'Waterwijk' | 'Zuiderzeewijk';
  overlegPartner?: string;
  omschrijving?: string; // Voor 'Overig' of algemene notities
}

export interface ProjectContribution {
  id: string;
  userId: string;
  timestamp: Date;
  text: string;
  attachments: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  location?: string;
  budget?: number;
  startDate: Date;
  endDate?: Date;
  status: ProjectStatus;
  creatorId: string;
  participantIds: string[];
  contributions: ProjectContribution[];
  attachments: string[];
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Taak {
    id: string;
    titel: string;
    deadline?: Date;
    isAfgerond: boolean;
    gebruikerId?: string;
}

export interface Notificatie {
  id:string;
  userId: string;
  message: string;
  link: string;
  isRead: boolean;
  timestamp: Date;
  targetId: string;
  targetType: 'message' | 'project' | 'melding';
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectTitle: string;
  invitedUserId: string;
  invitedByUserId: string;
  invitedByName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  respondedAt?: Date;
}


// Chat/conversatie types
export interface ChatAttachment {
  url: string;
  type: 'image' | 'pdf' | 'file';
  name: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  text?: string;
  attachments?: ChatAttachment[];
  userId: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantsKey: string; // sorted participants joined
  title?: string;
  createdAt: Date;
  createdBy: string;
  lastMessage?: { text?: string; at: Date; userId: string; attachmentsCount?: number };
  lastSeen?: Record<string, Date>;
}

export interface ExternalContact {
  id: string;
  creatorId: string;
  name: string;
  organisation: 'Gemeente' | 'Centrada' | 'Politie' | 'Boa' | 'Bewoner/Vrijwilliger' | 'Welzijn Lelystad' | 'Overig';
  extraInfo?: string;
  phone: string;
  email?: string;
  type: 'algemeen' | 'wijk';
  wijk?: string;
}

// Context Types
export interface AppContextType {
  createNewDossier: (adres: string) => Promise<WoningDossier>;
  getDossier: (adres: string) => Promise<WoningDossier | null>;
  addDossierNotitie: (adres: string, notitie: Omit<DossierNotitie, 'id' | 'timestamp' | 'userId'>) => Promise<void>;
  uploadDossierDocument: (adres: string, file: File) => Promise<DossierDocument>;
  addDossierAfspraak: (adres: string, afspraak: Omit<DossierAfspraak, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  updateDossierAfspraak: (adres: string, afspraakId: string, patch: Partial<Pick<DossierAfspraak, 'start' | 'end' | 'description' | 'bewonerId' | 'bewonerNaam'>>) => Promise<void>;
  removeDossierAfspraak: (adres: string, afspraakId: string) => Promise<void>;
  updateDossierStatus: (adres: string, status: DossierStatus) => Promise<void>;
  addDossierBewoner: (adres: string, bewoner: Omit<DossierBewoner, 'id'>) => Promise<void>;
  updateDossierBewoner: (adres: string, bewonerId: string, patch: Partial<Pick<DossierBewoner, 'name' | 'contact' | 'extraInfo' | 'to' | 'afspraakGemaakt' | 'afspraakStart' | 'afspraakEinde' | 'afspraakNotitie'>>) => Promise<void>;
  removeDossierBewoner: (adres: string, bewonerId: string) => Promise<void>;
  addDossierHistorie: (adres: string, item: Omit<DossierHistorieItem, 'id'>) => Promise<void>;
  addDossierReactie: (adres: string, notitieId: string, reactie: Omit<DossierReactie, 'id' | 'timestamp' | 'userId'>) => Promise<void>;
  isInitialLoading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentUser: User | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  users: User[];
  meldingen: Melding[];
  projecten: Project[];
  urenregistraties: Urenregistratie[];
  taken: Taak[];
  notificaties: Notificatie[];
  uploadFile: (file: File, path: string) => Promise<string>;
  addMelding: (melding: Omit<Melding, 'id' | 'timestamp' | 'gebruikerId' | 'updates'>) => Promise<void>;
  updateMeldingStatus: (id: string, status: MeldingStatus) => Promise<void>;
  addMeldingUpdate: (meldingId: string, update: Omit<MeldingUpdate, 'id' | 'timestamp' | 'userId'>) => Promise<void>;
  markNotificationsAsRead: (targetType: 'melding' | 'project', targetId: string) => void;
  // CORRECTIE: Nieuwe functie toegevoegd voor het markeren van een enkele notificatie.
  markSingleNotificationAsRead: (notificationId: string) => void;
  addProject: (project: Omit<Project, 'id' | 'creatorId' | 'contributions' | 'participantIds' | 'imageUrl'>) => void;
  updateProject: (projectId: string, data: Partial<Pick<Project, 'title' | 'description' | 'startDate' | 'endDate' | 'status' | 'imageUrl'>>) => void;
  addProjectContribution: (projectId: string, contribution: Omit<ProjectContribution, 'id' | 'timestamp' | 'userId'>) => void;
  joinProject: (projectId: string) => void;
  inviteUserToProject: (projectId: string, userId: string) => Promise<void>;
  respondToProjectInvitation: (invitationId: string, response: 'accepted' | 'declined') => Promise<void>;
  projectInvitations: ProjectInvitation[];
  addUrenregistratie: (data: Omit<Urenregistratie, 'id' | 'gebruikerId'>) => Promise<void>;
  updateUrenregistratie: (id: string, patch: Partial<Pick<Urenregistratie, 'start' | 'eind' | 'omschrijving'>>) => Promise<void>;
  deleteUrenregistratie: (id: string) => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  updateUserProfile: (userId: string, data: Partial<Pick<User, 'name' | 'email' | 'phone' | 'avatarUrl'>>) => Promise<void>;
  externalContacts: ExternalContact[];
  addExternalContact: (contact: Omit<ExternalContact, 'id' | 'creatorId'>) => Promise<void>;
  updateExternalContact: (contactId: string, data: Partial<ExternalContact>) => Promise<void>;
  deleteExternalContact: (contactId: string) => Promise<void>;

  // Chat
  getOrCreateConversation: (participants: string[], title?: string) => Promise<any>;
  sendChatMessage: (conversationId: string, input: { text?: string; files?: File[] }) => Promise<void>;
  markConversationSeen: (conversationId: string) => Promise<void>;
}

export interface AppProviderProps {
  children: ReactNode;
}

// Component Prop Types
export interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  color: string;
}

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}