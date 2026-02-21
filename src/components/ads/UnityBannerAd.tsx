'use client';

import { useEffect, useRef } from 'react';
import { useUnityAds } from './UnityAdsProvider';

export default function UnityBannerAd() {
  const { config } = useUnityAds();
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config?.enabled || !config.adsterraEnabled || !config.nativeBannerScript || !bannerRef.current) return;

    // Inject Native Banner Script into the container
    const container = bannerRef.current;
    container.innerHTML = ''; // Clear previous content
    
    const div = document.createElement('div');
    div.innerHTML = config.nativeBannerScript;
    
    // Extract scripts and execute them
    const scripts = div.querySelectorAll('script');
    scripts.forEach(s => {
        const newScript = document.createElement('script');
        if (s.src) newScript.src = s.src;
        if (s.innerHTML) newScript.innerHTML = s.innerHTML;
        container.appendChild(newScript);
    });

  }, [config]);

  if (!config?.enabled) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 flex justify-center pointer-events-none z-40 px-4">
        <div 
            ref={bannerRef}
            className="w-full max-w-sm min-h-[50px] bg-muted/30 backdrop-blur-md pointer-events-auto rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center shadow-2xl transition-all"
        >
            {config.manualAdsEnabled && config.manualBannerImg && !config.adsterraEnabled ? (
                <a href={config.manualBannerLink || '#'} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center">
                    <img src={config.manualBannerImg} alt="Ad" className="w-full h-auto object-cover max-h-16" />
                </a>
            ) : (
                <div className="flex flex-col items-center gap-1 opacity-40">
                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.3em]">Advertisement</span>
                </div>
            )}
        </div>
    </div>
  );
}
