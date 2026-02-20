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

    // Clear previous banner if any
    bannerRef.current.innerHTML = '';
    
    try {
        unityAds.loadBanner(placement, bannerRef.current.id);
    } catch (e) {
        console.warn("Unity Banner Load Error:", e);
    }

  }, [isInitialized, config]);

  if (!config?.enabled || !config.bannerEnabled) return null;

  return (
    <div className="fixed bottom-28 left-0 right-0 flex justify-center pointer-events-none z-40">
        <div 
            id="unity-banner-placement" 
            ref={bannerRef}
            className="w-full max-w-sm h-12 bg-muted/50 backdrop-blur-sm pointer-events-auto rounded-lg overflow-hidden border flex items-center justify-center text-[10px] text-muted-foreground font-bold shadow-lg"
        >
            {/* Banner renders here */}
            إعلان جاري التحميل...
        </div>
    </div>
  );
}
