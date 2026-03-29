"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import type { ETFListItem } from "@/lib/etf-list";

interface ETFAutocompleteProps {
  selectedETFs: string[];
  onChange: (etfs: string[]) => void;
  disabled?: boolean;
  onSubmit?: () => void;
}

export default function ETFAutocomplete({
  selectedETFs,
  onChange,
  disabled,
  onSubmit,
}: ETFAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<ETFListItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [shouldFocus, setShouldFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inputValue.trim().length === 0) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/search-etfs?q=${encodeURIComponent(inputValue)}`
        );
        const data = await response.json();

        if (data.results) {
          // Filter out already selected ETFs
          const filtered = data.results.filter(
            (etf: ETFListItem) => !selectedETFs.includes(etf.symbol)
          );
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 150); // Debounce
    return () => clearTimeout(timeoutId);
  }, [inputValue, selectedETFs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle focus restoration after adding ETF
  useEffect(() => {
    if (shouldFocus && !disabled) {
      inputRef.current?.focus();
      setShouldFocus(false);
    }
  }, [shouldFocus, disabled]);

  const addETF = (symbol: string) => {
    // Use flushSync to ensure state updates are applied synchronously
    flushSync(() => {
      if (!selectedETFs.includes(symbol)) {
        onChange([...selectedETFs, symbol]);
      }
      setInputValue("");
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    });

    // Set flag to restore focus after re-render
    setShouldFocus(true);
  };

  const removeETF = (symbol: string) => {
    onChange(selectedETFs.filter((s) => s !== symbol));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addETF(suggestions[selectedIndex].symbol);
      } else if (inputValue.trim().length > 0) {
        // User pressed Enter without selecting from dropdown
        addETF(inputValue.trim().toUpperCase());
      } else if (inputValue.trim().length === 0 && onSubmit) {
        // Empty input + Enter = trigger calculation
        onSubmit();
        // Restore focus after submit
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    } else if (e.key === " ") {
      // Space key - add current input as tag
      if (inputValue.trim().length > 0) {
        e.preventDefault();
        addETF(inputValue.trim().toUpperCase());
      }
    } else if (
      e.key === "Backspace" &&
      inputValue === "" &&
      selectedETFs.length > 0
    ) {
      // Backspace on empty input - remove last tag
      e.preventDefault();
      removeETF(selectedETFs[selectedETFs.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Container for tags and input */}
      <div
        className={`input-container${disabled ? " input-container--disabled" : ""}`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {/* Selected ETF tags */}
        {selectedETFs.map((symbol) => (
          <div key={symbol} className="input-tag">
            {symbol}
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeETF(symbol);
                }}
                className="input-tag-remove"
                aria-label={`Remove ${symbol}`}
              >
                ×
              </button>
            )}
          </div>
        ))}

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
          placeholder={selectedETFs.length === 0 ? t("searchPlaceholder") : ""}
          disabled={disabled}
          className="input-field"
        />
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div ref={dropdownRef} className="dropdown">
          {suggestions.map((etf, index) => (
            <div
              key={etf.symbol}
              onClick={() => addETF(etf.symbol)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`dropdown-item${selectedIndex === index ? " dropdown-item--active" : ""}`}
            >
              <div className="dropdown-item-symbol">{etf.symbol}</div>
              <div className="dropdown-item-name">{etf.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* Hint text */}
      <div className="input-hint">{t("searchHint")}</div>
    </div>
  );
}
