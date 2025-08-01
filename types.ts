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
  starttijd: Date;
  eindtijd?: Date;
  activiteit: string;
  details: string; // e.g., wijk name or project name
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
  creatorId: string;
  participantIds: string[];
  status: ProjectStatus;
  startDate: Date;
  endDate?: Date;
  attachments: string[];
  contributions: ProjectContribution[];
  imageUrl: string;
}

export interface Taak {
  id: string;
  title: string;
  start: Date;
  end: Date;
  userId: string;
  extendedProps?: { [key: string]: any };
}

export interface Notificatie {
  id:string;
  userId: string;
  message: string;
  link: string;
  isRead: boolean;
  timestamp: Date;
  targetId: string;
  targetType: 'melding' | 'project';
}

// Context Types
export interface AppContextType {
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // Auth
  currentUser: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
  // Data
  users: User[];
  meldingen: Melding[];
  projecten: Project[];
  urenregistraties: Urenregistratie[];
  taken: Taak[];
  notificaties: Notificatie[];
  // Data Actions
  addMelding: (melding: Omit<Melding, 'id' | 'timestamp' | 'gebruikerId' | 'updates' | 'status'>) => void;
  updateMeldingStatus: (id: string, status: MeldingStatus) => void;
  addMeldingUpdate: (meldingId: string, update: Omit<MeldingUpdate, 'id' | 'timestamp' | 'userId'>) => void;
  markNotificationsAsRead: (targetType: 'melding' | 'project', targetId: string) => void;
  addProject: (project: Omit<Project, 'id' | 'creatorId' | 'contributions' | 'participantIds' | 'imageUrl'>) => void;
  updateProject: (projectId: string, data: Partial<Pick<Project, 'title' | 'description' | 'startDate' | 'endDate' | 'status'>>) => void;
  addProjectContribution: (projectId: string, contribution: Omit<ProjectContribution, 'id' | 'timestamp' | 'userId'>) => void;
  joinProject: (projectId: string) => void;
  startUrenregistratie: (data: Omit<Urenregistratie, 'id' | 'gebruikerId' | 'starttijd' | 'eindtijd'>) => void;
  stopUrenregistratie: () => void;
  getActiveUrenregistratie: () => Urenregistratie | undefined;
  addUser: (user: Omit<User, 'id' | 'avatarUrl' | 'phone'>) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  removeUser: (userId: string) => void;
  updateUserProfile: (userId: string, data: Partial<Pick<User, 'name' | 'email' | 'phone' | 'avatarUrl'>>) => void;
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