import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole, AppContextType, Melding, MeldingStatus, Project, ProjectStatus, Urenregistratie, Taak, Notificatie, ProjectContribution, MeldingUpdate } from '../types';
import { db, storage } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, Timestamp, arrayUnion, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
  const [taken, setTaken] = useState<Taak[]>([]);
  const [notificaties, setNotificaties] = useState<Notificatie[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as User)));
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
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const login = (role: UserRole) => {
    const user = users.find(u => u.role === role);
    if (user) {
      setCurrentUser(user);
    } else {
      console.error(`No user found for role: ${role}`);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };
  
  // CORRECTIE: De functie accepteert nu de 'status' van het formulier.
  const addMelding = useCallback(async (newMelding: Omit<Melding, 'id' | 'timestamp' | 'gebruikerId' | 'updates'>) => {
    if (!currentUser) return;
    try {
      const docRef = await addDoc(collection(db, 'meldingen'), {
        ...newMelding,
        timestamp: serverTimestamp(),
        gebruikerId: currentUser.id,
        updates: [],
      });

      const admins = users.filter(u => u.role === UserRole.Beheerder);
      for (const admin of admins) {
          if (admin.id === currentUser.id) continue;
          await addDoc(collection(db, 'notificaties'), {
              userId: admin.id,
              message: `Nieuwe melding '${newMelding.titel}' is toegevoegd door ${currentUser.name}.`,
              link: '/issues',
              isRead: false,
              timestamp: serverTimestamp(),
              targetId: docRef.id,
              targetType: 'melding'
          });
      }
    } catch (error) {
      console.error("Error adding melding:", error);
    }
  }, [currentUser, users]);

  const updateMeldingStatus = useCallback(async (id: string, status: MeldingStatus) => {
    try {
      const meldingRef = doc(db, 'meldingen', id);
      const updates: any = { status };
      if (status === MeldingStatus.Afgerond) {
          updates.afgerondTimestamp = serverTimestamp();
      }
      await updateDoc(meldingRef, updates);
    } catch (error) {
      console.error("Error updating melding status:", error);
    }
  }, []);

  const addMeldingUpdate = useCallback(async (meldingId: string, update: Omit<MeldingUpdate, 'id' | 'timestamp' | 'userId'>) => {
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
    addProject,
    updateProject,
    addProjectContribution,
    joinProject,
    startUrenregistratie,
    switchUrenregistratie,
    stopUrenregistratie,
    getActiveUrenregistratie,
    addUser,
    updateUserRole,
    removeUser,
    updateUserProfile,
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
