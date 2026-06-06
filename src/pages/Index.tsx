import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { MovementForm } from '@/components/MovementForm';
import { MovementsList } from '@/components/MovementsList';
import { Dashboard } from '@/components/Dashboard';
import { SummaryTable } from '@/components/SummaryTable';
import { Charts } from '@/components/Charts';
import { CategoryManager } from '@/components/CategoryManager';
import { SharedExpenses } from '@/components/SharedExpenses';
import { PendingMoney } from '@/components/PendingMoney';
import { PendingPayments } from '@/components/PendingPayments';
import { PendingIncomeComponent } from '@/components/PendingIncome';
import { Notifications } from '@/components/Notifications';
import { ExportData } from '@/components/ExportData';
import { Skeleton } from '@/components/ui/skeleton';

export default function Index() {
  const [currentTab, setCurrentTab] = useState('home');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'home' && (
        <div className="space-y-6 pb-20 lg:pb-6">
          <Notifications />
          <Dashboard />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MovementForm />
            <MovementsList />
          </div>
        </div>
      )}

      {currentTab === 'shared' && (
        <div className="space-y-6 pb-20 lg:pb-6">
          <PendingMoney />
          <SharedExpenses />
        </div>
      )}

      {currentTab === 'payments' && (
        <div className="space-y-6 pb-20 lg:pb-6">
          <PendingPayments />
        </div>
      )}

      {currentTab === 'summary' && (
        <div className="space-y-6 pb-20 lg:pb-6">
          <Charts />
          <SummaryTable type="expense" title="Resumen de Gastos" />
          <SummaryTable type="income" title="Resumen de Ingresos" />
          <SummaryTable type="savings" title="Resumen de Ahorros" />
          <SummaryTable type="transfer" title="Resumen de Transferencias" />
          <SummaryTable type="yield" title="Resumen de Rendimientos" />
        </div>
      )}

      {currentTab === 'settings' && (
        <div className="space-y-6 pb-20 lg:pb-6">
          <CategoryManager />
          <ExportData />
        </div>
      )}
    </Layout>
  );
}
