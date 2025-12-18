import Link from "next/link";
import { ReactNode } from "react";

type ButtonProps =
  | { href: string; children: ReactNode; variant?: "primary" | "ghost" }
  | { onClick?: never; href?: never; children: ReactNode; variant?: "primary" | "ghost" };

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";
  const cls =
    variant === "primary"
      ? "inline-flex items-center rounded-lg bg-black px-4 py-2 text-white hover:opacity-90"
      : "inline-flex items-center rounded-lg border px-4 py-2 hover:bg-gray-50";

  if ("href" in props) {
    return (
      <Link className={cls} href={props.href}>
        {props.children}
      </Link>
    );
  }
  return (
    <button className={cls} type="button" onClick={props.onClick}>
      {props.children}
    </button>
  );
}
