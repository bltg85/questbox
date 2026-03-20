'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Trash2 } from 'lucide-react';

interface DeleteProductButtonProps {
  productId: string;
  onDeleted?: () => void;
}

export function DeleteProductButton({ productId, onDeleted }: DeleteProductButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (onDeleted) onDeleted();
        else router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
