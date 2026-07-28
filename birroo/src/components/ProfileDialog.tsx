import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";
import { LogOut, Camera } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { auth, logout } from "../lib/firebase";
import { toast } from "sonner";

export const ProfileDialog = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return <>{children}</>;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size (< 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'immagine deve essere più piccola di 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      
      // Downscale image
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        
        try {
          setLoading(true);
          await updateProfile(auth.currentUser!, {
            photoURL: dataUrl
          });
          toast.success("Immagine del profilo aggiornata");
        } catch (error: any) {
          console.error(error);
          toast.error("Errore durante l'aggiornamento dell'immagine");
        } finally {
          setLoading(false);
        }
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const displayName = user.displayName || user.email?.split("@")[0] || "Utente";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger >
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm rounded-3xl p-6 z-[3000]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Il tuo Profilo
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center mt-6 space-y-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-slate-400 font-bold uppercase">{displayName[0]}</span>
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-md hover:bg-primary/90 transition-transform hover:scale-105"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="text-center space-y-1">
            <h3 className="font-bold text-lg text-slate-800">{displayName}</h3>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>

          <div className="w-full pt-4 border-t border-slate-100">
            <Button 
              variant="outline" 
              className="w-full rounded-2xl gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
            >
              <LogOut className="w-4 h-4" />
              Esci dall'account
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
