import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ProductSearchProps } from "./types";

export function ProductSearch({
  products,
  search,
  onSearchChange,
  onAddProduct,
  disabled,
}: ProductSearchProps) {
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products
    .filter((p) => p.active && (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase())
    ))
    .slice(0, 8);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const clickedOnInput = inputRef.current?.contains(target) ?? false;
      const clickedOnDropdown = dropdownRef.current?.contains(target) ?? false;
      if (!clickedOnInput && !clickedOnDropdown) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showResults && filteredProducts.length > 0) {
      setSelectedIndex(0);
      updateDropdownPosition();
    } else {
      setSelectedIndex(-1);
    }
  }, [showResults, filteredProducts.length]);

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (showResults) {
      updateDropdownPosition();
      window.addEventListener("scroll", updateDropdownPosition);
      window.addEventListener("resize", updateDropdownPosition);
      return () => {
        window.removeEventListener("scroll", updateDropdownPosition);
        window.removeEventListener("resize", updateDropdownPosition);
      };
    }
  }, [showResults]);

  const handleFocus = () => {
    if (search.trim()) setShowResults(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || filteredProducts.length === 0) return;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredProducts.length - 1));
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      }
      case "Enter": {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredProducts.length) {
          const product = filteredProducts[selectedIndex];
          onAddProduct(product);
          onSearchChange("");
          setShowResults(false);
          setSelectedIndex(-1);
        }
        break;
      }
      case "Escape": {
        setShowResults(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      }
    }
  };

  const selectProduct = (product: typeof filteredProducts[0]) => {
    onAddProduct(product);
    onSearchChange("");
    setShowResults(false);
    setSelectedIndex(-1);
  };

  const dropdown = showResults && search && dropdownPosition && (
    <div
      ref={dropdownRef}
      id="product-search-results"
      className="bg-white rounded-xl shadow-xl border border-neutral-200 z-50 overflow-hidden"
      style={{
        position: "fixed",
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        maxHeight: 320,
        overflowY: "auto",
      }}
      role="listbox"
    >
      {filteredProducts.length === 0 ? (
        <div className="px-4 py-3 text-sm text-neutral-500 text-center" role="option" aria-disabled="true">
          No se encontraron productos
        </div>
      ) : (
        filteredProducts.map((product, index) => (
          <button
            key={product.id}
            onClick={() => selectProduct(product)}
            onMouseEnter={() => setSelectedIndex(index)}
            disabled={product.type === "product" && product.stock === 0}
            className={`w-full text-left px-4 py-2.5 text-sm border-b border-neutral-100 last:border-0 flex items-center justify-between gap-3 disabled:opacity-40 disabled:cursor-not-allowed ${
              index === selectedIndex ? "bg-primary-50 text-primary-700" : "hover:bg-primary-50"
            }`}
            role="option"
            aria-selected={index === selectedIndex}
            aria-disabled={product.type === "product" && product.stock === 0}
          >
            <span className="font-medium text-neutral-900 truncate">{product.name}</span>
            <span className="flex items-center gap-3 shrink-0">
              {product.code && (
                <span className="text-xs text-neutral-400 font-mono">{product.code}</span>
              )}
              {product.type === "product" && (
                <span className={`text-xs ${product.stock <= (product.minStock ?? 5) ? "text-warning-600" : "text-neutral-400"}`}>
                  Stock: {product.stock}
                </span>
              )}
              <span className="font-bold text-primary-600">${product.price.toLocaleString("es-AR")}</span>
            </span>
          </button>
        ))
      )}
    </div>
  );

  return (
    <div className="flex-1 relative">
      <div className="flex items-center justify-between pl-11 pr-4">
        <span className="text-xs font-semibold text-neutral-500">Buscar producto / servicio</span>
        <kbd className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded border border-neutral-200">F2</kbd>
      </div>
      <div className="relative mt-1.5">
        <svg className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          id="product-search"
          type="text"
          placeholder="Código, nombre o descripción..."
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setShowResults(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          disabled={disabled}
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-primary-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          aria-autocomplete="list"
          aria-controls="product-search-results"
          aria-expanded={showResults && filteredProducts.length > 0}
        />
      </div>
      {dropdownPosition && createPortal(dropdown, document.body)}
    </div>
  );
}