import React, { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Location {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
}

export function AddressSelector({ locations, value, onChange }: { locations: Location[], value: string, onChange: (val: string) => void }) {
  const [selectedCountry, setSelectedCountry] = useState<string>('none');
  const [selectedGov, setSelectedGov] = useState<string>('none');
  const [selectedRegion, setSelectedRegion] = useState<string>('none');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('none');

  // Try to parse the existing value if it matches our format
  useEffect(() => {
    if (value && value.includes(' - ')) {
      // Find the deepest location that matches
      const parts = value.split(' - ');
      const nameToMatch = parts[parts.length - 1];
      const match = locations.find(l => l.name === nameToMatch);
      if (match) {
        if (match.type === 'neighborhood') {
          setSelectedNeighborhood(match.id);
          const region = locations.find(l => l.id === match.parentId);
          if (region) {
            setSelectedRegion(region.id);
            const gov = locations.find(l => l.id === region.parentId);
            if (gov) {
              setSelectedGov(gov.id);
              const country = locations.find(l => l.id === gov.parentId);
              if (country) setSelectedCountry(country.id);
            }
          }
        } else if (match.type === 'region') {
          setSelectedRegion(match.id);
          const gov = locations.find(l => l.id === match.parentId);
          if (gov) {
            setSelectedGov(gov.id);
            const country = locations.find(l => l.id === gov.parentId);
            if (country) setSelectedCountry(country.id);
          }
        } else if (match.type === 'governorate') {
          setSelectedGov(match.id);
          const country = locations.find(l => l.id === match.parentId);
          if (country) setSelectedCountry(country.id);
        } else if (match.type === 'country') {
          setSelectedCountry(match.id);
        }
      }
    }
  }, [value, locations]);

  const countries = useMemo(() => locations.filter(l => l.type === 'country'), [locations]);
  const governorates = useMemo(() => locations.filter(l => l.type === 'governorate' && l.parentId === selectedCountry), [locations, selectedCountry]);
  const regions = useMemo(() => locations.filter(l => l.type === 'region' && l.parentId === selectedGov), [locations, selectedGov]);
  const neighborhoods = useMemo(() => locations.filter(l => l.type === 'neighborhood' && l.parentId === selectedRegion), [locations, selectedRegion]);

  const handleUpdate = (countryId: string, govId: string, regionId: string, neighborhoodId: string) => {
    let parts = [];
    const country = locations.find(l => l.id === countryId);
    if (country) parts.push(country.name);
    
    const gov = locations.find(l => l.id === govId);
    if (gov) parts.push(gov.name);
    
    const region = locations.find(l => l.id === regionId);
    if (region) parts.push(region.name);
    
    const neighborhood = locations.find(l => l.id === neighborhoodId);
    if (neighborhood) parts.push(neighborhood.name);

    onChange(parts.join(' - '));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-xs text-gray-500">البلد</Label>
        <Select 
          value={selectedCountry} 
          onValueChange={(val: string) => {
            setSelectedCountry(val || 'none');
            setSelectedGov('none');
            setSelectedRegion('none');
            setSelectedNeighborhood('none');
            handleUpdate(val || 'none', 'none', 'none', 'none');
          }}
        >
          <SelectTrigger className="bg-white"><SelectValue placeholder="اختر البلد" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بدون اختيار</SelectItem>
            {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-gray-500">المحافظة</Label>
        <Select 
          value={selectedGov} 
          onValueChange={(val: string) => {
            setSelectedGov(val || 'none');
            setSelectedRegion('none');
            setSelectedNeighborhood('none');
            handleUpdate(selectedCountry, val || 'none', 'none', 'none');
          }}
          disabled={selectedCountry === 'none'}
        >
          <SelectTrigger className="bg-white"><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بدون اختيار</SelectItem>
            {governorates.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-gray-500">المدينة / المنطقة</Label>
        <Select 
          value={selectedRegion} 
          onValueChange={(val: string) => {
            setSelectedRegion(val || 'none');
            setSelectedNeighborhood('none');
            handleUpdate(selectedCountry, selectedGov, val || 'none', 'none');
          }}
          disabled={selectedGov === 'none'}
        >
          <SelectTrigger className="bg-white"><SelectValue placeholder="اختر المدينة/المنطقة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بدون اختيار</SelectItem>
            {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-gray-500">الحي</Label>
        <Select 
          value={selectedNeighborhood} 
          onValueChange={(val: string) => {
            setSelectedNeighborhood(val || 'none');
            handleUpdate(selectedCountry, selectedGov, selectedRegion, val || 'none');
          }}
          disabled={selectedRegion === 'none'}
        >
          <SelectTrigger className="bg-white"><SelectValue placeholder="اختر الحي" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">بدون اختيار</SelectItem>
            {neighborhoods.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
