'use client';

import { useEffect, useRef } from 'react';
import { useUnityAds } from './UnityAdsProvider';

export default function UnityBannerAd() {
  const { isInitialized, config } = useUnityAds();
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isInitialized || !config?.bannerEnabled || !bannerRef.current) return;

    const placement = config.bannerPlacement || 'banner';
    const unityAds = (window as any).UnityAds;
    
    if (!unityAds) return;

    bannerRef.current.innerHTML = '';
    
    try {
        unityAds.loadBanner(placement, bannerRef.current.id);
    } catch (e) {
        console.warn("Unity Banner Load Error:", e);
    }

  }, [isInitialized, config]);

  if (!config?.enabled || !config.bannerEnabled) return null;

  const showManual = config.manualAdsEnabled && config.manualBannerImg;

  return (
    <div className="fixed bottom-24 left-0 right-0 flex justify-center pointer-events-none z-40 px-4">
        <div 
            id="unity-banner-placement" 
            ref={bannerRef}
            className="w-full max-w-sm min-h-12 bg-muted/50 backdrop-blur-sm pointer-events-auto rounded-xl overflow-hidden border flex items-center justify-center shadow-lg"
        >
            {showManual && bannerRef.current?.innerHTML === '' ? (
                <a href={config.manualBannerLink || '#'} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                    <img src={config.manualBannerImg} alt="Ad" className="w-full h-auto object-cover max-h-16" />
                </a>
            ) : (
                <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest p-2">إعلان</span>
            )}
        </div>
    </div>
  );
}
