import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/page-loader';

interface Company {
  id: string;
  name: string;
  document: string | null;
  is_active: boolean;
  created_at: string;
}

const Companies = () => {
  const { isSuperadmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: '', document: '', is_active: true });

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperadmin) {
      navigate('/dashboard');
      return;
    }
    fetchCompanies();
  }, [isSuperadmin, authLoading, navigate]);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar empresas', variant: 'destructive' });
    } else {
      setCompanies((data as Company[]) || []);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', document: '', is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditing(c);
    setForm({ name: c.name, document: c.document ?? '', is_active: c.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Erro', description: 'Informe o nome da empresa', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      document: form.document.trim() || null,
      is_active: form.is_active,
    };
    let error;
    if (editing) {
      ({ error } = await (supabase as any).from('companies').update(payload).eq('id', editing.id).select());
    } else {
      ({ error } = await (supabase as any).from('companies').insert(payload).select());
    }
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Sucesso', description: editing ? 'Empresa atualizada' : 'Empresa cadastrada' });
    setDialogOpen(false);
    fetchCompanies();
  };

  const toggleActive = async (c: Company) => {
    const { error } = await (supabase as any)
      .from('companies')
      .update({ is_active: !c.is_active })
      .eq('id', c.id)
      .select();
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    fetchCompanies();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader message="Carregando empresas..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-6 h-6" /> Empresas
            </h1>
            <p className="text-muted-foreground">Gerencie as empresas que utilizam o sistema</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Documento (CNPJ/CPF)</Label>
                  <Input
                    value={form.document}
                    onChange={(e) => setForm({ ...form, document: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label>Empresa Ativa</Label>
                    <p className="text-sm text-muted-foreground">
                      Empresas inativas não podem ser usadas
                    </p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(c) => setForm({ ...form, is_active: c })}
                  />
                </div>
                <Button onClick={handleSave} className="w-full" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Empresas Cadastradas ({companies.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-table-header">
                    <TableHead>Nome</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c, i) => (
                    <TableRow key={c.id} className={i % 2 ? 'bg-table-row-alt' : ''}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.document || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={c.is_active ? 'default' : 'destructive'}
                          className={c.is_active ? 'bg-success hover:bg-success/80' : ''}
                        >
                          {c.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>
                            {c.is_active ? 'Inativar' : 'Ativar'}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {companies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma empresa cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Companies;