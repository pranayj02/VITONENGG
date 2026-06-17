-- MR Fulfillment: add mr_issue_out transaction type to stock_ledger
-- This allows single-shot MR fulfillment to be tracked in the ledger.
ALTER TABLE public.stock_ledger
  DROP CONSTRAINT IF EXISTS stock_ledger_transaction_type_check;

ALTER TABLE public.stock_ledger
  ADD CONSTRAINT stock_ledger_transaction_type_check
  CHECK (transaction_type IN (
    'grn_in','po_commit','invoice_out','adjustment_in',
    'adjustment_out','return_in','warranty_out','mr_issue_out'
  ));
