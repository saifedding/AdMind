import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategorySelect } from '@/components/CategorySelect';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useCompetitorsStore } from '../stores/competitors-store';

export function CompetitorFilters() {
  const {
    searchTerm,
    statusFilter,
    categoryFilter,
    sortBy,
    sortOrder,
    setSearchTerm,
    setStatusFilter,
    setCategoryFilter,
    setSortBy,
    toggleSortOrder,
  } = useCompetitorsStore();

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search competitors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
      </div>
      
      <Select 
        value={statusFilter} 
        onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}
      >
        <SelectTrigger className="w-48 bg-card border-border">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Competitors</SelectItem>
          <SelectItem value="active">Active Only</SelectItem>
          <SelectItem value="inactive">Inactive Only</SelectItem>
        </SelectContent>
      </Select>

      <CategorySelect
        value={categoryFilter}
        onChange={setCategoryFilter}
        placeholder="All Categories"
        allowUncategorized={true}
        className="w-48 bg-card border-border"
      />

      <div className="flex gap-1">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48 bg-card border-border">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date Created</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="updated_at">Last Updated</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSortOrder}
          className="border-border"
          title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
        >
          {sortOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}