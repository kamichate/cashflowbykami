import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAllMovements } from '@/hooks/useMovements';
import { formatDateToString } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

export function ExportData() {
  const { data: movements = [] } = useAllMovements();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const dateRangeInvalid = !!(startDate && endDate && startDate > endDate);

  const filteredMovements = dateRangeInvalid ? [] : movements.filter(m => {
    if (startDate && m.date < formatDateToString(startDate)) return false;
    if (endDate && m.date > formatDateToString(endDate)) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Monto', 'Monto Personal', 'Moneda', 'Categoría', 'Detalle', 'Retiro', 'Ahorro Inicial'];
    const typeMap: Record<string, string> = {
      income: 'Ingreso',
      expense: 'Gasto',
      savings: 'Ahorro',
      transfer: 'Transferencia',
      yield: 'Rendimiento',
    };

    const rows = filteredMovements.map(m => [
      m.date,
      typeMap[m.type] || m.type,
      m.amount,
      m.personal_amount ?? m.amount,
      m.currency,
      (m as any).category?.name || '',
      m.detail || '',
      m.is_withdrawal ? 'Sí' : 'No',
      m.is_initial_savings ? 'Sí' : 'No',
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="glass-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="w-5 h-5" />
          Exportar Datos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Desde</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left text-sm", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {startDate ? format(startDate, 'dd/MM/yy') : 'Inicio'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Hasta</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left text-sm", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {endDate ? format(endDate, 'dd/MM/yy') : 'Fin'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {dateRangeInvalid && (
          <p className="text-xs text-destructive">
            La fecha de inicio no puede ser posterior a la fecha de fin
          </p>
        )}

        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
            Limpiar filtros
          </Button>
        )}

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <span className="text-sm">{filteredMovements.length} movimientos</span>
        </div>

        <Button onClick={exportCSV} className="w-full" disabled={filteredMovements.length === 0 || dateRangeInvalid}>
          <Download className="w-4 h-4 mr-2" />
          Descargar CSV
        </Button>
      </CardContent>
    </Card>
  );
}
