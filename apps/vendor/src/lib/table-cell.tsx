import type { ComponentProps } from "react"
import { Table } from "@medusajs/ui"

type CellProps = ComponentProps<typeof Table.Cell> & { colSpan?: number }

/** Medusa Table.Cell types omit colSpan; forward it for full-width rows. */
export function TableCell({ colSpan, ...props }: CellProps) {
  return <Table.Cell {...props} {...(colSpan != null ? { colSpan } : {})} />
}
