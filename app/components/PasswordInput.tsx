"use client";

import { useId, useState } from "react";

/** A password field with a show/hide toggle — shared by /login and
 * /admin/configuracoes' change-password form. */
export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <label htmlFor={inputId} className="flex flex-col gap-1 text-sm">
      {label}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          autoComplete={autoComplete}
          className="min-h-11 w-full rounded-md border border-foreground/20 bg-background px-3 py-2 pr-12 text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Ocultar senha" : "Exibir senha"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-foreground/5"
        >
          <span aria-hidden="true">{visible ? "🙈" : "👁️"}</span>
        </button>
      </div>
    </label>
  );
}
