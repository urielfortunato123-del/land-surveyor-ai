import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Loader2, X, Check } from 'lucide-react';
import { useGeocoding } from '@/hooks/useGeocoding';
import { useToast } from '@/hooks/use-toast';

interface LocationSearchProps {
  currentLocation?: { lat: number; lng: number } | null;
  currentAddress?: string;
  onLocationChange: (location: { lat: number; lng: number }, address: string) => void;
}

const LocationSearch = ({ currentLocation, currentAddress, onLocationChange }: LocationSearchProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { geocodeAddress, isLoading, error } = useGeocoding();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const result = await geocodeAddress(searchQuery);
    if (result) {
      onLocationChange(
        { lat: result.lat, lng: result.lng },
        result.displayName
      );
      setIsEditing(false);
      setSearchQuery('');
      toast({
        title: 'Localização atualizada',
        description: 'O polígono foi reposicionado no mapa.',
      });
    } else {
      toast({
        title: 'Endereço não encontrado',
        description: 'Tente um endereço mais específico ou diferente.',
        variant: 'destructive',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setSearchQuery('');
    }
  };

  if (!isEditing) {
    return (
      <div className="px-4 py-2 border-t border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            {currentLocation ? (
              <div className="text-sm">
                <span className="text-muted-foreground">Localização: </span>
                <span className="text-foreground truncate">
                  {currentAddress || `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Localização não definida
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="shrink-0"
          >
            <Search className="w-3 h-3 mr-1" />
            Buscar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-border bg-muted/30">
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground">
          Buscar localização
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Ex: Rua das Flores, 123, Bauru-SP"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="text-sm"
            />
          </div>
          <Button
            size="icon"
            onClick={handleSearch}
            disabled={isLoading || !searchQuery.trim()}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsEditing(false);
              setSearchQuery('');
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Digite o endereço completo: rua, número, cidade-UF. Pressione Enter para buscar.
        </p>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
};

export default LocationSearch;
