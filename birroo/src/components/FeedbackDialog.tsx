import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { Mail, ArrowLeft } from "lucide-react";

export function FeedbackDialog() {
  const { t } = useTranslation();
  const [showEmail, setShowEmail] = useState(false);

  return (
    <Dialog onOpenChange={(open) => { if (!open) setShowEmail(false); }}>
      <DialogTrigger className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
        Invia feedback sul prodotto
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 z-[4000]">
        <DialogHeader>
          {showEmail && (
            <button 
              onClick={() => setShowEmail(false)}
              className="absolute left-4 top-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
          )}
          <DialogTitle className="text-xl font-bold text-center mb-4">
            {showEmail ? "Contattaci" : "Invia feedback a Birroo"}
          </DialogTitle>
        </DialogHeader>
        
        {showEmail ? (
          <div className="flex flex-col gap-4 mt-2">
            <p className="text-sm text-slate-600 text-center">
              Puoi scriverci un'email al seguente indirizzo:
            </p>
            <div className="flex items-center justify-center w-full h-12 text-base font-bold rounded-xl bg-slate-100 text-slate-800 select-all border border-slate-200">
              info@birroo.it
            </div>

          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSePMRvEclbk73sLZ6g0ADub_-yQTuZcvKeHEbWfkhd80ujY3Q/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full h-12 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              Invia feedback a Birroo
            </a>
            <button
              onClick={() => setShowEmail(true)}
              className="flex items-center justify-center w-full h-12 text-sm font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Contattaci
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
