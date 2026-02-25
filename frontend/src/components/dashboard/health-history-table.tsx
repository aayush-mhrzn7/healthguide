"use client"

import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

type HealthHistoryEntry = {
  date: string
  condition: string
  symptoms: string
  confidence: string
  badgeVariant: "success" | "warning" | "destructive"
}

const columns: ColumnDef<HealthHistoryEntry>[] = [
  {
    accessorKey: "date",
    header: () => <span className="px-4 py-3 block">Date</span>,
    cell: ({ getValue }) => (
      <span className="px-4 py-4 block text-xs text-muted-foreground">
        {String(getValue())}
      </span>
    ),
  },
  {
    id: "condition",
    header: () => <span className="px-4 py-3 block">Predicted disease</span>,
    cell: ({ row }) => (
      <div className="px-4 py-4">
        <p className="text-xs font-semibold text-foreground">
          {row.original.condition}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Symptoms: {row.original.symptoms}
        </p>
      </div>
    ),
  },
  {
    id: "confidence",
    header: () => (
      <span className="px-4 py-3 block text-center">Confidence level</span>
    ),
    cell: ({ row }) => {
      const badgeClasses =
        row.original.badgeVariant === "success"
          ? "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : row.original.badgeVariant === "warning"
            ? "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            : "inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300"

      return (
        <div className="px-4 py-4 text-center">
          <span className={badgeClasses}>{row.original.confidence}</span>
        </div>
      )
    },
  },
  {
    id: "actions",
    header: () => (
      <span className="px-4 py-3 block text-right">Action</span>
    ),
    cell: () => (
      <div className="px-4 py-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="inline-flex items-center gap-1 px-2 text-[11px] font-semibold text-primary"
        >
          View full report
        </Button>
      </div>
    ),
  },
]

type HealthHistoryTableProps = {
  data: HealthHistoryEntry[]
  totalCount: number
}

export function HealthHistoryTable({ data, totalCount }: HealthHistoryTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground"
              >
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-muted/40"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-3 text-[11px] text-muted-foreground">
        <p>Showing {data.length} of {totalCount} assessments</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            className="h-7 rounded-lg px-3 text-[11px]"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="xs"
            className="h-7 rounded-lg px-3 text-[11px]"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

