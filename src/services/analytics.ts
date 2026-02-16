/**
 * Firebase Analytics Service
 * 
 * Gecentraliseerde tracking van user events en app usage via Firebase Analytics.
 * Werkt samen met de logger service voor complete monitoring.
 */

import { logEvent, setUserProperties, setUserId } from 'firebase/analytics';
import { analytics } from '../firebase';
import { logger } from './logger';

/**
 * Track een custom event
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (!analytics) {
    logger.info(`[Analytics disabled] Event: ${eventName}`, params);
    return;
  }

  try {
    logEvent(analytics, eventName, params);
    logger.debug(`Analytics event: ${eventName}`, params);
  } catch (error) {
    logger.error('Failed to log analytics event', error, { eventName, params });
  }
}

/**
 * Track wanneer een gebruiker inlogt
 */
export function trackLogin(method: 'email' | 'google' | 'phone' = 'email') {
  trackEvent('login', { method });
}

/**
 * Track wanneer een melding wordt aangemaakt
 */
export function trackMeldingCreated(categorie: string) {
  trackEvent('melding_created', { categorie });
}

/**
 * Track wanneer een project wordt aangemaakt
 */
export function trackProjectCreated(status: string) {
  trackEvent('project_created', { status });
}

/**
 * Track wanneer een dossier wordt aangemaakt
 */
export function trackDossierCreated(woningType?: string) {
  trackEvent('dossier_created', { woning_type: woningType || 'onbekend' });
}

/**
 * Track wanneer een gebruiker wordt uitgenodigd
 */
export function trackUserInvited(role: string) {
  trackEvent('user_invited', { role });
}

/**
 * Track wanneer uren worden geregistreerd
 */
export function trackUrenRegistered(hours: number, projectLinked: boolean) {
  trackEvent('uren_registered', { 
    hours: Math.round(hours * 100) / 100, 
    project_linked: projectLinked 
  });
}

/**
 * Track wanneer een document wordt geüpload
 */
export function trackDocumentUploaded(fileType: string, sizeKB: number) {
  trackEvent('document_uploaded', { 
    file_type: fileType,
    size_kb: Math.round(sizeKB)
  });
}

/**
 * Track wanneer een export wordt gegenereerd
 */
export function trackExport(exportType: 'pdf' | 'excel', dataType: string) {
  trackEvent('export_generated', { 
    export_type: exportType,
    data_type: dataType
  });
}

/**
 * Track wanneer de statistieken pagina wordt bezocht
 */
export function trackStatisticsViewed(chartType?: string) {
  trackEvent('statistics_viewed', { chart_type: chartType || 'overview' });
}

/**
 * Track wanneer de admin pagina wordt bezocht
 */
export function trackAdminPageViewed(tab?: string) {
  trackEvent('admin_page_viewed', { tab: tab || 'users' });
}

/**
 * Track search queries
 */
export function trackSearch(query: string, resultsCount: number) {
  trackEvent('search', { 
    search_term: query.substring(0, 50), // Limiteer privacy
    results_count: resultsCount 
  });
}

/**
 * Track errors (samenwerkend met logger)
 */
export function trackError(errorType: string, errorMessage: string, context?: Record<string, any>) {
  trackEvent('error_occurred', { 
    error_type: errorType,
    error_message: errorMessage.substring(0, 100),
    ...context
  });
}

/**
 * Set user properties (niet-PII)
 */
export function setAnalyticsUserProperties(properties: { role?: string; theme?: string }) {
  if (!analytics) {
    return;
  }

  try {
    setUserProperties(analytics, properties);
    logger.debug('Analytics user properties set', properties);
  } catch (error) {
    logger.error('Failed to set user properties', error);
  }
}

/**
 * Set user ID (gebruik GEEN email of echte naam)
 */
export function setAnalyticsUserId(userId: string) {
  if (!analytics) {
    return;
  }

  try {
    setUserId(analytics, userId);
    logger.debug('Analytics user ID set', { userId: userId.substring(0, 8) + '...' });
  } catch (error) {
    logger.error('Failed to set user ID', error);
  }
}

/**
 * Track page views (voor SPA routing)
 */
export function trackPageView(pageName: string, path: string) {
  trackEvent('page_view', { 
    page_title: pageName,
    page_path: path 
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsed(featureName: string, details?: Record<string, any>) {
  trackEvent('feature_used', { 
    feature_name: featureName,
    ...details 
  });
}
