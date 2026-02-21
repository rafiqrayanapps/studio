
'use client';

import { useEffect, useRef, useState } from 'react';
import { useUnityAds } from './UnityAdsProvider';

export default function UnityBannerAd() {
  const { config } = useUnityAds();
  const bannerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !config?.enabled || !config.adsterraEnabled || !config.nativeBannerScript || !bannerRef.current) return;

    const container = bannerRef.current;
    
    // Clean up previous attempts to avoid duplicate ads
    container.innerHTML = '';
    
    // 1. Create a document fragment to parse the script and container
    const parser = new DOMParser();
    const doc = parser.parseFromString(config.nativeBannerScript, 'text/html');
    
    // 2. Identify the target container ID and scripts
    const targetDiv = doc.querySelector('div');
    const scripts = doc.querySelectorAll('script');

    // 3. Inject the target div first (Crucial for Adsterra)
    if (targetDiv) {
        container.appendChild(targetDiv.cloneNode(true));
    } else {
        // If no div provided in script but expected, we might need a fallback or trust the script creates it
    }

    // 4. Inject scripts after container is in DOM
    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        
        // Copy all attributes (src, async, data-cfasync, etc.)
        Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });
        
        // Copy inline content if it's not an external script
        if (oldScript.innerHTML) {
            newScript.innerHTML = oldScript.innerHTML;
        }
        
        // Append to head or container? Most banner scripts prefer the container area
        container.appendChild(newScript);
    });

    return () => {
        if (container) container.innerHTML = '';
    };
  }, [config, isClient]);

  if (!config?.enabled || !isClient) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 flex justify-center pointer-events-none z-40 px-4">
        <div 
            ref={bannerRef}
            className="w-full max-w-sm min-h-[50px] bg-card/20 backdrop-blur-md pointer-events-auto rounded-2xl overflow-hidden border border-white/10 flex flex-col items-center justify-center shadow-2xl transition-all"
        >
            {/* Adsterra or Manual Ad content injected here */}
            {!config.adsterraEnabled && config.manualAdsEnabled && config.manualBannerImg ? (
                <a href={config.manualBannerLink || '#'} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center">
                    <img src={config.manualBannerImg} alt="Ad" className="w-full h-auto object-cover max-h-16" />
                </a>
            ) : !config.adsterraEnabled && (
                <div className="flex flex-col items-center gap-1 opacity-40 py-2">
                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.3em]">Advertisement Space</span>
                </div>
            )}
        </div>
    </div>
  );
}
