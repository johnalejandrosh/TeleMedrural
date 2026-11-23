"use client";

import { useState } from "react";
import { CButton } from "@coreui/react";
import { revokeTokenAction } from "@/app/(dashboard)/dashboard/sincronizacion/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/providers/toast-provider";

export function RevokeButton({ id, device, owner }: { id: string; device: string; owner: string }) {
  const [open, setOpen] = useState(false);
  const notify = useToast();
  return (
    <>
      <CButton color="danger" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Revocar
      </CButton>
      <ConfirmDialog
        visible={open}
        title="Revocar dispositivo"
        confirmLabel="Revocar"
        onClose={() => setOpen(false)}
        onConfirm={() => revokeTokenAction(id)}
        onDone={(result) => {
          setOpen(false);
          if (result.message) notify(result.message);
        }}
      >
        <p className="mb-0">
          <strong>{device}</strong> ({owner}) no podrá enviar más casos hasta que vuelva a iniciar sesión en la app. Los casos que tenga guardados sin
          enviar se conservan en el teléfono.
        </p>
      </ConfirmDialog>
    </>
  );
}
