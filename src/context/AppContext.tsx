// Dossier functionaliteit
// Plaats deze na de imports zodat alle Firestore helpers beschikbaar zijn
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole, AppContextType, Melding, MeldingStatus, Project, Urenregistratie, Taak, Notificatie, ProjectContribution, MeldingUpdate, WoningDossier, DossierNotitie, DossierDocument, DossierBewoner, DossierHistorieItem, DossierReactie, DossierStatus, DossierAfspraak, ProjectInvitation } from '../types';
import { db, storage, auth } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, Timestamp, arrayUnion, query, where, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ExternalContact } from '../types';

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
  const [projectInvitations, setProjectInvitations] = useState<ProjectInvitation[]>([]);
  const [urenregistraties, setUrenregistraties] = useState<Urenregistratie[]>([]);
  const [taken] = useState<Taak[]>([]);
  const [notificaties, setNotificaties] = useState<Notificatie[]>([]);
  const [externalContacts, setExternalContacts] = useState<ExternalContact[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const dataListeners: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      // Ruim eerst alle oude data listeners op bij elke auth change
      dataListeners.forEach(unsubscribe => unsubscribe());
      dataListeners.length = 0;

      if (authUser) {
        // Gebruiker is ingelogd.
        setIsInitialLoading(true);

        // 1. Haal gebruikersprofiel op
        const userDocRef = doc(db, 'users', authUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (userDocSnap) => {
          if (userDocSnap.exists()) {
            const userProfile = { id: userDocSnap.id, ...convertTimestamps(userDocSnap.data()) } as User;
            setCurrentUser(userProfile);

            // 2. Zodra profiel is geladen, start alle data listeners.
            // Deze worden alleen gestart als de gebruiker is ingelogd en een profiel heeft.
            dataListeners.push(onSnapshot(collection(db, 'users'), (snapshot) => {
              const list = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as User));
              setUsers(list);
            }));

            dataListeners.push(onSnapshot(collection(db, 'meldingen'), (snapshot) => {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Melding));
              setMeldingen(data);
            }));

            dataListeners.push(onSnapshot(collection(db, 'projecten'), (snapshot) => {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Project));
              setProjecten(data);
            }));

            // Project invitations listener
            dataListeners.push(onSnapshot(collection(db, 'projectInvitations'), (snapshot) => {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as ProjectInvitation));
              setProjectInvitations(data);
            }));

            // Urenregistraties: Beheerder ziet alles, anderen alleen eigen uren
            {
              const onNext = (snapshot: any) => {
                const data = snapshot.docs.map((doc: any) => {
                  const docData = doc.data();
                  return {
                    id: doc.id,
                    ...convertTimestamps(docData),
                    start: docData.starttijd ? convertTimestamps(docData).starttijd : convertTimestamps(docData).start,
                    eind: docData.eindtijd ? convertTimestamps(docData).eindtijd : convertTimestamps(docData).eind,
                    omschrijving: docData.details || docData.omschrijving || '',
                  } as Urenregistratie;
                });
                setUrenregistraties(data);
              };
              const onError = (_err: any) => {
                // Vermijd crash bij permissie-fout; toon dan geen uren.
                setUrenregistraties([]);
              };
              const isAdmin = userProfile.role === 'Beheerder';
              if (isAdmin) {
                dataListeners.push(onSnapshot(collection(db, 'urenregistraties'), onNext, onError));
              } else {
                const uq = query(collection(db, 'urenregistraties'), where('gebruikerId', '==', authUser.uid));
                dataListeners.push(onSnapshot(uq, onNext, onError));
              }
            }

            dataListeners.push(onSnapshot(collection(db, 'external_contacts'), (snapshot) => {
              const data = snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as ExternalContact));
              setExternalContacts(data);
            }));

            const q = query(collection(db, 'notificaties'), where("userId", "==", authUser.uid));
            dataListeners.push(onSnapshot(q, (snapshot) => {
                const data = snapshot.docs
                    .filter(doc => doc.data().timestamp)
                    .map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Notificatie));
                setNotificaties(data);
            }));

            setIsInitialLoading(false); // Stop met laden nadat alles is opgezet
          } else {
            // Gebruiker is geauthenticeerd maar heeft geen profiel in Firestore.
            // Dit kan een fout zijn, of een race condition bij aanmaken. Log uit voor de zekerheid.
            console.error("Authenticated user has no profile in Firestore. Logging out.");
            logout();
          }
        });
        dataListeners.push(unsubscribeProfile);

      } else {
        // Gebruiker is niet ingelogd. Reset alle state.
        setCurrentUser(null);
        setUsers([]);
        setMeldingen([]);
        setProjecten([]);
        setProjectInvitations([]);
        setUrenregistraties([]);
        setNotificaties([]);
        setExternalContacts([]);
        setIsInitialLoading(false);
      }
    });

    // Cleanup functie voor de auth listener zelf
    return () => {
      unsubscribeAuth();
      dataListeners.forEach(unsubscribe => unsubscribe());
    };
  }, [logout]);

  const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }, []);

  const addMelding = useCallback(async (melding: Omit<Melding, 'id' | 'timestamp' | 'updates' | 'gebruikerId'>): Promise<void> => {
    if (!currentUser) throw new Error('Geen gebruiker ingelogd');
    try {
      const dataToSend: any = {
        ...melding,
        gebruikerId: currentUser.id,
        timestamp: serverTimestamp(),
        updates: [],
      };
      if (melding.status === MeldingStatus.Afgerond) {
        dataToSend.afgerondTimestamp = serverTimestamp();
      }
      await addDoc(collection(db, 'meldingen'), dataToSend);
    } catch (error) {
      // Geef fouten door aan de UI
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
      // Error updating melding status
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
      // Error adding melding update
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
        // Error marking notifications as read
    }
  }, [currentUser, notificaties]);

  // CORRECTIE: Nieuwe functie geïmplementeerd om een enkele notificatie te markeren.
  const markSingleNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
        const notifRef = doc(db, 'notificaties', notificationId);
        await updateDoc(notifRef, { isRead: true });
    } catch (error) {
        // Error marking single notification as read
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
      // Fout doorgeven zodat UI kan tonen
      throw error;
    }
  }, [currentUser, users]);

  const updateProject = useCallback(async (projectId: string, data: any) => {
    try {
      console.log('AppContext: Updating project', projectId, 'with data:', data);
      const projectRef = doc(db, 'projecten', projectId);

      // Clean undefined values from data
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );

      await updateDoc(projectRef, cleanData);
      console.log('AppContext: Project updated successfully');
    } catch (error) {
      console.error('AppContext: Error updating project:', error);
      throw error;
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
      // Error adding project contribution
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
        // Error joining project
    }
  }, [currentUser]);

  const inviteUserToProject = useCallback(async (projectId: string, userId: string) => {
    if (!currentUser) return;

    try {
      // Haal project info op
      const projectDoc = await getDoc(doc(db, 'projecten', projectId));
      if (!projectDoc.exists()) {
        throw new Error('Project niet gevonden');
      }

      const projectData = projectDoc.data() as Project;

      // Controleer of de gebruiker al een uitnodiging heeft
      const existingInviteQuery = query(
        collection(db, 'projectInvitations'),
        where('projectId', '==', projectId),
        where('invitedUserId', '==', userId),
        where('status', '==', 'pending')
      );

      const existingInvites = await getDocs(existingInviteQuery);
      if (!existingInvites.empty) {
        throw new Error('Gebruiker heeft al een openstaande uitnodiging voor dit project');
      }

      // Controleer of de gebruiker al deelneemt aan het project
      if (projectData.participantIds?.includes(userId)) {
        throw new Error('Gebruiker neemt al deel aan dit project');
      }

      // Maak uitnodiging aan
      const invitation: Omit<ProjectInvitation, 'id'> = {
        projectId,
        projectTitle: projectData.title,
        invitedUserId: userId,
        invitedByUserId: currentUser.id,
        invitedByName: currentUser.name,
        status: 'pending',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'projectInvitations'), invitation);

      // Maak notificatie aan voor de uitgenodigde gebruiker
      const notification: Omit<Notificatie, 'id'> = {
        userId: userId,
        message: `${currentUser.name} heeft je uitgenodigd voor project "${projectData.title}"`,
        link: `/projecten`,
        isRead: false,
        timestamp: new Date(),
        targetId: projectId,
        targetType: 'project'
      };

      await addDoc(collection(db, 'notificaties'), notification);

    } catch (error) {
      throw error;
    }
  }, [currentUser]);

  const respondToProjectInvitation = useCallback(async (invitationId: string, response: 'accepted' | 'declined') => {
    if (!currentUser) return;

    try {
      const invitationRef = doc(db, 'projectInvitations', invitationId);
      const invitationDoc = await getDoc(invitationRef);

      if (!invitationDoc.exists()) {
        throw new Error('Uitnodiging niet gevonden');
      }

      const invitationData = invitationDoc.data() as ProjectInvitation;

      // Controleer of de uitnodiging voor de huidige gebruiker is
      if (invitationData.invitedUserId !== currentUser.id) {
        throw new Error('Je bent niet geautoriseerd om op deze uitnodiging te reageren');
      }

      // Update uitnodiging status
      await updateDoc(invitationRef, {
        status: response,
        respondedAt: new Date()
      });

      // Als geaccepteerd, voeg gebruiker toe aan project
      if (response === 'accepted') {
        const projectRef = doc(db, 'projecten', invitationData.projectId);
        await updateDoc(projectRef, {
          participantIds: arrayUnion(currentUser.id)
        });
      }

    } catch (error) {
      throw error;
    }
  }, [currentUser]);

  const addUrenregistratie = useCallback(async (data: Omit<Urenregistratie, 'id' | 'gebruikerId'>) => {
    if (!currentUser) throw new Error('Geen gebruiker ingelogd');
    try {
      await addDoc(collection(db, 'urenregistraties'), {
        ...data,
        gebruikerId: currentUser.id,
      });
    } catch (error) {
      throw error;
    }
  }, [currentUser]);

  const updateUrenregistratie = useCallback(async (id: string, patch: Partial<Pick<Urenregistratie, 'start' | 'eind' | 'omschrijving'>>): Promise<void> => {
    if (!currentUser) return;
    try {
      const entryRef = doc(db, 'urenregistraties', id);
      const snap = await getDoc(entryRef);
      if (!snap.exists()) return;
      const data = snap.data() as Urenregistratie;
      // Toestemming: eigenaar of Beheerder mag wijzigen
      if (data.gebruikerId !== currentUser.id && currentUser.role !== UserRole.Beheerder) {
        throw new Error('Geen toestemming om deze urenregistratie te wijzigen.');
      }

      const sanitized: any = { ...patch };
      Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);
      await updateDoc(entryRef, sanitized);
    } catch (error) {
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
      // Error deleting urenregistratie
      throw error;
    }
  }, [currentUser]);

  const updateUserRole = useCallback(async (userId: string, newRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
    } catch (error) {
      // Error updating user role
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
      // Error removing user
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
      // Error updating user profile
    }
  }, [currentUser]);

    const addExternalContact = useCallback(async (contact: Omit<ExternalContact, 'id' | 'creatorId'>) => {
    if (!currentUser) throw new Error("U moet ingelogd zijn.");
    await addDoc(collection(db, 'external_contacts'), {
      ...contact,
      creatorId: currentUser.id,
    });
  }, [currentUser]);

  const updateExternalContact = useCallback(async (contactId: string, data: Partial<ExternalContact>) => {
    const contactRef = doc(db, 'external_contacts', contactId);
    await updateDoc(contactRef, data);
  }, []);

  const deleteExternalContact = useCallback(async (contactId: string) => {
    const contactRef = doc(db, 'external_contacts', contactId);
    await deleteDoc(contactRef);
  }, []);

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
          const safeName = `${Date.now()}-${f.name}`;
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
      // Error sending chat message
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
      // Kon conversatie niet als gezien markeren
    }
  }, [currentUser]);

  const createNewDossier = useCallback(async (adres: string): Promise<WoningDossier> => {
    const newDossier: WoningDossier = {
      id: adres,
      adres,
      gebruikerId: currentUser?.id || 'onbekend',
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
        // Kon PDOK locatie niet ophalen bij aanmaken dossier
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
          } catch (err) {
            // PDOK enrich failed
          }
        }
        return data;
      }
      return null;
    } catch (error) {
      // Error fetching dossier
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
      // Error adding dossier notitie
    }
  }, [currentUser]);

  const uploadDossierDocument = useCallback(async (adres: string, file: File): Promise<DossierDocument> => {
    if (!currentUser) throw new Error('Geen gebruiker ingelogd');
    try {
      const path = `dossiers/${adres}/documents/${file.name}`;
      const url = await uploadFile(file, path);
      const dossierRef = doc(db, 'dossiers', adres);
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
      // Error uploading dossier document
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
      // Error adding dossier afspraak
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
      // Error updating dossier afspraak
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
      // Error removing dossier afspraak
    }
  }, []);

  const updateDossierStatus = useCallback(async (adres: string, status: DossierStatus): Promise<void> => {
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      await updateDoc(dossierRef, { status });
    } catch (error) {
      // Error updating dossier status
    }
  }, []);

  const updateDossierWoningType = useCallback(async (adres: string, woningType: string): Promise<void> => {
    try {
      const dossierRef = doc(db, 'dossiers', adres);
      await updateDoc(dossierRef, { woningType });
    } catch (error) {
      // Error updating dossier woningType
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
      // Error adding dossier bewoner
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
      // Error updating dossier bewoner
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
      // Error removing dossier bewoner
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
      // Error adding dossier historie
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
      // Error adding dossier reactie
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
    inviteUserToProject,
    respondToProjectInvitation,
    projectInvitations,
    addUrenregistratie,
    updateUrenregistratie,
    deleteUrenregistratie,
    updateUserRole,
    removeUser,
    updateUserProfile,
    externalContacts,
    addExternalContact,
    updateExternalContact,
    deleteExternalContact,
    // Dossier methods
    createNewDossier,
    getDossier,
    addDossierNotitie,
    uploadDossierDocument,
    addDossierAfspraak,
    updateDossierAfspraak,
    removeDossierAfspraak,
    updateDossierStatus,
    updateDossierWoningType,
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
