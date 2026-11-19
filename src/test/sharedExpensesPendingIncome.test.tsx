import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { addSharedExpense, addPendingIncomeBatch } = vi.hoisted(() => ({
  addSharedExpense: vi.fn().mockResolvedValue({ id: "se-1" }),
  addPendingIncomeBatch: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/hooks/useSharedExpenses", () => ({
  useSharedExpenses: () => ({ data: [], isLoading: false }),
  useAddSharedExpense: () => ({ mutateAsync: addSharedExpense, isPending: false }),
  useRegisterPayment: () => ({ mutateAsync: vi.fn() }),
  useDeleteSharedExpense: () => ({ mutateAsync: vi.fn() }),
  usePeople: () => ({ data: [] }),
}));

vi.mock("@/hooks/useMovements", () => ({
  useCategories: () => ({ data: [] }),
}));

vi.mock("@/hooks/usePendingPayments", () => ({
  useAddPendingPayment: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/usePendingIncome", () => ({
  useAddPendingIncomeBatch: () => ({
    mutateAsync: addPendingIncomeBatch,
    isPending: false,
  }),
}));

import { SharedExpenses } from "@/components/SharedExpenses";
import { formatDateToString, parseDateString } from "@/lib/dateUtils";
import { addMonths } from "date-fns";

/** Opens the form, sets a 3000 total and adds "Ludo" as a participant. */
function openFormWithParticipant() {
  const { container } = render(<SharedExpenses />);
  fireEvent.click(screen.getByRole("button", { name: "Nuevo" }));

  fireEvent.change(screen.getByPlaceholderText("0"), {
    target: { value: "3000" },
  });

  const nameInput = screen.getByPlaceholderText("Nombre");
  fireEvent.change(nameInput, { target: { value: "Ludo" } });
  fireEvent.keyDown(nameInput, { key: "Enter" });

  // Custom split so the participant's share becomes editable.
  fireEvent.click(screen.getByRole("button", { name: "División igual" }));

  const numberInputs = document.querySelectorAll('input[type="number"]');
  // [0] = total, [1] = participant's share
  fireEvent.change(numberInputs[1], { target: { value: "1500" } });
  return container;
}

async function submit() {
  fireEvent.click(
    screen.getByRole("button", { name: "Registrar gasto compartido" })
  );
  await waitFor(() => expect(addPendingIncomeBatch).toHaveBeenCalled());
  return addPendingIncomeBatch.mock.calls[0][0] as Record<string, unknown>[];
}

describe("shared expense -> pending income rows", () => {
  beforeEach(() => {
    addSharedExpense.mockClear();
    addPendingIncomeBatch.mockClear();
  });

  it("creates a pending income for a participant paying in a single payment", async () => {
    openFormWithParticipant();
    const rows = await submit();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      description: "Ludo",
      amount: 1500,
      due_date: formatDateToString(new Date()),
    });
    expect(rows[0].installment_group_id).toBeUndefined();
    expect(rows[0].installment_number).toBeUndefined();
  });

  it("still creates one row per installment for a participant paying in cuotas", async () => {
    const container = openFormWithParticipant();

    // [0] = "¿Lo pagaste vos?", [1] = "¿Paga en cuotas?"
    const switches = document.querySelectorAll('button[role="switch"]');
    fireEvent.click(switches[1]);

    const rows = await submit();

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.amount)).toEqual([750, 750]);
    expect(rows.map((r) => r.installment_number)).toEqual([1, 2]);
    expect(rows.map((r) => r.total_installments)).toEqual([2, 2]);
    expect(rows[0].installment_group_id).toEqual(rows[1].installment_group_id);
    expect(rows.map((r) => r.description)).toEqual([
      "Ludo (cuota 1/2)",
      "Ludo (cuota 2/2)",
    ]);
    const today = parseDateString(formatDateToString(new Date()));
    expect(rows[0].due_date).toBe(
      formatDateToString(addMonths(today, 1))
    );
    expect(rows[1].due_date).toBe(
      formatDateToString(addMonths(today, 2))
    );
  });
});
