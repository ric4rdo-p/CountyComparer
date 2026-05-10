import { useState, useRef, useEffect } from 'react';

export default function CountySelector({ value, onChange, counties, label, inputClassName, dropdownClassName }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = counties.find(c => c.fips === value);

  const filtered = search
    ? counties.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : counties;

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleFocus() {
    setOpen(true);
    setSearch('');
  }

  function handleChange(e) {
    setSearch(e.target.value);
    setOpen(true);
  }

  function handleSelect(county) {
    onChange(county.fips);
    setOpen(false);
    setSearch('');
  }

  const displayValue = open ? search : (selected?.name ?? '');

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={label}
        autoComplete="off"
        className={inputClassName}
      />
      {open && filtered.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-xl max-h-56 overflow-y-auto scrollbar-thin ${dropdownClassName}`}>
          {filtered.map(county => (
            <button
              key={county.fips}
              type="button"
              onMouseDown={() => handleSelect(county)}
              className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors text-sm flex justify-between items-center"
            >
              <span>{county.name}</span>
              <span className="text-xs opacity-60 ml-2">
                {county.population > 0 ? county.population.toLocaleString() : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
