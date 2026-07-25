import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./components/AuthProvider";
import { loginWithGoogle, logout, analytics, db, initAnalytics } from "./lib/firebase";
import { logEvent } from "firebase/analytics";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  ZoomControl,
  Circle,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { fetchNearbyStations, calculateDistance } from "./lib/mapService";
import { estimateVehicleData } from "./lib/gemini";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// @ts-ignore
import {
  Search,
  Fuel,
  Navigation,
  ShieldCheck,
  MapPin,
  Loader2,
  Navigation2,
  Zap,
  Settings2,
  Car,
  LogOut,
  CheckCircle2,
  Clock,
  Building2,
  X,
  RefreshCw,
  AlertTriangle,
  Globe,
  Crosshair,
  Info,
  User,
  Route,
  Trophy,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Onboarding } from "./components/Onboarding";
import { PlaceAutocompleteInput } from "./components/PlaceAutocompleteInput";

const RouteABIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="5" cy="19" r="4" />
    <text
      x="5"
      y="20.5"
      fontSize="4.5"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      A
    </text>
    <path d="M9 19h6.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="19" cy="5" r="4" />
    <text
      x="19"
      y="6.5"
      fontSize="4.5"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      B
    </text>
  </svg>
);

const RadarPinIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
    <circle
      cx="12"
      cy="12"
      r="11"
      strokeWidth="1.5"
      strokeDasharray="3 3"
      opacity="0.5"
    />
  </svg>
);

function decodePolyline6(
  str: string,
  precision: number = 6,
): [number, number][] {
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates: [number, number][] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

// Fix generic map marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const COMMON_VEHICLES_DB: any[] = [
  {
    keywords: ["standard benzina", "citycar"],
    vehicleName: "Auto Benzina Standard",
    tankCapacity: 45,
    consumptionPer100Km: 5.8,
    fuelType: "Benzina",
  },
  {
    keywords: ["standard gasolio", "diesel media"],
    vehicleName: "Auto Diesel Standard",
    tankCapacity: 50,
    consumptionPer100Km: 4.8,
    fuelType: "Gasolio",
  },
  {
    keywords: ["standard gpl", "citycar gpl"],
    vehicleName: "Auto GPL Standard",
    tankCapacity: 40,
    consumptionPer100Km: 8.0,
    fuelType: "GPL",
  },
  {
    keywords: ["standard metano", "metano media"],
    vehicleName: "Auto Metano Standard",
    tankCapacity: 15,
    consumptionPer100Km: 4.0,
    fuelType: "Metano",
  },
  {
    keywords: ["a1"],
    vehicleName: "Audi A1 1.0 TFSI",
    tankCapacity: 40,
    consumptionPer100Km: 5.2,
    fuelType: "Benzina",
  },
  {
    keywords: ["a3 s"],
    vehicleName: "Audi A3 Sportback 30 TDI",
    tankCapacity: 50,
    consumptionPer100Km: 4.4,
    fuelType: "Gasolio",
  },
  {
    keywords: ["a3 b"],
    vehicleName: "Audi A3 35 TFSI",
    tankCapacity: 50,
    consumptionPer100Km: 5.6,
    fuelType: "Benzina",
  },
  {
    keywords: ["a4 s"],
    vehicleName: "Audi A4 Avant 35 TDI",
    tankCapacity: 54,
    consumptionPer100Km: 4.8,
    fuelType: "Gasolio",
  },
  {
    keywords: ["q3"],
    vehicleName: "Audi Q3 35 TDI",
    tankCapacity: 58,
    consumptionPer100Km: 5.2,
    fuelType: "Gasolio",
  },
  {
    keywords: ["q5"],
    vehicleName: "Audi Q5 40 TDI",
    tankCapacity: 70,
    consumptionPer100Km: 6.4,
    fuelType: "Gasolio",
  },
  {
    keywords: ["panda"],
    vehicleName: "Fiat Panda 1.2 Fire",
    tankCapacity: 38,
    consumptionPer100Km: 5.5,
    fuelType: "Benzina",
  },
  {
    keywords: ["panda hybrid"],
    vehicleName: "Fiat Panda 1.0 Hybrid",
    tankCapacity: 38,
    consumptionPer100Km: 4.8,
    fuelType: "Benzina",
  },
  {
    keywords: ["panda mjet", "panda diesel"],
    vehicleName: "Fiat Panda 1.3 M-Jet",
    tankCapacity: 35,
    consumptionPer100Km: 4.1,
    fuelType: "Gasolio",
  },
  {
    keywords: ["500 hy", "500 b"],
    vehicleName: "Fiat 500 1.0 Hybrid",
    tankCapacity: 35,
    consumptionPer100Km: 4.6,
    fuelType: "Benzina",
  },
  {
    keywords: ["500x", "500 l", "500d"],
    vehicleName: "Fiat 500X 1.3 M-Jet",
    tankCapacity: 48,
    consumptionPer100Km: 4.7,
    fuelType: "Gasolio",
  },
  {
    keywords: ["punto b", "grande punto"],
    vehicleName: "Fiat Punto 1.2",
    tankCapacity: 45,
    consumptionPer100Km: 5.4,
    fuelType: "Benzina",
  },
  {
    keywords: ["punto d"],
    vehicleName: "Fiat Punto 1.3 M-Jet",
    tankCapacity: 45,
    consumptionPer100Km: 4.2,
    fuelType: "Gasolio",
  },
  {
    keywords: ["golf d", "golf 7", "golf 8", "golf 6", "golf 5", "golf 4"],
    vehicleName: "Volkswagen Golf 2.0 TDI",
    tankCapacity: 50,
    consumptionPer100Km: 4.2,
    fuelType: "Gasolio",
  },
  {
    keywords: ["golf d 1.6"],
    vehicleName: "Volkswagen Golf 1.6 TDI",
    tankCapacity: 50,
    consumptionPer100Km: 4.1,
    fuelType: "Gasolio",
  },
  {
    keywords: ["golf b", "golf tsi"],
    vehicleName: "Volkswagen Golf 1.5 TSI",
    tankCapacity: 50,
    consumptionPer100Km: 5.4,
    fuelType: "Benzina",
  },
  {
    keywords: ["polo"],
    vehicleName: "Volkswagen Polo 1.0 TSI",
    tankCapacity: 40,
    consumptionPer100Km: 5.1,
    fuelType: "Benzina",
  },
  {
    keywords: ["polo d", "polo 1.6", "polo tdi", "polo diesel gate"],
    vehicleName: "Volkswagen Polo 1.6 TDI",
    tankCapacity: 45,
    consumptionPer100Km: 4.2,
    fuelType: "Gasolio",
  },
  {
    keywords: ["tiguan"],
    vehicleName: "Volkswagen Tiguan 2.0 TDI",
    tankCapacity: 58,
    consumptionPer100Km: 5.4,
    fuelType: "Gasolio",
  },
  {
    keywords: ["t-roc", "troc", "t roc"],
    vehicleName: "Volkswagen T-Roc 1.0 TSI",
    tankCapacity: 50,
    consumptionPer100Km: 5.8,
    fuelType: "Benzina",
  },
  {
    keywords: ["118d", "serie 1"],
    vehicleName: "BMW Serie 1 118d",
    tankCapacity: 42,
    consumptionPer100Km: 4.4,
    fuelType: "Gasolio",
  },
  {
    keywords: ["320d", "serie 3"],
    vehicleName: "BMW Serie 3 320d",
    tankCapacity: 59,
    consumptionPer100Km: 4.7,
    fuelType: "Gasolio",
  },
  {
    keywords: ["x1"],
    vehicleName: "BMW X1 sDrive18d",
    tankCapacity: 45,
    consumptionPer100Km: 5.0,
    fuelType: "Gasolio",
  },
  {
    keywords: ["x3"],
    vehicleName: "BMW X3 xDrive20d",
    tankCapacity: 68,
    consumptionPer100Km: 5.9,
    fuelType: "Gasolio",
  },
  {
    keywords: ["classe a", "a180"],
    vehicleName: "Mercedes Classe A 180d",
    tankCapacity: 43,
    consumptionPer100Km: 4.1,
    fuelType: "Gasolio",
  },
  {
    keywords: ["classe c", "c220"],
    vehicleName: "Mercedes Classe C 220d",
    tankCapacity: 66,
    consumptionPer100Km: 4.8,
    fuelType: "Gasolio",
  },
  {
    keywords: ["gla"],
    vehicleName: "Mercedes GLA 200d",
    tankCapacity: 43,
    consumptionPer100Km: 4.6,
    fuelType: "Gasolio",
  },
  {
    keywords: ["fiesta b"],
    vehicleName: "Ford Fiesta 1.0 EcoBoost",
    tankCapacity: 42,
    consumptionPer100Km: 5.0,
    fuelType: "Benzina",
  },
  {
    keywords: ["focus d"],
    vehicleName: "Ford Focus 1.5 EcoBlue",
    tankCapacity: 47,
    consumptionPer100Km: 4.3,
    fuelType: "Gasolio",
  },
  {
    keywords: ["puma"],
    vehicleName: "Ford Puma 1.0 EcoBoost",
    tankCapacity: 42,
    consumptionPer100Km: 5.4,
    fuelType: "Benzina",
  },
  {
    keywords: ["kuga"],
    vehicleName: "Ford Kuga 2.0 EcoBlue",
    tankCapacity: 54,
    consumptionPer100Km: 5.6,
    fuelType: "Gasolio",
  },
  {
    keywords: ["clio b"],
    vehicleName: "Renault Clio 1.0 TCe",
    tankCapacity: 42,
    consumptionPer100Km: 5.2,
    fuelType: "Benzina",
  },
  {
    keywords: ["clio d"],
    vehicleName: "Renault Clio 1.5 dCi",
    tankCapacity: 39,
    consumptionPer100Km: 3.9,
    fuelType: "Gasolio",
  },
  {
    keywords: ["captur b"],
    vehicleName: "Renault Captur 1.0 TCe",
    tankCapacity: 48,
    consumptionPer100Km: 5.9,
    fuelType: "Benzina",
  },
  {
    keywords: ["megane d"],
    vehicleName: "Renault Megane 1.5 dCi",
    tankCapacity: 47,
    consumptionPer100Km: 4.2,
    fuelType: "Gasolio",
  },
  {
    keywords: ["208 b"],
    vehicleName: "Peugeot 208 1.2 PureTech",
    tankCapacity: 44,
    consumptionPer100Km: 5.0,
    fuelType: "Benzina",
  },
  {
    keywords: ["208 d"],
    vehicleName: "Peugeot 208 1.5 BlueHDi",
    tankCapacity: 41,
    consumptionPer100Km: 3.6,
    fuelType: "Gasolio",
  },
  {
    keywords: ["3008 d"],
    vehicleName: "Peugeot 3008 1.5 BlueHDi",
    tankCapacity: 53,
    consumptionPer100Km: 4.9,
    fuelType: "Gasolio",
  },
  {
    keywords: ["2008 b"],
    vehicleName: "Peugeot 2008 1.2 PureTech",
    tankCapacity: 44,
    consumptionPer100Km: 5.5,
    fuelType: "Benzina",
  },
  {
    keywords: ["yaris hy", "yaris cross"],
    vehicleName: "Toyota Yaris 1.5 Hybrid",
    tankCapacity: 36,
    consumptionPer100Km: 3.8,
    fuelType: "Benzina",
  },
  {
    keywords: ["corolla hy"],
    vehicleName: "Toyota Corolla 1.8 Hybrid",
    tankCapacity: 43,
    consumptionPer100Km: 4.4,
    fuelType: "Benzina",
  },
  {
    keywords: ["rav4 hy"],
    vehicleName: "Toyota RAV4 2.5 Hybrid",
    tankCapacity: 55,
    consumptionPer100Km: 5.5,
    fuelType: "Benzina",
  },
  {
    keywords: ["sandero stepway"],
    vehicleName: "Dacia Sandero Stepway 1.0 Eco-G",
    tankCapacity: 50,
    consumptionPer100Km: 7.0,
    fuelType: "GPL",
  },
  {
    keywords: ["duster d"],
    vehicleName: "Dacia Duster 1.5 Blue dCi",
    tankCapacity: 50,
    consumptionPer100Km: 4.8,
    fuelType: "Gasolio",
  },
  {
    keywords: ["duster gpl"],
    vehicleName: "Dacia Duster 1.0 Eco-G",
    tankCapacity: 50,
    consumptionPer100Km: 8.2,
    fuelType: "GPL",
  },
  {
    keywords: ["corsa b"],
    vehicleName: "Opel Corsa 1.2",
    tankCapacity: 44,
    consumptionPer100Km: 5.2,
    fuelType: "Benzina",
  },
  {
    keywords: ["mokka d"],
    vehicleName: "Opel Mokka 1.5 Diesel",
    tankCapacity: 41,
    consumptionPer100Km: 4.4,
    fuelType: "Gasolio",
  },
  {
    keywords: ["giulietta d", "giulietta"],
    vehicleName: "Alfa Romeo Giulietta 1.6 JTDm",
    tankCapacity: 60,
    consumptionPer100Km: 4.5,
    fuelType: "Gasolio",
  },
  {
    keywords: ["stelvio d", "stelvio"],
    vehicleName: "Alfa Romeo Stelvio 2.2 JTDm",
    tankCapacity: 58,
    consumptionPer100Km: 5.8,
    fuelType: "Gasolio",
  },
  {
    keywords: ["tonale d", "tonale"],
    vehicleName: "Alfa Romeo Tonale 1.6 Diesel",
    tankCapacity: 55,
    consumptionPer100Km: 5.4,
    fuelType: "Gasolio",
  },
  {
    keywords: ["renegade d", "renegade"],
    vehicleName: "Jeep Renegade 1.6 Mjet",
    tankCapacity: 48,
    consumptionPer100Km: 5.1,
    fuelType: "Gasolio",
  },
  {
    keywords: ["compass d", "compass"],
    vehicleName: "Jeep Compass 1.6 Mjet",
    tankCapacity: 55,
    consumptionPer100Km: 5.2,
    fuelType: "Gasolio",
  },

  // Additional European / Popular Models (~150 target total)
  {
    keywords: ["c3 b", "citroen"],
    vehicleName: "Citroën C3 1.2 PureTech",
    tankCapacity: 45,
    consumptionPer100Km: 5.4,
    fuelType: "Benzina",
  },
  {
    keywords: ["c3 d", "citroen"],
    vehicleName: "Citroën C3 1.5 BlueHDi",
    tankCapacity: 42,
    consumptionPer100Km: 4.2,
    fuelType: "Gasolio",
  },
  {
    keywords: ["c4", "citroen"],
    vehicleName: "Citroën C4 1.2 PureTech",
    tankCapacity: 50,
    consumptionPer100Km: 5.3,
    fuelType: "Benzina",
  },
  {
    keywords: ["aygo"],
    vehicleName: "Toyota Aygo 1.0",
    tankCapacity: 35,
    consumptionPer100Km: 4.1,
    fuelType: "Benzina",
  },
  {
    keywords: ["i10"],
    vehicleName: "Hyundai i10 1.0",
    tankCapacity: 36,
    consumptionPer100Km: 4.8,
    fuelType: "Benzina",
  },
  {
    keywords: ["i20"],
    vehicleName: "Hyundai i20 1.2",
    tankCapacity: 40,
    consumptionPer100Km: 5.2,
    fuelType: "Benzina",
  },
  {
    keywords: ["tucson d"],
    vehicleName: "Hyundai Tucson 1.6 CRDi",
    tankCapacity: 54,
    consumptionPer100Km: 5.3,
    fuelType: "Gasolio",
  },
  {
    keywords: ["sportage d"],
    vehicleName: "Kia Sportage 1.6 CRDi",
    tankCapacity: 54,
    consumptionPer100Km: 5.4,
    fuelType: "Gasolio",
  },
  {
    keywords: ["picanto"],
    vehicleName: "Kia Picanto 1.0",
    tankCapacity: 35,
    consumptionPer100Km: 4.8,
    fuelType: "Benzina",
  },
  {
    keywords: ["macan"],
    vehicleName: "Porsche Macan S",
    tankCapacity: 65,
    consumptionPer100Km: 9.8,
    fuelType: "Benzina",
  },
  {
    keywords: ["cayenne"],
    vehicleName: "Porsche Cayenne E-Hybrid",
    tankCapacity: 75,
    consumptionPer100Km: 3.2,
    fuelType: "Benzina",
  },
  {
    keywords: ["ypsilon b", "y vecchi", "elefantino"],
    vehicleName: "Lancia Ypsilon 1.2 Fire",
    tankCapacity: 40,
    consumptionPer100Km: 5.3,
    fuelType: "Benzina",
  },
  {
    keywords: ["ypsilon d"],
    vehicleName: "Lancia Ypsilon 1.3 Mjet",
    tankCapacity: 40,
    consumptionPer100Km: 4.2,
    fuelType: "Gasolio",
  },
  {
    keywords: ["ypsilon metano"],
    vehicleName: "Lancia Ypsilon 0.9 Metano",
    tankCapacity: 12,
    consumptionPer100Km: 3.5,
    fuelType: "Metano",
  },
  {
    keywords: ["mito b"],
    vehicleName: "Alfa Romeo MiTo 1.4",
    tankCapacity: 45,
    consumptionPer100Km: 5.8,
    fuelType: "Benzina",
  },
  {
    keywords: ["147 d"],
    vehicleName: "Alfa Romeo 147 1.9 JTD",
    tankCapacity: 60,
    consumptionPer100Km: 5.9,
    fuelType: "Gasolio",
  },
  {
    keywords: ["159 d"],
    vehicleName: "Alfa Romeo 159 1.9 JTDm",
    tankCapacity: 70,
    consumptionPer100Km: 6.0,
    fuelType: "Gasolio",
  },
  {
    keywords: ["tipo b"],
    vehicleName: "Fiat Tipo 1.4",
    tankCapacity: 50,
    consumptionPer100Km: 6.3,
    fuelType: "Benzina",
  },
  {
    keywords: ["tipo d"],
    vehicleName: "Fiat Tipo 1.6 Mjet",
    tankCapacity: 50,
    consumptionPer100Km: 4.6,
    fuelType: "Gasolio",
  },
  {
    keywords: ["doblo"],
    vehicleName: "Fiat Doblò 1.6 Mjet",
    tankCapacity: 60,
    consumptionPer100Km: 5.6,
    fuelType: "Gasolio",
  },
  {
    keywords: ["multipla metano"],
    vehicleName: "Fiat Multipla 1.6 Natural Power",
    tankCapacity: 21,
    consumptionPer100Km: 5.8,
    fuelType: "Metano",
  },
  {
    keywords: ["up!"],
    vehicleName: "Volkswagen up! 1.0",
    tankCapacity: 35,
    consumptionPer100Km: 4.4,
    fuelType: "Benzina",
  },
  {
    keywords: ["passat d"],
    vehicleName: "Volkswagen Passat 2.0 TDI",
    tankCapacity: 66,
    consumptionPer100Km: 4.6,
    fuelType: "Gasolio",
  },
  {
    keywords: ["a6 d"],
    vehicleName: "Audi A6 Avant 3.0 TDI",
    tankCapacity: 73,
    consumptionPer100Km: 6.2,
    fuelType: "Gasolio",
  },
  {
    keywords: ["q2 d"],
    vehicleName: "Audi Q2 30 TDI",
    tankCapacity: 50,
    consumptionPer100Km: 4.9,
    fuelType: "Gasolio",
  },
  {
    keywords: ["fortwo"],
    vehicleName: "Smart Fortwo 1.0",
    tankCapacity: 28,
    consumptionPer100Km: 4.9,
    fuelType: "Benzina",
  },
  {
    keywords: ["forfour"],
    vehicleName: "Smart Forfour 1.0",
    tankCapacity: 28,
    consumptionPer100Km: 5.2,
    fuelType: "Benzina",
  },
  {
    keywords: ["mini cooper b"],
    vehicleName: "MINI Cooper 1.5",
    tankCapacity: 40,
    consumptionPer100Km: 5.5,
    fuelType: "Benzina",
  },
  {
    keywords: ["mini cooper d"],
    vehicleName: "MINI Cooper D",
    tankCapacity: 44,
    consumptionPer100Km: 4.2,
    fuelType: "Gasolio",
  },
  {
    keywords: ["countryman d"],
    vehicleName: "MINI Countryman Cooper D",
    tankCapacity: 51,
    consumptionPer100Km: 4.9,
    fuelType: "Gasolio",
  },
  {
    keywords: ["micra"],
    vehicleName: "Nissan Micra 1.0",
    tankCapacity: 41,
    consumptionPer100Km: 5.3,
    fuelType: "Benzina",
  },
  {
    keywords: ["juke"],
    vehicleName: "Nissan Juke 1.0 DIG-T",
    tankCapacity: 46,
    consumptionPer100Km: 5.9,
    fuelType: "Benzina",
  },
  {
    keywords: ["qashqai b"],
    vehicleName: "Nissan Qashqai 1.3 DIG-T",
    tankCapacity: 55,
    consumptionPer100Km: 6.2,
    fuelType: "Benzina",
  },
  {
    keywords: ["leon d"],
    vehicleName: "Seat Leon 2.0 TDI",
    tankCapacity: 50,
    consumptionPer100Km: 4.3,
    fuelType: "Gasolio",
  },
  {
    keywords: ["ibiza b"],
    vehicleName: "Seat Ibiza 1.0 TSI",
    tankCapacity: 40,
    consumptionPer100Km: 5.0,
    fuelType: "Benzina",
  },
  {
    keywords: ["ateca"],
    vehicleName: "Seat Ateca 1.6 TDI",
    tankCapacity: 50,
    consumptionPer100Km: 4.8,
    fuelType: "Gasolio",
  },
  {
    keywords: ["formentor"],
    vehicleName: "Cupra Formentor 1.5 TSI",
    tankCapacity: 50,
    consumptionPer100Km: 6.4,
    fuelType: "Benzina",
  },
  {
    keywords: ["octavia d"],
    vehicleName: "Skoda Octavia 2.0 TDI",
    tankCapacity: 45,
    consumptionPer100Km: 4.2,
    fuelType: "Gasolio",
  },
  {
    keywords: ["fabia"],
    vehicleName: "Skoda Fabia 1.0 TSI",
    tankCapacity: 40,
    consumptionPer100Km: 5.1,
    fuelType: "Benzina",
  },
  {
    keywords: ["kamiq"],
    vehicleName: "Skoda Kamiq 1.0 TSI",
    tankCapacity: 50,
    consumptionPer100Km: 5.4,
    fuelType: "Benzina",
  },
  {
    keywords: ["206 d"],
    vehicleName: "Peugeot 206 1.4 HDi",
    tankCapacity: 50,
    consumptionPer100Km: 4.3,
    fuelType: "Gasolio",
  },
  {
    keywords: ["207 b"],
    vehicleName: "Peugeot 207 1.4",
    tankCapacity: 50,
    consumptionPer100Km: 6.3,
    fuelType: "Benzina",
  },
  {
    keywords: ["jimny"],
    vehicleName: "Suzuki Jimny 1.5",
    tankCapacity: 40,
    consumptionPer100Km: 7.9,
    fuelType: "Benzina",
  },
  {
    keywords: ["swift hy", "swift b"],
    vehicleName: "Suzuki Swift 1.2 Hybrid",
    tankCapacity: 37,
    consumptionPer100Km: 4.7,
    fuelType: "Benzina",
  },
  {
    keywords: ["ignis"],
    vehicleName: "Suzuki Ignis 1.2 Hybrid",
    tankCapacity: 32,
    consumptionPer100Km: 5.0,
    fuelType: "Benzina",
  },
  {
    keywords: ["vitara"],
    vehicleName: "Suzuki Vitara 1.4 Hybrid",
    tankCapacity: 47,
    consumptionPer100Km: 5.4,
    fuelType: "Benzina",
  },
  {
    keywords: ["cx-5", "cx 5"],
    vehicleName: "Mazda CX-5 2.2 Diesel",
    tankCapacity: 56,
    consumptionPer100Km: 5.6,
    fuelType: "Gasolio",
  },
  {
    keywords: ["cx-30"],
    vehicleName: "Mazda CX-30 2.0 e-Skyactiv",
    tankCapacity: 51,
    consumptionPer100Km: 5.9,
    fuelType: "Benzina",
  },
  {
    keywords: ["mazda 2", "mazda2"],
    vehicleName: "Mazda 2 1.5 Skyactiv",
    tankCapacity: 44,
    consumptionPer100Km: 4.8,
    fuelType: "Benzina",
  },
  {
    keywords: ["v40 d"],
    vehicleName: "Volvo V40 D2",
    tankCapacity: 62,
    consumptionPer100Km: 4.6,
    fuelType: "Gasolio",
  },
  {
    keywords: ["xc40 d"],
    vehicleName: "Volvo XC40 D3",
    tankCapacity: 54,
    consumptionPer100Km: 5.4,
    fuelType: "Gasolio",
  },
  {
    keywords: ["xc60 d"],
    vehicleName: "Volvo XC60 D4",
    tankCapacity: 71,
    consumptionPer100Km: 5.8,
    fuelType: "Gasolio",
  },
  {
    keywords: ["model 3"],
    vehicleName: "Tesla Model 3 Long Range",
    tankCapacity: 1,
    consumptionPer100Km: 0,
    fuelType: "Elettrico",
  },
];

export const getTranslatedVehicleName = (name: string, t: any) => {
  if (!name) return "";
  if (name.includes("Auto Benzina Standard") || name === "Utilitaria Benzina")
    return t("auto_benzina_standard");
  if (name.includes("Auto Diesel Standard") || name === "Media Diesel")
    return t("auto_diesel_standard");
  if (name.includes("Auto GPL Standard")) return t("auto_gpl_standard");
  if (name.includes("Auto Metano Standard")) return t("auto_metano_standard");
  return name;
};

const RouteBand = React.memo(({
  route,
  deviationKm,
}: {
  route: [number, number][];
  deviationKm: number;
}) => {
  const map = useMap();
  const [weight, setWeight] = useState(15);

  useEffect(() => {
    const updateWeight = () => {
      if (!route || route.length === 0) return;
      const centerLat = map.getCenter().lat;
      const zoom = map.getZoom();
      // Calculate meters per pixel at current latitude and zoom
      const metersPerPixel =
        (40075016.686 * Math.abs(Math.cos((centerLat * Math.PI) / 180))) /
        Math.pow(2, zoom + 8);
      // Weight in pixels (total width of the band is 2 * deviation)
      let w =
        deviationKm === 0 ? 2 : (deviationKm * 1000 * 2) / metersPerPixel;
      w = Math.min(w, 400); // Cap SVG stroke weight to avoid WebKit crash (white screen) on mobile devices
      setWeight(w);
    };

    updateWeight();
    map.on("zoomend", updateWeight);
    map.on("moveend", updateWeight);
    return () => {
      map.off("zoomend", updateWeight);
      map.off("moveend", updateWeight);
    };
  }, [map, deviationKm, route]);

  return (
    <>
      <Polyline
        positions={route}
        pathOptions={{
          color: "#F27D26",
          weight: weight,
          opacity: 0.2,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      <Polyline
        positions={route}
        pathOptions={{ color: "#F27D26", weight: 4, opacity: 0.8 }}
      />
    </>
  );
});

function ActiveStationFocus({
  activeStation,
  topStations,
}: {
  activeStation: any | null;
  topStations: any[];
}) {
  const map = useMap();
  useEffect(() => {
    let targetLat: number | null = null;
    let targetLng: number | null = null;

    if (activeStation && activeStation.lat && activeStation.lng) {
      targetLat = activeStation.lat;
      targetLng = activeStation.lng;
    } else if (topStations && topStations.length > 0) {
      // Find the first valid one
      const valid = topStations.find(
        (ts) => ts.station && ts.station.lat && ts.station.lng,
      );
      if (valid) {
        targetLat = valid.station.lat;
        targetLng = valid.station.lng;
      }
    }

    if (targetLat !== null && targetLng !== null) {
      const zoom = Math.max(map.getZoom() || 14, 15);
      if (window.innerWidth < 640) {
        const targetPoint = map.project([targetLat, targetLng], zoom);
        // Place the marker in the visible upper portion of the screen (above the bottom sheet)
        // Shifting the map center down by 10% of screen height puts the marker at ~40% from the top
        targetPoint.y += window.innerHeight * 0.1;
        const offsetLatLng = map.unproject(targetPoint, zoom);
        map.setView(offsetLatLng, zoom, { animate: true, duration: 0.5 });
      } else {
        map.setView([targetLat, targetLng], zoom, {
          animate: true,
          duration: 0.5,
        });
      }
    }
  }, [activeStation, topStations, map]);
  return null;
}

function MapFocus({
  center,
  travelRoute,
}: {
  center: [number, number];
  travelRoute?: [number, number][] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (travelRoute && travelRoute.length > 0) {
      const bounds = L.latLngBounds(travelRoute);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else {
      const currentCenter = map.getCenter();
      const dist = Math.sqrt(
        Math.pow(currentCenter.lat - center[0], 2) +
          Math.pow(currentCenter.lng - center[1], 2),
      );
      if (dist > 0.0001) {
        map.setView(center, map.getZoom(), { animate: true });
      }
    }
  }, [center, travelRoute, map]);
  return null;
}

function MapEventsHandler({
  onMoveEnd,
}: {
  onMoveEnd: (center: [number, number]) => void;
}) {
  useMapEvents({
    moveend: (e) => {
      const newCenter = e.target.getCenter();
      onMoveEnd([newCenter.lat, newCenter.lng]);
    },
  });
  return null;
}

function SidebarContent({
  user,
  profile,
  updateProfileData,
  vehicleSearch,
  setVehicleSearch,
  handleVehicleAISearch,
  isSearchingAI,
  localRadarRadius,
  setLocalRadarRadius,
  handleSuggestBest,
  setShowOnboarding,
  searchMode,
  setSearchMode,
  travelOrigin,
  setTravelOrigin,
  travelDestination,
  setTravelDestination,
  travelDeviation,
  setTravelDeviation,
  setTravelOriginCoords,
  setTravelDestinationCoords,
  handleTravelSearch,
}: any) {
  const { t, i18n } = useTranslation();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [manualVehicle, setLocalManualVehicle] = useState({
    name: "",
    tank: "40",
    consumption: "5.5",
    fuel: "Benzina",
  });
  const [localSniperPrice, setLocalSniperPrice] = useState<string>(
    profile?.currentTankPrice?.toString() || "",
  );

  useEffect(() => {
    if (
      profile?.currentTankPrice !== undefined &&
      profile?.currentTankPrice !== null
    ) {
      if (parseFloat(localSniperPrice) !== profile.currentTankPrice) {
        setLocalSniperPrice(profile.currentTankPrice.toString());
      }
    } else {
      setLocalSniperPrice("");
    }
  }, [profile?.currentTankPrice]);

  useEffect(() => {
    if (vehicleSearch.length > 1) {
      const q = vehicleSearch.toLowerCase();
      // Instantly search the local database by name and keywords
      const matches = COMMON_VEHICLES_DB.filter((v) => {
        const nameMatch = v.vehicleName.toLowerCase().includes(q);
        const keywordMatch = v.keywords.some(
          (k: string) => k.includes(q) || q.includes(k),
        );
        return nameMatch || keywordMatch;
      }).slice(0, 4);

      setSuggestions(matches);
      setShowSuggest(true);
    } else {
      setShowSuggest(false);
    }
  }, [vehicleSearch]);

  const handleSaveLocalManual = async () => {
    await updateProfileData({
      vehicleName: manualVehicle.name || t("custom_car"),
      tankCapacity: Number(manualVehicle.tank) || 0,
      consumptionPer100Km: Number(manualVehicle.consumption) || 0,
      preferredFuelType: manualVehicle.fuel as any,
    });
    setIsManual(false);
    setVehicleSearch("");
    toast.success(t("vehicle_configured"), {
      description: manualVehicle.name || t("custom_car"),
    });
  };

  const selectSuggestion = async (s: any) => {
    await updateProfileData({
      vehicleName: s.vehicleName,
      tankCapacity: s.tankCapacity,
      consumptionPer100Km: s.consumptionPer100Km,
      preferredFuelType: s.fuelType || "Benzina",
    });
    setVehicleSearch("");
    setShowSuggest(false);
    toast.success(t("vehicle_configured"), {
      description: getTranslatedVehicleName(s.vehicleName, t),
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-20 sm:pb-0">
      {/* Total Savings Pill */}
      {profile?.totalSavings !== undefined && profile.totalSavings > 0 && (
        <Card className="p-3 px-4 rounded-3xl shadow-sm border-emerald-100 bg-emerald-50 flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-1.5 rounded-full">
              <Trophy className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="font-bold text-sm text-emerald-800">
              {t("total_savings", "Risparmio Cumulato")}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-emerald-700">
                {profile.totalSavings.toFixed(2)}€
              </span>
              <Dialog>
                <DialogTrigger className="text-emerald-500 hover:text-emerald-700 transition-colors p-1">
                  <Info className="h-4 w-4" />
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-3xl p-6 z-[3000]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <Info className="h-6 w-6 text-emerald-500" />
                      {t("savings_calc_title", "Calcolo del risparmio")}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-slate-600 mt-2">
                    <p>
                      {t("savings_calc_desc_1")}
                    </p>
                    <p>
                      {t("savings_calc_desc_2")}
                    </p>
                    <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end mt-4">
                    {!!profile?.lastSavingsAmount && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-slate-400 hover:text-slate-600 h-8"
                        onClick={() => {
                          if (
                            profile?.totalSavings !== undefined &&
                            profile?.lastSavingsAmount !== undefined
                          ) {
                            const reverted = Math.max(
                              0,
                              profile.totalSavings - profile.lastSavingsAmount,
                            );
                            updateProfileData({
                              totalSavings: reverted,
                              lastSavingsAmount: null,
                            });
                          }
                        }}
                      >
                        Annulla ultimo
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-400 hover:text-red-600 h-8"
                      onClick={() => {
                        updateProfileData({
                          totalSavings: 0,
                          lastSavingsAmount: null,
                        });
                      }}
                    >
                      Azzera
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {t("estimate_mimit", "Stima basata su dati MIMIT")}
            </span>
          </div>
        </Card>
      )}

      <div className="hidden sm:block">
        <Card className="p-1 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-slate-200/60 backdrop-blur bg-white/95 transition-all duration-300">
          <div className="flex p-1 gap-1">
            <button
              onClick={() => setSearchMode("fixed")}
              className={`flex-1 flex items-center justify-center py-3 px-2 rounded-2xl transition-all ${searchMode === "fixed" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
              title={t("fixed_point")}
            >
              <RadarPinIcon className="h-6 w-6" />
            </button>
            <button
              onClick={() => setSearchMode("travel")}
              className={`flex-1 flex items-center justify-center py-3 px-2 rounded-2xl transition-all ${searchMode === "travel" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
              title={t("trip")}
            >
              <RouteABIcon className="h-6 w-6" />
            </button>
          </div>
        </Card>
      </div>

      <AnimatePresence mode="wait">
        {searchMode === "travel" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-slate-200/60 backdrop-blur bg-white/95 transition-all duration-300 text-left">
              <div className="flex items-center gap-2 mb-4">
                <Route className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-lg text-slate-800">
                  {t("search_on_route")}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {t("starting_point")}
                  </Label>
                  <PlaceAutocompleteInput
                    value={travelOrigin}
                    onChange={setTravelOrigin}
                    onSelect={(lat, lon, name) =>
                      setTravelOriginCoords([lat, lon])
                    }
                    placeholder="es. Milano"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {t("destination")}
                  </Label>
                  <PlaceAutocompleteInput
                    value={travelDestination}
                    onChange={setTravelDestination}
                    onSelect={(lat, lon, name) =>
                      setTravelDestinationCoords([lat, lon])
                    }
                    placeholder="es. Roma"
                  />
                </div>

                <div className="pt-3 pb-1 flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {t("max_deviation")}
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-600 font-black"
                    >
                      {travelDeviation === 0
                        ? t("only_on_route")
                        : travelDeviation + " KM"}
                    </Badge>
                  </div>
                  <Slider
                    value={[Math.min(30, Math.max(0, travelDeviation))]}
                    max={30}
                    min={0}
                    step={1}
                    onValueChange={(val: any) => {
                      const rawValue = Array.isArray(val) ? val[0] : val;
                      let num =
                        typeof rawValue === "number" && !isNaN(rawValue)
                          ? rawValue
                          : 0;
                      const finalVal = Math.min(30, Math.max(0, num));
                      setTravelDeviation(finalVal);
                      setLocalRadarRadius(finalVal);
                    }}
                  />
                  <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest text-center">
                    {t("from_optimal_route")}
                  </p>
                </div>

                <Button
                  className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 tracking-wide shadow-md font-bold text-sm uppercase"
                  onClick={handleTravelSearch}
                >
                  {t("search_on_route")}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card
        className={`p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-slate-200/60 backdrop-blur bg-white/95 transition-all duration-300`}
      >
        <div className="flex items-center gap-2 mb-4 justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-lg">{t("your_vehicle")}</h2>
          </div>
          {profile?.vehicleName && !isManual && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 bg-white shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
              onClick={() => {
                updateProfileData({ vehicleName: "" });
                // TRACCIAMENTO GA4
                try {
                  if (analytics) {
                    logEvent(analytics, "apertura_profilo_auto");
                  }
                } catch (e) {
                  console.error("GA4 Error", e);
                }
                // TRACCIAMENTO GA4
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isManual ? (
          <div className="space-y-4">
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {t("vehicle_name")}
                </Label>
                <Input
                  value={manualVehicle.name}
                  placeholder={t("fiat_panda_placeholder")}
                  className="h-10 rounded-xl bg-white border-slate-200 font-bold"
                  onChange={(e) =>
                    setLocalManualVehicle({
                      ...manualVehicle,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {t("tank_capacity")}
                  </Label>
                  <Input
                    type="number"
                    value={manualVehicle.tank}
                    className="h-10 rounded-xl bg-white border-slate-200 font-bold"
                    onChange={(e) =>
                      setLocalManualVehicle({
                        ...manualVehicle,
                        tank: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {t("consumption")}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={manualVehicle.consumption}
                    className="h-10 rounded-xl bg-white border-slate-200 font-bold"
                    onChange={(e) =>
                      setLocalManualVehicle({
                        ...manualVehicle,
                        consumption: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {t("fuel_type")}
                </Label>
                <select
                  value={manualVehicle.fuel}
                  onChange={(e) =>
                    setLocalManualVehicle({
                      ...manualVehicle,
                      fuel: e.target.value,
                    })
                  }
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Benzina">
                    {t("fuel_Benzina").toUpperCase()}
                  </option>
                  <option value="Gasolio">
                    DIESEL / {t("fuel_Gasolio").toUpperCase()}
                  </option>
                  <option value="GPL">{t("fuel_GPL").toUpperCase()}</option>
                  <option value="Metano">
                    {t("fuel_Metano").toUpperCase()}
                  </option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl font-bold uppercase text-[10px]"
                onClick={() => setIsManual(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSaveLocalManual}
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-tighter shadow-md text-xs"
              >
                {t("save_config")}
              </Button>
            </div>
          </div>
        ) : !profile?.vehicleName ? (
          <div className="space-y-4">
            <div className="relative z-[200]">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={t("search_brand_model")}
                    className="pl-9 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-medium"
                    value={vehicleSearch}
                    onChange={(e: any) => setVehicleSearch(e.target.value)}
                    onKeyDown={(e: any) =>
                      e.key === "Enter" && handleVehicleAISearch()
                    }
                  />
                </div>
                <Button
                  size="icon"
                  className="h-11 w-11 rounded-xl shrink-0"
                  onClick={() => handleVehicleAISearch()}
                  disabled={isSearchingAI || !vehicleSearch}
                >
                  {isSearchingAI ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <AnimatePresence>
                {showSuggest && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[2000] overflow-hidden"
                  >
                    {suggestions.length > 0 ? (
                      suggestions.map((s, i) => (
                        <div
                          key={i}
                          className="p-4 hover:bg-indigo-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 group"
                          onClick={() => selectSuggestion(s)}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm">
                              {getTranslatedVehicleName(s.vehicleName, t)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              {t(`fuel_${s.fuelType || "Benzina"}`)} •{" "}
                              {s.tankCapacity}L • {s.consumptionPer100Km}L/100km
                            </span>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-indigo-200 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      ))
                    ) : (
                      <div
                        onClick={() => handleVehicleAISearch()}
                        className="p-4 bg-indigo-50/50 hover:bg-indigo-100 cursor-pointer flex justify-between items-center group transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-indigo-700 text-sm flex items-center gap-1.5">
                            {isSearchingAI ? (
                              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            ) : (
                              <Search className="h-4 w-4 text-indigo-600" />
                            )}
                            {t("ai_search_prompt")} "{vehicleSearch}"
                          </span>
                          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-1">
                            {t("ai_search_desc")}
                          </span>
                        </div>
                        <div className="bg-indigo-600 text-white p-1.5 rounded-full shadow-md group-hover:scale-110 transition-transform">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="rounded-xl h-10 text-[10px] font-bold border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                onClick={() =>
                  selectSuggestion({
                    vehicleName: "Utilitaria Benzina",
                    tankCapacity: 45,
                    consumptionPer100Km: 5.8,
                    fuelType: "Benzina",
                  })
                }
              >
                {t("standard_petrol")}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl h-10 text-[10px] font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={() =>
                  selectSuggestion({
                    vehicleName: "Media Diesel",
                    tankCapacity: 50,
                    consumptionPer100Km: 4.8,
                    fuelType: "Gasolio",
                  })
                }
              >
                {t("standard_diesel")}
              </Button>
            </div>

            <Separator className="bg-slate-100" />

            <Button
              variant="ghost"
              className="w-full text-xs font-bold text-slate-500 hover:text-indigo-600 h-8"
              onClick={() => {
                setIsManual(true);
                // TRACCIAMENTO GA4
                try {
                  if (analytics) {
                    logEvent(analytics, "apertura_profilo_auto");
                  }
                } catch (e) {
                  console.error("GA4 Error", e);
                }
                // TRACCIAMENTO GA4
              }}
            >
              {t("manual_config")} +
            </Button>
          </div>
        ) : (
          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-800">
                  {getTranslatedVehicleName(profile.vehicleName, t)}
                </h3>
                <p className="text-xs text-slate-500 flex gap-1 mt-0.5 font-medium">
                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md uppercase tracking-widest text-[9px] font-bold">
                    {t(`fuel_${profile.preferredFuelType || "Benzina"}`)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-4 mt-1 text-slate-600">
              <div className="flex items-center gap-1">
                <Fuel className="h-3 w-3" />
                <span className="text-[10px] font-extrabold">
                  {profile.tankCapacity}L max
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Navigation2 className="h-3 w-3" />
                <span className="text-[10px] font-extrabold">
                  {profile.consumptionPer100Km} L/100km
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Radar Parameters */}
      {searchMode === "fixed" && (
        <Card
          className={`p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-slate-200/60 backdrop-blur bg-white/95 transition-all duration-300`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-indigo-500" />
              <h2 className="font-bold text-lg">{t("radar_zone")}</h2>
            </div>
            <Badge
              variant="secondary"
              className="bg-slate-100 text-slate-600 font-black"
            >
              {localRadarRadius} KM
            </Badge>
          </div>
          <Slider
            value={[
              Math.min(
                profile?.highwayMode ? 150 : 30,
                Math.max(1, localRadarRadius || 5),
              ),
            ]}
            max={profile?.highwayMode ? 150 : 30}
            min={1}
            step={1}
            onValueChange={(val: any) => {
              const rawValue = Array.isArray(val) ? val[0] : val;
              let num =
                typeof rawValue === "number" && !isNaN(rawValue) ? rawValue : 5;
              setLocalRadarRadius(
                Math.min(profile?.highwayMode ? 150 : 30, Math.max(1, num)),
              );
            }}
          />
          <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest text-center">
            {t("radar_radius_hint")}
          </p>
        </Card>
      )}

      <Card
        className={`p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-slate-200/60 backdrop-blur bg-white/95 transition-all duration-300`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-5 w-5 text-indigo-600" />
          <h2 className="font-bold text-lg">{t("settings")}</h2>
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-bold text-slate-700">
            {t("language")}
          </span>
          <div className="flex gap-2">
            <Button
              variant={i18n.language === "it" ? "default" : "outline"}
              size="sm"
              onClick={() => i18n.changeLanguage("it")}
              className={i18n.language === "it" ? "bg-indigo-600" : ""}
            >
              IT
            </Button>
            <Button
              variant={i18n.language === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => i18n.changeLanguage("en")}
              className={i18n.language === "en" ? "bg-indigo-600" : ""}
            >
              EN
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-bold text-slate-700">
            {t("tutorial")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOnboarding(true)}
            className="gap-2"
          >
            <Info className="w-4 h-4" /> {t("replay_tutorial")}
          </Button>
        </div>

        {searchMode !== "travel" && (
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-bold text-slate-700">
              {t("highway_mode")}
            </span>
            <Switch
              checked={profile?.highwayMode ?? false}
              onCheckedChange={async (checked) => {
                const updates: any = { highwayMode: checked };
                if (!checked && (profile?.actionRadiusKm || 5) > 30) {
                  updates.actionRadiusKm = 30;
                  setLocalRadarRadius(30);
                }
                await updateProfileData(updates);
                toast.success(t("radar_updated"));
              }}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700">
                {t("include_stale")}
              </span>
            </div>
            <Switch
              checked={profile?.includeStalePrices ?? false}
              onCheckedChange={async (checked) => {
                await updateProfileData({ includeStalePrices: checked });
                toast.success(t("radar_updated"));
              }}
            />
          </div>
          <div className="flex items-start gap-2 mt-1">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              {t("include_stale_info")}
            </p>
          </div>
        </div>

        {/* Snipe Mode Settings */}
        <div className="bg-amber-50 border border-amber-100/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Crosshair className="h-4 w-4 text-amber-500 animate-pulse" />
            <span className="text-xs font-extrabold text-amber-900 uppercase tracking-widest">
              {t("sniper_mode")}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                {t("current_tank_price")}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">€</span>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="Es: 1.850"
                  className="h-10 text-sm font-bold bg-white border-slate-200"
                  value={localSniperPrice}
                  onChange={(e) => {
                    setLocalSniperPrice(e.target.value);
                    const val = parseFloat(e.target.value);
                    updateProfileData({
                      currentTankPrice: isNaN(val) ? null : val,
                    });
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                {t("current_tank_price_desc")}
              </p>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-amber-200/50">
              <div className="pr-4">
                <span className="text-sm font-bold text-slate-700 block mb-1">
                  {t("auto_update_sniper")}
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {t("auto_update_sniper_desc")}
                </p>
              </div>
              <Switch
                checked={profile?.autoUpdateSniperPrice ?? false}
                onCheckedChange={async (checked) => {
                  await updateProfileData({ autoUpdateSniperPrice: checked });
                }}
              />
            </div>
          </div>
        </div>
      </Card>
      
      {/* Footer Links */}
      <div className="flex flex-col gap-2 px-2 mt-4 text-center pb-4">
        <Dialog>
          <DialogTrigger className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
            {t("terms_title", "Termini e Condizioni")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 z-[4000] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t("terms_title", "Termini e Condizioni")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-slate-600 mt-2">
              <p>
                <strong>{t("safety_title", "Guida con prudenza")}</strong>
              </p>
              <p>
                {t("safety_desc_1")}
              </p>
              <p>
                {t("safety_desc_2")}
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
            {t("privacy_policy_title", "Privacy Policy")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 z-[4000] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t("privacy_policy_title", "Privacy Policy")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-slate-600 mt-2">
              <p>
                <strong>{t("privacy_title", "La tua privacy su Birroo")}</strong>
              </p>
              <p>
                {t("cookie_desc_1")}
              </p>
              <p>
                {t("cookie_desc_2")}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function BirrooLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <g transform="rotate(-15 50 50)">
        <ellipse
          cx="50"
          cy="50"
          rx="35"
          ry="20"
          fill="none"
          stroke="#f43f5e"
          strokeWidth="4"
        />
        <circle cx="50" cy="50" r="8" fill="#f43f5e" />
        <path
          d="M45 75 Q50 85 55 75"
          stroke="#f43f5e"
          strokeWidth="2"
          fill="none"
        />
      </g>
    </svg>
  );
}

function GoogleLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const MAJOR_BRANDS = [
  "Eni",
  "IP",
  "Esso",
  "Q8",
  "Tamoil",
  "Repsol",
  "Conad",
  "Coop",
  "Carrefour",
  "Vega",
  "Api",
  "TotalErg",
  "Retitalia",
  "Europam",
  "Enercoop",
];

export const getBrandGroup = (brand: string) => {
  if (!brand) return "Pompe Bianche";
  const upperString = brand.toUpperCase();
  const found = MAJOR_BRANDS.find((b) => upperString.includes(b.toUpperCase()));
  if (found) {
    if (found.toUpperCase() === "TOTALERG" || found.toUpperCase() === "API")
      return "IP";
    return found;
  }
  return "Pompe Bianche";
};

const StationMarker = React.memo(({ station, zIndex, bgClass, topBadgeHtml, onClick }: any) => {
  const icon = React.useMemo(() => {
    return L.divIcon({
      html: `<div class="relative px-2 py-1 flex items-center justify-center rounded-full text-[11px] font-bold shadow-md border-2 transition-transform ${bgClass}">
         ${station.pricePerLiter.toFixed(3)}
         ${topBadgeHtml}
       </div>`,
      className: "",
      iconSize: [44, 26],
      iconAnchor: [22, 13],
    });
  }, [station.pricePerLiter, bgClass, topBadgeHtml]);

  const onClickRef = React.useRef(onClick);
  React.useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  return (
    <Marker
      position={[station.lat, station.lng]}
      zIndexOffset={zIndex}
      icon={icon}
      eventHandlers={{ click: () => onClickRef.current() }}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.station.id === nextProps.station.id &&
         prevProps.zIndex === nextProps.zIndex &&
         prevProps.bgClass === nextProps.bgClass &&
         prevProps.topBadgeHtml === nextProps.topBadgeHtml;
});

function MainApp() {
  const { t, i18n } = useTranslation();
  const { user, profile, loading, updateProfileData } = useAuth();

  const [safetyAccepted, setSafetyAccepted] = useState(() => {
    return localStorage.getItem("birroo_safety_accepted") === "true";
  });
  const [cookieConsent, setCookieConsent] = useState(() => {
    return localStorage.getItem("birroo_cookie_consent") || null;
  });

  useEffect(() => {
    if (cookieConsent === "accepted") {
      initAnalytics();
    }
  }, [cookieConsent]);

  const [showOnboarding, setShowOnboarding] = useState(false);

  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [isBrandDrawerOpen, setIsBrandDrawerOpen] = useState(false);
  const [pendingRefuel, setPendingRefuel] = useState<any>(null);
  const [reportedPrice, setReportedPrice] = useState<string>("");
  const [reportedLiters, setReportedLiters] = useState<string>("");
  const hasRequestedLocationRef = useRef(false);

  useEffect(() => {
    setTopStations([]);
    setActiveStation(null);
  }, [selectedBrands]);

  useEffect(() => {
    if (!loading) {
      let needsOnboarding = false;
      if (!user) {
        needsOnboarding = true;
      } else {
        needsOnboarding =
          localStorage.getItem("birroo_hide_onboarding") !== "true";
      }
      setShowOnboarding(needsOnboarding);

      if (!needsOnboarding && !hasRequestedLocationRef.current) {
        hasRequestedLocationRef.current = true;
        handleLocateMe();
      }
    }
  }, [user, loading]);

  const [searchMode, setSearchMode] = useState<"fixed" | "travel">("fixed");
  const [travelOrigin, setTravelOrigin] = useState("");
  const [travelDestination, setTravelDestination] = useState("");
  const [travelOriginCoords, setTravelOriginCoords] = useState<
    [number, number] | null
  >(null);
  const [travelDestinationCoords, setTravelDestinationCoords] = useState<
    [number, number] | null
  >(null);
  const [travelDeviation, setTravelDeviation] = useState(5);
  const [travelRoute, setTravelRoute] = useState<[number, number][] | null>(
    null,
  );
  const [travelDistance, setTravelDistance] = useState<number>(0);

  const [center, setCenter] = useState<[number, number]>([41.9028, 12.4964]); // Rome default
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [stations, setStations] = useState<any[]>([]);
  const [realDistanceCache, setRealDistanceCache] = useState<
    Record<string, { distanceKm: number; deviationKm: number }>
  >({});

  const [isLocating, setIsLocating] = useState(false);
  const [showLocationBlockedDialog, setShowLocationBlockedDialog] =
    useState(false);
  const [showHighwayPrompt, setShowHighwayPrompt] = useState(false);
  const [showLoginPromptDialog, setShowLoginPromptDialog] = useState(false);
  const initialLocationCheckDoneRef = useRef(false);
  const [activeStation, setActiveStation] = useState<any | null>(null);
  const [topStations, setTopStations] = useState<any[]>([]);
  const manualLocationRef = useRef(false);

  const [lastSearchContext, setLastSearchContext] = useState<any>(null);

  // Radar Params
  const [radarRadius, setRadarRadius] = useState(profile?.actionRadiusKm || 5); // km
  const [localRadarRadius, setLocalRadarRadius] = useState(radarRadius);
  const [localAvgPrice, setLocalAvgPrice] = useState(1.85);
  const [localTotalAvgPrice, setLocalTotalAvgPrice] = useState(1.85);
  const [provinceAvgPrice, setProvinceAvgPrice] = useState<number | null>(null);
  const [regionalAvgPrice, setRegionalAvgPrice] = useState<number | null>(null);
  const [provinceName, setProvinceName] = useState<string>("");
  const [regionName, setRegionName] = useState<string>("");
  const [locationReady, setLocationReady] = useState(false);

  const computeAverages = (validStations: any[]) => {
    if (validStations.length === 0) return { totalAvg: 0, displayAvg: 0 };

    const totalAvg =
      validStations.reduce((acc, val) => acc + val.pricePerLiter, 0) /
      validStations.length;

    if (validStations.length === 1) {
      return { totalAvg, displayAvg: totalAvg };
    }

    // Find the single best station (min price)
    let bestStation = validStations[0];
    for (const s of validStations) {
      if (s.pricePerLiter < bestStation.pricePerLiter) {
        bestStation = s;
      }
    }

    // Compute displayAvg excluding ONLY this exact best station (if there are ties, only one is excluded)
    let excluded = false;
    let sumOthers = 0;
    let countOthers = 0;
    for (const s of validStations) {
      if (!excluded && s.id === bestStation.id) {
        excluded = true;
      } else {
        sumOthers += s.pricePerLiter;
        countOthers++;
      }
    }
    const displayAvg = sumOthers / countOthers;

    return { totalAvg, displayAvg };
  };
  const [isFetchingStations, setIsFetchingStations] = useState(false);

  const availableBrands = React.useMemo(() => {
    const brandsRaw = stations.map((s) => getBrandGroup(s.brand));
    return Array.from(new Set(brandsRaw)).sort();
  }, [stations]);

  // Pull to refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const touchStartYDrawer = useRef(0);
  const touchStartYStation = useRef(0);
  const isAtTopRef = useRef(true);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only trigger pull to refresh if we are at the top of the viewport (or close to it)
    if (window.scrollY < 10) {
      isAtTopRef.current = true;
      touchStartY.current = e.touches[0].clientY;
    } else {
      isAtTopRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAtTopRef.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    // We only care about downward swipes
    if (diff > 0) {
      // Resistance factor
      const resist = Math.min(diff * 0.7, 120);
      setIsPulling(true);
      setPullDistance(resist);

      // Prevent browser default pull-to-refresh behavior
      if (resist > 20 && e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      if (manualLocationRef.current) {
        // If manually searched, just trigger a re-fetch without changing center
        setRadarRadius((r) => r + 0.0001); // hack to trigger the useEffect
        toast.success(t("refreshing_prices"));
      } else {
        handleLocateMe(); // Triggers GPS and then station fetch
        toast.success(t("gps_align_refresh"));
      }
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  // Fix iOS Safari scroll bug when keyboard is dismissed
  useEffect(() => {
    const handleFocusOut = () => {
      window.scrollTo(0, 0);
    };
    document.addEventListener("focusout", handleFocusOut);
    return () => document.removeEventListener("focusout", handleFocusOut);
  }, []);

  // Sync profile changes to radar
  useEffect(() => {
    if (profile?.actionRadiusKm) {
      setRadarRadius((r) =>
        Math.abs(r - profile.actionRadiusKm) > 0.1 ? profile.actionRadiusKm : r,
      );
      setLocalRadarRadius((prev) =>
        Math.abs(prev - profile.actionRadiusKm) > 0.1
          ? profile.actionRadiusKm
          : prev,
      );
    }
  }, [profile?.actionRadiusKm]);

  // Reliable Debounce for Radar Slider (Fixes onValueCommit error and Map rendering)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Math.abs(radarRadius - localRadarRadius) > 0.1) {
        setRadarRadius(localRadarRadius);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [localRadarRadius, radarRadius]);

  // Recompute valid stations and averages when filters or stations change
  useEffect(() => {
    if (stations.length > 0) {
      const includeStale = profile?.includeStalePrices ?? false;
      const validStations = stations.filter(
        (s: any) =>
          (!s.isStale || includeStale) &&
          !s.isBlacklisted &&
          s.pricePerLiter > 0 &&
          (selectedBrands.length === 0 ||
            selectedBrands.includes(getBrandGroup(s.brand))),
      );
      const averages = computeAverages(validStations);
      setLocalAvgPrice(Number(averages.displayAvg.toFixed(3)));
      setLocalTotalAvgPrice(Number(averages.totalAvg.toFixed(3)));
    }
  }, [profile?.includeStalePrices, stations, selectedBrands]);

  // AI Autocomplete State
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [isSuggestingBest, setIsSuggestingBest] = useState(false);

  // Place Autocomplete State
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<any[]>([]);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(false);
  const [isPlaceSearchFocused, setIsPlaceSearchFocused] = useState(false);
  const isSelectingPlaceRef = useRef(false);
  const placeSearchLastRef = useRef("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchPlaceSuggestions = useCallback(async (queryStr: string) => {
    if (queryStr.trim().length <= 2) {
      setPlaceSuggestions([]);
      return;
    }
    setIsFetchingPlaces(true);
    placeSearchLastRef.current = queryStr;

    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&countrycodes=it&limit=8&addressdetails=1`,
      );
      const data = await r.json();
      const results = data || [];
      results.sort((a: any, b: any) => {
        const getScore = (t: string) => {
          if (t === "city" || t === "municipality") return 10;
          if (t === "town") return 9;
          if (t === "village") return 8;
          if (t === "suburb" || t === "neighbourhood") return 7;
          if (t === "road") return 6;
          if (
            t !== "county" &&
            t !== "state" &&
            t !== "region" &&
            t !== "country"
          )
            return 5;
          return 0; // county
        };
        return (
          getScore(b.addresstype || b.class) -
          getScore(a.addresstype || a.class)
        );
      });
      setPlaceSuggestions(results);
    } catch (e) {
      setPlaceSuggestions([]);
    } finally {
      setIsFetchingPlaces(false);
    }
  }, []);

  useEffect(() => {
    if (!isPlaceSearchFocused) return;
    const timer = setTimeout(() => {
      if (isSelectingPlaceRef.current) {
        isSelectingPlaceRef.current = false;
        return;
      }
      if (
        placeQuery.trim().length > 2 &&
        placeQuery !== placeSearchLastRef.current
      ) {
        fetchPlaceSuggestions(placeQuery);
      } else if (placeQuery.trim().length <= 2) {
        setPlaceSuggestions([]);
        placeSearchLastRef.current = "";
      }
    }, 600); // 600ms debounce
    return () => clearTimeout(timer);
  }, [placeQuery, isPlaceSearchFocused, fetchPlaceSuggestions]);

  // Refuel Dashboard state
  const [refuelOption, setRefuelOption] = useState<
    "full" | "three-quarters" | "half" | "quarter" | "custom"
  >("full");
  const [tripType, setTripType] = useState<"one-way" | "round-trip">(
    "round-trip",
  );
  const [customLiters, setCustomLiters] = useState(20);

  const checkAndShowLoginPrompt = () => {
    if (initialLocationCheckDoneRef.current) return;
    initialLocationCheckDoneRef.current = true;
    if (!user && !sessionStorage.getItem("birroo_skipped_login")) {
      setShowLoginPromptDialog(true);
    }
  };

  const handleLocateMe = () => {
    manualLocationRef.current = false;
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos && pos.coords && typeof pos.coords.latitude === "number") {
            setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          }
          if (
            !manualLocationRef.current &&
            pos &&
            pos.coords &&
            typeof pos.coords.latitude === "number"
          ) {
            setCenter([pos.coords.latitude, pos.coords.longitude]);
            toast.success(t("position_updated"), {
              description: t("position_updated_desc"),
            });
          }
          setIsLocating(false);
          setLocationReady(true);
          checkAndShowLoginPrompt();
        },
        (err) => {
          // TRACCIAMENTO GA4
          try {
            if (analytics) {
              logEvent(analytics, "errore_geolocalizzazione", {
                motivo: err.code === 1 ? "permesso_negato" : "errore_tecnico",
              });
            }
          } catch (e) {
            console.error("GA4 Error", e);
          }
          // TRACCIAMENTO GA4

          let blocked = false;
          if (!manualLocationRef.current) {
            console.warn("Geo error:", err);
            if (err.code === 1) {
              // PERMISSION_DENIED
              setShowLocationBlockedDialog(true);
              blocked = true;
            } else {
              toast.error(t("gps_error"), { description: t("gps_error_desc") });
            }
          }
          setIsLocating(false);
          setLocationReady(true);
          if (!blocked) {
            checkAndShowLoginPrompt();
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
      );
    } else {
      if (manualLocationRef.current) return;
      setLocationReady(true);
      toast.error(t("gps_not_supported"));
      checkAndShowLoginPrompt();
    }
  };

  const fetchRouteData = async (waypoints: [number, number][], useTolls: boolean) => {
    // Attempt Valhalla first
    try {
      const locations = waypoints.map((wp) => `{"lat":${wp[0]},"lon":${wp[1]}}`).join(",");
      const url = `https://valhalla1.openstreetmap.de/route?json={"locations":[${locations}],"costing":"auto","costing_options":{"auto":{"use_tolls":${useTolls ? 1 : 0}}}}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data?.trip?.summary) {
          let coords: [number, number][] = [];
          if (data.trip.legs && data.trip.legs.length > 0) {
            coords = data.trip.legs.flatMap((leg: any) => decodePolyline6(leg.shape));
          }
          return {
            distanceKm: data.trip.summary.length,
            coords: coords,
          };
        }
      }
    } catch (e) {
      console.warn("Valhalla fetch failed, falling back to OSRM", e);
    }
    
    // Fallback OSRM
    try {
      const coordsStr = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(";");
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data?.routes?.[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
          return {
            distanceKm: route.distance / 1000,
            coords: coords,
          };
        }
      }
    } catch (e) {
      console.error("OSRM fetch failed", e);
    }
    return null;
  };

  const handleTravelSearch = async () => {
    setIsDrawerOpen(false);
    let originCoord = travelOriginCoords;
    let destCoord = travelDestinationCoords;

    if (!originCoord && travelOrigin.trim()) {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(travelOrigin)}&countrycodes=it&limit=1`,
        );
        const d = await r.json();
        if (d && d.length > 0)
          originCoord = [parseFloat(d[0].lat), parseFloat(d[0].lon)];
      } catch (e) {}
    }

    if (!destCoord && travelDestination.trim()) {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(travelDestination)}&countrycodes=it&limit=1`,
        );
        const d = await r.json();
        if (d && d.length > 0)
          destCoord = [parseFloat(d[0].lat), parseFloat(d[0].lon)];
      } catch (e) {}
    }

    if (!originCoord || !destCoord) {
      toast.error(
        "Inserisci località valide per la partenza e la destinazione.",
      );
      return;
    }

    setTravelOriginCoords(originCoord);
    setTravelDestinationCoords(destCoord);
    setShowHighwayPrompt(true);
  };

  const executeTravelSearch = async (useHighways: boolean) => {
    setShowHighwayPrompt(false);
    updateProfileData({ highwayMode: useHighways });

    const originCoord = travelOriginCoords;
    const destCoord = travelDestinationCoords;
    if (!originCoord || !destCoord) return;

    toast.info("Calcolo del percorso in corso...");

    try {
      const routeData = await fetchRouteData([originCoord, destCoord], useHighways);

      if (routeData && routeData.coords.length > 0) {
        const validRoute = routeData.coords.filter((c: any) => Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1]));
        setTravelRoute(validRoute);
        setTravelDistance(routeData.distanceKm);

        // Move the map to the midpoint to view the route, and artificially inflate radar to fetch stations around it
        // Realistically, you'd want to request stations along the path, but this solves it with existing API
        const coords = validRoute;
        if (coords.length > 0) {
          const midIdx = Math.floor(coords.length / 2);
          const midpoint = coords[midIdx];
          setCenter([midpoint[0], midpoint[1]]);
          // We map travelDeviation into radar radius
          setLocalRadarRadius(travelDeviation);
          setRadarRadius(travelDeviation);
          toast.success(
            useHighways
              ? "Percorso calcolato (Autostrade Incluse)!"
              : "Percorso calcolato (Evitando Autostrade, se possibile)!",
          );
        }
      } else {
        toast.error("Impossibile trovare un percorso tra queste due città.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Errore nel calcolo del percorso.");
    }
  };

  const [retryCounter, setRetryCounter] = useState(0);

  // Just-in-time calculation for exact distance
  useEffect(() => {
    if (activeStation && !realDistanceCache[activeStation.id]) {
      let isMounted = true;
      const getDistance = async () => {
        try {
          if (
            searchMode === "travel" &&
            travelOriginCoords &&
            travelDestinationCoords
          ) {
            const useHighways = profile?.highwayMode ?? false;
            const routeData = await fetchRouteData([travelOriginCoords, [activeStation.lat, activeStation.lng], travelDestinationCoords], useHighways);
            if (routeData) {
              const totalWithDeviation = routeData.distanceKm; // km
              const deviationKm = Math.max(
                0,
                totalWithDeviation - travelDistance,
              );
              if (isMounted) {
                setRealDistanceCache((prev) => ({
                  ...prev,
                  [activeStation.id]: {
                    distanceKm: totalWithDeviation,
                    deviationKm,
                  },
                }));
              }
            }
          } else {
            const routeData = await fetchRouteData([center, [activeStation.lat, activeStation.lng]], false);
            if (routeData) {
              const distanceKm = routeData.distanceKm;
              if (isMounted) {
                setRealDistanceCache((prev) => ({
                  ...prev,
                  [activeStation.id]: { distanceKm, deviationKm: 0 },
                }));
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      getDistance();
      return () => {
        isMounted = false;
      };
    }
  }, [
    activeStation,
    searchMode,
    center,
    travelOriginCoords,
    travelDestinationCoords,
    profile,
    travelDistance,
  ]);

  // Fetch stations when center changes OR location is finally ready
  useEffect(() => {
    if (!locationReady) return;
    setIsFetchingStations(true);

    const abortController = new AbortController();
    const preferredFuel = profile?.preferredFuelType || "Benzina";

    const attemptFetch = async (retriesLeft = 2) => {
      try {
        const highwayMode = profile?.highwayMode ?? false; // Defaults to false to hide highways for local commute
        const routeParam =
          searchMode === "travel" && travelRoute ? travelRoute : undefined;
        const effectiveRadius =
          searchMode === "travel"
            ? travelDeviation * 1000
            : radarRadius === 0 ? 500 : radarRadius * 1000;
        const result = await fetchNearbyStations(
          center[0],
          center[1],
          effectiveRadius,
          abortController.signal,
          preferredFuel,
          highwayMode,
          routeParam,
          selectedBrands,
        );

        if (abortController.signal.aborted) return;

        if (result.loadingStatus) {
          toast.loading(t("mimit_load"), {
            description: t("mimit_load_desc"),
            id: "mimit-load",
          });
          // Retry softly in 2 seconds for MIMIT downloading
          setTimeout(() => {
            if (!abortController.signal.aborted) {
              setRetryCounter((r) => r + 1); // trigger strict re-render without modifying radar
            }
          }, 2000);
          return;
        }

        toast.dismiss("mimit-load");
        const data = result.elements || [];

        const blacklist = profile?.blacklistedStations || [];

        const processedData = data.map((s: any) => ({
          ...s,
          isBlacklisted: blacklist.includes(s.id),
        }));

        setStations(processedData);
        setRealDistanceCache({});

        if (processedData.length === 0) {
          toast.info(t("no_stations"), { description: t("no_stations_desc") });
        }

        if (result.provinceAvg) setProvinceAvgPrice(result.provinceAvg);
        if (result.regionalAvg) setRegionalAvgPrice(result.regionalAvg);
        if (result.provinceName) setProvinceName(result.provinceName);
        if (result.regionName) setRegionName(result.regionName);

        setIsFetchingStations(false);
      } catch (err: any) {
        if (
          abortController.signal.aborted ||
          err.name === "AbortError" ||
          err.message === "AbortError"
        )
          return;

        toast.dismiss("mimit-load");
        if (retriesLeft > 0) {
          setTimeout(() => {
            if (!abortController.signal.aborted) attemptFetch(retriesLeft - 1);
          }, 1500); // Wait 1.5s then retry
        } else {
          toast.error(t("network_error"), {
            description: t("network_error_desc"),
          });
          setIsFetchingStations(false);
        }
      }
    };

    attemptFetch();

    return () => {
      abortController.abort();
    };
  }, [
    center,
    radarRadius,
    locationReady,
    profile?.preferredFuelType,
    profile?.highwayMode,
    searchMode,
    travelRoute,
    travelDeviation,
    retryCounter,
    selectedBrands,
  ]);

  const handleVehicleAISearch = async (query?: string) => {
    const searchVal = query || vehicleSearch;
    if (!searchVal) return;
    setIsSearchingAI(true);
    const data = await estimateVehicleData(searchVal);
    if (data && data.vehicleName) {
      const oldFuel = profile?.preferredFuelType;
      await updateProfileData({
        vehicleName: data.vehicleName,
        tankCapacity: data.tankCapacity,
        consumptionPer100Km: data.consumptionPer100Km,
        preferredFuelType: data.fuelType || "Benzina",
      });

      if (data.fuelType && data.fuelType !== oldFuel) {
        toast.success(t("fuel_aligned", { fuel: data.fuelType }), {
          description: t("fuel_aligned_desc", {
            fuel: data.fuelType,
            vehicle: getTranslatedVehicleName(data.vehicleName, t),
          }),
        });
      } else {
        toast.success(t("vehicle_configured"), {
          description: getTranslatedVehicleName(data.vehicleName, t),
        });
      }
      setVehicleSearch("");
    } else {
      toast.error(t("not_found"), { description: t("not_found_desc") });
    }
    setIsSearchingAI(false);
  };

  const calculateBreakeven = (station: any, customDistanceCache?: any, actualLiters?: number) => {
    const tankCap = (profile && profile.tankCapacity > 0) ? profile.tankCapacity : 50;
    const cons100 = (profile && profile.consumptionPer100Km > 0) ? profile.consumptionPer100Km : 6;

    const currentPriceInTank =
      profile.currentTankPrice && profile.currentTankPrice > 0
        ? profile.currentTankPrice
        : (station._snapshotTotalAvgPrice || localTotalAvgPrice);

    const cacheToUse = customDistanceCache || realDistanceCache;

    let deviationCost = 0;
    let distanceKm = 0;
    let estimatedTotalTripCost = 0;

    if (searchMode === "travel") {
      const cached = cacheToUse[station.id];
      if (cached !== undefined) {
        distanceKm = cached.deviationKm;
        // Total trip is original route + deviation
        const totalTripDistance = travelDistance + distanceKm;
        estimatedTotalTripCost =
          (totalTripDistance / 100) *
          cons100 *
          currentPriceInTank;
      } else {
        // Heuristic: Deviation distance to reach the station and get back to the route (approx * 1.3 for actual road)
        distanceKm = (station._distance || 0) * 1.3 * 2;
        const totalTripDistance = travelDistance + distanceKm;
        estimatedTotalTripCost =
          (totalTripDistance / 100) *
          cons100 *
          currentPriceInTank;
      }
      deviationCost =
        (distanceKm / 100) * cons100 * currentPriceInTank;
    } else {
      // Fixed Mode: Distance from center point to station (round trip available)
      const cached = cacheToUse[station.id];
      if (cached !== undefined) {
        distanceKm = cached.distanceKm;
      } else {
        distanceKm =
          calculateDistance(center[0], center[1], station.lat, station.lng) *
          1.3;
      }
      const multiplier = tripType === "round-trip" ? 2 : 1;
      deviationCost =
        (distanceKm / 100) *
        cons100 *
        multiplier *
        currentPriceInTank;
    }

    let litersNeeded = 0;

    if (actualLiters !== undefined && actualLiters > 0) {
      litersNeeded = actualLiters;
    } else {
      if (refuelOption === "full") litersNeeded = tankCap;
      else if (refuelOption === "three-quarters")
        litersNeeded = tankCap * 0.75;
      else if (refuelOption === "half") litersNeeded = tankCap * 0.5;
      else if (refuelOption === "quarter")
        litersNeeded = tankCap * 0.25;
      else litersNeeded = customLiters;
    }

    if (litersNeeded <= 0) litersNeeded = 0;

    const referencePrice = station._snapshotAvgPrice || localAvgPrice;
    const grossSavings = litersNeeded * (referencePrice - station.pricePerLiter);
    const netSavings = grossSavings - deviationCost;

    return {
      distanceKm,
      travelCost: deviationCost,
      estimatedTotalTripCost,
      grossSavings,
      netSavings,
      litersNeeded,
      isWorthIt: netSavings > 0,
      referencePrice,
    };
  };

  const fetchStationDistance = async (station: any) => {
    if (realDistanceCache[station.id]) return realDistanceCache[station.id];
    try {
      if (searchMode === "travel" && travelOriginCoords && travelDestinationCoords) {
        const useHighways = profile?.highwayMode ?? false;
        const routeData = await fetchRouteData([travelOriginCoords, [station.lat, station.lng], travelDestinationCoords], useHighways);
        if (routeData) {
          const totalWithDeviation = routeData.distanceKm;
          const deviationKm = Math.max(0, totalWithDeviation - travelDistance);
          return { distanceKm: totalWithDeviation, deviationKm };
        }
      } else {
        const routeData = await fetchRouteData([center, [station.lat, station.lng]], false);
        if (routeData) {
          return { distanceKm: routeData.distanceKm, deviationKm: 0 };
        }
      }
    } catch (e) {
      console.error("fetch distance error", e);
    }
    return null;
  };

  const handleSuggestBest = async () => {
    if (!stations.length) return;
    
    if (!profile?.vehicleName) {
      toast.error(t("vehicle_not_selected"), {
        description: t("onboarding_desc_1")
      });
      return;
    }

    setIsSuggestingBest(true);

    const includeStale = profile?.includeStalePrices ?? false;
    let scoredStations: any[] = [];

    stations.forEach((station) => {
      if ((station.isStale && !includeStale) || station.isBlacklisted) return; // Skip stale and closed prices
      if (
        selectedBrands.length > 0 &&
        !selectedBrands.includes(getBrandGroup(station.brand))
      )
        return;
      const res = calculateBreakeven(station);
      if (res && res.netSavings > 0) {
        scoredStations.push({ station, res });
      }
    });

    scoredStations.sort((a, b) => b.res.netSavings - a.res.netSavings);
    const topCandidates = scoredStations.slice(0, 5);

    const updatedCache: Record<string, {distanceKm: number, deviationKm: number}> = {};
    await Promise.all(topCandidates.map(async (cand) => {
      const realDist = await fetchStationDistance(cand.station);
      if (realDist) {
        updatedCache[cand.station.id] = realDist;
      }
    }));

    if (Object.keys(updatedCache).length > 0) {
      setRealDistanceCache(prev => ({ ...prev, ...updatedCache }));
    }

    // Re-evaluate with the new cache values (merged manually for immediate use)
    const combinedCache = { ...realDistanceCache, ...updatedCache };
    scoredStations = [];
    topCandidates.forEach((cand) => {
      const res = calculateBreakeven(cand.station, combinedCache);
      if (res && res.netSavings > 0) {
        scoredStations.push({ station: cand.station, res });
      }
    });
    
    scoredStations.sort((a, b) => b.res.netSavings - a.res.netSavings);
    const top = scoredStations.slice(0, 3);

    if (top.length > 0) {
      setTopStations(top);
      setActiveStation(null); // Clear active if any

      // TRACCIAMENTO GA4
      try {
        if (analytics) {
          const avgSavings =
            scoredStations.reduce(
              (acc, curr) => acc + (curr.res?.netSavings || 0),
              0,
            ) / scoredStations.length;
            
          const searchContext = {
            modalita_ricerca: searchMode || "non_impostato",
            tipo_carburante: profile?.preferredFuelType || "non_impostato",
            litri_selezionati: refuelOption || "non_impostato",
            modello_auto: profile?.vehicleName || "default",
            soglia_km_impostata: searchMode === "travel" ? travelDeviation || 0 : radarRadius || 0,
            risparmio_max_trovato: Number((top[0].res?.netSavings || 0).toFixed(2)),
            risparmio_medio_trovato: Number((avgSavings || 0).toFixed(2)),
            filtro_brand_attivo: selectedBrands.length > 0 ? "si" : "no",
            brand_selezionati: selectedBrands.length > 0 ? selectedBrands.join(",") : "nessuno",
            // Retrocompatibilità GA4
            modalita: searchMode || "non_impostato",
            valore_soglia_km: searchMode === "travel" ? travelDeviation || 0 : radarRadius || 0,
          };
          setLastSearchContext(searchContext);

          logEvent(analytics, "ricerca_effettuata", {
            ...searchContext,
          });
        }
      } catch (e) {
        console.error("GA4 Error", e);
      }
      // TRACCIAMENTO GA4
    } else {
      // TRACCIAMENTO GA4
      try {
        if (analytics) {
          logEvent(analytics, "ricerca_vuota", {
            modalita: searchMode || "non_impostato",
            valore_soglia_km:
              searchMode === "travel" ? travelDeviation || 0 : radarRadius || 0,
            filtro_brand_attivo: selectedBrands.length > 0 ? "si" : "no",
            brand_selezionati: selectedBrands.length > 0 ? selectedBrands.join(",") : "nessuno",
            // ALLINEAMENTO CONTESTO GLOBALE GA4
            tipo_carburante: profile?.preferredFuelType || "non_impostato",
            litri_selezionati: refuelOption || "non_impostato",
            modello_auto: profile?.vehicleName || "default",
          });
        }
      } catch (e) {
        console.error("GA4 Error", e);
      }
      // TRACCIAMENTO GA4

      toast.error(t("no_improvement"), {
        description: t("no_improvement_desc"),
      });
    }

    setIsSuggestingBest(false);
  };

  const handleStationClick = React.useCallback((station: any) => {
    setActiveStation(station);
    setTopStations([]);
    // TRACCIAMENTO GA4
    try {
      if (analytics) {
        const res = calculateBreakeven(station);
        let baseContext: any = {};
        if (lastSearchContext) {
          const { soglia_km_impostata, valore_soglia_km, ...rest } = lastSearchContext;
          baseContext = rest;
        } else {
          baseContext = {
            tipo_carburante: profile?.preferredFuelType || "non_impostato",
            modalita_ricerca: searchMode || "non_impostato",
            risparmio_max_trovato: 0,
            risparmio_medio_trovato: 0,
            distanza_media_deviazione: 0,
          };
        }
        logEvent(analytics, "click_pin_mappa", {
          ...baseContext,
          prezzo_pompa: station.pricePerLiter,
          scostamento_da_media: Number((station.pricePerLiter - localTotalAvgPrice).toFixed(3)),
          distanza_deviazione_km: Number(res.distanceKm.toFixed(1)),
          potenziale_risparmio_netto: Number(res.netSavings.toFixed(2)),
        });
      }
    } catch (e) {
      console.error("GA4 Error", e);
    }
  }, [analytics, calculateBreakeven, lastSearchContext, profile?.preferredFuelType, searchMode, localTotalAvgPrice]);

  const handleLetGo = () => {
    if (activeStation) {
      // TRACCIAMENTO GA4
      try {
        if (analytics) {
          const res = calculateBreakeven(activeStation);
          let baseContext: any = {};
          if (lastSearchContext) {
            const { soglia_km_impostata, valore_soglia_km, ...rest } = lastSearchContext;
            baseContext = rest;
          } else {
            baseContext = {
              tipo_carburante: profile?.preferredFuelType || "non_impostato",
              modalita_ricerca: searchMode || "non_impostato",
              risparmio_max_trovato: 0,
              risparmio_medio_trovato: 0,
              modalita: searchMode || "non_impostato",
            };
          }
          
          logEvent(analytics, "conversione_risparmio_confermata", {
            ...baseContext,
            azione: "naviga_maps",
            risparmio_netto_click: Number((res?.netSavings || 0).toFixed(2)),
            risparmio_cumulato_raggiunto: Number((profile?.totalSavings || 0).toFixed(2)),
          });
          if (typeof (window as any).clarity === "function") {
            (window as any).clarity("set", "azione", "naviga_maps");
          }
        }
      } catch (e) {
        console.error("GA4 Error", e);
      }

      let originParam = "";
      if (!userLocation && searchMode === "travel" && travelOriginCoords) {
        originParam = `&origin=${travelOriginCoords[0]},${travelOriginCoords[1]}`;
      }
      window.open(
        `https://www.google.com/maps/dir/?api=1${originParam}&destination=${activeStation.lat},${activeStation.lng}`,
        "_blank",
      );

      // Ritarda l'apertura del popup per dare il tempo di passare a Google Maps
      setTimeout(() => {
        setPendingRefuel({
          ...activeStation,
          _snapshotAvgPrice: localAvgPrice,
          _snapshotTotalAvgPrice: localTotalAvgPrice
        });
      }, 1000);
    }
  };

  const handleConfirmRefuel = async (price: number, actualLiters?: number) => {
    if (!pendingRefuel || !profile) return;

    // Ricalcoliamo il risparmio con il prezzo confermato/modificato
    const originalPrice = pendingRefuel.pricePerLiter;
    pendingRefuel.pricePerLiter = price;
    const results = calculateBreakeven(pendingRefuel, undefined, actualLiters);
    pendingRefuel.pricePerLiter = originalPrice; // restore

    const updates: any = {};
    let newSavings = profile.totalSavings || 0;
    let netSavingsClick = 0;
    
    if (results && results.netSavings > 0) {
      newSavings += results.netSavings;
      netSavingsClick = results.netSavings;
      updates.totalSavings = newSavings;
      updates.lastSavingsAmount = results.netSavings;
    }
    
    if (profile.autoUpdateSniperPrice) {
      updates.currentTankPrice = price;
    }

    if (Object.keys(updates).length > 0) {
      await updateProfileData(updates);
    }

    try {
      if (analytics) {
        let baseContext: any = {};
        if (lastSearchContext) {
          const { soglia_km_impostata, valore_soglia_km, ...rest } = lastSearchContext;
          baseContext = rest;
        } else {
          baseContext = {
            tipo_carburante: profile?.preferredFuelType || "non_impostato",
            modalita_ricerca: searchMode || "non_impostato",
            risparmio_max_trovato: 0,
            risparmio_medio_trovato: 0,
            modalita: searchMode || "non_impostato",
          };
        }
        
        logEvent(analytics, "conversione_risparmio_confermata", {
          ...baseContext,
          azione: "feedback_pieno",
          risparmio_netto_click: Number(netSavingsClick.toFixed(2)),
          risparmio_cumulato_raggiunto: Number(newSavings.toFixed(2)),
        });
        
        if (typeof (window as any).clarity === "function") {
          (window as any).clarity("set", "azione", "feedback_pieno");
        }
      }
    } catch (e) {
      console.error("GA4 Error", e);
    }

    if (results && results.netSavings > 0) {
      toast.success("Rifornimento Confermato! 🎉", {
        description: `Hai risparmiato ${results.netSavings.toFixed(2)}€! Aggiunto al tuo cumulato.`,
      });
    } else {
      let msg = "Grazie per il tuo contributo!";
      if (results) {
        if (results.grossSavings > 0) {
           msg = `Grazie! Il risparmio lordo di ${results.grossSavings.toFixed(2)}€ è stato assorbito dal costo del tragitto di deviazione (${results.travelCost.toFixed(2)}€).`;
        } else {
           msg = `Grazie! A questo prezzo non si è generato risparmio netto rispetto alla media locale.`;
        }
      }
      toast.success("Rifornimento Confermato! 👍", {
        description: msg,
      });
    }

    // Se il prezzo è diverso, salviamo in crowdsourced_prices
    if (price !== originalPrice) {
      try {
        const { collection, addDoc, serverTimestamp } =
          await import("firebase/firestore");
        await addDoc(collection(db, "crowdsourced_prices"), {
          stationId: pendingRefuel.id,
          stationName: pendingRefuel.name,
          fuelType: profile.preferredFuelType,
          reportedPrice: price,
          originalPrice: originalPrice,
          userId: profile.userId,
          timestamp: serverTimestamp(),
        });
      } catch (e) {
        console.error("Error saving reported price", e);
      }
    }

    setPendingRefuel(null);
    setReportedPrice("");
    setReportedLiters("");
  };

  const [minSplashTimeDone, setMinSplashTimeDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashTimeDone(true);
    }, 2000); // 2 secondi di splash
    return () => clearTimeout(timer);
  }, []);

  const isBooting = loading || !minSplashTimeDone;

  const handleStationClickRef = React.useRef(handleStationClick);
  React.useEffect(() => {
    handleStationClickRef.current = handleStationClick;
  }, [handleStationClick]);

  const visibleStationMarkers = React.useMemo(() => {
    return stations
      .filter(
        (s: any) =>
          s &&
          !profile?.blacklistedStations?.includes(s.id) &&
          typeof s.lat === "number" &&
          !isNaN(s.lat) &&
          typeof s.lng === "number" &&
          !isNaN(s.lng) &&
          (selectedBrands.length === 0 ||
            selectedBrands.includes(getBrandGroup(s.brand))),
      )
      .map((station) => {
        const isCheaper = station.pricePerLiter < localTotalAvgPrice;
        const isExpensive = station.pricePerLiter > localTotalAvgPrice;
        const isStale = station.isStale;
        const isActive = activeStation?.id === station.id;

        let bgClass = "bg-white text-slate-700 border-slate-300";
        let zIndex = isActive ? 1000 : 0;
        let topBadgeHtml = "";

        const topIndex = topStations.findIndex((ts) => ts.station.id === station.id);

        if (isActive) {
          bgClass = "bg-slate-800 text-white border-slate-900 scale-125 z-50";
        } else if (topIndex !== -1) {
          const badgeColors = [
            "bg-yellow-400 text-yellow-900",
            "bg-slate-300 text-slate-800",
            "bg-[#CD7F32] text-amber-50",
          ];
          const borderColors = [
            "border-yellow-500",
            "border-slate-500",
            "border-amber-700",
          ];
          bgClass = `${badgeColors[topIndex]} ${borderColors[topIndex]} scale-110 shadow-lg`;
          zIndex = 900 - topIndex;
          topBadgeHtml = `<div class="absolute -top-2 -right-2 w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-black shadow-sm border border-white/50 ${badgeColors[topIndex]}">${topIndex + 1}</div>`;
        } else if (isStale) {
          bgClass = "bg-slate-100 text-slate-500 border-slate-300 opacity-80";
        } else if (isCheaper) {
          bgClass = "bg-green-100 text-green-700 border-green-500";
        } else if (isExpensive) {
          bgClass = "bg-red-50 text-red-600 border-red-300";
        }

        return (
          <StationMarker
            key={station.id}
            station={station}
            zIndex={zIndex}
            bgClass={bgClass}
            topBadgeHtml={topBadgeHtml}
            onClick={() => handleStationClickRef.current(station)}
          />
        );
      });
  }, [
    stations,
    profile?.blacklistedStations,
    selectedBrands,
    localTotalAvgPrice,
    activeStation?.id,
    topStations
  ]);

  return (
    <div
      className="fixed inset-0 w-full h-[100dvh] bg-slate-100 overflow-hidden text-slate-900 font-sans overscroll-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        {!isBooting && !safetyAccepted && (
          <motion.div
            key="safety-splash"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-0 z-[6000] bg-white flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="max-w-md mx-auto flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="13" r="3"/><line x1="12" y1="16" x2="12" y2="20"/></svg>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-4">
                {t("safety_title", "Guida con prudenza")}
              </h1>
              <p className="text-slate-600 mb-8 leading-relaxed">
                {t("safety_desc_1")}
              </p>
              <Button 
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold shadow-lg"
                onClick={() => {
                  localStorage.setItem("birroo_safety_accepted", "true");
                  setSafetyAccepted(true);
                }}
              >
                {t("safety_btn", "Ho capito, guiderò con prudenza")}
              </Button>
            </div>
          </motion.div>
        )}
        
        {!isBooting && safetyAccepted && !cookieConsent && (
          <motion.div
            key="cookie-banner"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-0 left-0 right-0 z-[5500] p-4"
          >
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-lg mx-auto">
              <h3 className="font-bold text-lg text-slate-900 mb-2">{t("privacy_title", "La tua privacy su Birroo")}</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                {t("cookie_desc_1")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="w-full sm:flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold"
                  onClick={() => {
                    localStorage.setItem("birroo_cookie_consent", "accepted");
                    setCookieConsent("accepted");
                  }}
                >
                  {t("btn_accept_all", "Accetta Tutto")}
                </Button>
                <Button 
                  variant="outline"
                  className="w-full sm:flex-1 h-12 rounded-2xl font-bold text-slate-600 border-slate-200"
                  onClick={() => {
                    localStorage.setItem("birroo_cookie_consent", "rejected");
                    setCookieConsent("rejected");
                  }}
                >
                  {t("btn_reject", "Solo Tecnici/Rifiuta")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {isBooting && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-[10000] bg-white flex flex-col items-center justify-center p-6 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="flex flex-col items-center"
            >
              <BirrooLogo className="w-32 h-32 text-rose-500 drop-shadow-xl mb-6" />
              <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-2">
                Birroo
              </h1>

              <div className="mt-12 flex gap-1 items-center">
                <div
                  className="w-2 h-2 bg-rose-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 bg-rose-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-rose-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isBooting && (
        <>
          <AnimatePresence>
            {isPulling && (
              <motion.div
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: pullDistance - 60, opacity: 1 }}
                exit={{ y: -60, opacity: 0 }}
                className="absolute top-0 left-0 right-0 z-[2000] flex justify-center pt-8 pointer-events-none"
              >
                <div className="bg-white rounded-full p-3 shadow-xl border border-indigo-100 flex items-center gap-2 px-4">
                  <RefreshCw
                    className={`h-4 w-4 text-indigo-600 ${pullDistance > 70 ? "animate-spin" : ""}`}
                  />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                    {pullDistance > 70 ? "Rilascia" : "Trascina giù"}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Background */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence>
              {(isLocating || isFetchingStations) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-6"
                >
                  <div className="bg-white text-indigo-600 px-8 py-6 rounded-[2rem] shadow-2xl border border-indigo-100 flex flex-col items-center gap-4 font-bold text-lg max-w-[280px] text-center">
                    <div className="bg-indigo-50 p-4 rounded-2xl">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                    {isLocating ? t("acquiring_gps") : t("searching_prices")}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <MapContainer
              center={center}
              zoom={13}
              zoomControl={false}
              className="h-full w-full z-0"
            >
              <ZoomControl position="bottomright" />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <MapFocus
                center={center}
                travelRoute={searchMode === "travel" ? travelRoute : null}
              />
              <MapEventsHandler
                onMoveEnd={(c) => {
                  // Intentionally not updating center on map drag so the search origin remains fixed.
                }}
              />
              {searchMode === "fixed" && (
                <Circle
                  center={center}
                  radius={radarRadius * 1000}
                  pathOptions={{
                    color: "#F27D26",
                    fillColor: "#F27D26",
                    fillOpacity: 0.1,
                    weight: 2,
                  }}
                />
              )}
              <ActiveStationFocus
                activeStation={activeStation}
                topStations={topStations}
              />
              {searchMode === "travel" && travelRoute && (
                <RouteBand route={travelRoute} deviationKm={travelDeviation} />
              )}
              {searchMode === "fixed" && (
                <Marker
                  position={center}
                  icon={L.divIcon({
                    html: `<div class="bg-indigo-600 text-white p-2 rounded-full shadow-xl border-2 border-white flex items-center justify-center" style="width: 36px; height: 36px;">
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                       </div>`,
                    className: "",
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                  })}
                >
                  <Popup>
                    {profile?.vehicleName
                      ? getTranslatedVehicleName(profile.vehicleName, t)
                      : t("your_car")}
                  </Popup>
                </Marker>
              )}
              {visibleStationMarkers}
            </MapContainer>
          </div>

          {/* Top Navbar */}
          <header className="absolute top-0 left-0 w-full z-[2000] p-4 sm:pt-6 sm:px-8 pointer-events-none">
            <div className="w-full flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4 w-full relative z-[2010]">
                {/* Logo & Toggle - Top Left */}
                <div className="flex items-center gap-1 xs:gap-2 pointer-events-auto">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="sm:hidden rounded-2xl shadow-lg bg-white/95 backdrop-blur text-slate-800 hover:bg-slate-50 border border-slate-200 h-10 w-10 flex items-center justify-center transition-transform active:scale-95 shrink-0"
                    onClick={() => {
                      setIsDrawerOpen(true);
                      // TRACCIAMENTO GA4
                      try {
                        if (analytics) {
                          logEvent(analytics, "apertura_profilo_auto");
                        }
                      } catch (e) {
                        console.error("GA4 Error", e);
                      }
                      // TRACCIAMENTO GA4
                    }}
                  >
                    <Settings2 className="h-5 w-5 text-indigo-600" />
                  </Button>
                  <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/40 p-2 flex items-center gap-2 shrink min-w-0">
                    <div className="flex items-center gap-1.5 border-r border-slate-100 pr-2 group cursor-pointer shrink min-w-0">
                      <div className="group-hover:-translate-y-1 group-hover:scale-110 transition-all duration-300 shrink-0">
                        <BirrooLogo className="w-7 h-7 md:w-10 md:h-10 text-rose-500 drop-shadow-sm" />
                      </div>
                      <div className="flex flex-col group-hover:translate-x-1 transition-all duration-300 shrink min-w-0 pr-1">
                        <h1 className="text-lg md:text-2xl font-black italic tracking-tighter text-rose-500 leading-none drop-shadow-sm truncate">
                          Birroo
                        </h1>
                        <span className="text-[7px] md:text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-0.5 whitespace-nowrap overflow-visible">
                          {t("fast_save")}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      {!!profile?.vehicleName ? (
                        <div
                          className={`h-[18px] min-w-[60px] px-1.5 flex items-center justify-center text-[7px] font-black uppercase tracking-wider rounded-md text-white transition-all ${
                            profile?.preferredFuelType === "Benzina" ||
                            !profile?.preferredFuelType
                              ? "bg-emerald-500"
                              : profile?.preferredFuelType === "Gasolio"
                                ? "bg-slate-800"
                                : profile?.preferredFuelType === "GPL"
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                          }`}
                        >
                          {t(`fuel_${profile?.preferredFuelType || "Benzina"}`)}
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={profile?.preferredFuelType || "Benzina"}
                            onChange={(e) =>
                              updateProfileData({
                                preferredFuelType: e.target.value as any,
                              })
                            }
                            className={`appearance-none cursor-pointer h-[18px] min-w-[60px] pl-1.5 pr-4 border-none text-[7px] outline-none font-black uppercase tracking-wider rounded-md text-white ring-0 focus:ring-0 transition-all ${
                              profile?.preferredFuelType === "Benzina" ||
                              !profile?.preferredFuelType
                                ? "bg-emerald-500"
                                : profile?.preferredFuelType === "Gasolio"
                                  ? "bg-slate-800"
                                  : profile?.preferredFuelType === "GPL"
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                            }`}
                          >
                            <option
                              value="Benzina"
                              className="font-bold text-[8px] bg-white text-slate-800 uppercase"
                            >
                              {t("fuel_Benzina")}
                            </option>
                            <option
                              value="Gasolio"
                              className="font-bold text-[8px] bg-white text-slate-800 uppercase"
                            >
                              {t("fuel_Gasolio")}
                            </option>
                            <option
                              value="GPL"
                              className="font-bold text-[8px] bg-white text-slate-800 uppercase"
                            >
                              {t("fuel_GPL")}
                            </option>
                            <option
                              value="Metano"
                              className="font-bold text-[8px] bg-white text-slate-800 uppercase"
                            >
                              {t("fuel_Metano")}
                            </option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-white/80">
                            <svg
                              className="fill-current h-2 w-2"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => setIsBrandDrawerOpen(true)}
                        className={`h-[18px] min-w-[60px] px-1.5 flex items-center justify-center gap-0.5 text-[7px] font-black uppercase tracking-wider rounded-md transition-all ${
                          selectedBrands.length > 0
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {selectedBrands.length > 0 ? null : (
                          <Fuel className="h-2 w-2 shrink-0" />
                        )}
                        <span className="truncate">
                          {selectedBrands.length > 0
                            ? `BRAND (${selectedBrands.length})`
                            : "BRAND"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Top Right: User & Stats */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  {regionalAvgPrice && regionName && (
                    <div className="hidden sm:flex bg-white/95 backdrop-blur px-3 py-2 rounded-2xl shadow border border-slate-200 items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        {regionName}:
                      </span>
                      <span className="text-sm font-semibold whitespace-nowrap text-slate-700">
                        {regionalAvgPrice.toFixed(3)}€
                      </span>
                    </div>
                  )}
                  <div className="hidden sm:flex bg-white/95 backdrop-blur px-3 py-2 rounded-2xl shadow border border-slate-200 items-center gap-2">
                    <span className="text-[11px] sm:text-sm font-semibold whitespace-nowrap text-primary">
                      {localTotalAvgPrice.toFixed(3)}€ ({t("local")})
                    </span>
                  </div>

                  {user ? (
                    <div
                      className="bg-white/95 backdrop-blur px-2 sm:px-4 py-2 rounded-2xl shadow border border-slate-200 flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-slate-50 shrink-0"
                      onClick={() => logout()}
                    >
                      <img
                        src={user.photoURL || ""}
                        alt="avatar"
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0"
                      />
                      <span className="text-xs sm:text-sm font-semibold max-w-[60px] sm:max-w-[100px] truncate hidden xxs:inline shrink-0">
                        {user.displayName?.split(" ")[0]}
                      </span>
                      <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 shrink-0" />
                    </div>
                  ) : (
                    <Button
                      className="rounded-2xl shadow-lg h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4 shrink-0 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-2"
                      onClick={loginWithGoogle}
                    >
                      <GoogleLogo className="w-4 h-4 shrink-0" />
                      <span className="font-semibold">{t("account")}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Mobile Search Mode Switch */}
              <div className="sm:hidden pointer-events-auto flex items-center justify-center w-full mx-auto mt-0">
                <Card className="p-1 rounded-full shadow-lg border-slate-200/60 backdrop-blur-xl bg-white/95 w-full max-w-[200px] mx-auto">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSearchMode("fixed")}
                      className={`flex-1 flex items-center justify-center py-2.5 px-2 rounded-full transition-all ${searchMode === "fixed" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}
                      title={t("fixed_point")}
                    >
                      <RadarPinIcon className="h-5 w-5 shrink-0" />
                    </button>
                    <button
                      onClick={() => setSearchMode("travel")}
                      className={`flex-1 flex items-center justify-center py-2.5 px-2 rounded-full transition-all ${searchMode === "travel" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}
                      title={t("trip")}
                    >
                      <RouteABIcon className="h-5 w-5 shrink-0" />
                    </button>
                  </div>
                </Card>
              </div>

              {/* Search Row - Centered standard Gmaps style */}
              {searchMode === "fixed" && (
                <div className="flex flex-col gap-2 w-full max-w-2xl mx-auto mt-1">
                  <div className="flex items-center gap-2 w-full">
                    <div className="relative pointer-events-auto flex-1">
                      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl px-3 py-2 flex items-center border border-slate-200 h-10 sm:h-12">
                        <input
                          type="text"
                          placeholder={t("search_placeholder")}
                          className="bg-transparent text-sm sm:text-base outline-none px-2 w-full placeholder-slate-400"
                          value={placeQuery}
                          onChange={(e) => setPlaceQuery(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              if (placeSuggestions.length > 0) {
                                const s = placeSuggestions[0];
                                isSelectingPlaceRef.current = true;
                                manualLocationRef.current = true;
                                setCenter([parseFloat(s.lat), parseFloat(s.lon)]);
                                setPlaceQuery("");
                                setPlaceSuggestions([]);
                                setIsPlaceSearchFocused(false);
                              } else if (placeQuery.trim().length > 2) {
                                // Try fetching directly if suggestions not loaded yet
                                setIsFetchingPlaces(true);
                                try {
                                  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeQuery)}&countrycodes=it&limit=1&addressdetails=1`);
                                  const d = await r.json();
                                  if (d && d.length > 0) {
                                    const s = d[0];
                                    isSelectingPlaceRef.current = true;
                                    manualLocationRef.current = true;
                                    setCenter([parseFloat(s.lat), parseFloat(s.lon)]);
                                    setPlaceQuery("");
                                    setPlaceSuggestions([]);
                                    setIsPlaceSearchFocused(false);
                                  }
                                } catch (err) {}
                                setIsFetchingPlaces(false);
                              }
                            }
                          }}
                          onFocus={() => {
                            setIsPlaceSearchFocused(true);
                            if (placeQuery.trim().length > 2) {
                              fetchPlaceSuggestions(placeQuery);
                            }
                          }}
                          onBlur={() => {
                            setTimeout(
                              () => setIsPlaceSearchFocused(false),
                              200,
                            );
                          }}
                        />
                        {isFetchingPlaces ? (
                          <Loader2 className="h-4 w-4 text-slate-400 mr-2 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 text-slate-400 mr-2" />
                        )}
                      </div>

                      {isPlaceSearchFocused && placeSuggestions.length > 0 && (
                        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[2000]">
                          {placeSuggestions.map((s, i) => {
                            const parts = s.display_name.split(",");
                            const mainText = parts[0];
                            const subText = parts.slice(1).join(",").trim();

                            const rawType = s.addresstype || s.class || "";
                            const transKey = `type_${rawType}`;
                            let typeLabel = t(transKey);
                            if (typeLabel === transKey && rawType) {
                              typeLabel =
                                rawType.charAt(0).toUpperCase() +
                                rawType.slice(1);
                            }

                            return (
                              <div
                                key={i}
                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  manualLocationRef.current = true;
                                  isSelectingPlaceRef.current = true;
                                  setCenter([
                                    parseFloat(s.lat),
                                    parseFloat(s.lon),
                                  ]);
                                  setPlaceQuery("");
                                  setPlaceSuggestions([]);
                                }}
                              >
                                <p className="font-semibold text-slate-800 truncate">
                                  {mainText}
                                  {typeLabel && (
                                    <span className="ml-2 font-normal text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                      ({typeLabel})
                                    </span>
                                  )}
                                </p>
                                {subText && (
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                    {subText}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="secondary"
                      size="icon"
                      className="hidden sm:flex pointer-events-auto rounded-2xl shadow-lg bg-white/95 border border-slate-200 h-10 w-10 sm:h-12 sm:w-12 shrink-0 transition-transform active:scale-95"
                      onClick={handleLocateMe}
                      disabled={isLocating}
                    >
                      {isLocating ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <MapPin className="h-5 w-5 text-primary" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Always visible rows: Filters & Secondary Stats */}
              <div className="flex flex-col gap-2 w-full max-w-2xl mx-auto mt-1">
                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto mt-0.5 max-h-[70px] overflow-y-auto no-scrollbar">
                  {selectedBrands.map((s) => (
                    <div
                      key={s}
                      onClick={() =>
                        setSelectedBrands((prev) =>
                          prev.filter((b) => b !== s),
                        )
                      }
                      className="cursor-pointer bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 rounded-full h-7 flex items-center px-2.5 text-[10px] sm:text-xs font-bold leading-none shrink-0 transition-all"
                    >
                      {s}
                      <X className="h-3 w-3 ml-1 opacity-70" />
                    </div>
                  ))}
                </div>

                {/* Mobile Secondary Stats Row */}
                <div className="flex sm:hidden items-center justify-center gap-2 pointer-events-auto overflow-x-auto pb-1 no-scrollbar">
                  <div className="bg-white/95 backdrop-blur px-2.5 py-1 rounded-full shadow border border-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                      {t("local")}:
                    </span>
                    <span className="text-[11px] font-black text-primary">
                      {localTotalAvgPrice.toFixed(3)}€
                    </span>
                  </div>
                  {regionalAvgPrice && regionName && (
                    <div className="bg-white/95 backdrop-blur px-2.5 py-1 rounded-full shadow border border-slate-200 flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        {regionName}:
                      </span>
                      <span className="text-[11px] font-black text-slate-700">
                        {regionalAvgPrice.toFixed(3)}€
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Desktop Sidebar */}
          <div className="hidden sm:flex absolute top-32 left-8 z-[1000] w-80 flex-col gap-4 pointer-events-auto max-h-[calc(100vh-140px)] overflow-y-auto pt-4">
            <SidebarContent
              user={user}
              profile={profile}
              updateProfileData={updateProfileData}
              vehicleSearch={vehicleSearch}
              setVehicleSearch={setVehicleSearch}
              handleVehicleAISearch={handleVehicleAISearch}
              isSearchingAI={isSearchingAI}
              localRadarRadius={localRadarRadius}
              setLocalRadarRadius={setLocalRadarRadius}
              handleSuggestBest={handleSuggestBest}
              setShowOnboarding={setShowOnboarding}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              travelOrigin={travelOrigin}
              setTravelOrigin={setTravelOrigin}
              travelDestination={travelDestination}
              setTravelDestination={setTravelDestination}
              travelDeviation={travelDeviation}
              setTravelDeviation={setTravelDeviation}
              setTravelOriginCoords={setTravelOriginCoords}
              setTravelDestinationCoords={setTravelDestinationCoords}
              handleTravelSearch={handleTravelSearch}
            />
          </div>

          {/* Mobile Drawer */}
          <AnimatePresence>
            {isDrawerOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsDrawerOpen(false)}
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] sm:hidden"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-[2.5rem] z-[2001] sm:hidden flex flex-col shadow-2xl border-t border-slate-100"
                >
                  {/* Swipe Handle Wrapper */}
                  <div
                    className="w-full pt-4 pb-2 cursor-grab active:cursor-grabbing touch-none"
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      touchStartYDrawer.current = e.touches[0].clientY;
                    }}
                    onTouchMove={(e) => {
                      e.stopPropagation();
                      const currentY = e.touches[0].clientY;
                      if (currentY - touchStartYDrawer.current > 50) {
                        setIsDrawerOpen(false);
                      }
                    }}
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto shrink-0" />
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 pb-12 pt-1">
                    <SidebarContent
                      user={user}
                      profile={profile}
                      updateProfileData={updateProfileData}
                      vehicleSearch={vehicleSearch}
                      setVehicleSearch={setVehicleSearch}
                      handleVehicleAISearch={handleVehicleAISearch}
                      isSearchingAI={isSearchingAI}
                      localRadarRadius={localRadarRadius}
                      setLocalRadarRadius={setLocalRadarRadius}
                      handleSuggestBest={handleSuggestBest}
                      setShowOnboarding={setShowOnboarding}
                      searchMode={searchMode}
                      setSearchMode={setSearchMode}
                      travelOrigin={travelOrigin}
                      setTravelOrigin={setTravelOrigin}
                      travelDestination={travelDestination}
                      setTravelDestination={setTravelDestination}
                      travelDeviation={travelDeviation}
                      setTravelDeviation={setTravelDeviation}
                      setTravelOriginCoords={setTravelOriginCoords}
                      setTravelDestinationCoords={setTravelDestinationCoords}
                      handleTravelSearch={handleTravelSearch}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Mobile Floating Locate Button */}
          <div className="sm:hidden fixed bottom-[250px] right-[10px] z-[1000] pointer-events-auto">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.15)] bg-white border-2 border-slate-200 h-[34px] w-[34px] transition-transform active:scale-95 flex items-center justify-center text-slate-700 hover:text-slate-900"
              onClick={handleLocateMe}
              disabled={isLocating}
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <MapPin className="h-4 w-4 text-primary" />
              )}
            </Button>
          </div>

          {/* Top 3 Stations Intermediate View */}
          {topStations.length > 0 && !activeStation && (
            <div className="fixed bottom-0 sm:bottom-auto sm:top-32 left-0 right-0 sm:left-auto sm:right-8 z-[2100] sm:z-[1000] w-full sm:w-96 pointer-events-none flex flex-col justify-end">
              <Card className="pointer-events-auto overflow-hidden rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.15)] sm:shadow-2xl border-slate-200 bg-white animate-in slide-in-from-bottom-full sm:slide-in-from-right-8 duration-300 flex flex-col max-h-[50vh] sm:max-h-[calc(100vh-140px)]">
                {/* Swipe Handle Wrapper */}
                <div
                  className="w-full pb-4 sm:hidden cursor-grab active:cursor-grabbing touch-none pt-4 flex-shrink-0"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    touchStartYStation.current = e.touches[0].clientY;
                  }}
                  onTouchMove={(e) => {
                    e.stopPropagation();
                    const currentY = e.touches[0].clientY;
                    if (currentY - touchStartYStation.current > 50) {
                      setTopStations([]);
                    }
                  }}
                  onClick={() => setTopStations([])}
                >
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto shrink-0" />
                </div>

                <div className="p-6 pt-0 sm:pt-6 pb-10 sm:pb-6 overflow-y-auto flex-1">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <h3 className="font-bold text-lg text-slate-800 leading-tight">
                        {searchMode === "travel"
                          ? t("top_stations_travel_title")
                          : t("top_stations_title")}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                      onClick={() => setTopStations([])}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {topStations.map((item, idx) => {
                      const currentRes = calculateBreakeven(item.station) || item.res;
                      return (
                      <div
                        key={item.station.id}
                        className="flex flex-col border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl p-4 cursor-pointer hover:border-indigo-300 transition-all group shadow-sm"
                        onClick={() => {
                          setActiveStation(item.station);
                          setTopStations([]);
                          // TRACCIAMENTO GA4
                          try {
                            if (analytics) {
                              let baseContext: any = {};
                              if (lastSearchContext) {
                                const { soglia_km_impostata, valore_soglia_km, ...rest } = lastSearchContext;
                                baseContext = rest;
                              } else {
                                baseContext = {
                                  tipo_carburante: profile?.preferredFuelType || "non_impostato",
                                  modalita_ricerca: searchMode || "non_impostato",
                                  risparmio_max_trovato: 0,
                                  risparmio_medio_trovato: 0,
                                  modalita: searchMode || "non_impostato",
                                };
                              }
                              logEvent(analytics, "conversione_risparmio_confermata", {
                                ...baseContext,
                                azione: "click_top_3",
                                risparmio_netto_click: Number((currentRes?.netSavings || 0).toFixed(2)),
                                risparmio_cumulato_raggiunto: Number((profile?.totalSavings || 0).toFixed(2)),
                              });
                              if (typeof (window as any).clarity === "function") {
                                (window as any).clarity("set", "azione", "click_top_3");
                              }
                            }
                          } catch (e) {
                            console.error("GA4 Error", e);
                          }
                          // TRACCIAMENTO GA4
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 overflow-hidden pr-2">
                            <div className="font-bold text-slate-800 text-[15px] truncate flex items-center gap-2">
                              {idx === 0 && (
                                <span className="flex-shrink-0 inline-flex items-center justify-center w-[22px] h-[22px] bg-yellow-400 text-yellow-900 rounded-full text-[11px] font-black shadow-sm">
                                  1
                                </span>
                              )}
                              {idx === 1 && (
                                <span className="flex-shrink-0 inline-flex items-center justify-center w-[22px] h-[22px] bg-slate-300 text-slate-700 rounded-full text-[11px] font-black shadow-sm">
                                  2
                                </span>
                              )}
                              {idx === 2 && (
                                <span className="flex-shrink-0 inline-flex items-center justify-center w-[22px] h-[22px] bg-[#CD7F32] text-amber-50 rounded-full text-[11px] font-black shadow-sm">
                                  3
                                </span>
                              )}
                              <span className="truncate">
                                {item.station.name}
                              </span>
                            </div>
                            {item.station.operator &&
                              item.station.operator !== item.station.name && (
                                <div className="text-xs text-slate-500 truncate flex items-center gap-1 opacity-80 mt-1">
                                  <Building2 className="w-3 h-3 flex-shrink-0" />{" "}
                                  {item.station.operator}
                                </div>
                              )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] font-black uppercase tracking-wider text-green-600/80 mb-0.5">
                              {t("net_savings")}
                            </div>
                            <div className="text-lg font-black text-slate-800 group-hover:text-indigo-700 transition-colors">
                              +{currentRes.netSavings.toFixed(2)}€
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                          <div className="flex items-center gap-1">
                            <Route className="w-3 h-3 text-indigo-500" />
                            <span>
                              {searchMode === "travel"
                                ? t("deviation")
                                : t("distance")}
                              :{" "}
                              {currentRes.distanceKm?.toFixed(1) ||
                                (
                                  (item.station._distance || 0) *
                                  (searchMode === "travel" ? 1.3 * 2 : 1.3)
                                ).toFixed(1)}{" "}
                              km
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {new Date(
                                item.station.lastUpdated,
                              ).toLocaleDateString([], {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto">
                            {item.station.pricePerLiter <= localAvgPrice * 0.9 && (
                              <div className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span className="hidden sm:inline whitespace-nowrap">
                                  {t("anomalous_price")}
                                </span>
                              </div>
                            )}
                            {item.station.isStale && (
                              <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span className="hidden sm:inline whitespace-nowrap">
                                  {t("stale_price")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Right Sidebar - Dashboard / Breakeven */}
          {activeStation && (
            <div className="fixed bottom-0 sm:bottom-auto sm:top-32 left-0 right-0 sm:left-auto sm:right-8 z-[2100] sm:z-[1000] w-full sm:w-96 pointer-events-none flex flex-col justify-end">
              <Card className="pointer-events-auto overflow-hidden rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.15)] sm:shadow-2xl border-slate-200 bg-white animate-in slide-in-from-bottom-full sm:slide-in-from-right-8 duration-300 flex flex-col max-h-[50vh] sm:max-h-[calc(100vh-140px)]">
                {/* Swipe Handle Wrapper */}
                <div
                  className="w-full pb-4 sm:hidden cursor-grab active:cursor-grabbing touch-none pt-4 flex-shrink-0"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    touchStartYStation.current = e.touches[0].clientY;
                  }}
                  onTouchMove={(e) => {
                    e.stopPropagation();
                    const currentY = e.touches[0].clientY;
                    if (currentY - touchStartYStation.current > 50) {
                      setActiveStation(null);
                    }
                  }}
                  onClick={() => setActiveStation(null)}
                >
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto shrink-0" />
                </div>

                <div className="p-6 pt-0 sm:pt-6 pb-10 sm:pb-6 overflow-y-auto flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h2 className="font-extrabold text-xl text-slate-800">
                        {activeStation.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-slate-50 font-bold"
                        >
                          {(
                            calculateDistance(
                              center[0],
                              center[1],
                              activeStation.lat,
                              activeStation.lng,
                            ) * 1.3
                          ).toFixed(1)}{" "}
                          km
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] bg-slate-50 ${activeStation.lastUpdated && new Date(activeStation.lastUpdated).getTime() < new Date(new Date().setDate(new Date().getDate() - 1)).setHours(0, 0, 0, 0) ? "text-red-600 border-red-200" : "text-slate-500"}`}
                        >
                          {activeStation.lastUpdated
                            ? `${t("updated_on")} ${new Date(activeStation.lastUpdated).toLocaleDateString(i18n.language === "en" ? "en-US" : "it-IT")}`
                            : t("date_na")}
                        </Badge>
                        <span className="font-mono font-bold text-lg text-primary">
                          {activeStation.pricePerLiter.toFixed(3)} €/L
                        </span>
                      </div>
                      {activeStation.lastUpdated &&
                        new Date(activeStation.lastUpdated).getTime() <
                          new Date(
                            new Date().setDate(new Date().getDate() - 1),
                          ).setHours(0, 0, 0, 0) && (
                          <p className="text-[10px] text-slate-500 mt-2 italic leading-tight max-w-[280px]">
                            {t("old_price_warning")}
                          </p>
                        )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-slate-100 h-10 w-10 shrink-0"
                      onClick={() => setActiveStation(null)}
                    >
                      <X className="h-6 w-6 text-slate-500" />
                    </Button>
                  </div>

                  {profile?.vehicleName && (
                    <div className="space-y-4 mb-6">
                      <Label>{t("plan_refueling")}</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={
                            refuelOption === "full" ? "default" : "outline"
                          }
                          className="flex-1 rounded-xl text-xs px-1"
                          onClick={() => setRefuelOption("full")}
                        >
                          {t("full_tank")}
                        </Button>
                        <Button
                          variant={
                            refuelOption === "three-quarters"
                              ? "default"
                              : "outline"
                          }
                          className="flex-1 rounded-xl text-xs px-1"
                          onClick={() => setRefuelOption("three-quarters")}
                        >
                          3/4
                        </Button>
                        <Button
                          variant={
                            refuelOption === "half" ? "default" : "outline"
                          }
                          className="flex-1 rounded-xl text-xs px-1"
                          onClick={() => setRefuelOption("half")}
                        >
                          1/2
                        </Button>
                        <Button
                          variant={
                            refuelOption === "quarter" ? "default" : "outline"
                          }
                          className="flex-1 rounded-xl text-xs px-1"
                          onClick={() => setRefuelOption("quarter")}
                        >
                          1/4
                        </Button>
                        <Button
                          variant={
                            refuelOption === "custom" ? "default" : "outline"
                          }
                          className="flex-1 rounded-xl text-xs px-1"
                          onClick={() => setRefuelOption("custom")}
                        >
                          {t("custom")}
                        </Button>
                      </div>
                      {refuelOption === "custom" && (
                        <div className="flex items-center gap-3 pt-2">
                          <Slider
                            value={[customLiters || 5]}
                            max={profile?.tankCapacity || 50}
                            min={5}
                            onValueChange={(val: any) => {
                              const rawValue = Array.isArray(val)
                                ? val[0]
                                : val;
                              setCustomLiters(
                                typeof rawValue === "number" && !isNaN(rawValue)
                                  ? rawValue
                                  : 5,
                              );
                            }}
                          />
                          <span className="font-mono text-sm font-bold w-12">
                            {customLiters}L
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator className="my-6" />

                  {activeStation && (
                    <div className="mb-4 space-y-2">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 leading-tight">
                          {activeStation.name}
                        </h3>
                        {activeStation.operator &&
                          activeStation.operator !== activeStation.name && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{" "}
                              {activeStation.operator}
                            </p>
                          )}
                        {activeStation.openingHours ? (
                          <p className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />{" "}
                            {activeStation.openingHours}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{" "}
                            {t("hours_not_declared")}
                          </p>
                        )}
                      </div>

                      {/* Tasto Segnalazione Chiuso / Errato con Tooltip Nuvoletta */}
                      {!activeStation.isBlacklisted && (
                        <div className="relative group inline-block">
                          <button
                            className="text-[11px] font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                            onClick={(e) => {
                              // e.stopPropagation();
                              if (!user) {
                                toast.error(t("login_required_hide"));
                                return;
                              }
                              toast(t("station_question_hide"), {
                                description: t("hidden_permanently"),
                                action: {
                                  label: t("station_question_action_hide"),
                                  onClick: () => {
                                    const currentBlacklist =
                                      profile?.blacklistedStations || [];
                                    if (
                                      currentBlacklist.includes(
                                        activeStation.id,
                                      )
                                    ) {
                                      toast.info(t("station_already_hidden"));
                                      return;
                                    }
                                    const newBlacklist = [
                                      ...currentBlacklist,
                                      activeStation.id,
                                    ];
                                    updateProfileData({
                                      blacklistedStations: newBlacklist,
                                    });
                                    setStations((prev) => {
                                      const next = prev.map((s) =>
                                        s.id === activeStation.id
                                          ? { ...s, isBlacklisted: true }
                                          : s,
                                      );
                                      return next;
                                    });
                                    setActiveStation(null);
                                    toast.success(t("reported_and_hidden"));
                                  },
                                },
                              });
                            }}
                          >
                            <ShieldCheck className="h-3 w-3" />
                            {t("report_closed")}
                          </button>

                          {/* Tooltip (visible on hover / active) */}
                          <div className="absolute left-0 bottom-full mb-1 opacity-0 group-hover:opacity-100 group-active:opacity-100 pointer-events-none transition-opacity duration-200 z-[2010] w-64 bg-slate-800 text-white text-[10px] rounded-lg p-2 shadow-xl">
                            {t("report_tooltip_text")}
                            <div className="absolute left-6 top-full w-2 h-2 bg-slate-800 rotate-45 -translate-y-[4px]"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(() => {
                    if (activeStation.isBlacklisted) {
                      return (
                        <div className="space-y-4">
                          {/* Trip Type Selector */}
                          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                            <button
                              onClick={() => setTripType("round-trip")}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${tripType === "round-trip" ? "bg-white shadow text-primary" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              {t("trip_round")}
                            </button>
                            <button
                              onClick={() => setTripType("one-way")}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${tripType === "one-way" ? "bg-white shadow text-primary" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              {t("trip_one_way")}
                            </button>
                          </div>
                          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-200">
                            {t("station_reported_closed")}
                          </div>
                          <Button
                            className="w-full mt-4 rounded-2xl h-12 text-sm font-bold gap-2 shadow"
                            variant="outline"
                            onClick={async () => {
                              const currentBlacklist =
                                profile?.blacklistedStations || [];
                              updateProfileData({
                                blacklistedStations: currentBlacklist.filter(
                                  (id) => id !== activeStation.id,
                                ),
                              });

                              // Immediate local UI update without refetch
                              setStations((prev) => {
                                const next = prev.map((s) =>
                                  s.id === activeStation.id
                                    ? { ...s, isBlacklisted: false }
                                    : s,
                                );
                                return next;
                              });
                              setActiveStation({
                                ...activeStation,
                                isBlacklisted: false,
                              });
                              toast.success(t("reactivate_station"));
                            }}
                          >
                            {t("reactivate_station")}
                          </Button>
                        </div>
                      );
                    }

                    const results = calculateBreakeven(activeStation);
                    if (!results) return null;
                    return (
                      <div className="space-y-4">
                        {/* Trip Type Selector */}
                        {searchMode !== "travel" && (
                          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                            <button
                              onClick={() => setTripType("round-trip")}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${tripType === "round-trip" ? "bg-white shadow text-primary" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              {t("trip_round")}
                            </button>
                            <button
                              onClick={() => setTripType("one-way")}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${tripType === "one-way" ? "bg-white shadow text-primary" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              {t("trip_one_way")}
                            </button>
                          </div>
                        )}
                        <div className="flex justify-between text-sm items-center">
                          <div
                            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() =>
                              toast.info(t("savings_info_title"), {
                                description: t("savings_info_desc"),
                                duration: 5000,
                              })
                            }
                          >
                            <span className="text-slate-500 border-b border-dashed border-slate-300">
                              {t("savings_vs_avg")}
                            </span>
                            <Info className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                          <span className="font-mono text-green-600 font-semibold">
                            + €{" "}
                            {Math.max(
                              0,
                              results.grossSavings,
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-slate-500">
                            {searchMode === "travel"
                              ? t("deviation_cost")
                              : t("trip_cost")}{" "}
                            {searchMode !== "travel" &&
                              `(${tripType === "round-trip" ? t("trip_round_short") : t("trip_one_way_short")})`}
                          </span>
                          <span className="font-mono text-red-500 font-semibold">
                            - {results.travelCost.toFixed(2)}€
                          </span>
                        </div>
                        {searchMode === "travel" && (
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-slate-500 font-medium">
                              {t("estimated_full_trip_cost")}
                            </span>
                            <span className="font-mono text-slate-700 font-semibold">
                              {results.estimatedTotalTripCost.toFixed(2)}€
                            </span>
                          </div>
                        )}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              {t("net_savings")}
                            </div>
                            <div
                              className={`text-3xl font-black ${results.isWorthIt ? "text-green-600" : "text-slate-800"}`}
                            >
                              {results.netSavings > 0 ? "+" : ""}
                              {results.netSavings.toFixed(2)}€
                            </div>
                          </div>
                          {results.isWorthIt ? (
                            <div
                              className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center cursor-pointer hover:bg-green-200 transition-colors tooltip-trigger"
                              onClick={() =>
                                toast.info(t("net_savings_info_title"), {
                                  description: t("net_savings_info_desc"),
                                  duration: 6000,
                                })
                              }
                            >
                              <ShieldCheck className="h-6 w-6 text-green-600" />
                            </div>
                          ) : (
                            <div className="text-xs text-amber-600 font-semibold max-w-[100px] text-right">
                              {t("not_worth_it")}
                            </div>
                          )}
                        </div>

                        {activeStation.pricePerLiter <= localAvgPrice * 0.9 && (
                          <div className="mt-4 flex gap-3 bg-amber-50/80 border border-amber-200/60 p-3.5 rounded-2xl items-start">
                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700/90 leading-relaxed font-medium">
                              {t("price_too_low", {
                                percent: (
                                  (1 -
                                    activeStation.pricePerLiter /
                                      localAvgPrice) *
                                  100
                                ).toFixed(0),
                              })}
                            </p>
                          </div>
                        )}

                        <Button
                          className="w-full mt-4 rounded-2xl h-12 text-lg font-bold gap-2 shadow-lg"
                          size="lg"
                          onClick={handleLetGo}
                        >
                          <Navigation2 className="h-5 w-5" />
                          {t("lets_go")}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </Card>
            </div>
          )}

          {/* Floating Button - Trova il Migliore / Imposta Viaggio */}
          {!activeStation && profile?.vehicleName && (
            <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto flex items-center justify-center">
              {searchMode === "fixed" ||
              (searchMode === "travel" && travelRoute) ? (
                <Button
                  className="rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.15)] h-14 px-8 text-lg font-extrabold gap-2 border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                  onClick={handleSuggestBest}
                  disabled={isSuggestingBest}
                  size="lg"
                >
                  {isSuggestingBest ? (
                    <Loader2 className="h-6 w-6 text-indigo-600 shrink-0 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-indigo-600 shrink-0" />
                  )}
                  {t("suggest_best")}
                </Button>
              ) : (
                <Button
                  className="rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.15)] h-14 px-8 text-lg font-extrabold gap-2 border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 whitespace-nowrap sm:hidden"
                  onClick={() => {
                    setIsDrawerOpen(true);
                    // TRACCIAMENTO GA4
                    try {
                      if (analytics) {
                        logEvent(analytics, "apertura_profilo_auto");
                      }
                    } catch (e) {
                      console.error("GA4 Error", e);
                    }
                    // TRACCIAMENTO GA4
                  }}
                  size="lg"
                >
                  <Route className="h-6 w-6 shrink-0" />
                  {t("set_trip")}
                </Button>
              )}
            </div>
          )}

          {/* @ts-ignore */}
          {import.meta.env.DEV && (
            <div className="fixed bottom-4 right-4 z-[9999]">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowOnboarding(true)}
              >
                TEST ONBOARDING
              </Button>
            </div>
          )}

          <Dialog open={showHighwayPrompt} onOpenChange={setShowHighwayPrompt}>
            <DialogContent className="max-w-[400px] rounded-[2rem] p-6 pt-10 border-0 shadow-[0_8px_40px_rgb(0,0,0,0.12)] bg-white/95 backdrop-blur-xl z-[9999] w-[90vw] overflow-hidden">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-[22px] leading-tight font-black text-slate-800 tracking-tight text-center text-balance px-1">
                  {t("use_highway_prompt")}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 mt-6">
                <Button
                  variant="default"
                  className="w-full h-auto py-3.5 px-4 text-[15px] font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-700 whitespace-normal text-center shadow-md border border-indigo-500/50"
                  onClick={() => executeTravelSearch(true)}
                >
                  {t("yes_fastest_route")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-auto py-3.5 px-4 text-[14px] font-semibold rounded-2xl text-slate-600 border-slate-300 bg-white hover:bg-slate-50 whitespace-normal text-center shadow-sm"
                  onClick={() => executeTravelSearch(false)}
                >
                  {t("no_avoid_tolls")} <br className="hidden sm:block" />
                  <span className="opacity-80 font-medium tracking-tight relative -top-[1px]">
                    ({t("minimize_savings")})
                  </span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showLocationBlockedDialog}
            onOpenChange={(open) => {
              setShowLocationBlockedDialog(open);
              if (!open) checkAndShowLoginPrompt();
            }}
          >
            <DialogContent className="sm:max-w-md z-[9999] rounded-2xl w-[90vw] p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-600 text-xl font-extrabold">
                  <MapPin className="h-6 w-6" />
                  {t("position_locked")}
                </DialogTitle>
              </DialogHeader>
              <div className="py-2 text-sm text-slate-600 leading-relaxed font-medium">
                <p>{t("position_locked_desc")}</p>
              </div>
              <div className="flex flex-col gap-3 mt-4">
                <Button
                  variant="default"
                  className="w-full h-12 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    setShowLocationBlockedDialog(false);
                    handleLocateMe();
                  }}
                >
                  {t("btn_understand_localize")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-sm font-semibold rounded-xl text-slate-600 border-slate-300 bg-transparent hover:bg-slate-50"
                  onClick={() => {
                    setShowLocationBlockedDialog(false);
                    checkAndShowLoginPrompt();
                  }}
                >
                  {t("btn_continue_without")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showLoginPromptDialog}
            onOpenChange={(open) => {
              setShowLoginPromptDialog(open);
              if (!open) {
                sessionStorage.setItem("birroo_skipped_login", "true");
              }
            }}
          >
            <DialogContent className="sm:max-w-md z-[9999] rounded-2xl w-[90vw] p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-indigo-600 text-xl font-extrabold">
                  <User className="h-6 w-6" />
                  {t("login_prompt_title")}
                </DialogTitle>
              </DialogHeader>
              <div className="py-2 text-sm text-slate-600 leading-relaxed font-medium">
                <p>{t("login_prompt_desc")}</p>
              </div>
              <div className="flex flex-col gap-3 mt-4">
                <Button
                  variant="default"
                  className="w-full h-12 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    setShowLoginPromptDialog(false);
                    loginWithGoogle();
                  }}
                >
                  {t("btn_ok_login")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-sm font-semibold rounded-xl text-slate-600 border-slate-300 bg-transparent hover:bg-slate-50"
                  onClick={() => {
                    setShowLoginPromptDialog(false);
                    sessionStorage.setItem("birroo_skipped_login", "true");
                  }}
                >
                  {t("btn_continue_no_login")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isBrandDrawerOpen} onOpenChange={setIsBrandDrawerOpen}>
            <DialogContent className="sm:max-w-md z-[9999] rounded-2xl w-[90vw] p-6 top-[50%] translate-y-[-50%]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-indigo-600 text-xl font-extrabold">
                  {t("filter_by_brand", "Filtra per Brand")}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto no-scrollbar pb-6">
                {availableBrands.map((b) => (
                  <button
                    key={b}
                    onClick={() =>
                      setSelectedBrands((prev) =>
                        prev.includes(b)
                          ? prev.filter((x) => x !== b)
                          : [...prev, b],
                      )
                    }
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all font-bold text-xs xs:text-sm text-center ${selectedBrands.includes(b) ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-100 bg-white text-slate-600 hover:border-slate-300"}`}
                  >
                    {b === "Pompe Bianche" ? (
                      <Building2 className="w-6 h-6 mb-2 text-slate-400" />
                    ) : (
                      <Fuel className="w-6 h-6 mb-2 text-indigo-400" />
                    )}
                    <span className="leading-tight truncate w-full px-1">
                      {b}
                    </span>
                  </button>
                ))}
                {availableBrands.length === 0 && (
                  <div className="col-span-full text-center text-slate-500 py-6 text-sm">
                    Nessun brand trovato nella zona
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-slate-100">
                <Button
                  variant="default"
                  className="w-full h-12 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg"
                  onClick={() => setIsBrandDrawerOpen(false)}
                >
                  Applica (
                  {selectedBrands.length > 0 ? selectedBrands.length : "Tutti"})
                </Button>
                {selectedBrands.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedBrands([]);
                      setIsBrandDrawerOpen(false);
                    }}
                    className="text-slate-500 hover:text-slate-800 h-10"
                  >
                    Azzera filtri
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {showOnboarding && (
            <Onboarding
              onComplete={(dontShowAgain) => {
                if (dontShowAgain) {
                  localStorage.setItem("birroo_hide_onboarding", "true");
                }
                setShowOnboarding(false);
                if (!hasRequestedLocationRef.current) {
                  hasRequestedLocationRef.current = true;
                  handleLocateMe();
                }
              }}
            />
          )}

          {/* Refuel Feedback Dialog */}
          <Dialog
            open={!!pendingRefuel}
            onOpenChange={(open) => !open && setPendingRefuel(null)}
          >
            <DialogContent className="sm:max-w-md rounded-3xl p-6 z-[4000]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center">
                  Hai fatto rifornimento?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-center mt-2">
                <p className="text-slate-600">
                  Sei appena andato verso <strong>{pendingRefuel?.name}</strong>
                  .<br />
                  Ci confermi che il prezzo era{" "}
                  <strong>{pendingRefuel?.pricePerLiter?.toFixed(3)}€/L</strong>
                  ?
                </p>
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-sm font-bold text-slate-700 ml-1">Litri erogati (opzionale)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Es. 35.5"
                      className="h-12 rounded-xl font-bold text-lg"
                      value={reportedLiters}
                      onChange={(e) => setReportedLiters(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    onClick={() =>
                      handleConfirmRefuel(pendingRefuel?.pricePerLiter, reportedLiters ? parseFloat(reportedLiters.replace(',', '.')) : undefined)
                    }
                  >
                    Sì, prezzo confermato!
                  </Button>
                  <div className="flex flex-col gap-1 text-left mt-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Prezzo diverso?</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Es. 1.859"
                        className="h-12 rounded-xl text-center font-bold text-lg"
                        value={reportedPrice}
                        onChange={(e) => setReportedPrice(e.target.value)}
                      />
                      <Button
                        className="h-12 rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shrink-0"
                        disabled={!reportedPrice}
                        onClick={() =>
                          handleConfirmRefuel(parseFloat(reportedPrice.replace(',', '.')), reportedLiters ? parseFloat(reportedLiters.replace(',', '.')) : undefined)
                        }
                      >
                        Aggiorna Prezzo
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full text-slate-500 font-bold mt-2"
                    onClick={() => setPendingRefuel(null)}
                  >
                    Annulla, non ho rifornito
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
      <Toaster />
    </AuthProvider>
  );
}
