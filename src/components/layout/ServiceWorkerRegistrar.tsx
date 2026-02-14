'use client';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';

export default function ServiceWorkerRegistrar() {
    const { toast } = useToast();
    const { t } = useLocale();

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                    
                    // Listen for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New content is available, show a toast.
                                    toast({
                                        title: t('updateAvailable'),
                                        description: t('newVersionDownloaded'),
                                        action: (
                                            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>{t('updateNow')}</Button>
                                        ),
                                        duration: Infinity, // Keep it open until user interacts
                                    });
                                }
                            });
                        }
                    });
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }
    }, [toast, t]);

    return null; // This component does not render anything.
}
