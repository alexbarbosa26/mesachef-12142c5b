import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import {
  useProductCategories,
  useCreateProductCategory,
  useUpdateProductCategory,
  useDeleteProductCategory,
  ProductCategory,
} from '@/hooks/useProductCategories';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoriesManagerDialog({ open, onOpenChange }: Props) {
  const { data: categories = [], isLoading } = useProductCategories();
  const createCat = useCreateProductCategory();
  const updateCat = useUpdateProductCategory();
  const deleteCat = useDeleteProductCategory();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = async () => {
    if (newName.trim().length < 1) return;
    await createCat.mutateAsync(newName);
    setNewName('');
  };

  const startEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const saveEdit = async () => {
    if (!editingId || editingName.trim().length < 1) return;
    await updateCat.mutateAsync({ id: editingId, name: editingName });
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>
            Crie, edite, ative ou desative as categorias dos seus produtos. Categorias em uso
            não podem ser excluídas — desative-as.
          </DialogDescription>
        </DialogHeader>

        {/* Criar nova */}
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nova categoria (ex: Lanche, Sobremesa...)"
            maxLength={60}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleCreate}
            disabled={createCat.isPending || newName.trim().length < 1}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Lista */}
        <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
          ) : categories.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nenhuma categoria cadastrada.</div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 p-3">
                {editingId === cat.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      maxLength={60}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={saveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 flex items-center gap-2">
                      <span className={cat.is_active ? '' : 'text-muted-foreground line-through'}>
                        {cat.name}
                      </span>
                      {cat.is_system && (
                        <Badge variant="secondary" className="text-[10px]">padrão</Badge>
                      )}
                      {!cat.is_active && (
                        <Badge variant="outline" className="text-[10px]">inativa</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cat.is_active}
                        onCheckedChange={(v) =>
                          updateCat.mutate({ id: cat.id, is_active: v })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(cat)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Excluir categoria "${cat.name}"?`)) {
                            deleteCat.mutate(cat.id);
                          }
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}