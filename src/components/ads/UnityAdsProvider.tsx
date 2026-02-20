'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AdsConfig } from '@/lib/definitions';

interface UnityAdsContextType {
  isInitialized: boolean;
  config: AdsConfig | null;
  showInterstitial: () => void;
  showRewarded: (onComplete: () => void) => void;
}

const UnityAdsContext = createContext<UnityAdsContextType | undefined>(undefined);

export function UnityAdsProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const firestore = useFirestore();
  
  const adsConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'ads') : null, [firestore]);
  const { data: config } = useDoc<AdsConfig>(adsConfigRef);

  useEffect(() => {
    if (!config?.enabled || !config.gameId || isInitialized) return;

    // Load Unity Ads Web SDK
    const script = document.createElement('script');
    script.src = 'https://web-sdk.unityads.unity3d.com/v1/UnityAds.js';
    script.async = true;
    script.onload = () => {
      const unityAds = (window as any).UnityAds;
      if (unityAds) {
        // Use standard initialization for Web SDK
        try {
            unityAds.init(config.gameId, false, {
                onComplete: () => {
                    console.log('Unity Ads Initialized Successfully');
                    setIsInitialized(true);
                },
                onFailed: (error: any, message: any) => {
                    console.error('Unity Ads Init Failed:', error, message);
                }
            });
        } catch (e) {
            console.error('Unity Ads SDK call error:', e);
        }
      }
    };
    script.onerror = () => {
        console.error('Failed to load Unity Ads script. AdBlocker might be active.');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [config, isInitialized]);

  const showInterstitial = () => {
    if (!isInitialized || !config?.interstitialEnabled) return;
    const placement = config.interstitialPlacement || 'video';
    const unityAds = (window as any).UnityAds;
    if (unityAds && unityAds.isReady(placement)) {
        unityAds.show(placement);
    }
  };

  const showRewarded = (onComplete: () => void) => {
    const unityAds = (window as any).UnityAds;
    if (!isInitialized || !config?.rewardedEnabled || !unityAds) {
        // Fallback for dev or when disabled
        onComplete();
        return;
    }
    const placement = config.rewardedPlacement || 'rewardedVideo';
    
    if (unityAds.isReady(placement)) {
        unityAds.show(placement, {
          onComplete: () => {
            onComplete();
          },
          onSkipped: () => {
            console.log('Ad Skipped');
          },
          onError: (err: any) => {
            console.error('Ad Error:', err);
          }
        });
    } else {
        toast({ title: "الإعلان غير جاهز", description: "يرجى المحاولة مرة أخرى بعد قليل." });
    }
  };

  return (
    <UnityAdsContext.Provider value={{ isInitialized, config: config || null, showInterstitial, showRewarded }}>
      {children}
    </UnityAdsContext.Provider>
  );
}

export function useUnityAds() {
  const context = useContext(UnityAdsContext);
  if (context === undefined) {
    throw new Error('useUnityAds must be used within a UnityAdsProvider');
  }
  return context;
}
