import { usePathname, useRouter } from 'expo-router';
import { App } from 'expo-router/build/qualified-entry';
import React, { memo, useEffect, useState } from 'react';
import { ErrorBoundaryWrapper } from './__create/SharedErrorBoundary';
import './src/__create/polyfills';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { AlertModal } from './polyfills/web/alerts.web';
import './global.css';

// Reporter global d'erreurs
const GlobalErrorReporter = () => {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    // Gestionnaire d'erreurs
    const errorHandler = (event: ErrorEvent) => {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      console.error(event.error);
    };
    // Gestionnaire de rejets de promesses non gérés
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      console.error('Rejet de promesse non géré :', event.reason);
    };
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    };
  }, []);
  return null;
};

// Composant Wrapper memoïsé
const Wrapper = memo(() => {
  return (
    <ErrorBoundaryWrapper>
      <SafeAreaProvider
        initialMetrics={{
          insets: { top: 64, bottom: 34, left: 0, right: 0 },
          frame: {
            x: 0,
            y: 0,
            // Définit la largeur et la hauteur en fonction de la taille de la fenêtre si elle est disponible
            width: typeof window === 'undefined' ? 390 : window.innerWidth,
            height: typeof window === 'undefined' ? 844 : window.innerHeight,
          },
        }}
      >
        <App />
        <GlobalErrorReporter />
        <Toaster />
      </SafeAreaProvider>
    </ErrorBoundaryWrapper>
  );
});

// Réponse saine pour la vérification de l'état
const healthyResponse = {
  type: 'sandbox:mobile:healthcheck:response',
  healthy: true,
};

// Hook pour la communication avec la fenêtre parent
const useHandshakeParent = () => {
  useEffect(() => {
    // Gestionnaire de messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'sandbox:mobile:healthcheck') {
        window.parent.postMessage(healthyResponse, '*');
      }
    };
    window.addEventListener('message', handleMessage);
    // Répond immédiatement à la fenêtre parent avec une réponse saine au cas où nous aurions manqué le message de vérification de l'état
    window.parent.postMessage(healthyResponse, '*');
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);
};

// Composant principal de l'application
const CreateApp = () => {
  const router = useRouter();
  const pathname = usePathname();
  useHandshakeParent();

  useEffect(() => {
    // Gestionnaire de messages pour la navigation
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'sandbox:navigation' && event.data.pathname !== pathname) {
        router.push(event.data.pathname);
      }
    };

    window.addEventListener('message', handleMessage);
    // Envoie un message à la fenêtre parent indiquant que l'application mobile est prête
    window.parent.postMessage({ type: 'sandbox:mobile:ready' }, '*');
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [router, pathname]);

  useEffect(() => {
    // Envoie un message à la fenêtre parent avec le nouveau chemin d'accès lors de la navigation
    window.parent.postMessage(
      {
        type: 'sandbox:mobile:navigation',
        pathname,
      },
      '*'
    );
  }, [pathname]);

  return (
    <>
      <Wrapper />
      <AlertModal />
    </>
  );
};

export default CreateApp;
