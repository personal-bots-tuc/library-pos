import { useState, useRef, useEffect } from 'react';
import { useClient } from '../../hooks/useClient';
import type { Client, ClientPickerProps } from './types';

export function ClientPicker({ selected, onSelect, onNewClient }: ClientPickerProps) {
  const { searchClients } = useClient();
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<Client[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const cancelledRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    setShowResults(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const handleSearchSubmit = () => {
    const query = search.trim();
    if (!query) {
      setResults([]);
      return;
    }
    cancelledRef.current = false;
    setResultsLoading(true);
    searchClients(query)
      .then(clients => {
        if (!cancelledRef.current) setResults(clients);
      })
      .catch(() => {
        if (!cancelledRef.current) setResults([]);
      })
      .finally(() => {
        if (!cancelledRef.current) setResultsLoading(false);
      });
  };

  const displayName = selected
    ? `${selected.fullName} (${selected.dni})${selected.balance > 0 ? ` · Deuda: $${selected.balance.toLocaleString('es-AR')}` : ''}`
    : 'Cliente General';

  const handleSelectDefault = () => {
    onSelect({
      id: 'default',
      fullName: 'Cliente General',
      dni: '0',
      isDefault: true,
      balance: 0,
      active: true,
      createdAt: '',
      updatedAt: '',
    });
    setShowResults(false);
  };

  const handleSelectClient = (client: Client) => {
    onSelect(client);
    setShowResults(false);
    setSearch('');
  };

  return (
    <div className="flex-1 relative" ref={resultsRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={displayName}
          onClick={handleFocus}
          onFocus={handleFocus}
          onBlur={() => {}}
          className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:border-primary-500 focus:outline-none cursor-pointer"
          placeholder="Seleccionar cliente..."
        />
        <button
          onClick={onNewClient}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
          aria-label="Nuevo cliente"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        </button>
      </div>

      {showResults && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-xl border border-neutral-200 z-40 overflow-hidden max-h-96">
          {/* Search row: input + Buscar button */}
          <div className="p-2 border-b border-neutral-100 flex gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por nombre, DNI o teléfono…"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 focus:border-primary-500 focus:outline-none"
              autoComplete="off"
            />
            <button
              onClick={handleSearchSubmit}
              disabled={resultsLoading || !search.trim()}
              className="px-3 py-2 rounded-lg border border-neutral-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-primary-50"
            >
              Buscar
            </button>
          </div>

          <button
            onClick={handleSelectDefault}
            className="w-full text-left px-4 py-2.5 hover:bg-primary-50 text-sm border-b border-neutral-100 flex items-center justify-between gap-3"
          >
            <span className="font-medium text-neutral-900">Cliente General</span>
            <span className="text-xs text-primary-600 font-medium">Predeterminado</span>
          </button>

          {resultsLoading ? (
            <div className="px-4 py-4 text-center text-neutral-500 text-sm">Buscando clientes…</div>
          ) : results.length === 0 && search.trim() ? (
            <div className="px-4 py-4 text-center text-neutral-500 text-sm">
              No se encontraron clientes
            </div>
          ) : (
            results.map(client => (
              <button
                key={client.id}
                onClick={() => handleSelectClient(client)}
                className="w-full text-left px-4 py-2.5 hover:bg-primary-50 text-sm border-b border-neutral-100 last:border-0 flex items-center justify-between gap-3"
              >
                <span className="font-medium text-neutral-900">{client.fullName}</span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-neutral-400">{client.dni}</span>
                  {client.balance > 0 && (
                    <span className="text-xs text-warning-600 font-medium">
                      Deuda: ${client.balance.toLocaleString('es-AR')}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}

          <button
            onClick={() => setShowResults(false)}
            className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 text-sm text-center text-primary-600 font-medium border-t border-neutral-100"
          >
            Ver todos los clientes
          </button>
        </div>
      )}
    </div>
  );
}
