import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Urenregistratie, Project, ProjectStatus } from '../types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';

import { CalendarIcon, DownloadIcon, FolderIcon, TrendingUpIcon, XIcon, SaveIcon, SearchIcon, EditIcon, PlusIcon, MinusIcon } from '../components/Icons';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { toDate } from '../utils/dateHelpers';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const WIJKEN = ['Atol', 'Boswijk', 'Jol', 'Waterwijk', 'Zuiderzeewijk'];
const ACTIVITEITEN = ['Project', 'Wijkronde', 'Intern overleg', 'Extern overleg', 'Persoonlijke ontwikkeling', 'Overig'];

const UrenregistratiePage: React.FC = () => {
  const { currentUser, urenregistraties, addUrenregistratie, projecten } = useAppContext();
  

  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [activiteit, setActiviteit] = useState('');
  const [projectId, setProjectId] = useState('');
  const [wijk, setWijk] = useState('');
  const [overlegPartner, setOverlegPartner] = useState('');
  const [omschrijving, setOmschrijving] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [draft, setDraft] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { debouncedTerm: debouncedSearch, isSearching } = useSearchDebounce(searchTerm);
  const [filterActivity, setFilterActivity] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false); // New: toggle for showing the input form
  const [inputMode, setInputMode] = useState<'quick' | 'manual'>('quick'); // New: track input mode
  const [duration, setDuration] = useState(1); // New: duration in hours for quick mode

  // Auto-save draft functionality
  useEffect(() => {
    const savedDraft = localStorage.getItem('urenregistratie-draft');
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        setDraft(parsedDraft);
        
        // Auto-fill form if user wants to restore
        if (parsedDraft.startTime) setStartTime(parsedDraft.startTime);
        if (parsedDraft.endTime) setEndTime(parsedDraft.endTime);
        if (parsedDraft.activiteit) setActiviteit(parsedDraft.activiteit);
        if (parsedDraft.projectId) setProjectId(parsedDraft.projectId);
        if (parsedDraft.wijk) setWijk(parsedDraft.wijk);
        if (parsedDraft.overlegPartner) setOverlegPartner(parsedDraft.overlegPartner);
        if (parsedDraft.omschrijving) setOmschrijving(parsedDraft.omschrijving);
      } catch (e) {
        localStorage.removeItem('urenregistratie-draft');
      }
    }
  }, []);

  // Save draft automatically when form changes
  useEffect(() => {
    if (startTime || endTime || activiteit || projectId || wijk || overlegPartner || omschrijving) {
      const draftData = {
        startTime,
        endTime,
        activiteit,
        projectId,
        wijk,
        overlegPartner,
        omschrijving,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('urenregistratie-draft', JSON.stringify(draftData));
      setDraft(draftData);
    }
  }, [startTime, endTime, activiteit, projectId, wijk, overlegPartner, omschrijving]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem('urenregistratie-draft');
    setDraft(null);
  }, []);

  const resetForm = () => {
    setStartTime('');
    setEndTime('');
    setActiviteit('');
    setProjectId('');
    setWijk('');
    setOverlegPartner('');
    setOmschrijving('');
    setError('');
    setSuccessMessage('');
    setIsEditing(false);
    setEditingId(null);
    clearDraft();
  };

  // Duration adjustment functions
  const adjustDuration = useCallback((increment: number) => {
    const newDuration = Math.max(0.5, duration + increment);
    setDuration(newDuration);
    
    // Auto-apply the new duration if we have a start time
    if (startTime) {
      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + newDuration * 60 * 60 * 1000);
      
      const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${minute}`;
      };
      
      setEndTime(formatDateTime(endDate));
    }
  }, [duration, startTime]);

  const increaseDuration = useCallback(() => adjustDuration(0.5), [adjustDuration]);
  const decreaseDuration = useCallback(() => adjustDuration(-0.5), [adjustDuration]);

  // Auto-update end time when duration changes
  useEffect(() => {
    if (startTime && inputMode === 'quick') {
      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
      
      const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${minute}`;
      };
      
      setEndTime(formatDateTime(endDate));
    }
  }, [duration, startTime, inputMode]);

  // Helper to format duration display
  const formatDuration = (hours: number) => {
    if (hours === 0.5) return '30min';
    if (hours % 1 === 0) return `${hours}u`;
    const wholeHours = Math.floor(hours);
    const minutes = (hours - wholeHours) * 60;
    return `${wholeHours}u ${minutes}min`;
  };

  // Date helper functions for navigation
  const setToday = useCallback(() => {
    const today = new Date();
    const hour = 9; // Default start at 9 AM
    today.setHours(hour, 0, 0, 0);
    
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hour}:${minute}`;
    };

    setStartTime(formatDateTime(today));
    setEndTime('');
  }, []);

  const setYesterday = useCallback(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(9, 0, 0, 0);
    
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hour}:${minute}`;
    };

    setStartTime(formatDateTime(yesterday));
    setEndTime('');
  }, []);

  // Check for overlapping time registrations
  const checkForOverlap = useCallback((start: Date, end: Date) => {
    if (!currentUser) return null;
    
    const overlapping = urenregistraties.filter(reg => {
      if (reg.gebruikerId !== currentUser.id) return false;
      
      const regStart = toDate(reg.start);
      const regEnd = toDate(reg.eind);
      
      if (!regStart || !regEnd) return false;
      
      // Check if times overlap
      return (start < regEnd && end > regStart);
    });
    
    return overlapping.length > 0 ? overlapping : null;
  }, [currentUser, urenregistraties, toDate]);

  // Real-time validation
  const validationMessage = useMemo(() => {
    if (!startTime || !endTime) return null;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    
    if (start >= end) {
      return { type: 'error', message: 'Eindtijd moet na de starttijd liggen.' };
    }
    
    const overlapping = checkForOverlap(start, end);
    if (overlapping) {
      return { 
        type: 'warning', 
        message: `Let op: Deze tijd overlapt met ${overlapping.length} bestaande registratie(s).` 
      };
    }
    
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (duration > 12) {
      return { 
        type: 'warning', 
        message: `Let op: Dit is een lange werkdag (${duration.toFixed(1)} uur).` 
      };
    }
    
    return { type: 'success', message: `Duur: ${duration.toFixed(1)} uur` };
  }, [startTime, endTime, checkForOverlap]);

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!currentUser) return null;
    
    const userRegistraties = urenregistraties.filter(u => u.gebruikerId === currentUser.id);
    const now = new Date();
    
    // This week
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const thisWeek = userRegistraties.filter(u => {
      const start = toDate(u.start);
      return start && isWithinInterval(start, { start: weekStart, end: weekEnd });
    });
    
    // This month  
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const thisMonth = userRegistraties.filter(u => {
      const start = toDate(u.start);
      return start && isWithinInterval(start, { start: monthStart, end: monthEnd });
    });
    
    // Last month
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastMonth = userRegistraties.filter(u => {
      const start = toDate(u.start);
      return start && isWithinInterval(start, { start: lastMonthStart, end: lastMonthEnd });
    });
    
    const calculateTotalHours = (registraties: any[]) => {
      return registraties.reduce((total, u) => {
        const start = toDate(u.start);
        const end = toDate(u.eind);
        if (start && end) {
          return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }
        return total;
      }, 0);
    };
    
    return {
      thisWeekHours: calculateTotalHours(thisWeek),
      thisMonthHours: calculateTotalHours(thisMonth),
      lastMonthHours: calculateTotalHours(lastMonth),
      totalRegistraties: userRegistraties.length,
      averageHoursPerWeek: userRegistraties.length > 0 ? calculateTotalHours(userRegistraties) / Math.max(1, Math.ceil(userRegistraties.length / 7)) : 0
    };
  }, [currentUser, urenregistraties, toDate]);
  
  const formatOmschrijving = useCallback((uur: Urenregistratie) => {
    switch (uur.activiteit) {
        case 'Project':
            const projectInfo = `Project: ${uur.projectName || 'Onbekend'}`;
            return uur.omschrijving ? `${projectInfo} - ${uur.omschrijving}` : projectInfo;
        case 'Wijkronde':
            const wijkInfo = `Wijkronde: ${uur.wijk}`;
            return uur.omschrijving ? `${wijkInfo} - ${uur.omschrijving}` : wijkInfo;
        case 'Extern overleg':
            return `Extern overleg met: ${uur.overlegPartner}`;
        case 'Intern overleg':
            return uur.omschrijving || 'Intern overleg';
        case 'Persoonlijke ontwikkeling':
            return uur.omschrijving || 'Persoonlijke ontwikkeling';
        case 'Overig':
            return uur.omschrijving || 'Overige werkzaamheden';
        default:
            // Fallback for old data structure
            if (uur.omschrijving) {
                return uur.omschrijving;
            }
            return (uur as any).activiteit || '-';
    }
  }, []);

  const calculateDuration = useCallback((start: Date | null, end: Date | null) => {
    if (!start || !end) return '-';
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}u ${minutes}m`;
  }, []);

  // Check if registration can still be edited (within 7 days)
  const canEdit = useCallback((registratie: Urenregistratie) => {
    const start = toDate(registratie.start);
    if (!start) return false;
    
    const now = new Date();
    const daysDiff = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 14;
  }, [toDate]);

  // Start editing a registration
  const startEdit = useCallback((registratie: Urenregistratie) => {
    if (!canEdit(registratie)) return;
    
    const start = toDate(registratie.start);
    const end = toDate(registratie.eind);
    
    if (start && end) {
      const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${minute}`;
      };

      setStartTime(formatDateTime(start));
      setEndTime(formatDateTime(end));
      setActiviteit(registratie.activiteit);
      setProjectId(registratie.projectId || '');
      setWijk(registratie.wijk || '');
      setOverlegPartner(registratie.overlegPartner || '');
      setOmschrijving(registratie.omschrijving || '');
      setEditingId(registratie.id);
      setIsEditing(true);
      setShowForm(true);
      setError('');
      
      // Automatisch naar de top scrollen zodat het bewerkingsformulier in beeld komt
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [canEdit, toDate]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setIsEditing(false);
    resetForm();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startTime || !endTime || !activiteit) {
      setError('Starttijd, eindtijd en activiteit zijn verplicht.');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      setError('Eindtijd moet na de starttijd liggen.');
      return;
    }

    if (!currentUser) {
      setError('U moet ingelogd zijn om uren te registreren.');
      return;
    }

    const registrationData: Partial<Omit<Urenregistratie, 'id' | 'gebruikerId'>> & { start: Date; eind: Date; activiteit: Urenregistratie['activiteit']; } = {
      start,
      eind: end,
      activiteit: activiteit as Urenregistratie['activiteit'],
    };

    if (activiteit === 'Project') {
        if (!projectId) {
            setError('Selecteer een project.');
            return;
        }
        if (!omschrijving) {
            setError('Geef een omschrijving voor het project.');
            return;
        }
        const selectedProject = projecten.find(p => p.id === projectId);
        registrationData.projectId = projectId;
        registrationData.projectName = selectedProject?.title;
        registrationData.omschrijving = omschrijving;
    } else if (activiteit === 'Wijkronde') {
        if (!wijk) {
            setError('Selecteer een wijk.');
            return;
        }
        if (!omschrijving) {
            setError('Geef een omschrijving voor de wijkronde.');
            return;
        }
        registrationData.wijk = wijk as Urenregistratie['wijk'];
        registrationData.omschrijving = omschrijving;
    } else if (activiteit === 'Extern overleg') {
        if (!overlegPartner) {
            setError('Vul in met wie het externe overleg was.');
            return;
        }
        registrationData.overlegPartner = overlegPartner;
    } else if (activiteit === 'Persoonlijke ontwikkeling') {
        if (!omschrijving) {
            setError('Geef een omschrijving voor de persoonlijke ontwikkeling.');
            return;
        }
        registrationData.omschrijving = omschrijving;
    } else if (activiteit === 'Overig' || activiteit === 'Intern overleg') {
        if (!omschrijving) {
            setError('Geef een omschrijving voor de activiteit.');
            return;
        }
        registrationData.omschrijving = omschrijving;
    }

    try {
      if (isEditing && editingId) {
        // Update existing registration
        const docRef = doc(db, 'urenregistraties', editingId);
        const updateData = {
          start: Timestamp.fromDate(start),
          eind: Timestamp.fromDate(end),
          activiteit: registrationData.activiteit,
          ...(registrationData.projectId && { projectId: registrationData.projectId }),
          ...(registrationData.projectName && { projectName: registrationData.projectName }),
          ...(registrationData.wijk && { wijk: registrationData.wijk }),
          ...(registrationData.overlegPartner && { overlegPartner: registrationData.overlegPartner }),
          ...(registrationData.omschrijving && { omschrijving: registrationData.omschrijving }),
        };
        
        await updateDoc(docRef, updateData);
        setIsEditing(false);
        setEditingId(null);
        setSuccessMessage('Uren wijziging is succesvol opgeslagen!');
      } else {
        // Create new registration
        await addUrenregistratie(registrationData);
        setSuccessMessage('Uren registratie is succesvol opgeslagen!');
      }
      
      // Clear form and show success message
      setError('');
      setStartTime('');
      setEndTime('');
      setActiviteit('');
      setProjectId('');
      setWijk('');
      setOverlegPartner('');
      setOmschrijving('');
      setInputMode('quick');
      setDuration(1);
      clearDraft();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(isEditing ? 'Er is een fout opgetreden bij het wijzigen van de uren.' : 'Er is een fout opgetreden bij het opslaan van de uren.');
      console.error(err);
    }
  };

  const userUren = (urenregistraties || [])
    .filter(u => u.gebruikerId === currentUser?.id)
    .sort((a, b) => {
      const sa = toDate(a.start)?.getTime() ?? 0;
      const sb = toDate(b.start)?.getTime() ?? 0;
      return sb - sa;
    });

  // Filtered data for table
  const filteredUren = useMemo(() => {
    let filtered = userUren;
    
    // Search filter (debounced)
    if (debouncedSearch) {
      filtered = filtered.filter(uur => {
        const omschrijving = formatOmschrijving(uur).toLowerCase();
        return omschrijving.includes(debouncedSearch.toLowerCase());
      });
    }
    
    // Activity filter
    if (filterActivity) {
      filtered = filtered.filter(uur => uur.activiteit === filterActivity);
    }
    
    // Date range filter
    if (filterDateRange) {
      const now = new Date();
      let startDate: Date;
      
      switch (filterDateRange) {
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'last-month':
          startDate = startOfMonth(subMonths(now, 1));
          break;
        default:
          return filtered;
      }
      
      filtered = filtered.filter(uur => {
        const start = toDate(uur.start);
        if (!start) return false;
        
        if (filterDateRange === 'last-month') {
          const endDate = endOfMonth(subMonths(now, 1));
          return isWithinInterval(start, { start: startDate, end: endDate });
        }
        
        return start >= startDate;
      });
    }
    
    return filtered;
  }, [userUren, debouncedSearch, filterActivity, filterDateRange, formatOmschrijving, toDate]);

  // Export functionality
  const exportToCSV = useCallback((data: any[]) => {
    if (data.length === 0) return;
    
    const headers = ['Datum', 'Starttijd', 'Eindtijd', 'Duur', 'Activiteit', 'Details'];
    const rows = data.map(uur => {
      const start = toDate(uur.start);
      const end = toDate(uur.eind);
      return [
        start ? format(start, 'dd-MM-yyyy') : '',
        start ? format(start, 'HH:mm') : '',
        end ? format(end, 'HH:mm') : '',
        calculateDuration(start, end),
        uur.activiteit,
        formatOmschrijving(uur)
      ];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `urenregistratie-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  }, [toDate, formatOmschrijving, calculateDuration]);

  // PDF Export functionality
  const exportToPDF = useCallback((data: any[]) => {
    try {
      if (data.length === 0) {
        alert('Geen data om te exporteren.');
        return;
      }
      
      const pdf = new jsPDF();
      
      // Title
      pdf.setFontSize(18);
      pdf.text('Urenregistratie', 20, 20);
      
      // Date range
      pdf.setFontSize(12);
      pdf.text(`Gegenereerd op: ${format(new Date(), 'dd-MM-yyyy HH:mm')}`, 20, 30);
      
      // Table data
      const tableData = data.map(uur => {
        const start = toDate(uur.start);
        const end = toDate(uur.eind);
        return [
          start ? format(start, 'dd-MM-yyyy') : '',
          start ? format(start, 'HH:mm') : '',
          end ? format(end, 'HH:mm') : '',
          calculateDuration(start, end),
          uur.activiteit || '',
          formatOmschrijving(uur) || ''
        ];
      });
      
      // Check if autoTable is available
      if (typeof autoTable === 'function') {
        // Add table using autoTable
        autoTable(pdf, {
          head: [['Datum', 'Start', 'Eind', 'Duur', 'Activiteit', 'Details']],
          body: tableData,
          startY: 40,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [66, 139, 202] },
          columnStyles: {
            0: { cellWidth: 25 }, // Datum
            1: { cellWidth: 20 }, // Start
            2: { cellWidth: 20 }, // Eind
            3: { cellWidth: 20 }, // Duur
            4: { cellWidth: 30 }, // Activiteit
            5: { cellWidth: 'auto' } // Details
          }
        });
      } else {
        // Fallback: simple text output
        let yPosition = 50;
        pdf.setFontSize(10);
        pdf.text('Datum | Start | Eind | Duur | Activiteit | Details', 20, yPosition);
        yPosition += 10;
        
        tableData.forEach((row) => {
          if (yPosition > 280) { // New page if needed
            pdf.addPage();
            yPosition = 20;
          }
          const text = row.join(' | ');
          pdf.text(text.substring(0, 80), 20, yPosition); // Limit text length
          yPosition += 8;
        });
      }
      
      // Save the PDF
      const fileName = `urenregistratie-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Fout bij het genereren van PDF:', error);
      alert('Er is een fout opgetreden bij het genereren van de PDF. Probeer het opnieuw.');
    }
  }, [toDate, formatOmschrijving, calculateDuration]);

  const lopendeProjecten = projecten.filter(p => p.status === ProjectStatus.Lopend);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Urenregistratie</h1>
        <p className="text-gray-600 dark:text-gray-400">Beheer en analyseer je gewerkte uren</p>
      </div>

      {/* Beautiful Visual Dashboard */}
      {!showForm && !isEditing && (
        <div className="space-y-6 mb-8">
          {/* Hero Stats Cards */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Deze Week</p>
                    <p className="text-3xl font-bold">{analytics.thisWeekHours.toFixed(1)}u</p>
                    <p className="text-blue-100 text-xs mt-1">deze week</p>
                  </div>
                  <div className="bg-blue-400/30 p-3 rounded-full">
                    <CalendarIcon className="w-8 h-8" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Deze Maand</p>
                    <p className="text-3xl font-bold">{analytics.thisMonthHours.toFixed(1)}u</p>
                    <p className="text-green-100 text-xs mt-1">lopende maand</p>
                  </div>
                  <div className="bg-green-400/30 p-3 rounded-full">
                    <TrendingUpIcon className="w-8 h-8" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Totaal Sessies</p>
                    <p className="text-3xl font-bold">{analytics.totalRegistraties}</p>
                    <p className="text-purple-100 text-xs mt-1">geregistreerd</p>
                  </div>
                  <div className="bg-purple-400/30 p-3 rounded-full">
                    <FolderIcon className="w-8 h-8" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Gemiddeld/Week</p>
                    <p className="text-3xl font-bold">{analytics.averageHoursPerWeek.toFixed(1)}u</p>
                    <p className="text-orange-100 text-xs mt-1">per week</p>
                  </div>
                  <div className="bg-orange-400/30 p-3 rounded-full">
                    <SearchIcon className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Snelle Acties</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowForm(true)}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-4 rounded-xl font-medium transform hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center gap-3"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Nieuwe Uren Invoeren
                  </button>
                  
                  <button
                    onClick={() => exportToPDF(userUren)}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-medium transform hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center gap-3"
                  >
                    <DownloadIcon className="w-5 h-5" />
                    Export PDF
                  </button>
                  
                  <button
                    onClick={() => exportToCSV(userUren)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-medium transform hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center gap-3"
                  >
                    <DownloadIcon className="w-5 h-5" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recente Activiteit</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {userUren.slice(0, 5).map((uur) => {
                    const start = toDate(uur.start);
                    const end = toDate(uur.eind);
                    return (
                      <div
                        key={uur.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {uur.activiteit}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {start ? format(start, 'dd MMM yyyy, HH:mm') : ''} - {calculateDuration(start, end)}
                              </p>
                            </div>
                          </div>
                        </div>
                        {canEdit(uur) ? (
                          <button
                            onClick={() => startEdit(uur)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 p-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800"
                            title="Wijzigen (nog mogelijk voor 14 dagen)"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="opacity-50">
                            <div className="bg-gray-100 dark:bg-gray-700 text-gray-400 p-2 rounded-lg" title="Niet meer wijzigbaar (ouder dan 14 dagen)">
                              <EditIcon className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {userUren.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nog geen uren geregistreerd</p>
                      <p className="text-sm">Klik op "Nieuwe Uren Invoeren" om te beginnen</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Form - Only show when showForm is true or editing */}
      {(showForm || isEditing) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Uren wijzigen' : 'Nieuwe uren invoeren'}
            </h2>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  <XIcon className="w-4 h-4" />
                  Sluiten
                </button>
              )}
              {isEditing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                >
                  <XIcon className="w-4 h-4" />
                  Annuleren
                </button>
              )}
              {draft && !isEditing && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                    <SaveIcon className="w-4 h-4" />
                    <span>Draft opgeslagen</span>
                  </div>
                <button
                  type="button"
                  onClick={clearDraft}
                  className="text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  title="Verwijder draft"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-500">{error}</p>}
          {successMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {successMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Input Mode Toggle - only when not editing */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => { setInputMode('quick'); setError(''); setSuccessMessage(''); }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      inputMode === 'quick'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Snelle Keuze
                  </button>
                  <button
                    type="button"
                    onClick={() => { setInputMode('manual'); setError(''); setSuccessMessage(''); }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      inputMode === 'manual'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Handmatig
                  </button>
                </div>
              </div>

              {/* Quick Mode */}
              {inputMode === 'quick' && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Datum</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={setToday}
                        className="px-4 py-3 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 rounded-lg flex items-center justify-center gap-2 font-medium"
                      >
                        <CalendarIcon className="w-4 h-4" />
                        Vandaag
                      </button>
                      <button
                        type="button"
                        onClick={setYesterday}
                        className="px-4 py-3 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 rounded-lg flex items-center justify-center gap-2 font-medium"
                      >
                        <CalendarIcon className="w-4 h-4" />
                        Gisteren
                      </button>
                    </div>
                  </div>
                  
                  {/* Start Time Quick Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Starttijd *
                    </label>
                    <input
                      type="time"
                      value={startTime ? format(new Date(startTime), 'HH:mm') : ''}
                      onChange={(e) => {
                        if (e.target.value && startTime) {
                          const currentDate = new Date(startTime);
                          const [hours, minutes] = e.target.value.split(':');
                          currentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                          
                          const formatDateTime = (date: Date) => {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hour = String(date.getHours()).padStart(2, '0');
                            const minute = String(date.getMinutes()).padStart(2, '0');
                            return `${year}-${month}-${day}T${hour}:${minute}`;
                          };
                          
                          setStartTime(formatDateTime(currentDate));
                        } else if (e.target.value) {
                          // If no startTime set yet, create one based on today
                          const today = new Date();
                          const [hours, minutes] = e.target.value.split(':');
                          today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                          
                          const formatDateTime = (date: Date) => {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hour = String(date.getHours()).padStart(2, '0');
                            const minute = String(date.getMinutes()).padStart(2, '0');
                            return `${year}-${month}-${day}T${hour}:${minute}`;
                          };
                          
                          setStartTime(formatDateTime(today));
                        }
                      }}
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      required
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tijdsduur</h3>
                    
                    {/* Duration Picker */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <button
                          type="button"
                          onClick={decreaseDuration}
                          disabled={duration <= 0.5 || !startTime}
                          className="w-12 h-12 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 text-white rounded-full flex items-center justify-center font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 disabled:transform-none disabled:shadow-md"
                          title={!startTime ? "Stel eerst een starttijd in" : "30 minuten korter"}
                        >
                          <MinusIcon className="w-6 h-6" />
                        </button>
                        
                        <div className="text-center min-w-[100px] mx-4">
                          <div className={`text-4xl font-bold transition-colors ${startTime ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'text-gray-400 dark:text-gray-500'}`}>
                            {formatDuration(duration)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            totale tijd
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={increaseDuration}
                          disabled={!startTime}
                          className="w-12 h-12 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 text-white rounded-full flex items-center justify-center font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 disabled:transform-none disabled:shadow-md"
                          title={!startTime ? "Stel eerst een starttijd in" : "30 minuten langer"}
                        >
                          <PlusIcon className="w-6 h-6" />
                        </button>
                      </div>
                      
                      {/* Validation message when no start time is set */}
                      {!startTime && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center font-medium">
                            ⚠️ Stel eerst een starttijd in om de duur te kunnen bepalen
                          </p>
                        </div>
                      )}
                      
                      {/* Status when time is set */}
                      {startTime && endTime && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <p className="text-sm text-green-700 dark:text-green-300 text-center font-medium">
                            ✅ Tijd ingesteld: {format(new Date(startTime), 'HH:mm')} - {format(new Date(endTime), 'HH:mm')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show validation feedback */}
          {validationMessage && (
            <div className={`p-3 rounded-md text-sm ${
              validationMessage.type === 'error' 
                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                : validationMessage.type === 'warning'
                ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
            }`}>
              {validationMessage.message}
            </div>
          )}
          
          {/* Manual input or editing mode - always show datetime inputs when editing or in manual mode */}
          {(isEditing || inputMode === 'manual') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Starttijd</label>
                <input 
                  type="datetime-local" 
                  id="start-time" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                  className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-base" 
                  required 
                />
              </div>
              <div>
                <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eindtijd</label>
                <input 
                  type="datetime-local" 
                  id="end-time" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                  className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-base" 
                  required 
                />
              </div>
            </div>
          )}

          {/* Quick mode summary - show current selection */}
          {!isEditing && inputMode === 'quick' && startTime && endTime && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Geselecteerd:</strong> {format(new Date(startTime), 'dd-MM-yyyy HH:mm')} tot {format(new Date(endTime), 'HH:mm')} 
                ({calculateDuration(new Date(startTime), new Date(endTime))})
              </p>
            </div>
          )}
          
          {/* Form fields */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="activiteit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Activiteit</label>
              <select id="activiteit" value={activiteit} onChange={(e) => { setActiviteit(e.target.value); setOmschrijving(''); setProjectId(''); setWijk(''); setOverlegPartner(''); setError(''); setSuccessMessage(''); }} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-base" required>
                <option value="">Kies een activiteit</option>
                {ACTIVITEITEN.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

          {activiteit === 'Project' && (
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project</label>
              <select id="project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-base" required>
                <option value="">Kies een lopend project</option>
                {lopendeProjecten.map((p: Project) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}

          {activiteit === 'Wijkronde' && (
            <div>
              <label htmlFor="wijk" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Wijk</label>
              <select id="wijk" value={wijk} onChange={(e) => setWijk(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-base" required>
                <option value="">Kies een wijk</option>
                {WIJKEN.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          )}

          {activiteit === 'Extern overleg' && (
            <div>
              <label htmlFor="overlegPartner" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Extern overleg met</label>
              <input type="text" id="overlegPartner" value={overlegPartner} onChange={(e) => setOverlegPartner(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-base" placeholder="Naam/organisatie" required />
            </div>
          )}
          
          {(activiteit === 'Overig' || activiteit === 'Intern overleg' || activiteit === 'Project' || activiteit === 'Wijkronde' || activiteit === 'Persoonlijke ontwikkeling') && (
            <div>
              <label htmlFor="omschrijving" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Omschrijving</label>
              <textarea id="omschrijving" rows={3} value={omschrijving} onChange={(e) => setOmschrijving(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-base resize-none" placeholder="Korte beschrijving..." required></textarea>
            </div>
          )}

          <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-base font-medium">
            {isEditing ? 'Wijzigingen opslaan' : 'Opslaan'}
          </button>
          </div>
        </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Mijn Geregistreerde Uren</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => exportToCSV(filteredUren)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm w-full sm:w-auto"
              disabled={filteredUren.length === 0}
            >
              <DownloadIcon className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={() => exportToPDF(filteredUren)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm w-full sm:w-auto"
              disabled={filteredUren.length === 0}
            >
              <DownloadIcon className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col space-y-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Zoek in activiteiten..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-base"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={filterActivity}
                onChange={(e) => setFilterActivity(e.target.value)}
                className="px-4 py-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-base"
              >
                <option value="">Alle activiteiten</option>
                {ACTIVITEITEN.map(activity => (
                  <option key={activity} value={activity}>{activity}</option>
                ))}
              </select>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="px-4 py-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-base"
              >
                <option value="">Alle data</option>
                <option value="week">Deze week</option>
                <option value="month">Deze maand</option>
                <option value="last-month">Vorige maand</option>
              </select>
            </div>
          </div>
          {(searchTerm || filterActivity || filterDateRange) && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FolderIcon className="w-4 h-4" />
              <span>{filteredUren.length} van {userUren.length} registraties</span>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterActivity('');
                  setFilterDateRange('');
                }}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                Wis filters
              </button>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto -mx-6 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Datum</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tijd</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duur</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Activiteit</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acties</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUren.length > 0 ? (
                    filteredUren.map((uur) => {
                      const s = toDate(uur.start);
                      const e = toDate(uur.eind);
                      return (
                        <tr key={uur.id} className={canEdit(uur) ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'opacity-75'}>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              {s ? format(s, 'dd-MM-yyyy') : '-'}
                              {canEdit(uur) && (
                                <div className="w-2 h-2 bg-green-400 rounded-full" title="Nog wijzigbaar (tot 14 dagen)"></div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">{s && e ? `${format(s, 'HH:mm')} - ${format(e, 'HH:mm')}` : '-'}</td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">{calculateDuration(s, e)}</td>
                          <td className="px-3 sm:px-6 py-4 text-sm">{formatOmschrijving(uur)}</td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                            {canEdit(uur) ? (
                              <button
                                onClick={() => startEdit(uur)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Wijzigen (nog mogelijk voor 14 dagen)"
                              >
                                <EditIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Wijzig</span>
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">
                                <span className="hidden sm:inline">Niet meer wijzigbaar</span>
                                <span className="sm:hidden">-</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 sm:px-6 py-4 text-center text-sm text-gray-500">Nog geen uren geregistreerd.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrenregistratiePage;
