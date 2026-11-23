"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CAlert, CButton, CFormCheck, CFormTextarea, CSpinner } from "@coreui/react";
import { addNoteAction, reopenCaseAction, type NoteField } from "@/app/(dashboard)/dashboard/casos/[id]/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/providers/toast-provider";
import type { ActionResult } from "@/lib/actions";
import { CARE_PLANS, type CarePlanKey } from "@/lib/med/catalog";

const idle: ActionResult<NoteField> = { ok: false };

/** Formulario de observación médica (telemedicina diferida). */
export function NoteForm({ caseId, pending, suggestedPlan }: { caseId: string; pending: boolean; suggestedPlan: CarePlanKey | null }) {
  const [state, formAction, saving] = useActionState(addNoteAction, idle);
  const [markReviewed, setMarkReviewed] = useState(pending);
  const formRef = useRef<HTMLFormElement>(null);
  const notify = useToast();

  useEffect(() => {
    if (state.ok && state.message) {
      notify(state.message);
      formRef.current?.reset();
    }
  }, [state, notify]);

  return (
    <form ref={formRef} action={formAction} className="note-form" noValidate>
      <input type="hidden" name="caseId" value={caseId} />
      {state.message && !state.ok && (
        <CAlert color="danger" className="py-2 small">
          {state.message}
        </CAlert>
      )}
      <CFormTextarea
        id="note-body"
        name="body"
        label="Observación médica"
        rows={5}
        placeholder="Impresión diagnóstica, indicaciones para el promotor y signos de alarma para la familia…"
        invalid={Boolean(state.fieldErrors?.body)}
        feedbackInvalid={state.fieldErrors?.body}
      />

      <fieldset className="mt-3">
        <legend className="form-label mb-2">
          Conducta {markReviewed && pending ? <span className="text-danger">*</span> : <span className="text-body-secondary small">(opcional)</span>}
        </legend>
        <div className="care-plans">
          {(Object.entries(CARE_PLANS) as [CarePlanKey, (typeof CARE_PLANS)[CarePlanKey]][]).map(([key, plan]) => (
            <label key={key} className={`care-plan care-plan--${key.toLowerCase()}`}>
              <input type="radio" name="carePlan" value={key} defaultChecked={key === suggestedPlan} />
              <span>
                <b>{plan.label}</b>
                <small>{plan.detail}</small>
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.carePlan && <div className="invalid-feedback d-block">{state.fieldErrors.carePlan}</div>}
      </fieldset>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-3">
        {pending ? (
          <CFormCheck
            id="note-reviewed"
            name="markReviewed"
            label="Marcar el caso como revisado"
            checked={markReviewed}
            onChange={(event) => setMarkReviewed(event.target.checked)}
          />
        ) : (
          <span className="small text-body-secondary">El caso ya está revisado: la observación se agrega al historial.</span>
        )}
        <CButton type="submit" color="primary" disabled={saving}>
          {saving && <CSpinner size="sm" className="me-2" aria-hidden />}
          {saving ? "Guardando…" : "Guardar observación"}
        </CButton>
      </div>
    </form>
  );
}

export function ReopenButton({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const notify = useToast();
  return (
    <>
      <CButton color="secondary" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Devolver a pendientes
      </CButton>
      <ConfirmDialog
        visible={open}
        title="Devolver el caso a pendientes"
        confirmLabel="Devolver"
        tone="primary"
        onClose={() => setOpen(false)}
        onConfirm={() => reopenCaseAction(caseId)}
        onDone={(result) => {
          setOpen(false);
          if (result.message) notify(result.message);
        }}
      >
        <p className="mb-0">El caso volverá a la bandeja de pendientes para una nueva revisión. Las observaciones registradas se conservan.</p>
      </ConfirmDialog>
    </>
  );
}

export function PrintButton() {
  return (
    <CButton color="secondary" variant="outline" size="sm" onClick={() => window.print()}>
      Imprimir ficha
    </CButton>
  );
}
