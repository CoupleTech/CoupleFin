import { ChevronLeft, ChevronRight } from 'lucide-react'

export type ItemsPerPage = 15 | 30 | 50 | 100 | 'all'

interface PaginationProps {
  totalItems: number
  currentPage: number
  itemsPerPage: ItemsPerPage
  onPageChange: (page: number) => void
  onItemsPerPageChange: (limit: ItemsPerPage) => void
}

export default function Pagination({
  totalItems,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const isAll = itemsPerPage === 'all'
  const limit = isAll ? totalItems : (itemsPerPage as number)
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / limit))
  
  const startIndex = isAll ? 0 : (currentPage - 1) * limit
  const endIndex = Math.min(startIndex + limit, totalItems)

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1)
  }

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white border-t border-slate-100 gap-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="whitespace-nowrap">Exibindo</span>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            const val = e.target.value
            onItemsPerPageChange(val === 'all' ? 'all' : Number(val) as ItemsPerPage)
            onPageChange(1) // Reseta para primeira página ao mudar limite
          }}
          className="bg-slate-50 border border-slate-200 rounded text-slate-700 py-1 px-2 text-xs focus:outline-none focus:border-primary/50"
        >
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
          <option value="all">Todos</option>
        </select>
        <span className="whitespace-nowrap">por página</span>
      </div>

      {totalItems > 0 && (
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span className="hidden sm:inline">
            Mostrando {startIndex + 1} a {endIndex} de {totalItems} itens
          </span>

          {!isAll && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="px-2 font-medium">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
