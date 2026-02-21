'use client';

import { useEffect, useRef, useState } from 'react';
import { useUnityAds } from './UnityAdsProvider';

/**
 * مكون عرض بانر Adsterra أو الإعلانات اليدوية.
 * يستخدم تقنية Contextual Fragment لضمان تنفيذ سكريبتات Adsterra (invoke.js) بشكل صحيح.
 */
export default function UnityBannerAd() {
  const { config } = useUnityAds();
  const bannerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // التأكد من العمل على المتصفح وتوفر الإعدادات والكود
    if (!mounted || !config?.enabled || !config.adsterraEnabled || !config.nativeBannerScript || !bannerRef.current) return;

    const container = bannerRef.current;
    
    // تنظيف الحاوية قبل الحقن لتجنب تكرار الإعلانات
    container.innerHTML = '';
    
    const injectAd = () => {
        try {
            // createContextualFragment هي الطريقة المثالية لتنفيذ السكريبتات الخارجية في React
            const range = document.createRange();
            range.selectNode(container);
            const fragment = range.createContextualFragment(config.nativeBannerScript!);
            
            // إضافة المحتوى (السكريبت والحاوية) للـ DOM
            container.appendChild(fragment);
        } catch (e) {
            console.error("Adsterra Banner injection failed:", e);
        }
    };

    // تأخير بسيط لضمان استقرار الواجهة قبل بدء تحميل الإعلان
    const timer = setTimeout(injectAd, 500);

    return () => {
        clearTimeout(timer);
        if (container) container.innerHTML = '';
    };
  }, [config?.nativeBannerScript, config?.enabled, config?.adsterraEnabled, mounted]);

  // عدم عرض أي شيء إذا كانت الإعلانات معطلة
  if (!config?.enabled || !mounted) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 flex justify-center pointer-events-none z-40 px-4">
        <div 
            ref={bannerRef}
            className="w-full max-w-sm min-h-[50px] pointer-events-auto flex flex-col items-center justify-center transition-all"
        >
            {/* خيار الإعلان اليدوي في حال عدم توفر كود Adsterra أو تعطيله */}
            {!config.adsterraEnabled && config.manualAdsEnabled && config.manualBannerImg && (
                <a href={config.manualBannerLink || '#'} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-card/20 backdrop-blur-md">
                    <img src={config.manualBannerImg} alt="Ad" className="w-full h-auto object-cover max-h-16" />
                </a>
            )}
        </div>
    </div>
  );
}
