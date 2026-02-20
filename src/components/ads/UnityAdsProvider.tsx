'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AdsConfig } from '@/lib/definitions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, Clock, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UnityAdsContextType {
  isInitialized: boolean;
  config: AdsConfig | null;
  showInterstitial: () => void;
  showRewarded: (onComplete: () => void) => void;
}

const UnityAdsContext = createContext<UnityAdsContextType | undefined>(undefined);

export function UnityAdsProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showManualInterstitial, setShowManualInterstitial] = useState(false);
  const [showManualRewarded, setShowManualRewarded] = useState(false);
  const [rewardedCountdown, setRewardedCountdown] = useState(0);
  const [onRewardedComplete, setOnRewardedComplete] = useState<(() => void) | null>(null);
  const { toast } = useToast();
  
  const firestore = useFirestore();
  const adsConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'ads') : null, [firestore]);
  const { data: config } = useDoc<AdsConfig>(adsConfigRef);

  useEffect(() => {
    if (!config?.enabled || !config.gameId || isInitialized) return;

    const script = document.createElement('script');
    script.src = 'https://web-sdk.unityads.unity3d.com/v1/UnityAds.js';
    script.async = true;
    script.onload = () => {
      const unityAds = (window as any).UnityAds;
      if (unityAds) {
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
        console.error('Failed to load Unity Ads script.');
    };
    document.head.appendChild(script);
  }, [config, isInitialized]);

  const showInterstitial = () => {
    if (!config?.enabled) return;
    
    const unityAds = (window as any).UnityAds;
    const placement = config.interstitialPlacement || 'video';

    if (isInitialized && config.interstitialEnabled && unityAds?.isReady(placement)) {
        unityAds.show(placement);
    } else if (config.manualAdsEnabled && config.manualInterstitialImg) {
        setShowManualInterstitial(true);
    }
  };

  const showRewarded = (onComplete: () => void) => {
    if (!config?.enabled) {
        onComplete();
        return;
    }

    const unityAds = (window as any).UnityAds;
    const placement = config.rewardedPlacement || 'rewardedVideo';
    
    if (isInitialized && config.rewardedEnabled && unityAds?.isReady(placement)) {
        unityAds.show(placement, {
          onComplete: () => onComplete(),
          onSkipped: () => toast({ title: "تم تخطي الإعلان", description: "لم يتم إضافة نقاط لأنك لم تكمل المشاهدة." }),
          onError: () => {
              if (config.manualAdsEnabled) {
                  startManualRewarded(onComplete);
              } else {
                  toast({ title: "عذراً", description: "الإعلانات غير متوفرة حالياً." });
              }
          }
        });
    } else if (config.manualAdsEnabled) {
        startManualRewarded(onComplete);
    } else {
        toast({ title: "الإعلان غير جاهز", description: "يرجى المحاولة مرة أخرى بعد قليل." });
    }
  };

  const startManualRewarded = (callback: () => void) => {
      setOnRewardedComplete(() => callback);
      setRewardedCountdown(10); // 10 seconds for manual rewarded
      setShowManualRewarded(true);
  };

  useEffect(() => {
      if (showManualRewarded && rewardedCountdown > 0) {
          const timer = setTimeout(() => setRewardedCountdown(c => c - 1), 1000);
          return () => clearTimeout(timer);
      } else if (showManualRewarded && rewardedCountdown === 0) {
          if (onRewardedComplete) {
              onRewardedComplete();
              setOnRewardedComplete(null);
              toast({ title: "مبروك! 🎉", description: "اكتمل الإعلان وحصلت على نقطة." });
              setShowManualRewarded(false);
          }
      }
  }, [showManualRewarded, rewardedCountdown, onRewardedComplete, toast]);

  return (
    <UnityAdsContext.Provider value={{ isInitialized, config: config || null, showInterstitial, showRewarded }}>
      {children}

      {/* Manual Interstitial Ad Dialog */}
      <Dialog open={showManualInterstitial} onOpenChange={setShowManualInterstitial}>
          <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-sm overflow-hidden rounded-[2.5rem]">
              <div className="relative group">
                  <button className="absolute top-4 right-4 z-50 bg-black/50 text-white rounded-full p-2" onClick={() => setShowManualInterstitial(false)}>
                      <X className="h-5 w-5" />
                  </button>
                  <a href={config?.manualInterstitialLink || '#'} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={config?.manualInterstitialImg} alt="Ad" className="w-full h-auto object-cover" />
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[80%]">
                          <Button className="w-full rounded-2xl h-14 font-black shadow-xl bg-primary text-white">
                              تعرف على المزيد <ExternalLink className="mr-2 h-4 w-4" />
                          </Button>
                      </div>
                  </a>
              </div>
          </DialogContent>
      </Dialog>

      {/* Manual Rewarded Ad Dialog */}
      <Dialog open={showManualRewarded} onOpenChange={(open) => !open && rewardedCountdown > 0 ? toast({title: "أكمل المشاهدة للحصول على النقطة"}) : setShowManualRewarded(open)}>
          <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-sm overflow-hidden rounded-[2.5rem]">
              <div className="bg-card p-6 text-center space-y-6">
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted">
                      {config?.manualRewardedImg ? (
                          <img src={config.manualRewardedImg} alt="Ad" className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary/20"><Coins className="h-20 w-20" /></div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                          <Clock className="h-10 w-10 mb-2 animate-spin" />
                          <p className="text-2xl font-black">{rewardedCountdown}</p>
                          <p className="text-xs font-bold opacity-80">انتظر قليلاً للحصول على الجائزة</p>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <h3 className="text-xl font-black">شاهد لتربح!</h3>
                      <p className="text-sm text-muted-foreground">احصل على نقاط مجانية مقابل وقتك الثمين.</p>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
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
