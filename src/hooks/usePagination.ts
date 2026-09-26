import { useState, useMemo } from 'react'
import { ItemsPerPage } from '../components/ui/Pagination'

export function usePagination<T>(items: T[], defaultLimit: ItemsPerPage = 15) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(defaultLimit)

  const paginatedItems = useMemo(() => {
    if (itemsPerPage === 'all') return items
    
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return items.slice(start, end)
  }, [items, currentPage, itemsPerPage])

  // Reseta para a primeira página se a lista original mudar de tamanho (ex: após filtro local)
  // Nota: Isso pode ser omitido se a filtragem resetar a página explicitamente no componente, 
  // mas é uma boa prática para evitar estar na página 5 de uma lista que agora tem só 2 páginas.
  useMemo(() => {
    const maxPage = itemsPerPage === 'all' ? 1 : Math.ceil(items.length / itemsPerPage)
    if (currentPage > maxPage && maxPage > 0) {
      setCurrentPage(1)
    }
  }, [items.length, itemsPerPage, currentPage])

  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedItems,
    totalItems: items.length
  }
}
