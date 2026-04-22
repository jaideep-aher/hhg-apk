"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * CommodityPicker — big, finger-friendly, Marathi-first crop selector.
 *
 * Replaces the 40-item dropdown with a visual picker optimized for farmers on
 * small screens and limited literacy:
 *
 *   • Category chips at the top (भाजी / फळे / डाळ / तेलबिया / कापूस / ऊस ...)
 *   • Search box that matches Marathi, English, slug AND aliases (so typing
 *     "tamatar", "kanda", "kapas" in Roman script works).
 *   • Voice search mic (Web Speech API, mr-IN → falls back to hi-IN) for users
 *     who can speak but not type.
 *   • Emoji tile grid with large tap targets (3 cols on mobile, 4 on desktop).
 *   • "Recent" quick-pick chips backed by localStorage so the 5 most-used
 *     crops are always one tap away.
 *   • Empty state and keyboard Enter-to-pick when the filter narrows to one.
 *
 * Opens as a bottom sheet on mobile so it feels native and doesn't fight the
 * address bar. The trigger button shows the current selection inline with the
 * rest of the form.
 */

const CATEGORY_MR = {
  vegetable: { label: "भाजी", emoji: "🥬" },
  fruit:     { label: "फळे",  emoji: "🍎" },
  pulse:     { label: "डाळ",  emoji: "🫘" },
  oilseed:   { label: "तेलबिया", emoji: "🌻" },
  cereal:    { label: "तृणधान्य", emoji: "🌾" },
  spice:     { label: "मसाले", emoji: "🌿" },
  fibre:     { label: "कापूस", emoji: "🪨" },
  cash:      { label: "नगदी",  emoji: "🎋" },
};

const RECENTS_KEY = "hhg:commodity:recents";
const MAX_RECENTS = 5;

function loadRecents() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function pushRecent(slug) {
  if (typeof window === "undefined" || !slug) return;
  try {
    const current = loadRecents().filter((s) => s !== slug);
    const next = [slug, ...current].slice(0, MAX_RECENTS);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* localStorage disabled — silently ignore */
  }
}

function matchesQuery(commodity, q) {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  if (!needle) return true;
  const hay = [
    commodity.nameMr,
    commodity.nameEn,
    commodity.slug,
    ...(commodity.aliases || []),
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return hay.some((h) => h.includes(needle));
}

export default function CommodityPicker({
  commodities = [],
  value,
  onChange,
  placeholder = "माल निवडा",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [recents, setRecents] = useState([]);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR));
  }, []);

  useEffect(() => {
    if (open) {
      setRecents(loadRecents());
      // Focus the search box once the sheet animates in.
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery("");
      setActiveCategory("all");
      stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const categories = useMemo(() => {
    const set = new Set(commodities.map((c) => c.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [commodities]);

  const filtered = useMemo(() => {
    return commodities.filter((c) => {
      if (activeCategory !== "all" && c.category !== activeCategory) return false;
      if (!matchesQuery(c, query)) return false;
      return true;
    });
  }, [commodities, activeCategory, query]);

  const recentCommodities = useMemo(() => {
    return recents
      .map((slug) => commodities.find((c) => c.slug === slug))
      .filter(Boolean);
  }, [recents, commodities]);

  const selected = useMemo(
    () => commodities.find((c) => c.slug === value),
    [commodities, value]
  );

  const handleSelect = (slug) => {
    pushRecent(slug);
    onChange?.(slug);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && filtered.length === 1) {
      handleSelect(filtered[0].slug);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "mr-IN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (ev) => {
      setListening(false);
      // Fall back to Hindi if Marathi recognition isn't available on this device.
      if (ev.error === "language-not-supported" && rec.lang === "mr-IN") {
        const hiRec = new SR();
        hiRec.lang = "hi-IN";
        hiRec.onresult = rec.onresult;
        hiRec.onerror = () => setListening(false);
        hiRec.onstart = () => setListening(true);
        hiRec.onend = () => setListening(false);
        hiRec.start();
        recognitionRef.current = hiRec;
      }
    };
    rec.onresult = (ev) => {
      const alternatives = Array.from(ev.results[0] || []).map((a) => a.transcript || "");
      // Try each alternative until one matches something.
      for (const transcript of alternatives) {
        setQuery(transcript);
        const anyMatch = commodities.some((c) => matchesQuery(c, transcript));
        if (anyMatch) break;
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* no-op */ }
      recognitionRef.current = null;
    }
    setListening(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-12 justify-start text-base"
          data-attr="Commodity Picker Trigger"
        >
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.iconEmoji && (
                <span className="text-xl">{selected.iconEmoji}</span>
              )}
              <span className="font-medium">{selected.nameMr}</span>
              <span className="text-xs text-muted-foreground">
                ({selected.nameEn})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="text-lg">माल निवडा</SheetTitle>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="शोधा — उदा. टोमॅटो, tamatar, कांदा"
                className="h-11 pl-9 pr-9 text-base"
              />
              {query && (
                <button
                  type="button"
                  aria-label="clear"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            {voiceSupported && (
              <Button
                type="button"
                variant={listening ? "default" : "outline"}
                size="icon"
                aria-label={listening ? "ऐकत आहे" : "बोला"}
                className={`h-11 w-11 shrink-0 ${listening ? "animate-pulse bg-green-600 hover:bg-green-700" : ""}`}
                onClick={listening ? stopListening : startListening}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const meta = CATEGORY_MR[cat];
            const label =
              cat === "all" ? "सर्व" : meta?.label || cat;
            const emoji = cat === "all" ? "✨" : meta?.emoji || "•";
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-input"
                }`}
              >
                <span className="mr-1">{emoji}</span>
                {label}
              </button>
            );
          })}
        </div>

        {recentCommodities.length > 0 && activeCategory === "all" && !query && (
          <div className="px-4 pb-2">
            <div className="text-xs text-muted-foreground mb-1.5">
              तुम्ही नुकतेच पाहिलेले
            </div>
            <div className="flex gap-2 flex-wrap">
              {recentCommodities.map((c) => (
                <Badge
                  key={c.slug}
                  variant="secondary"
                  className="cursor-pointer h-8 px-3 text-sm"
                  onClick={() => handleSelect(c.slug)}
                >
                  {c.iconEmoji ? `${c.iconEmoji} ` : ""}
                  {c.nameMr}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-3xl mb-2">🔍</div>
              <div>"{query}" साठी काहीही सापडले नाही</div>
              <div className="text-xs mt-1">दुसरा शब्द वापरून पहा</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
              {filtered.map((c) => {
                const isSelected = c.slug === value;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => handleSelect(c.slug)}
                    className={`flex flex-col items-center justify-start gap-1 p-3 rounded-xl border-2 transition-all min-h-[96px] ${
                      isSelected
                        ? "border-green-600 bg-green-50"
                        : "border-muted hover:border-muted-foreground/30 bg-background"
                    }`}
                  >
                    <span className="text-3xl leading-none">
                      {c.iconEmoji || "•"}
                    </span>
                    <span className="text-sm font-medium text-center leading-tight">
                      {c.nameMr}
                    </span>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">
                      {c.nameEn}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
