import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DateNavigatorProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    viewMode: 'day' | 'month' | 'year';
    onViewModeChange: (mode: 'day' | 'month' | 'year') => void;
    datesWithPhotos?: Set<string>; // Format: "YYYY-MM-DD"
    monthsWithPhotos?: Set<string>; // Format: "YYYY-MM"
}

const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function DateNavigator({ selectedDate, onDateChange, viewMode, onViewModeChange, datesWithPhotos, monthsWithPhotos }: DateNavigatorProps) {
    const [currentMonth, setCurrentMonth] = useState(selectedDate);

    // Helper to check if a date has photos
    const hasPhotos = (date: Date): boolean => {
        if (!datesWithPhotos) return false;
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        return datesWithPhotos.has(dateStr);
    };

    // Helper to check if a month has photos
    const monthHasPhotos = (year: number, month: number): boolean => {
        if (!monthsWithPhotos) return false;
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        return monthsWithPhotos.has(monthStr);
    };

    const goToPreviousPeriod = () => {
        const newDate = new Date(selectedDate);
        if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() - 1);
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() - 1);
        } else {
            newDate.setFullYear(newDate.getFullYear() - 1);
        }
        onDateChange(newDate);
        setCurrentMonth(newDate);
    };

    const goToNextPeriod = () => {
        const newDate = new Date(selectedDate);
        if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() + 1);
        } else if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + 1);
        } else {
            newDate.setFullYear(newDate.getFullYear() + 1);
        }
        onDateChange(newDate);
        setCurrentMonth(newDate);
    };

    const goToToday = () => {
        const today = new Date();
        onDateChange(today);
        setCurrentMonth(today);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const isSameDay = (date1: Date, date2: Date) => {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Get first day of week (0 = Sunday, 1 = Monday, etc)
        let firstDayOfWeek = firstDay.getDay();
        // Convert Sunday (0) to 7 for easier calculation
        firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;

        const days: (Date | null)[] = [];

        // Add empty cells for days before month starts
        for (let i = 1; i < firstDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days in month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const formatPeriod = () => {
        if (viewMode === 'day') {
            return selectedDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } else if (viewMode === 'month') {
            return `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
        } else {
            return selectedDate.getFullYear().toString();
        }
    };

    const renderDayView = () => {
        const days = getDaysInMonth(currentMonth);

        return (
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const newDate = new Date(currentMonth);
                            newDate.setMonth(newDate.getMonth() - 1);
                            setCurrentMonth(newDate);
                        }}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <button
                        onClick={() => onViewModeChange('month')}
                        className="font-semibold hover:text-primary"
                    >
                        {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const newDate = new Date(currentMonth);
                            newDate.setMonth(newDate.getMonth() + 1);
                            setCurrentMonth(newDate);
                        }}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                        const dayHasPhotos = day ? hasPhotos(day) : false;
                        return (
                            <button
                                key={index}
                                onClick={() => day && onDateChange(day)}
                                disabled={!day}
                                className={cn(
                                    "aspect-square p-1 text-sm rounded-lg transition-colors relative flex flex-col items-center justify-center",
                                    !day && "invisible",
                                    day && "hover:bg-muted",
                                    day && isSameDay(day, selectedDate) && "bg-primary text-primary-foreground hover:bg-primary/90",
                                    day && isToday(day) && !isSameDay(day, selectedDate) && "border-2 border-primary",
                                    day && dayHasPhotos && !isSameDay(day, selectedDate) && "bg-green-100 dark:bg-green-900/30 font-semibold"
                                )}
                            >
                                <span>{day?.getDate()}</span>
                                {dayHasPhotos && (
                                    <span className={cn(
                                        "absolute bottom-1 w-1.5 h-1.5 rounded-full",
                                        isSameDay(day!, selectedDate) ? "bg-white" : "bg-green-500"
                                    )} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </Card>
        );
    };

    const renderMonthView = () => {
        const year = selectedDate.getFullYear();

        return (
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setFullYear(newDate.getFullYear() - 1);
                            onDateChange(newDate);
                        }}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <button
                        onClick={() => onViewModeChange('year')}
                        className="font-semibold hover:text-primary"
                    >
                        {year}
                    </button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setFullYear(newDate.getFullYear() + 1);
                            onDateChange(newDate);
                        }}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {MONTHS.map((month, index) => {
                        const isSelected = selectedDate.getMonth() === index;
                        const isCurrentMonth = new Date().getMonth() === index &&
                                              new Date().getFullYear() === year;
                        const hasPhotosInMonth = monthHasPhotos(year, index);

                        return (
                            <button
                                key={month}
                                onClick={() => {
                                    const newDate = new Date(year, index, 1);
                                    onDateChange(newDate);
                                    onViewModeChange('day');
                                }}
                                className={cn(
                                    "p-3 text-sm rounded-lg transition-colors relative",
                                    "hover:bg-muted",
                                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                                    isCurrentMonth && !isSelected && "border-2 border-primary",
                                    hasPhotosInMonth && !isSelected && "bg-green-100 dark:bg-green-900/30 font-semibold"
                                )}
                            >
                                {month}
                                {hasPhotosInMonth && (
                                    <span className={cn(
                                        "absolute top-1 right-1 w-2 h-2 rounded-full",
                                        isSelected ? "bg-white" : "bg-green-500"
                                    )} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </Card>
        );
    };

    const renderYearView = () => {
        const currentYear = selectedDate.getFullYear();
        const startYear = Math.floor(currentYear / 12) * 12;
        const years = Array.from({ length: 12 }, (_, i) => startYear + i);

        return (
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setFullYear(newDate.getFullYear() - 12);
                            onDateChange(newDate);
                        }}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold">
                        {startYear} - {startYear + 11}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setFullYear(newDate.getFullYear() + 12);
                            onDateChange(newDate);
                        }}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {years.map((year) => {
                        const isSelected = selectedDate.getFullYear() === year;
                        const isCurrentYear = new Date().getFullYear() === year;

                        return (
                            <button
                                key={year}
                                onClick={() => {
                                    const newDate = new Date(year, 0, 1);
                                    onDateChange(newDate);
                                    onViewModeChange('month');
                                }}
                                className={cn(
                                    "p-3 text-sm rounded-lg transition-colors",
                                    "hover:bg-muted",
                                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                                    isCurrentYear && !isSelected && "border-2 border-primary"
                                )}
                            >
                                {year}
                            </button>
                        );
                    })}
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-4">
            {/* Quick navigation */}
            <div className="flex items-center gap-2 flex-wrap">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPeriod}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {viewMode === 'day' ? 'Jour' : viewMode === 'month' ? 'Mois' : 'Année'} précédent
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                >
                    <Calendar className="h-4 w-4 mr-1" />
                    Aujourd'hui
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPeriod}
                    disabled={selectedDate >= new Date()}
                >
                    {viewMode === 'day' ? 'Jour' : viewMode === 'month' ? 'Mois' : 'Année'} suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>

            {/* Period display */}
            <Card className="p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Période sélectionnée</p>
                        <p className="text-lg font-semibold capitalize">{formatPeriod()}</p>
                    </div>
                    <div className="flex gap-1">
                        <Button
                            variant={viewMode === 'day' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onViewModeChange('day')}
                        >
                            Jour
                        </Button>
                        <Button
                            variant={viewMode === 'month' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onViewModeChange('month')}
                        >
                            Mois
                        </Button>
                        <Button
                            variant={viewMode === 'year' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onViewModeChange('year')}
                        >
                            Année
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Calendar view */}
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'year' && renderYearView()}
        </div>
    );
}
