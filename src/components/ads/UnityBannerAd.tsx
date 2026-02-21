'use client';

import { useEffect, useRef } from 'react';
import { useUnityAds } from './UnityAdsProvider';

export default function UnityBannerAd() {
  const { config } = useUnityAds();
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config?.enabled || !config.adsterraEnabled || !config.nativeBannerScript || !bannerRef.current) return;

    // Clear previous content
    const container = bannerRef.current;
    container.innerHTML = '';
    
    // Create a temporary element to parse the string
    const parser = new DOMParser();
    const doc = parser.parseFromString(config.nativeBannerScript, 'text/html');
    
    // 1. First, append all non-script elements (like the div container)
    const elements = Array.from(doc.body.childNodes);
    elements.forEach(el => {
        if (el.nodeName !== 'SCRIPT') {
            container.appendChild(el.cloneNode(true));
        }
    });

    // 2. Then, append the scripts one by one to trigger execution
    elements.forEach(el => {
        if (el.nodeName === 'SCRIPT') {
            const scriptEl = el as HTMLScriptElement;
            const newScript = document.createElement('script');
            
            // Copy all attributes (src, async, data-cfasync, etc.)
            Array.from(scriptEl.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            
            if (scriptEl.innerHTML) {
                newScript.innerHTML = scriptEl.innerHTML;
            }
            
            container.appendChild(newScript);
        }
    });

  }, [config]);

  if (!config?.enabled) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 flex justify-center pointer-events-none z-40 px-4">
        <div 
            ref={bannerRef}
            className="w-full max-w-sm min-h-[50px] bg-card/20 backdrop-blur-md pointer-events-auto rounded-2xl overflow-hidden border border-white/10 flex flex-col items-center justify-center shadow-2xl transition-all"
        >
            {!config.adsterraEnabled && config.manualAdsEnabled && config.manualBannerImg ? (
                <a href={config.manualBannerLink || '#'} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center">
                    <img src={config.manualBannerImg} alt="Ad" className="w-full h-auto object-cover max-h-16" />
                </a>
            ) : !config.adsterraEnabled && (
                <div className="flex flex-col items-center gap-1 opacity-40 py-2">
                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.3em]">Advertisement</span>
                </div>
            )}
        </div>
    </div>
  );
}
