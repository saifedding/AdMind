import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Competitor } from '@/lib/api';

interface CompetitorsState {
  // Dialog states
  addDialogOpen: boolean;
  editDialogOpen: boolean;
  scrapeDialogOpen: boolean;
  bulkScrapeDialogOpen: boolean;
  bulkCategoryDialogOpen: boolean;
  clearDialogOpen: boolean;
  clearAllDialogOpen: boolean;
  statusDialogOpen: boolean;
  bulkStatusDialogOpen: boolean;
  confirmDeleteDialogOpen: boolean;

  // Selected data
  selectedCompetitor: Competitor | null;
  selectedIds: number[];
  scrapingCompetitor: Competitor | null;
  clearingCompetitor: Competitor | null;

  // Task tracking
  activeTaskId: string | null;
  activeBulkTaskIds: string[];

  // Filters and pagination
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  categoryFilter: number | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;

  // Actions
  setAddDialogOpen: (open: boolean) => void;
  setEditDialogOpen: (open: boolean) => void;
  setScrapeDialogOpen: (open: boolean) => void;
  setBulkScrapeDialogOpen: (open: boolean) => void;
  setBulkCategoryDialogOpen: (open: boolean) => void;
  setClearDialogOpen: (open: boolean) => void;
  setClearAllDialogOpen: (open: boolean) => void;
  setStatusDialogOpen: (open: boolean) => void;
  setBulkStatusDialogOpen: (open: boolean) => void;
  setConfirmDeleteDialogOpen: (open: boolean) => void;

  setSelectedCompetitor: (competitor: Competitor | null) => void;
  setSelectedIds: (ids: number[]) => void;
  setScrapingCompetitor: (competitor: Competitor | null) => void;
  setClearingCompetitor: (competitor: Competitor | null) => void;

  setActiveTaskId: (taskId: string | null) => void;
  setActiveBulkTaskIds: (taskIds: string[]) => void;

  setSearchTerm: (term: string) => void;
  setStatusFilter: (filter: 'all' | 'active' | 'inactive') => void;
  setCategoryFilter: (filter: number | null) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  toggleSortOrder: () => void;

  // Utility actions
  toggleSelectId: (id: number) => void;
  selectAllVisible: (visibleIds: number[]) => void;
  deselectAllVisible: (visibleIds: number[]) => void;
  clearSelection: () => void;
  resetFilters: () => void;
  closeAllDialogs: () => void;
}

export const useCompetitorsStore = create<CompetitorsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      addDialogOpen: false,
      editDialogOpen: false,
      scrapeDialogOpen: false,
      bulkScrapeDialogOpen: false,
      bulkCategoryDialogOpen: false,
      clearDialogOpen: false,
      clearAllDialogOpen: false,
      statusDialogOpen: false,
      bulkStatusDialogOpen: false,
      confirmDeleteDialogOpen: false,

      selectedCompetitor: null,
      selectedIds: [],
      scrapingCompetitor: null,
      clearingCompetitor: null,

      activeTaskId: null,
      activeBulkTaskIds: [],

      searchTerm: '',
      statusFilter: 'all',
      categoryFilter: null,
      sortBy: 'created_at',
      sortOrder: 'desc',
      currentPage: 1,
      pageSize: 20,

      // Dialog actions
      setAddDialogOpen: (open) => set({ addDialogOpen: open }),
      setEditDialogOpen: (open) => set({ editDialogOpen: open }),
      setScrapeDialogOpen: (open) => set({ scrapeDialogOpen: open }),
      setBulkScrapeDialogOpen: (open) => set({ bulkScrapeDialogOpen: open }),
      setBulkCategoryDialogOpen: (open) => set({ bulkCategoryDialogOpen: open }),
      setClearDialogOpen: (open) => set({ clearDialogOpen: open }),
      setClearAllDialogOpen: (open) => set({ clearAllDialogOpen: open }),
      setStatusDialogOpen: (open) => set({ statusDialogOpen: open }),
      setBulkStatusDialogOpen: (open) => set({ bulkStatusDialogOpen: open }),
      setConfirmDeleteDialogOpen: (open) => set({ confirmDeleteDialogOpen: open }),

      // Selection actions
      setSelectedCompetitor: (competitor) => set({ selectedCompetitor: competitor }),
      setSelectedIds: (ids) => set({ selectedIds: ids }),
      setScrapingCompetitor: (competitor) => set({ scrapingCompetitor: competitor }),
      setClearingCompetitor: (competitor) => set({ clearingCompetitor: competitor }),

      // Task actions
      setActiveTaskId: (taskId) => set({ activeTaskId: taskId }),
      setActiveBulkTaskIds: (taskIds) => set({ activeBulkTaskIds: taskIds }),

      // Filter actions
      setSearchTerm: (term) => set({ searchTerm: term, currentPage: 1 }),
      setStatusFilter: (filter) => set({ statusFilter: filter, currentPage: 1 }),
      setCategoryFilter: (filter) => set({ categoryFilter: filter, currentPage: 1 }),
      setSortBy: (sortBy) => set({ sortBy, currentPage: 1 }),
      setSortOrder: (order) => set({ sortOrder: order, currentPage: 1 }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),
      toggleSortOrder: () => {
        const { sortOrder } = get();
        set({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', currentPage: 1 });
      },

      // Utility actions
      toggleSelectId: (id) => {
        const { selectedIds } = get();
        const newIds = selectedIds.includes(id)
          ? selectedIds.filter(selectedId => selectedId !== id)
          : [...selectedIds, id];
        set({ selectedIds: newIds });
      },

      selectAllVisible: (visibleIds) => {
        const { selectedIds } = get();
        const newIds = [...new Set([...selectedIds, ...visibleIds])];
        set({ selectedIds: newIds });
      },

      deselectAllVisible: (visibleIds) => {
        const { selectedIds } = get();
        const newIds = selectedIds.filter(id => !visibleIds.includes(id));
        set({ selectedIds: newIds });
      },

      clearSelection: () => set({ selectedIds: [] }),

      resetFilters: () => set({
        searchTerm: '',
        statusFilter: 'all',
        categoryFilter: null,
        sortBy: 'created_at',
        sortOrder: 'desc',
        currentPage: 1,
        pageSize: 20,
      }),

      closeAllDialogs: () => set({
        addDialogOpen: false,
        editDialogOpen: false,
        scrapeDialogOpen: false,
        bulkScrapeDialogOpen: false,
        bulkCategoryDialogOpen: false,
        clearDialogOpen: false,
        clearAllDialogOpen: false,
        statusDialogOpen: false,
        bulkStatusDialogOpen: false,
        confirmDeleteDialogOpen: false,
        selectedCompetitor: null,
        scrapingCompetitor: null,
        clearingCompetitor: null,
      }),
    }),
    {
      name: 'competitors-store',
    }
  )
);