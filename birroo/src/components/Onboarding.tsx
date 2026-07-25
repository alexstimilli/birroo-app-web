import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, MapPin, ArrowRight, ArrowLeft, Check, CheckCircle2, Navigation, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function Onboarding({ onComplete }: { onComplete: (dontShowAgain: boolean) => void }) {
  const [step, setStep] = useState(0);
  const { t, i18n } = useTranslation();

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // min swipe distance
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handleBack();
    }
  };

  const steps = [
    {
      id: 'vehicle',
      icon: <Car className="w-20 h-20 text-indigo-500 mb-4" strokeWidth={1.5} />,
      title: t('onboarding_title_1'),
      desc: t('onboarding_desc_1')
    },
    {
      id: 'location',
      icon: <MapPin className="w-20 h-20 text-amber-500 mb-4" strokeWidth={1.5} />,
      title: t('onboarding_title_2'),
      desc: t('onboarding_desc_2')
    },
    {
      id: 'modes',
      icon: <Route className="w-20 h-20 text-purple-500 mb-4" strokeWidth={1.5} />,
      title: t('onboarding_title_search_modes'),
      desc: t('onboarding_desc_search_modes')
    },
    {
      id: 'radar',
      icon: <Navigation className="w-20 h-20 text-blue-500 mb-4" strokeWidth={1.5} />,
      title: t('onboarding_title_3'),
      desc: t('onboarding_desc_3')
    },
    {
      id: 'go',
      icon: <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-4" strokeWidth={1.5} />,
      title: t('onboarding_title_4'),
      desc: t('onboarding_desc_4')
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
      onClick={() => onComplete(false)}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white max-w-sm w-full rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col items-center p-8 pt-12 text-center relative"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Language toggler */}
        <div className="absolute top-4 left-4 flex gap-1">
          <button 
            className={`px-2 py-1 text-xs font-bold rounded-full ${i18n.language === 'it' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => i18n.changeLanguage('it')}
          >
            IT
          </button>
          <button 
            className={`px-2 py-1 text-xs font-bold rounded-full ${i18n.language === 'en' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => i18n.changeLanguage('en')}
          >
            EN
          </button>
        </div>

        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-200'}`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center min-h-[200px]"
          >
            {steps[step].icon}
            <h2 className="text-2xl font-black tracking-tight text-slate-800 mb-4">{steps[step].title}</h2>
            <p className="text-slate-500 font-medium leading-relaxed">{steps[step].desc}</p>
          </motion.div>
        </AnimatePresence>

        {step === steps.length - 1 ? (
           <div className="w-full flex gap-3 mt-8">
              <Button 
                 size="icon" 
                 variant="outline" 
                 className="h-14 w-14 shrink-0 rounded-2xl" 
                 onClick={handleBack}
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
              <div className="flex-1 flex flex-col gap-2">
                <Button 
                  onClick={() => onComplete(true)} // true = non mostrare più
                  className="w-full rounded-2xl h-14 text-[13px] xs:text-sm font-bold shadow-lg shadow-indigo-200"
                >
                  {t('onboarding_btn_got_it')}
                </Button>
              </div>
           </div>
        ) : (
          <div className="w-full flex gap-3 mt-8">
            {step > 0 && (
              <Button 
                 size="icon" 
                 variant="outline" 
                 className="h-14 w-14 shrink-0 rounded-2xl" 
                 onClick={handleBack}
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            )}
            <Button 
              onClick={handleNext}
              className="flex-1 rounded-2xl h-14 text-lg font-bold shadow-lg shadow-indigo-200"
            >
              {t('onboarding_btn_next')} <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}
        
        {step === steps.length - 1 ? (
          <button 
             className="mt-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors h-6"
             onClick={() => onComplete(false)}
          >
             {t('onboarding_btn_close')}
          </button>
        ) : (
          <button 
             className="mt-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors h-6"
             onClick={() => onComplete(false)}
          >
             {t('onboarding_skip')}
          </button>
        )}
      </motion.div>
    </div>
  );
}
