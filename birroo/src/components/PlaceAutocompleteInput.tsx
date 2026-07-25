import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PlaceAutocompleteInput({ value, onChange, onSelect, placeholder }: { value: string, onChange: (val: string) => void, onSelect?: (lat: number, lon: number, name: string) => void, placeholder?: string }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isSelectingRef = useRef(false);
    const lastFetchedQueryRef = useRef('');

    useEffect(() => {
        if (!isFocused && value !== query) {
            setQuery(value);
        }
    }, [value, isFocused]);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.trim().length <= 2) {
            setSuggestions([]);
            return;
        }
        
        setIsFetching(true);
        lastFetchedQueryRef.current = searchQuery;
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=it&limit=5&addressdetails=1`);
            const data = await res.json();
            setSuggestions(data || []);
        } catch (e) {
            setSuggestions([]);
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        if (!isFocused) return;
        
        const timer = setTimeout(() => {
            if (isSelectingRef.current) {
                isSelectingRef.current = false;
                return;
            }
            if (query.trim().length > 2 && query !== lastFetchedQueryRef.current) {
                performSearch(query);
            } else if (query.trim().length <= 2) {
                setSuggestions([]);
                lastFetchedQueryRef.current = '';
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [query, isFocused, performSearch]);

    return (
        <div className="relative">
            <div className="relative flex items-center">
                <Input 
                    value={query} 
                    onChange={e => {
                        const val = e.target.value;
                        setQuery(val);
                        onChange(val);
                    }} 
                    onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                            if (suggestions.length > 0) {
                                const s = suggestions[0];
                                const parts = s.display_name.split(',');
                                const mainText = parts[0];
                                isSelectingRef.current = true;
                                setQuery(mainText);
                                onChange(mainText);
                                setSuggestions([]);
                                lastFetchedQueryRef.current = mainText;
                                setIsFetching(false);
                                if (onSelect) {
                                    onSelect(parseFloat(s.lat), parseFloat(s.lon), mainText);
                                }
                            } else if (query.trim().length > 2) {
                                setIsFetching(true);
                                try {
                                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=it&limit=1&addressdetails=1`);
                                    const d = await res.json();
                                    if (d && d.length > 0) {
                                        const s = d[0];
                                        const parts = s.display_name.split(',');
                                        const mainText = parts[0];
                                        isSelectingRef.current = true;
                                        setQuery(mainText);
                                        onChange(mainText);
                                        setSuggestions([]);
                                        lastFetchedQueryRef.current = mainText;
                                        if (onSelect) {
                                            onSelect(parseFloat(s.lat), parseFloat(s.lon), mainText);
                                        }
                                    }
                                } catch (err) {}
                                setIsFetching(false);
                            }
                        }
                    }}
                    onFocus={() => {
                        setIsFocused(true);
                        if (query.trim().length > 2) {
                            performSearch(query);
                        }
                    }}
                    onBlur={() => {
                        // Allow click event on suggestions to fire before hiding
                        setTimeout(() => setIsFocused(false), 200);
                    }}
                    placeholder={placeholder} 
                    className="rounded-xl h-10 bg-slate-50 border-slate-200 font-bold pr-8" 
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    {isFetching ? <Loader2 className="h-4 w-4 text-slate-400 animate-spin" /> : <Search className="h-4 w-4 text-slate-400 opacity-50" />}
                </div>
            </div>
            
            {isFocused && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[4000]">
                    {suggestions.map((s, i) => {
                        const parts = s.display_name.split(',');
                        const mainText = parts[0];
                        const subText = parts.slice(1).join(',').trim();
                        
                        const rawType = s.addresstype || s.class || '';
                        const transKey = `type_${rawType}`;
                        let typeLabel = t(transKey);
                        if (typeLabel === transKey && rawType) {
                          typeLabel = rawType.charAt(0).toUpperCase() + rawType.slice(1);
                        }

                        return (
                            <div 
                                key={i} 
                                className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-50 last:border-0"
                                onPointerDown={(e) => {
                                    e.preventDefault();
                                    isSelectingRef.current = true;
                                    setQuery(mainText);
                                    onChange(mainText);
                                    setSuggestions([]);
                                    lastFetchedQueryRef.current = mainText; // prevent refetching immediately
                                    setIsFetching(false);
                                    if (onSelect) {
                                        onSelect(parseFloat(s.lat), parseFloat(s.lon), mainText);
                                    }
                                }}
                            >
                                <p className="font-semibold text-slate-800 truncate">
                                   {mainText}
                                   {typeLabel && <span className="ml-2 font-normal text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">({typeLabel})</span>}
                                </p>
                                {subText && <p className="text-[10px] text-slate-500 truncate mt-0.5">{subText}</p>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
