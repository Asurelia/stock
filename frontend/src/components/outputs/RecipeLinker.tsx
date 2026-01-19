import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'

interface RecipeLinkerProps {
    selectedRecipeId: string | null
    onSelect: (recipeId: string | null) => void
}

export function RecipeLinker({ selectedRecipeId, onSelect }: RecipeLinkerProps) {
    const { data: recipes = [] } = useQuery({
        queryKey: ['recipes'],
        queryFn: api.recipes.getAll,
    })

    return (
        <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
                Lier à une recette (optionnel)
            </Label>
            <div className="flex gap-2">
                <Select
                    value={selectedRecipeId || 'none'}
                    onValueChange={(value) => onSelect(value === 'none' ? null : value)}
                >
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Aucune recette" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Aucune recette</SelectItem>
                        {recipes.map(recipe => (
                            <SelectItem key={recipe.id} value={recipe.id}>
                                {recipe.name} ({recipe.portions} portions)
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedRecipeId && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSelect(null)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
