
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { AdsConfig } from '@/lib/definitions';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, Clock, Coins, MousePointer2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdsContextType {
  config: AdsConfig | null;
  showInterstitial: () => void;
  showRewarded: (onComplete: () => void) => void;
}

const AdsContext = createContext<AdsContextType | undefined>(undefined);

export function UnityAdsProvider({ children }: { children: React.ReactNode }) {
  const [showManualInterstitial, setShowManualInterstitial] = useState(false);
  const [showManualRewarded, setShowManualRewarded] = useState(false);
  const [rewardedCountdown, setRewardedCountdown] = useState(0);
  const [onRewardedComplete, setOnRewardedComplete] = useState<(() => void) | null>(null);
  const { toast } = useToast();
  
  const firestore = useFirestore();
  const adsConfigRef = useMemoFirebase(() => firestore ? doc(firestore, 'appConfig', 'ads') : null, [firestore]);
  const { data: config } = useDoc<AdsConfig>(adsConfigRef);

  // Handle Global Adsterra Scripts (Social Bar, Popunder)
  useEffect(() => {
    if (!config?.enabled || !config.adsterraEnabled) return;

    const injectScript = (scriptHtml: string | undefined, id: string) => {
        if (!scriptHtml || document.getElementById(id)) return;
        
        const container = document.createElement('div');
        container.id = id;
        container.style.display = 'none';
        container.innerHTML = scriptHtml;
        
        const scripts = container.querySelectorAll('script');
        scripts.forEach(s => {
            const newScript = document.createElement('script');
            Array.from(s.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.innerHTML = s.innerHTML;
            document.body.appendChild(newScript);
        });
        
        document.body.appendChild(container);
    };

    // Delay injection slightly to prioritize page content
    const timer = setTimeout(() => {
        injectScript(config.socialBarScript, 'adsterra-social-bar');
        injectScript(config.popunderScript, 'adsterra-popunder');
    }, 2000);

    return () => clearTimeout(timer);
  }, [config]);

  const showInterstitial = () => {
    if (!config?.enabled) return;
    
    // Adsterra interstitial is automatic via Social Bar / Popunder
    // Manual fallback if needed
    if (config.manualAdsEnabled && config.manualInterstitialImg) {
        setShowManualInterstitial(true);
    }
  };

  const showRewarded = (onComplete: () => void) => {
    if (!config?.enabled) {
        onComplete();
        return;
    }

    if (config.adsterraEnabled && config.directLinkUrl) {
        window.open(config.directLinkUrl, '_blank');
        setOnRewardedComplete(() => onComplete);
        setRewardedCountdown(15); 
        setShowManualRewarded(true);
    } else if (config.manualAdsEnabled) {
        setOnRewardedComplete(() => onComplete);
        setRewardedCountdown(10);
        setShowManualRewarded(true);
    } else {
        toast({ title: "عذراً", description: "نظام المكافآت غير متوفر حالياً." });
    }
  };

  useEffect(() => {
      if (showManualRewarded && rewardedCountdown > 0) {
          const timer = setTimeout(() => setRewardedCountdown(c => c - 1), 1000);
          return () => clearTimeout(timer);
      } else if (showManualRewarded && rewardedCountdown === 0) {
          if (onRewardedComplete) {
              onRewardedComplete();
              setOnRewardedComplete(null);
              toast({ title: "تمت المهمة! 🎉", description: "حصلت على نقطة مكافأة." });
              setShowManualRewarded(false);
          }
      }
  }, [showManualRewarded, rewardedCountdown, onRewardedComplete, toast]);

  return (
    <AdsContext.Provider value={{ config: config || null, showInterstitial, showRewarded }}>
      {children}

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
                              تصفح الآن <ExternalLink className="mr-2 h-4 w-4" />
                          </Button>
                      </div>
                  </a>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={showManualRewarded} onOpenChange={(open) => !open && rewardedCountdown > 0 ? toast({title: "أكمل المهمة للحصول على النقطة"}) : setShowManualRewarded(open)}>
          <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-sm overflow-hidden rounded-[2.5rem]">
              <div className="bg-card p-8 text-center space-y-6">
                  <div className="relative aspect-video rounded-3xl overflow-hidden bg-primary/5 border-2 border-dashed border-primary/20 flex flex-col items-center justify-center">
                      <div className="relative">
                          <Clock className="h-16 w-16 text-primary/20 animate-spin-slow" />
                          <div className="absolute inset-0 flex items-center justify-center font-black text-2xl text-primary">
                              {rewardedCountdown}
                          </div>
                      </div>
                      <div className="mt-4 flex flex-col items-center gap-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">انتظر قليلاً</p>
                          <p className="text-[10px] text-primary/60 font-black">جاري تفعيل النقطة...</p>
                      </div>
                  </div>
                  <div className="space-y-3">
                      <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full inline-flex items-center gap-2 text-xs font-black">
                          <MousePointer2 className="h-3.5 w-3.5" />
                          تأكد من فتح صفحة الإعلان
                      </div>
                      <h3 className="text-xl font-black">شكراً لدعمك!</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">مشاهدة الإعلانات تساعدنا على استمرار تقديم المحتوى المجاني لكم.</p>
                  </div>
              </div>
          </DialogContent>
      </Dialog>
    </AdsContext.Provider>
  );
}

export function useUnityAds() {
  const context = useContext(AdsContext);
  if (context === undefined) {
    throw new Error('useAds must be used within a AdsProvider');
  }
  return context;
}
