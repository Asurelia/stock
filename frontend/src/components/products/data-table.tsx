"use client"

import * as React from "react"
import type {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
} from "@tanstack/react-table"
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
}

export function DataTable<TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            rowSelection,
        },
        initialState: {
            pagination: { pageSize: 100 } // Default to show more items
        }
    })

    // Check if we should group by category
    // Grouping is active if sorting is empty, 'name' or 'category'
    const currentSort = sorting[0]?.id
    const isGrouped = !currentSort || currentSort === 'name' || currentSort === 'category'

    // Helper to render the table content (either full or filtered)
    const renderRows = (rows: any[]) => {
        if (rows.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                        Aucun résultat.
                    </TableCell>
                </TableRow>
            )
        }
        return rows.map((row) => (
            <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
            >
                {row.getVisibleCells().map((cell: any) => (
                    <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                ))}
            </TableRow>
        ))
    }

    // Get distinct categories from data if grouped
    // We need to act on the *filtered* rows from the table model, not raw data
    const filteredRows = table.getRowModel().rows

    const renderGroupedContent = () => {
        // Group rows by category
        const groups: Record<string, typeof filteredRows> = {}
        filteredRows.forEach(row => {
            const cat = (row.getValue('category') as string) || 'Sans catégorie'
            if (!groups[cat]) groups[cat] = []
            groups[cat].push(row)
        })

        const categories = Object.keys(groups).sort()

        return (
            <Accordion type="multiple" defaultValue={categories} className="w-full">
                {categories.map(cat => (
                    <AccordionItem key={cat} value={cat} className="border-b-0 mb-4 bg-card rounded-lg border">
                        <AccordionTrigger className="px-4 py-2 hover:no-underline bg-muted/30 rounded-t-lg data-[state=open]:rounded-b-none">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-lg">{cat}</span>
                                <Badge variant="secondary" className="ml-2">{groups[cat].length}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                            <Table>
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => {
                                                return (
                                                    <TableHead key={header.id}>
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                    </TableHead>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {renderRows(groups[cat])}
                                </TableBody>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        )
    }

    return (
        <div>
            <div className="flex items-center py-4 gap-4">
                <Input
                    placeholder="Filtrer par nom..."
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                        table.getColumn("name")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                />
                {/* We can add a category select filter here too */}
            </div>

            {isGrouped ? (
                renderGroupedContent()
            ) : (
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {renderRows(filteredRows)}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
