// Dossier functionaliteit
// Plaats deze na de imports zodat alle Firestore helpers beschikbaar zijn
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User, UserRole, AppContextType, Melding, MeldingStatus, Project, Urenregistratie, Taak, Notificatie, ProjectContribution, MeldingUpdate, WoningDossier, DossierNotitie, DossierDocument, DossierBewoner, DossierHistorieItem, DossierReactie, DossierStatus, DossierAfspraak } from '../types';
import { db, storage } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, Timestamp, arrayUnion, query, where, getDocs, writeBatch, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Sanitize filenames for Firebase Storage (forbidden: #, ?, *, [, ], /, \, :, etc.)
const sanitizeFileName = (name: string): string => {
  const trimmed = (name || '').trim();
  const dot = trimmed.lastIndexOf('.');
  const base = dot > -1 ? trimmed.slice(0, dot) : trimmed;
  const ext = dot > -1 ? trimmed.slice(dot + 1) : '';
  // Replace forbidden/suspect chars and collapse spaces
  const safeBase = base
    .replace(/[#?*\[\]\\/:\n\r\t]+/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
    .trim();
  const safeExt = ext.replace(/[^A-Za-z0-9]+/g, '').slice(0, 10);
  const finalBase = safeBase || 'bestand';
  return safeExt ? `${finalBase}.${safeExt}` : finalBase;
};

const convertTimestamps = (data: any) => {
  const convertedData = { ...data };
  for (const key in convertedData) {
    if (convertedData[key] instanceof Timestamp) {
      convertedData[key] = convertedData[key].toDate();
    } else if (Array.isArray(convertedData[key])) {
        convertedData[key] = convertedData[key].map(item => 
            typeof item === 'object' && item !== null ? convertTimestamps(item) : item
        );
    }
  }
  return convertedData;
};


const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Dossier functionaliteit
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = typeof window !== 'undefined'
      ? localStorage.getItem('theme') as 'light' | 'dark' | null
      : null;
    return savedTheme || 'dark';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [projecten, setProjecten] = useState<Project[]>([]);
  const [urenregistraties, setUrenregistraties] = useState<Urenregistratie[]>([]);
  const [taken] = useState<Taak[]>([]);
  const [notificaties, setNotificaties] = useState<Notificatie[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const seededUsers = useRef(false);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const login = useCallback((role: UserRole) => {
    const user = users.find(u => u.role === role);
    if (user) {
      setCurrentUser(user);
    } else {
      console.error(`No user found for role: ${role}, logging in first available user as fallback.`);
      setCurrentUser(users[0] || null);
    }
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    async function seedDefaultUsers() {
      const demo = [
        { name: 'Admin Annie', email: 'admin@example.com', role: UserRole.Beheerder },
        { name: 'Concierge Chris', email: 'concierge@example.com', role: UserRole.Concierge },
        { name: 'Viewer Vera', email: 'viewer@example.com', role: UserRole.Viewer },
      ];
      for (const u of demo) {
        await addDoc(collection(db, 'users'), {
          name: u.name,
          email: u.email,
          role: u.role,
          avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(u.email)}`,
          phone: '0612345678',
        });
      }
    }

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), async (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as User));
      if (list.length === 0 && import.meta.env.DEV && !seededUsers.current) {
        try {
          seededUsers.current = true;
          await seedDefaultUsers();
          return; // wacht op volgende snapshot met data
        } catch (e) {
          console.warn('Seeden van testgebruikers mislukt:', e);
          seededUsers.current = false;
        }
      }
      setUsers(list);
      setIsInitialLoading(false);
    });
    
    const unsubscribeMeldingen = onSnapshot(collection(db, 'meldingen'), (snapshot) => {
      const data = snapshot.docs
        .filter(doc => doc.data().timestamp)
        .map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Melding));
      setMeldingen(data);
    });

    const unsubscribeProjecten = onSnapshot(collection(db, 'projecten'), (snapshot) => {
      const data = snapshot.docs
        .filter(doc => doc.data().startDate)
        .map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Project));
      setProjecten(data);
    });

    const unsubscribeUrenregistraties = onSnapshot(collection(db, 'urenregistraties'), (snapshot) => {
      const data = snapshot.docs
        .filter(doc => doc.data().starttijd)
        .map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Urenregistratie));
      setUrenregistraties(data);
    });
    
    let unsubscribeNotificaties = () => {};
    if (currentUser) {
        const q = query(collection(db, 'notificaties'), where("userId", "==", currentUser.id));
        unsubscribeNotificaties = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .filter(doc => doc.data().timestamp)
                .map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Notificatie));
            setNotificaties(data);
        });
    }

    return () => {
      unsubscribeUsers();
      unsubscribeMeldingen();
      unsubscribeProjecten();
      unsubscribeUrenregistraties();
      unsubscribeNotificaties();
    };
  }, [currentUser]);

  const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const metadata = file.type ? { contentType: file.type } : undefined;
    await uploadBytes(storageRef, file, metadata as any);
    return getDownloadURL(storageRef);
  }, []);

  const addMelding = useCallback(async (melding: Omit<Melding, 'id' | 'timestamp' | 'updates' | 'gebruikerId'>): Promise<void> => {
    if (!currentUser) throw new Error('Log in om een melding aan te maken.');
    try {
      const base = (import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim()) || '/api';
      const apiUrl = `${base.replace(/\/+$/, '')}/createMelding`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...melding,
          gebruikerId: currentUser.id,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Aanmaken melding mislukt (${res.status}): ${text || res.statusText}`);
      }
      // onSnapshot zal het lijstje verversen
    } catch (error) {
      console.error('Error adding melding:', error);
      throw error;
    }
  }, [currentUser]);

  const updateMeldingStatus = useCallback(async (id: string, status: MeldingStatus): Promise<void> => {
    try {
      const meldingRef = doc(db, 'meldingen', id);
      const updates: any = { status };
      if (status === MeldingStatus.Afgerond) {
          updates.afgerondTimestamp = serverTimestamp();
      }
      await updateDoc(meldingRef, updates);
    } catch (error) {
      console.error("Error updating melding status:", error);
      throw error;
    }
  }, []);

  const addMeldingUpdate = useCallback(async (meldingId: string, update: Omit<MeldingUpdate, 'id' | 'timestamp' | 'userId'>): Promise<void> => {
    if (!currentUser) return;
    try {
      const meldingRef = doc(db, 'meldingen', meldingId);
      const newUpdate = {
          ...update,
          id: `update-${Date.now()}`,
          timestamp: new Date(),
          userId: currentUser.id
      };
      await updateDoc(meldingRef, {
        updates: arrayUnion(newUpdate)
      });
    } catch (error) {
      console.error("Error adding melding update:", error);
      throw error;
    }
  }, [currentUser]);

  const markNotificationsAsRead = useCallback(async (targetType: 'melding' | 'project', targetId: string) => {
    if (!currentUser) return;
    const unreadNotifs = notificaties.filter(n => 
        !n.isRead && n.targetType === targetType && n.targetId === targetId
    );
    try {
        for (const notif of unreadNotifs) {
            const notifRef = doc(db, 'notificaties', notif.id);
            await updateDoc(notifRef, { isRead: true });
        }
    } catch (error) {
        console.error("Error marking notifications as read:", error);
    }
  }, [currentUser, notificaties]);

  // CORRECTIE: Nieuwe functie geïmplementeerd om een enkele notificatie te markeren.
  const markSingleNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
        const notifRef = doc(db, 'notificaties', notificationId);
        await updateDoc(notifRef, { isRead: true });
    } catch (error) {
        console.error("Error marking single notification as read:", error);
    }
  }, []);

  const addProject = useCallback(async (newProject: Omit<Project, 'id' | 'creatorId' | 'contributions' | 'participantIds' | 'imageUrl'>) => {
    if (!currentUser) return;
    try {
      const projectData: any = {
        ...newProject, 
        creatorId: currentUser.id,
        participantIds: [currentUser.id],
        contributions: [],
        imageUrl: newProject.attachments[0] || `https://picsum.photos/seed/project${Date.now()}/800/400`,
      };

      if (projectData.endDate === undefined) {
        delete projectData.endDate;
      }

      const docRef = await addDoc(collection(db, 'projecten'), projectData);

      const usersToNotify = users.filter(u => u.role === UserRole.Beheerder || u.role === UserRole.Concierge);
      for (const user of usersToNotify) {
            if (user.id === currentUser.id) continue;
            await addDoc(collection(db, 'notificaties'), {
                userId: user.id,
                message: `Nieuw project '${newProject.title}' is gestart door ${currentUser.name}.`,
                link: '/projects',
                isRead: false,
                timestamp: serverTimestamp(),
                targetId: docRef.id,
                targetType: 'project'
            });
        }
    } catch (error) {
      console.error("Error adding project:", error);
    }
  }, [currentUser, users]);

  const updateProject = useCallback(async (projectId: string, data: Partial<Pick<Project, 'title' | 'description' | 'startDate' | 'endDate' | 'status'>>) => {
    try {
      const projectRef = doc(db, 'projecten', projectId);
      await updateDoc(projectRef, data);
    } catch (error) {
      console.error("Error updating project:", error);
    }
  }, []);

  const addProjectContribution = useCallback(async (projectId: string, contribution: Omit<ProjectContribution, 'id' | 'timestamp' | 'userId'>) => {
    if (!currentUser) return;
    try {
      const projectRef = doc(db, 'projecten', projectId);
      const newContribution = {
          ...contribution,
          id: `contrib-${Date.now()}`,
          timestamp: new Date(),
          userId: currentUser.id
      };
      await updateDoc(projectRef, {
        contributions: arrayUnion(newContribution)
      });
    } catch (error) {
      console.error("Error adding project contribution:", error);
    }
  }, [currentUser]);

  const joinProject = useCallback(async (projectId: string) => {
    if (!currentUser) return;
    try {
        const projectRef = doc(db, 'projecten', projectId);
        await updateDoc(projectRef, {
            participantIds: arrayUnion(currentUser.id)
        });
    } catch (error) {
        console.error("Error joining project:", error);
    }
  }, [currentUser]);

  const getActiveUrenregistratie = useCallback(() => {
    if (!currentUser) return undefined;
    return urenregistraties.find(u => u.gebruikerId === currentUser.id && !u.eindtijd);
  }, [currentUser, urenregistraties]);

  const startUrenregistratie = useCallback(async (data: Omit<Urenregistratie, 'id' | 'gebruikerId' | 'starttijd' | 'eindtijd'>) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'urenregistraties'), {
        ...data,
        gebruikerId: currentUser.id,
        starttijd: serverTimestamp(),
        eindtijd: null,
      });
    } catch (error) {
      console.error("Error starting urenregistratie:", error);
    }
  }, [currentUser]);

  const switchUrenregistratie = useCallback(async (data: Omit<Urenregistratie, 'id' | 'gebruikerId' | 'starttijd' | 'eindtijd'>) => {
    if (!currentUser) return;
    try {
        const batch = writeBatch(db);
        const now = new Date(); 

        const q = query(collection(db, 'urenregistraties'), where("gebruikerId", "==", currentUser.id), where("eindtijd", "==", null));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            batch.update(doc.ref, { eindtijd: Timestamp.fromDate(now) });
        });

        const newEntryRef = doc(collection(db, 'urenregistraties'));
        batch.set(newEntryRef, {
            ...data,
            gebruikerId: currentUser.id,
            starttijd: Timestamp.fromDate(now),
            eindtijd: null,
        });

        await batch.commit();
    } catch (error) {
        console.error("Error switching urenregistratie:", error);
    }
  }, [currentUser]);

  const stopUrenregistratie = useCallback(async () => {
    if (!currentUser) return;
    try {
        const q = query(collection(db, 'urenregistraties'), where("gebruikerId", "==", currentUser.id), where("eindtijd", "==", null));
        const querySnapshot = await getDocs(q);
        for (const docSnap of querySnapshot.docs) {
            await updateDoc(docSnap.ref, { eindtijd: serverTimestamp() });
        }
    } catch (error) {
      console.error("Error stopping urenregistratie:", error);
    }
  }, [currentUser]);

  const updateUrenregistratie = useCallback(async (id: string, patch: Partial<Pick<Urenregistratie, 'starttijd' | 'eindtijd' | 'activiteit' | 'details'>>): Promise<void> => {
    if (!currentUser) return;
    try {
      const entryRef = doc(db, 'urenregistraties', id);
      const snap = await getDoc(entryRef);
      if (!snap.exists()) return;
      const data = snap.data() as any;
      // Toestemming: eigenaar of Beheerder mag wijzigen
      if (data.gebruikerId !== currentUser.id && currentUser.role !== UserRole.Beheerder) {
        console.warn('Geen toestemming om deze urenregistratie te wijzigen.');
        throw new Error('Geen toestemming om deze urenregistratie te wijzigen.');
      }
      // 21-dagen beperking voor niet-beheerders
      const ms21d = 21 * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();
      const startDate: Date = data.starttijd instanceof Timestamp ? data.starttijd.toDate() : new Date(data.starttijd);
      const isWithin21Days = (d: Date) => nowMs - d.getTime() <= ms21d;
      if (currentUser.role !== UserRole.Beheerder) {
        // bestaande entry moet binnen 21 dagen liggen
        if (!isWithin21Days(startDate)) {
          console.warn('Aanpassen beperkt tot 21 dagen na starttijd.');
          throw new Error('Aanpassen beperkt tot 21 dagen na starttijd.');
        }
      }

      // Validaties voor nieuwe tijden
      const proposedStart = patch.starttijd ? new Date(patch.starttijd) : (data.starttijd instanceof Timestamp ? data.starttijd.toDate() : new Date(data.starttijd));
      const proposedEnd = patch.eindtijd ? new Date(patch.eindtijd) : (data.eindtijd ? (data.eindtijd instanceof Timestamp ? data.eindtijd.toDate() : new Date(data.eindtijd)) : undefined);
      if (!proposedEnd) {
        throw new Error('Eindtijd is verplicht om te kunnen bewerken.');
      }
      if (proposedStart.getTime() >= proposedEnd.getTime()) {
        console.warn('Starttijd moet vóór eindtijd liggen.');
        throw new Error('Starttijd moet vóór eindtijd liggen.');
      }
      if (currentUser.role !== UserRole.Beheerder && proposedStart && !isWithin21Days(proposedStart)) {
        console.warn('Nieuwe starttijd valt buiten 21 dagen.');
        throw new Error('Nieuwe starttijd valt buiten 21 dagen.');
      }

      // Overlap-detectie tegen andere registraties van dezelfde gebruiker
      const userIdToCheck: string = data.gebruikerId;
      const startMs = proposedStart.getTime();
      const endMs = proposedEnd.getTime();
      const overlaps = urenregistraties.some(u => {
        if (u.id === id) return false;
        if (u.gebruikerId !== userIdToCheck) return false;
        if (!u.eindtijd) return false;
        const us = new Date(u.starttijd).getTime();
        const ue = new Date(u.eindtijd).getTime();
        return startMs < ue && us < endMs; // interval overlap
      });
      if (overlaps) {
        console.warn('Deze tijden overlappen met een andere urenregistratie.');
        throw new Error('Deze tijden overlappen met een andere urenregistratie.');
      }
      const sanitized: any = { ...patch };
      Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);
      await updateDoc(entryRef, sanitized);
    } catch (error) {
      console.error('Error updating urenregistratie:', error);
      throw error;
    }
  }, [currentUser, urenregistraties]);

  const deleteUrenregistratie = useCallback(async (id: string): Promise<void> => {
    if (!currentUser) return;
    try {
      const entryRef = doc(db, 'urenregistraties', id);
      const snap = await getDoc(entryRef);
      if (!snap.exists()) return;
      const data = snap.data() as any;
      if (data.gebruikerId !== currentUser.id && currentUser.role !== UserRole.Beheerder) {
        throw new Error('Geen toestemming om deze urenregistratie te verwijderen.');
      }
      const ms21d = 21 * 24 * 60 * 60 * 1000;
      const startDate: Date = data.starttijd instanceof Timestamp ? data.starttijd.toDate() : new Date(data.starttijd);
      if (currentUser.role !== UserRole.Beheerder && (Date.now() - startDate.getTime() > ms21d)) {
        throw new Error('Verwijderen is beperkt tot 21 dagen na starttijd.');
      }
      await deleteDoc(entryRef);
    } catch (error) {
      console.error('Error deleting urenregistratie:', error);
      throw error;
    }
  }, [currentUser]);

  const addUser = useCallback(async (newUser: Omit<User, 'id' | 'avatarUrl' | 'phone'>) => {
    try {
      await addDoc(collection(db, 'users'), {
        ...newUser,
        avatarUrl: `https://i.pravatar.cc/150?u=user-${Date.now()}`,
        phone: '06' + Math.floor(10000000 + Math.random() * 90000000),
      });
    } catch (error) {
      console.error("Error adding user:", error);
    }
  }, []);

  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  }, []);

  const removeUser = useCallback(async (userId: string) => {
    if (currentUser?.id === userId) {
      alert("U kunt uw eigen account niet verwijderen.");
      return;
    }
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
    } catch (error) {
      console.error("Error removing user:", error);
    }
  }, [currentUser]);

  const updateUserProfile = useCallback(async (userId: string, data: Partial<Pick<User, 'name' | 'email' | 'phone' | 'avatarUrl'>>) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, data);
      if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, ...data } : null);
      }
    } catch (error) {
      console.error("Error updating user profile:", error);
    }
  }, [currentUser]);

  // Chat/conversatie API
  const getOrCreateConversation = useCallback(async (participants: string[], title?: string) => {
    if (!currentUser) throw new Error('Geen gebruiker ingelogd');
    const sorted = Array.from(new Set(participants)).sort();
    const participantsKey = sorted.join('_');
    // zoek bestaande conversatie
    const q = query(collection(db, 'conversations'), where('participantsKey', '==', participantsKey));
    const qs = await getDocs(q);
    if (!qs.empty) {
      const snap = qs.docs[0];
      const data = snap.data() as any;
      return {
        id: snap.id,
        participants: data.participants || sorted,
        participantsKey: data.participantsKey || participantsKey,
        title: data.title,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        createdBy: data.createdBy || currentUser.id,
        lastMessage: data.lastMessage ? { ...data.lastMessage, at: (data.lastMessage.at instanceof Timestamp ? data.lastMessage.at.toDate() : new Date()) } : undefined,
        lastSeen: data.lastSeen ? Object.fromEntries(Object.entries(data.lastSeen).map(([k, v]: any) => [k, v instanceof Timestamp ? v.toDate() : v])) : {},
      };
    }
    // maak nieuwe conversatie aan
    const convPayload: any = {
      participants: sorted,
      participantsKey,
      createdAt: serverTimestamp(),
      createdBy: currentUser.id,
      lastSeen: { [currentUser.id]: serverTimestamp() },
    };
    if (title && title.trim()) {
      convPayload.title = title.trim();
    }
    const docRef = await addDoc(collection(db, 'conversations'), convPayload);
    return {
      id: docRef.id,
      participants: sorted,
      participantsKey,
      title,
      createdAt: new Date(),
      createdBy: currentUser.id,
      lastSeen: { [currentUser.id]: new Date() },
    } as any;
  }, [currentUser]);

  const sendChatMessage = useCallback(async (conversationId: string, input: { text?: string; files?: File[] }) => {
    if (!currentUser) throw new Error('Geen gebruiker ingelogd');
    try {
      const attachments: Array<{ url: string; type: 'image' | 'pdf' | 'file'; name: string; size: number }> = [];
    if (input.files && input.files.length) {
        for (const f of input.files) {
      const safeName = `${Date.now()}-${sanitizeFileName(f.name)}`;
          const path = `conversations/${conversationId}/${safeName}`;
          const url = await uploadFile(f, path);
          const type: 'image' | 'pdf' | 'file' = f.type?.startsWith('image/') ? 'image' : (f.type === 'application/pdf' ? 'pdf' : 'file');
          attachments.push({ url, type, name: f.name, size: f.size });
        }
      }
      // schrijf bericht
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        text: input.text || null,
        attachments: attachments.length ? attachments : null,
        userId: currentUser.id,
        createdAt: serverTimestamp(),
      });
      // update conversation lastMessage
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        lastMessage: {
          text: input.text || null,
          at: serverTimestamp(),
          userId: currentUser.id,
          attachmentsCount: attachments.length || null,
        }
      });
      // stuur notificaties naar overige deelnemers
      const convSnap = await getDoc(convRef);
      const convData = convSnap.data() as any;
      const participants: string[] = convData?.participants || [];
      for (const uid of participants) {
        if (uid === currentUser.id) continue;
        await addDoc(collection(db, 'notificaties'), {
          userId: uid,
          message: `${currentUser.name} stuurde een bericht` + (input.text ? `: "${String(input.text).slice(0, 80)}"` : ''),
          link: `/chat/${conversationId}`,
          isRead: false,
          timestamp: serverTimestamp(),
          targetId: conversationId,
          targetType: 'message'
        });
      }
    } catch (e) {
      console.error('Error sending chat message:', e);
      throw e;
    }
  }, [currentUser, uploadFile]);

  const markConversationSeen = useCallback(async (conversationId: string) => {
    if (!currentUser) return;
    try {
      const convRef = doc(db, 'conversations', conversationId);
      // dynamische field path
      await updateDoc(convRef, { [`lastSeen.${currentUser.id}`]: serverTimestamp() });
    } catch (e) {
      console.warn('Kon conversatie niet als gezien markeren:', e);
    }
  }, [currentUser]);

  const createNewDossier = useCallback(async (adres: string): Promise<WoningDossier> => {
    const newDossier: WoningDossier = {
      id: adres,
  adres,
  location: null,
      notities: [],
  documenten: [],
      afspraken: [],
      bewoners: [],
      historie: [{
        id: `hist-${Date.now()}`,
        type: 'Aanmaak',
        description: `Dossier aangemaakt voor ${adres}`,
        date: new Date(),
        userId: currentUser?.id || 'systeem'
      }],
      updates: [],
      status: 'actief',
      labels: ['woning'],
    };
    const dossierRef = doc(db, 'dossiers', adres);
    await setDoc(dossierRef, newDossier);
    // Achtergrondverrijking met PDOK locatie
  (async () => {
      try {
        const { fetchDossierMeta } = await import('../services/dossierMeta');
        const meta = await fetchDossierMeta(adres);
    const patch: any = {};
    if (meta.location) patch.location = meta.location;
    if (meta.woningType) patch.woningType = meta.woningType;
    if (Object.keys(patch).length) await updateDoc(dossierRef, patch);
      } catch (e) {
        console.warn('Kon PDOK locatie niet ophalen bij aanmaken dossier:', e);
      }
    })();
    return newDossier;
  }, [currentUser]);

  const getDossier = useCallback(async (adres: string): Promise<WoningDossier | null> => {
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      const docSnap = await getDoc(dossierRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as WoningDossier;
        // Verrijk met PDOK locatie als nog niet aanwezig
    if (!data.location || !data.woningType) {
          try {
            const { fetchDossierMeta } = await import('../services/dossierMeta');
            const meta = await fetchDossierMeta(adres);
      const patch: any = {};
      if (!data.location && meta.location) { patch.location = meta.location; data.location = meta.location; }
      if (!data.woningType && meta.woningType) { patch.woningType = meta.woningType; data.woningType = meta.woningType; }
      if (Object.keys(patch).length) await updateDoc(dossierRef, patch);
          } catch {}
        }
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching dossier:', error);
      return null;
    }
  }, []);

  const addDossierNotitie = useCallback(async (adres: string, notitie: Omit<DossierNotitie, 'id' | 'timestamp' | 'userId'>): Promise<void> => {
    if (!currentUser) return;
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      const newNotitie: DossierNotitie = {
        ...notitie,
        id: `notitie-${Date.now()}`,
        timestamp: new Date(),
        userId: currentUser.id,
      };
      await updateDoc(dossierRef, {
        notities: arrayUnion(newNotitie)
      });
    } catch (error) {
      console.error('Error adding dossier notitie:', error);
    }
  }, [currentUser]);

  const uploadDossierDocument = useCallback(async (adres: string, file: File): Promise<DossierDocument> => {
    if (!currentUser) throw new Error('Geen gebruiker ingelogd');
    try {
      // Slugify adres voor pad (vermijd dubbele encoding)
      const safeAdres = adres
        .trim()
        .replace(/[\\/\n\r\t]+/g, '_')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\-.,@() ]/g, '_');
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const cleanName = sanitizeFileName(file.name);
  const path = `dossiers/${safeAdres}/documents/${unique}_${cleanName}`;
      const url = await uploadFile(file, path);
      const dossierRef = doc(db, 'dossiers', adres);
      // Zorg dat het dossier-document bestaat voordat we updaten
      const existing = await getDoc(dossierRef);
      if (!existing.exists()) {
        await setDoc(dossierRef, {
          id: adres,
          adres,
          status: 'actief',
          location: null,
          notities: [],
          documenten: [],
          afspraken: [],
          bewoners: [],
          historie: [{
            id: `hist-${Date.now()}`,
            type: 'Aanmaak',
            description: `Dossier aangemaakt voor ${adres} (auto bij upload)`,
            date: new Date(),
            userId: currentUser.id
          }],
          updates: [],
          labels: ['woning']
        }, { merge: true } as any);
      }
      const docObj: DossierDocument = {
        id: `doc-${Date.now()}`,
        url,
        name: file.name,
        uploadedAt: new Date(),
        userId: currentUser.id,
      };
      await updateDoc(dossierRef, {
        documenten: arrayUnion(docObj)
      });
      return docObj;
    } catch (error) {
      console.error('Error uploading dossier document:', error);
      throw error;
    }
  }, [currentUser, uploadFile]);

  // addDossierTaak verwijderd — taken niet meer ondersteund

  const addDossierAfspraak = useCallback(async (adres: string, afspraak: Omit<DossierAfspraak, 'id' | 'createdAt' | 'createdBy'>): Promise<void> => {
    if (!currentUser) return;
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      const newItem: DossierAfspraak = {
        ...afspraak,
        id: `afspraak-${Date.now()}`,
        createdAt: new Date(),
        createdBy: currentUser.id,
      } as DossierAfspraak;
      await updateDoc(dossierRef, { afspraken: arrayUnion(newItem) });
    } catch (error) {
      console.error('Error adding dossier afspraak:', error);
    }
  }, [currentUser]);

  const updateDossierAfspraak = useCallback(async (adres: string, afspraakId: string, patch: Partial<Pick<DossierAfspraak, 'start' | 'end' | 'description' | 'bewonerId' | 'bewonerNaam'>>): Promise<void> => {
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      const snap = await getDoc(dossierRef);
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const items: DossierAfspraak[] = data.afspraken || [];
      const idx = items.findIndex(a => a.id === afspraakId);
      if (idx === -1) return;
      const merged: any = { ...items[idx], ...patch };
      Object.keys(merged).forEach(k => merged[k] === undefined && delete merged[k]);
      items[idx] = merged as DossierAfspraak;
      await updateDoc(dossierRef, { afspraken: items });
    } catch (error) {
      console.error('Error updating dossier afspraak:', error);
    }
  }, []);

  const removeDossierAfspraak = useCallback(async (adres: string, afspraakId: string): Promise<void> => {
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      const snap = await getDoc(dossierRef);
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const items: DossierAfspraak[] = data.afspraken || [];
      const filtered = items.filter(a => a.id !== afspraakId);
      await updateDoc(dossierRef, { afspraken: filtered });
    } catch (error) {
      console.error('Error removing dossier afspraak:', error);
    }
  }, []);

  const updateDossierStatus = useCallback(async (adres: string, status: DossierStatus): Promise<void> => {
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      await updateDoc(dossierRef, { status });
    } catch (error) {
      console.error('Error updating dossier status:', error);
    }
  }, []);

  const addDossierBewoner = useCallback(async (adres: string, bewoner: Omit<DossierBewoner, 'id'>): Promise<void> => {
    try {
      const dossierRef = doc(db, 'dossiers', adres);
  // undefined-velden strippen om Firestore errors te voorkomen
  const cleaned = Object.fromEntries(Object.entries(bewoner).filter(([_, v]) => v !== undefined)) as Omit<DossierBewoner, 'id'>;
  const bewonerObj: DossierBewoner = { ...cleaned, id: `bewoner-${Date.now()}` } as DossierBewoner;
      await updateDoc(dossierRef, {
        bewoners: arrayUnion(bewonerObj)
      });
    } catch (error) {
      console.error('Error adding dossier bewoner:', error);
    }
  }, []);

  const updateDossierBewoner = useCallback(async (adres: string, bewonerId: string, patch: Partial<Pick<DossierBewoner, 'name' | 'contact' | 'extraInfo' | 'to' | 'afspraakGemaakt' | 'afspraakStart' | 'afspraakEinde' | 'afspraakNotitie'>>): Promise<void> => {
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      const dossierSnap = await getDoc(dossierRef);
      if (!dossierSnap.exists()) return;
      const data = dossierSnap.data() as any;
      const bewoners: DossierBewoner[] = data.bewoners || [];
  const idx = bewoners.findIndex(b => b.id === bewonerId);
      if (idx === -1) return;
  const merged: any = { ...bewoners[idx], ...patch };
  // strip undefined properties so Firestore doesn't store undefined
  Object.keys(merged).forEach(k => merged[k] === undefined && delete merged[k]);
  bewoners[idx] = merged as DossierBewoner;
      await updateDoc(dossierRef, { bewoners });
    } catch (error) {
      console.error('Error updating dossier bewoner:', error);
    }
  }, []);

  const removeDossierBewoner = useCallback(async (adres: string, bewonerId: string): Promise<void> => {
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      const dossierSnap = await getDoc(dossierRef);
      if (!dossierSnap.exists()) return;
      const data = dossierSnap.data() as any;
      const bewoners: DossierBewoner[] = data.bewoners || [];
      const filtered = bewoners.filter(b => b.id !== bewonerId);
      await updateDoc(dossierRef, { bewoners: filtered });
    } catch (error) {
      console.error('Error removing dossier bewoner:', error);
    }
  }, []);

  const addDossierHistorie = useCallback(async (adres: string, item: Omit<DossierHistorieItem, 'id' | 'userId'>): Promise<void> => {
    if (!currentUser) return;
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      const historieObj: DossierHistorieItem = {
        ...item,
        id: `historie-${Date.now()}`,
        userId: currentUser.id,
      };
      await updateDoc(dossierRef, {
        historie: arrayUnion(historieObj)
      });
    } catch (error) {
      console.error('Error adding dossier historie:', error);
    }
  }, [currentUser]);

  const addDossierReactie = useCallback(async (adres: string, notitieId: string, reactie: Omit<DossierReactie, 'id' | 'timestamp' | 'userId'>): Promise<void> => {
    if (!currentUser) return;
    // Vereenvoudigde implementatie: fetch dossier, vind notitie, voeg reactie toe, schrijf terug
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      const dossierSnap = await getDoc(dossierRef);
      if (!dossierSnap.exists()) return;
      const dossierData = dossierSnap.data();
      const notities: DossierNotitie[] = dossierData.notities || [];
      const idx = notities.findIndex(n => n.id === notitieId);
      if (idx === -1) return;
      const reactieObj: DossierReactie = {
        ...reactie,
        id: `reactie-${Date.now()}`,
        timestamp: new Date(),
        userId: currentUser.id,
      };
      if (!notities[idx].reacties) notities[idx].reacties = [];
      notities[idx].reacties.push(reactieObj);
      await updateDoc(dossierRef, { notities });
    } catch (error) {
      console.error('Error adding dossier reactie:', error);
    }
  }, [currentUser]);

  const value: AppContextType = {
    isInitialLoading,
    theme,
    toggleTheme,
    currentUser,
    login,
    logout,
    users,
    meldingen,
    projecten,
    urenregistraties,
    taken,
    notificaties,
    uploadFile,
    addMelding,
    updateMeldingStatus,
    addMeldingUpdate,
    markNotificationsAsRead,
    markSingleNotificationAsRead,
    addProject,
    updateProject,
    addProjectContribution,
    joinProject,
    startUrenregistratie,
    switchUrenregistratie,
    stopUrenregistratie,
    getActiveUrenregistratie,
  updateUrenregistratie,
  deleteUrenregistratie,
    addUser,
    updateUserRole,
    removeUser,
    updateUserProfile,
    // Dossier methods
    createNewDossier,
    getDossier,
    addDossierNotitie,
  uploadDossierDocument,
  addDossierAfspraak,
  updateDossierAfspraak,
  removeDossierAfspraak,
    updateDossierStatus,
    addDossierBewoner,
  updateDossierBewoner,
  removeDossierBewoner,
    addDossierHistorie,
    addDossierReactie,
  // Chat
  getOrCreateConversation,
  sendChatMessage,
  markConversationSeen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
