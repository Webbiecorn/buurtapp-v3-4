import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, getDocs, Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { formatSafe } from '../utils/dateHelpers';
import { useAppContext } from '../context/AppContext';

interface Update {
  id: string;
  version: string;
  date: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'bugfix' | 'important';
  instructions?: {
    android?: string;
    ios?: string;
    desktop?: string;
  };
}

interface FeedbackReply {
  id: string;
  adminId: string;
  adminName: string;
  timestamp: Timestamp;
  message: string;
}

interface Feedback {
  id: string;
  userId: string;
  userName: string;
  timestamp: Timestamp;
  category: string;
  message: string;
  status: 'new' | 'reviewed' | 'implemented';
  replies?: FeedbackReply[];
}

const UPDATES: Update[] = [
  {
    id: '2025-11-28-icons',
    version: '3.4.2',
    date: '28 november 2025',
    title: '🎨 Nieuwe App Iconen',
    description: 'De Buurtconciërge app heeft nieuwe iconen! Het kleurrijke buurtteam logo is nu zichtbaar op je beginscherm.',
    type: 'important',
    instructions: {
      android: `
**Android Instructies:**
1. Houd het oude app-icoon ingedrukt op je beginscherm
2. Sleep naar "Verwijderen" of klik op "Deïnstalleren"
3. Open Chrome en ga naar: https://buurtapp-v3-4.web.app
4. Klik op het menu (drie puntjes rechtsboven)
5. Klik op "Installeren" of "App installeren"
6. Bevestig de installatie
7. ✨ Het nieuwe logo verschijnt nu op je beginscherm!`,
      ios: `
**iOS Instructies (iPhone/iPad):**
1. Houd het oude app-icoon ingedrukt op je beginscherm
2. Klik op "App verwijderen" of het minnetje (-)
3. Bevestig verwijderen
4. Open Safari en ga naar: https://buurtapp-v3-4.web.app
5. Klik op het deel-icoon (□↑) onderaan
6. Scroll naar beneden en klik op "Zet op beginscherm"
7. Klik op "Voeg toe"
8. ✨ Het nieuwe logo verschijnt nu!`,
      desktop: `
**Desktop Instructies (Chrome/Edge/Windows):**
1. Ga naar chrome://apps (of edge://apps)
2. Rechtermuisklik op de Buurtconciërge app
3. Klik op "Verwijderen uit Chrome" (of Edge)
4. Ga naar: https://buurtapp-v3-4.web.app
5. Klik op het installatie-icoon in de adresbalk (⊕ of ↓)
6. Klik op "Installeren"
7. ✨ Het nieuwe logo verschijnt nu in je apps!`
    }
  },
  {
    id: '2025-11-28-fixi',
    version: '3.4.1',
    date: '28 november 2025',
    title: '🔧 Fixi Integratie Verbeterd',
    description: 'Het "Fixi Meldingen" tab heeft een nieuwe interface met GPS tracking. Registreer eenvoudig je Fixi meldingen met automatische locatiebepaling. Klik hieronder voor de gebruiksinstructies.',
    type: 'improvement',
    instructions: {
      android: `**Hoe gebruik je de nieuwe Fixi registratie:**

**1. Ga naar Fixi Meldingen tab:**
   - Open de Buurtconciërge app
   - Klik op "Meldingen" in het menu
   - Selecteer het "Fixi Meldingen" tab

**2. Registreer een melding:**
   - Klik op de paarse knop "📍 Registreer Melding"
   - Een popup opent met GPS functionaliteit

**3. GPS Locatie vastleggen:**
   - Klik op "📍 GPS Positie Vastleggen"
   - Sta locatietoegang toe als daarom wordt gevraagd
   - Wacht tot GPS locatie is gevonden (een paar seconden)
   - ✅ De app toont automatisch: "ter hoogte van [straat] [huisnummer]"

**4. Optioneel: Notitie toevoegen:**
   - Typ bijvoorbeeld: "Lantaarnpaal kapot" of "Zwerfvuil bij bushalte"
   - Dit helpt om later te weten wat de melding was

**5. Opslaan:**
   - Klik op "✅ Opslaan"
   - De melding verschijnt in de geschiedenis

**Voordelen:**
✅ Snelle registratie (30 seconden)
✅ Automatische locatiebepaling
✅ Overzicht van alle Fixi meldingen
✅ Bruikbaar voor statistieken

**Direct naar Fixi.nl:**
Je kunt ook nog steeds op "🔧 Open Fixi" klikken om direct een melding te maken op Fixi.nl`
    }
  },
  {
    id: '2025-11-20-achterpaden',
    version: '3.4.0',
    date: '20 november 2025',
    title: '🛤️ Achterpaden Module - Complete Vernieuwing',
    description: 'Volledige modernisering van de Achterpaden module met GPS tracking, veiligheid/onderhoud beoordelingen, bewoner enquêtes, statistieken en export functionaliteit.',
    type: 'feature'
  },
  {
    id: '2025-11-28-ai-stable',
    version: '3.3.9',
    date: '28 november 2025',
    title: '🤖 AI Model Upgrade',
    description: 'Overgestapt naar stabiele Gemini 1.5 Flash model voor betrouwbaardere AI functionaliteiten.',
    type: 'improvement'
  }
];

const UpdatesPage: React.FC = () => {
  const { currentUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<'updates' | 'feedback'>('updates');
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);
  
  // Feedback form state
  const [feedbackCategory, setFeedbackCategory] = useState('suggestie');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [myFeedback, setMyFeedback] = useState<Feedback[]>([]);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  
  // Admin reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'feedback' && currentUser) {
      loadMyFeedback();
      if (currentUser.role === 'Beheerder') {
        loadAllFeedback();
      }
    }
  }, [activeTab, currentUser]);

  const loadMyFeedback = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'feedback'),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const feedbackData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Feedback))
        .filter(f => f.userId === currentUser.id);
      setMyFeedback(feedbackData);
    } catch (error) {
      console.error('Fout bij laden feedback:', error);
    }
  };

  const loadAllFeedback = async () => {
    try {
      const q = query(
        collection(db, 'feedback'),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const feedbackData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Feedback));
      setAllFeedback(feedbackData);
    } catch (error) {
      console.error('Fout bij laden alle feedback:', error);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !feedbackMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: Timestamp.now(),
        category: feedbackCategory,
        message: feedbackMessage.trim(),
        status: 'new',
        replies: []
      });

      setFeedbackMessage('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      await loadMyFeedback();
      if (currentUser.role === 'Beheerder') {
        await loadAllFeedback();
      }
    } catch (error) {
      console.error('Fout bij versturen feedback:', error);
      alert('Er ging iets mis bij het versturen. Probeer het opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (feedbackId: string) => {
    if (!currentUser || !replyMessage.trim() || currentUser.role !== 'Beheerder') return;

    setIsReplying(true);
    try {
      const feedbackRef = doc(db, 'feedback', feedbackId);
      const newReply: FeedbackReply = {
        id: Date.now().toString(),
        adminId: currentUser.id,
        adminName: currentUser.name,
        timestamp: Timestamp.now(),
        message: replyMessage.trim()
      };

      await updateDoc(feedbackRef, {
        replies: arrayUnion(newReply)
      });

      setReplyMessage('');
      setReplyingTo(null);
      await loadMyFeedback();
      await loadAllFeedback();
    } catch (error) {
      console.error('Fout bij toevoegen reactie:', error);
      alert('Er ging iets mis bij het toevoegen van de reactie.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleUpdateStatus = async (feedbackId: string, newStatus: 'new' | 'reviewed' | 'implemented') => {
    if (!currentUser || currentUser.role !== 'Beheerder') return;

    try {
      const feedbackRef = doc(db, 'feedback', feedbackId);
      await updateDoc(feedbackRef, {
        status: newStatus
      });

      setEditingStatus(null);
      await loadMyFeedback();
      await loadAllFeedback();
    } catch (error) {
      console.error('Fout bij wijzigen status:', error);
      alert('Er ging iets mis bij het wijzigen van de status.');
    }
  };

  const getTypeIcon = (type: Update['type']) => {
    switch (type) {
      case 'feature': return '✨';
      case 'improvement': return '📈';
      case 'bugfix': return '🐛';
      case 'important': return '⚠️';
      default: return '📝';
    }
  };

  const getTypeBadge = (type: Update['type']) => {
    const styles = {
      feature: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      improvement: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      bugfix: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      important: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    
    const labels = {
      feature: 'Nieuw',
      improvement: 'Verbetering',
      bugfix: 'Bugfix',
      important: 'Belangrijk'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const getStatusBadge = (status: Feedback['status']) => {
    const styles = {
      new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      reviewed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      implemented: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    };
    
    const labels = {
      new: '📬 Nieuw',
      reviewed: '👀 Bekeken',
      implemented: '✅ Geïmplementeerd'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Updates & Feedback</h1>
        <p className="text-gray-600 dark:text-dark-text-secondary mt-2">
          Bekijk de nieuwste updates en deel jouw feedback
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('updates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'updates'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            📋 Updates & Wijzigingen
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'feedback'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            💬 Feedback Geven
          </button>
        </nav>
      </div>

      {/* Updates Tab */}
      {activeTab === 'updates' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  App Updates
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Hier vind je alle updates, nieuwe functies en belangrijke wijzigingen aan de app.
                  Instructies voor het installeren van updates worden hieronder weergegeven.
                </p>
              </div>
            </div>
          </div>

          {UPDATES.map((update) => (
            <div
              key={update.id}
              className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getTypeIcon(update.type)}</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {update.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {update.date}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                          v{update.version}
                        </span>
                      </div>
                    </div>
                  </div>
                  {getTypeBadge(update.type)}
                </div>

                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {update.description}
                </p>

                {update.instructions && (
                  <>
                    <button
                      onClick={() => setExpandedUpdate(expandedUpdate === update.id ? null : update.id)}
                      className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 font-medium text-sm flex items-center gap-2"
                    >
                      {expandedUpdate === update.id ? '▼' : '▶'} Gebruik instructies
                    </button>

                    {expandedUpdate === update.id && (
                      <div className="mt-4 space-y-4">
                        {/* Check if all platforms have same instructions (e.g., Fixi) */}
                        {update.instructions.android === update.instructions.ios && 
                         update.instructions.android === update.instructions.desktop ? (
                          <div className="bg-gray-50 dark:bg-dark-border border border-gray-200 dark:border-dark-border rounded-lg p-4">
                            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans">
                              {update.instructions.android}
                            </pre>
                          </div>
                        ) : (
                          <>
                            {update.instructions.android && (
                              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                                  📱 Android
                                </h4>
                                <pre className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap font-sans">
                                  {update.instructions.android}
                                </pre>
                              </div>
                            )}

                            {update.instructions.ios && (
                              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                                  🍎 iOS (iPhone/iPad)
                                </h4>
                                <pre className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap font-sans">
                                  {update.instructions.ios}
                                </pre>
                              </div>
                            )}

                            {update.instructions.desktop && (
                              <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                                  💻 Desktop (Windows/Mac)
                                </h4>
                                <pre className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap font-sans">
                                  {update.instructions.desktop}
                                </pre>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feedback Form */}
          <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              💬 Feedback Geven
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Heb je een idee om de app te verbeteren? Heb je een bug gevonden? Laat het ons weten!
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categorie
                </label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                >
                  <option value="suggestie">💡 Suggestie / Idee</option>
                  <option value="bug">🐛 Bug / Probleem</option>
                  <option value="vraag">❓ Vraag</option>
                  <option value="anders">📝 Anders</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Jouw feedback
                </label>
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Beschrijf hier je feedback, suggestie of probleem..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white resize-none"
                  rows={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !feedbackMessage.trim()}
                className="w-full px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? '⏳ Versturen...' : '📤 Verstuur Feedback'}
              </button>

              {submitSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    ✅ Feedback succesvol verstuurd! Bedankt voor je input.
                  </span>
                </div>
              )}
            </form>
          </div>

          {/* All Feedback (Beheerders only) */}
          {currentUser?.role === 'Beheerder' && (
            <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                💬 Alle Feedback van Gebruikers
              </h2>

              {allFeedback.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p>Nog geen feedback ontvangen</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allFeedback.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {fb.category === 'suggestie' && '💡 Suggestie'}
                            {fb.category === 'bug' && '🐛 Bug'}
                            {fb.category === 'vraag' && '❓ Vraag'}
                            {fb.category === 'anders' && '📝 Anders'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            van {fb.userName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingStatus === fb.id ? (
                            <select
                              value={fb.status}
                              onChange={(e) => handleUpdateStatus(fb.id, e.target.value as any)}
                              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg"
                            >
                              <option value="new">Nieuw</option>
                              <option value="reviewed">Bekeken</option>
                              <option value="implemented">Geïmplementeerd</option>
                            </select>
                          ) : (
                            <>
                              {getStatusBadge(fb.status)}
                              <button
                                onClick={() => setEditingStatus(fb.id)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Wijzig
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {fb.message}
                      </p>
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        {formatSafe(fb.timestamp, 'dd-MM-yyyy HH:mm', '—')}
                      </div>

                      {/* Replies */}
                      {fb.replies && fb.replies.length > 0 && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                          {fb.replies.map((reply) => (
                            <div key={reply.id} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                  👤 {reply.adminName}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatSafe(reply.timestamp, 'dd-MM HH:mm', '—')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {reply.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Admin reply form */}
                      <div className="mt-3">
                        {replyingTo === fb.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Typ je reactie..."
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddReply(fb.id)}
                                disabled={isReplying || !replyMessage.trim()}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                {isReplying ? 'Verzenden...' : 'Verstuur'}
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyMessage('');
                                }}
                                className="px-3 py-1 text-sm bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300"
                              >
                                Annuleer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyingTo(fb.id)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            💬 Reageer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Feedback History */}
          <div className="bg-white dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              📝 Mijn Feedback
            </h2>

            {myFeedback.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>Je hebt nog geen feedback gegeven</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {myFeedback.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {feedback.category === 'suggestie' && '💡 Suggestie'}
                        {feedback.category === 'bug' && '🐛 Bug'}
                        {feedback.category === 'vraag' && '❓ Vraag'}
                        {feedback.category === 'anders' && '📝 Anders'}
                      </span>
                      <div className="flex items-center gap-2">
                        {currentUser?.role === 'Beheerder' && editingStatus === feedback.id ? (
                          <select
                            value={feedback.status}
                            onChange={(e) => handleUpdateStatus(feedback.id, e.target.value as any)}
                            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-bg"
                          >
                            <option value="new">Nieuw</option>
                            <option value="reviewed">Bekeken</option>
                            <option value="implemented">Geïmplementeerd</option>
                          </select>
                        ) : (
                          <>
                            {getStatusBadge(feedback.status)}
                            {currentUser?.role === 'Beheerder' && (
                              <button
                                onClick={() => setEditingStatus(feedback.id)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Wijzig
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      {feedback.message}
                    </p>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {formatSafe(feedback.timestamp, 'dd-MM-yyyy HH:mm', '—')}
                    </div>

                    {/* Replies */}
                    {feedback.replies && feedback.replies.length > 0 && (
                      <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                        {feedback.replies.map((reply) => (
                          <div key={reply.id} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                👤 {reply.adminName}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatSafe(reply.timestamp, 'dd-MM HH:mm', '—')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {reply.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Admin reply form */}
                    {currentUser?.role === 'Beheerder' && (
                      <div className="mt-3">
                        {replyingTo === feedback.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Typ je reactie..."
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddReply(feedback.id)}
                                disabled={isReplying || !replyMessage.trim()}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                {isReplying ? 'Verzenden...' : 'Verstuur'}
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyMessage('');
                                }}
                                className="px-3 py-1 text-sm bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300"
                              >
                                Annuleer
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReplyingTo(feedback.id)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            💬 Reageer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdatesPage;
