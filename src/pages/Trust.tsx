import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Database, Users, Mail, ArrowLeft } from 'lucide-react';

const Trust = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>

        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold">Segurança e Privacidade</h1>
          </div>
          <p className="text-muted-foreground">
            Esta página é mantida pela equipe do MesaChef para responder dúvidas comuns
            sobre segurança e privacidade da plataforma. O conteúdo é editorial e não
            representa uma certificação independente.
          </p>
        </div>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5 text-primary" />
                Acesso e autenticação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>O acesso ao sistema exige login com e-mail e senha.</p>
              <p>
                Aplicamos regras de senha forte, expiração configurável (padrão 45 dias),
                histórico de últimas 10 senhas e alertas preventivos 7 dias antes da
                expiração.
              </p>
              <p>
                Funções administrativas e operacionais são separadas por papéis (Admin,
                Staff e Superadmin), validados no servidor.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-primary" />
                Dados e isolamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Cada empresa cliente acessa apenas os próprios dados. Aplicamos
                isolamento por empresa em todas as tabelas sensíveis através de
                políticas de segurança em nível de linha (Row-Level Security).
              </p>
              <p>
                Ações sensíveis (cadastros, alterações de estoque, mudanças de preço e
                acessos administrativos) geram registros de auditoria imutáveis.
              </p>
              <p>
                A infraestrutura é provida pela Lovable Cloud. Comunicação cliente-servidor
                ocorre por HTTPS.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                Coleta e uso de dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Coletamos apenas os dados necessários para operar o sistema: identificação
                do usuário (nome, e-mail), informações operacionais da empresa (insumos,
                fichas técnicas, movimentações de estoque) e logs técnicos de uso.
              </p>
              <p>
                Não comercializamos dados de clientes. Integrações externas (ex.: envio de
                e-mail, mensageria WhatsApp) são acionadas apenas quando configuradas
                pelo cliente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                Retenção e exclusão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Mantemos os dados operacionais enquanto a conta da empresa estiver ativa.
                Mediante solicitação do titular ou do administrador da empresa, dados
                pessoais podem ser anonimizados ou removidos, respeitando obrigações
                legais de retenção (ex.: registros fiscais e de auditoria).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="w-5 h-5 text-primary" />
                Contato e incidentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Para dúvidas sobre segurança, privacidade ou solicitação de exclusão de
                dados, entre em contato com o administrador da sua empresa no MesaChef
                ou com o responsável pela conta.
              </p>
              <p>
                Suspeitas de vulnerabilidade podem ser reportadas pelo mesmo canal de
                suporte e serão tratadas com prioridade.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Última revisão: junho de 2026. Esta página descreve práticas vigentes e pode
          ser atualizada sem aviso prévio.
        </p>
      </div>
    </div>
  );
};

export default Trust;
