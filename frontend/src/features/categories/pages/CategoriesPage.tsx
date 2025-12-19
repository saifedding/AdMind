import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FolderOpen, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { useCategories } from '../hooks/use-categories';
import { 
  CategoryCard, 
  CategoryFormDialog, 
  DeleteCategoryDialog,
  CategoryStats 
} from '../components';
import type { Category } from '@/lib/api';

export function CategoriesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCategories();

  const handleSubmit = (name: string) => {
    if (editingCategory) {
      updateCategory(
        { id: editingCategory.id, data: { name } },
        {
          onSuccess: () => {
            setEditingCategory(null);
          }
        }
      );
    } else {
      createCategory(
        { name },
        {
          onSuccess: () => {
            setIsCreateOpen(false);
          }
        }
      );
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
  };

  const handleDelete = (category: Category) => {
    setDeletingCategory(category);
  };

  const confirmDelete = () => {
    if (deletingCategory) {
      deleteCategory(deletingCategory.id, {
        onSuccess: () => {
          setDeletingCategory(null);
        }
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FolderOpen className="h-8 w-8 text-photon-400" />
              Categories
            </h1>
            <p className="text-muted-foreground mt-1">
              Organize your competitors into categories for better management
            </p>
          </div>
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="bg-photon-500 text-photon-950 hover:bg-photon-400"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Category
          </Button>
        </div>

        {/* Stats Cards */}
        {categories && categories.length > 0 && (
          <CategoryStats categories={categories} />
        )}

        {/* Categories Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-photon-400" />
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first category to start organizing competitors
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <CategoryFormDialog
          open={isCreateOpen || !!editingCategory}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingCategory(null);
            }
          }}
          category={editingCategory}
          onSubmit={handleSubmit}
          isLoading={isCreating || isUpdating}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteCategoryDialog
          open={!!deletingCategory}
          onOpenChange={(open) => !open && setDeletingCategory(null)}
          category={deletingCategory}
          onConfirm={confirmDelete}
          isLoading={isDeleting}
        />
      </div>
    </DashboardLayout>
  );
}
