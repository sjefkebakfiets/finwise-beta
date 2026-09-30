"use client";

import { useState } from "react";

export default function DeleteCategoryButton({
  categoryId,
  categoryName,
  action,
}: {
  categoryId: string;
  categoryName: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [pending, setPending] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm(`Categorie "${categoryName}" verwijderen? Dit verwijdert ook de bijbehorende budgetgegevens.`)) {
      event.preventDefault();
      return;
    }

    setPending(true);
  }

  return (
    <form action={action} onSubmit={handleSubmit} style={{ marginTop: 6 }}>
      <input type="hidden" name="categoryId" value={categoryId} />
      <button
        type="submit"
        disabled={pending}
        style={{
          padding: "3px 7px",
          border: 0,
          borderRadius: 6,
          background: "transparent",
          color: "#b91c1c",
          fontSize: 10,
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Verwijderen..." : "Categorie verwijderen"}
      </button>
    </form>
  );
}
