'use client';

import { useEffect, useRef, useState } from 'react';
import { useUnityAds } from './UnityAdsProvider';

/**
 * Matured Adsterra injection component.
 * It strictly creates script elements manually to ensure immediate execution
 * once the data is loaded from Firebase.
 */
export default function UnityBannerAd() {
  const { config } = useUnityAds();
  const bannerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !config?.enabled || !config.adsterraEnabled || !config.nativeBannerScript || !bannerRef.current) return;

    const container = bannerRef.current;
    container.innerHTML = ''; 

    const injectAd = () => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<div>${config.nativeBannerScript}</div>`, 'text/html');
            const scripts = doc.querySelectorAll('script');
            
            // 1. Find and inject any static HTML container from Adsterra
            const adsterraContainer = doc.querySelector('div[id^="container-"]');
            if (adsterraContainer) {
                const newDiv = document.createElement('div');
                newDiv.id = adsterraContainer.id;
                container.appendChild(newDiv);
            } else {
                // If not a standard container, inject other non-script nodes
                doc.querySelector('div')?.childNodes.forEach(node => {
                    if (node.nodeName !== 'SCRIPT') container.appendChild(node.cloneNode(true));
                });
            }

            // 2. Programmatically create and execute script tags
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                if (oldScript.innerHTML) {
                    newScript.innerHTML = oldScript.innerHTML;
                }
                container.appendChild(newScript);
            });
        } catch (e) {
            console.error("Adsterra Injection Error:", e);
        }
    };

    const timer = setTimeout(injectAd, 1500);

    return () => {
        clearTimeout(timer);
        if (container) container.innerHTML = '';
    };
  }, [config?.nativeBannerScript, config?.enabled, config?.adsterraEnabled, mounted]);

  if (!config?.enabled || !mounted) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 flex justify-center pointer-events-none z-40 px-4">
        <div 
            ref={bannerRef}
            className="w-full max-w-sm min-h-[50px] pointer-events-auto flex flex-col items-center justify-center transition-all bg-card/5 rounded-xl overflow-hidden"
        />
    </div>
  );
}